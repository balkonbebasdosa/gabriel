package com.gabriel.backend.dto;

import com.gabriel.backend.entity.Transcript;

import java.time.Instant;
import java.util.UUID;

public record TranscriptCreatedResponse(
        UUID id,
        Instant createdAt,
        int messageCount
) {
    public static TranscriptCreatedResponse from(Transcript transcript) {
        return new TranscriptCreatedResponse(transcript.getId(), transcript.getCreatedAt(), transcript.getMessages().size());
    }
}
