"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { StageTimeline } from "@/components/StageTimeline";
import { getHistoryDetail } from "@/lib/api";
import { TranscriptDetailResponse } from "@/lib/types";

export default function HistoryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [detail, setDetail] = useState<TranscriptDetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getHistoryDetail(id)
      .then(setDetail)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load transcript."));
  }, [id]);

  return (
    <div className="flex flex-1 justify-center px-5 pt-24 pb-32 md:px-12 md:pt-4 md:pb-16">
      <main className="flex w-full max-w-[1200px] flex-col gap-6">
        <Link
          href="/history"
          className="flex w-fit items-center gap-1 text-sm font-semibold text-primary"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Back to history
        </Link>

        {error && (
          <p className="rounded-lg bg-error-container px-4 py-3 text-sm font-medium text-on-error-container">
            {error}
          </p>
        )}

        {detail && !detail.latest_analysis && (
          <p className="rounded-xl bg-surface-card p-6 text-sm text-on-surface-variant shadow-soft-card">
            This transcript hasn&apos;t been analyzed yet.
          </p>
        )}

        {detail?.latest_analysis && (
          <StageTimeline result={detail.latest_analysis} transcript={detail.messages} />
        )}
      </main>
    </div>
  );
}
