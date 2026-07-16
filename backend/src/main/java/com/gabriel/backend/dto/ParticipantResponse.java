package com.gabriel.backend.dto;

import com.gabriel.backend.entity.Participant;

public record ParticipantResponse(
        String speaker,
        String role,
        String behaviorSummary
) {
    public static ParticipantResponse from(Participant participant) {
        return new ParticipantResponse(participant.getSpeaker(), participant.getRole(), participant.getBehaviorSummary());
    }
}
