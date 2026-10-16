import { BANDS, partById } from "@/content/explore";
import { bandsAt, formatUm, RELAXED_UM } from "./model";

/**
 * 2D side view driven by the same bandsAt() as the 3D scene: the A / I / H band strip under the model (3D-8),
 * and — with rows > 1 — the stand-in for the 3D model when WebGL is unavailable.
 */
export function SarcomereDiagram({ t, rows = 1, className }: { t: number; rows?: number; className?: string }) {
  const b = bandsAt(t);
  const W = 1000;
  const PAD = 40;
  const scale = (W - PAD * 2) / RELAXED_UM;
  const x = (um: number) => W / 2 + um * scale;

  const filamentH = rows * 34 + 10;
  const top = 28;
  const bracketY = top + filamentH + 22;
  const H = bracketY + 58;

  const thin = partById("actin").colour;
  const thick = partById("myosin").colour;
  const z = partById("zdisc").colour;
  const m = partById("mline").colour;

  const bracket = (from: number, to: number, y: number, colour: string, label: string) =>
    to - from > 0.005 ? (
      <g key={`${label}-${from}`}>
        <line x1={x(from)} x2={x(to)} y1={y} y2={y} stroke={colour} strokeWidth={5} strokeLinecap="round" />
        <text x={(x(from) + x(to)) / 2} y={y + 20} textAnchor="middle" className="fill-current text-[15px] font-bold">
          {label}
        </text>
      </g>
    ) : null;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={className} role="img" aria-label={`Sarcomere ${formatUm(b.sarcomere)}: A band ${formatUm(b.aBand)}, I band ${formatUm(b.iBand)}, H zone ${formatUm(b.hZone)}`}>
      <text x={W / 2} y={16} textAnchor="middle" className="fill-current text-[14px] font-bold opacity-70">
        Sarcomere (Z → Z) {formatUm(b.sarcomere)}
      </text>
      {Array.from({ length: rows }, (_, r) => {
        const y = top + 22 + r * 34;
        return (
          <g key={r}>
            <line x1={x(b.thinLeft.from)} x2={x(b.thinLeft.to)} y1={y - 11} y2={y - 11} stroke={thin} strokeWidth={4} strokeLinecap="round" />
            <line x1={x(b.thinRight.from)} x2={x(b.thinRight.to)} y1={y - 11} y2={y - 11} stroke={thin} strokeWidth={4} strokeLinecap="round" />
            <rect x={x(b.thickSpan.from)} y={y - 5} width={x(b.thickSpan.to) - x(b.thickSpan.from)} height={10} rx={5} fill={thick} />
            <line x1={x(b.thinLeft.from)} x2={x(b.thinLeft.to)} y1={y + 11} y2={y + 11} stroke={thin} strokeWidth={4} strokeLinecap="round" />
            <line x1={x(b.thinRight.from)} x2={x(b.thinRight.to)} y1={y + 11} y2={y + 11} stroke={thin} strokeWidth={4} strokeLinecap="round" />
          </g>
        );
      })}
      <line x1={x(b.zLeft)} x2={x(b.zLeft)} y1={top} y2={top + filamentH} stroke={z} strokeWidth={6} strokeLinecap="round" />
      <line x1={x(b.zRight)} x2={x(b.zRight)} y1={top} y2={top + filamentH} stroke={z} strokeWidth={6} strokeLinecap="round" />
      <line x1={x(0)} x2={x(0)} y1={top + 4} y2={top + filamentH - 4} stroke={m} strokeWidth={3} strokeDasharray="5 4" />

      {bracket(b.iLeft.from, b.iLeft.to, bracketY, BANDS.iband.colour, "½ I")}
      {bracket(b.thickSpan.from, b.thickSpan.to, bracketY, BANDS.aband.colour, "A band")}
      {bracket(b.iRight.from, b.iRight.to, bracketY, BANDS.iband.colour, "½ I")}
      {b.hSpan && bracket(b.hSpan.from, b.hSpan.to, bracketY - 14, BANDS.hzone.colour, "")}
      {b.hSpan && (
        <text x={x(0)} y={bracketY - 22} textAnchor="middle" className="fill-current text-[13px] font-bold">
          H
        </text>
      )}
    </svg>
  );
}
