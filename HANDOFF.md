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

### [branch: feat/ai-gabriel] — 2026-07-16 (session end)

**changed:** scaffolded the full `ai-service` microservice per section 6/7 of the handoff:
- `app/`: FastAPI app (`main.py`), Pydantic schemas matching the section 6 contract exactly
  (`schemas.py`), the 4-stage LCT rubric system prompt (`rubric.py`), Gemini structured-output
  client (`llm_client.py`), and the orchestration layer (`scorer.py`) — LLM only tags per-message
  stage/confidence/rationale, `progression_score`/`stages_reached` are computed deterministically
  in Python from those tags (not LLM-decided), for testability and a stronger "not a black box"
  claim.
- `eval/`: PAN12 streaming XML parser (`pan12_parser.py`, handles the 393MB corpus via
  `iterparse` — never loads it fully into memory), ground-truth loaders (`ground_truth.py`),
  single-pass positive-detection + reservoir-sampled negatives (`sampler.py`), and the
  precision/recall/F1 harness (`run_eval.py`, supports `--quick` for a fast sanity check before
  the real run). Scoping decisions (conversation-level proxy for PAN12's author-level ground
  truth, fixed prediction threshold, one-shot eval discipline) are documented in `eval/README.md`.
- `eval/benign_transcripts/`: 6 hand-written ordinary conversations for the required
  false-positive check (not derived from PAN12).
