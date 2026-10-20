import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  AdditiveBlending,
  AnimationMixer,
  type AnimationClip,
  BufferAttribute,
  BufferGeometry,
  Box3,
  CanvasTexture,
  Color,
  Mesh,
  Quaternion,
  Vector3,
  type MeshStandardMaterial,
  type Object3D,
  type Points,
} from "three";
import type { LevelId } from "@/content/exploreZoom";
import { pulse, ramp, sarcomereContraction, type Timeline } from "../anim/timeline";

/**
 * Per-level animations driven by a Timeline (t: 0 → 1). Each one only touches its own meshes / helper objects and
 * runs inside useFrame, so React does not re-render while it plays. Captions live in src/content/exploreAnims.ts.
 */
export type AnimCtx = {
  root: Object3D;
  meshes: Mesh[];
  /** Animation clips that came with the .glb (e.g. the arm's elbow flexion). */
  clips: AnimationClip[];
  tl: Timeline;
  /** Same naming rules as the scene (strips ".l"/".r" and Blender ".001"). */
  keyOf: (o: Object3D) => string;
  size: number;
};

export function LevelAnimation({ level, ...ctx }: AnimCtx & { level: LevelId }) {
  switch (level) {
    case "muscle":
      return <WholeMuscle {...ctx} />;
    case "fascicle":
      return <FascicleLayers {...ctx} />;
    case "fiber":
      return <FiberExcitation {...ctx} />;
    case "myofibril":
    case "cardiacmyofibril":
      return <MyofibrilContraction {...ctx} />;
    case "sarcomere":
      return <MyofibrilContraction {...ctx} curve={sarcomereContraction} />;
    case "filaments":
      return <MyofilamentCycle {...ctx} />;
    case "heartwall":
      return <HeartWall {...ctx} />;
    case "cardiactissue":
      return <CardiacWave {...ctx} />;
    case "cardiomyocyte":
      return <CardiomyocyteExcitation {...ctx} />;
    case "gutwall":
      return <GutWall {...ctx} />;
    case "smoothtissue":
      return <SmoothTissue {...ctx} />;
    case "smoothcell":
      return <SmoothCell {...ctx} />;
    case "densebodies":
      return <DenseBodyContraction {...ctx} />;
    case "smoothfilaments":
      return <SmoothMyofilamentCycle {...ctx} />;
    case "discs":
      return <DiscCoupling {...ctx} />;
    default:
      return null;
  }
}

// ---------- shared helpers ----------
/** World position of an empty / node by its (unsanitised) name. */
function findNode(root: Object3D, keyOf: (o: Object3D) => string, name: string) {
  let found: Object3D | undefined;
  root.traverse((o) => {
    if (!found && keyOf(o) === name) found = o;
  });
  return found;
}
function worldPos(root: Object3D, keyOf: (o: Object3D) => string, name: string) {
  root.updateMatrixWorld(true);
  return findNode(root, keyOf, name)?.getWorldPosition(new Vector3()) ?? new Vector3();
}
function meshesNamed(meshes: Mesh[], keyOf: (o: Object3D) => string, name: string) {
  return meshes.filter((m) => keyOf(m) === name);
}
/** Glow on top of the selection highlight (keeps whichever is stronger). */
function glow(ms: Mesh[], amount: number, colour?: Color) {
  for (const m of ms) {
    const mat = m.material as MeshStandardMaterial;
    const sel = (m.userData.selGlow as number) ?? 0;
    if (amount > sel) {
      mat.emissive.copy(colour ?? mat.color);
      mat.emissiveIntensity = amount;
    } else {
      mat.emissive.copy(sel > 0 ? mat.color : BLACK);
      mat.emissiveIntensity = sel;
    }
  }
}
const BLACK = new Color("#000000");
/** Random points on a mesh's surface (its vertices), in world space. */
function sampleVertices(ms: Mesh[], n: number) {
  const out: Vector3[] = [];
  const all: Vector3[] = [];
  for (const m of ms) {
    m.updateWorldMatrix(true, false);
    const pos = m.geometry.getAttribute("position");
    const step = Math.max(1, Math.floor(pos.count / 400));
    for (let i = 0; i < pos.count; i += step) all.push(new Vector3().fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld));
  }
  for (let i = 0; i < n && all.length; i++) out.push(all[Math.floor(rand(i) * all.length)]);
  return out;
}
/** Deterministic pseudo-random 0..1 (same particles every visit). */
const rand = (i: number) => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

/** Round soft dot used by every particle cloud (points are square without it). */
function useDotTexture() {
  const tex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const g = c.getContext("2d")!;
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.55, "rgba(255,255,255,0.9)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    return new CanvasTexture(c);
  }, []);
  useEffect(() => () => tex.dispose(), [tex]);
  return tex;
}

/** A cloud of small dots that we move every frame. */
function useParticles(count: number) {
  const geo = useMemo(() => {
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(new Float32Array(count * 3), 3));
    return g;
  }, [count]);
  useEffect(() => () => geo.dispose(), [geo]);
  return geo;
}

// ---------- muscle fiber: NMJ → sarcolemma → T-tubules → SR releases Ca²⁺ (lecture §9–§11 steps 1–4) ----------
const AP_YELLOW = new Color("#fde047");
const T_BLUE = new Color("#60a5fa");
const CA_LIME = new Color("#a3e635");

