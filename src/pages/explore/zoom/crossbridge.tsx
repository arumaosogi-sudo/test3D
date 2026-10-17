import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import type { CameraControls } from "@react-three/drei";
import { Color, Group, IcosahedronGeometry, InstancedMesh, Mesh, MeshStandardMaterial, Quaternion, Sphere, Vector3 } from "three";
import type { ZoomLevel } from "@/content/exploreZoom";
import { useTimelinePlaying, ramp, type Timeline } from "../anim/timeline";
import { Marker } from "./marker";

/**
 * Molecular close-up for "Ca²⁺ switch and the cross-bridge cycle" (lecture §10.2–§11 steps 5–10).
 *
 * Thin filament = real structure, one bead per amino acid: PDB 6KN7 (Ca²⁺-free) ↔ 6KN8 (Ca²⁺-bound) — actin is
 * alpha skeletal actin, troponin the cardiac isoform. Blending the two states shows tropomyosin moving off the
 * myosin-binding sites. Myosin heads are schematic (motor domain + lever arm) and bind one actin per 5.5 nm stroke,
 * so after each stroke the next actin of the same strand sits where the head re-attaches.
 */
type Kind = "actin" | "tropomyosin" | "troponinT" | "troponinI" | "troponinC";
type Chain = { chain: string; kind: Kind; n: number; apo: string; ca: string };
type Data = { unit: number; chains: Chain[] };

const LENGTH_A = 470; // filament length in the data (Å)
const SIZE = 4;
const K = SIZE / LENGTH_A; // world units per Å
const STROKE_A = 55; // one actin repeat along a strand ≈ 5.5 nm (schematic step per cycle)
const BEAD_A = 3.4;

const COLOUR: Record<Kind, string> = {
  actin: "#38bdf8",
  tropomyosin: "#eab308",
  troponinT: "#15803d",
  troponinI: "#22c55e",
  troponinC: "#16a34a",
};
const MYOSIN = "#e11d48";
const CA = "#a3e635";

// timeline (see src/content/exploreAnims.ts "crossbridge"): Ca²⁺ on 0.10–0.26, two cycles 0.26–0.80, relax 0.80–1
const CYCLES: [number, number][] = [
  [0.26, 0.53],
  [0.53, 0.8],
];

function decode(b64: string, unit: number) {
  const bin = atob(b64);
  const buf = new ArrayBuffer(bin.length);
  const u8 = new Uint8Array(buf);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  const i16 = new Int16Array(buf);
  const out = new Float32Array(i16.length);
  for (let i = 0; i < i16.length; i++) out[i] = i16[i] * unit;
  return out;
}

export type CrossBridgeProps = {
  level: ZoomLevel;
  selected: string | null;
  onSelect: (key: string | null) => void;
  reducedMotion: boolean;
  timeline: Timeline | null;
};

export function CrossBridgeModel({ level, selected, onSelect, reducedMotion, timeline }: CrossBridgeProps) {
  const [data, setData] = useState<Data | null>(null);
  useEffect(() => {
    let alive = true;
    void fetch("/models/thinfilament.json")
      .then((r) => r.json() as Promise<Data>)
      .then((d) => alive && setData(d));
    return () => {
      alive = false;
    };
  }, []);
  if (!data) return null;
  return <Scene data={data} level={level} selected={selected} onSelect={onSelect} reducedMotion={reducedMotion} timeline={timeline} />;
}

