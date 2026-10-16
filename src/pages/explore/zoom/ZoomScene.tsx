import { Component, Suspense, lazy, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { CameraControls, useGLTF, useProgress } from "@react-three/drei";
import { Box3, Color, Group, Mesh, MeshStandardMaterial, Sphere, Vector3, type Material, type Object3D } from "three";
import type { LevelId, ZoomLevel } from "@/content/exploreZoom";
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
  arm: [-0.6, 0.12, 1],
  fascicle: [0.9, 0.55, 1],
  fiber: [0.9, 0.5, 1],
  myofibril: [0.25, 0.45, 1],
  heart: [0.15, 0.1, 1],
  cardiac: [0.6, 0.5, 1],
  sarcomere: [0.35, 0.45, 1],
  smoothtissue: [0.15, 0.35, 1],
  smoothcell: [0.35, 0.55, 1],
};
// Where the camera moves when an animation starts, if the opening view hides the motion (elbow flexion is seen
// best from the side).
const ANIM_VIEW: Partial<Record<LevelId, [number, number, number]>> = { arm: [-1, 0.12, 0.18] };
// Radius of the sphere the camera fits on open, as a fraction of SIZE / 2 (long, slim models can sit closer).
const FIT: Partial<Record<LevelId, number>> = { arm: 1.02, fascicle: 0.82, fiber: 0.9, myofibril: 0.78, heart: 1.1, cardiac: 0.8, sarcomere: 0.78 };

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

// Z-Anatomy exports carry no materials, so those levels are coloured by part name; our own models keep theirs.
const BONES = new Set(["Humerus", "Radius", "Ulna", "Scapula", "Clavicle"]);
const ARTERIES = new Set(["Ascending aorta", "Aortic arch", "Left coronary artery"]);
const TO_LUNGS_OR_VEINS = new Set(["Superior vena cava", "Pulmonary trunk", "Bifurcation of pulmonary trunk"]);
function zAnatomyColour(level: LevelId, key: string) {
  if (level === "heart") {
    if (ARTERIES.has(key)) return "#c62828"; // oxygen-rich (textbook red)
    if (TO_LUNGS_OR_VEINS.has(key)) return "#3f66c4"; // oxygen-poor (textbook blue)
    return key.includes("atrium") ? "#b8625a" : "#a8463d";
  }
  if (BONES.has(key)) return "#e8dfcc";
  if (key.includes("biceps")) return "#d0473c";
  return "#9c5a50";
}
const Z_ANATOMY: LevelId[] = ["arm", "heart"];

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
};

type Anchor = { id: string; index: number; pos: Vector3; sphere: Sphere };

function LevelModel({ level, selected, onSelect, zoomTarget, onZoomDone, reducedMotion, timeline }: ZoomSceneProps) {
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
      o.material = mat;
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

  // Highlight: emissive glow on the selected hotspot's meshes (or the single tapped part).
  useEffect(() => {
    meshes.forEach((m) => {
      const key = partKey(m);
      const on = selected !== null && (meshToHotspot.get(key) === selected || selected === `mesh:${key}`);
      const mat = m.material as MeshStandardMaterial;
      mat.emissive = new Color(on ? mat.color : "#000000");
      mat.emissiveIntensity = on ? 0.45 : 0;
      m.userData.selGlow = on ? 0.45 : 0; // animations glow on top of this
    });
    invalidate();
  }, [selected, meshes, meshToHotspot, invalidate]);

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    // a marker under the pointer wins over the mesh in front of it (markers are drawn on top of everything)
    const marker = e.intersections.find((i) => i.object.type === "Sprite" && i.object.userData.hotspot);
    if (marker) {
      onSelect(marker.object.userData.hotspot as string);
      return;
    }
    const key = partKey(e.object);
    onSelect(meshToHotspot.get(key) ?? `mesh:${key}`);
  };

  return (
    <group ref={group}>
      <primitive
        object={root}
        onClick={onClick}
        onPointerOver={(e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => (document.body.style.cursor = "")}
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

// the molecular cross-bridge view (and its PDB data) loads only when a student reaches that level
const CrossBridgeModel = lazy(() => import("./crossbridge").then((m) => ({ default: m.CrossBridgeModel })));

const Perf = import.meta.env.DEV ? lazy(() => import("r3f-perf").then((m) => ({ default: m.Perf }))) : null;
const showPerf = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("perf");

export default function ZoomScene(props: ZoomSceneProps) {
  const [failed, setFailed] = useState<string | null>(null);
  const key = props.level.id;
  return (
    <div className="absolute inset-0">
      <Canvas
        frameloop={showPerf ? "always" : "demand"}
        dpr={[1, 1.5]}
        camera={CAMERA}
        gl={GL}
        onPointerMissed={() => props.onSelect(null)}
        aria-label={`3D model: ${props.level.title}`}
      >
        <ambientLight intensity={0.7} />
        <directionalLight position={[4, 6, 6]} intensity={1.7} />
        <directionalLight position={[-5, -2, -4]} intensity={0.5} />
        <Suspense fallback={null}>
          <LevelErrorCatcher onError={setFailed} levelKey={key}>
            {props.level.scene === "crossbridge" ? <CrossBridgeModel {...props} /> : <LevelModel {...props} />}
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
