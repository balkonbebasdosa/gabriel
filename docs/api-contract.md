# API contract: `POST /analyze`

Owned jointly by `backend` (caller) and `ai-service` (implementer). Any change to this schema
must be reflected on both sides in the same PR.

`ai-service` is stateless; `backend` persists the raw transcript and the analysis result.

## Request

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

## Response

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
- `conclusion` **(new, additive)**: one `participants` entry per distinct speaker in the
  transcript — `role` is one of `target_victim`, `active_participant`, `bystander`, `mediator`,
  `unclear` (descriptive of conversational dynamics, not an accusation — same framing as `stage`).
  `person_of_interest_summary` mirrors whichever `participants` entry matches the request's
  `person_of_interest`, or `null` if it wasn't provided or didn't match any speaker.

**Note for Adit:** `person_of_interest` (request) and `conclusion` (response) are new as of
2026-07-17 — both additive/optional, so existing integration against the old shape keeps working
unchanged. Flagging here since this file is jointly owned; ping ai-service owner before relying
on `conclusion` in the backend/frontend if anything here looks off.