function FiberExcitation({ root, meshes, tl, keyOf, size }: AnimCtx) {
  const parts = useMemo(() => {
    const top = worldPos(root, keyOf, "anim_axon_top");
    const end = worldPos(root, keyOf, "anim_axon_end");
    const cleft = worldPos(root, keyOf, "anim_cleft");
    const cisternae = meshesNamed(meshes, keyOf, "Terminal cisternae");
    const caFrom = sampleVertices(cisternae, 220);
    const caDir = caFrom.map((_, i) => new Vector3(rand(i * 3) - 0.5, rand(i * 3 + 1) - 0.5, rand(i * 3 + 2) - 0.5).normalize());
    const vesicles = Array.from({ length: 14 }, (_, i) => new Vector3(rand(i + 50) - 0.5, rand(i + 70) - 0.5, rand(i + 90) - 0.5).multiplyScalar(size * 0.03));
    return {
      top,
      end,
      cleft,
      vesicles,
      caFrom,
      caDir,
      axon: [...meshesNamed(meshes, keyOf, "Motor neuron axon"), ...meshesNamed(meshes, keyOf, "Axon terminal")],
      sarcolemma: meshesNamed(meshes, keyOf, "Sarcolemma"),
      tTubules: meshesNamed(meshes, keyOf, "T-tubules"),
      cisternae,
      sr: meshesNamed(meshes, keyOf, "Sarcoplasmic reticulum"),
      myofibrils: meshesNamed(meshes, keyOf, "Myofibrils"),
    };
  }, [root, meshes, keyOf, size]);

  const ap = useRef<Mesh>(null);
  const ach = useRef<Points>(null);
  const ca = useRef<Points>(null);
  const achGeo = useParticles(parts.vesicles.length);
  const caGeo = useParticles(parts.caFrom.length);
  const v = useMemo(() => new Vector3(), []);
  const dotTex = useDotTexture();

  useFrame(() => {
    const t = tl.t;
    // 1 · action potential runs down the axon
    const run = ramp(t, 0.01, 0.12);
    if (ap.current) {
      ap.current.visible = t > 0.005 && t < 0.14;
      ap.current.position.lerpVectors(parts.top, parts.end, run);
    }
    glow(parts.axon, 0.15 + 0.6 * pulse(t, 0.0, 0.2), AP_YELLOW);

    // 2 · ACh vesicles empty into the cleft and diffuse to the sarcolemma
    if (ach.current) {
      const go = ramp(t, 0.12, 0.24);
      ach.current.visible = t > 0.1 && t < 0.3;
      const arr = achGeo.getAttribute("position") as BufferAttribute;
      parts.vesicles.forEach((off, i) => {
        v.copy(parts.end)
          .add(off)
          .lerp(parts.cleft.clone().add(off.clone().multiplyScalar(1.8)), go);
        arr.setXYZ(i, v.x, v.y, v.z);
      });
      arr.needsUpdate = true;
    }

    // 3 · muscle action potential along the sarcolemma, then into the T-tubules
    glow(parts.sarcolemma, 0.55 * pulse(t, 0.22, 0.48), AP_YELLOW);
    glow(parts.tTubules, 0.9 * pulse(t, 0.4, 0.64), T_BLUE);

    // 4 · terminal cisternae / SR release Ca²⁺ into the sarcoplasm
    glow(parts.cisternae, 0.8 * pulse(t, 0.56, 0.8), CA_LIME);
    glow(parts.sr, 0.4 * pulse(t, 0.56, 0.84), CA_LIME);
    if (ca.current) {
      const out = ramp(t, 0.58, 0.88);
      ca.current.visible = t > 0.58;
      const arr = caGeo.getAttribute("position") as BufferAttribute;
      parts.caFrom.forEach((p, i) => {
        v.copy(p).addScaledVector(parts.caDir[i], out * size * 0.05 * (0.4 + rand(i + 7)));
        arr.setXYZ(i, v.x, v.y, v.z);
      });
      arr.needsUpdate = true;
      (ca.current.material as { opacity: number }).opacity = 1 - ramp(t, 0.93, 1);
    }
    // Ca²⁺ reaches the myofibrils
    glow(parts.myofibrils, 0.35 * pulse(t, 0.8, 1), CA_LIME);
  });

  const dot = size * 0.012;
  return (
    <group>
      <mesh ref={ap} visible={false}>
        <sphereGeometry args={[dot * 1.6, 16, 12]} />
        <meshBasicMaterial color={AP_YELLOW} toneMapped={false} />
      </mesh>
      <points ref={ach} geometry={achGeo} visible={false}>
        {/* points size is in pixels at 1 unit distance (× half the canvas height), not world units */}
        <pointsMaterial map={dotTex} color="#f97316" size={0.32} sizeAttenuation transparent alphaTest={0.05} depthWrite={false} />
      </points>
      <points ref={ca} geometry={caGeo} visible={false}>
        <pointsMaterial map={dotTex} color={CA_LIME} size={0.2} sizeAttenuation transparent depthWrite={false} blending={AdditiveBlending} />
      </points>
    </group>
  );
}

// ---------- whole muscle: epimysium, then the biceps bends the elbow and the triceps straightens it (§3.2, §1.1, §2.4) ----------
const ACTIVE = new Color("#ff5a3c");
const WRAP = new Color("#e0f2fe");

function WholeMuscle({ root, meshes, clips, tl, keyOf }: AnimCtx) {
  // one clip for the rig + one per shape-keyed mesh (biceps heads and their epimysium copies); all the same length,
  // each going 0 → 120° flexion → 0
  const { mixer, actions } = useMemo(() => {
    const mixer = new AnimationMixer(root);
    return { mixer, actions: clips.map((c) => mixer.clipAction(c)) };
  }, [root, clips]);
  // start in an effect (and stop in its cleanup) so a StrictMode remount re-starts the actions
  useEffect(() => {
    actions.forEach((a) => a.play());
    return () => {
      mixer.stopAllAction();
    };
  }, [mixer, actions]);

  const biceps = useMemo(() => meshes.filter((m) => keyOf(m).includes("biceps brachii")), [meshes, keyOf]);
  const triceps = useMemo(() => meshes.filter((m) => keyOf(m).includes("triceps brachii")), [meshes, keyOf]);
  // the scene already made the epimysium see-through; fade from that opacity
  const epi = useMemo(
    () => meshesNamed(meshes, keyOf, "Epimysium").map((m) => ({ m, mat: m.material as MeshStandardMaterial, base: (m.material as MeshStandardMaterial).opacity })),
    [meshes, keyOf],
  );

  useFrame(() => {
    const t = tl.t;
    // 0–0.22 the epimysium wraps the muscle · 0.22–0.4 it fades so the muscle shows · 0.4–0.7 flex · 0.7–1 extend
    // (set the action's own time; a paused action ignores the mixer clock)
    const u = ramp(t, 0.4, 0.97);
    for (const a of actions) a.time = u * a.getClip().duration;
    mixer.update(0);
    const show = 1 - ramp(t, 0.22, 0.36);
    epi.forEach((e) => (e.mat.opacity = e.base * (0.3 + 0.7 * show)));
    glow(
      epi.map((e) => e.m),
      0.6 * pulse(t, 0, 0.24), WRAP);
    glow(biceps, 0.55 * pulse(t, 0.38, 0.72), ACTIVE);
    glow(triceps, 0.55 * pulse(t, 0.68, 1), ACTIVE);
  });
  return null;
}

