import {
  Component,
  Suspense,
  lazy,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type LazyExoticComponent,
  type ReactNode,
} from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { CameraControls, useGLTF, useProgress } from "@react-three/drei";
import {
  Box3,
  Color,
  Group,
  Mesh,
  MeshStandardMaterial,
  Sphere,
  Vector3,
  type Material,
  type Object3D,
  type Intersection,
} from "three";
import { levelById, type CodeScene, type LevelId, type ZoomLevel } from "@/content/exploreZoom";
import { partInfo } from "@/content/exploreParts";
import { useTimelinePlaying, type Timeline } from "../anim/timeline";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import { LevelAnimation } from "./anims";
import { Marker } from "./marker";

/**
 * One level of the /explore zoom chain (3D-1 … 3D-4). Loads the level's .glb (meshopt-compressed), scales it to a
 * fixed size, puts numbered markers on the hotspots and lets CameraControls fly to a hotspot before the page fades
 * to the next level. Only renders on demand (camera-controls invalidates while it moves).
 */
const SIZE = 4; // every model is scaled so its longest side is 4 world units
const CAMERA = {
  position: [0, 0, 10] as [number, number, number],
  fov: 38,
  near: 0.05,
  far: 200,
};
const GL = { antialias: true, powerPreference: "high-performance" as const };
// Direction the camera looks from when a level opens (model space after normalising).
const VIEW: Partial<Record<LevelId, [number, number, number]>> = {
  muscle: [-0.6, 0.12, 1],
  fascicle: [0.9, 0.55, 1],
  fiber: [0.9, 0.5, 1],
  myofibril: [0.25, 0.45, 1],
  sarcomere: [0.35, 0.45, 1],
  filaments: [0.3, 0.35, 1],
  heartwall: [0.35, 0.1, 1],
  cardiactissue: [0.6, 0.5, 1],
  cardiomyocyte: [0.45, 0.5, 1],
  cardiacmyofibril: [0.25, 0.45, 1],
  gutwall: [0.55, 0.45, 1],
  smoothtissue: [0.15, 0.35, 1],
  smoothcell: [0.35, 0.55, 1],
  densebodies: [0.45, 0.6, 1],
  smoothfilaments: [0.35, 0.4, 1],
  discs: [0.6, 0.55, 1],
};
// Where the camera moves when an animation starts, if the opening view hides the motion (elbow flexion is seen
// best from the side).
const ANIM_VIEW: Partial<Record<LevelId, [number, number, number]>> = { muscle: [-1, 0.12, 0.18] };
// Radius of the sphere the camera fits on open, as a fraction of SIZE / 2 (long, slim models can sit closer).
const FIT: Partial<Record<LevelId, number>> = {
  muscle: 1.02,
  fascicle: 0.82,
  fiber: 0.9,
  myofibril: 0.78,
  sarcomere: 0.95,
  heartwall: 1.1,
  cardiactissue: 0.8,
  cardiomyocyte: 1,
  cardiacmyofibril: 0.78,
  densebodies: 0.66,
  smoothfilaments: 0.75,
  discs: 0.8,
  filaments: 0.95,
  gutwall: 0.85,
};

/**
 * glTF node names are sanitised by three; the original is kept in userData.name.
 * Z-Anatomy adds ".r"/".l" and Blender numbers copies ".001" — both are dropped so copies share one part name.
 */
const nodeKey = (o: Object3D) =>
  String(o.userData.name ?? o.name)
    .replace(/\.\d+$/, "")
    .replace(/\.[lr]$/, "");
