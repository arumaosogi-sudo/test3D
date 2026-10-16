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
  Vector3,
  type MeshStandardMaterial,
  type Object3D,
  type Points,
} from "three";
import type { LevelId } from "@/content/exploreZoom";
import { pulse, ramp, type Timeline } from "../anim/timeline";
import { CONTRACTED_UM, RELAXED_UM } from "../sarcomere/model";

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
    case "fiber":
      return <FiberExcitation {...ctx} />;
    case "arm":
      return <ElbowFlexion {...ctx} />;
    case "heart":
      return <HeartBeat {...ctx} />;
    case "cardiac":
      return <CardiacWave {...ctx} />;
    case "sarcomere":
      return <SlidingFilaments {...ctx} />;
    case "fascicle":
      return <MotorUnit {...ctx} />;
    case "smoothtissue":
      return <SmoothTissue {...ctx} />;
    case "smoothcell":
      return <SmoothCell {...ctx} />;
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
    const run = ramp(t, 0.02, 0.2);
    if (ap.current) {
      ap.current.visible = t > 0.01 && t < 0.24;
      ap.current.position.lerpVectors(parts.top, parts.end, run);
    }
    glow(parts.axon, 0.15 + 0.6 * pulse(t, 0.0, 0.3), AP_YELLOW);

    // 2 · ACh vesicles empty into the cleft and diffuse to the sarcolemma
    if (ach.current) {
      const go = ramp(t, 0.2, 0.38);
      ach.current.visible = t > 0.16 && t < 0.46;
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
    glow(parts.sarcolemma, 0.55 * pulse(t, 0.36, 0.62), AP_YELLOW);
    glow(parts.tTubules, 0.9 * pulse(t, 0.44, 0.74), T_BLUE);

    // 4 · terminal cisternae / SR release Ca²⁺ into the sarcoplasm
    glow(parts.cisternae, 0.8 * pulse(t, 0.58, 0.82), CA_LIME);
    glow(parts.sr, 0.4 * pulse(t, 0.58, 0.85), CA_LIME);
    if (ca.current) {
      const out = ramp(t, 0.6, 0.9);
      ca.current.visible = t > 0.6;
      const arr = caGeo.getAttribute("position") as BufferAttribute;
      parts.caFrom.forEach((p, i) => {
        v.copy(p).addScaledVector(parts.caDir[i], out * size * 0.05 * (0.4 + rand(i + 7)));
        arr.setXYZ(i, v.x, v.y, v.z);
      });
      arr.needsUpdate = true;
      (ca.current.material as { opacity: number }).opacity = 1 - ramp(t, 0.93, 1);
    }
    // Ca²⁺ reaches the myofibrils
    glow(parts.myofibrils, 0.25 * pulse(t, 0.8, 1), CA_LIME);
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

// ---------- arm: elbow flexion (biceps) and extension (triceps) — lecture §1.1, §2.4 ----------
const ACTIVE = new Color("#ff5a3c");

function ElbowFlexion({ root, meshes, clips, tl, keyOf }: AnimCtx) {
  // the export has one clip for the rig and one per biceps head (shape key "Contract"); all share one length
  const { mixer, actions } = useMemo(() => {
    const mixer = new AnimationMixer(root);
    const actions = clips.map((c) => mixer.clipAction(c));
    return { mixer, actions };
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

  useFrame(() => {
    const t = tl.t;
    // the clip is 0 → 120° flexion → 0 over its length; the timeline maps straight onto it
    // (set the action's own time; a paused action ignores the mixer clock)
    for (const a of actions) a.time = t * a.getClip().duration;
    mixer.update(0);
    // the muscle doing the work glows: biceps while the elbow bends, triceps while it straightens
    glow(biceps, 0.55 * pulse(t, 0, 0.5), ACTIVE);
    glow(triceps, 0.55 * pulse(t, 0.5, 1), ACTIVE);
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

// ---------- heart: continuous rhythmic contraction (lecture §14) ----------
const BEAT = new Color("#ff6b5b");

function HeartBeat({ root, tl }: AnimCtx) {
  const parts = useMemo(() => {
    const pick = (re: RegExp) => {
      const out: Pulsable[] = [];
      root.traverse((o) => {
        const n = o.userData.name as string | undefined;
        if (n && re.test(n) && o instanceof Mesh) out.push(pulsable(o));
      });
      return out;
    };
    return { atria: pick(/atrium/), ventricles: pick(/ventricle/) };
  }, [root]);

  useFrame(() => {
    // t covers one beat: the upper chambers squeeze a little first, then the lower ones, then everything relaxes
    const t = tl.t;
    const a = pulse(t, 0.0, 0.32);
    const v = pulse(t, 0.25, 0.7);
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
  });
  return null;
}

// ---------- cardiac tissue: signal passes cell to cell through gap junctions, then cells contract (§14) ----------
const SIGNAL = new Color("#fde047");

function CardiacWave({ root, tl }: AnimCtx) {
  const parts = useMemo(() => {
    const cells = nodesNamed(root, "Cardiac muscle cells.").map((n) => pulsable(n));
    const discs = nodesNamed(root, "Intercalated discs.");
    return { cells, cellMeshes: cells.map((c) => meshesUnder(c.node)), discMeshes: discs.map(meshesUnder) };
  }, [root]);
  // disc k sits between cells: 1|2, 2|3 (lower row) and 5|6, 6|7 (upper row); cell 4 is the branch
  const DISC_AFTER = [0, 1, 4, 5];

  useFrame(() => {
    const t = tl.t;
    const n = parts.cells.length;
    parts.cells.forEach((c, i) => {
      const on = 0.06 + (i / Math.max(1, n - 1)) * 0.44; // activation reaches cell i at this time
      glow(parts.cellMeshes[i], 0.55 * pulse(t, on - 0.02, on + 0.16), SIGNAL);
      // after activation the cells contract together (shorter, slightly thicker) and relax
      const squeeze = ramp(t, 0.6, 0.72) * (1 - ramp(t, 0.85, 0.98));
      setScale(c, [1 - 0.05 * squeeze, 1 + 0.02 * squeeze]);
    });
    parts.discMeshes.forEach((ms, k) => {
      const i = DISC_AFTER[k] ?? k;
      const on = 0.06 + ((i + 0.5) / Math.max(1, n - 1)) * 0.44;
      glow(ms, 1.2 * pulse(t, on - 0.03, on + 0.08), SIGNAL);
    });
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

// ---------- sarcomere: thin filaments slide toward the M line, A band unchanged (lecture §12, §10.4) ----------
const K_SARC = 4; // the model uses 1 µm = 4 units (see 3d-source/z2/build_levels.py)

function SlidingFilaments({ root, tl }: AnimCtx) {
  const parts = useMemo(() => {
    const side = (suffix: string) => {
      const out: { node: Object3D; x: number }[] = [];
      root.traverse((o) => {
        const n = o.userData.name as string | undefined;
        if (n && n.endsWith(suffix) && !n.startsWith("Titin")) out.push({ node: o, x: o.position.x });
      });
      return out;
    };
    const titin: { node: Object3D; x: number; sx: number }[] = [];
    root.traverse((o) => {
      const n = o.userData.name as string | undefined;
      if (n && n.startsWith("Titin.")) titin.push({ node: o, x: o.position.x, sx: o.scale.x });
    });
    return { left: side(".l"), right: side(".r"), titin };
  }, [root]);

  useFrame(() => {
    const t = tl.t;
    const c = ramp(t, 0.02, 0.45) * (1 - ramp(t, 0.7, 0.95)); // 0 relaxed → 1 contracted → back
    const sarcomere = RELAXED_UM - (RELAXED_UM - CONTRACTED_UM) * c;
    const d = ((RELAXED_UM - sarcomere) / 2) * K_SARC; // each Z disc moves this far toward the M line
    parts.left.forEach((p) => (p.node.position.x = p.x + d));
    parts.right.forEach((p) => (p.node.position.x = p.x - d));
    const k = sarcomere / 2 / (RELAXED_UM / 2); // titin runs Z disc → M line, so it shortens with the half-sarcomere
    parts.titin.forEach((p) => {
      p.node.position.x = p.x * k;
      p.node.scale.x = p.sx * k;
    });
  });
  return null;
}

// ---------- fascicle: one motor unit = one motor neuron + the fibers it controls (lecture §8) ----------
const MOTOR_UNIT = [2, 6, 10, 15]; // fiber numbers, same as MOTOR_UNIT in 3d-source/z2/build_levels.py

function MotorUnit({ root, meshes, tl, keyOf, size }: AnimCtx) {
  const parts = useMemo(() => {
    const start = worldPos(root, keyOf, "anim_nerve_start");
    const end = worldPos(root, keyOf, "anim_nerve_end");
    const fibers = nodesNamed(root, "Fibers.");
    const unit = fibers.filter((f) => MOTOR_UNIT.includes(Number(String(f.userData.name).split(".")[1])));
    return {
      start,
      end,
      nerve: [...meshesNamed(meshes, keyOf, "Nerve")],
      branches: meshesNamed(meshes, keyOf, "Motor neuron branches"),
      unit: unit.map((f) => ({ p: pulsable(f), ms: meshesUnder(f) })),
    };
  }, [root, meshes, keyOf]);
  const ap = useRef<Mesh>(null);

  useFrame(() => {
    const t = tl.t;
    if (ap.current) {
      ap.current.visible = t < 0.3;
      ap.current.position.lerpVectors(parts.start, parts.end, ramp(t, 0, 0.28));
    }
    glow(parts.nerve, 0.4 * pulse(t, 0, 0.32), AP_YELLOW);
    glow(parts.branches, 0.9 * pulse(t, 0.22, 0.5), AP_YELLOW);
    // only this neuron's fibers respond — together; the fibers of other motor units stay at rest
    const squeeze = ramp(t, 0.38, 0.5) * (1 - ramp(t, 0.68, 0.8));
    parts.unit.forEach((f) => {
      glow(f.ms, 0.6 * pulse(t, 0.32, 0.8), ACTIVE);
      setScale(f.p, [1 - 0.06 * squeeze, 1 + 0.04 * squeeze]);
    });
  });
  return (
    <mesh ref={ap} visible={false}>
      <sphereGeometry args={[size * 0.02, 16, 12]} />
      <meshBasicMaterial color={AP_YELLOW} toneMapped={false} />
    </mesh>
  );
}