// ---------- shared: scale a node about its own bounding-box centre (works for mesh nodes and multi-material groups) ----------
type Pulsable = { node: Object3D; centre: Vector3; pos: Vector3; scale: Vector3 };
function pulsable(node: Object3D, about?: Vector3): Pulsable {
  node.updateWorldMatrix(true, true);
  const box = new Box3().setFromObject(node);
  const centreWorld = about ? about.clone() : box.getCenter(new Vector3());
  const centre = node.parent ? node.parent.worldToLocal(centreWorld.clone()) : centreWorld;
  return { node, centre, pos: node.position.clone(), scale: node.scale.clone() };
}
/** k = uniform factor, or [along x, across] for a cell shortening along its length. */
function setScale(p: Pulsable, k: number | [number, number]) {
  const [kx, kyz] = typeof k === "number" ? [k, k] : k;
  p.node.scale.set(p.scale.x * kx, p.scale.y * kyz, p.scale.z * kyz);
  p.node.position.set(p.centre.x + (p.pos.x - p.centre.x) * kx, p.centre.y + (p.pos.y - p.centre.y) * kyz, p.centre.z + (p.pos.z - p.centre.z) * kyz);
}
/** Top-level glTF nodes whose name starts with `prefix` (e.g. every "Cardiac muscle cells.00N"), in name order. */
function nodesNamed(root: Object3D, prefix: string) {
  const out: Object3D[] = [];
  root.traverse((o) => {
    const n = o.userData.name as string | undefined;
    if (n && n.startsWith(prefix)) out.push(o);
  });
  return out.sort((a, b) => String(a.userData.name).localeCompare(String(b.userData.name)));
}
const meshesUnder = (o: Object3D) => {
  const out: Mesh[] = [];
  o.traverse((c) => c instanceof Mesh && out.push(c));
  return out;
};

// ---------- heart wall: the heart beats; the myocardium is the layer doing the work (§14) ----------
const BEAT = new Color("#ff6b5b");

function HeartWall({ root, meshes, tl, keyOf }: AnimCtx) {
  const parts = useMemo(() => {
    const pick = (re: RegExp) => {
      const out: Pulsable[] = [];
      root.traverse((o) => {
        const n = o.userData.name as string | undefined;
        if (n && re.test(n) && o instanceof Mesh) out.push(pulsable(o));
      });
      return out;
    };
    return { atria: pick(/atrium/), ventricles: pick(/ventricle/), myocardium: meshesNamed(meshes, keyOf, "Myocardium") };
  }, [root, meshes, keyOf]);

  useFrame(() => {
    const t = tl.t;
    // two beats per loop: the upper chambers squeeze a little first, then the lower ones, then everything relaxes
    const beat = (t * 2) % 1;
    const a = pulse(beat, 0.0, 0.32);
    const v = pulse(beat, 0.25, 0.7);
    parts.atria.forEach((p) => setScale(p, 1 - 0.06 * a));
    parts.ventricles.forEach((p) => setScale(p, 1 - 0.08 * v));
    glow(
      parts.atria.map((p) => p.node as Mesh),
      0.35 * a,
      BEAT,
    );
    glow(
      parts.ventricles.map((p) => p.node as Mesh),
      0.35 * v,
      BEAT,
    );
    glow(parts.myocardium, Math.max(0.4 * v, 0.6 * pulse(t, 0.28, 0.62)), BEAT);
  });
  return null;
}

// ---------- cardiac tissue: signal passes cell to cell through gap junctions, then cells contract (§14) ----------
const SIGNAL = new Color("#fde047");

function CardiacWave({ root, tl }: AnimCtx) {
  const parts = useMemo(() => {
    root.updateMatrixWorld(true);
    const centre = new Box3().setFromObject(root).getCenter(new Vector3());
    // each cell / disc carries the time the signal reaches it (extras "t", spreading from one corner); rescale to 0..1
    const cells = nodesNamed(root, "Cardiac muscle cells.");
    const discs = nodesNamed(root, "Intercalated discs.");
    const ts = [...cells, ...discs].map((n) => Number(n.userData.t ?? 0));
    const lo = Math.min(...ts);
    const span = Math.max(1e-3, Math.max(...ts) - lo);
    const norm = (n: Object3D) => (Number(n.userData.t ?? 0) - lo) / span;
    const whole = root.children.filter((c) => c.userData.name && !/^(hs_|anim_)/.test(String(c.userData.name)));
    return {
      cells: cells.map((n) => ({ ms: meshesUnder(n), t: norm(n) })),
      discs: discs.map((n) => ({ ms: meshesUnder(n), t: norm(n) })),
      nodes: whole.map((n) => pulsable(n, centre)),
      capillaries: nodesNamed(root, "Capillaries").flatMap(meshesUnder),
    };
  }, [root]);

  useFrame(() => {
    const t = tl.t;
    // 0.2–0.6: the signal spreads cell to cell through the intercalated discs
    parts.cells.forEach((c) => {
      const on = 0.2 + c.t * 0.38;
      glow(c.ms, 0.55 * pulse(t, on - 0.03, on + 0.14), SIGNAL);
    });
    parts.discs.forEach((d) => {
      const on = 0.2 + d.t * 0.38;
      glow(d.ms, 1.2 * pulse(t, on - 0.03, on + 0.08), SIGNAL);
    });
    // then the tissue contracts as one (shorter along the cells, slightly thicker) and relaxes
    const squeeze = ramp(t, 0.6, 0.72) * (1 - ramp(t, 0.84, 0.97));
    parts.nodes.forEach((n) => setScale(n, [1 - 0.06 * squeeze, 1 + 0.02 * squeeze]));
    glow(parts.capillaries, 0.7 * pulse(t, 0.84, 1), BEAT);
  });
  return null;
}

// ---------- smooth muscle tissue: varicosities → gap junctions → coordinated contraction (lecture §15) ----------
const NT = new Color("#fbbf24");
const GJ = new Color("#67e8f9");

