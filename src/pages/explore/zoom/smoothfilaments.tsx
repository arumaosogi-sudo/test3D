import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Group, Matrix4, Vector3, type MeshStandardMaterial } from "three";
import { pulse, ramp, useTimelinePlaying } from "../anim/timeline";
import { Marker } from "./marker";
import { Beads, centroidOf, decode, useFrameCamera, useJson, type BeadChain, type MolSceneProps } from "./mol";

/**
 * M5 — smooth muscle myofilaments (lecture §16). Real structures, one bead per amino acid:
 *   PDB 5JLF F-actin + tropomyosin (no troponin) — 5 subunits, repeated along the helix to make a longer filament,
 *   PDB 1BR2 smooth muscle myosin motor domain (two copies below the filament),
 *   PDB 1EXR calmodulin with its Ca²⁺ ions.
 * The molecules' positions relative to each other are schematic. Ca²⁺ binds calmodulin → myosin heads bind actin and
 * pull → the thin filament slides → relaxation.
 */
type Data = { unit: number; thin: BeadChain[]; myosin: BeadChain[]; calmodulin: BeadChain[]; calmodulinCa: number[][] };

const K = 4 / 520;
const RISE = 137.5; // 5 actin subunits × 27.5 Å
const TWIST = (-833.5 * Math.PI) / 180; // 5 × −166.7°
const COPIES = [-1, 0, 1];
const HEADS = [
  { x: -95, y: -78, z: 0 },
  { x: 60, y: -80, z: 10 },
];
const CALMODULIN = new Vector3(40, 95, 10);
const STROKE = 55;

export default function SmoothFilamentsScene(props: MolSceneProps) {
  const data = useJson<Data>("/models/smoothfil.json");
  if (!data) return null;
  return <Scene data={data} {...props} />;
}

