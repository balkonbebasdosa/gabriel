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
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
        {/* Main input column */}
        <div className="flex flex-col gap-6 md:col-span-8">
          <div className="rounded-xl bg-progression-bg p-4 shadow-soft-card md:p-6">
            <label
              htmlFor="platform"
              className="mb-2 ml-1 block text-[11px] font-bold uppercase tracking-widest text-on-surface-variant"
            >
              Source platform
            </label>
            <div className="relative">
              <select
                id="platform"
                value={platform}
                onChange={(event) => {
                  setPlatform(event.target.value as Platform);
                  clearFile();
                }}
                className="w-full appearance-none rounded-lg bg-background px-4 py-3 text-[15px] font-semibold text-on-surface outline-none transition-all focus:ring-2 focus:ring-primary/20"
              >
                {PLATFORMS.map((option) => (
                  <option key={option} value={option}>
                    {PLATFORM_LABELS[option]}
                  </option>
                ))}
              </select>
              <span className="material-symbols-outlined pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-primary">
                expand_more
              </span>
            </div>
          </div>

          <div className="rounded-xl bg-surface-card p-4 shadow-soft-card md:p-6">
            <div className="mb-3 flex items-center justify-between px-1">
              <label
                htmlFor="transcript"
                className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant"
              >
                Paste transcript ({PLATFORM_LABELS[platform]})
              </label>
              <button
                type="button"
                onClick={() =>
                  navigator.clipboard
                    ?.readText()
                    .then((text) => {
                      setRaw(text);
                      if (selectedFile) clearFile();
                    })
                    .catch(() => {})
                }
                className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-primary transition-opacity hover:opacity-70"
              >
                <span className="material-symbols-outlined text-[16px]">
                  content_paste
                </span>
                Paste
              </button>
            </div>
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
              className="w-full resize-none rounded-lg bg-background p-4 font-transcript-mono text-sm text-on-surface outline-none transition-all placeholder:opacity-40 focus:ring-2 focus:ring-primary/20 disabled:opacity-40"
            />
          </div>

          {speakers.length > 0 && (
            <div className="rounded-xl bg-poi-bg p-4 shadow-soft-card md:p-6">
              <label
                htmlFor="poi"
                className="mb-2 ml-1 block text-[11px] font-bold uppercase tracking-widest text-on-surface-variant"
              >
                Who is the person being protected? (optional)
              </label>
              <div className="relative">
                <select
                  id="poi"
                  value={poiSpeaker}
                  onChange={(event) => setPoiSpeaker(event.target.value)}
                  className="w-full appearance-none rounded-lg bg-background px-4 py-3 text-[15px] font-semibold text-on-surface outline-none transition-all focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">Not specified</option>
                  {speakers.map((speaker) => (
                    <option key={speaker} value={speaker}>
                      {speaker}
                    </option>
                  ))}
                </select>
                <span className="material-symbols-outlined pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-primary">
                  expand_more
                </span>
              </div>
            </div>
          )}
        </div>

        {/* File upload column */}
        <aside className="md:col-span-4">
          <div className="flex h-full flex-col rounded-xl bg-surface-card p-4 shadow-soft-card md:p-6">
            <h3 className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">
              Or upload an export file
            </h3>
            <label
              htmlFor="transcript-file"
              className="group flex flex-1 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-primary/20 p-6 text-center transition-all hover:border-primary/40 hover:bg-primary/5"
            >
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-secondary-container transition-transform group-hover:scale-105">
                <span className="material-symbols-outlined text-[28px] text-on-secondary">
                  cloud_upload
                </span>
              </div>
              <span className="text-sm font-bold text-primary">
                {selectedFile ? selectedFile.name : "Drop file here"}
              </span>
              <span className="mt-1 text-xs text-on-surface-variant/70">
                {selectedFile
                  ? "click to replace"
                  : `or browse (${PLATFORM_FILE_ACCEPT[platform]})`}
              </span>
              <input
                ref={fileInputRef}
                id="transcript-file"
                type="file"
                accept={PLATFORM_FILE_ACCEPT[platform]}
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
            {selectedFile && (
              <button
                type="button"
                onClick={clearFile}
                className="mt-3 text-xs font-semibold text-on-surface-variant underline"
              >
                clear file
              </button>
            )}
          </div>
        </aside>
      </div>

      {error && (
        <p className="rounded-lg bg-error-container px-4 py-3 text-sm font-medium text-on-error-container">
          {error}
        </p>
      )}

      <div className="flex justify-center">
        <button
          type="submit"
          disabled={isSubmitting}
          className="group flex items-center gap-3 rounded-full bg-primary px-8 py-4 text-[15px] font-extrabold text-on-primary shadow-playful-button transition-all hover:-translate-y-0.5 hover:scale-[1.02] active:scale-95 disabled:opacity-50"
        >
          <span
            className="material-symbols-outlined text-[20px]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            analytics
          </span>
          {isSubmitting ? "Analyzing…" : "Analyze transcript"}
        </button>
      </div>
    </form>
  );
}
