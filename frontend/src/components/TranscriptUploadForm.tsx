"use client";

import { useState } from "react";
import {
  Platform,
  PLATFORM_LABELS,
  PLATFORM_PLACEHOLDERS,
  PLATFORMS,
  parseTranscriptText,
} from "@/lib/parse-transcript";

interface TranscriptUploadFormProps {
  onSubmit: (raw: string, platform: Platform) => void;
  isSubmitting: boolean;
}

export function TranscriptUploadForm({
  onSubmit,
  isSubmitting,
}: TranscriptUploadFormProps) {
  const [platform, setPlatform] = useState<Platform>("generic");
  const [raw, setRaw] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const messages = parseTranscriptText(raw, platform);

    if (messages.length === 0) {
      setError(
        `Couldn't find any messages in that text for the ${PLATFORM_LABELS[platform]} format.`
      );
      return;
    }

    setError(null);
    onSubmit(raw, platform);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="platform" className="text-sm font-medium">
          Source platform
        </label>
        <select
          id="platform"
          value={platform}
          onChange={(event) => setPlatform(event.target.value as Platform)}
          className="w-fit rounded-md border border-black/10 bg-transparent px-3 py-2 text-sm outline-none focus:border-black/30 dark:border-white/15 dark:focus:border-white/30"
        >
          {PLATFORMS.map((option) => (
            <option key={option} value={option}>
              {PLATFORM_LABELS[option]}
            </option>
          ))}
        </select>
      </div>

      <label htmlFor="transcript" className="text-sm font-medium">
        Paste transcript exported from {PLATFORM_LABELS[platform]}
      </label>
      <textarea
        id="transcript"
        value={raw}
        onChange={(event) => setRaw(event.target.value)}
        placeholder={PLATFORM_PLACEHOLDERS[platform]}
        rows={10}
        className="w-full rounded-md border border-black/10 bg-transparent p-3 font-mono text-sm outline-none focus:border-black/30 dark:border-white/15 dark:focus:border-white/30"
      />
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={isSubmitting}
        className="self-start rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
      >
        {isSubmitting ? "Analyzing…" : "Analyze transcript"}
      </button>
    </form>
  );
}
