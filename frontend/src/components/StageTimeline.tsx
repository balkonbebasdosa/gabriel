"use client";

import { useMemo, useState } from "react";
import {
  AnalysisResult,
  Participant,
  STAGES,
  STAGE_LABELS,
  Stage,
  TranscriptMessage,
} from "@/lib/types";

interface StageTimelineProps {
  result: AnalysisResult;
  transcript: TranscriptMessage[];
}

const STAGE_ACCENT: Record<
  Stage,
  { bar: string; chip: string; icon: string }
> = {
  trust_building: {
    bar: "bg-tertiary",
    chip: "bg-tertiary text-on-tertiary",
    icon: "border-tertiary",
  },
  risk_assessment: {
    bar: "bg-secondary-container",
    chip: "bg-secondary-container text-on-secondary",
    icon: "border-secondary-container",
  },
  isolation_secrecy: {
    bar: "bg-quaternary-container",
    chip: "bg-quaternary-container text-on-quaternary",
    icon: "border-quaternary-container",
  },
  desensitization: {
    bar: "bg-error",
    chip: "bg-error text-on-error",
    icon: "border-error",
  },
};

function ParticipantRow({
  participant,
  highlight,
}: {
  participant: Participant;
  highlight: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-lg p-3 ${
        highlight ? "bg-poi-bg" : "bg-progression-bg"
      }`}
    >
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
          highlight
            ? "bg-tertiary text-on-tertiary"
            : "bg-secondary-container text-on-secondary"
        }`}
      >
        {participant.speaker.slice(0, 1).toUpperCase()}
      </span>
      <div>
        <p className="text-xs font-bold text-on-surface">
          {participant.speaker} · {participant.role}
        </p>
        <p className="text-xs text-on-surface-variant">
          {participant.behavior_summary}
        </p>
      </div>
    </div>
  );
}

/**
 * Renders the four-stage progression as a timeline with per-segment
 * rationale. progression_score is never shown as a bare percentage — that
 * framing is called out as non-negotiable in docs/api-contract.md.
 */
