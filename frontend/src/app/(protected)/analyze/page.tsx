"use client";

import { useState } from "react";
import { TranscriptUploadForm } from "@/components/TranscriptUploadForm";
import { StageTimeline } from "@/components/StageTimeline";
import { analyzeTranscript } from "@/lib/api";
import { AnalysisResult, TranscriptMessage } from "@/lib/types";

export default function AnalyzePage() {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [submittedTranscript, setSubmittedTranscript] = useState<
    TranscriptMessage[] | null
  >(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(transcript: TranscriptMessage[], poiSpeaker?: string) {
    setIsSubmitting(true);
    setError(null);
    try {
      const analysis = await analyzeTranscript(transcript, poiSpeaker);
      setResult(analysis);
      setSubmittedTranscript(transcript);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-1 justify-center px-5 pt-24 pb-32 md:px-12 md:pt-4 md:pb-16">
      <main className="flex w-full max-w-[1200px] flex-col gap-8">
        <div>
          <h1 className="text-2xl font-extrabold text-on-surface md:text-[32px]">
            Analyze a transcript
          </h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            Paste or upload a chat export to get a stage-by-stage escalation
            timeline for human review — not an automated verdict.
          </p>
        </div>

        <TranscriptUploadForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />

        {error && (
          <p className="rounded-lg bg-error-container px-4 py-3 text-sm font-medium text-on-error-container">
            {error}
          </p>
        )}

        {result && submittedTranscript && (
          <StageTimeline result={result} transcript={submittedTranscript} />
        )}
      </main>
    </div>
  );
}
