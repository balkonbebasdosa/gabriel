# Gabriel — API contract

Single source of truth for the interfaces between the three services:

- **Frontend (Gunta)** → **Backend (Adit)** — sections 0–5 below.
- **Backend (Adit)** → **AI service (Gabriel)** — section 7 below (canonical; owned jointly by `backend` and `ai-service` — any change to this schema must be reflected on both sides in the same PR).

The frontend never calls the AI service directly. All traffic to the AI service is proxied through the backend.

If any DTO changes in the backend implementation, this file is updated in the same change. Treat it as authoritative over any other description.

---

## Product framing (read this before the schemas)

Gabriel scores a chat transcript against the four documented stages of grooming behavior (Luring Communication Theory) and returns a **stage-by-stage risk timeline** for a parent/guardian to review. It is:

- **NOT** a "percentage predator" verdict.
- **NOT** a black-box score.
- **NEVER** an automated accusation.

It flags risk for **human review only**. `progression_score` (see below) is a 0–1 float representing cumulative progress through the four-stage rubric — it is **never** relabeled, rescaled, or presented as a danger percentage, anywhere in any client. This framing is non-negotiable.

**Stage vocabulary** (exactly these four values, in this order of progression):

| value | meaning |
|---|---|
| `trust_building` | Rapport-building, establishing common ground |
| `risk_assessment` | Testing boundaries, gauging secrecy/response |
| `isolation_secrecy` | Encouraging secrecy, isolating from guardians |
| `desensitization` | Normalizing inappropriate content/requests |

**Participant role vocabulary** (descriptive of conversational dynamics, not an accusation — same framing as stage):

| value | meaning |
|---|---|
| `target_victim` | The apparent focus of the other party's escalating behavior |
| `active_participant` | Drives or reciprocates the escalating dynamic |
| `bystander` | Present in the conversation but not implicated in the dynamic |
| `mediator` | Attempts to redirect, de-escalate, or intervene |
| `unclear` | Not enough signal to assign a role with confidence |

---

## 0. Authentication

**Simulated auth** (added 2026-07-17): register/login with email+password, opaque bearer token, no OAuth/email verification/password reset. Every endpoint under `/transcripts/**` now requires it — a transcript belongs to exactly the user who uploaded it, and `GET`s of another user's transcript 404 (not 403 — a non-owner can't distinguish "doesn't exist" from "not yours").

### `POST /auth/register`

**Request body:**

```json
{ "email": "parent@example.com", "password": "at least 8 characters" }
```

`email` must be a well-formed address (rejected with `400` otherwise). `password` must be at least 8 characters. Duplicate email → `409`.

**Response `201 Created`:**

```json
{
  "user_id": "8f14e45f-ceea-4b8a-b41f-9f7c6a1e0d3a",
  "email": "parent@example.com",
  "token": "3s9pQ...opaque-url-safe-base64...kX2"
}
```

### `POST /auth/login`

Same request/response shape as register (minus the `409` case). Wrong password or unknown email both return the same `401` with a generic message — the API never reveals whether an email is registered.

### Using the token

Every `/transcripts/**` request needs:

```
Authorization: Bearer <token>
```

Missing or invalid token → `401`. A fresh token is issued on every login (previous tokens for that user stop working — one active session at a time, no refresh/expiry beyond that).

---

## 1. `POST /transcripts`

*Requires `Authorization` header — see section 0.*

Uploads a raw transcript for storage, owned by the authenticated caller. Body is a **bare JSON array** of messages (not wrapped in an object).

**Request body:**

```json
[
  { "speaker": "A", "message": "hey, how was school", "timestamp": "2026-07-16T14:02:00Z" },
  { "speaker": "B", "message": "boring lol", "timestamp": "2026-07-16T14:02:40Z" }
]
```

Each message requires a non-blank `speaker`, non-blank `message`, and a valid ISO-8601 `timestamp`. An empty array or any malformed message is rejected with `400`.

**Response `201 Created`:**

```json
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "created_at": "2026-07-16T14:05:00Z",
  "message_count": 2
}
```

---

## 2. `GET /transcripts`

*Requires `Authorization` header.*

**Chat history list** — every transcript the authenticated caller has uploaded, newest first, each with its latest analysis embedded if one exists. Same per-item shape as section 4 (`GET /transcripts/{id}`), just returned as an array:

```json
[
  {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "created_at": "2026-07-16T14:05:00Z",
    "messages": [ /* ... */ ],
    "latest_analysis": { /* ... or null */ }
  }
]
```

---

## 3. `POST /transcripts/{id}/analyze`

*Requires `Authorization` header — `404` if the id doesn't exist **or** belongs to another user.*

Loads the stored transcript, calls the AI service's `POST /analyze` (see section 7), persists the result, and returns it.

**Request body (optional — omit entirely, or omit `person_of_interest`, for the pre-existing behavior):**

```json
{ "person_of_interest": "B" }
```

`person_of_interest` must match a `speaker` value already present in the transcript, or the request is rejected with `400`. Typically the child/minor the parent is focused on.

**Response `200 OK`:**

