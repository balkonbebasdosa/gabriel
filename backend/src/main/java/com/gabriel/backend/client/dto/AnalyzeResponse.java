package com.gabriel.backend.client.dto;

import java.util.List;

/**
 * Response body from POST {AI_SERVICE_URL}/analyze - see /docs/api-contract.md section 6.
 * progressionScore is a 0-1 cumulative rubric score, NEVER a danger percentage -
 * store and pass it through faithfully, never relabel or rescale it.
 */
public record AnalyzeResponse(
        List<AnalyzeSegment> segments,
        double progressionScore,
        List<String> stagesReached,
        String summary,
        AnalyzeConclusion conclusion
) {
    public record AnalyzeSegment(
            int messageIndex,
            String stage,
            double confidence,
            String rationale
    ) {
    }
}
