import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Group, Quaternion, Vector3 } from "three";
import { useTimelinePlaying, ramp } from "../anim/timeline";
import { Marker } from "./marker";
import { Beads, decode, useFrameCamera, useJson, type BeadChain, type BeadsHandle, type MolSceneProps } from "./mol";

/**
 * S6 / C6 — myofilaments (lecture §6, §10.2–§11 steps 5–10).
 * Thin filament: PDB 6KN7 (Ca²⁺-free) ↔ 6KN8 (Ca²⁺-bound): blending the two real states moves tropomyosin off the
 * myosin-binding sites. Myosin heads: PDB 5H53 rigor heads fitted onto actin pairs. A head = motor domain + lever arm;
 * the power stroke swings the lever about the converter (pivot) while the bound motor domain moves with actin.
 */
type HeadJson = { index: number; motor: { n: number; xyz: string }; lever: { n: number; xyz: string }; pivot: number[]; tip: number[] };
type Data = { unit: number; chains: (BeadChain & { apo: string; ca: string })[]; heads: HeadJson[] };

const K = 4 / 470; // world units per Å (filament ≈ 470 Å long → 4 units)
const STROKE = 55; // Å per cycle ≈ one actin repeat along a strand
const COLOUR: Record<string, string> = {
  actin: "#38bdf8",
  tropomyosin: "#eab308",
  troponinT: "#15803d",
  troponinI: "#22c55e",
  troponinC: "#16a34a",
  motor: "#e11d48",
  lever: "#fb7185",
};
const CYCLES: [number, number][] = [
  [0.26, 0.53],
  [0.53, 0.8],
];

export default function FilamentsScene(props: MolSceneProps) {
  const data = useJson<Data>("/models/myofilaments.json");
  if (!data) return null;
  return <Scene data={data} {...props} />;
}