function SmoothTissue({ root, meshes, tl, keyOf, size }: AnimCtx) {
  const parts = useMemo(() => {
    const path = nodesNamed(root, "anim_nerve_").map((n) => n.getWorldPosition(new Vector3()));
    const cells = nodesNamed(root, "Smooth muscle cells.");
    // cells light up in order of distance from the nerve's middle varicosity (signal spreads cell to cell)
    const mid = path[Math.floor(path.length / 2)] ?? new Vector3();
    const withDist = cells.map((c) => ({ p: pulsable(c), ms: meshesUnder(c), d: c.getWorldPosition(new Vector3()).distanceTo(mid) }));
    const maxD = Math.max(...withDist.map((c) => c.d), 1e-3);
    return {
      path,
      cells: withDist.map((c) => ({ ...c, d: c.d / maxD })),
      nerve: [...meshesNamed(meshes, keyOf, "Autonomic nerve fiber")],
      varicosities: meshesNamed(meshes, keyOf, "Varicosities"),
      gaps: meshesNamed(meshes, keyOf, "Gap junctions"),
    };
  }, [root, meshes, keyOf]);
  const ap = useRef<Mesh>(null);
  const v = useMemo(() => new Vector3(), []);

  useFrame(() => {
    const t = tl.t;
    // signal runs along the autonomic fiber, varicosities release neurotransmitter
    const run = ramp(t, 0.0, 0.22) * (parts.path.length - 1);
    if (ap.current && parts.path.length > 1) {
      const i = Math.min(parts.path.length - 2, Math.floor(run));
      v.lerpVectors(parts.path[i], parts.path[i + 1], run - i);
      ap.current.position.copy(v);
      ap.current.visible = t < 0.26;
    }
    glow(parts.nerve, 0.4 * pulse(t, 0, 0.3), NT);
    glow(parts.varicosities, 0.9 * pulse(t, 0.12, 0.4), NT);
    // spread through gap junctions, then all cells shorten together and relax
    glow(parts.gaps, 1.0 * pulse(t, 0.28, 0.62), GJ);
    const squeeze = ramp(t, 0.5, 0.65) * (1 - ramp(t, 0.78, 0.96));
    parts.cells.forEach((c) => {
      const on = 0.3 + c.d * 0.25;
      glow(c.ms, 0.45 * pulse(t, on, on + 0.3), NT);
      setScale(c.p, [1 - 0.18 * squeeze, 1 + 0.12 * squeeze]); // along each cell's own length (local x)
    });
  });
  return (
    <mesh ref={ap} visible={false}>
      <sphereGeometry args={[size * 0.018, 16, 12]} />
      <meshBasicMaterial color={NT} toneMapped={false} />
    </mesh>
  );
}

// ---------- one smooth muscle cell: Ca²⁺ in → calmodulin → filaments pull dense bodies → shorter cell (§16) ----------
function SmoothCell({ root, meshes, tl, keyOf }: AnimCtx) {
  const parts = useMemo(() => {
    root.updateMatrixWorld(true);
    const centre = findNode(root, keyOf, "anim_centre")?.getWorldPosition(new Vector3()) ?? new Vector3();
    const top: Object3D[] = [];
    root.traverse((o) => {
      if (o.parent === root || (o.parent && o.parent.parent === root && !(o.parent instanceof Mesh))) {
        if (o.userData.name && !String(o.userData.name).startsWith("hs_") && !String(o.userData.name).startsWith("anim_")) top.push(o);
      }
    });
    const membrane = meshesNamed(meshes, keyOf, "Plasma membrane");
    const caFrom = sampleVertices(membrane, 160);
    return {
      centre,
      nodes: top.map((n) => pulsable(n, centre)),
      caFrom,
      caveolae: meshesNamed(meshes, keyOf, "Caveolae"),
      filaments: meshesNamed(meshes, keyOf, "Contractile filaments"),
      dense: meshesNamed(meshes, keyOf, "Dense bodies"),
    };
  }, [root, meshes, keyOf]);
  const ca = useRef<Points>(null);
  const caGeo = useParticles(parts.caFrom.length);
  const dotTex = useDotTexture();
  const v = useMemo(() => new Vector3(), []);

  useFrame(() => {
    const t = tl.t;
    // Ca²⁺ comes in across the membrane (no T-tubules) and from stores, drifting toward the middle of the cell
    if (ca.current) {
      const go = ramp(t, 0.02, 0.3);
      ca.current.visible = t > 0.02 && t < 0.8;
      const arr = caGeo.getAttribute("position") as BufferAttribute;
      parts.caFrom.forEach((p, i) => {
        v.copy(p).lerp(parts.centre, go * (0.35 + 0.4 * rand(i)));
        arr.setXYZ(i, v.x, v.y, v.z);
      });
      arr.needsUpdate = true;
      (ca.current.material as { opacity: number }).opacity = 1 - ramp(t, 0.7, 0.8);
    }
    glow(parts.caveolae, 0.7 * pulse(t, 0, 0.3), CA_LIME);
    // calmodulin senses Ca²⁺ → filaments become active, pull on dense bodies; the cell shortens and thickens
    glow(parts.filaments, 0.8 * pulse(t, 0.25, 0.8), ACTIVE);
    glow(parts.dense, 0.4 * pulse(t, 0.45, 0.8), ACTIVE);
    const squeeze = ramp(t, 0.45, 0.65) * (1 - ramp(t, 0.78, 0.98));
    parts.nodes.forEach((n) => setScale(n, [1 - 0.28 * squeeze, 1 + 0.16 * squeeze]));
  });
  return (
    <points ref={ca} geometry={caGeo} visible={false}>
      <pointsMaterial map={dotTex} color={CA_LIME} size={0.22} sizeAttenuation transparent depthWrite={false} blending={AdditiveBlending} />
    </points>
  );
}

// ---------- fascicle: perimysium, endomysium, then the fibers contract and the wrappings go with them (§3.2, §2.5) ----------
const WRAP_GLOW = new Color("#fef3c7");

function FascicleLayers({ root, meshes, tl, keyOf }: AnimCtx) {
  const parts = useMemo(() => {
    root.updateMatrixWorld(true);
    const centre = new Box3().setFromObject(root).getCenter(new Vector3());
    const fibers = nodesNamed(root, "Fibers.").map((f) => ({ p: pulsable(f, centre), ms: meshesUnder(f) }));
    const wraps = ["Perimysium", "Endomysium", "Nerve", "Motor neuron branches"].flatMap((n) => nodesNamed(root, n)).map((n) => pulsable(n, centre));
    return {
      fibers,
      wraps,
      perimysium: meshesNamed(meshes, keyOf, "Perimysium").map((m) => {
        const mat = m.material as MeshStandardMaterial;
        return { m, mat, base: mat.opacity, transparent: mat.transparent, depthWrite: mat.depthWrite };
      }),
      endomysium: meshesNamed(meshes, keyOf, "Endomysium"),
    };
  }, [root, meshes, keyOf]);

  useFrame(() => {
    const t = tl.t;
    // perimysium first; then it turns see-through so the endomysium sleeves inside show
    const see = ramp(t, 0.2, 0.3) * (1 - ramp(t, 0.9, 1));
    // (starts from the scene's own look: already see-through for study, so only fades further)
    parts.perimysium.forEach((p) => {
      p.mat.transparent = p.transparent || see > 0;
      p.mat.opacity = p.base * (1 - 0.75 * see);
      p.mat.depthWrite = p.depthWrite && see < 0.5;
    });
    glow(
      parts.perimysium.map((p) => p.m),
      0.55 * pulse(t, 0, 0.26),
      WRAP_GLOW,
    );
    glow(parts.endomysium, 0.6 * pulse(t, 0.24, 0.52), WRAP_GLOW);
    // the fibers contract together; the connective tissue shortens with them (it transmits the force)
    const squeeze = ramp(t, 0.5, 0.62) * (1 - ramp(t, 0.8, 0.94));
    parts.fibers.forEach((f) => {
      setScale(f.p, [1 - 0.06 * squeeze, 1 + 0.03 * squeeze]);
      glow(f.ms, 0.45 * pulse(t, 0.48, 0.84), ACTIVE);
    });
    parts.wraps.forEach((w) => setScale(w, [1 - 0.06 * squeeze, 1 + 0.02 * squeeze]));
  });
  return null;
}

