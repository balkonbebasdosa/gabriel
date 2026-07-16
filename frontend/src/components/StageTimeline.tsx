import { AnalysisResult, STAGES, STAGE_LABELS, Stage } from "@/lib/types";

interface StageTimelineProps {
  result: AnalysisResult;
}

/**
 * Renders the four-stage progression as a timeline with per-segment
 * rationale. progression_score is never shown as a bare percentage — that
 * framing is called out as non-negotiable in docs/api-contract.md.
 */
export function StageTimeline({ result }: StageTimelineProps) {
  const reached = new Set(result.stages_reached);
  const segmentsByStage = new Map<Stage, typeof result.segments>();
  for (const segment of result.segments) {
    const existing = segmentsByStage.get(segment.stage) ?? [];
    existing.push(segment);
    segmentsByStage.set(segment.stage, existing);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-sm font-medium text-black/60 dark:text-white/60">
          Summary
        </h2>
        <p className="mt-1 text-base">{result.summary}</p>
      </div>

      <ol className="flex flex-col gap-4">
        {STAGES.map((stage, index) => {
          const isReached = reached.has(stage);
          const segments = segmentsByStage.get(stage) ?? [];

          return (
            <li key={stage} className="flex gap-4">
              <div className="flex flex-col items-center">
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                    isReached
                      ? "bg-foreground text-background"
                      : "bg-black/10 text-black/40 dark:bg-white/10 dark:text-white/40"
                  }`}
                >
                  {index + 1}
                </span>
                {index < STAGES.length - 1 && (
                  <span
                    className={`mt-1 h-full w-px flex-1 ${
                      isReached ? "bg-foreground" : "bg-black/10 dark:bg-white/10"
                    }`}
                  />
                )}
              </div>

              <div className="flex-1 pb-4">
                <h3
                  className={`text-sm font-semibold ${
                    isReached ? "" : "text-black/40 dark:text-white/40"
                  }`}
                >
                  {STAGE_LABELS[stage]}
                  {!isReached && (
                    <span className="ml-2 text-xs font-normal">not reached</span>
                  )}
                </h3>

                {segments.length > 0 && (
                  <ul className="mt-2 flex flex-col gap-2">
                    {segments.map((segment) => (
                      <li
                        key={segment.message_index}
                        className="rounded-md border border-black/10 p-2 text-sm dark:border-white/15"
                      >
                        <div className="flex items-center justify-between text-xs text-black/50 dark:text-white/50">
                          <span>message #{segment.message_index}</span>
                          <span>confidence {Math.round(segment.confidence * 100)}%</span>
                        </div>
                        <p className="mt-1">{segment.rationale}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
        <p className="font-medium">This is not an automated accusation.</p>
        <p className="mt-1 text-black/70 dark:text-white/70">
          If this timeline raises concern, escalate to a real reporting channel:{" "}
          <span className="font-medium">KPAI</span> or{" "}
          <span className="font-medium">Kominfo Aduan Konten</span> — do not rely on this
          tool alone.
        </p>
      </div>
    </div>
  );
}