/** A mesh with several materials loads as a group of primitives — the part name sits on the group (the glTF node). */
function partKey(o: Object3D) {
  let n: Object3D | null = o;
  while (n && n.userData.name === undefined) n = n.parent;
  return nodeKey(n ?? o);
}
/** What the student picks: the part, or a sub-part of it (set per primitive when the model loads). */
const pickKey = (o: Object3D) => (o.userData.pick as string | undefined) ?? partKey(o);
// primitives (by material) that are their own structure inside a bigger part
const SUBPARTS: Record<string, string> = {
  Nucleus: "Nucleus",
  "Dense body": "Dense bodies",
  "Dense body (membrane)": "Membrane dense bodies",
  "Thick filament (myosin)": "Thick filaments",
  "Thin filament (actin)": "Thin filaments",
  "Z disc": "Z discs",
  "M line": "M lines",
};
const SKELETAL_NUCLEI: LevelId[] = ["fascicle", "fiber"]; // many nuclei per fiber
/** Parts drawn see-through (wrappings, membranes): the pointer looks through them to what is inside. */
const seeThrough = (o: Object3D) => {
  const m = (o as Mesh).material as MeshStandardMaterial | undefined;
  return !!m && m.transparent && m.opacity < 0.6;
};
/** Mesh under the pointer, looking through see-through layers when something solid lies behind them;
 * `wrap` = the see-through layer the pointer looked through (null if none). */
function hitOf(intersections: Intersection[]) {
  const meshes = intersections.filter((i) => i.object instanceof Mesh);
  const solid = meshes.find((i) => !seeThrough(i.object));
  const hit = (solid ?? meshes[0])?.object ?? null;
  const front = meshes[0]?.object;
  const wrap = solid && front && front !== solid.object && seeThrough(front) ? front : null;
  return { hit, wrap };
}

// Z-Anatomy exports carry no materials, so those levels are coloured by part name; our own models keep theirs.
const BONES = new Set(["Humerus", "Radius", "Ulna", "Scapula", "Clavicle"]);
const ARTERIES = new Set(["Ascending aorta", "Aortic arch", "Left coronary artery"]);
const TO_LUNGS_OR_VEINS = new Set(["Superior vena cava", "Pulmonary trunk", "Bifurcation of pulmonary trunk"]);
function zAnatomyColour(level: LevelId, key: string) {
  if (level === "heartwall") {
    // the layered block beside the heart: endocardium (inner lining) · myocardium (muscle) · epicardium (outer layer)
    if (key === "Endocardium") return "#f4c7c0";
    if (key === "Myocardium") return "#b03a30";
    if (key === "Epicardium") return "#f3dcb4";
    if (ARTERIES.has(key)) return "#c62828"; // oxygen-rich (textbook red)
    if (TO_LUNGS_OR_VEINS.has(key)) return "#3f66c4"; // oxygen-poor (textbook blue)
    return key.includes("atrium") ? "#b8625a" : "#a8463d";
  }
  if (key === "Epimysium") return "#eef2f7";
  if (BONES.has(key)) return "#e8dfcc";
  if (key.includes("biceps")) return "#d0473c";
  return "#9c5a50";
}
const Z_ANATOMY: LevelId[] = ["muscle", "heartwall"];
// wrappings and membranes that would hide what they wrap: drawn see-through (by part name, or "mat:<material>")
const SEE_THROUGH: Partial<Record<LevelId, Record<string, number>>> = {
  muscle: { Epimysium: 0.45 },
  fascicle: { Perimysium: 0.5, Endomysium: 0.35 },
  fiber: { Endomysium: 0.38 },
  cardiactissue: { Endomysium: 0.22 },
  smoothtissue: { "Extracellular matrix": 0.22, "mat:Smooth cell body": 0.5 },
  smoothcell: { "mat:Smooth cell body": 0.38 },
  densebodies: { "mat:Smooth cell body": 0.3 },
};

export type ZoomSceneProps = {
  level: ZoomLevel;
  /** Hotspot id, or "mesh:<name>" for a part that only shows its name. */
  selected: string | null;
  onSelect: (key: string | null) => void;
  /** Hotspot id to fly to before the page switches level (null = idle). */
  zoomTarget: string | null;
  onZoomDone: () => void;
  reducedMotion: boolean;
  /** Animation clock for this level (null = the level has no animation). */
  timeline: Timeline | null;
  /** Show the level's code-built molecular view (`level.molecular`) instead of its model. */
  molecular?: boolean;
  /** The part (node name) the student tapped, or null. */
  onPick?: (part: string | null) => void;
  /** Every tappable part of the loaded model (for the "All parts" list). */
  onParts?: (parts: string[]) => void;
  /** Fade everything except the selection (and make the faded parts click-through). */
  isolate?: boolean;
  /** Name tag shown where a part was clicked (set by ZoomScene). */
  label?: HoverLabel;
};

