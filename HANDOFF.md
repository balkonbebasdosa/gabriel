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
