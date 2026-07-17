import { TranscriptMessage } from "./types";

export type Platform = "generic" | "whatsapp" | "discord" | "line" | "telegram";

export const PLATFORMS: Platform[] = [
  "generic",
  "whatsapp",
  "discord",
  "line",
  "telegram",
];

export const PLATFORM_LABELS: Record<Platform, string> = {
  generic: "Generic (\"speaker: message\")",
  whatsapp: "WhatsApp",
  discord: "Discord",
  line: "LINE",
  telegram: "Telegram",
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
  telegram: `Mom: hey, how was school
Child: boring lol
Mom: anything fun happen

(best-effort — for a real Telegram chat, upload the "Export chat history" JSON file below instead)`,
};

// File-upload accept attribute per platform: plain-text export formats vs
// DiscordChatExporter / Telegram Desktop's JSON export formats.
export const PLATFORM_FILE_ACCEPT: Record<Platform, string> = {
  generic: ".txt",
  whatsapp: ".txt",
  line: ".txt",
  discord: ".json",
  telegram: ".json",
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
    case "telegram":
      // No reliable plain-text copy-paste structure from Telegram Desktop —
      // fall back to the generic "speaker: message" heuristic. The real path
      // for Telegram is the JSON export via parseTranscriptFile.
      return parseGeneric(raw);
    default:
      return parseGeneric(raw);
  }
}

/**
 * Parses an uploaded export file. WhatsApp/LINE/Generic are plain text and
 * reuse the same line-based parsers as the paste path. Discord/Telegram
 * exports are JSON (DiscordChatExporter --format Json, and Telegram
 * Desktop's "Export chat history" JSON output respectively).
 */
export async function parseTranscriptFile(
  file: File,
  platform: Platform
): Promise<TranscriptMessage[]> {
  const text = await file.text();

  if (platform === "discord") {
    return parseDiscordExport(JSON.parse(text));
  }

  if (platform === "telegram") {
    return parseTelegramExport(JSON.parse(text));
  }

  return parseTranscriptText(text, platform);
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

// Schema confirmed against DiscordChatExporter's real JSON writer
// (DiscordChatExporter.Core/Exporting/JsonMessageWriter.cs, tag 2.47.3):
// top-level { messages: [...] }, each message has author.nickname/name,
// content, timestamp (already ISO 8601), and type ("Default"/"Reply" for
// real content; other types are system notifications like pins/joins).
interface DiscordExportMessage {
  type: string;
  timestamp: string;
  content: string;
  author?: { name?: string; nickname?: string };
}

const DISCORD_CONTENT_TYPES = new Set(["Default", "Reply"]);

export function parseDiscordExport(data: unknown): TranscriptMessage[] {
  const messages: DiscordExportMessage[] =
    (data as { messages?: DiscordExportMessage[] })?.messages ?? [];

  return messages
    .filter(
      (m) => DISCORD_CONTENT_TYPES.has(m.type) && m.content?.trim().length > 0
    )
    .map((m) => ({
      speaker: (m.author?.nickname || m.author?.name || "unknown").trim(),
      message: m.content.trim(),
      timestamp: toIsoOrNow(m.timestamp),
    }));
}

// Telegram Desktop's "Export chat history" JSON output: top-level
// { messages: [...] }, each message has type ("message" for real content,
// "service" for join/leave/pin notifications), from (speaker display name),
// date (timezone-less ISO-ish string), and text (a plain string, or an
// array mixing plain strings and { type, text } runs for formatted text).
// Schema is well-established public knowledge, not verified against a live
// export this session — worth a sanity check against a real file.
type TelegramTextRun = string | { text?: string };

interface TelegramExportMessage {
  type: string;
  date: string;
  from?: string;
  text: string | TelegramTextRun[];
}

function telegramTextToString(text: string | TelegramTextRun[]): string {
  if (typeof text === "string") return text;
  return text
    .map((part) => (typeof part === "string" ? part : part.text ?? ""))
    .join("");
}

export function parseTelegramExport(data: unknown): TranscriptMessage[] {
  const messages: TelegramExportMessage[] =
    (data as { messages?: TelegramExportMessage[] })?.messages ?? [];

  return messages
    .filter((m) => m.type === "message" && m.from)
    .map((m) => ({
      speaker: m.from!.trim(),
      message: telegramTextToString(m.text).trim(),
      timestamp: toIsoOrNow(m.date),
    }))
    .filter((m) => m.message.length > 0);
}

function toIsoOrNow(value: string): string {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
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
