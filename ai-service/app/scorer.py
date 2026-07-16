from app.llm_client import tag_transcript
from app.schemas import STAGE_ORDER, AnalyzeResponse, Segment, Stage

STAGE_REACHED_THRESHOLD = 0.5


def _stage_index(stage: Stage) -> int:
    return STAGE_ORDER.index(stage)


def _compute_progression(segments: list[Segment]) -> tuple[float, list[Stage]]:
    best_confidence_per_stage: dict[Stage, float] = {}
    for seg in segments:
        best_confidence_per_stage[seg.stage] = max(
            best_confidence_per_stage.get(seg.stage, 0.0), seg.confidence
        )

    reached = [
        stage
        for stage in STAGE_ORDER
        if best_confidence_per_stage.get(stage, 0.0) >= STAGE_REACHED_THRESHOLD
    ]

    if not reached:
        return 0.0, []

    max_stage = max(reached, key=_stage_index)
    top_confidence = best_confidence_per_stage[max_stage]
    progression_score = round((_stage_index(max_stage) + top_confidence) / len(STAGE_ORDER), 3)
    return progression_score, reached


def analyze(transcript: list[dict]) -> AnalyzeResponse:
    llm_output = tag_transcript(transcript)
    progression_score, stages_reached = _compute_progression(llm_output.segments)
    return AnalyzeResponse(
        segments=llm_output.segments,
        progression_score=progression_score,
        stages_reached=stages_reached,
        summary=llm_output.summary,
    )