// ---------- myofibril and sarcomere: thin filaments slide toward the M line; filaments keep their length (§12) ----------
// Each object carries extras from 3d-source/sketchfab/build_v3.py: kind (Z | M | thick | thin | titin), sarc (index),
// part (left | right for thin filaments), n (sarcomeres in the model), s0 (relaxed sarcomere length, model units).
// Relaxed 2.5 µm → contracted 2.0 µm: Z discs move toward the M lines, thin filaments ride on their Z disc,
// thick filaments and M lines stay at the sarcomere centres, titin (Z → M) shortens with the half-sarcomere.
type Piece = { node: Object3D; kind: string; anchor: (f: number) => number; pos0: number; sx0: number };
const CONTRACTED = 2.0 / 2.5;
const myofibrilCurve = (t: number) => ramp(t, 0.2, 0.5) * (1 - ramp(t, 0.72, 0.95));

function MyofibrilContraction({ root, tl, curve = myofibrilCurve }: AnimCtx & { curve?: (t: number) => number }) {
  const pieces = useMemo(() => {
    const out: Piece[] = [];
    root.traverse((o) => {
      const d = o.userData as { kind?: string; sarc?: number; part?: string; n?: number; s0?: number };
      if (!d.kind || d.sarc === undefined || !d.n || !d.s0) return;
      const n = d.n;
      const s0 = d.s0;
      const k = d.sarc;
      const zAt = (j: number, f: number) => (j - n / 2) * s0 * f; // Z disc j (0 … n)
      const centreAt = (f: number) => (k - (n - 1) / 2) * s0 * f; // middle of sarcomere k
      const anchor =
        d.kind === "Z" ? (f: number) => zAt(k, f) : d.kind === "thin" ? (f: number) => zAt(d.part === "left" ? k : k + 1, f) : centreAt;
      out.push({ node: o, kind: d.kind, anchor, pos0: o.position.x, sx0: o.scale.x });
    });
    return out;
  }, [root]);

  useFrame(() => {
    const f = 1 - (1 - CONTRACTED) * curve(tl.t);
    for (const p of pieces) {
      if (p.kind === "titin") {
        // titin spans Z disc → M line: scale it about the sarcomere centre with the half-sarcomere
        p.node.scale.x = p.sx0 * f;
        p.node.position.x = p.anchor(f) + (p.pos0 - p.anchor(1)) * f;
      } else p.node.position.x = p.pos0 + (p.anchor(f) - p.anchor(1));
    }
  });
  return null;
}

// ---------- cardiomyocyte: excitation along the sarcolemma → T-tubules → Ca²⁺ → myofibrils → next cell (§14, §20) ----------
function CardiomyocyteExcitation({ root, meshes, tl, keyOf, size }: AnimCtx) {
  const parts = useMemo(() => {
    root.updateMatrixWorld(true);
    const centre = new Box3().setFromObject(root).getCenter(new Vector3());
    const sr = meshesNamed(meshes, keyOf, "Sarcoplasmic reticulum");
    const caFrom = sampleVertices(sr, 160);
    const body = root.children.filter((c) => c.userData.name && !/^(hs_|anim_)/.test(String(c.userData.name)));
    return {
      start: worldPos(root, keyOf, "anim_ap_start"),
      end: worldPos(root, keyOf, "anim_ap_end"),
      caFrom,
      caDir: caFrom.map((_, i) => new Vector3(rand(i * 5) - 0.5, rand(i * 5 + 1) - 0.5, rand(i * 5 + 2) - 0.5).normalize()),
      nodes: body.map((n) => pulsable(n, centre)),
      sarcolemma: [...meshesNamed(meshes, keyOf, "Sarcolemma"), ...meshesNamed(meshes, keyOf, "Branch")],
      tTubules: meshesNamed(meshes, keyOf, "T-tubules"),
      sr,
      myofibrils: meshesNamed(meshes, keyOf, "Myofibrils"),
      discs: meshesNamed(meshes, keyOf, "Intercalated discs"),
    };
  }, [root, meshes, keyOf]);
  const ap = useRef<Mesh>(null);
  const ca = useRef<Points>(null);
  const caGeo = useParticles(parts.caFrom.length);
  const dotTex = useDotTexture();
  const v = useMemo(() => new Vector3(), []);

  useFrame(() => {
    const t = tl.t;
    // the signal arrives through one disc and leaves through the other
    glow(parts.discs, 0.9 * Math.max(pulse(t, 0, 0.1), pulse(t, 0.86, 0.98)), AP_YELLOW);
    if (ap.current) {
      ap.current.visible = t > 0.02 && t < 0.32;
      ap.current.position.lerpVectors(parts.start, parts.end, ramp(t, 0.03, 0.3));
    }
    glow(parts.sarcolemma, 0.45 * pulse(t, 0.02, 0.34), AP_YELLOW);
    glow(parts.tTubules, 0.9 * pulse(t, 0.28, 0.55), T_BLUE);
    glow(parts.sr, 0.6 * pulse(t, 0.48, 0.72), CA_LIME);
    if (ca.current) {
      const out = ramp(t, 0.5, 0.75);
      ca.current.visible = t > 0.5 && t < 0.88;
      const arr = caGeo.getAttribute("position") as BufferAttribute;
      parts.caFrom.forEach((p, i) => {
        v.copy(p).addScaledVector(parts.caDir[i], out * size * 0.04 * (0.4 + rand(i + 3)));
        arr.setXYZ(i, v.x, v.y, v.z);
      });
      arr.needsUpdate = true;
    }
    glow(parts.myofibrils, 0.45 * pulse(t, 0.66, 0.92), ACTIVE);
    const squeeze = ramp(t, 0.7, 0.8) * (1 - ramp(t, 0.86, 0.98));
    parts.nodes.forEach((n) => setScale(n, [1 - 0.06 * squeeze, 1 + 0.02 * squeeze]));
  });
  return (
    <group>
      <mesh ref={ap} visible={false}>
        <sphereGeometry args={[size * 0.02, 16, 12]} />
        <meshBasicMaterial color={AP_YELLOW} toneMapped={false} />
      </mesh>
      <points ref={ca} geometry={caGeo} visible={false}>
        <pointsMaterial map={dotTex} color={CA_LIME} size={0.2} sizeAttenuation transparent depthWrite={false} blending={AdditiveBlending} />
      </points>
    </group>
  );
}