- `requirements.txt`, `Dockerfile` (ai-service only — does not touch `docker-compose.yml`,
  that stays Gunta's file), `ai-service/README.md`.
- Root `.gitignore` created (was completely missing) — covers `.env`, PAN12 raw data under
  `ai-service/test/` and `ai-service/train/`, and standard python/node/java artifacts.

**interface impact:** none — `/analyze` request/response shape matches section 6 exactly.
Verified end-to-end locally: FastAPI starts, `/health` responds, `/analyze` correctly validates
the request schema and reaches the real Gemini API (confirmed via a live 400 INVALID_ARGUMENT
response from Google when tested with a placeholder key — proves the whole pipeline wiring is
correct, only a real key was missing).

**still open:**
- `ai-service/.env` needs a real `GEMINI_API_KEY` (get one at https://aistudio.google.com/apikey)
  before `/analyze` will actually score anything — currently blank.
- PAN12 eval has not been run yet (`python -m eval.run_eval --quick` first, then the full run) —
  no precision/recall number exists yet for the slide.
- `GEMINI_MODEL` in `.env.example`/`.env` defaults to `gemini-3-flash` — verify against
  https://ai.google.dev/gemini-api/docs/models before the real eval run, model names move fast.
- Team-level Block 0 items are still outstanding (not this branch's scope, but blocking):
  no blank initial commit on `main` yet, and `/docs/api-contract.md` doesn't exist — section 6
  has only ever lived in the handoff doc and this repo's `app/schemas.py`, not in a docs file
  Adit/Gunta would look at.
- `docker-compose.yml` / `/devops` doesn't exist at all yet (Gunta's scope) — ai-service's
  Dockerfile is ready to be referenced from it whenever that's built.

**next agent should:** fill in the real Gemini key, run `--quick` eval first to sanity-check
before the full sampled run, then run the benign fixtures through `/analyze` to confirm no false
escalation past `risk_assessment`. Do not tune the `POSITIVE_STAGES` threshold in `run_eval.py`
by re-running against the test corpus repeatedly — see `eval/README.md` for why.

---

### [branch: feat/ai-gabriel] — 2026-07-16 (session 2 end)

**changed:** Gemini free tier turned out unworkable (20 requests/day cap, other models at 0
quota on this account) — switched the whole `app/llm_client.py` integration to **Groq**
(`groq` SDK, OpenAI-compatible strict JSON-schema structured output). `app/schemas.py`'s
`Segment` now has `model_config = ConfigDict(extra="forbid")` so its generated JSON schema
is strict-mode compliant (`additionalProperties: false`). `requirements.txt`/`.env`/`.env.example`
updated accordingly (`GROQ_API_KEY`, `GROQ_MODEL`).

Also fixed a real bug found during eval testing: the Groq call had no `max_completion_tokens`,
so longer transcripts got their JSON response truncated mid-generation — this looked identical
to a model refusal ("generated JSON does not match schema") until inspected closely. Now sized
dynamically per transcript length (`app/llm_client.py`).

Rebuilt the PAN12 eval methodology (see `eval/README.md` for full detail, this is the short
version):
- **Ground truth switched from `problem1` (author-level) to `problem2` (conversation-level).**
  A qualitative check found several `problem1`-only "positives" were 1-3 message mundane
  check-ins from a flagged author's *unrelated* conversations — not evidence of grooming in
  that specific conversation. `problem2` (which conversations actually have flagged suspicious
  lines) is the correct ground truth for a conversation-scoring tool.
- Added retry/backoff for transient 429/413 errors (`app/llm_client.py`), and the eval report
  now separates true content-refusals (400, empty `failed_generation`) from transient errors.
- `run_eval.py` now reports **two recall numbers**: `recall_excluding_errors` (textbook, ignores
  refused positives) and `recall_treating_errors_as_misses` (folds refusals in as misses).
  **Report the second one** — a parent doesn't care why a dangerous conversation wasn't flagged,
  only that it wasn't. Quoting only the first would be a rosier number than the tool delivers.

**quota reality check (important for whoever runs the full eval):** `openai/gpt-oss-120b` has
a 200,000 tokens/day cap, and today's testing (multiple quick-eval runs, model comparison tests,
debug scripts) burned nearly all of it — hit a hard 429 TPD wall mid-run. `openai/gpt-oss-20b` has
a separate, barely-touched quota. **Current default is `gpt-oss-20b`** specifically to leave a
working budget for real usage (Adit's integration, live demo) — 120b was more reliable on
edge-case/graphic content but isn't usable again today without waiting for reset.

**interface impact:** none — schema unchanged. Verified end-to-end twice: once via direct Python
call, once via a live HTTP `POST /analyze` against a running `uvicorn` instance. Both returned a
correctly-shaped response with `gpt-oss-20b` and the token-limit fix in place.

**still open:**
- **The full PAN12 eval (negative-sample-size 300) was never run** — quota ran out during
  iteration on methodology fixes. Only small `--quick` (20-conversation) samples were run, and
  those varied run-to-run (small-n noise + model temperature). No precision/recall number exists
  yet for the slide. Whoever runs it: use `gpt-oss-20b` unless 120b's quota has reset, don't run
  more than one full pass (see one-shot eval discipline in `eval/README.md`), and expect it to
  take a while given Groq's per-minute limits.
- `eval/benign_transcripts/` false-positive check was never run against the *current* prompt
  (rubric.py changed since the last time these were tested) — worth a quick pass before quoting
  a false-positive rate anywhere.
- Team-level Block 0 items still outstanding: no blank initial commit on `main`, no
  `/docs/api-contract.md`. Not this branch's scope but blocks Adit/Gunta's integration.
- `docker-compose.yml`/`/devops` still doesn't exist (Gunta's scope).
- `rubric.py` now instructs categorical (non-quoting) rationale — a deliberate product decision
  (a parent-facing report shouldn't show graphic quotes verbatim), independent of whether it
  helps or hurts the refusal rate, which testing was inconclusive on.

**next agent should:** if continuing eval work, check current time/quota before starting — this
session lost real time to quota exhaustion mid-run. If instead prioritizing integration with
Adit's backend, the service is ready now: `cd ai-service && pip install -r requirements.txt`,
fill in a real `GROQ_API_KEY` in `.env` (get one free, no card, at console.groq.com), then
`uvicorn app.main:app --reload`. `/analyze` matches section 6 exactly.

---

### [branch: feat/ai-gabriel] — 2026-07-16 (session 3 end)

**correction to the two entries above:** both previous entries claimed "Block 0 is still
outstanding" and "`/docs/api-contract.md` doesn't exist" — **this was wrong.** Those sessions
worked on a local branch that had zero commits and had never fetched `origin`. The team's real
`origin/main` / `origin/feat/ai-gabriel` already had the blank initial commit, the scaffold
commit, `docs/api-contract.md`, `devops/docker-compose.yml`, and per-folder READMEs all along —
Block 0 was done correctly and on time. Not correcting the old entries in place (append-only
convention); flagging it here instead.

**changed, and this is the important one:** fetching the real `docs/api-contract.md` surfaced
a genuine contract mismatch — **the agreed stage name is `isolation_secrecy`**, not
`exclusivity_secrecy`, which is what every prior session had used throughout `app/schemas.py`
(the `Stage` enum), `app/rubric.py` (the system prompt), and `eval/run_eval.py`
(`POSITIVE_STAGES`). This came from the original handoff doc using "isolation/secrecy" in one
section and "exclusivity/secrecy" in another — earlier sessions picked one without checking
whether the team had already settled it elsewhere. **Fixed everywhere** and re-verified live
(one minimal API call) — response now correctly returns `"stage": "isolation_secrecy"`. This
would have been a silent integration break with Adit's backend if it had shipped as-is.

Also reconciled with the real repo history:
- Merged local `.gitignore` (had PAN12 dataset-exclusion rules the team's didn't) with the
  team's version (had `.claude/`, `.env.local` patterns local didn't) — combined, nothing lost.
- Fixed `devops/docker-compose.yml` and `devops/.env.example`: both still referenced
  `ANTHROPIC_API_KEY` from before the Groq switch — updated to `GROQ_API_KEY`/`GROQ_MODEL`.
  This was a real blocker: the ai-service container would have started with no valid key.
- Fixed root `README.md`'s tech-stack line (still said Anthropic) and `ai-service/README.md`'s
  two stale references (said "exclusivity/secrecy" and told you to fill in `GEMINI_API_KEY`).
- Local branch history was reset onto `origin/feat/ai-gabriel` (mixed reset, working tree
  untouched) so this pushes as a normal fast-forward, not a force-push.

**interface impact:** the `isolation_secrecy` fix *is* an interface-relevant change — anyone
who integrated against the wrong stage name from an earlier session's local testing needs to
switch to `isolation_secrecy`. The contract in `docs/api-contract.md` itself did not change;
this session's code just came into compliance with it.

**still open (unchanged from session 2, still true):**
- Full PAN12 eval still not run (quota + methodology churn). No precision/recall number yet.
- `eval/benign_transcripts/` not re-verified against the current prompt.
- `openai/gpt-oss-120b`'s daily quota was still exhausted as of this session; `gpt-oss-20b`
  remains the working default.

**next agent should:** pull this branch before building anything else on `feat/backend-adit` —
the stage-name fix matters for integration. Service is ready to run as described in the previous
entry. If picking up PAN12 eval, check quota reset status first.

---

### [branch: feat/ai-gabriel] — 2026-07-17 (session 4 end)

**changed:** added a second output layer to `/analyze`, additive to the existing contract:
- Request gains an optional `person_of_interest` field (a `speaker` value from the transcript —
  typically the child/minor a parent is focused on).
- Response gains a `conclusion` object: `participants` (one profile per distinct speaker, each
  with a `role` — `target_victim` | `active_participant` | `bystander` | `mediator` | `unclear`
  — and a `behavior_summary` covering their conduct across the whole conversation) plus
  `person_of_interest_summary` (the matching `participants` entry, or `null` if not requested/
  not found).
- Implementation: one model call still, unchanged in count — `app/rubric.py`'s system prompt
  now asks for the `participants` array alongside the existing per-message `segments`, since role
  classification needs the same holistic view the model already has. `app/llm_client.py`'s
  `max_tokens` formula bumped to account for it. `app/scorer.py` builds `Conclusion` by looking
  up `person_of_interest` in the LLM's own `participants` output — no separate call or prompt
  needed for that part.
- `unclear` role added beyond the four the request specified, for the same reason low-confidence
  `trust_building` already exists — verified live: a 2-message neutral transcript correctly got
  `unclear` for both speakers instead of a forced guess.

**interface impact:** yes, but additive/backward-compatible — existing callers that don't send
`person_of_interest` get `conclusion.person_of_interest_summary: null` and everything else
unchanged. `docs/api-contract.md` updated with a note flagging this for Adit specifically, since
that file is jointly owned — worth a direct ping, not just relying on him reading the diff.

**verified live (3 calls, minimal quota use):** full-escalation demo transcript with
`person_of_interest` set → correct `active_participant`/`target_victim` split and matching
summary; a benign 2-message transcript with `person_of_interest` omitted → `null` summary,
`unclear` roles, nothing broke; `eval/run_eval.py` still imports and its existing `analyze(...)`
call site is unaffected (new param is optional).

**still open:** same PAN12/quota items as session 3 — untouched by this session's work, since
this change doesn't involve the rubric threshold or eval methodology at all.

**next agent should:** if extending `conclusion` further, keep it to one LLM call — don't add a
second model round-trip for something the model can already reason about holistically in the
first one. Sync with Adit before the frontend/backend start depending on `conclusion` fields.

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

### [branch: feat/devops-gunta] — 2026-07-16 WIB
**changed:** added `.github/workflows/ci.yml` — three jobs (backend/ai-service/frontend),
each skips gracefully if that service's manifest file doesn't exist yet, runs on PRs to `main`
and pushes to `main`.
**interface impact:** none.
**still open:** branch protection on `main` (require this workflow as a status check, PR-only
merges) is not yet configured in GitHub settings — needs repo admin access via the web UI
or an authenticated `gh` CLI.
**next agent should:** once `backend/pom.xml`, `ai-service/requirements.txt`, or
`frontend/package.json` exist, verify the corresponding CI job actually runs (not just
skips) on the next PR.

### [branch: main] — 2026-07-17 WIB

**changed:** added `.github/workflows/ci.yml` (pulled from `feat/devops-gunta`, three jobs —
backend/ai-service/frontend, each skips gracefully if that service's manifest doesn't exist yet)
directly onto `main`. Retargeted triggers to `push: [main, staging]` + `pull_request: [main]`,
so `staging` gets non-blocking CI visibility on every push, and PRs into `main` get the same
jobs as required status checks once branch protection is turned on.
**interface impact:** none.
**still open:** branch protection on `main` (require PR, require the 3 CI jobs as status
checks, no required approvals) still needs to be configured in GitHub settings by a repo
admin — not something automatable from here. `staging` branch cut from this commit, intended to
be the default target for all `feat/*` merges (fast, unprotected); `main` only receives PRs from
`staging`. Vercel connection (Production Branch = `main`, root dir = `frontend`) also still
needs to be done via the Vercel dashboard by an account owner.
**next agent should:** once branch protection is live, verify a real PR from `staging` into
`main` actually shows the 3 jobs as required checks (not just running).
