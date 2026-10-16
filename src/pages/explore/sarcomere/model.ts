/**
 * Sliding filament model of one sarcomere (Key Point Book STEP III · lecture sheet §5 and §12).
 *
 * Lengths are typical textbook averages for human skeletal muscle (Tortora & Derrickson, Marieb & Hoehn):
 *   thick filament 1.6 µm · thin filament 1.0 µm from each Z disc · sarcomere 2.5 µm at rest → 2.0 µm fully contracted.
 * Filaments never change length — only their overlap does — so the A band stays 1.6 µm while the
 * I band shortens and the H zone closes (it is exactly 0 at 2.0 µm because 2 × 1.0 µm thin = 2.0 µm).
 *
 * Positions are in µm along the long axis with the M line at 0 (negative = left half).
 */
export const THICK_UM = 1.6;
export const THIN_UM = 1.0;
export const RELAXED_UM = 2.5;
export const CONTRACTED_UM = 2.0;

export type Span = { from: number; to: number };

export type Bands = {
  /** Contraction amount, clamped to 0 (relaxed) … 1 (fully contracted). */
  t: number;
  /** Z disc to Z disc. */
  sarcomere: number;
  /** Length of the thick filaments — never changes. */
  aBand: number;
  /** Total I band (both halves, thin filaments only). */
  iBand: number;
  /** Centre of the A band with thick filaments only. */
  hZone: number;
  /** Thick–thin overlap on each side of the M line. */
  overlap: number;
  thick: number;
  thin: number;
  zLeft: number;
  zRight: number;
  thickSpan: Span;
  thinLeft: Span;
  thinRight: Span;
  /** null once the thin filaments meet in the middle. */
  hSpan: Span | null;
  iLeft: Span;
  iRight: Span;
};

const clamp01 = (t: number) => (Number.isFinite(t) ? Math.min(1, Math.max(0, t)) : 0);

export function bandsAt(tRaw: number): Bands {
  const t = clamp01(tRaw);
  const sarcomere = RELAXED_UM - (RELAXED_UM - CONTRACTED_UM) * t;
  const half = sarcomere / 2;
  const zLeft = -half;
  const zRight = half;
  const thickHalf = THICK_UM / 2;
  const hZone = Math.max(0, sarcomere - 2 * THIN_UM);
  const overlap = Math.max(0, THIN_UM - (half - thickHalf));

  return {
    t,
    sarcomere,
    aBand: THICK_UM,
    iBand: sarcomere - THICK_UM,
    hZone,
    overlap,
    thick: THICK_UM,
    thin: THIN_UM,
    zLeft,
    zRight,
    thickSpan: { from: -thickHalf, to: thickHalf },
    thinLeft: { from: zLeft, to: zLeft + THIN_UM },
    thinRight: { from: zRight - THIN_UM, to: zRight },
    hSpan: hZone > 0 ? { from: -hZone / 2, to: hZone / 2 } : null,
    iLeft: { from: zLeft, to: -thickHalf },
    iRight: { from: thickHalf, to: zRight },
  };
}

/** "2.25 µm" — two decimals, the precision shown on the page. */
export const formatUm = (um: number) => `${(Math.round(um * 100) / 100).toFixed(2)} µm`;