function Scene({ data, level, selected, onSelect, reducedMotion, timeline }: MolSceneProps & { data: Data }) {
  const playing = useTimelinePlaying(timeline);

  // thin filament grouped by kind, both states
  const thin = useMemo(() => {
    const by = new Map<string, { apo: number[]; ca: number[]; tint: number[] }>();
    data.chains.forEach((c, ci) => {
      const g = by.get(c.kind) ?? { apo: [], ca: [], tint: [] };
      const a = decode(c.apo, data.unit);
      const b = decode(c.ca, data.unit);
      for (let i = 0; i < c.n * 3; i++) {
        g.apo.push(a[i]);
        g.ca.push(b[i]);
      }
      for (let i = 0; i < c.n; i++) g.tint.push(c.kind === "actin" ? (ci % 2 ? 1 : 0.72) : 1);
      by.set(c.kind, g);
    });
    return [...by.entries()].map(([kind, g]) => ({ kind, apo: new Float32Array(g.apo), ca: new Float32Array(g.ca), tint: g.tint, now: new Float32Array(g.apo) }));
  }, [data]);

  const heads = useMemo(
    () =>
      data.heads.map((h) => {
        const motor = decode(h.motor.xyz, data.unit);
        const lever = decode(h.lever.xyz, data.unit);
        const pivot = new Vector3(...h.pivot);
        const tip = new Vector3(...h.tip);
        const leverDir = tip.clone().sub(pivot).normalize();
        // rotation axis ⟂ filament axis (x) and the lever; pick the sign that moves the tip toward +x (cocked)
        const axis = new Vector3().crossVectors(leverDir, new Vector3(1, 0, 0)).normalize();
        const L = tip.distanceTo(pivot);
        const theta0 = STROKE / Math.max(40, L);
        const test = tip.clone().sub(pivot).applyQuaternion(new Quaternion().setFromAxisAngle(axis, theta0)).add(pivot);
        const sign = test.x > tip.x ? 1 : -1;
        // the head comes off the filament along its radial direction
        const mc = new Vector3();
        for (let i = 0; i < motor.length / 3; i++) mc.add(new Vector3(motor[i * 3], motor[i * 3 + 1], motor[i * 3 + 2]));
        mc.multiplyScalar(3 / motor.length);
        const away = new Vector3(0, mc.y, mc.z).normalize();
        return { motor, lever, pivot, tip, axis, theta0: theta0 * sign, away, motorNow: new Float32Array(motor), leverNow: new Float32Array(lever) };
      }),
    [data],
  );

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

  const thinHandles = useRef<Record<string, BeadsHandle>>({});
  const headHandles = useRef<{ motor?: BeadsHandle; lever?: BeadsHandle }[]>([]);
  const filament = useRef<Group>(null);
  const ions = useRef<(Group | null)[]>([]);
  const last = useRef({ s: -1 });
  const q = useMemo(() => new Quaternion(), []);
  const v = useMemo(() => new Vector3(), []);
  const thickY = useMemo(() => Math.min(...heads.map((h) => h.tip.y)) - 12, [heads]);

  useFrame(() => {
    const t = timeline?.t ?? 0;
    // Ca²⁺ switch (real conformations)
    const s = ramp(t, 0.14, 0.26) * (1 - ramp(t, 0.84, 0.96));
    if (Math.abs(s - last.current.s) > 1e-4) {
      thin.forEach((g) => {
        for (let i = 0; i < g.apo.length; i++) g.now[i] = g.apo[i] + (g.ca[i] - g.apo[i]) * s;
        thinHandles.current[g.kind]?.write(g.now);
      });
      last.current.s = s;
    }
    const caIn = ramp(t, 0.1, 0.16) * (1 - ramp(t, 0.8, 0.86));
    ions.current.forEach((m, i) => {
      if (!m) return;
      const p = tnc[i % tnc.length];
      m.visible = caIn > 0.01;
      m.position.set(p.x * K, (p.y + 70 * (1 - caIn)) * K, (p.z + 40 * (1 - caIn)) * K);
    });

    // cross-bridge cycles
    let slide = 0;
    let phase: "rest" | "attach" | "stroke" | "detach" = "rest";
    let k = 0;
    for (const [a, b] of CYCLES) {
      if (t >= b) slide += STROKE;
      else if (t >= a) {
        const u = (t - a) / (b - a);
        if (u < 0.25) [phase, k] = ["attach", u / 0.25];
        else if (u < 0.6) {
          [phase, k] = ["stroke", (u - 0.25) / 0.35];
          slide += STROKE * ramp(k, 0, 1);
        } else {
          [phase, k] = ["detach", (u - 0.6) / 0.4];
          slide += STROKE;
        }
      }
    }
    slide *= 1 - ramp(t, 0.86, 1); // relaxation: back to rest length
    if (filament.current) filament.current.position.x = -slide * K;

    heads.forEach((h, hi) => {
      // how far the motor domain is from actin (Å) and how much the lever is cocked (0 = rigor, 1 = cocked)
      let off = 30;
      let cock = 1;
      let follow = 0; // motor domain moves with actin during the stroke
      if (phase === "attach") {
        off = 30 * (1 - ramp(k, 0, 1));
        cock = 1;
      } else if (phase === "stroke") {
        off = 0;
        cock = 1 - ramp(k, 0, 1);
        follow = -STROKE * ramp(k, 0, 1);
      } else if (phase === "detach") {
        off = 30 * ramp(k, 0, 0.35);
        cock = ramp(k, 0.3, 1);
        follow = -STROKE * (1 - ramp(k, 0.3, 1));
      }
      if (t < 0.26 || t >= 0.8) {
        off = 30;
        cock = 1;
        follow = 0;
      }
      const shift = h.away.clone().multiplyScalar(off).add(new Vector3(follow, 0, 0));
      for (let i = 0; i < h.motor.length; i += 3) {
        h.motorNow[i] = h.motor[i] + shift.x;
        h.motorNow[i + 1] = h.motor[i + 1] + shift.y;
        h.motorNow[i + 2] = h.motor[i + 2] + shift.z;
      }
      q.setFromAxisAngle(h.axis, h.theta0 * cock);
      for (let i = 0; i < h.lever.length; i += 3) {
        v.set(h.lever[i] - h.pivot.x, h.lever[i + 1] - h.pivot.y, h.lever[i + 2] - h.pivot.z).applyQuaternion(q);
        h.leverNow[i] = v.x + h.pivot.x + shift.x;
        h.leverNow[i + 1] = v.y + h.pivot.y + shift.y;
        h.leverNow[i + 2] = v.z + h.pivot.z + shift.z;
      }
      headHandles.current[hi]?.motor?.write(h.motorNow);
      headHandles.current[hi]?.lever?.write(h.leverNow);
    });
  });

  useFrameCamera([0, thickY * K * 0.45, 0], 1.45, [0.4, 0.3, 6], reducedMotion);

  const anchors = useMemo(() => {
    const at = (kind: string, frac: number) => {
      const g = thin.find((x) => x.kind === kind);
      if (!g) return new Vector3();
      const i = Math.floor((g.apo.length / 3) * frac);
      return new Vector3(g.apo[i * 3] * K, g.apo[i * 3 + 1] * K, g.apo[i * 3 + 2] * K);
    };
    const h = heads[1] ?? heads[0];
    const pos: Record<string, Vector3> = {
      actin: at("actin", 0.15),
      tropomyosin: at("tropomyosin", 0.65),
      troponin: at("troponinC", 0.5),
      myosin: h ? h.pivot.clone().multiplyScalar(K) : new Vector3(),
    };
    return level.hotspots.flatMap((hs, index) => (pos[hs.id] ? [{ id: hs.id, index, pos: pos[hs.id] }] : []));
  }, [thin, heads, level]);

  const kindToHotspot = (k: string) => (k.startsWith("troponin") ? "troponin" : k);

  return (
    <group>
      <group ref={filament}>
        {thin.map((g) => (
          <Beads
            key={g.kind}
            positions={g.apo}
            k={K}
            colour={COLOUR[g.kind]}
            tints={g.tint}
            selected={selected === kindToHotspot(g.kind)}
            onPick={() => onSelect(kindToHotspot(g.kind))}
            handle={(hd) => (thinHandles.current[g.kind] = hd)}
          />
        ))}
      </group>
      {heads.map((h, hi) => (
        <group key={hi}>
          <Beads
            positions={h.motor}
            k={K}
            colour={COLOUR.motor}
            selected={selected === "myosin"}
            onPick={() => onSelect("myosin")}
            handle={(hd) => ((headHandles.current[hi] ??= {}).motor = hd)}
          />
          <Beads
            positions={h.lever}
            k={K}
            colour={COLOUR.lever}
            selected={selected === "myosin"}
            onPick={() => onSelect("myosin")}
            handle={(hd) => ((headHandles.current[hi] ??= {}).lever = hd)}
          />
        </group>
      ))}
      {/* thick filament backbone (myosin tails, schematic) */}
      <mesh position={[0, thickY * K, 0]} rotation={[0, 0, Math.PI / 2]} onClick={() => onSelect("myosin")}>
        <cylinderGeometry args={[14 * K, 14 * K, 460 * K, 16]} />
        <meshStandardMaterial color="#9f1239" roughness={0.5} />
      </mesh>
      {[0, 1, 2, 3].map((i) => (
        <group key={i} ref={(g) => void (ions.current[i] = g)} visible={false}>
          <mesh>
            <sphereGeometry args={[7 * K, 12, 8]} />
            <meshStandardMaterial color="#a3e635" emissive="#a3e635" emissiveIntensity={0.7} />
          </mesh>
        </group>
      ))}
      {/* "toward the M line" arrow */}
      <group position={[-1.6, 0.75, 0]}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <coneGeometry args={[0.07, 0.18, 16]} />
          <meshBasicMaterial color="#8c6117" />
        </mesh>
        <mesh position={[0.3, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.022, 0.022, 0.45, 8]} />
          <meshBasicMaterial color="#8c6117" />
        </mesh>
      </group>
      {!playing && anchors.map((a) => <Marker key={a.id} id={a.id} n={a.index + 1} pos={a.pos} active={selected === a.id} onClick={() => onSelect(a.id)} />)}
    </group>
  );
}
