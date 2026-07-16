"use client";

import { useState } from "react";
import { parseTranscriptText } from "@/lib/parse-transcript";

interface TranscriptUploadFormProps {
  onSubmit: (raw: string) => void;
  isSubmitting: boolean;
}

const PLACEHOLDER = `parent: hey, how was school
child: boring lol
parent: anything fun happen`;

export function TranscriptUploadForm({
  onSubmit,
  isSubmitting,
}: TranscriptUploadFormProps) {
  const [raw, setRaw] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const messages = parseTranscriptText(raw);

    if (messages.length === 0) {
      setError("Enter at least one line in the form \"speaker: message\".");
      return;
    }

    setError(null);
    onSubmit(raw);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <label htmlFor="transcript" className="text-sm font-medium">
        Paste transcript (one message per line, {'"'}speaker: message{'"'})
      </label>
      <textarea
        id="transcript"
        value={raw}
        onChange={(event) => setRaw(event.target.value)}
        placeholder={PLACEHOLDER}
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