```json
{
  "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "transcript_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "created_at": "2026-07-16T14:05:30Z",
  "segments": [
    {
      "message_index": 0,
      "stage": "trust_building",
      "confidence": 0.62,
      "rationale": "casual rapport-building, no risk indicators"
    }
  ],
  "progression_score": 0.18,
  "stages_reached": ["trust_building"],
  "summary": "conversation shows early rapport-building only, no escalation detected",
  "conclusion": {
    "participants": [
      { "speaker": "A", "role": "active_participant", "behavior_summary": "initiates and drives the conversation" },
      { "speaker": "B", "role": "target_victim", "behavior_summary": "responds casually, no concerning behavior of their own" }
    ],
    "person_of_interest_summary": {
      "speaker": "B",
      "role": "target_victim",
      "behavior_summary": "responds casually, no concerning behavior of their own"
    }
  }
}
```

`conclusion` is always present. `person_of_interest_summary` is `null` if `person_of_interest` wasn't provided in the request.

`404` if the transcript id does not exist or isn't owned by the caller. `400` if `person_of_interest` is provided but doesn't match any speaker in the transcript.

---

## 4. `GET /transcripts/{id}`

*Requires `Authorization` header — `404` if the id doesn't exist **or** belongs to another user.*

Returns the stored transcript plus its latest analysis result, if one exists (`latest_analysis: null` if `/analyze` has never been called for this transcript).

**Response `200 OK`:**

```json
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "created_at": "2026-07-16T14:05:00Z",
  "messages": [
    { "speaker": "A", "message": "hey, how was school", "timestamp": "2026-07-16T14:02:00Z" },
    { "speaker": "B", "message": "boring lol", "timestamp": "2026-07-16T14:02:40Z" }
  ],
  "latest_analysis": {
    "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
    "transcript_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "created_at": "2026-07-16T14:05:30Z",
    "segments": [
      { "message_index": 0, "stage": "trust_building", "confidence": 0.62, "rationale": "casual rapport-building, no risk indicators" }
    ],
    "progression_score": 0.18,
    "stages_reached": ["trust_building"],
    "summary": "conversation shows early rapport-building only, no escalation detected",
    "conclusion": {
      "participants": [
        { "speaker": "A", "role": "active_participant", "behavior_summary": "initiates and drives the conversation" },
        { "speaker": "B", "role": "target_victim", "behavior_summary": "responds casually, no concerning behavior of their own" }
      ],
      "person_of_interest_summary": null
    }
  }
}
```

`404` if the transcript id does not exist or isn't owned by the caller.

---

## 5. `GET /health`

Public — no `Authorization` header needed.

**Response `200 OK`:**

```json
{ "status": "UP" }
```

---

## 6. Error shape

Any `4xx`/`5xx` response from the backend uses:

```json
{ "error": "Bad Request", "message": "Transcript must contain at least one message." }
```

---

## 7. Backend → AI service: `POST {AI_SERVICE_URL}/analyze`

Owned jointly by `backend` (caller) and `ai-service` (implementer). Any change to this schema must be reflected on both sides in the same PR.

`ai-service` is stateless; `backend` persists the raw transcript and the analysis result. This call has no concept of users/auth — the backend resolves ownership before ever reaching this call.

### Request

```json
{
  "transcript": [
    { "speaker": "A", "message": "hey, how was school", "timestamp": "2026-07-16T14:02:00Z" },
    { "speaker": "B", "message": "boring lol", "timestamp": "2026-07-16T14:02:40Z" }
  ],
  "person_of_interest": "B"
}
```

- `person_of_interest` **(new, additive, optional)**: a `speaker` value already present in
  `transcript` — typically the child/minor the parent is focused on. Omit it and behavior is
  unchanged from before this field existed.

### Response

```json
{
  "segments": [
    {
      "message_index": 0,
      "stage": "trust_building",
      "confidence": 0.62,
      "rationale": "casual rapport-building, no risk indicators"
    }
  ],
  "progression_score": 0.18,
  "stages_reached": ["trust_building"],
  "summary": "conversation shows early rapport-building only, no escalation detected",
  "conclusion": {
    "participants": [
      { "speaker": "A", "role": "active_participant", "behavior_summary": "initiates and drives the conversation" },
      { "speaker": "B", "role": "target_victim", "behavior_summary": "responds casually, no concerning behavior of their own" }
    ],
    "person_of_interest_summary": {
      "speaker": "B",
      "role": "target_victim",
      "behavior_summary": "responds casually, no concerning behavior of their own"
    }
  }
}
```

- `stage` is one of the four Luring Communication Theory stages: `trust_building`,
  `risk_assessment`, `isolation_secrecy`, `desensitization`.
- `progression_score` is a 0–1 float representing how far through the four-stage rubric the
  conversation has moved cumulatively. **It is not a "percentage predator" score.**
  The frontend must always present it as a stage timeline, never as a bare percentage —
  this framing is non-negotiable.
- `rationale` exists so the frontend timeline can show *why* a segment was tagged, not just a
  number.
- `message_index` — zero-based index into the `transcript` array of the request.
- `confidence` — 0–1 float, confidence in that segment's stage classification.
- `conclusion` **(new, additive)**: one `participants` entry per distinct speaker in the
  transcript — `role` is one of `target_victim`, `active_participant`, `bystander`, `mediator`,
  `unclear` (descriptive of conversational dynamics, not an accusation — same framing as `stage`).
  `person_of_interest_summary` mirrors whichever `participants` entry matches the request's
  `person_of_interest`, or `null` if it wasn't provided or didn't match any speaker.

**Note (2026-07-17):** `person_of_interest` (request) and `conclusion` (response) are additive/backward-compatible fields from `ai-service` — see its `HANDOFF.md` session 4 entry. The backend validates `person_of_interest` against the transcript's speakers (`400` if it doesn't match any) and persists/exposes `conclusion` through sections 3 and 4 above.
