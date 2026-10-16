import { Suspense, lazy, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { Canvas, useThree, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import {
  CanvasTexture,
  CylinderGeometry,
  DoubleSide,
  IcosahedronGeometry,
  InstancedMesh,
  Object3D,
  SRGBColorSpace,
  Vector3,
  type BufferGeometry,
} from "three";
import { BANDS, PARTS, type PartId } from "@/content/explore";
import { bandsAt, RELAXED_UM, THICK_UM, THIN_UM } from "./model";

/**
 * Interactive sarcomere built entirely in code (3D-5). Long axis = x, M line at x = 0, 1 µm = K world units.
 * Each half's thin filaments (actin, tropomyosin, troponin, nebulin) are built once in local space and ride on a group
 * pinned to their Z disc, so moving the slider only moves 2 groups + rescales titin — no per-instance updates.
 */
const K = 4;
const THIN_LEN = THIN_UM * K;
const THICK_HALF = (THICK_UM / 2) * K;
const BARE_ZONE = 0.3; // central part of the thick filament without heads (around the M line)
const CAMERA_DIR = new Vector3(1.6, 2.6, 9.2).normalize();
// Stable objects: R3F re-applies a new `camera` object on every Canvas render, which would reset the user's view.
const CAMERA = { position: [1.6, 2.6, 9.2] as [number, number, number], fov: 40, near: 0.1, far: 100 };
const GL = { antialias: true, powerPreference: "high-performance" as const };

// Hexagonal filament lattice seen end-on (y, z): 7 thick filaments, 12 thin filaments in the trigonal positions.
const R = 0.55;
const ring = (r: number, offsetDeg: number) =>
  Array.from({ length: 6 }, (_, i) => {
    const a = ((offsetDeg + i * 60) * Math.PI) / 180;
    return [r * Math.cos(a), r * Math.sin(a)] as const;
  });
const THICK_POS = [[0, 0] as const, ...ring(R, 0)];
const THIN_POS = [...ring(R / Math.sqrt(3), 30), ...ring((2 * R) / Math.sqrt(3), 30)].map(([y, z], i) =>
  // the outer thin filaments sit a bit further out than the strict lattice so they read clearly from the side
  i >= 6 ? ([y * 1.18, z * 1.18] as const) : ([y, z] as const),
);

const colour = Object.fromEntries(PARTS.map((p) => [p.id, p.colour])) as Record<PartId, string>;

type Placement = { pos: [number, number, number]; scale: [number, number, number]; rot?: [number, number, number] };

/** One InstancedMesh per part; matrices are written once. */
function Instances({
  part,
  geometry,
  placements,
  selected,
  onSelect,
  roughness = 0.55,
}: {
  part: PartId;
  geometry: BufferGeometry;
  placements: Placement[];
  selected: PartId | null;
  onSelect: (id: PartId) => void;
  roughness?: number;
}) {
  const ref = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const o = new Object3D();
    placements.forEach((p, i) => {
      o.position.set(...p.pos);
      o.scale.set(...p.scale);
      o.rotation.set(...(p.rot ?? [0, 0, 0]));
      o.updateMatrix();
      mesh.setMatrixAt(i, o.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [placements]);

  const dim = selected !== null && selected !== part;
  const on = selected === part;
  return (
    <instancedMesh
      ref={ref}
      args={[geometry, undefined, placements.length]}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        onSelect(part);
      }}
      onPointerOver={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => (document.body.style.cursor = "")}
    >
      <meshStandardMaterial
        color={colour[part]}
        emissive={colour[part]}
        emissiveIntensity={on ? 0.55 : 0}
        roughness={roughness}
        transparent={dim}
        opacity={dim ? 0.18 : 1}
        depthWrite={!dim}
        side={DoubleSide}
      />
    </instancedMesh>
  );
}

type Side = 1 | -1; // 1 = left half (filaments run +x from the Z disc), -1 = right half

function thinPlacements(side: Side) {
  const actin: Placement[] = [];
  const tropo: Placement[] = [];
  const tn: Placement[] = [];
  const neb: Placement[] = [];
  const beadStep = 0.1;
  const beads = Math.floor(THIN_LEN / beadStep);
  THIN_POS.forEach(([y, z], f) => {
    const phase = f * 0.9;
    for (let i = 0; i < beads; i++) {
      const x = side * (i + 0.5) * beadStep;
      for (const strand of [0, Math.PI]) {
        const a = phase + i * 0.42 + strand;
        actin.push({ pos: [x, y + 0.035 * Math.cos(a), z + 0.035 * Math.sin(a)], scale: [0.036, 0.036, 0.036] });
      }
    }
    // tropomyosin: two strands lying in the grooves, troponin knobs on them every ~0.38 units
    for (const s of [0, Math.PI]) {
      const a = phase + s + Math.PI / 2;
      const oy = 0.06 * Math.cos(a);
      const oz = 0.06 * Math.sin(a);
      tropo.push({ pos: [(side * THIN_LEN) / 2, y + oy, z + oz], scale: [0.014, THIN_LEN, 0.014], rot: [0, 0, Math.PI / 2] });
      for (let k = 0; k < 10; k++) {
        tn.push({ pos: [side * (0.25 + k * 0.38), y + oy * 1.35, z + oz * 1.35], scale: [0.032, 0.032, 0.032] });
      }
    }
    neb.push({ pos: [(side * THIN_LEN) / 2, y - 0.045, z + 0.045], scale: [0.009, THIN_LEN, 0.009], rot: [0, 0, Math.PI / 2] });
  });
  return { actin, tropo, tn, neb };
}

function thickPlacements() {
  const shafts: Placement[] = THICK_POS.map(([y, z]) => ({ pos: [0, y, z], scale: [0.06, THICK_HALF * 2, 0.06], rot: [0, 0, Math.PI / 2] }));
  const heads: Placement[] = [];
  THICK_POS.forEach(([y, z], f) => {
    for (const side of [1, -1] as const) {
      for (let x = BARE_ZONE; x < THICK_HALF - 0.05; x += 0.2) {
        for (let c = 0; c < 3; c++) {
          const a = f * 0.7 + x * 2.4 + (c * 2 * Math.PI) / 3;
          const dy = Math.cos(a);
          const dz = Math.sin(a);
          // heads lean away from the M line (toward the Z disc they pull)
          heads.push({
            pos: [side * x, y + dy * 0.1, z + dz * 0.1],
            scale: [0.034, 0.06, 0.034],
            rot: [a - Math.PI / 2, 0, side * -0.5],
          });
        }
      }
    }
  });
  return { shafts, heads };
}

function titinPlacements() {
  // unit-length strands from x = 0 to x = 1 (local); the side group scales them to Z disc → M line
  return THICK_POS.map(([y, z]) => ({ pos: [0.5, y + 0.075, z - 0.075], scale: [0.01, 1, 0.01], rot: [0, 0, Math.PI / 2] }) as Placement);
}

/** Back the camera off on narrow (phone) viewports so the whole relaxed sarcomere fits; only runs on resize. */
function FitCamera() {
  const camera = useThree((s) => s.camera);
  const aspect = useThree((s) => s.size.width / Math.max(1, s.size.height));
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    const vHalf = (((camera as { fov?: number }).fov ?? 40) * Math.PI) / 360;
    const hHalf = Math.atan(Math.tan(vHalf) * aspect);
    const halfWidth = (RELAXED_UM / 2) * K + 0.8; // + Z disc and a little air
    const dist = Math.max(9.6, halfWidth / Math.tan(hHalf));
    camera.position.copy(CAMERA_DIR.clone().multiplyScalar(dist));
    invalidate();
  }, [aspect, camera, invalidate]);
  return null;
}

