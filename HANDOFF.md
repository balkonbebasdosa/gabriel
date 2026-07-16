# Handoff log

Append-only. Every development session adds an entry here before merging or handing off,
in this format:

```
### [branch: feat/xxx] — YYYY-MM-DD HH:MM WIB
**changed:** what was implemented
**interface impact:** does this change the API contract in docs/api-contract.md?
**still open:** what's unfinished
**next agent should:** what to pick up, and anything not to touch without re-checking
```

Newest entries go at the bottom.

---

### [branch: feat/frontend-gunta] — 2026-07-16 WIB
**changed:** Next.js scaffold (App Router, TypeScript, Tailwind v4) with a transcript upload
form (`src/components/TranscriptUploadForm.tsx`) and stage-progression timeline
(`src/components/StageTimeline.tsx`). `src/lib/api.ts` posts to
`${NEXT_PUBLIC_BACKEND_URL}/transcripts` and falls back to a labeled mock fixture
(`src/lib/mock.ts`) when that env var is unset, so the UI is demoable without the backend
running. `progression_score` is intentionally never rendered as a bare percentage — only
per-segment confidence and the stage timeline, per the non-negotiable framing in
`docs/api-contract.md`.
**interface impact:** assumes backend exposes `POST /transcripts` accepting
`{ transcript }` and returning the same shape as ai-service's `/analyze` response
(`docs/api-contract.md`). This endpoint name/shape isn't pinned anywhere except this
assumption — confirm with adit's backend branch and update `src/lib/api.ts` if it differs.
**still open:** no real backend wired up yet (expected — stub-first rule). No demo
fixtures beyond the one mock result. No responsive/projector polish pass yet (block 3).
**next agent should:** once `feat/backend-adit` exposes a real ingestion endpoint, update
`NEXT_PUBLIC_BACKEND_URL` and verify `src/lib/api.ts`'s request shape against it before
removing the mock fallback.

### [branch: feat/frontend-gunta] — 2026-07-16 WIB

**changed:**
- Synced root `docs/api-contract.md` with the finalized version from `feat/backend-adit`
(sections 1-5, frontend↔backend; section 6, backend↔ai-service, unchanged/verbatim). adit's
backend is real and self-sufficient already — `MockAnalyzeClient` hardcodes the section 6
response shape, so his branch runs standalone with no dependency on `feat/ai-gabriel` (which
is still just the scaffold, no AI service code yet).
- Updated `src/lib/api.ts`/`types.ts` to match the real backend contract, which splits upload
and analysis into two calls instead of the one this branch originally assumed: `POST
/transcripts` (bare JSON array body, not `{transcript}`) returns `{id, created_at,
message_count}` only; a separate `POST /transcripts/{id}/analyze` returns the analysis.
`analyzeTranscript(transcript)`'s external signature is unchanged, so `page.tsx` didn't need
to change — it now does the create-then-analyze roundtrip internally when
`NEXT_PUBLIC_BACKEND_URL` is set, same mock fallback as before when it isn't.
- Added a source-platform selector (`src/lib/parse-transcript.ts`,
`TranscriptUploadForm.tsx`): user picks Generic / WhatsApp / Discord / LINE before pasting,
each with its own placeholder and parser matching that platform's real export text format
(WhatsApp `DD/MM/YYYY, HH:MM - Speaker: text`, Discord `Speaker — Today at H:MM AM/PM` header
+ message lines, LINE tab-separated `HH:MM\tSpeaker\tmessage` with a date-header line).
Unmatched lines fall back to appending as a continuation of the previous message (real
exports wrap long messages). Verified in-browser: WhatsApp-format paste parses correctly and
flows through to the stage timeline.

**interface impact:** none beyond the contract sync above — `analyzeTranscript`'s public
signature is unchanged, only its internals and the request/response shapes going over the
wire.

**still open:** parsers are best-effort/regex-based, not validated against a real exported
file from each platform (only hand-written approximations of the known export formats) —
worth sanity-checking against an actual WhatsApp/Discord/LINE export before the demo. No
backend wired up yet (still stub-first).

**next agent should:** if picking up the backend connection, note the request/response shapes
changed — re-read `docs/api-contract.md` sections 1-2 rather than assuming the old
single-call shape.

