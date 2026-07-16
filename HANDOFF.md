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
