import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { StudentPageHeader } from "@/components/student/StudentPageHeader";
import { useDocumentTitle } from "@/components/student/useDocumentTitle";
import { ArrowRightIcon, BookIcon, InfoIcon, XIcon } from "@/components/student/icons";
import { Spinner } from "@/components/ui";
import { TOPICS, levelById, topicById, type Hotspot, type LevelId, type TopicId, type ZoomLevel } from "@/content/exploreZoom";
import { ANIMS } from "@/content/exploreAnims";
import { AnimPanel } from "./anim/AnimPanel";
import { Timeline } from "./anim/timeline";
import { hasWebGL, prefersReducedMotion } from "./shared/webgl";

// three.js + R3F + the model loader live in their own chunk.
const ZoomScene = lazy(() => import("./zoom/ZoomScene"));
const FADE_MS = 260;

/**
 * /explore — zoom chains (3D-1 … 3D-4, 3D-7, 3D-10):
 *   Skeletal: Arm · Biceps → Fascicle → Muscle fiber → Myofibril → Sarcomere
 *   Cardiac:  Heart → Cardiac muscle → Sarcomere
 * The sarcomere level hands over to /explore/sarcomere to contract it.
 * Topic and level live in ?topic= & ?level= so the browser back button and shared links work.
 */