function Scene({ data, level, selected, onSelect, reducedMotion, timeline }: CrossBridgeProps & { data: Data }) {
  const controls = useThree((s) => s.controls) as CameraControls | null;
  const portrait = useThree((s) => s.size.width < s.size.height);
  const invalidate = useThree((s) => s.invalidate);
  const playing = useTimelinePlaying(timeline);

  // ---- thin filament: positions per kind, both states, in Å (filament axis = x) ----
  const groups = useMemo(() => {
    const byKind = new Map<Kind, { apo: number[]; ca: number[]; tint: number[] }>();
    data.chains.forEach((c, ci) => {
      const g = byKind.get(c.kind) ?? { apo: [], ca: [], tint: [] };
      const a = decode(c.apo, data.unit);
      const b = decode(c.ca, data.unit);
      for (let i = 0; i < c.n; i++) {
        g.apo.push(a[i * 3], a[i * 3 + 1], a[i * 3 + 2]);
        g.ca.push(b[i * 3], b[i * 3 + 1], b[i * 3 + 2]);
        g.tint.push(c.kind === "actin" ? (ci % 2 ? 1 : 0.72) : 1); // alternate actins so single subunits read
      }
      byKind.set(c.kind, g);
    });
    return [...byKind.entries()].map(([kind, g]) => ({ kind, apo: new Float32Array(g.apo), ca: new Float32Array(g.ca), tint: g.tint }));
  }, [data]);

  // every actin subunit: centroid + outward direction (its myosin-binding face, schematic)
  const sites = useMemo(() => {
    const out: { chain: string; x: number; y: number; z: number; ry: number; rz: number }[] = [];
    data.chains.forEach((c) => {
      if (c.kind !== "actin") return;
      const a = decode(c.apo, data.unit);
      let x = 0,
        y = 0,
        z = 0;
      for (let i = 0; i < c.n; i++) {
        x += a[i * 3];
        y += a[i * 3 + 1];
        z += a[i * 3 + 2];
      }
      const cy = y / c.n;
      const cz = z / c.n;
      const r = Math.hypot(cy, cz) || 1;
      out.push({ chain: c.chain, x: x / c.n, y: cy, z: cz, ry: cy / r, rz: cz / r });
    });
    return out;
  }, [data]);

  const geo = useMemo(() => new IcosahedronGeometry(1, 0), []);
  useEffect(() => () => geo.dispose(), [geo]);
  const meshRefs = useRef<(InstancedMesh | null)[]>([]);
  const filament = useRef<Group>(null);
  const lastS = useRef(-1);

  const writeBeads = (s: number) => {
    groups.forEach((g, gi) => {
      const m = meshRefs.current[gi];
      if (!m) return;
      const e = m.instanceMatrix.array as Float32Array;
      const r = BEAD_A * K;
      for (let i = 0, n = g.apo.length / 3; i < n; i++) {
        const o = i * 16;
        e[o] = r;
        e[o + 5] = r;
        e[o + 10] = r;
        e[o + 15] = 1;
        e[o + 12] = (g.apo[i * 3] + (g.ca[i * 3] - g.apo[i * 3]) * s) * K;
        e[o + 13] = (g.apo[i * 3 + 1] + (g.ca[i * 3 + 1] - g.apo[i * 3 + 1]) * s) * K;
        e[o + 14] = (g.apo[i * 3 + 2] + (g.ca[i * 3 + 2] - g.apo[i * 3 + 2]) * s) * K;
      }
      m.instanceMatrix.needsUpdate = true;
    });
  };

  useLayoutEffect(() => {
    groups.forEach((g, gi) => {
      const m = meshRefs.current[gi];
      if (!m) return;
      const base = new Color(COLOUR[g.kind]);
      const c = new Color();
      g.tint.forEach((k, i) => m.setColorAt(i, c.copy(base).multiplyScalar(k)));
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
      m.computeBoundingSphere();
    });
    writeBeads(0);
    lastS.current = 0;
    invalidate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups]);

  // ---- myosin heads (schematic) on a thick filament below the thin filament ----
  const THICK_Y = -150; // Å below the filament axis
  // actins A, E, I, M lie on one long-pitch strand, 2 subunits (≈ 11 nm) apart: after a 5.5 nm stroke the next actin
  // of that strand arrives exactly where each head re-attaches
  const heads = useMemo(() => sites.filter((s) => ["A", "E", "I", "M"].includes(s.chain)), [sites]);
  const headRefs = useRef<(Group | null)[]>([]);
  const caRefs = useRef<(Mesh | null)[]>([]);
  const siteMats = useRef<MeshStandardMaterial[]>([]);

  // TnC centroids for the Ca²⁺ ions
  const tnc = useMemo(() => {
    const out: Vector3[] = [];
    data.chains.forEach((c) => {
      if (c.kind !== "troponinC") return;
      const a = decode(c.ca, data.unit);
      const v = new Vector3();
      for (let i = 0; i < c.n; i++) v.add(new Vector3(a[i * 3], a[i * 3 + 1], a[i * 3 + 2]));
      out.push(v.multiplyScalar(1 / c.n));
    });
    return out;
  }, [data]);

  const tmp = useMemo(() => ({ a: new Vector3(), b: new Vector3(), q: new Quaternion(), up: new Vector3(0, 1, 0) }), []);

  useFrame(() => {
    const t = timeline?.t ?? 0;
    // Ca²⁺ switch: blend Ca²⁺-free → Ca²⁺-bound, and back on relaxation
    const s = ramp(t, 0.14, 0.26) * (1 - ramp(t, 0.84, 0.96));
    if (Math.abs(s - lastS.current) > 1e-4) {
      writeBeads(s);
      lastS.current = s;
    }
    // Ca²⁺ ions arrive at troponin C, leave on relaxation
    const caIn = ramp(t, 0.1, 0.16) * (1 - ramp(t, 0.8, 0.86));
    caRefs.current.forEach((m, i) => {
      if (!m) return;
      const p = tnc[i % tnc.length];
      m.visible = caIn > 0.01;
      m.position.set(p.x * K, (p.y + 60 * (1 - caIn)) * K, (p.z + 30) * K);
    });
    // exposed binding sites glow while Ca²⁺ is bound
    siteMats.current.forEach((m) => (m.emissiveIntensity = 0.9 * s));

    // cross-bridge cycles: attach → power stroke (filament slides toward the M line, −x) → detach & re-cock
    let slide = 0;
    let phase: "cocked" | "attach" | "stroke" | "detach" = "cocked";
    let k = 0;
    for (const [a, b] of CYCLES) {
      if (t >= b) slide += STROKE_A;
      else if (t >= a) {
        const u = (t - a) / (b - a);
        if (u < 0.25) {
          phase = "attach";
          k = u / 0.25;
        } else if (u < 0.6) {
          phase = "stroke";
          k = (u - 0.25) / 0.35;
          slide += STROKE_A * ramp(k, 0, 1);
        } else {
          phase = "detach";
          k = (u - 0.6) / 0.4;
          slide += STROKE_A;
        }
      }
    }
    // relaxation: the filament slides back to rest (elasticity, §2.5)
    slide *= 1 - ramp(t, 0.86, 1);
    if (filament.current) filament.current.position.x = -slide * K;

    headRefs.current.forEach((g, i) => {
      if (!g) return;
      const site = heads[i];
      const base = tmp.a.set((site.x + 40) * K, (THICK_Y + 18) * K, 0); // lever leans away from the M line when cocked
      // motor domain (Å): touching actin = 30 Å out from the subunit centroid; detached = 30 Å further out
      const out = (d: number, x: number) => tmp.b.set(x, site.y + site.ry * d, site.z + site.rz * d);
      let md: Vector3;
      if (phase === "attach") md = out(60 - 30 * ramp(k, 0, 1), site.x);
      else if (phase === "stroke") md = out(30, site.x - STROKE_A * ramp(k, 0, 1));
      else if (phase === "detach") {
        // let go of the actin it pulled, then re-cock over the same x — the next actin arrives there after the stroke
        md = out(30 + 30 * ramp(k, 0, 0.3), site.x - STROKE_A * (1 - ramp(k, 0.3, 1)));
      } else md = out(60, site.x);
      md.multiplyScalar(K);
      // lever arm from the thick filament to the motor domain
      const lever = g.children[0] as Mesh;
      const motor = g.children[1] as Mesh;
      const dir = md.clone().sub(base);
      const len = dir.length();
      lever.position.copy(base).addScaledVector(dir, 0.5);
      lever.scale.set(1, len, 1);
      lever.quaternion.setFromUnitVectors(tmp.up, dir.normalize());
      motor.position.copy(md);
      motor.quaternion.copy(lever.quaternion);
      (motor.material as MeshStandardMaterial).emissiveIntensity = phase === "stroke" ? 0.5 : 0;
    });
  });

  // ---- hotspots (rest pose) ----
  const anchors = useMemo(() => {
    const find = (kind: Kind, frac: number) => {
      const g = groups.find((x) => x.kind === kind);
      if (!g) return new Vector3();
      const i = Math.floor((g.apo.length / 3) * frac);
      return new Vector3(g.apo[i * 3] * K, g.apo[i * 3 + 1] * K, g.apo[i * 3 + 2] * K);
    };
    const pos: Record<string, Vector3> = {
      actin: find("actin", 0.18),
      tropomyosin: find("tropomyosin", 0.62),
      troponin: find("troponinC", 0.5),
      myosin: heads[1] ? new Vector3((heads[1].x + 20) * K, (THICK_Y + 50) * K, 0) : new Vector3(),
      thick: new Vector3(-150 * K, THICK_Y * K, 0),
    };
    return level.hotspots.flatMap((h, index) => (pos[h.id] ? [{ id: h.id, index, pos: pos[h.id] }] : []));
  }, [groups, heads, level]);

  // camera: frame the whole scene once
  useEffect(() => {
    if (!controls) return;
    // look from the front, a little above: thin filament on top, thick filament below, heads in between
    controls.setLookAt(0.4, 0.35, 6, 0, -0.62, 0, false);
    void controls.fitToSphere(new Sphere(new Vector3(0, -0.62, 0), portrait ? 1.9 : 1.35), !reducedMotion);
    invalidate();
  }, [controls, portrait, reducedMotion, invalidate]);

  // selection glow per kind
  useEffect(() => {
    groups.forEach((g, gi) => {
      const m = meshRefs.current[gi];
      if (!m) return;
      const on = selected === g.kind || (selected === "troponin" && g.kind.startsWith("troponin"));
      const mat = m.material as MeshStandardMaterial;
      mat.emissive.set(on ? "#ffffff" : "#000000");
      mat.emissiveIntensity = on ? 0.35 : 0;
    });
    invalidate();
  }, [selected, groups, invalidate]);

  const pick = (e: ThreeEvent<MouseEvent>, id: string) => {
    e.stopPropagation();
    const marker = e.intersections.find((i) => i.object.type === "Sprite" && i.object.userData.hotspot);
    onSelect(marker ? (marker.object.userData.hotspot as string) : id);
  };
  const kindToHotspot = (k: Kind) => (k.startsWith("troponin") ? "troponin" : k);

  return (
    <group>
      <group ref={filament}>
        {groups.map((g, gi) => (
          <instancedMesh
            key={g.kind}
            ref={(m) => {
              meshRefs.current[gi] = m;
            }}
            args={[geo, undefined, g.apo.length / 3]}
            onClick={(e) => pick(e, kindToHotspot(g.kind))}
          >
            <meshStandardMaterial color="#ffffff" roughness={0.55} />
          </instancedMesh>
        ))}
        {/* exposed myosin-binding sites (glow only when Ca²⁺ has moved tropomyosin) */}
        {sites.map((p, i) => (
          <mesh key={i} position={[p.x * K, (p.y + p.ry * 26) * K, (p.z + p.rz * 26) * K]} scale={[9 * K, 9 * K, 9 * K]}>
            <sphereGeometry args={[1, 12, 8]} />
            <meshStandardMaterial
              ref={(m) => {
                if (m) siteMats.current[i] = m;
              }}
              color="#0ea5e9"
              emissive="#7dd3fc"
              emissiveIntensity={0}
              transparent
              opacity={0.85}
            />
          </mesh>
        ))}
      </group>

      {/* thick filament backbone (myosin tails) */}
      <mesh position={[0, THICK_Y * K, 0]} rotation={[0, 0, Math.PI / 2]} onClick={(e) => pick(e, "thick")}>
        <cylinderGeometry args={[16 * K, 16 * K, LENGTH_A * K * 0.95, 16]} />
        <meshStandardMaterial color={MYOSIN} roughness={0.5} />
      </mesh>
      {heads.map((_, i) => (
        <group
          key={i}
          ref={(g) => {
            headRefs.current[i] = g;
          }}
          onClick={(e) => pick(e, "myosin")}
        >
          <mesh>
            <cylinderGeometry args={[5 * K, 5 * K, 1, 10]} />
            <meshStandardMaterial color={MYOSIN} roughness={0.5} />
          </mesh>
          <mesh scale={[22 * K, 34 * K, 18 * K]}>
            <sphereGeometry args={[1, 18, 12]} />
            <meshStandardMaterial color={MYOSIN} emissive={MYOSIN} emissiveIntensity={0} roughness={0.45} />
          </mesh>
        </group>
      ))}

      {/* Ca²⁺ ions */}
      {[0, 1, 2, 3].map((i) => (
        <mesh
          key={i}
          visible={false}
          ref={(m) => {
            caRefs.current[i] = m;
          }}
        >
          <sphereGeometry args={[7 * K, 12, 8]} />
          <meshStandardMaterial color={CA} emissive={CA} emissiveIntensity={0.6} />
        </mesh>
      ))}

      {/* "toward the M line" arrow */}
      <mesh position={[-1.75, 0.55, 0]} rotation={[0, 0, Math.PI / 2]}>
        <coneGeometry args={[0.07, 0.18, 16]} />
        <meshBasicMaterial color="#8c6117" />
      </mesh>
      <mesh position={[-1.45, 0.55, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.022, 0.022, 0.45, 8]} />
        <meshBasicMaterial color="#8c6117" />
      </mesh>

      {!playing && anchors.map((a) => <Marker key={a.id} id={a.id} n={a.index + 1} pos={a.pos} active={selected === a.id} onClick={() => onSelect(a.id)} />)}
    </group>
  );
}
