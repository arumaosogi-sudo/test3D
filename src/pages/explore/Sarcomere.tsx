import { Suspense, lazy, useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { StudentPageHeader } from "@/components/student/StudentPageHeader";
import { useDocumentTitle } from "@/components/student/useDocumentTitle";
import { InfoIcon } from "@/components/student/icons";
import { Spinner } from "@/components/ui";
import { BANDS, CONTRACTION_LESSON, CONTRACTION_STEPS, MOTION_VIDEO, PARTS, partById, type PartId } from "@/content/explore";
import { bandsAt, formatUm, THICK_UM, THIN_UM } from "./sarcomere/model";
import { SarcomereDiagram } from "./sarcomere/SarcomereDiagram";
import { InfoPanel } from "./shared/InfoPanel";
import { hasWebGL, prefersReducedMotion } from "./shared/webgl";

// three.js + R3F live in their own chunk, so the page shell (slider, cards, text) shows before the 3D code arrives.
const SarcomereScene = lazy(() => import("./sarcomere/SarcomereScene"));

/**
 * /explore/sarcomere — interactive sarcomere (3D-5 … 3D-9). Built in code, no model file.
 * The slider drives bandsAt(t); the 3D scene, the 2D band strip and the result cards all read the same numbers.
 */
export default function Sarcomere() {
  useDocumentTitle("Sarcomere");
  const [pct, setPct] = useState(0);
  const [selected, setSelected] = useState<PartId | null>(null);
  const [showBands, setShowBands] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [webgl] = useState(hasWebGL);
  const t = pct / 100;
  const b = bandsAt(t);
  const part = selected ? partById(selected) : null;

  // "Animate" ping-pongs the slider; stops on its own when the student drags the slider.
  const dir = useRef(1);
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(64, now - last);
      last = now;
      setPct((p) => {
        const next = p + dir.current * dt * 0.05; // ≈ 2 s from relaxed to contracted
        if (next >= 100) dir.current = -1;
        if (next <= 0) dir.current = 1;
        return Math.min(100, Math.max(0, next));
      });
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  const results: { label: string; value: string; change: string; tone: "down" | "same" }[] = [
    { label: "Sarcomere (Z → Z)", value: formatUm(b.sarcomere), change: "Shorter", tone: "down" },
    { label: "I band", value: formatUm(b.iBand), change: "Shorter", tone: "down" },
    { label: "H zone", value: formatUm(b.hZone), change: b.hZone < 0.005 ? "Gone" : "Narrower", tone: "down" },
    { label: "A band", value: formatUm(b.aBand), change: "No change", tone: "same" },
    { label: "Filament length", value: `${THICK_UM.toFixed(1)} / ${THIN_UM.toFixed(1)} µm`, change: "No change", tone: "same" },
  ];

  return (
    <div className="coast-explore coast-sans">
      <StudentPageHeader
        title="Sarcomere"
        subtitle="Contract a sarcomere and see what changes — and what doesn't."
        phoneSubtitle="OL4 · OL5"
        crumbs={[{ to: "/", label: "Home" }, { to: "/explore", label: "3D Explore" }, { label: "Sarcomere" }]}
        back="/explore"
        right={
          <span className="flex gap-2">
            <span className="coast-chip px-3 py-1 text-[12px] font-bold">OL4</span>
            <span className="coast-chip px-3 py-1 text-[12px] font-bold">OL5</span>
          </span>
        }
      />

      <div className="mt-2 grid gap-5 md:mt-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-5">
          {/* 3D viewer */}
          <section className="coast-card overflow-hidden" aria-label="Sarcomere model">
            <div className="relative h-[320px] bg-[var(--c-bg)] md:h-[440px]">
              {webgl ? (
                <Suspense
                  fallback={
                    <div className="grid h-full place-items-center text-[var(--c-muted)]">
                      <span className="flex items-center gap-2 text-sm font-semibold">
                        <Spinner /> Loading 3D model…
                      </span>
                    </div>
                  }
                >
                  <SarcomereScene t={t} selected={selected} onSelect={setSelected} showBands={showBands} />
                </Suspense>
              ) : (
                <div className="flex h-full flex-col justify-center gap-3 p-4 text-[var(--c-text)]">
                  <p className="flex items-center gap-2 text-[14px] font-semibold">
                    <InfoIcon size={18} /> 3D isn’t available on this device, so here is the same sarcomere in 2D.
                  </p>
                  <SarcomereDiagram t={t} rows={5} className="w-full" />
                </div>
              )}
              {webgl && (
                <div className="pointer-events-none absolute inset-x-3 bottom-3 flex flex-wrap items-center justify-between gap-2">
                  <span className="rounded-full bg-[var(--c-chip)] px-3 py-1 text-[12px] font-semibold text-[var(--c-text)] shadow-sm ring-1 ring-[var(--c-hair)] backdrop-blur-sm">Drag to rotate · pinch or scroll to zoom · tap a part</span>
                  <label className="pointer-events-auto flex items-center gap-2 rounded-full bg-[var(--c-chip)] px-3 py-1 text-[12px] font-semibold text-[var(--c-text)] shadow-sm ring-1 ring-[var(--c-hair)] backdrop-blur-sm">
                    <input type="checkbox" checked={showBands} onChange={(e) => setShowBands(e.target.checked)} className="accent-[var(--c-accent)]" />
                    Band labels
                  </label>
                </div>
              )}
            </div>
            {webgl && (
              <div className="border-t border-[var(--c-hair)] px-3 pb-2 pt-3 text-[var(--c-text)]">
                <SarcomereDiagram t={t} className="w-full" />
              </div>
            )}
          </section>

          {/* Slider + results (3D-6) */}
          <section className="coast-card p-5" aria-label="Contraction">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <label htmlFor="contraction" className="text-[16px] font-extrabold text-[var(--c-text)]">
                Relaxed ↔ Contracted
              </label>
              <button
                type="button"
                onClick={() => setPlaying((p) => !p)}
                disabled={prefersReducedMotion() && !playing}
                className="coast-btn px-4 py-1.5 text-[13px] font-bold disabled:opacity-50"
                aria-pressed={playing}
              >
                {playing ? "Pause" : "Animate"}
              </button>
            </div>
            <input
              id="contraction"
              type="range"
              min={0}
              max={100}
              step={1}
              value={Math.round(pct)}
              onChange={(e) => {
                setPlaying(false);
                setPct(Number(e.target.value));
              }}
              aria-valuetext={`${Math.round(pct)}% contracted, sarcomere ${formatUm(b.sarcomere)}`}
              className="mt-3 w-full accent-[var(--c-accent)]"
            />
            <div className="coast-muted mt-1 flex justify-between text-[12px] font-semibold">
              <span>Relaxed · 2.50 µm</span>
              <span>{Math.round(pct)}%</span>
              <span>Contracted · 2.00 µm</span>
            </div>
            <ul className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-5">
              {results.map((r) => (
                <li key={r.label} className="rounded-[14px] bg-[var(--c-bg)] px-3 py-2.5">
                  <p className="coast-muted text-[12px] font-semibold">{r.label}</p>
                  <p className="text-[16px] font-extrabold tabular-nums text-[var(--c-text)]">{r.value}</p>
                  <p className={r.tone === "same" ? "text-[12.5px] font-bold text-success" : "text-[12.5px] font-bold text-[var(--c-accent)]"}>{r.change}</p>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* Right column (desktop) — info, legend, warning */}
        <aside className="space-y-5">
          <div className="hidden md:block">
            <InfoPanel part={part} onClose={part ? () => setSelected(null) : undefined} />
          </div>

          <div role="note" className="flex gap-3 rounded-[18px] border border-danger/30 bg-danger-soft p-4 text-[15px] font-bold leading-6 text-danger">
            <InfoIcon size={20} className="mt-0.5 shrink-0" />
            <span>
              Myosin is NOT part of the thin filament.
              <span className="block text-[13.5px] font-semibold opacity-90">Thin filament = actin + tropomyosin + troponin. Myosin makes the thick filament.</span>
            </span>
          </div>

          <section className="coast-card p-5" aria-labelledby="legend-title">
            <h2 id="legend-title" className="coast-muted text-[12px] font-extrabold uppercase tracking-[0.1em]">
              Tap a part
            </h2>
            <ul className="mt-3 space-y-1">
              {PARTS.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    aria-pressed={selected === p.id}
                    onClick={() => setSelected(selected === p.id ? null : p.id)}
                    className={
                      "flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left text-[14.5px] transition-colors " +
                      (selected === p.id ? "bg-[var(--c-panel)] font-bold" : "hover:bg-[var(--c-bg)]")
                    }
                  >
                    <span aria-hidden="true" className="size-3.5 shrink-0 rounded-[4px] ring-1 ring-black/10" style={{ background: p.colour }} />
                    <span className="flex-1 font-semibold text-[var(--c-text)]">{p.name}</span>
                    <span className="coast-muted text-[12px]">{p.group}</span>
                  </button>
                </li>
              ))}
            </ul>
            <dl className="mt-4 space-y-2 border-t border-[var(--c-hair)] pt-4 text-[13.5px]">
              {Object.entries(BANDS).map(([id, band]) => (
                <div key={id}>
                  <dt className="flex items-center gap-2 font-bold text-[var(--c-text)]">
                    <span aria-hidden="true" className="h-1.5 w-5 rounded-full" style={{ background: band.colour }} />
                    {band.name}
                  </dt>
                  <dd className="coast-muted pl-7">
                    {band.points[0]} <strong className="text-[var(--c-text)]">Contraction: {band.change}</strong>
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        </aside>
      </div>

      {/* Steps + motion video (3D-9) */}
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <section className="coast-card p-5" aria-labelledby="steps-title">
          <h2 id="steps-title" className="text-[18px] font-extrabold text-[var(--c-text)]">
            Steps of contraction
          </h2>
          <ol className="mt-3 space-y-2.5">
            {CONTRACTION_STEPS.map((s, i) => (
              <li key={s.title} className="flex gap-3 text-[14.5px] leading-6">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[var(--c-panel)] text-[13px] font-extrabold text-[var(--c-text)]">{i + 1}</span>
                <span className="text-[var(--c-text)]">
                  <strong>{s.title}.</strong> <span className="coast-muted">{s.text}</span>
                </span>
              </li>
            ))}
          </ol>
          <Link to={`/lessons/${CONTRACTION_LESSON.slug}`} className="coast-accent mt-4 inline-block text-[14px] font-bold hover:underline">
            Read: {CONTRACTION_LESSON.label} →
          </Link>
        </section>

        <section className="coast-card p-5" aria-labelledby="video-title">
          <h2 id="video-title" className="text-[18px] font-extrabold text-[var(--c-text)]">
            Motion video · sliding filament
          </h2>
          <p className="coast-muted mt-1 text-[14px]">Ca²⁺ release from the SR and the cross-bridge cycle.</p>
          <div className="mt-3 aspect-video overflow-hidden rounded-[14px] bg-black">
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${MOTION_VIDEO.id}`}
              title={MOTION_VIDEO.title}
              loading="lazy"
              allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
              className="size-full"
            />
          </div>
        </section>
      </div>

      {/* Phone: details as a bottom sheet over the tab bar */}
      {part && <InfoPanel part={part} variant="sheet" onClose={() => setSelected(null)} />}
    </div>
  );
}
