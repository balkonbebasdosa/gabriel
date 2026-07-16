"use client";

import { useMemo, useRef, useState } from "react";
import {
  Platform,
  PLATFORM_FILE_ACCEPT,
  PLATFORM_LABELS,
  PLATFORM_PLACEHOLDERS,
  PLATFORMS,
  parseTranscriptFile,
  parseTranscriptText,
} from "@/lib/parse-transcript";
import { TranscriptMessage } from "@/lib/types";

interface TranscriptUploadFormProps {
  onSubmit: (messages: TranscriptMessage[], poiSpeaker?: string) => void;
  isSubmitting: boolean;
}

export function TranscriptUploadForm({
  onSubmit,
  isSubmitting,
}: TranscriptUploadFormProps) {
  const [platform, setPlatform] = useState<Platform>("generic");
  const [raw, setRaw] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileMessages, setFileMessages] = useState<TranscriptMessage[]>([]);
  const [poiSpeaker, setPoiSpeaker] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // A file upload, when present, takes precedence over the pasted text —
  // this is what real exports (Discord/Telegram JSON, WhatsApp/LINE .txt)
  // actually come from.
  const textMessages = useMemo(() => {
    if (selectedFile) return [];
    try {
      return parseTranscriptText(raw, platform);
    } catch {
      return [];
    }
  }, [raw, platform, selectedFile]);

  const messages = selectedFile ? fileMessages : textMessages;
  const speakers = useMemo(
    () => Array.from(new Set(messages.map((m) => m.speaker))),
    [messages]
  );

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
    setPoiSpeaker("");

    if (!file) {
      setFileMessages([]);
      return;
    }

    try {
      const parsed = await parseTranscriptFile(file, platform);
      setFileMessages(parsed);
      setError(
        parsed.length === 0 ? `Couldn't find any messages in "${file.name}".` : null
      );
    } catch {
      setFileMessages([]);
      setError(
        `Couldn't parse "${file.name}" as a ${PLATFORM_LABELS[platform]} export.`
      );
    }
  }

  function clearFile() {
    setSelectedFile(null);
    setFileMessages([]);
    setPoiSpeaker("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (messages.length === 0) {
      setError(
        selectedFile
          ? `Couldn't find any messages in "${selectedFile.name}".`
          : `Couldn't find any messages in that text for the ${PLATFORM_LABELS[platform]} format.`
      );
      return;
    }

    setError(null);
    onSubmit(messages, poiSpeaker || undefined);
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
          onChange={(event) => {
            setPlatform(event.target.value as Platform);
            clearFile();
          }}
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
        onChange={(event) => {
          setRaw(event.target.value);
          if (selectedFile) clearFile();
        }}
        placeholder={PLATFORM_PLACEHOLDERS[platform]}
        rows={10}
        disabled={!!selectedFile}
        className="w-full rounded-md border border-black/10 bg-transparent p-3 font-mono text-sm outline-none focus:border-black/30 disabled:opacity-40 dark:border-white/15 dark:focus:border-white/30"
      />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="transcript-file" className="text-sm font-medium">
          Or upload an export file ({PLATFORM_FILE_ACCEPT[platform]})
        </label>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            id="transcript-file"
            type="file"
            accept={PLATFORM_FILE_ACCEPT[platform]}
            onChange={handleFileChange}
            className="text-sm file:mr-3 file:rounded-md file:border-0 file:bg-black/5 file:px-3 file:py-1.5 file:text-sm file:font-medium dark:file:bg-white/10"
          />
          {selectedFile && (
            <button
              type="button"
              onClick={clearFile}
              className="text-xs text-black/50 underline dark:text-white/50"
            >
              clear
            </button>
          )}
        </div>
      </div>

      {speakers.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="poi" className="text-sm font-medium">
            Who is the person being protected? (optional)
          </label>
          <select
            id="poi"
            value={poiSpeaker}
            onChange={(event) => setPoiSpeaker(event.target.value)}
            className="w-fit rounded-md border border-black/10 bg-transparent px-3 py-2 text-sm outline-none focus:border-black/30 dark:border-white/15 dark:focus:border-white/30"
          >
            <option value="">Not specified</option>
            {speakers.map((speaker) => (
              <option key={speaker} value={speaker}>
                {speaker}
              </option>
            ))}
          </select>
        </div>
      )}

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