// ---------- gut wall: the circular layer squeezes ring after ring, the longitudinal layer shortens (§15.1, §1.1; team doc) ----------
const GUT_LUMEN = 1.15; // inner radius of the tube in model units (build_gutwall in build_levels.py)

function GutWall({ root, tl }: AnimCtx) {
  const parts = useMemo(() => {
    root.updateMatrixWorld(true);
    const centre = new Box3().setFromObject(root).getCenter(new Vector3());
    // the tube axis is the model's x axis (y = z = 0); each ring squeezes about that axis, not about its own
    // (cut-open) box centre
    const rings = nodesNamed(root, "Circular muscle layer.").map((n) => {
      const parent = n.parent ?? root;
      const c = parent.worldToLocal(new Box3().setFromObject(n).getCenter(new Vector3()));
      return { p: pulsable(n, parent.localToWorld(new Vector3(c.x, 0, 0))), ms: meshesUnder(n), x: c.x };
    });
    const xs = rings.map((r) => r.x);
    return {
      rings,
      x0: Math.min(...xs),
      x1: Math.max(...xs),
      axisParent: rings[0]?.p.node.parent ?? root,
      longitudinal: nodesNamed(root, "Longitudinal muscle layer").map((n) => ({ p: pulsable(n, centre), ms: meshesUnder(n) })),
    };
  }, [root]);
  const bolus = useRef<Mesh>(null);
  const tmp = useMemo(() => new Vector3(), []);

  useFrame(() => {
    const t = tl.t;
    // a squeeze travels along the tube (0.15–0.6) and pushes the contents ahead of it
    const len = parts.x1 - parts.x0;
    const front = parts.x0 - 0.1 * len + 1.1 * len * ramp(t, 0.15, 0.6);
    const on = t > 0.12 && t < 0.64;
    parts.rings.forEach((r) => {
      const d = (r.x - front) / (len * 0.1);
      const s = on ? Math.exp(-d * d) : 0;
      setScale(r.p, [1, 1 - 0.12 * s]); // narrowed but still outside the lining
      glow(r.ms, 0.5 * s, ACTIVE);
    });
    if (bolus.current) {
      bolus.current.visible = on;
      parts.axisParent.localToWorld(tmp.set(front + 0.2 * len, 0, 0));
      bolus.current.position.copy(tmp);
      bolus.current.scale.setScalar(GUT_LUMEN * 0.75 * parts.axisParent.getWorldScale(tmp).x);
    }
    const shorten = ramp(t, 0.6, 0.72) * (1 - ramp(t, 0.84, 0.96));
    parts.longitudinal.forEach((l) => {
      setScale(l.p, [1 - 0.08 * shorten, 1]);
      glow(l.ms, 0.45 * pulse(t, 0.58, 0.88), ACTIVE);
    });
  });
  return (
    <mesh ref={bolus} visible={false}>
      <sphereGeometry args={[1, 24, 16]} />
      <meshStandardMaterial color="#a16207" roughness={0.6} transparent opacity={0.8} />
    </mesh>
  );
}

// ---------- myofilaments: Ca²⁺ → troponin moves tropomyosin → heads bind, pull, detach, repeat → relaxation (§11) ----------
// Extras from build_v3.py: thin filament groups (kind "thinfil"), tropomyosin strands (pivot = their filament's axis, so
// rolling about x moves them off the binding sites), myosin heads (pivot at the neck, axis = tilt that swings the tip
// along the filament). Rotations go about the stored pivots because mesh compression moves the node origins.
type Turnable = { node: Object3D; pos0: Vector3; q0: Quaternion; pivot: Vector3; axis: Vector3 };
const turnable = (o: Object3D, pivot: number[], axis: Vector3): Turnable => ({
  node: o,
  pos0: o.position.clone(),
  q0: o.quaternion.clone(),
  pivot: new Vector3(...pivot),
  axis,
});
const X_AXIS = new Vector3(1, 0, 0);
function turn(p: Turnable, angle: number, q: Quaternion, v: Vector3) {
  q.setFromAxisAngle(p.axis, angle);
  p.node.position.copy(v.copy(p.pos0).sub(p.pivot).applyQuaternion(q).add(p.pivot));
  p.node.quaternion.copy(q).multiply(p.q0);
}
const CA_ION = new Color("#a3e635");
const STROKE_DEG = 32;

