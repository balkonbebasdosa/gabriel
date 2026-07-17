# ai-service

Stateless FastAPI microservice: scores a chat transcript against the four Luring Communication
Theory stages (trust-building → risk-assessment → isolation/secrecy → desensitization) and
returns a stage-by-stage timeline, never a single "predator" verdict. See `/docs/api-contract.md`
(section 6 of the project handoff) for the authoritative request/response schema.

Runs standalone — no dependency on the backend or frontend. Adit's backend calls `/analyze`
directly; test it here first with curl before wiring it up.

## Run locally

```bash
cd ai-service
pip install -r requirements.txt
cp .env.example .env   # fill in OPENROUTER_API_KEY
uvicorn app.main:app --reload
```

## Try it

```bash
curl -X POST http://localhost:8000/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "transcript": [
      {"speaker": "A", "message": "hey, how was school", "timestamp": "2026-07-16T14:02:00Z"},
      {"speaker": "B", "message": "boring lol", "timestamp": "2026-07-16T14:02:40Z"}
    ]
  }'
```

## PAN12 evaluation

See `eval/README.md` for the validation harness (precision/recall against the PAN12 corpus)
and the benign false-positive fixture set.
