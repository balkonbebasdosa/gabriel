package com.gabriel.backend.dto;

import com.gabriel.backend.entity.Participant;

import java.util.List;

public record ConclusionResponse(
        List<ParticipantResponse> participants,
        ParticipantResponse personOfInterestSummary
) {
    public static ConclusionResponse from(List<Participant> participants, String personOfInterest) {
        List<ParticipantResponse> participantResponses = participants.stream()
                .map(ParticipantResponse::from)
                .toList();

        ParticipantResponse match = participantResponses.stream()
                .filter(participant -> participant.speaker().equals(personOfInterest))
                .findFirst()
                .orElse(null);

        return new ConclusionResponse(participantResponses, match);
    }
}
