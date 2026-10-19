import { useSyncExternalStore } from "react";

/**
 * A tiny clock for the 3D animations. The scene advances it inside useFrame (no React re-render per frame);
 * the page only re-renders when the current step changes (useTimelineStep).
 * t runs 0 → 1 and loops.
 */
export class Timeline {
  t = 0;
  playing = false;
  private listeners = new Set<() => void>();

  constructor(public seconds: number) {}

  tick(dt: number) {
    if (!this.playing) return;
    this.t = (this.t + dt / this.seconds) % 1;
    this.emit();
  }
  play() {
    this.playing = true;
    this.emit();
  }
  pause() {
    this.playing = false;
    this.emit();
  }
  seek(t: number) {
    this.t = Math.min(0.9999, Math.max(0, t));
    this.emit();
  }
  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };
  private emit() {
    this.listeners.forEach((fn) => fn());
  }
}

/** Index of the step the timeline is in (steps start at `from`, sorted). Re-renders only when it changes. */
export function useTimelineStep(tl: Timeline | null, starts: number[]) {
  return useSyncExternalStore(
    tl ? tl.subscribe : noopSubscribe,
    () => (tl ? stepIndex(tl.t, starts) : 0),
    () => 0,
  );
}

export function useTimelinePlaying(tl: Timeline | null) {
  return useSyncExternalStore(
    tl ? tl.subscribe : noopSubscribe,
    () => !!tl?.playing,
    () => false,
  );
}

export function stepIndex(t: number, starts: number[]) {
  let i = 0;
  while (i + 1 < starts.length && t >= starts[i + 1]) i++;
  return i;
}

const noopSubscribe = () => () => {};

// ---------- small easing helpers shared by the animations ----------
export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
/** 0 before a, 1 after b, smooth in between. */
export const ramp = (t: number, a: number, b: number) => {
  const x = clamp01((t - a) / (b - a));
  return x * x * (3 - 2 * x);
};
/** 0 → 1 → 0 across [a, b] (peak in the middle). */
export const pulse = (t: number, a: number, b: number) => {
  if (t <= a || t >= b) return 0;
  return Math.sin(((t - a) / (b - a)) * Math.PI);
};

/** Sarcomere level: how far it is contracted (0 relaxed … 1 fully) at t — shared by the 3D scene and the panel readout. */
export const sarcomereContraction = (t: number) => ramp(t, 0.02, 0.45) * (1 - ramp(t, 0.7, 0.95));
