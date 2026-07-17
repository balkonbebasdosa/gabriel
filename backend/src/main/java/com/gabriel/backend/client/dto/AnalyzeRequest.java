package com.gabriel.backend.client.dto;

import java.time.Instant;
import java.util.List;

/**
 * Request body for POST {AI_SERVICE_URL}/analyze - see /docs/api-contract.md section 6.
 * personOfInterest is optional and additive - a speaker label from transcript the caller
 * wants a focused conclusion on (typically the child/minor). Omitting it (null) preserves
 * the pre-existing behavior.
 */
public record AnalyzeRequest(List<TranscriptMessage> transcript, String personOfInterest) {

    public record TranscriptMessage(String speaker, String message, Instant timestamp) {
    }
}
