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
