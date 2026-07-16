#!/usr/bin/env -S npx tsx
// Standalone CLI: converts a real chat export file into the TranscriptMessage[]
// JSON shape expected by POST /transcripts (docs/api-contract.md). Shares the
// exact same parsers as the frontend's in-browser upload — no duplicated logic.
//
// Usage:
//   npx tsx scripts/extract-transcript.ts --platform discord --in export.json --out transcript.json
//
// Platforms: generic | whatsapp | discord | line | telegram
//   - generic/whatsapp/line expect a plain-text export (.txt)
//   - discord expects a DiscordChatExporter JSON export (--format Json)
//   - telegram expects a Telegram Desktop "Export chat history" JSON export

import { readFile, writeFile } from "node:fs/promises";
import {
  Platform,
  PLATFORMS,
  parseDiscordExport,
  parseTelegramExport,
  parseTranscriptText,
} from "../src/lib/parse-transcript";

function parseArgs(argv: string[]): { platform: Platform; in: string; out: string } {
  const args: Record<string, string> = {};
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i]?.replace(/^--/, "");
    const value = argv[i + 1];
    if (!key || value === undefined) {
      throw new Error(`Malformed argument near "${argv[i]}"`);
    }
    args[key] = value;
  }

  const { platform, in: inPath, out: outPath } = args;

  if (!platform || !PLATFORMS.includes(platform as Platform)) {
    throw new Error(
      `--platform is required and must be one of: ${PLATFORMS.join(", ")}`
    );
  }
  if (!inPath) throw new Error("--in <file> is required");
  if (!outPath) throw new Error("--out <file> is required");

  return { platform: platform as Platform, in: inPath, out: outPath };
}

async function main() {
  const { platform, in: inPath, out: outPath } = parseArgs(process.argv.slice(2));
  const raw = await readFile(inPath, "utf-8");

  const messages =
    platform === "discord"
      ? parseDiscordExport(JSON.parse(raw))
      : platform === "telegram"
        ? parseTelegramExport(JSON.parse(raw))
        : parseTranscriptText(raw, platform);

  if (messages.length === 0) {
    throw new Error(`No messages found in "${inPath}" for platform "${platform}"`);
  }

  await writeFile(outPath, JSON.stringify(messages, null, 2));
  console.log(`Wrote ${messages.length} messages to ${outPath}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
