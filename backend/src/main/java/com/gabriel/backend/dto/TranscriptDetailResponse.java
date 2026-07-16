package com.gabriel.backend.dto;

import com.gabriel.backend.entity.AnalysisResult;
import com.gabriel.backend.entity.Transcript;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record TranscriptDetailResponse(
        UUID id,
        Instant createdAt,
        List<MessageResponse> messages,
        AnalysisResponse latestAnalysis
) {
    public static TranscriptDetailResponse from(Transcript transcript, AnalysisResult latestAnalysis) {
        return new TranscriptDetailResponse(
                transcript.getId(),
                transcript.getCreatedAt(),
                transcript.getMessages().stream().map(MessageResponse::from).toList(),
                latestAnalysis == null ? null : AnalysisResponse.from(latestAnalysis)
        );
    }
}
