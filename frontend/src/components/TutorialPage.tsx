import Link from "next/link";

export interface TutorialStepVariant {
  label: string;
  description: string;
}

export interface TutorialStep {
  title: string;
  description?: string;
  variants?: TutorialStepVariant[];
  highlight?: string;
}

interface TutorialPageProps {
  platformLabel: string;
  icon: string;
  intro: string;
  steps: TutorialStep[];
}

export function TutorialPage({ platformLabel, icon, intro, steps }: TutorialPageProps) {
  return (
    <div className="flex flex-1 justify-center px-5 pt-24 pb-32 md:px-12 md:pt-4 md:pb-16">
      <main className="flex w-full max-w-[800px] flex-col gap-6">
        <Link
          href="/analyze"
          className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-on-surface-variant transition-colors hover:text-on-surface"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Back to analysis
        </Link>

        <section className="relative overflow-hidden rounded-xl bg-primary p-6 text-on-primary shadow-soft-card md:p-10">
          <div className="relative z-10 flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white/20">
              <span
                className="material-symbols-outlined text-[28px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                {icon}
              </span>
            </div>
            <div>
              <span className="mb-1 inline-flex items-center rounded-full bg-white/20 px-3 py-1 text-[10px] font-bold uppercase tracking-wider">
                Export guide
              </span>
              <h1 className="text-[22px] font-extrabold leading-tight md:text-[32px]">
                How to export {platformLabel} chats
              </h1>
            </div>
          </div>
          <p className="relative z-10 mt-3 max-w-lg text-[14px] leading-snug opacity-90 md:text-base">
            {intro}
          </p>
          <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/10 blur-2xl md:h-64 md:w-64" />
        </section>

        <ol className="flex flex-col gap-4">
          {steps.map((step, index) => (
            <li
              key={step.title}
              className="overflow-hidden rounded-xl bg-surface-card shadow-soft-card"
            >
              <div className="flex gap-4 border-l-4 border-primary p-4 md:p-6">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-container text-xs font-bold text-on-primary-container">
                  {index + 1}
                </span>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-on-surface md:text-[15px]">
                    {step.title}
                  </h3>
                  {step.description && (
                    <p className="mt-1 text-sm leading-relaxed text-on-surface-variant">
                      {step.description}
                    </p>
                  )}
                  {step.variants && (
                    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {step.variants.map((variant) => (
                        <div key={variant.label} className="rounded-lg bg-background p-3">
                          <p className="text-[11px] font-bold uppercase tracking-wide text-primary">
                            {variant.label}
                          </p>
                          <p className="mt-1 text-sm text-on-surface">{variant.description}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {step.highlight && (
                    <div className="mt-3 flex items-start gap-2 rounded-lg bg-tertiary-container/15 p-3">
                      <span className="material-symbols-outlined text-[18px] text-tertiary">
                        check_circle
                      </span>
                      <p className="text-sm font-semibold text-tertiary">{step.highlight}</p>
                    </div>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ol>

        <div className="rounded-xl bg-secondary-container/15 p-5 text-sm leading-relaxed text-on-surface shadow-soft-card md:p-6">
          Once you have your exported{" "}
          <code className="rounded bg-background px-1.5 py-0.5 font-transcript-mono text-xs">
            .txt
          </code>{" "}
          file, head back to the analysis page and upload it or paste its contents directly.
        </div>
      </main>
    </div>
  );
}
