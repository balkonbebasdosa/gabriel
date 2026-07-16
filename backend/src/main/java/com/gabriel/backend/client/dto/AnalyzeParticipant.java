package com.gabriel.backend.client.dto;

/**
 * One entry in conclusion.participants - see /docs/api-contract.md section 6.
 * role is one of: target_victim, active_participant, bystander, mediator, unclear.
 * Descriptive of conversational dynamics, not an accusation - same framing as stage.
 * Stored and passed through verbatim, never relabeled.
 */
public record AnalyzeParticipant(
        String speaker,
        String role,
        String behaviorSummary
) {
}