function Scene({ data, level, selected, onSelect, reducedMotion, timeline }: MolSceneProps & { data: Data }) {
  const playing = useTimelinePlaying(timeline);
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => invalidate(), [selected, invalidate]);

  // thin filament: repeat the 5-subunit piece along the helix
  const thin = useMemo(() => {
    const kinds: Record<string, number[]> = { actin: [], tropomyosin: [] };
    const tints: Record<string, number[]> = { actin: [], tropomyosin: [] };
    COPIES.forEach((m) => {
      const rot = new Matrix4().makeRotationX(TWIST * m);
      data.thin.forEach((c, ci) => {
        const a = decode(c.xyz!, data.unit);
        const v = new Vector3();
        for (let i = 0; i < c.n; i++) {
          v.set(a[i * 3], a[i * 3 + 1], a[i * 3 + 2]).applyMatrix4(rot);
          kinds[c.kind].push(v.x + RISE * m, v.y, v.z);
          tints[c.kind].push(c.kind === "actin" ? ((ci + m) % 2 ? 1 : 0.72) : 1);
        }
      });
    });
    return { actin: new Float32Array(kinds.actin), tropomyosin: new Float32Array(kinds.tropomyosin), tints };
  }, [data]);

  const myo = useMemo(() => {
    const a = decode(data.myosin[0].xyz!, data.unit);
    const c = centroidOf(a);
    return HEADS.map((h) => {
      const out = new Float32Array(a.length);
      for (let i = 0; i < a.length; i += 3) {
        out[i] = a[i] - c.x + h.x;
        out[i + 1] = a[i + 1] - c.y + h.y;
        out[i + 2] = a[i + 2] - c.z + h.z;
      }
      return out;
    });
  }, [data]);

  const cam = useMemo(() => {
    const a = decode(data.calmodulin[0].xyz!, data.unit);
    const out = new Float32Array(a.length);
    for (let i = 0; i < a.length; i += 3) {
      out[i] = a[i] + CALMODULIN.x;
      out[i + 1] = a[i + 1] + CALMODULIN.y;
      out[i + 2] = a[i + 2] + CALMODULIN.z;
    }
    return out;
  }, [data]);
  const caSites = useMemo(() => data.calmodulinCa.map(([x, y, z]) => new Vector3(x, y, z).add(CALMODULIN)), [data]);

  const filament = useRef<Group>(null);
  const heads = useRef<(Group | null)[]>([]);
  const ions = useRef<(Group | null)[]>([]);
  const camMat = useRef<MeshStandardMaterial | null>(null);
  const headMats = useRef<MeshStandardMaterial[]>([]);

  useFrame(() => {
    const t = timeline?.t ?? 0;
    // Ca²⁺ flies in to calmodulin, leaves on relaxation
    const caIn = ramp(t, 0.15, 0.35) * (1 - ramp(t, 0.82, 0.95));
    ions.current.forEach((g, i) => {
      if (!g) return;
      const p = caSites[i];
      const from = new Vector3(p.x + 90 * Math.cos(i * 1.7), p.y + 120, p.z + 60 * Math.sin(i * 2.3));
      g.visible = t > 0.12 && caIn > 0.01;
      g.position.copy(from.lerp(p, caIn)).multiplyScalar(K);
    });
    if (camMat.current) {
      camMat.current.emissive.set("#a3e635");
      camMat.current.emissiveIntensity = Math.max(selected === "calmodulin" ? 0.35 : 0, 0.5 * pulse(t, 0.28, 0.85));
    }
    // heads attach (move up to actin), pull the filament toward −x, then let go
    const attach = ramp(t, 0.4, 0.52) * (1 - ramp(t, 0.8, 0.9));
    const stroke = ramp(t, 0.55, 0.78) * (1 - ramp(t, 0.85, 1));
    if (filament.current) filament.current.position.x = -STROKE * stroke * K;
    heads.current.forEach((g) => {
      if (!g) return;
      g.position.set(-STROKE * stroke * K * (attach > 0.5 ? 1 : 0), 22 * attach * K, 0);
      g.rotation.z = 0.25 * stroke * attach;
    });
    headMats.current.forEach((m) => {
      m.emissive.set("#ffffff");
      m.emissiveIntensity = Math.max(selected === "myosin" ? 0.35 : 0, 0.4 * pulse(t, 0.42, 0.82));
    });
  });

  useFrameCamera([0, 0, 0], 1.9, [0.5, 0.35, 6], reducedMotion);

  const anchors = useMemo(() => {
    const pos: Record<string, Vector3> = {
      actin: new Vector3(-150 * K, 30 * K, 40 * K),
      myosin: new Vector3(HEADS[1].x * K, (HEADS[1].y - 30) * K, 40 * K),
      calmodulin: CALMODULIN.clone().add(new Vector3(0, 30, 30)).multiplyScalar(K),
      ca: caSites[0] ? caSites[0].clone().add(new Vector3(40, 50, 20)).multiplyScalar(K) : new Vector3(),
    };
    return level.hotspots.flatMap((h, index) => (pos[h.id] ? [{ id: h.id, index, pos: pos[h.id] }] : []));
  }, [level, caSites]);

  return (
    <group>
      <group ref={filament}>
        <Beads positions={thin.actin} k={K} colour="#38bdf8" tints={thin.tints.actin} selected={selected === "actin"} onPick={() => onSelect("actin")} />
        <Beads positions={thin.tropomyosin} k={K} colour="#eab308" selected={selected === "actin"} onPick={() => onSelect("actin")} />
      </group>
      {myo.map((xyz, i) => (
        <group key={i} ref={(g) => void (heads.current[i] = g)}>
          <Beads
            positions={xyz}
            k={K}
            colour="#e11d48"
            selected={selected === "myosin"}
            onPick={() => onSelect("myosin")}
            handle={(h) => void (h.mesh && (headMats.current[i] = h.mesh.material as MeshStandardMaterial))}
          />
        </group>
      ))}
      <Beads
        positions={cam}
        k={K}
        colour="#16a34a"
        selected={selected === "calmodulin"}
        onPick={() => onSelect("calmodulin")}
        handle={(h) => void (camMat.current = (h.mesh?.material as MeshStandardMaterial) ?? null)}
      />
      {caSites.map((_, i) => (
        <group key={i} ref={(g) => void (ions.current[i] = g)} visible={false}>
          <mesh onClick={(e) => (e.stopPropagation(), onSelect("ca"))}>
            <sphereGeometry args={[6 * K, 12, 8]} />
            <meshStandardMaterial color="#a3e635" emissive="#a3e635" emissiveIntensity={0.8} />
          </mesh>
        </group>
      ))}
      {!playing && anchors.map((a) => <Marker key={a.id} id={a.id} n={a.index + 1} pos={a.pos} active={selected === a.id} onClick={() => onSelect(a.id)} />)}
    </group>
  );
}
