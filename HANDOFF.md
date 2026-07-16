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

### [branch: feat/backend-adit] — 2026-07-16 17:05 WIB

**changed:**
- Filled in `docs/api-contract.md` sections 1–5 (frontend↔backend endpoints). Section 6 (backend↔AI service) is unchanged from the existing canonical version — kept verbatim.
- Scaffolded `/backend`: Spring Boot 4.1 / Java 21 / Maven project (see version note below). Layered as Controller → Service → Repository, with JPA entities (`Transcript`, `Message`, `AnalysisResult`, `Segment`) kept separate from request/response DTOs.
- Implemented all 4 endpoints: `POST /transcripts` (validates + persists a raw transcript, rejects empty/malformed input with 400), `POST /transcripts/{id}/analyze` (calls the AI client, persists the result, 404 if unknown id), `GET /transcripts/{id}` (transcript + latest analysis, `latest_analysis: null` if none yet), `GET /health`.
- Implemented `AnalyzeClient` as a swappable interface: `MockAnalyzeClient` (default, hardcoded stub response matching the contract) and `HttpAnalyzeClient` (real call to `{AI_SERVICE_URL}/analyze`). Toggled purely by `AI_SERVICE_MOCK` env var — zero code changes to go live.
- CORS configured for the Next.js frontend via `CORS_ALLOWED_ORIGINS` (comma-separated, defaults to `http://localhost:3000`).
- `backend/docker-compose.yml` (Postgres only) + `backend/README.md` with curl examples for every endpoint, using benign sample transcripts only (per hackathon rules — no synthetic grooming content anywhere in the repo).
- `backend/.env.example` + `backend/.gitignore` covering `.env`/local config so no secrets can land in this public repo (on top of the root `.gitignore`, which already covers this repo-wide). No Anthropic key or any secret is referenced anywhere in this backend.
- Added `TranscriptFlowIntegrationTest` (`MockMvc`-based): exercises the real HTTP layer end-to-end — upload → analyze → fetch round trip, empty/malformed-transcript rejection, unknown-id 404, `/health`. Runs against the H2 `test` profile, no Postgres/Docker required.

**interface impact:**
- All backend JSON uses `snake_case` field names globally (`spring.jackson.property-naming-strategy: SNAKE_CASE`), matching `docs/api-contract.md` exactly (`message_index`, `progression_score`, `stages_reached`, `latest_analysis`, etc.).
- **Version note:** the root README and `backend/README.md` both said Spring Boot 3.x, but `start.spring.io` now refuses anything below 4.0 (3.x aged out of its supported range as of this build). Updated both to **Spring Boot 4.1** with a short note why. Nothing in this backend depends on version-specific behavior beyond what's documented in `backend/README.md`.

**still open:**
- No auth/rate-limiting on any endpoint (stretch goal per `backend/README.md`, not in scope for this pass).
- `ddl-auto: update` (no Flyway/Liquibase) — fine for hackathon speed, not for anything beyond it.

**next agent should:**
- Build is verified green: `./mvnw test` passes (6/6 — context load + full HTTP integration test) on JDK 21 / Boot 4.1. Two Boot-4-specific gotchas to know about if you write more tests or AI-service integration code: (1) `spring-boot-starter-restclient` is required separately for `RestClient.Builder` autoconfiguration (split out of the webmvc starter); (2) Boot 4.1 defaults to **Jackson 3** — the package is `tools.jackson.databind.ObjectMapper`, not `com.fasterxml.jackson.databind` — and `AutoConfigureMockMvc` moved to `org.springframework.boot.webmvc.test.autoconfigure`. Neither affects the app's own runtime code (it never imports Jackson directly), only test code that imports these classes.
- Run `docker compose up -d` (from `/backend`, needs Docker) then `./mvnw spring-boot:run` to run against real Postgres.
- When Gabriel's real AI service is ready, just set `AI_SERVICE_URL` + `AI_SERVICE_MOCK=false` — no backend code changes needed.

---

### [branch: feat/backend-adit] — 2026-07-17 01:00 WIB