### [branch: feat/frontend-gunta] — 2026-07-17 WIB

**changed:**
- `StageTimeline.tsx`'s KPAI/Kominfo note is now conditional: `isHighRisk = stages_reached`
includes `isolation_secrecy` or `desensitization` (stage-based, not a `progression_score`
cutoff — deliberately avoids the "score" framing the project's non-negotiable constraint
warns against). High-risk renders urgent/red styling; otherwise the same mild note as before.
Copy never says "predatory" or "proven malicious" — always descriptive ("this timeline shows
escalation into the isolation/secrecy or desensitization stages"), matching the project's
stage-timeline-not-a-verdict framing.
- Added real chat-export support beyond paste: `parse-transcript.ts` gained
`parseDiscordExport`/`parseTelegramExport` (JSON-based) plus a `parseTranscriptFile(file,
platform)` entry point. Discord schema was confirmed against the actual
`DiscordChatExporter.Core/Exporting/JsonMessageWriter.cs` source at git tag `2.47.3` (not
guessed) — `messages[].author.nickname/name`, `.content`, `.timestamp` (already ISO 8601),
`.type` filtered to `Default`/`Reply` to skip pins/system notifications. Telegram's schema
(`messages[].from`, `.text` as string or `{type,text}[]`, `.date`, `type: "message"` vs
`"service"`) is well-established public knowledge but **not verified against a live export**.
Added `"telegram"` as a 5th `Platform`. WhatsApp/LINE file upload reuses the existing paste
regex parsers unchanged (just reads the file as text first).
- `TranscriptUploadForm.tsx` got a file input alongside the textarea (`.txt` for
whatsapp/line/generic, `.json` for discord/telegram — accept attribute swaps with platform). A
selected file takes precedence over pasted text. Paste remains fully functional as a fallback.
- New standalone CLI: `frontend/scripts/extract-transcript.ts` (`npm run extract-transcript --
--platform discord --in export.json --out transcript.json`), added `tsx` as a devDependency.
Imports the exact same parser functions as the frontend — no duplicated logic. Verified working
against synthetic Discord, Telegram, and WhatsApp fixtures (correctly filters system
notifications/service messages, joins Telegram's multi-run `text` arrays).
- Added a POI (person of interest) selector: `TranscriptUploadForm.tsx` now derives unique
speakers from whatever's currently parsed (paste or file) and shows a "Who is the person being
protected? (optional)" dropdown. The `onSubmit` contract changed from `(raw, platform)` to
`(messages: TranscriptMessage[], poiSpeaker?: string)` — `page.tsx` and `api.ts` updated to
match; the form now does its own single parse instead of `page.tsx` re-parsing raw text (this
also fixed a bug where a file upload's raw JSON would otherwise get re-parsed as text further
up the chain).

**interface impact:**
- **POI is a build-ahead placeholder, not a confirmed contract.** `poi_speaker` is sent as an
optional JSON body on `POST /transcripts/{id}/analyze` (`analyzeTranscript`/`runAnalysis` in
`api.ts`) — chosen deliberately over changing `/transcripts`'s already-tested bare-array body.
`/analyze` currently takes no body at all, so this is purely additive and can't break adit's
existing handler; when no POI is selected, no body is sent (today's exact behavior).
**adit/gabriel still need to confirm the `poi_speaker` field name and wire the AI service to
actually consume it** — the frontend sends it, nothing reads it yet.
- No other endpoint/shape changes.

**still open:**
- Telegram JSON parser unverified against a real export file (Discord's is confirmed against
DCE source; WhatsApp/LINE paths were already validated in the prior session).
- Browser-automation file-upload testing hit an environment/tooling limitation (Chrome
extension `file_upload` tool rejected filesystem paths this session) — the file-input UI and
`accept` attribute swap were confirmed visually per-platform, and the parsing logic itself was
verified via the CLI script against real Discord/Telegram/WhatsApp fixtures, but the actual
"pick a file in the browser" click-path wasn't exercised end-to-end.
- `poi_speaker` has no consumer yet on the backend/AI side (see interface impact above).

**next agent should:** if wiring up adit's backend for real, confirm the `poi_speaker` field
name with adit/gabriel before assuming this exact name is final. If validating Telegram export
support, get a real "Export chat history" JSON file from Telegram Desktop and run it through
`npm run extract-transcript -- --platform telegram --in <file> --out transcript.json` to sanity
check before the demo.

### [branch: feat/frontend-gunta] — 2026-07-17 WIB

**changed:** fixed a field-name mismatch flagged by a teammate — `runAnalysis` in `api.ts` was
sending `poi_speaker` on `POST /transcripts/{id}/analyze`, but adit's backend (commit `6ecaa03`,
Jackson `SNAKE_CASE`) and gabriel's ai-service (commit `b41975c`, `schemas.py`) both landed on
`person_of_interest` as the finalized field name. The wrong key was being silently dropped (no
error, POI just never applied). Now sends `{ person_of_interest: poiSpeaker }`. `tsc --noEmit`
and lint both clean.

**interface impact:** none beyond the fix itself — brings this branch in line with the contract
adit/gabriel already finalized.

**still open:** adit's `/analyze` response now also returns a `conclusion` object
(`participants[]` with per-speaker `role`/`behavior_summary`, plus `person_of_interest_summary`)
that this branch doesn't parse or render yet — a new feature, not part of this fix. `types.ts`'s
`AnalysisResult` doesn't have `conclusion` on it.

**next agent should:** if adding `conclusion` rendering, check `docs/api-contract.md` section 2
on adit's branch (or after merge) for the exact shape and the `target_victim` /
`active_participant` / `bystander` / `mediator` / `unclear` role vocabulary.

### [branch: feat/frontend-gunta] — 2026-07-17 WIB

**changed:** total UI revamp based on two Stitch-generated reference designs in `refs/`
(desktop "Luminous Analytics" dashboard layout + mobile "Gabriel Analysis System" app layout).
Merged into one responsive design system rather than picking one:
- `src/app/globals.css`: Tailwind v4 `@theme` tokens for colors (blue primary, orange/green/purple
  accents, warm off-white `#fdf7f0` background), rounded-xl/lg radii, soft-card/playful-button
  shadow utilities. Dropped the old Geist fonts + `prefers-color-scheme` dark mode block — the new
  system is deliberately light/warm-toned, matching both refs' screenshots.
- `src/app/layout.tsx`: swapped Geist for Plus Jakarta Sans (UI) + Courier Prime (`font-transcript-mono`,
  used on the transcript textarea), added Material Symbols Outlined via a `<link>` tag, wired in new
  `Header`/`BottomNav` components.
- New `src/components/Header.tsx` + `src/components/BottomNav.tsx`: airy top nav (logo +
  Analysis/History/Settings) on `md:` and above, fixed top bar + fixed pill bottom nav on mobile.
  **Only "Analysis" is a real link** — History/Settings render disabled (`title="Coming soon"`),
  per explicit scope decision not to build stub pages as part of a visual revamp.
- `src/app/page.tsx`: wrapped in the new nav shell, added a bento-style hero card. Copy was
  deliberately rewritten from the refs' generic "Advanced Sentiment / 99.4% precision" marketing
  copy to match GABRIEL's existing non-negotiable "not an automated verdict" framing — no
  fabricated accuracy numbers.
- `TranscriptUploadForm.tsx` / `StageTimeline.tsx`: restyled only (state/handlers/logic byte-for-byte
  unchanged) — platform-select/paste/upload/POI cards on a 12-col responsive grid, stage-timeline
  cards color-coded by risk (green trust_building → orange risk_assessment → purple
  isolation_secrecy → red desensitization), escalation banner restyled as a colored bento card
  (mild secondary-tinted vs urgent solid-red, same copy as before).

**interface impact:** none — purely visual, no request/response shape or handler logic changed.

**still open:** same items as before (Telegram parser unverified against a real export,
`conclusion` object still unparsed). Visual verification was done via browser at both a desktop
(~1500px) and mobile (~625px) viewport with a real submit-and-render pass, but not tested on an
actual phone or against every platform's paste/upload path post-restyle.

**next agent should:** if picking up `conclusion` rendering, match the new card visual language
(`rounded-xl`, `shadow-soft-card`, `STAGE_ACCENT`-style color coding) rather than reintroducing the
old plain-border styling.
