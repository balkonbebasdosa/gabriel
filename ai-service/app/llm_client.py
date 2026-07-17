import os
import time

from openai import APIStatusError, OpenAI, RateLimitError
from pydantic import BaseModel, ConfigDict

from app.rubric import SYSTEM_PROMPT, build_user_prompt
from app.schemas import ParticipantProfile, Segment

OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"

_client: OpenAI | None = None

MAX_RETRIES = 4
BASE_BACKOFF_SECONDS = 5


class LLMOutput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    segments: list[Segment]
    summary: str
    participants: list[ParticipantProfile]


def _get_client() -> OpenAI:
    global _client
    if _client is None:
        _client = OpenAI(
            base_url=OPENROUTER_BASE_URL,
            api_key=os.environ["OPENROUTER_API_KEY"],
            default_headers={
                "HTTP-Referer": "https://github.com/balkonbebasdosa/gabriel",
                "X-Title": "GABRIEL ai-service",
            },
        )
    return _client


def _is_transient_rate_or_size_error(e: Exception) -> bool:
    # 429 = rate limit, 413 = request too large for the current tokens-per-minute
    # window. Both clear up if we just wait — retrying immediately, or not at all,
    # was previously counted as a permanent failure and conflated with genuine
    # content-safety refusals (400, invalid schema). See eval/README.md.
    if isinstance(e, RateLimitError):
        return True
    if isinstance(e, APIStatusError) and e.status_code == 413:
        return True
    return False


def tag_transcript(transcript: list[dict]) -> LLMOutput:
    model = os.environ.get("OPENROUTER_MODEL", "openai/gpt-oss-20b")
    client = _get_client()

    # Scales with transcript length: one segment (stage/confidence/rationale) per message,
    # a summary, and one participant profile per distinct speaker, all as JSON. A fixed
    # small default previously caused the completion to get cut off mid-JSON, which strict
    # schema validation then reported as "does not match schema" — indistinguishable from a
    # genuine refusal until inspected. This has no cost impact on short requests: it's a
    # ceiling, not a target length.
    #
    # The old ceiling (8000) was tuned specifically to Groq's tokens-per-minute limit, not
    # to any real capacity constraint. Per OpenRouter's models API, gpt-oss-20b actually
    # supports up to 131072 tokens of context. Raised the ceiling accordingly (bounded well
    # below the true max, for cost/latency, not because of a hard wall) and padded the
    # per-message estimate — this model does *mandatory* internal reasoning before its
    # visible answer (confirmed via OpenRouter's model metadata), which consumes part of
    # the budget invisibly; a too-tight ceiling can starve the reasoning step itself and
    # return empty content, not just truncate the JSON.
    distinct_speakers = len({m["speaker"] for m in transcript})
    max_tokens = min(1500 + 180 * len(transcript) + 150 * distinct_speakers, 32000)

    for attempt in range(MAX_RETRIES):
        try:
            response = client.chat.completions.create(
                model=model,
                temperature=0.1,
                max_completion_tokens=max_tokens,
                # NOT setting reasoning_effort: tried "low" to bound the mandatory internal
                # reasoning this model does (see max_tokens comment above), and it fixed the
                # long-conversation empty-content case — but a direct A/B test on a normal
                # 30-message transcript showed it collapsing every stage to trust_building and
                # every participant to active_participant, a real quality loss, not noise.
                # Reverted to the model's default ("medium") since that's what every fix this
                # session was actually validated against. The empty-content retry below is the
                # safety net for long conversations instead.
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": build_user_prompt(transcript)},
                ],
                response_format={
                    "type": "json_schema",
                    "json_schema": {
                        "name": "llm_output",
                        "strict": True,
                        "schema": LLMOutput.model_json_schema(),
                    },
                },
                # NOTE: tried OpenRouter's require_parameters:true here to force routing only
                # to providers honoring strict schema — it over-filtered and returned 404 "no
                # endpoints found" for gpt-oss-20b's current provider pool entirely. Dropped it;
                # structured output verified working without it. LLMOutput.model_validate_json
                # below is the safety net if a provider ever does return malformed JSON.
            )
            content = response.choices[0].message.content
            if not content:
                # Reasoning consumed the entire budget before any visible answer formed —
                # observed directly on a long real conversation even with a generous ceiling.
                # Retryable: driven by run-to-run reasoning-token variance, not a hard wall.
                raise ValueError("empty completion content (likely reasoning-token exhaustion)")
            return LLMOutput.model_validate_json(content)
        except Exception as e:
            is_empty_content = isinstance(e, ValueError) and "empty completion" in str(e)
            if (_is_transient_rate_or_size_error(e) or is_empty_content) and attempt < MAX_RETRIES - 1:
                time.sleep(BASE_BACKOFF_SECONDS * (attempt + 1))
                continue
            raise
