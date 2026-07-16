import os
import time

from groq import APIStatusError, Groq, RateLimitError
from pydantic import BaseModel, ConfigDict

from app.rubric import SYSTEM_PROMPT, build_user_prompt
from app.schemas import Segment

_client: Groq | None = None

MAX_RETRIES = 4
BASE_BACKOFF_SECONDS = 5


class LLMOutput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    segments: list[Segment]
    summary: str


def _get_client() -> Groq:
    global _client
    if _client is None:
        _client = Groq(api_key=os.environ["GROQ_API_KEY"])
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
    model = os.environ.get("GROQ_MODEL", "openai/gpt-oss-20b")
    client = _get_client()

    # Scales with transcript length: one segment (stage/confidence/rationale) per message
    # plus a summary, all as JSON. A fixed small default previously caused Groq to cut the
    # completion off mid-JSON, which strict schema validation then reported as "does not
    # match schema" — indistinguishable from a genuine refusal until inspected. This has
    # no cost impact on short requests: it's a ceiling, not a target length.
    max_tokens = min(300 + 120 * len(transcript), 8000)

    for attempt in range(MAX_RETRIES):
        try:
            response = client.chat.completions.create(
                model=model,
                temperature=0.1,
                max_completion_tokens=max_tokens,
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
            )
            return LLMOutput.model_validate_json(response.choices[0].message.content)
        except Exception as e:
            if _is_transient_rate_or_size_error(e) and attempt < MAX_RETRIES - 1:
                time.sleep(BASE_BACKOFF_SECONDS * (attempt + 1))
                continue
            raise
