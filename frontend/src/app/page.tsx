"use client";

import { useState } from "react";
import { TranscriptUploadForm } from "@/components/TranscriptUploadForm";
import { StageTimeline } from "@/components/StageTimeline";
import { analyzeTranscript } from "@/lib/api";
import { Platform, parseTranscriptText } from "@/lib/parse-transcript";
import { AnalysisResult } from "@/lib/types";

export default function Home() {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(raw: string, platform: Platform) {
    setIsSubmitting(true);
    setError(null);
    try {
      const transcript = parseTranscriptText(raw, platform);
      const analysis = await analyzeTranscript(transcript);
      setResult(analysis);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-1 justify-center bg-zinc-50 px-6 py-16 dark:bg-black">
      <main className="flex w-full max-w-2xl flex-col gap-10">
        <header>
          <h1 className="text-2xl font-semibold">GABRIEL</h1>
          <p className="mt-1 text-black/60 dark:text-white/60">
            Paste a chat transcript to get a stage-by-stage risk timeline for
            human review — not an automated verdict.
          </p>
        </header>

        <TranscriptUploadForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        {result && <StageTimeline result={result} />}
      </main>
    </div>
  );
}
