import type { LevelAnim } from "@/content/exploreAnims";
import { animStarts } from "@/content/exploreAnims";
import { useTimelinePlaying, useTimelineStep, type Timeline } from "./timeline";

/**
 * Controls + captions for a level animation: play/pause, restart, one chip per step (tap = jump there) and the
 * current step's text with its lecture-sheet section. Keyboard reachable; the caption is a polite live region.
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
            </button>
          </li>
        ))}
      </ol>
      <p aria-live="polite" className="mt-3 text-[15px] leading-6 text-[var(--c-text)]">
        <strong>{step.title}.</strong> {step.text} <span className="coast-muted whitespace-nowrap text-[12.5px]">Lecture sheet {step.ref}</span>
      </p>
    </section>
  );
}
