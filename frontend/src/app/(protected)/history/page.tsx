"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getHistory } from "@/lib/api";
import { STAGES, TranscriptDetailResponse } from "@/lib/types";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function HistoryPage() {
  const [history, setHistory] = useState<TranscriptDetailResponse[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getHistory()
      .then(setHistory)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load history."));
  }, []);

  return (
    <div className="flex flex-1 justify-center px-5 pt-24 pb-32 md:px-12 md:pt-4 md:pb-16">
      <main className="flex w-full max-w-[1200px] flex-col gap-6">
        <div>
          <h1 className="text-2xl font-extrabold text-on-surface md:text-[32px]">
            Chat history
          </h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            Every transcript you&apos;ve uploaded, with its stage analysis if one has been run.
          </p>
        </div>

        {error && (
          <p className="rounded-lg bg-error-container px-4 py-3 text-sm font-medium text-on-error-container">
            {error}
          </p>
        )}

        {history && history.length === 0 && (
          <p className="rounded-xl bg-surface-card p-6 text-sm text-on-surface-variant shadow-soft-card">
            No transcripts yet — analyze one from the home page and it&apos;ll show up here.
          </p>
        )}

        <div className="flex flex-col gap-3">
          {history?.map((entry) => {
            const analysis = entry.latest_analysis;
            const reachedCount = analysis?.stages_reached.length ?? 0;
            const isHighRisk =
              analysis?.stages_reached.includes("isolation_secrecy") ||
              analysis?.stages_reached.includes("desensitization");

            return (
              <Link
                key={entry.id}
                href={`/history/${entry.id}`}
                className="flex items-center justify-between gap-4 rounded-xl bg-surface-card p-4 shadow-soft-card transition-transform hover:-translate-y-0.5 md:p-6"
              >
                <div className="min-w-0">
                  <p className="text-sm font-bold text-on-surface">
                    {formatDate(entry.created_at)}
                  </p>
                  <p className="mt-1 truncate text-sm text-on-surface-variant">
                    {entry.messages.length} message{entry.messages.length === 1 ? "" : "s"}
                    {analysis ? ` · ${analysis.summary}` : ""}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {analysis ? (
                    <span
                      className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                        isHighRisk
                          ? "bg-error text-on-error"
                          : "bg-tertiary text-on-tertiary"
                      }`}
                    >
                      Stage {reachedCount} of {STAGES.length}
                    </span>
                  ) : (
                    <span className="rounded-full bg-surface-container px-3 py-1.5 text-xs font-bold text-on-surface-variant">
                      Not analyzed
                    </span>
                  )}
                  <span className="material-symbols-outlined text-on-surface-variant">
                    chevron_right
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}