type HoverLabel = { show: (text: string, x: number, y: number) => void; hide: () => void };
type BaseLook = { transparent: boolean; opacity: number; depthWrite: boolean; raycast: Mesh["raycast"] };

type Anchor = { id: string; index: number; pos: Vector3; sphere: Sphere };

function LevelModel({ level, selected, onSelect, zoomTarget, onZoomDone, reducedMotion, timeline, onPick, onParts, isolate = false, label }: ZoomSceneProps) {
  const gltf = useGLTF(level.model, false, true);
  const controls = useThree((s) => s.controls) as CameraControls | null;
  const invalidate = useThree((s) => s.invalidate);
  const portrait = useThree((s) => s.size.width < s.size.height);
  const group = useRef<Group>(null);
  // numbered markers would cover the action, so they step aside while an animation plays
  const playing = useTimelinePlaying(timeline);

  // Own copy of the scene + materials so highlight state never leaks between visits.
  const { root, meshes } = useMemo(() => {
    // SkeletonUtils.clone re-binds skinned meshes (the arm is rigged) to their own copy of the bones
    const root = cloneSkinned(gltf.scene);
    const meshes: Mesh[] = [];
    root.traverse((o) => {
      if (!(o instanceof Mesh)) return;
      const key = partKey(o);
      const src = o.material as Material;
      const mat = Z_ANATOMY.includes(level.id)
        ? new MeshStandardMaterial({
            color: zAnatomyColour(level.id, key),
            roughness: BONES.has(key) ? 0.85 : 0.6,
          })
        : (src.clone() as MeshStandardMaterial);
      const see = SEE_THROUGH[level.id]?.[key] ?? SEE_THROUGH[level.id]?.[`mat:${src.name}`];
      if (see !== undefined) {
        mat.transparent = true;
        mat.opacity = see;
        mat.depthWrite = false;
      }
      o.material = mat;
      const sub = !Z_ANATOMY.includes(level.id) && o.userData.name === undefined ? SUBPARTS[src.name] : undefined;
      if (sub && sub !== key) o.userData.pick = sub === "Nucleus" && SKELETAL_NUCLEI.includes(level.id) ? "Nuclei" : sub;
      meshes.push(o);
    });
    // normalise: centre on the origin, longest side = SIZE (meshopt quantisation puts transforms on the nodes,
    // and a fresh clone's world matrices are stale until updated)
    root.updateMatrixWorld(true);
    const box = new Box3().setFromObject(root);
    const size = box.getSize(new Vector3());
    const s = SIZE / Math.max(size.x, size.y, size.z);
    root.position.copy(box.getCenter(new Vector3()).multiplyScalar(-s));
    root.scale.setScalar(s);
    return { root, meshes };
  }, [gltf, level.id]);
  useEffect(() => () => meshes.forEach((m) => (m.material as Material).dispose()), [meshes]);

  // hotspot id ← mesh name
  const meshToHotspot = useMemo(() => {
    const map = new Map<string, string>();
    level.hotspots.forEach((h) => h.meshes?.forEach((m) => map.set(m, h.id)));
    return map;
  }, [level]);

  // Anchor positions in world space (mesh → front of its bounding box, empty → its own position).
  const [anchors, setAnchors] = useState<Anchor[]>([]);
  useLayoutEffect(() => {
    group.current?.updateWorldMatrix(true, true);
    const found: Anchor[] = [];
    level.hotspots.forEach((h, index) => {
      let node: Object3D | undefined;
      root.traverse((o) => {
        if (!node && nodeKey(o) === h.anchor) node = o;
      });
      if (!node) return;
      const box = new Box3().setFromObject(node);
      if (!box.isEmpty()) {
        const sphere = box.getBoundingSphere(new Sphere());
        const [fx, fy, fz] = h.at ?? [0.5, 0.5, 1];
        const size = box.getSize(new Vector3());
        const pos = new Vector3(box.min.x + size.x * fx, box.min.y + size.y * fy, box.min.z + size.z * fz);
        found.push({ id: h.id, index, pos, sphere });
      } else {
        const pos = node.getWorldPosition(new Vector3());
        found.push({
          id: h.id,
          index,
          pos,
          sphere: new Sphere(pos.clone(), SIZE * 0.12),
        });
      }
    });
    setAnchors(found);
  }, [root, level]);

  // Open the level: start a little closer, then ease out to fit the whole model (instant with reduced motion).
  useEffect(() => {
    if (!controls) return;
    const dir = new Vector3(...(VIEW[level.id] ?? [0.4, 0.4, 1])).normalize();
    // portrait screens: fit the whole model (the tighter landscape fit would crop its ends)
    const sphere = new Sphere(new Vector3(), (SIZE / 2) * (portrait ? 1.02 : (FIT[level.id] ?? 0.9)));
    controls.setLookAt(dir.x * 6, dir.y * 6, dir.z * 6, 0, 0, 0, false);
    void controls.fitToSphere(sphere, !reducedMotion);
    invalidate();
  }, [controls, level.id, portrait, reducedMotion, invalidate]);

  // Turn to the animation's view when it starts playing
  useEffect(() => {
    const v = ANIM_VIEW[level.id];
    if (!playing || !v || !controls) return;
    const dir = new Vector3(...v).normalize();
    const dist = controls.distance;
    void controls.setLookAt(dir.x * dist, dir.y * dist, dir.z * dist, 0, 0, 0, !reducedMotion);
  }, [playing, level.id, controls, reducedMotion]);

  // Warm up the levels this one zooms into: parse their .glb while the student is reading, not during the fade
  useEffect(() => {
    const next = level.hotspots.map((h) => (h.zoomTo ? levelById(h.zoomTo)?.model : "")).filter((u): u is string => !!u);
    if (!next.length) return;
    const t = window.setTimeout(() => next.forEach((u) => useGLTF.preload(u, false, true)), 1500);
    return () => window.clearTimeout(t);
  }, [level]);

  // Fly to the hotspot we are zooming into, then hand back to the page (which fades and swaps the level).
  useEffect(() => {
    if (!zoomTarget || !controls) return;
    const a = anchors.find((x) => x.id === zoomTarget);
    if (!a || reducedMotion) {
      onZoomDone();
      return;
    }
    const tight = new Sphere(a.sphere.center, a.sphere.radius * 0.45);
    let alive = true;
    void controls.fitToSphere(tight, true).then(() => alive && onZoomDone());
    return () => {
      alive = false;
    };
  }, [zoomTarget, controls, anchors, reducedMotion, onZoomDone]);

  // every tappable part, in model order (for the "All parts" list)
  useEffect(() => onParts?.([...new Set(meshes.map(pickKey))]), [meshes, onParts]);

  const pickedRef = useRef<string | null>(null); // last part picked by a click (for the click-again-to-pick-the-layer rule)
  useEffect(() => {
    if (selected !== null) return;
    pickedRef.current = null;
    label?.hide();
  }, [selected, label]);

  // Highlight: emissive glow on the selected hotspot's meshes (or the single tapped part); with "isolate" everything
  // else fades and lets clicks through.
  useEffect(() => {
    const anySel = selected !== null;
    meshes.forEach((m) => {
      const key = partKey(m);
      const pick = pickKey(m);
      const on = anySel && ((meshToHotspot.get(pick) ?? meshToHotspot.get(key)) === selected || selected === `mesh:${pick}`);
      const g = on ? 0.45 : 0;
      const mat = m.material as MeshStandardMaterial;
      mat.emissive = new Color(g ? mat.color : "#000000");
      mat.emissiveIntensity = g;
      m.userData.selGlow = g; // animations glow on top of this
      const base = (m.userData.base ??= { transparent: mat.transparent, opacity: mat.opacity, depthWrite: mat.depthWrite, raycast: m.raycast }) as BaseLook;
      const fade = isolate && anySel && !on;
      if (mat.transparent !== (fade || base.transparent)) mat.needsUpdate = true;
      mat.transparent = fade || base.transparent;
      mat.opacity = fade ? Math.min(base.opacity, 0.1) : base.opacity;
      mat.depthWrite = fade ? false : base.depthWrite;
      m.raycast = fade ? () => {} : base.raycast;
    });
    invalidate();
  }, [selected, isolate, meshes, meshToHotspot, invalidate]);

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    // a marker under the pointer wins over the mesh in front of it (markers are drawn on top of everything)
    const marker = e.intersections.find((i) => i.object.type === "Sprite" && i.object.userData.hotspot);
    const x = e.nativeEvent.clientX;
    const y = e.nativeEvent.clientY;
    if (marker) {
      const id = marker.object.userData.hotspot as string;
      onSelect(id);
      onPick?.(null);
      const h = level.hotspots.find((v) => v.id === id);
      if (h) label?.show(h.name, x, y);
      return;
    }
    const { hit, wrap } = hitOf(e.intersections);
    if (!hit) return;
    // clicking the same spot again picks the see-through layer in front of it (e.g. the endomysium around a fiber)
    const inner = pickKey(hit);
    const target = wrap && pickedRef.current === inner ? wrap : hit;
    const pick = pickKey(target);
    pickedRef.current = pick;
    onSelect(meshToHotspot.get(pick) ?? meshToHotspot.get(partKey(target)) ?? `mesh:${pick}`);
    onPick?.(pick);
    const around = target === hit && wrap && pickKey(wrap) !== pick ? partInfo(pickKey(wrap), level.id).name : null;
    const name = partInfo(pick, level.id).name;
    label?.show(around ? `${name} · in ${around}` : name, x, y);
  };

  return (
    <group ref={group}>
      <primitive
        object={root}
        onClick={onClick}
      />
      {timeline && <LevelAnimation level={level.id} root={root} meshes={meshes} clips={gltf.animations} tl={timeline} keyOf={partKey} size={SIZE} />}
      {!playing && anchors.map((a) => <Marker key={a.id} id={a.id} n={a.index + 1} pos={a.pos} active={selected === a.id} onClick={() => onSelect(a.id)} />)}
    </group>
  );
}

