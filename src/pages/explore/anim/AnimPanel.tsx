import type { LevelAnim } from "@/content/exploreAnims";
import { animStarts } from "@/content/exploreAnims";
import { useEffect, useRef } from "react";
import { bandsAt } from "../sarcomere/model";
import { sarcomereContraction, useTimelinePlaying, useTimelineStep, type Timeline } from "./timeline";

/**
 * Controls + captions for a level animation: play/pause, restart, one chip per step (tap = jump there) and the
 * current step's text with its lecture-sheet section. Keyboard reachable; the caption is a polite live region.
 * Steps that rest on the team document only carry an "awaiting review" badge (rule R6).
 */
export function AnimPanel({ anim, tl, reducedMotion }: { anim: LevelAnim; tl: Timeline; reducedMotion: boolean }) {
  const starts = animStarts(anim);
  const i = useTimelineStep(tl, starts);
  const playing = useTimelinePlaying(tl);
  const step = anim.steps[i];
  // with reduced motion, a chip shows the middle of its step instead of playing through it
  const jump = (k: number) => {
    const a = starts[k];
    const b = starts[k + 1] ?? 1;
    tl.seek(reducedMotion ? (a + b) / 2 : a + 0.0005);
  };

  return (
    <section className="border-t border-[var(--c-hair)] px-5 py-4" aria-label={`Animation: ${anim.title}`}>
      <div className="flex flex-wrap items-center gap-2">
        <p className="coast-muted mr-auto text-[12px] font-extrabold uppercase tracking-[0.1em]">Animation · {anim.title}</p>
        {!reducedMotion && (
          <button
            type="button"
            onClick={() => (playing ? tl.pause() : tl.play())}
            aria-pressed={playing}
            className="coast-btn px-4 py-1.5 text-[13px] font-bold"
          >
            {playing ? "Pause" : "Play"}
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            tl.seek(0);
            if (!reducedMotion) tl.play();
          }}
          className="coast-chip px-3 py-1.5 text-[13px] font-semibold text-[var(--c-text)]"
        >
          Restart
        </button>
      </div>
      <ol className="mt-3 flex flex-wrap gap-1.5">
        {anim.steps.map((s, k) => (
          <li key={s.title}>
            <button
              type="button"
              onClick={() => jump(k)}
              aria-current={k === i ? "step" : undefined}
              className={
                "rounded-full px-3 py-1 text-[12.5px] font-semibold transition-colors " +
                (k === i ? "bg-[var(--c-accent)] text-[var(--c-on)]" : "bg-[var(--c-bg)] text-[var(--c-text)] hover:bg-[var(--c-panel)]")
              }
            >
              {s.title}
              {s.pending && (
                <span aria-label="(awaiting review)" title="Awaiting lecturer review">
                  {" "}
                  *
                </span>
              )}
            </button>
          </li>
        ))}
      </ol>
      <p aria-live="polite" className="mt-3 text-[15px] leading-6 text-[var(--c-text)]">
        <strong>{step.title}.</strong> {step.text}{" "}
        {step.pending ? <PendingBadge /> : <span className="coast-muted whitespace-nowrap text-[12.5px]">Lecture sheet {step.ref}</span>}
      </p>
      {anim.readout === "sarcomere" && <SarcomereReadout tl={tl} />}
    </section>
  );
}

/** Marks a statement that comes from the team document and is not in the lecture sheet yet. */
export function PendingBadge() {
  return (
    <span
      title="From the team document — not yet confirmed against the lecture sheet"
      className="inline-block whitespace-nowrap rounded-full bg-amber-400/25 px-2 py-0.5 align-[1px] text-[11.5px] font-bold text-[var(--c-text)]"
    >
      Awaiting lecturer review
    </span>
  );
}

/** Live band lengths while the sarcomere slides (updates the text directly — no re-render per frame). */
function SarcomereReadout({ tl }: { tl: Timeline }) {
  const ref = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    const write = () => {
      const b = bandsAt(sarcomereContraction(tl.t));
      if (ref.current)
        ref.current.textContent = `Sarcomere ${b.sarcomere.toFixed(2)} µm · A band ${b.aBand.toFixed(2)} µm · I band ${b.iBand.toFixed(2)} µm · H zone ${b.hZone.toFixed(2)} µm`;
    };
    write();
    return tl.subscribe(write);
  }, [tl]);
  return <p ref={ref} className="coast-muted mt-2 font-mono text-[12.5px] tabular-nums" />;
}
