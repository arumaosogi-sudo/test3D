import { describe, expect, it } from "vitest";
import { bandsAt, CONTRACTED_UM, formatUm, RELAXED_UM, THICK_UM, THIN_UM } from "./model";

const steps = Array.from({ length: 21 }, (_, i) => i / 20);
const len = (s: { from: number; to: number }) => s.to - s.from;

describe("bandsAt — sliding filament theory", () => {
  it("relaxed and contracted end points", () => {
    expect(bandsAt(0).sarcomere).toBeCloseTo(RELAXED_UM);
    expect(bandsAt(1).sarcomere).toBeCloseTo(CONTRACTED_UM);
    expect(bandsAt(0).hZone).toBeCloseTo(0.5);
    expect(bandsAt(0).iBand).toBeCloseTo(0.9);
    expect(bandsAt(1).iBand).toBeCloseTo(0.4);
  });

  it.each(steps)("A band and every filament keep their length (t = %s)", (t) => {
    const b = bandsAt(t);
    expect(b.aBand).toBeCloseTo(THICK_UM);
    expect(len(b.thickSpan)).toBeCloseTo(THICK_UM);
    expect(len(b.thinLeft)).toBeCloseTo(THIN_UM);
    expect(len(b.thinRight)).toBeCloseTo(THIN_UM);
  });

  it.each(steps)("bands add up (t = %s)", (t) => {
    const b = bandsAt(t);
    expect(b.aBand + b.iBand).toBeCloseTo(b.sarcomere);
    expect(b.hZone + 2 * b.overlap).toBeCloseTo(b.aBand);
    expect(len(b.iLeft) + len(b.iRight)).toBeCloseTo(b.iBand);
    expect(b.zRight - b.zLeft).toBeCloseTo(b.sarcomere);
    // thin filaments stay anchored on their Z disc
    expect(b.thinLeft.from).toBeCloseTo(b.zLeft);
    expect(b.thinRight.to).toBeCloseTo(b.zRight);
  });

  it("sarcomere and I band shorten, H zone narrows, overlap grows", () => {
    for (let i = 1; i < steps.length; i++) {
      const a = bandsAt(steps[i - 1]);
      const b = bandsAt(steps[i]);
      expect(b.sarcomere).toBeLessThan(a.sarcomere);
      expect(b.iBand).toBeLessThan(a.iBand);
      expect(b.hZone).toBeLessThanOrEqual(a.hZone);
      expect(b.overlap).toBeGreaterThanOrEqual(a.overlap);
    }
  });

  it("H zone disappears when fully contracted", () => {
    expect(bandsAt(1).hZone).toBeCloseTo(0);
    expect(bandsAt(1).hSpan).toBeNull();
    expect(bandsAt(0.5).hSpan).not.toBeNull();
  });

  it("clamps out-of-range input", () => {
    expect(bandsAt(-1).sarcomere).toBeCloseTo(RELAXED_UM);
    expect(bandsAt(2).sarcomere).toBeCloseTo(CONTRACTED_UM);
    expect(bandsAt(Number.NaN).t).toBe(0);
  });

  it("formats lengths", () => {
    expect(formatUm(2.25)).toBe("2.25 µm");
    expect(formatUm(0)).toBe("0.00 µm");
  });
});