/** Advances the animation clock and keeps frames coming while it plays (the canvas otherwise renders on demand). */
function TimelineDriver({ tl }: { tl: Timeline }) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => tl.subscribe(() => invalidate()), [tl, invalidate]);
  useFrame((_, dt) => {
    if (!tl.playing) return;
    tl.tick(Math.min(dt, 0.1));
    invalidate();
  });
  return null;
}

/** Shows the progress of the .glb download over the viewer. */
function Progress() {
  const { active, progress } = useProgress();
  if (!active) return null;
  return (
    <div className="pointer-events-none absolute inset-0 grid place-items-center">
      <span className="rounded-full bg-[var(--c-chip)] px-4 py-1.5 text-[13px] font-semibold text-[var(--c-text)] ring-1 ring-[var(--c-hair)]">
        Loading model… {Math.round(progress)}%
      </span>
    </div>
  );
}

// levels drawn in code (molecular structures, the dense-body network): each loads only when a student reaches it
const CODE_SCENES: Record<CodeScene, LazyExoticComponent<ComponentType<ZoomSceneProps>>> = {
  filaments: lazy(() => import("./filaments")),
  discs: lazy(() => import("./discs")),
  smoothfilaments: lazy(() => import("./smoothfilaments")),
};

const Perf = import.meta.env.DEV ? lazy(() => import("r3f-perf").then((m) => ({ default: m.Perf }))) : null;
const showPerf = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("perf");

