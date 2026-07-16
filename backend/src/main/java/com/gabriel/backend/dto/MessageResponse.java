package com.gabriel.backend.dto;

import com.gabriel.backend.entity.Message;

import java.time.Instant;

public record MessageResponse(
        String speaker,
        String message,
        Instant timestamp
) {
    public static MessageResponse from(Message message) {
        return new MessageResponse(message.getSpeaker(), message.getMessage(), message.getTimestamp());
    }
}