function Invalidate({ deps }: { deps: unknown[] }) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => invalidate(), [invalidate, ...deps]);
  return null;
}

/**
 * A text pill drawn once into a canvas texture and shown on a sprite (always faces the camera).
 * Used instead of drei <Html>, whose per-label React roots clash with React 19 when labels update.
 */
function useLabelTexture(text: string) {
  const tex = useMemo(() => {
    const dpr = 3;
    const font = `700 ${13 * dpr}px Inter Variable, Inter, system-ui, sans-serif`;
    const c = document.createElement("canvas");
    const ctx = c.getContext("2d")!;
    ctx.font = font;
    const w = Math.ceil(ctx.measureText(text).width + 20 * dpr);
    const h = 24 * dpr;
    c.width = w;
    c.height = h;
    ctx.font = font;
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.strokeStyle = "rgba(0,0,0,0.12)";
    ctx.lineWidth = dpr;
    ctx.beginPath();
    ctx.roundRect(dpr, dpr, w - 2 * dpr, h - 2 * dpr, h / 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#27272a";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, w / 2, h / 2 + dpr);
    const t = new CanvasTexture(c);
    t.colorSpace = SRGBColorSpace;
    return { t, aspect: w / h };
  }, [text]);
  useEffect(() => () => tex.t.dispose(), [tex]);
  return tex;
}

/** Band bracket + label above the filaments (3D-8). Empty bands (the H zone when fully contracted) are hidden. */
function BandBar({ span, y, colour: c, label, show }: { span: { from: number; to: number } | null; y: number; colour: string; label: string; show: boolean }) {
  const from = span?.from ?? 0;
  const to = span?.to ?? 0;
  const visible = to - from > 0.001;
  const { t: tex, aspect } = useLabelTexture(label);
  const h = 0.42;
  return (
    <group position={[((from + to) / 2) * K, y, 0]}>
      <mesh scale={[Math.max(0.0001, to - from) * K, 0.045, 0.045]} visible={visible}>
        <boxGeometry />
        <meshBasicMaterial color={c} />
      </mesh>
      <sprite position={[0, 0.24, 0]} scale={[h * aspect, h, 1]} visible={show && visible} renderOrder={10}>
        <spriteMaterial map={tex} transparent depthTest={false} />
      </sprite>
    </group>
  );
}

function Model({ t, selected, onSelect, showBands }: SceneProps) {
  const b = bandsAt(t);
  const left = useMemo(() => thinPlacements(1), []);
  const right = useMemo(() => thinPlacements(-1), []);
  const thick = useMemo(() => thickPlacements(), []);
  const titin = useMemo(() => titinPlacements(), []);
  const geo = useMemo(() => buildGeometries(), []);
  useEffect(() => () => Object.values(geo).forEach((g) => g.dispose()), [geo]);

  const common = { selected, onSelect };
  const halfK = (b.sarcomere / 2) * K;
  const pick = (id: PartId) => (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onSelect(id);
  };
  const plateMat = (id: PartId, opacity: number) => {
    const dim = selected !== null && selected !== id;
    return (
      <meshStandardMaterial
        color={colour[id]}
        emissive={colour[id]}
        emissiveIntensity={selected === id ? 0.5 : 0}
        transparent
        opacity={dim ? 0.12 : opacity}
        depthWrite={false}
        side={DoubleSide}
      />
    );
  };

  return (
    <group>
      <Invalidate deps={[t, selected, showBands]} />
      {/* thick filaments (fixed) */}
      <Instances part="myosin" geometry={geo.rod} placements={thick.shafts} {...common} />
      <Instances part="myosin" geometry={geo.bead} placements={thick.heads} {...common} />
      {/* M line */}
      <mesh rotation={[0, 0, Math.PI / 2]} onClick={pick("mline")}>
        <cylinderGeometry args={[1.05, 1.05, 0.04, 40]} />
        {plateMat("mline", 0.55)}
      </mesh>

      {([
        [left, -halfK, 1],
        [right, halfK, -1],
      ] as const).map(([p, x, side]) => (
        <group key={side} position={[x, 0, 0]}>
          <Instances part="actin" geometry={geo.bead} placements={p.actin} {...common} />
          <Instances part="tropomyosin" geometry={geo.rod} placements={p.tropo} {...common} />
          <Instances part="troponin" geometry={geo.bead} placements={p.tn} {...common} roughness={0.35} />
          <Instances part="nebulin" geometry={geo.rod} placements={p.neb} {...common} />
          {/* titin spans Z disc → M line, so it stretches with the half-sarcomere */}
          <group scale={[side * halfK, 1, 1]}>
            <Instances part="titin" geometry={geo.rod} placements={titin} {...common} />
          </group>
          {/* Z disc */}
          <mesh rotation={[0, 0, Math.PI / 2]} onClick={pick("zdisc")}>
            <cylinderGeometry args={[1.25, 1.25, 0.07, 6]} />
            {plateMat("zdisc", 0.8)}
          </mesh>
        </group>
      ))}

      {/* band brackets above the filaments (3D-8) */}
      <group position={[0, 1.55, 0]}>
        <BandBar span={b.thickSpan} y={0.62} colour={BANDS.aband.colour} label="A band" show={showBands} />
        <BandBar span={b.hSpan} y={0.15} colour={BANDS.hzone.colour} label="H zone" show={showBands} />
        <BandBar span={b.iLeft} y={0.15} colour={BANDS.iband.colour} label="½ I band" show={showBands} />
        <BandBar span={b.iRight} y={0.15} colour={BANDS.iband.colour} label="½ I band" show={showBands} />
      </group>
    </group>
  );
}

/** Two shared geometries: every bead-like part (actin, troponin, myosin heads) and every strand (rods). */
function buildGeometries() {
  return {
    bead: new IcosahedronGeometry(1, 1),
    rod: new CylinderGeometry(1, 1, 1, 8, 1),
  };
}

const Perf = import.meta.env.DEV ? lazy(() => import("r3f-perf").then((m) => ({ default: m.Perf }))) : null;
const showPerf = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("perf");

export type SceneProps = {
  t: number;
  selected: PartId | null;
  onSelect: (id: PartId | null) => void;
  showBands: boolean;
};

export default function SarcomereScene(props: SceneProps) {
  return (
    <Canvas
      // ?perf renders every frame so the meter measures the worst case; normal use renders only on change
      frameloop={showPerf ? "always" : "demand"}
      dpr={[1, 1.5]}
      camera={CAMERA}
      gl={GL}
      onPointerMissed={() => props.onSelect(null)}
      aria-label="Interactive 3D sarcomere"
    >
      <ambientLight intensity={0.75} />
      <directionalLight position={[4, 6, 5]} intensity={1.6} />
      <directionalLight position={[-5, -2, -4]} intensity={0.45} />
      <Model {...props} />
      <FitCamera />
      <OrbitControls makeDefault enableDamping={false} minDistance={3.5} maxDistance={30} target={[0, 0.3, 0]} />
      {Perf && showPerf && (
        <Suspense fallback={null}>
          {/* dev-only fps / draw-call meter (?perf), pinned inside the viewer card (it clips anything outside) */}
          <Perf position="top-left" style={{ position: "absolute", top: 8, left: 8, zIndex: 5 }} />
        </Suspense>
      )}
    </Canvas>
  );
}