export default function ZoomScene(props: ZoomSceneProps) {
  const [failed, setFailed] = useState<string | null>(null);
  const code = props.level.scene ?? (props.molecular ? props.level.molecular : undefined);
  const key = props.level.id + (code ? `:${code}` : "");
  const CodeLevel = code ? CODE_SCENES[code] : null;
  // name tag that follows the mouse — moved directly (no React render per pointer move)
  const tag = useRef<HTMLDivElement>(null);
  const label = useMemo<HoverLabel>(
    () => ({
      show(text, x, y) {
        const el = tag.current;
        if (!el) return;
        if (el.textContent !== text) el.textContent = text;
        const box = el.parentElement!.getBoundingClientRect();
        el.style.display = "block";
        // centred just above the pointer, kept inside the viewer
        const w = el.offsetWidth;
        const h = el.offsetHeight;
        const left = Math.min(Math.max(4, x - box.left - w / 2), box.width - w - 4);
        const top = y - box.top - h - 14 < 4 ? y - box.top + 22 : y - box.top - h - 14;
        el.style.transform = `translate(${left}px, ${top}px)`;
      },
      hide() {
        if (tag.current) tag.current.style.display = "none";
      },
    }),
    [],
  );
  return (
    // The name tag belongs to the click that made it: any new press (a drag to rotate, the next click) or a zoom
    // removes it, so it never points at a part that has moved away.
    <div className="absolute inset-0" onPointerDown={() => label.hide()} onWheel={() => label.hide()}>
      <Canvas
        frameloop={showPerf ? "always" : "demand"}
        dpr={[1, 1.5]}
        camera={CAMERA}
        gl={GL}
        onPointerMissed={() => {
          props.onSelect(null);
          props.onPick?.(null);
          label.hide();
        }}
        aria-label={`3D model: ${props.level.title}`}
      >
        <ambientLight intensity={0.7} />
        <directionalLight position={[4, 6, 6]} intensity={1.7} />
        <directionalLight position={[-5, -2, -4]} intensity={0.5} />
        <Suspense fallback={null}>
          <LevelErrorCatcher onError={setFailed} levelKey={key}>
            {CodeLevel ? <CodeLevel {...props} /> : <LevelModel {...props} label={label} />}
          </LevelErrorCatcher>
        </Suspense>
        {props.timeline && <TimelineDriver tl={props.timeline} />}
        <CameraControls makeDefault minDistance={0.6} maxDistance={30} smoothTime={0.45} />
        {Perf && showPerf && (
          <Suspense fallback={null}>
            <Perf position="top-left" style={{ position: "absolute", top: 8, left: 8, zIndex: 5 }} />
          </Suspense>
        )}
      </Canvas>
      {failed === key && (
        <div className="absolute inset-0 grid place-items-center p-6 text-center text-[14px] font-semibold text-[var(--c-muted)]">
          This level’s 3D model isn’t available yet.
        </div>
      )}
      <div
        ref={tag}
        aria-hidden="true"
        style={{ display: "none" }}
        className="pointer-events-none absolute left-0 top-0 z-10 max-w-[240px] rounded-lg bg-[var(--c-chip)] px-2.5 py-1 text-[12.5px] font-bold text-[var(--c-text)] shadow-md ring-1 ring-[var(--c-hair)]"
      />
      <Progress />
    </div>
  );
}

/** A missing .glb must not take the whole canvas down — report it and render nothing for this level. */
class LevelErrorCatcher extends Component<{ children: ReactNode; levelKey: string; onError: (k: string) => void }, { failed: boolean; key: string }> {
  state = { failed: false, key: this.props.levelKey };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  static getDerivedStateFromProps(p: { levelKey: string }, s: { failed: boolean; key: string }) {
    return p.levelKey !== s.key ? { failed: false, key: p.levelKey } : null;
  }
  componentDidCatch() {
    this.props.onError(this.props.levelKey);
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}