function MyofilamentCycle({ root, meshes, tl, keyOf, size }: AnimCtx) {
  const parts = useMemo(() => {
    const thin: { node: Object3D; x0: number }[] = [];
    const tropo: (Turnable & { sign: number })[] = [];
    const heads: Turnable[] = [];
    root.traverse((o) => {
      const d = o.userData as { kind?: string; axis?: number[]; pivot?: number[] };
      if (d.kind === "thinfil") thin.push({ node: o, x0: o.position.x });
      if (d.kind === "tropomyosin" && d.pivot) tropo.push({ ...turnable(o, d.pivot, X_AXIS), sign: tropo.length % 2 ? 1 : -1 });
      if (d.kind === "head" && d.axis && d.pivot) heads.push(turnable(o, d.pivot, new Vector3(...d.axis).normalize()));
    });
    const troponinC = meshes.filter((m) => keyOf(m) === "Troponin C");
    root.updateMatrixWorld(true);
    const caAt = troponinC.flatMap((m) => sampleVertices([m], 2));
    return {
      thin,
      tropo,
      heads,
      troponin: meshes.filter((m) => keyOf(m).startsWith("Troponin")),
      troponinC,
      headMeshes: meshes.filter((m) => keyOf(m) === "Myosin head"),
      caAt,
      caFrom: caAt.map((p, i) => p.clone().add(new Vector3(rand(i) - 0.5, rand(i + 9) - 0.5, rand(i + 17) - 0.5).multiplyScalar(size * 0.25))),
    };
  }, [root, meshes, keyOf, size]);
  const ca = useRef<Points>(null);
  const caGeo = useParticles(parts.caAt.length);
  const dotTex = useDotTexture();
  const q = useMemo(() => new Quaternion(), []);
  const v = useMemo(() => new Vector3(), []);

  useFrame(() => {
    const t = tl.t;
    // Ca²⁺ arrives at troponin C (0.1–0.24) and leaves on relaxation (0.8–0.92)
    const bound = ramp(t, 0.1, 0.24) * (1 - ramp(t, 0.8, 0.92));
    if (ca.current) {
      ca.current.visible = t > 0.08 && t < 0.94;
      const arr = caGeo.getAttribute("position") as BufferAttribute;
      parts.caAt.forEach((p, i) => {
        v.copy(parts.caFrom[i]).lerp(p, bound);
        arr.setXYZ(i, v.x, v.y, v.z);
      });
      arr.needsUpdate = true;
    }
    glow(parts.troponinC, 0.9 * bound, CA_ION);
    glow(parts.troponin.filter((m) => !parts.troponinC.includes(m)), 0.4 * bound, CA_ION);
    // tropomyosin rolls off the myosin-binding sites while Ca²⁺ is bound
    parts.tropo.forEach((p) => turn(p, p.sign * 0.22 * bound, q, v));
    // two cross-bridge cycles: attach → power stroke (heads swing, thin filaments slide toward the M line) → detach → recock
    let swing = 0;
    let slide = 0;
    for (const [a, b] of [
      [0.26, 0.53],
      [0.53, 0.8],
    ]) {
      const u = (t - a) / (b - a);
      if (u >= 0 && u < 1) swing = u < 0.25 ? 0 : u < 0.6 ? (u - 0.25) / 0.35 : 1 - (u - 0.6) / 0.4;
      slide += ramp(t, a + (b - a) * 0.25, a + (b - a) * 0.6);
    }
    slide *= 1 - ramp(t, 0.82, 0.97);
    const attached = t > 0.3 && t < 0.8;
    parts.heads.forEach((h) => turn(h, (swing * STROKE_DEG * Math.PI) / 180, q, v));
    glow(parts.headMeshes, attached ? 0.35 + 0.35 * swing : 0, ACTIVE);
    // thin filaments slide toward the M line (−x in the model) by ~one stroke per cycle
    parts.thin.forEach((p) => (p.node.position.x = p.x0 - slide * 0.16));
  });
  return (
    <points ref={ca} geometry={caGeo} visible={false}>
      <pointsMaterial map={dotTex} color={CA_ION} size={0.18} sizeAttenuation transparent depthWrite={false} blending={AdditiveBlending} />
    </points>
  );
}

// ---------- dense bodies: filaments slide and pull the dense bodies together; the network spreads the force (§16) ----------
// Extras from build_v3.py: every dense body node (kind "db", carrying the thin filaments anchored on it) and every thick
// filament (kind "thick") has an anchor (model space). The cell shortens and thickens about its centre; anchored nodes
// only move (filaments keep their length — they slide), the membrane, nucleus and intermediate filaments deform with it.
const SHORTEN = 0.24;
const THICKEN = 0.12;

function DenseBodyContraction({ root, meshes, tl }: AnimCtx) {
  const parts = useMemo(() => {
    root.updateMatrixWorld(true);
    const centre = root.localToWorld(new Vector3()); // the cell is centred on the model origin
    const moving: { node: Object3D; pos0: Vector3; anchor: Vector3 }[] = [];
    const deform: Pulsable[] = [];
    root.children.forEach((n) => {
      const d = n.userData as { kind?: string; anchor?: number[]; name?: string };
      if ((d.kind === "db" || d.kind === "thick") && d.anchor) moving.push({ node: n, pos0: n.position.clone(), anchor: new Vector3(...d.anchor) });
      else if (d.name && !/^(hs_|anim_)/.test(d.name)) deform.push(pulsable(n, centre));
    });
    const byMat = (name: string) => meshes.filter((m) => (m.material as MeshStandardMaterial).name === name);
    return {
      moving,
      deform,
      thin: byMat("Thin filament (actin)"),
      thick: byMat("Thick filament (myosin)"),
      dense: byMat("Dense body"),
      membraneDense: byMat("Dense body (membrane)"),
      inter: byMat("Intermediate filament"),
    };
  }, [root, meshes]);
  const v = useMemo(() => new Vector3(), []);

  useFrame(() => {
    const t = tl.t;
    const s = ramp(t, 0.2, 0.45) * (1 - ramp(t, 0.8, 0.95));
    const kx = 1 - SHORTEN * s;
    const kr = 1 + THICKEN * s;
    parts.moving.forEach((m) => {
      v.set(m.anchor.x * kx, m.anchor.y * kr, m.anchor.z * kr).sub(m.anchor);
      m.node.position.copy(m.pos0).add(v);
    });
    parts.deform.forEach((p) => setScale(p, [kx, kr]));
    const work = pulse(t, 0.18, 0.82);
    const spread = pulse(t, 0.45, 0.85);
    glow(parts.thin, 0.45 * work, ACTIVE);
    glow(parts.thick, 0.45 * work, ACTIVE);
    glow(parts.inter, 0.8 * spread, WRAP_GLOW);
    glow(parts.membraneDense, 0.8 * spread, WRAP_GLOW);
    glow(parts.dense, 0.6 * spread, WRAP_GLOW);
  });
  return null;
}

// ---------- smooth muscle myofilaments: Ca²⁺ → calmodulin → heads pull → thin filaments slide, dense bodies close in (§16) ----------
// Extras from build_v3.py: thin-filament groups and dense bodies carry `side` (+1 = anchored on the right dense body,
// moves −x); myosin heads carry `pivot` + `axis` (their tilt already points along the pull); Ca²⁺ ions carry `target`.
const SLIDE = 0.3;

