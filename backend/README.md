# Gabriel backend

Spring Boot 4.1 / Java 21 / PostgreSQL REST API. Receives transcript uploads from the frontend, persists them, calls the AI service's `POST /analyze` (mocked by default), persists the result, and serves it back.

See [`/docs/api-contract.md`](../docs/api-contract.md) for the full request/response schema shared with the AI service and frontend teams.

> `progression_score` is a 0-1 cumulative rubric score, **never** a danger percentage. This service stores and returns it faithfully without relabeling or rescaling it.

## Stack

Spring Boot 4.1, Java 21, PostgreSQL, Spring Data JPA, Bean Validation. No Redis, no queues, no GraphQL.

Note: this project targets **Spring Boot 4.1**, not 3.x. As of this build, `start.spring.io` refuses to generate anything below Spring Boot 4.0 (3.x has aged out of its supported range), so the project was scaffolded against 4.1 instead. Functionally nothing in this backend depends on version-specific behavior beyond what's written here.

## Run it standalone (mock AI service, zero external dependencies besides Postgres)

1. Start Postgres:

   ```bash
   docker compose up -d
   ```

2. Run the app (defaults already match the `docker-compose.yml` credentials, so no `.env` is required for local dev):

   ```bash
   ./mvnw spring-boot:run
   ```

   On Windows: `mvnw.cmd spring-boot:run`

   The app boots with `AI_SERVICE_MOCK=true` by default, so `POST /transcripts/{id}/analyze` returns a hardcoded stub response — no AI service needs to be running.

3. Run tests (uses an in-memory H2 database, no Postgres required):

   ```bash
   ./mvnw test
   ```

## Switching to the real AI service

Set two environment variables (e.g. in `.env`, copied from `.env.example`) — no code changes needed:

```bash
AI_SERVICE_URL=https://gabriels-ai-service.example.com
AI_SERVICE_MOCK=false
```

With `AI_SERVICE_MOCK=false`, the backend calls `POST {AI_SERVICE_URL}/analyze` for real via `HttpAnalyzeClient` instead of `MockAnalyzeClient`.

## Configuration

All config is externalized via environment variables (see `.env.example`). Nothing secret is hardcoded — the Anthropic API key belongs to Gabriel's AI service, not this backend, and is never referenced here.

| Env var | Default | Purpose |
|---|---|---|
| `SPRING_DATASOURCE_URL` | `jdbc:postgresql://localhost:5432/gabriel` | Postgres connection |
| `SPRING_DATASOURCE_USERNAME` | `gabriel` | Postgres user |
| `SPRING_DATASOURCE_PASSWORD` | `gabriel` | Postgres password |
| `AI_SERVICE_URL` | `http://localhost:8000` | Base URL of the AI service |
| `AI_SERVICE_MOCK` | `true` | `true` = hardcoded mock response, `false` = real HTTP call to `AI_SERVICE_URL` |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:3000` | Comma-separated origins allowed to call this API |
| `PORT` | `8080` | HTTP port |

## Testing every endpoint with curl

Sample data below is a benign, ordinary conversation (false-positive test case) — no grooming content is used anywhere in this repo per hackathon rules.

### Health check

```bash
curl http://localhost:8080/health
```

```json
{ "status": "UP" }
```

### 1. Upload a transcript — `POST /transcripts`

Body is a bare JSON array (not wrapped in an object):

```bash
curl -s -X POST http://localhost:8080/transcripts \
  -H "Content-Type: application/json" \
  -d '[
    { "speaker": "A", "message": "hey, how was school", "timestamp": "2026-07-16T14:02:00Z" },
    { "speaker": "B", "message": "boring lol", "timestamp": "2026-07-16T14:02:40Z" },
    { "speaker": "A", "message": "same, math test was rough. you still up for the group project sat?", "timestamp": "2026-07-16T14:03:10Z" },
    { "speaker": "B", "message": "yeah for sure, my mom said she can drop me off at the library", "timestamp": "2026-07-16T14:03:40Z" }
  ]'
```

```json
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "created_at": "2026-07-16T14:05:00Z",
  "message_count": 4
}
```

Save the `id` for the next steps:

```bash
TRANSCRIPT_ID=3fa85f64-5717-4562-b3fc-2c963f66afa6
```

A second benign sample (different speakers, still ordinary conversation):

```bash
curl -s -X POST http://localhost:8080/transcripts \
  -H "Content-Type: application/json" \
  -d '[
    { "speaker": "coach", "message": "good practice today, see everyone friday", "timestamp": "2026-07-16T18:00:00Z" },
    { "speaker": "player12", "message": "thanks coach! could you resend the tournament schedule to my parents email", "timestamp": "2026-07-16T18:01:15Z" },
    { "speaker": "coach", "message": "sure thing, sending it to the team group chat now", "timestamp": "2026-07-16T18:02:00Z" }
  ]'
```

### 2. Run analysis — `POST /transcripts/{id}/analyze`

```bash
curl -s -X POST http://localhost:8080/transcripts/$TRANSCRIPT_ID/analyze
```

```json
{
  "id": "...",
  "transcript_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "created_at": "...",
  "segments": [
    { "message_index": 0, "stage": "trust_building", "confidence": 0.5, "rationale": "mock analysis - stub response for local development, not a real grooming-risk assessment" },
    ...
  ],
  "progression_score": 0.18,
  "stages_reached": ["trust_building"],
  "summary": "conversation shows early rapport-building only, no escalation detected (mock response)"
}
```

### 3. Fetch a transcript + its latest analysis — `GET /transcripts/{id}`

```bash
curl -s http://localhost:8080/transcripts/$TRANSCRIPT_ID
```

### Validation error cases

Empty transcript (`400`):

```bash
curl -s -X POST http://localhost:8080/transcripts -H "Content-Type: application/json" -d '[]'
```

Malformed message, missing `speaker` (`400`):

```bash
curl -s -X POST http://localhost:8080/transcripts \
  -H "Content-Type: application/json" \
  -d '[{ "message": "hi", "timestamp": "2026-07-16T14:02:00Z" }]'
```

Unknown transcript id (`404`):

```bash
curl -s http://localhost:8080/transcripts/00000000-0000-0000-0000-000000000000
```
