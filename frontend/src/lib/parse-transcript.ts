import { TranscriptMessage } from "./types";

export type Platform = "generic" | "whatsapp" | "discord" | "line";

export const PLATFORMS: Platform[] = ["generic", "whatsapp", "discord", "line"];

export const PLATFORM_LABELS: Record<Platform, string> = {
  generic: "Generic (\"speaker: message\")",
  whatsapp: "WhatsApp",
  discord: "Discord",
  line: "LINE",
};

export const PLATFORM_PLACEHOLDERS: Record<Platform, string> = {
  generic: `parent: hey, how was school
child: boring lol
parent: anything fun happen`,
  whatsapp: `16/07/2026, 14:02 - Mom: hey, how was school
16/07/2026, 14:02 - Child: boring lol
16/07/2026, 14:03 - Mom: anything fun happen`,
  discord: `Mom — Today at 2:02 PM
hey, how was school
Child — Today at 2:03 PM
boring lol`,
  line: `2026.07.16
14:02\tMom\they, how was school
14:03\tChild\tboring lol`,
};

/**
 * Parses raw pasted-in transcript text into TranscriptMessage[], using the
 * export-text conventions of the given source platform. Every parser falls
 * back to treating an unmatched line as a continuation of the previous
 * message (real exports wrap long messages across lines).
 */
export function parseTranscriptText(
  raw: string,
  platform: Platform = "generic"
): TranscriptMessage[] {
  switch (platform) {
    case "whatsapp":
      return parseWhatsApp(raw);
    case "discord":
      return parseDiscord(raw);
    case "line":
      return parseLine(raw);
    default:
      return parseGeneric(raw);
  }
}

function nonBlankLines(raw: string): string[] {
  return raw.split("\n").map((line) => line.trimEnd());
}

function parseGeneric(raw: string): TranscriptMessage[] {
  const lines = nonBlankLines(raw)
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

// Matches both "16/07/2026, 14:02 - Mom: text" (Android) and
// "[16/07/2026, 14:02:03] Mom: text" (iOS) export styles.
const WHATSAPP_LINE =
  /^\[?(\d{1,2}\/\d{1,2}\/\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\s?[AaPp][Mm])?)\]?\s*-?\s*([^:]+):\s(.*)$/;

function parseWhatsApp(raw: string): TranscriptMessage[] {
  const messages: TranscriptMessage[] = [];

  for (const line of nonBlankLines(raw)) {
    if (line.trim().length === 0) continue;
    const match = line.match(WHATSAPP_LINE);

    if (match) {
      const [, date, time, speaker, message] = match;
      messages.push({
        speaker: speaker.trim(),
        message: message.trim(),
        timestamp: toIsoTimestamp(date, time) ?? syntheticTimestamp(messages.length),
      });
    } else if (messages.length > 0) {
      messages[messages.length - 1].message += `\n${line.trim()}`;
    }
  }

  return messages;
}

// Matches Discord's copy-paste header line, e.g. "Mom — Today at 2:02 PM"
// or "Mom — 07/16/2026 2:02 PM". Message lines follow until the next header.
const DISCORD_HEADER =
  /^(.+?)\s+(?:—|-)\s+((?:Today|Yesterday) at \d{1,2}:\d{2}\s?[AaPp][Mm]|\d{1,2}\/\d{1,2}\/\d{2,4}\s+\d{1,2}:\d{2}\s?[AaPp][Mm])$/;

function parseDiscord(raw: string): TranscriptMessage[] {
  const messages: TranscriptMessage[] = [];

  for (const line of nonBlankLines(raw)) {
    if (line.trim().length === 0) continue;
    const match = line.match(DISCORD_HEADER);

    if (match) {
      const [, speaker] = match;
      messages.push({
        speaker: speaker.trim(),
        message: "",
        timestamp: syntheticTimestamp(messages.length),
      });
    } else if (messages.length > 0) {
      const last = messages[messages.length - 1];
      last.message = last.message ? `${last.message}\n${line.trim()}` : line.trim();
    }
  }

  return messages.filter((message) => message.message.length > 0);
}

// Matches LINE's tab-separated export line: "14:02\tMom\ttext". A bare date
// header line (e.g. "2026.07.16") updates the running date for subsequent
// time-only lines and is otherwise skipped.
const LINE_DATE_HEADER = /^\d{4}[./]\d{1,2}[./]\d{1,2}/;
const LINE_MESSAGE = /^(\d{1,2}:\d{2})\t([^\t]+)\t(.*)$/;

function parseLine(raw: string): TranscriptMessage[] {
  const messages: TranscriptMessage[] = [];
  let currentDate = new Date().toISOString().slice(0, 10);

  for (const line of nonBlankLines(raw)) {
    if (line.trim().length === 0) continue;

    if (LINE_DATE_HEADER.test(line.trim())) {
      const normalized = line.trim().slice(0, 10).replace(/\./g, "-");
      currentDate = normalized;
      continue;
    }

    const match = line.match(LINE_MESSAGE);

    if (match) {
      const [, time, speaker, message] = match;
      messages.push({
        speaker: speaker.trim(),
        message: message.trim(),
        timestamp:
          toIsoTimestamp(currentDate, time, true) ?? syntheticTimestamp(messages.length),
      });
    } else if (messages.length > 0) {
      messages[messages.length - 1].message += `\n${line.trim()}`;
    }
  }

  return messages;
}

function syntheticTimestamp(index: number): string {
  return new Date(Date.now() + index * 40_000).toISOString();
}

/**
 * Best-effort date+time -> ISO string. `date` is either "DD/MM/YYYY" (or
 * 2-digit year) or, when `isoDate` is set, an already-normalized
 * "YYYY-MM-DD". Returns null if the result isn't a valid date, so callers
 * can fall back to a synthesized timestamp instead of shipping "Invalid
 * Date" to the backend.
 */
function toIsoTimestamp(date: string, time: string, isoDate = false): string | null {
  let year: number, month: number, day: number;

  if (isoDate) {
    [year, month, day] = date.split("-").map(Number);
  } else {
    const [d, m, y] = date.split("/").map(Number);
    day = d;
    month = m;
    year = y < 100 ? 2000 + y : y;
  }

  const timeMatch = time.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s?([AaPp][Mm])?/);
  if (!timeMatch) return null;

  let hours = Number(timeMatch[1]);
  const minutes = Number(timeMatch[2]);
  const seconds = Number(timeMatch[3] ?? 0);
  const meridiem = timeMatch[4]?.toLowerCase();

  if (meridiem === "pm" && hours < 12) hours += 12;
  if (meridiem === "am" && hours === 12) hours = 0;

  const parsed = new Date(year, month - 1, day, hours, minutes, seconds);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}
