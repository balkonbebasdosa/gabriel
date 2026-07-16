package com.gabriel.backend.client.dto;

import java.util.List;

/**
 * conclusion object from POST {AI_SERVICE_URL}/analyze - see /docs/api-contract.md section 6.
 * One participant entry per distinct speaker in the transcript. personOfInterestSummary
 * mirrors whichever participants entry matches the request's personOfInterest, or null if
 * it wasn't provided or didn't match any speaker.
 */
public record AnalyzeConclusion(
        List<AnalyzeParticipant> participants,
        AnalyzeParticipant personOfInterestSummary
) {
}
