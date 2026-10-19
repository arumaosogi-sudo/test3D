import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useThree } from "@react-three/fiber";
import type { CameraControls } from "@react-three/drei";
import { Color, IcosahedronGeometry, InstancedMesh, MeshStandardMaterial, Sphere, Vector3, type ColorRepresentation } from "three";
import type { ZoomLevel } from "@/content/exploreZoom";
import type { Timeline } from "../anim/timeline";

/**
 * Shared pieces for the code-built molecular / cellular scenes (myofilaments, intercalated disc, dense bodies,
 * smooth muscle filaments): loading the bead JSON made from PDB files, instanced beads, camera framing, selection.
 */
export type MolSceneProps = {
  level: ZoomLevel;
  selected: string | null;
  onSelect: (key: string | null) => void;
  reducedMotion: boolean;
  timeline: Timeline | null;
};

export type BeadChain = { chain: string; kind: string; n: number; xyz?: string; apo?: string; ca?: string };

/** int16 (0.1 Å) base64 → Float32Array in Å. */
export function decode(b64: string, unit: number) {
  const bin = atob(b64);
  const buf = new ArrayBuffer(bin.length);
  const u8 = new Uint8Array(buf);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  const i16 = new Int16Array(buf);
  const out = new Float32Array(i16.length);
  for (let i = 0; i < i16.length; i++) out[i] = i16[i] * unit;
  return out;
}

/** Fetch a JSON file once per mount. */
export function useJson<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  useEffect(() => {
    let alive = true;
    void fetch(url)
      .then((r) => r.json() as Promise<T>)
      .then((d) => alive && setData(d));
    return () => {
      alive = false;
    };
  }, [url]);
  return data;
}

export const centroidOf = (xyz: Float32Array) => {
  const c = new Vector3();
  const n = xyz.length / 3;
  for (let i = 0; i < n; i++) c.add(new Vector3(xyz[i * 3], xyz[i * 3 + 1], xyz[i * 3 + 2]));
  return c.multiplyScalar(1 / Math.max(1, n));
};

const BEAD = new IcosahedronGeometry(1, 0);

/**
 * One instanced mesh of beads. `positions` are in Å; `k` converts Å → world units. Call `ref.current.write(arr)`
 * to move the beads later (e.g. blending two conformations).
 */
export type BeadsHandle = { write: (xyz: Float32Array, offset?: Vector3) => void; mesh: InstancedMesh | null };

export function Beads({
  positions,
  k,
  radius = 3.4,
  colour,
  tints,
  onPick,
  handle,
  selected = false,
  emissive,
}: {
  positions: Float32Array;
  k: number;
  radius?: number;
  colour: ColorRepresentation;
  /** Per-bead brightness factor (e.g. alternating subunits). */
  tints?: number[];
  onPick?: () => void;
  handle?: (h: BeadsHandle) => void;
  selected?: boolean;
  /** Extra glow driven by an animation (0..1). */
  emissive?: number;
}) {
  const ref = useRef<InstancedMesh>(null);
  const invalidate = useThree((s) => s.invalidate);
  const n = positions.length / 3;
  const mat = useMemo(() => new MeshStandardMaterial({ color: "#ffffff", roughness: 0.55 }), []);
  useEffect(() => () => mat.dispose(), [mat]);

  const write = useMemo(
    () => (xyz: Float32Array, offset?: Vector3) => {
      const m = ref.current;
      if (!m) return;
      const e = m.instanceMatrix.array as Float32Array;
      const r = radius * k;
      const ox = offset?.x ?? 0,
        oy = offset?.y ?? 0,
        oz = offset?.z ?? 0;
      for (let i = 0; i < n; i++) {
        const o = i * 16;
        e[o] = r;
        e[o + 5] = r;
        e[o + 10] = r;
        e[o + 15] = 1;
        e[o + 12] = (xyz[i * 3] + ox) * k;
        e[o + 13] = (xyz[i * 3 + 1] + oy) * k;
        e[o + 14] = (xyz[i * 3 + 2] + oz) * k;
      }
      m.instanceMatrix.needsUpdate = true;
      m.computeBoundingSphere();
    },
    [k, n, radius],
  );

  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const base = new Color(colour);
    const c = new Color();
    for (let i = 0; i < n; i++) m.setColorAt(i, c.copy(base).multiplyScalar(tints?.[i] ?? 1));
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    write(positions);
    handle?.({ write, mesh: m });
    invalidate();
  }, [colour, tints, positions, write, handle, n, invalidate]);

  useEffect(() => {
    const on = selected ? 0.35 : 0;
    const a = Math.max(on, emissive ?? 0);
    mat.emissive.set(a > 0 ? "#ffffff" : "#000000");
    mat.emissiveIntensity = a;
    invalidate();
  }, [selected, emissive, mat, invalidate]);

  return (
    <instancedMesh
      ref={ref}
      args={[BEAD, mat, n]}
      onClick={(e) => {
        e.stopPropagation();
        const marker = e.intersections.find((i) => i.object.type === "Sprite" && i.object.userData.hotspot);
        if (marker) return; // the marker's own handler selects it
        onPick?.();
      }}
    />
  );
}

/** Frame a sphere once (and again when the screen turns portrait / landscape). */
export function useFrameCamera(centre: [number, number, number], radius: number, eye: [number, number, number], reducedMotion: boolean) {
  const controls = useThree((s) => s.controls) as CameraControls | null;
  const invalidate = useThree((s) => s.invalidate);
  const portrait = useThree((s) => s.size.width < s.size.height);
  useEffect(() => {
    if (!controls) return;
    const [cx, cy, cz] = centre;
    controls.setLookAt(cx + eye[0], cy + eye[1], cz + eye[2], cx, cy, cz, false);
    void controls.fitToSphere(new Sphere(new Vector3(cx, cy, cz), radius * (portrait ? 1.4 : 1)), !reducedMotion);
    invalidate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controls, portrait, reducedMotion, invalidate]);
}
