# GABRIEL

Garuda Hacks 7.0 — Track 2: Safety & Security

GABRIEL reads a chat transcript between a child and another party, scores it against the four
documented stages of online grooming behavior (Luring Communication Theory), and gives a
parent/guardian a stage-by-stage risk timeline instead of a black-box verdict. It flags risk for
human review — it never issues an automated accusation.

## How it works

1. A transcript is uploaded through the frontend.
2. The backend persists it and forwards it to the AI service for analysis.
3. The AI service segments the conversation and tags each segment against the four-stage
   rubric (trust-building → risk assessment → isolation/secrecy → desensitization), returning a
   stage timeline with a rationale per segment — not a single percentage.
4. The backend stores the result; the frontend renders it as a timeline with escalation
   pointers to real reporting channels (KPAI, Kominfo Aduan Konten).

## Tech stack

- **Backend**: Spring Boot 3.x, PostgreSQL, Spring Data JPA
- **AI service**: Python, FastAPI, Anthropic API
- **Frontend**: Next.js, React, Tailwind CSS, Recharts
- **Data store**: PostgreSQL
- **DevOps**: Docker Compose, GitHub Actions (lint + build)

## Repo layout

```
/backend      Spring Boot API (transcript ingestion, persistence, orchestration)
/ai-service   FastAPI microservice (rubric scoring, PAN12 validation)
/frontend     Next.js dashboard (upload UI, stage-timeline visualization)
/devops       docker-compose.yml, CI configuration
/docs         API contract, submission notes
HANDOFF.md    Session handoff log (see below)
```

## API contract

See [`docs/api-contract.md`](docs/api-contract.md) for the `POST /analyze` request/response
schema shared between the backend and AI service.

## Development

Each service can be run independently; see `devops/docker-compose.yml` to run the full stack.

## Session handoff log

See [`HANDOFF.md`](HANDOFF.md). Every development session appends an entry there before
merging or handing off, so the next person can pick up a branch without re-reading the full
diff.
