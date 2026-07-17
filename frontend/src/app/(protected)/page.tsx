"use client";

import { useState } from "react";
import { TranscriptUploadForm } from "@/components/TranscriptUploadForm";
import { StageTimeline } from "@/components/StageTimeline";
import { analyzeTranscript } from "@/lib/api";
import { AnalysisResult, TranscriptMessage } from "@/lib/types";

export default function Home() {
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
              Paste or upload a chat transcript to get a stage-by-stage
              escalation timeline for human review — not an automated
              verdict.
            </p>
          </div>
          <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/10 blur-2xl md:h-64 md:w-64" />
        </section>

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