function SmoothMyofilamentCycle({ root, meshes, tl, keyOf, size }: AnimCtx) {
  const parts = useMemo(() => {
    const sliders: { node: Object3D; x0: number; side: number }[] = [];
    const heads: Turnable[] = [];
    const ions: { node: Object3D; pos0: Vector3; from: Vector3 }[] = [];
    root.traverse((o) => {
      const d = o.userData as { kind?: string; side?: number; axis?: number[]; pivot?: number[] };
      if ((d.kind === "thinfil" || d.kind === "db") && d.side) sliders.push({ node: o, x0: o.position.x, side: d.side });
      if (d.kind === "head" && d.axis && d.pivot) heads.push(turnable(o, d.pivot, new Vector3(...d.axis).normalize()));
      if (d.kind === "ca") {
        const i = ions.length;
        // each ion starts outside the bundle (away from the axis) and flies in to its calmodulin lobe
        const out = new Vector3(rand(i * 3) - 0.5, rand(i * 3 + 1) - 0.5, rand(i * 3 + 2) - 0.5).multiplyScalar(size * 0.5);
        ions.push({ node: o, pos0: o.position.clone(), from: out });
      }
    });
    return {
      sliders,
      heads,
      ions,
      calmodulin: meshes.filter((m) => keyOf(m) === "Calmodulin"),
      ionMeshes: meshes.filter((m) => keyOf(m) === "Ca ions"),
      headMeshes: meshes.filter((m) => keyOf(m) === "Myosin head"),
    };
  }, [root, meshes, keyOf, size]);
  const q = useMemo(() => new Quaternion(), []);
  const v = useMemo(() => new Vector3(), []);

  useFrame(() => {
    const t = tl.t;
    // Ca²⁺ comes in and binds calmodulin (0.15–0.32), leaves on relaxation (0.82–0.95)
    const bound = ramp(t, 0.15, 0.32) * (1 - ramp(t, 0.82, 0.95));
    parts.ions.forEach((ion) => {
      ion.node.visible = t > 0.12 && t < 0.97;
      ion.node.position.copy(ion.pos0).add(v.copy(ion.from).multiplyScalar(1 - bound));
    });
    glow(parts.calmodulin, 0.7 * bound, CA_ION);
    glow(parts.ionMeshes, 0.6, CA_ION);
    // two cross-bridge cycles while Ca²⁺–calmodulin is on: attach → stroke (filaments slide) → detach → recock
    let swing = 0;
    let slide = 0;
    for (const [a, b] of [
      [0.4, 0.6],
      [0.6, 0.8],
    ]) {
      const u = (t - a) / (b - a);
      if (u >= 0 && u < 1) swing = u < 0.2 ? 0 : u < 0.6 ? (u - 0.2) / 0.4 : 1 - (u - 0.6) / 0.4;
      slide += ramp(t, a + (b - a) * 0.2, a + (b - a) * 0.6);
    }
    slide *= 1 - ramp(t, 0.82, 0.97);
    parts.heads.forEach((h) => turn(h, (swing * STROKE_DEG * Math.PI) / 180, q, v));
    glow(parts.headMeshes, t > 0.38 && t < 0.8 ? 0.35 + 0.35 * swing : 0, ACTIVE);
    // thin filaments slide toward the middle, so the dense bodies they hang on come closer
    parts.sliders.forEach((sl) => (sl.node.position.x = sl.x0 - sl.side * slide * SLIDE * 0.5));
  });
  return null;
}

// ---------- intercalated disc: signal in cell 1 → ions through the gap junctions → cell 2 → contraction, desmosomes hold (§14) ----------
// Extras from build_v3.py: cell parts carry `cell` (1 | 2). Empties anim_gj_top_NN / anim_gj_bot_NN mark the two ends
// of each gap-junction channel (cell 1 lies above the riser, cell 2 below). The disc sits at the model origin.
const ION_COUNT = 56;

function DiscCoupling({ root, meshes, tl }: AnimCtx) {
  const parts = useMemo(() => {
    root.updateMatrixWorld(true);
    const disc = root.localToWorld(new Vector3());
    const cells: { p: Pulsable; ms: Mesh[]; cell: number }[] = [];
    root.children.forEach((n) => {
      const c = Number(n.userData.cell ?? 0);
      if (c) cells.push({ p: pulsable(n, disc), ms: meshesUnder(n), cell: c });
    });
    const tops = nodesNamed(root, "anim_gj_top_").map((n) => n.getWorldPosition(new Vector3()));
    const bots = nodesNamed(root, "anim_gj_bot_").map((n) => n.getWorldPosition(new Vector3()));
    const byKey = (k: string) => meshes.filter((m) => String(m.parent?.userData.name ?? m.userData.name).startsWith(k));
    return { cells, tops, bots, desmosomes: byKey("Desmosomes"), gaps: byKey("Gap junctions") };
  }, [root, meshes]);
  const ions = useRef<Points>(null);
  const ionGeo = useParticles(ION_COUNT);
  const dotTex = useDotTexture();
  const v = useMemo(() => new Vector3(), []);

  useFrame(() => {
    const t = tl.t;
    // electrical signal: cell 1 first, then (through the gap junctions) cell 2
    parts.cells.forEach((c) => {
      const on = c.cell === 1 ? pulse(t, 0.0, 0.4) : pulse(t, 0.3, 0.62);
      glow(c.ms, 0.45 * on, AP_YELLOW);
    });
    glow(parts.gaps, 0.8 * pulse(t, 0.13, 0.58), GJ);
    // ions stream through every channel from cell 1 into cell 2
    const n = parts.tops.length;
    if (ions.current && n) {
      ions.current.visible = t > 0.15 && t < 0.56;
      const arr = ionGeo.getAttribute("position") as BufferAttribute;
      for (let i = 0; i < ION_COUNT; i++) {
        const ch = i % n;
        const phase = ((t - 0.15) / 0.2 + i / ION_COUNT) % 1;
        v.lerpVectors(parts.tops[ch], parts.bots[ch], phase);
        arr.setXYZ(i, v.x, v.y, v.z);
      }
      arr.needsUpdate = true;
    }
    // both cells contract; their far ends move in while the disc holds (desmosomes)
    const squeeze = ramp(t, 0.56, 0.7) * (1 - ramp(t, 0.86, 0.98));
    parts.cells.forEach((c) => setScale(c.p, [1 - 0.08 * squeeze, 1 + 0.02 * squeeze]));
    glow(parts.desmosomes, 0.9 * pulse(t, 0.55, 0.95), WRAP_GLOW);
  });
  return (
    <points ref={ions} geometry={ionGeo} visible={false}>
      <pointsMaterial map={dotTex} color={AP_YELLOW} size={0.12} sizeAttenuation transparent depthWrite={false} depthTest={false} blending={AdditiveBlending} />
    </points>
  );
}
