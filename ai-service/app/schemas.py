from enum import Enum

from pydantic import BaseModel, ConfigDict, Field


class Stage(str, Enum):
    trust_building = "trust_building"
    risk_assessment = "risk_assessment"
    isolation_secrecy = "isolation_secrecy"
    desensitization = "desensitization"


STAGE_ORDER = [
    Stage.trust_building,
    Stage.risk_assessment,
    Stage.isolation_secrecy,
    Stage.desensitization,
]


class TranscriptMessage(BaseModel):
    speaker: str
    message: str
    timestamp: str


class AnalyzeRequest(BaseModel):
    transcript: list[TranscriptMessage]


class Segment(BaseModel):
    # extra="forbid" -> additionalProperties: false in the generated JSON schema,
    # required for Groq/OpenAI strict structured-output mode.
    model_config = ConfigDict(extra="forbid")

    message_index: int
    stage: Stage
    confidence: float = Field(ge=0.0, le=1.0)
    rationale: str


class AnalyzeResponse(BaseModel):
    segments: list[Segment]
    progression_score: float = Field(ge=0.0, le=1.0)
    stages_reached: list[Stage]
    summary: str
