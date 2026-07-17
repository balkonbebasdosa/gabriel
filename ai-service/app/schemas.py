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


class ParticipantRole(str, Enum):
    target_victim = "target_victim"
    active_participant = "active_participant"
    bystander = "bystander"
    mediator = "mediator"
    unclear = "unclear"


class TranscriptMessage(BaseModel):
    speaker: str
    message: str
    timestamp: str


class AnalyzeRequest(BaseModel):
    transcript: list[TranscriptMessage]
    # Speaker label (must match a `speaker` value in transcript) the caller wants a focused
    # conclusion on — typically the child/minor. Optional; existing callers unaffected.
    person_of_interest: str | None = None


class Segment(BaseModel):
    # extra="forbid" -> additionalProperties: false in the generated JSON schema,
    # required for Groq/OpenAI strict structured-output mode.
    model_config = ConfigDict(extra="forbid")

    message_index: int
    stage: Stage
    confidence: float = Field(ge=0.0, le=1.0)
    rationale: str


class ParticipantProfile(BaseModel):
    model_config = ConfigDict(extra="forbid")

    speaker: str
    role: ParticipantRole
    behavior_summary: str


class Conclusion(BaseModel):
    participants: list[ParticipantProfile]
    person_of_interest_summary: ParticipantProfile | None = None


class AnalyzeResponse(BaseModel):
    segments: list[Segment]
    progression_score: float = Field(ge=0.0, le=1.0)
    stages_reached: list[Stage]
    summary: str
    conclusion: Conclusion
