import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { AdditiveBlending, BufferAttribute, BufferGeometry, Group, Vector3, type MeshStandardMaterial, type Points } from "three";
import { pulse, useTimelinePlaying } from "../anim/timeline";
import { Marker } from "./marker";
import { Beads, decode, useFrameCamera, useJson, type BeadChain, type MolSceneProps } from "./mol";

/**
 * C4 — intercalated disc (lecture §14). Two cell membranes meet end-to-end:
 *   gap-junction region — narrow gap; PDB 2ZW3 connexin-26 channels (12 subunits, two docked connexons) span both
 *     membranes, ions pass straight from one cell into the next;
 *   desmosome region — wide gap; PDB 5J5J desmosomal cadherins reach in from each membrane and hold on to each other.
 * Gap widths follow the textbook picture (≈ 3 nm vs ≈ 30 nm); membrane geometry is schematic.
 */
type Data = { unit: number; gapJunction: BeadChain[]; cadherin: BeadChain[]; cadherinCa: number[][] };

const K = 4 / 640; // world units per Å
const MEM = 40; // membrane thickness, Å
const GJ_GAP = 17; // half gap at the gap junction
const DS_GAP = 168; // half gap at the desmosome
const CHANNELS = [-260, -170, -80]; // y of the gap-junction channels
const DESMO = [
  [120, 14],
  [235, -14],
]; // y, z of the cadherin pairs

export default function DiscsScene(props: MolSceneProps) {
  const data = useJson<Data>("/models/intercalated.json");
  if (!data) return null;
  return <Scene data={data} {...props} />;
}