export function StageTimeline({ result, transcript }: StageTimelineProps) {
  const reached = new Set(result.stages_reached);
  const isHighRisk =
    reached.has("isolation_secrecy") || reached.has("desensitization");
  const segmentsByStage = new Map<Stage, typeof result.segments>();
  for (const segment of result.segments) {
    const existing = segmentsByStage.get(segment.stage) ?? [];
    existing.push(segment);
    segmentsByStage.set(segment.stage, existing);
  }

  const messagesByIndex = useMemo(() => {
    const map = new Map<number, TranscriptMessage>();
    transcript.forEach((message, index) => map.set(index, message));
    return map;
  }, [transcript]);

  const [expandedIndices, setExpandedIndices] = useState<Set<number>>(
    new Set()
  );

  function toggleExpanded(index: number) {
    setExpandedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-xl bg-progression-bg p-4 shadow-soft-card md:p-6">
        <h2 className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">
          Progression
        </h2>
        <p className="mt-1 text-2xl font-extrabold text-on-surface md:text-[28px]">
          Stage {result.stages_reached.length} of {STAGES.length} reached
        </p>
        <div className="mt-3 flex gap-1">
          {STAGES.map((stage) => (
            <div
              key={stage}
              className={`h-2 flex-1 rounded-full ${
                reached.has(stage) ? STAGE_ACCENT[stage].bar : "bg-outline-variant"
              }`}
            />
          ))}
        </div>
        <p className="mt-4 text-[15px] leading-relaxed text-on-surface">
          {result.summary}
        </p>
      </div>

      <div className="rounded-xl bg-surface-card p-4 shadow-soft-card md:p-6">
        <h2 className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">
          Participants
        </h2>

        {result.conclusion.person_of_interest_summary && (
          <>
            <p className="mt-3 mb-2 text-[11px] font-bold uppercase tracking-wide text-on-surface-variant">
              Person of interest
            </p>
            <ParticipantRow
              participant={result.conclusion.person_of_interest_summary}
              highlight
            />
          </>
        )}

        <p className="mt-4 mb-2 text-[11px] font-bold uppercase tracking-wide text-on-surface-variant">
          All participants
        </p>
        <div className="flex flex-col gap-2">
          {result.conclusion.participants.map((participant) => (
            <ParticipantRow
              key={participant.speaker}
              participant={participant}
              highlight={false}
            />
          ))}
        </div>
      </div>

      <ol className="flex flex-col gap-4">
        {STAGES.map((stage, index) => {
          const isReached = reached.has(stage);
          const segments = segmentsByStage.get(stage) ?? [];
          const accent = STAGE_ACCENT[stage];

          return (
            <li
              key={stage}
              className="overflow-hidden rounded-xl bg-surface-card shadow-soft-card"
            >
              <div
                className={`flex gap-4 border-l-4 p-4 md:p-6 ${
                  isReached ? accent.icon : "border-outline-variant"
                }`}
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    isReached
                      ? `${accent.chip}`
                      : "bg-surface-container text-on-surface-variant/50"
                  }`}
                >
                  {index + 1}
                </span>

                <div className="flex-1">
                  <h3
                    className={`text-sm font-bold ${
                      isReached ? "text-on-surface" : "text-on-surface-variant/50"
                    }`}
                  >
                    {STAGE_LABELS[stage]}
                    {!isReached && (
                      <span className="ml-2 text-xs font-normal">
                        not reached
                      </span>
                    )}
                  </h3>

                  {segments.length > 0 && (
                    <ul className="mt-3 flex flex-col gap-2">
                      {segments.map((segment) => (
                        <li
                          key={segment.message_index}
                          className="rounded-lg bg-background p-3 text-sm"
                        >
                          <div className="flex items-center justify-between text-xs font-medium text-on-surface-variant">
                            <button
                              type="button"
                              onClick={() => toggleExpanded(segment.message_index)}
                              aria-expanded={expandedIndices.has(segment.message_index)}
                              className="text-left font-bold text-primary underline decoration-dotted underline-offset-2"
                            >
                              message #{segment.message_index}{" "}
                              {expandedIndices.has(segment.message_index) ? "▾" : "▸"}
                            </button>
                            <span>
                              confidence {Math.round(segment.confidence * 100)}%
                            </span>
                          </div>
                          <p className="mt-1 text-on-surface">{segment.rationale}</p>
                          {expandedIndices.has(segment.message_index) && (
                            <div
                              className={`mt-2 rounded-lg border-l-4 bg-surface-card p-2 text-xs text-on-surface ${accent.icon}`}
                            >
                              {messagesByIndex.has(segment.message_index) ? (
                                <>
                                  <span className="font-bold">
                                    {messagesByIndex.get(segment.message_index)!.speaker}:
                                  </span>{" "}
                                  {messagesByIndex.get(segment.message_index)!.message}
                                </>
                              ) : (
                                <span className="italic text-on-surface-variant">
                                  Original message unavailable.
                                </span>
                              )}
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <div
        className={`relative overflow-hidden rounded-xl p-5 shadow-soft-card md:p-6 ${
          isHighRisk
            ? "bg-error text-on-error"
            : "bg-secondary-container/15 text-on-surface"
        }`}
      >
        <p className="text-sm font-bold uppercase tracking-wide">
          This is not an automated accusation.
        </p>
        {isHighRisk ? (
          <p className="mt-2 text-sm leading-relaxed opacity-95">
            This timeline shows escalation into the isolation/secrecy or
            desensitization stages — human review is strongly recommended.
            Consider a real reporting channel:{" "}
            <span className="font-bold">KPAI</span> or{" "}
            <span className="font-bold">Kominfo Aduan Konten</span>. This tool
            does not determine intent — a person must review the
            conversation.
          </p>
        ) : (
          <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
            If this timeline raises concern, escalate to a real reporting
            channel: <span className="font-bold text-on-surface">KPAI</span>{" "}
            or{" "}
            <span className="font-bold text-on-surface">
              Kominfo Aduan Konten
            </span>{" "}
            — do not rely on this tool alone.
          </p>
        )}
      </div>
    </div>
  );
}
