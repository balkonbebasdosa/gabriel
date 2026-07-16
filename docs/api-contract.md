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
  ]
}
```

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
  "summary": "conversation shows early rapport-building only, no escalation detected"
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