**changed:** adjusted the backend for `feat/ai-gabriel`'s session-4 contract addition (`person_of_interest` request field, `conclusion` response object — both additive, see that branch's `HANDOFF.md` and its `docs/api-contract.md` note to Adit):
- New `Participant` JPA entity (`speaker`, `role`, `behavior_summary`) + `AnalysisResult.personOfInterest` (the requested focus speaker, nullable). `conclusion.person_of_interest_summary` is derived on read by matching `personOfInterest` against the persisted `participants`, not stored twice.
- `POST /transcripts/{id}/analyze` now accepts an optional body `{ "person_of_interest": "B" }`. Validated against the transcript's actual speakers — `400` if it doesn't match any (new `AnalysisService.validatePersonOfInterest`), so a typo fails loudly instead of silently returning a `null` summary.
- `AnalysisResponse` (and therefore both `POST /transcripts/{id}/analyze` and `GET /transcripts/{id}`) now includes `conclusion: { participants: [...], person_of_interest_summary }`.
- `MockAnalyzeClient` updated to return a `conclusion` too (one participant per distinct speaker in the request, role `unclear`, stub `behavior_summary`) so local/mock dev still gets the full shape.
- `docs/api-contract.md`: added the "Participant role vocabulary" table, updated sections 2/3 with the new request/response fields, and merged in ai-gabriel's exact section 6 wording for `person_of_interest`/`conclusion` (kept verbatim, not paraphrased).
- Extended `TranscriptFlowIntegrationTest`: asserts `conclusion` shape on the plain round trip, plus two new tests for `person_of_interest` (matching speaker → summary populated; non-matching → `400`).

**interface impact:** yes, additive/backward-compatible on the backend's own API too — omit `person_of_interest` and you get the old shape plus an always-present `conclusion` (with `person_of_interest_summary: null`). Existing frontend integration against the old response shape keeps working since only fields were added, none removed/renamed.

**still open:** same as previous entry (no auth, `ddl-auto: update`) — untouched by this session.

**next agent should:** build verified green (`./mvnw test` — 8/8 — and `./mvnw -B -ntp verify`, the exact CI command) before this was written. When switching `AI_SERVICE_MOCK=false` against the real `ai-service`, sanity-check its `conclusion.participants[].role` values against the vocabulary table in `docs/api-contract.md` — the backend stores `role` verbatim (same pattern as `stage`), so an unexpected value from the AI service would pass through as-is rather than erroring.

---

### [branch: feat/backend-adit] — 2026-07-17 01:15 WIB

**Note for Gunta, re: `feat/frontend-gunta`'s open question on the POI field name.**

**changed:** nothing in `/backend` — this is a confirmation entry, not a code change. Reviewed `frontend/src/lib/api.ts`/`TranscriptUploadForm.tsx` and your HANDOFF entry asking adit/gabriel to confirm the POI field name before you rely on it.

**Confirmed: the field name is `person_of_interest`, not `poi_speaker`.** Both the backend (`POST /transcripts/{id}/analyze` request body) and the real `ai-service` (`app/schemas.py`'s `AnalyzeRequest.person_of_interest`) already use this name — see `docs/api-contract.md` section 2. It's fully implemented and tested end-to-end on the backend side already, including with more than 2 participants (verified with 4 and 8 distinct speakers), so once `src/lib/api.ts`'s `runAnalysis` sends `{ "person_of_interest": poiSpeaker }` instead of `{ "poi_speaker": poiSpeaker }`, it'll work with no other changes needed.

One more thing worth knowing for when you wire up `StageTimeline.tsx` (or a new component) to show it: the analyze/GET response now also includes a `conclusion` object — `{ participants: [{ speaker, role, behavior_summary }], person_of_interest_summary }` — not yet in your `AnalysisResult` TypeScript type. `role` is one of `target_victim`, `active_participant`, `bystander`, `mediator`, `unclear` (see the new vocabulary table in `docs/api-contract.md`), same "descriptive, not an accusation" framing as `stage`.

**interface impact:** none to the backend. Flagging so `feat/frontend-gunta` can fix the field name at the source rather than the backend growing a compatibility alias for an unconfirmed guess.

**still open:** frontend still needs to rename `poi_speaker` → `person_of_interest` in `api.ts`, and add `conclusion` to `types.ts`/a UI component whenever that's prioritized.

**next agent should:** if you're picking up frontend work, this unblocks the POI selector end-to-end — no backend changes needed, just the rename plus reading `conclusion` off the response.
