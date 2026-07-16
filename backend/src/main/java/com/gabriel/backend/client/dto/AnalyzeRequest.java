package com.gabriel.backend.client.dto;

import java.time.Instant;
import java.util.List;

/**
 * Request body for POST {AI_SERVICE_URL}/analyze - see /docs/api-contract.md section 6.
 */
public record AnalyzeRequest(List<TranscriptMessage> transcript) {

    public record TranscriptMessage(String speaker, String message, Instant timestamp) {
    }
}
