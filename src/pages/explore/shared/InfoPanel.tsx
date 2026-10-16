import { Link } from "react-router";
import { BookIcon, XIcon } from "@/components/student/icons";
import type { PartInfo } from "@/content/explore";

/**
 * What the student tapped (3D-7): name, what it does, and a link to the lesson.
 * Desktop = card in the right column · phone = bottom sheet (variant="sheet").
 */
export function InfoPanel({ part, onClose, variant = "card" }: { part: PartInfo | null; onClose?: () => void; variant?: "card" | "sheet" }) {
  if (!part) {
    return (
      <div className="coast-card p-5">
        <p className="coast-muted text-[12px] font-extrabold uppercase tracking-[0.1em]">Info panel</p>
        <p className="mt-2 text-[15px] leading-6 text-[var(--c-text)]">
          Tap any part of the model — or a name in the legend — to see what it is and what it does.
        </p>
      </div>
    );
  }

  return (
    <section
      aria-live="polite"
      aria-label={`${part.name} — details`}
      className={
        variant === "sheet"
          ? "fixed inset-x-0 bottom-0 z-40 max-h-[70vh] overflow-y-auto rounded-t-[22px] border-t border-[var(--c-edge)] bg-surface px-5 pb-[calc(20px+env(safe-area-inset-bottom))] pt-3 shadow-[0_-12px_30px_rgba(0,0,0,0.18)] md:hidden"
          : "coast-card p-5"
      }
    >
      {variant === "sheet" && <div aria-hidden="true" className="mx-auto mb-3 h-1 w-10 rounded-full bg-line" />}
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className="mt-1 size-4 shrink-0 rounded-[5px] ring-1 ring-black/10" style={{ background: part.colour }} />
        <div className="min-w-0 flex-1">
          <p className="coast-muted text-[12px] font-extrabold uppercase tracking-[0.1em]">{part.group}</p>
          <h2 className="text-[22px] font-extrabold leading-7 text-[var(--c-text)]">{part.name}</h2>
          <p className="coast-muted mt-0.5 text-[13px]">In the model: {part.looks}</p>
        </div>
        {onClose && (
          <button type="button" onClick={onClose} className="grid size-9 shrink-0 place-items-center rounded-full text-muted hover:bg-zinc-100" aria-label="Close details">
            <XIcon size={18} />
          </button>
        )}
      </div>
      <ul className="mt-3 space-y-2 text-[15px] leading-6 text-[var(--c-text)]">
        {part.points.map((p) => (
          <li key={p} className="flex gap-2">
            <span aria-hidden="true" className="mt-[9px] size-1.5 shrink-0 rounded-full bg-[var(--c-accent)]" />
            <span>{p}</span>
          </li>
        ))}
      </ul>
      <Link to={`/lessons/${part.lesson.slug}`} className="coast-accent mt-4 inline-flex items-center gap-1.5 text-[14px] font-bold hover:underline">
        <BookIcon size={16} /> Read: {part.lesson.label}
      </Link>
    </section>
  );
}
