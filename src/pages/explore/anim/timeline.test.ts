import { describe, expect, it } from "vitest";
import { ANIMS, animStarts } from "@/content/exploreAnims";
import { Timeline, clamp01, pulse, ramp, stepIndex } from "./timeline";

describe("Timeline", () => {
  it("advances only while playing and loops at 1", () => {
    const tl = new Timeline(2);
    tl.tick(1);
    expect(tl.t).toBe(0);
    tl.play();
    tl.tick(1);
    expect(tl.t).toBeCloseTo(0.5);
    tl.tick(1.5);
    expect(tl.t).toBeCloseTo(0.25);
  });

  it("seek clamps into [0, 1) and notifies subscribers", () => {
    const tl = new Timeline(1);
    let calls = 0;
    const off = tl.subscribe(() => calls++);
    tl.seek(5);
    expect(tl.t).toBeLessThan(1);
    tl.seek(-1);
    expect(tl.t).toBe(0);
    off();
    tl.seek(0.5);
    expect(calls).toBe(2);
  });
});

describe("easing helpers", () => {
  it("ramp goes 0 → 1 between a and b", () => {
    expect(ramp(0, 0.2, 0.4)).toBe(0);
    expect(ramp(0.3, 0.2, 0.4)).toBeCloseTo(0.5);
    expect(ramp(1, 0.2, 0.4)).toBe(1);
  });
  it("pulse peaks in the middle and is 0 outside", () => {
    expect(pulse(0.1, 0.2, 0.4)).toBe(0);
    expect(pulse(0.3, 0.2, 0.4)).toBeCloseTo(1);
    expect(pulse(0.5, 0.2, 0.4)).toBe(0);
  });
  it("clamp01", () => {
    expect(clamp01(-2)).toBe(0);
    expect(clamp01(2)).toBe(1);
  });
});

describe("stepIndex", () => {
  it("finds the step a time falls in", () => {
    const starts = [0, 0.3, 0.7];
    expect(stepIndex(0, starts)).toBe(0);
    expect(stepIndex(0.29, starts)).toBe(0);
    expect(stepIndex(0.3, starts)).toBe(1);
    expect(stepIndex(0.99, starts)).toBe(2);
  });
});

describe("animation captions (exploreAnims)", () => {
  it("every animation starts at 0, has increasing step starts below 1 and cites the lecture sheet (or is marked pending)", () => {
    for (const [level, anim] of Object.entries(ANIMS)) {
      const starts = animStarts(anim!);
      expect(starts[0], level).toBe(0);
      starts.forEach((s, i) => {
        expect(s, level).toBeLessThan(1);
        if (i) expect(s, level).toBeGreaterThan(starts[i - 1]);
      });
      // a step that rests on the team document only must be flagged so the page shows the "awaiting review" badge
      anim!.steps.forEach((s) => expect(s.ref, `${level}: ${s.title}`).toMatch(s.pending ? /§\d|team document/ : /§\d/));
      expect(anim!.seconds).toBeGreaterThan(0);
    }
  });
});