const FOOTNOTE: Record<TopicId, string> = {
  skeletal: "Whole muscle → fascicle → muscle fiber → myofibril → sarcomere. Connective tissue: epimysium → perimysium → endomysium.",
  cardiac: "Cardiac muscle: striated, short and branched cells with usually one central nucleus, joined by intercalated discs; involuntary.",
  smooth: "Smooth muscle: spindle-shaped cells with one central nucleus, no sarcomeres (not striated), no T-tubules; calmodulin senses Ca²⁺; involuntary.",
};
export default function Explore3D() {
  useDocumentTitle("3D Explore");
  const [params, setParams] = useSearchParams();
  const topic = topicById(params.get("topic"));
  const chain = topic.chain.map((id) => levelById(id)!);
  const level = chain.find((l) => l.id === params.get("level")) ?? chain[0];
  const index = chain.indexOf(level);
  const [selected, setSelected] = useState<string | null>(null);
  const [zoomTarget, setZoomTarget] = useState<string | null>(null);
  const [fade, setFade] = useState(false);
  const [webgl] = useState(hasWebGL);
  const [reduced] = useState(prefersReducedMotion);
  // one animation clock per level; it starts paused at t = 0 (the rest pose)
  const anim = ANIMS[level.id];
  const timeline = useMemo(() => (anim ? new Timeline(anim.seconds) : null), [anim]);
  useEffect(() => () => timeline?.pause(), [timeline]);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const goTo = useCallback(
    (id: LevelId, topicId: TopicId = topic.id) => {
      setFade(true);
      timers.current.push(
        window.setTimeout(
          () => {
            const next: Record<string, string> = {};
            if (topicId !== "skeletal") next.topic = topicId;
            if (id !== topicById(topicId).chain[0]) next.level = id;
            setParams(next);
            setSelected(null);
            setZoomTarget(null);
            timers.current.push(window.setTimeout(() => setFade(false), 60));
          },
          reduced ? 0 : FADE_MS,
        ),
      );
    },
    [reduced, setParams, topic.id],
  );

  const zoomInto = (h: Hotspot) => {
    if (!h.zoomTo) return;
    // no WebGL: skip the camera flight
    if (!webgl) goTo(h.zoomTo);
    else setZoomTarget(h.id);
  };
  const onZoomDone = useCallback(() => {
    const h = level.hotspots.find((x) => x.id === zoomTarget);
    if (h?.zoomTo) goTo(h.zoomTo);
  }, [level, zoomTarget, goTo]);

  const hotspot = level.hotspots.find((h) => h.id === selected) ?? null;
  const partName = selected?.startsWith("mesh:") ? selected.slice(5) : null;

  return (
    <div className="coast-explore coast-sans">
      <StudentPageHeader
        title="3D Explore"
        subtitle="Zoom from the whole muscle down to the sarcomere."
        phoneSubtitle={level.crumb}
        crumbs={[{ to: "/", label: "Home" }, { label: "3D Explore" }]}
        back="/"
      />

      {/* Topic picker (3D-1, 3D-10) — smooth muscle is not built and says so on purpose (3D-11) */}
      <div role="group" aria-label="Muscle type" className="-mx-4 mt-2 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:mt-5 md:flex-wrap md:px-0">
        {TOPICS.map((t) =>
          t.status === "open" ? (
            <button
              key={t.id}
              type="button"
              aria-pressed={t.id === topic.id}
              onClick={() => t.id !== topic.id && goTo(t.chain[0], t.id)}
              className={
                "shrink-0 px-4 py-1.5 text-[13.5px] " +
                (t.id === topic.id ? "coast-btn font-bold" : "coast-chip font-semibold text-[var(--c-text)] hover:bg-[var(--c-panel)]")
              }
            >
              {t.name}
            </button>
          ) : (
            <span key={t.id} aria-disabled="true" className="coast-chip shrink-0 cursor-not-allowed px-4 py-1.5 text-[13.5px] font-semibold opacity-70">
              {t.name} · <span className="coast-muted">{t.status}</span>
            </span>
          ),
        )}
      </div>

      {/* Level breadcrumb (3D-2) — every crumb jumps straight to its level */}
      <nav aria-label="Zoom level" className="mt-4 overflow-x-auto">
        <ol className="flex min-w-max items-center gap-1.5 text-[13.5px]">
          {chain.map((l, i) => (
            <li key={l.id} className="flex items-center gap-1.5">
              {i > 0 && (
                <span aria-hidden="true" className="coast-muted">
                  ›
                </span>
              )}
              <button
                type="button"
                onClick={() => l.id !== level.id && goTo(l.id)}
                aria-current={l.id === level.id ? "step" : undefined}
                className={
                  "rounded-full px-3 py-1 font-semibold transition-colors " +
                  (l.id === level.id ? "bg-[var(--c-accent)] text-[var(--c-on)]" : "text-[var(--c-text)] hover:bg-[var(--c-panel)]")
                }
              >
                <span className="coast-muted mr-1 text-[11.5px] font-bold" style={l.id === level.id ? { color: "inherit", opacity: 0.8 } : undefined}>
                  {i + 1}
                </span>
                {l.crumb}
              </button>
            </li>
          ))}
        </ol>
      </nav>

      <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-5">
          <section className="coast-card overflow-hidden" aria-label={`${level.title} — 3D model`}>
            <div className="border-b border-[var(--c-hair)] px-5 py-3.5">
              <p className="coast-muted text-[12px] font-extrabold uppercase tracking-[0.1em]">
                Level {index + 1} of {chain.length}
                {level.wrap && <> · wrapped by {level.wrap}</>}
              </p>
              <h2 className="text-[19px] font-extrabold leading-7 text-[var(--c-text)]">{level.title}</h2>
              <p className="coast-muted text-[14px]">{level.subtitle}</p>
            </div>
            <div className="relative h-[360px] bg-[var(--c-bg)] md:h-[480px]">
              {webgl ? (
                <Suspense
                  fallback={
                    <div className="grid h-full place-items-center text-[var(--c-muted)]">
                      <span className="flex items-center gap-2 text-sm font-semibold">
                        <Spinner /> Loading 3D…
                      </span>
                    </div>
                  }
                >
                  <ZoomScene
                    level={level}
                    selected={selected}
                    onSelect={setSelected}
                    zoomTarget={zoomTarget}
                    onZoomDone={onZoomDone}
                    reducedMotion={reduced}
                    timeline={timeline}
                  />
                </Suspense>
              ) : (
                <NoWebGL level={level} />
              )}
              {webgl && (
                <span className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-[var(--c-chip)] px-3 py-1 text-[12px] font-semibold text-[var(--c-text)] shadow-sm ring-1 ring-[var(--c-hair)] backdrop-blur-sm">
                  <span className="md:hidden">Drag · pinch · tap a number</span>
                  <span className="hidden md:inline">Drag to rotate · pinch or scroll to zoom · two fingers to pan · tap a number</span>
                </span>
              )}
              {/* fade between levels (3D-3) */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-[var(--c-bg)] transition-opacity ease-out"
                style={{
                  opacity: fade ? 1 : 0,
                  transitionDuration: `${reduced ? 0 : FADE_MS}ms`,
                }}
              />
            </div>
            {anim && timeline && webgl && <AnimPanel anim={anim} tl={timeline} reducedMotion={reduced} />}
            {level.cta && (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--c-hair)] px-5 py-3">
                <p className="coast-muted text-[14px]">See which bands get shorter when it contracts — and which don’t.</p>
                <Link to={level.cta.to} className="coast-btn inline-flex items-center gap-2 px-4 py-2 text-[14px] font-bold">
                  {level.cta.label} <ArrowRightIcon size={16} />
                </Link>
              </div>
            )}
            {level.credit && <p className="coast-muted border-t border-[var(--c-hair)] px-5 py-2 text-[11.5px]">{level.credit}</p>}
          </section>
        </div>

        <aside className="space-y-5">
          <div className="hidden md:block">
            <Details hotspot={hotspot} partName={partName} onClose={() => setSelected(null)} onZoom={zoomInto} busy={zoomTarget !== null} />
          </div>
          {level.hotspots.length > 0 && (
            <section className="coast-card p-5" aria-labelledby="hotspots-title">
              <h2 id="hotspots-title" className="coast-muted text-[12px] font-extrabold uppercase tracking-[0.1em]">
                On this level
              </h2>
              <ul className="mt-3 space-y-1">
                {level.hotspots.map((h, i) => (
                  <li key={h.id}>
                    <button
                      type="button"
                      aria-pressed={selected === h.id}
                      onClick={() => setSelected(selected === h.id ? null : h.id)}
                      className={
                        "flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left text-[14.5px] transition-colors " +
                        (selected === h.id ? "bg-[var(--c-panel)] font-bold" : "hover:bg-[var(--c-bg)]")
                      }
                    >
                      <span
                        aria-hidden="true"
                        className="grid size-6 shrink-0 place-items-center rounded-full bg-[var(--c-accent)] text-[12px] font-extrabold text-[var(--c-on)]"
                      >
                        {i + 1}
                      </span>
                      <span className="flex-1 font-semibold text-[var(--c-text)]">{h.name}</span>
                      {h.zoomTo && <span className="coast-accent text-[12px] font-bold">Zoom in</span>}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <p className="coast-muted px-1 text-[13px] leading-5">
            <InfoIcon size={15} className="mr-1 inline align-[-2px]" />
            {FOOTNOTE[topic.id]}
          </p>
        </aside>
      </div>

      {/* Phone: details as a bottom sheet */}
      {(hotspot || partName) && (
        <div className="fixed inset-x-0 bottom-0 z-40 md:hidden">
          <Details hotspot={hotspot} partName={partName} onClose={() => setSelected(null)} onZoom={zoomInto} busy={zoomTarget !== null} sheet />
        </div>
      )}
    </div>
  );
}

/** Info panel (3D-7): name, what it does, lesson link and — where the chain continues — "Zoom in". */
function Details({
  hotspot,
  partName,
  onClose,
  onZoom,
  busy,
  sheet = false,
}: {
  hotspot: Hotspot | null;
  partName: string | null;
  onClose: () => void;
  onZoom: (h: Hotspot) => void;
  busy: boolean;
  sheet?: boolean;
}) {
  const box = sheet
    ? "max-h-[55vh] overflow-y-auto rounded-t-[22px] border-t border-[var(--c-edge)] bg-surface px-5 pb-[calc(20px+env(safe-area-inset-bottom))] pt-3 shadow-[0_-12px_30px_rgba(0,0,0,0.18)]"
    : "coast-card p-5";
  if (!hotspot && !partName) {
    return (
      <div className={box}>
        <p className="coast-muted text-[12px] font-extrabold uppercase tracking-[0.1em]">Info panel</p>
        <p className="mt-2 text-[15px] leading-6 text-[var(--c-text)]">
          Tap a numbered marker — or a name in the list — to see what it is. Pick one marked “Zoom in” to go one level deeper.
        </p>
      </div>
    );
  }
  const close = (
    <button
      type="button"
      onClick={onClose}
      className="grid size-9 shrink-0 place-items-center rounded-full text-muted hover:bg-zinc-100"
      aria-label="Close details"
    >
      <XIcon size={18} />
    </button>
  );
  if (!hotspot) {
    return (
      <section aria-live="polite" className={box}>
        {sheet && <div aria-hidden="true" className="mx-auto mb-3 h-1 w-10 rounded-full bg-line" />}
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="coast-muted text-[12px] font-extrabold uppercase tracking-[0.1em]">Part of the model</p>
            <h2 className="text-[20px] font-extrabold leading-7 text-[var(--c-text)]">{partName}</h2>
            <p className="coast-muted mt-1 text-[14px]">Shown for context — follow the numbered markers for this lesson.</p>
          </div>
          {close}
        </div>
      </section>
    );
  }
  return (
    <section aria-live="polite" aria-label={`${hotspot.name} — details`} className={box}>
      {sheet && <div aria-hidden="true" className="mx-auto mb-3 h-1 w-10 rounded-full bg-line" />}
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="coast-muted text-[12px] font-extrabold uppercase tracking-[0.1em]">{hotspot.group}</p>
          <h2 className="text-[22px] font-extrabold leading-7 text-[var(--c-text)]">{hotspot.name}</h2>
        </div>
        {close}
      </div>
      <ul className="mt-3 space-y-2 text-[15px] leading-6 text-[var(--c-text)]">
        {hotspot.points.map((p) => (
          <li key={p} className="flex gap-2">
            <span aria-hidden="true" className="mt-[9px] size-1.5 shrink-0 rounded-full bg-[var(--c-accent)]" />
            <span>{p}</span>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        {hotspot.zoomTo && (
          <button
            type="button"
            disabled={busy}
            onClick={() => onZoom(hotspot)}
            className="coast-btn inline-flex items-center gap-1.5 px-4 py-2 text-[14px] font-bold disabled:opacity-60"
          >
            Zoom in: {levelById(hotspot.zoomTo)!.crumb} <ArrowRightIcon size={16} />
          </button>
        )}
        {hotspot.link && (
          <Link to={hotspot.link.to} className="coast-btn inline-flex items-center gap-1.5 px-4 py-2 text-[14px] font-bold">
            {hotspot.link.label} <ArrowRightIcon size={16} />
          </Link>
        )}
        <Link to={`/lessons/${hotspot.lesson.slug}`} className="coast-accent inline-flex items-center gap-1.5 text-[14px] font-bold hover:underline">
          <BookIcon size={16} /> Read: {hotspot.lesson.label}
        </Link>
      </div>
    </section>
  );
}

/** No WebGL: keep the chain usable as text (the list and info panel still work). */
function NoWebGL({ level }: { level: ZoomLevel }) {
  return (
    <div className="flex h-full flex-col justify-center gap-3 p-6 text-[var(--c-text)]">
      <p className="flex items-center gap-2 text-[14px] font-semibold">
        <InfoIcon size={18} /> 3D isn’t available on this device.
      </p>
      <p className="coast-muted text-[14px]">
        Use the list “On this level” to read about each part of the {level.crumb.toLowerCase()} and to zoom to the next level.
      </p>
      {level.cta && (
        <Link to={level.cta.to} className="coast-btn inline-flex w-fit items-center gap-2 px-4 py-2 text-[14px] font-bold">
          {level.cta.label} <ArrowRightIcon size={16} />
        </Link>
      )}
    </div>
  );
}
