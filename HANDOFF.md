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

**interface impact:**
- All backend JSON uses `snake_case` field names globally (`spring.jackson.property-naming-strategy: SNAKE_CASE`), matching `docs/api-contract.md` exactly (`message_index`, `progression_score`, `stages_reached`, `latest_analysis`, etc.).
- **Version note:** the root README and `backend/README.md` both said Spring Boot 3.x, but `start.spring.io` now refuses anything below 4.0 (3.x aged out of its supported range as of this build). Updated both to **Spring Boot 4.1** with a short note why. Nothing in this backend depends on version-specific behavior beyond what's documented in `backend/README.md`.

**still open:**
- **Not yet run against a real build** — this machine had no JDK/Maven installed when the code was written; a JDK 21 install finished partway through this session. Java code was written carefully and cross-checked against Spring Boot 4.1's actual API surface (e.g. confirmed `spring-boot-starter-restclient` is now required separately for `RestClient.Builder` autoconfiguration — Boot 4 split it out of the webmvc starter), but **run `./mvnw test` and `./mvnw spring-boot:run` as the first step** before building on top of this.
- No auth/rate-limiting on any endpoint (stretch goal per `backend/README.md`, not in scope for this pass).
- `ddl-auto: update` (no Flyway/Liquibase) — fine for hackathon speed, not for anything beyond it.

**next agent should:**
- Run `docker compose up -d` (from `/backend`) then `./mvnw test` to confirm the build is green before adding features.
- When Gabriel's real AI service is ready, just set `AI_SERVICE_URL` + `AI_SERVICE_MOCK=false` — no backend code changes needed.
