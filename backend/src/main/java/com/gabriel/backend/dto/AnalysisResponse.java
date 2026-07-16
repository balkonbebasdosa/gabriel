package com.gabriel.backend.dto;

import com.gabriel.backend.entity.AnalysisResult;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * progression_score is a 0-1 cumulative rubric score, NEVER a danger percentage.
 * Passed through faithfully from the AI service - see /docs/api-contract.md.
 */
public record AnalysisResponse(
        UUID id,
        UUID transcriptId,
        Instant createdAt,
        List<SegmentResponse> segments,
        double progressionScore,
        List<String> stagesReached,
        String summary
) {
    public static AnalysisResponse from(AnalysisResult result) {
        return new AnalysisResponse(
                result.getId(),
                result.getTranscript().getId(),
                result.getCreatedAt(),
                result.getSegments().stream().map(SegmentResponse::from).toList(),
                result.getProgressionScore(),
                List.copyOf(result.getStagesReached()),
                result.getSummary()
        );
    }
}