function Scene({ data, level, selected, onSelect, reducedMotion, timeline }: MolSceneProps & { data: Data }) {
  const playing = useTimelinePlaying(timeline);

  // all connexin subunits as one bead cloud per channel position
  const channels = useMemo(() => {
    const one: number[] = [];
    data.gapJunction.forEach((c) => one.push(...decode(c.xyz!, data.unit)));
    return CHANNELS.map((y) => {
      const a = new Float32Array(one.length);
      for (let i = 0; i < one.length; i += 3) {
        a[i] = one[i];
        a[i + 1] = one[i + 1] + y;
        a[i + 2] = one[i + 2];
      }
      return a;
    });
  }, [data]);

  // cadherin: N-terminus (EC1) points into the gap; C-terminus sits on the membrane
  const cadherins = useMemo(() => {
    const raw = decode(data.cadherin[0].xyz!, data.unit);
    const n = raw.length / 3;
    const nTermRight = raw[0] > raw[(n - 1) * 3];
    const minX = Math.min(...Array.from({ length: n }, (_, i) => raw[i * 3]));
    const maxX = Math.max(...Array.from({ length: n }, (_, i) => raw[i * 3]));
    const make = (side: 1 | -1, y: number, z: number) => {
      // side −1 = cell 1 (left): C-terminus at x = −DS_GAP, tip toward +x
      const a = new Float32Array(raw.length);
      for (let i = 0; i < n; i++) {
        let x = raw[i * 3];
        x = nTermRight ? x - minX : maxX - x; // 0 at C-terminus … length at N-terminus
        a[i * 3] = side === -1 ? -DS_GAP + x : DS_GAP - x;
        a[i * 3 + 1] = raw[i * 3 + 1] + y;
        a[i * 3 + 2] = raw[i * 3 + 2] * side + z;
      }
      return a;
    };
    return DESMO.flatMap(([y, z]) => [
      { side: -1 as const, xyz: make(-1, y, z) },
      { side: 1 as const, xyz: make(1, y, -z) },
    ]);
  }, [data]);

  // ions streaming through the channels (cell 1 → cell 2)
  const ionCount = 36;
  const ionGeo = useMemo(() => {
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(new Float32Array(ionCount * 3), 3));
    return g;
  }, []);
  const ions = useRef<Points>(null);
  const cell2 = useRef<Group>(null);
  const membraneMats = useRef<MeshStandardMaterial[]>([]);
  const [cadGlow, gjGlow] = [useRef(0), useRef(0)];

  useFrame(() => {
    const t = timeline?.t ?? 0;
    const arr = ionGeo.getAttribute("position") as BufferAttribute;
    const flow = t > 0.15 && t < 0.58;
    for (let i = 0; i < ionCount; i++) {
      const ch = CHANNELS[i % CHANNELS.length];
      const phase = ((t - 0.15) / 0.4 + (i / ionCount) * 1.6) % 1;
      const x = -130 + 260 * phase;
      arr.setXYZ(i, x * K, (ch + Math.sin(i * 7.1) * 6) * K, Math.cos(i * 3.3) * 6 * K);
    }
    arr.needsUpdate = true;
    if (ions.current) ions.current.visible = flow;
    gjGlow.current = 0.5 * pulse(t, 0.12, 0.6);
    // contraction pulls the cells apart a little; the desmosomes hold
    const pull = pulse(t, 0.55, 0.92);
    if (cell2.current) cell2.current.position.x = 8 * pull * K;
    cadGlow.current = 0.6 * pull;
    membraneMats.current.forEach((m, i) => (m.emissiveIntensity = i >= 3 ? 0.35 * pulse(t, 0.3, 0.6) : 0));
  });

  useFrameCamera([0, 0, 0], 2.15, [0.6, 0.35, 6], reducedMotion);

  const membrane = (side: -1 | 1) => {
    // stepped membrane: narrow gap below (gap junctions), wide gap above (desmosomes), joined by a riser
    const s = side;
    const pieces: { p: [number, number, number]; size: [number, number, number] }[] = [
      { p: [s * (GJ_GAP + MEM / 2), -185, 0], size: [MEM, 290, 160] },
      { p: [s * (DS_GAP + MEM / 2), 185, 0], size: [MEM, 290, 160] },
      { p: [s * ((GJ_GAP + DS_GAP + MEM) / 2), 0, 0], size: [DS_GAP - GJ_GAP + MEM, MEM, 160] },
    ];
    return pieces.map((pc, i) => (
      <mesh key={i} position={pc.p.map((v) => v * K) as [number, number, number]} onClick={(e) => (e.stopPropagation(), onSelect("membrane"))}>
        <boxGeometry args={pc.size.map((v) => v * K) as [number, number, number]} />
        <meshStandardMaterial
          ref={(m) => void (m && (membraneMats.current[(side === -1 ? 0 : 3) + i] = m))}
          color={side === -1 ? "#f2c7a5" : "#e9b9c8"}
          emissive="#fde047"
          emissiveIntensity={0}
          roughness={0.85}
          transparent
          opacity={selected === "membrane" ? 0.75 : 0.45}
          depthWrite={false}
        />
      </mesh>
    ));
  };

  const anchors = useMemo(() => {
    const pos: Record<string, Vector3> = {
      gap: new Vector3(0, CHANNELS[1] * K, 60 * K),
      desmosome: new Vector3(0, DESMO[0][0] * K, 50 * K),
      membrane: new Vector3(-(GJ_GAP + MEM / 2) * K, -300 * K, 80 * K),
    };
    return level.hotspots.flatMap((h, index) => (pos[h.id] ? [{ id: h.id, index, pos: pos[h.id] }] : []));
  }, [level]);

  return (
    <group>
      <group>{membrane(-1)}</group>
      {channels.map((xyz, i) => (
        <GlowBeads key={i} xyz={xyz} colour="#14b8a6" glow={gjGlow} selected={selected === "gap"} onPick={() => onSelect("gap")} />
      ))}
      {cadherins
        .filter((c) => c.side === -1)
        .map((c, i) => (
          <GlowBeads key={i} xyz={c.xyz} colour="#a855f7" glow={cadGlow} selected={selected === "desmosome"} onPick={() => onSelect("desmosome")} />
        ))}
      <group ref={cell2}>
        {membrane(1)}
        {cadherins
          .filter((c) => c.side === 1)
          .map((c, i) => (
            <GlowBeads key={i} xyz={c.xyz} colour="#c084fc" glow={cadGlow} selected={selected === "desmosome"} onPick={() => onSelect("desmosome")} />
          ))}
      </group>
      <points ref={ions} geometry={ionGeo} visible={false}>
        <pointsMaterial color="#fde047" size={0.09} sizeAttenuation transparent depthWrite={false} blending={AdditiveBlending} />
      </points>
      {!playing && anchors.map((a) => <Marker key={a.id} id={a.id} n={a.index + 1} pos={a.pos} active={selected === a.id} onClick={() => onSelect(a.id)} />)}
    </group>
  );
}

/** Beads whose glow follows a ref that the frame loop updates (no React re-render while animating). */
function GlowBeads({ xyz, colour, glow, selected, onPick }: { xyz: Float32Array; colour: string; glow: { current: number }; selected: boolean; onPick: () => void }) {
  const mat = useRef<MeshStandardMaterial | null>(null);
  useFrame(() => {
    if (!mat.current) return;
    const a = Math.max(selected ? 0.35 : 0, glow.current);
    mat.current.emissive.set(a > 0 ? "#ffffff" : "#000000");
    mat.current.emissiveIntensity = a;
  });
  return (
    <Beads
      positions={xyz}
      k={K}
      colour={colour}
      selected={selected}
      onPick={onPick}
      handle={(h) => {
        mat.current = (h.mesh?.material as MeshStandardMaterial) ?? null;
      }}
    />
  );
}
