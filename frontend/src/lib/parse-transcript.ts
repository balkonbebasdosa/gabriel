import { TranscriptMessage } from "./types";

/**
 * Parses lines of the form "speaker: message" into transcript messages.
 * Blank lines are skipped. Timestamps are synthesized 40s apart, oldest
 * first, since the plain-text format has no timestamp of its own.
 */
export function parseTranscriptText(raw: string): TranscriptMessage[] {
  const lines = raw
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const start = Date.now();

  return lines.map((line, index) => {
    const separatorIndex = line.indexOf(":");
    const speaker =
      separatorIndex === -1 ? "unknown" : line.slice(0, separatorIndex).trim();
    const message =
      separatorIndex === -1 ? line : line.slice(separatorIndex + 1).trim();

    return {
      speaker,
      message,
      timestamp: new Date(start + index * 40_000).toISOString(),
    };
  });
}
