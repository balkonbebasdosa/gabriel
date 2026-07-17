import Link from "next/link";
import { STAGE_ACCENT, STAGES, STAGE_LABELS } from "@/lib/types";

export default function HomePage() {
  return (
    <div className="flex flex-1 justify-center px-5 pt-24 pb-32 md:px-12 md:pt-4 md:pb-16">
      <main className="flex w-full max-w-[1200px] flex-col gap-6">
        {/* Hero */}
        <section className="relative overflow-hidden rounded-xl bg-primary p-6 text-on-primary shadow-soft-card md:p-10">
          <div className="relative z-10 max-w-xl">
            <span className="mb-3 inline-flex items-center rounded-full bg-white/20 px-3 py-1 text-[10px] font-bold uppercase tracking-wider md:text-xs">
              Stage-by-stage review
            </span>
            <h1 className="text-[26px] font-extrabold leading-tight md:text-[40px]">
              GABRIEL
            </h1>
            <p className="mt-2 text-[14px] leading-snug opacity-90 md:mt-3 md:text-base">
              Gabriel reads a chat transcript and scores it against the four
              documented stages of online grooming behavior — giving a
              parent or guardian a stage-by-stage timeline to review, never
              an automated verdict.
            </p>
            <Link
              href="/analyze"
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-extrabold text-primary shadow-playful-button transition-all hover:-translate-y-0.5 hover:scale-[1.02] active:scale-95"
            >
              <span
                className="material-symbols-outlined text-[18px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                analytics
              </span>
              Analyze a transcript
            </Link>
          </div>
          <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/10 blur-2xl md:h-64 md:w-64" />
        </section>

        {/* What it does */}
        <section className="rounded-xl bg-surface-card p-4 shadow-soft-card md:p-6">
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">
            The four stages
          </h2>
          <p className="mt-2 text-sm text-on-surface-variant">
            Every message in a transcript is tagged against these, in order —
            not a keyword scan, a progression read grounded in Luring
            Communication Theory.
          </p>
          <ol className="mt-4 flex flex-wrap gap-2">
            {STAGES.map((stage, index) => (
              <li
                key={stage}
                className={`rounded-full px-3 py-1.5 text-xs font-bold ${STAGE_ACCENT[stage].chip}`}
              >
                {index + 1}. {STAGE_LABELS[stage]}
              </li>
            ))}
          </ol>
        </section>

        {/* Export help */}
        <section className="rounded-xl bg-surface-card p-4 shadow-soft-card md:p-6">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">
                Not sure how to export your chat?
              </h2>
              <p className="mt-1 text-sm text-on-surface-variant">
                Step-by-step guides for exporting a plain-text file from WhatsApp or LINE.
              </p>
            </div>
            <Link
              href="/tutorial"
              className="inline-flex shrink-0 items-center gap-2 rounded-full bg-primary-container px-5 py-2.5 text-sm font-bold text-on-primary-container transition-all hover:-translate-y-0.5 active:scale-95"
            >
              <span className="material-symbols-outlined text-[18px]">help</span>
              View export guides
            </Link>
          </div>
        </section>

        <p className="text-center text-sm text-on-surface-variant">
          Already have transcripts saved?{" "}
          <Link href="/history" className="font-semibold text-primary">
            View your chat history
          </Link>
          .
        </p>
      </main>
    </div>
  );
}
