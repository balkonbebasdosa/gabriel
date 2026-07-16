package com.gabriel.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.Instant;

/**
 * One element of the bare JSON array accepted by POST /transcripts.
 * See /docs/api-contract.md section 1.
 */
public record MessageRequest(
        @NotBlank String speaker,
        @NotBlank String message,
        @NotNull Instant timestamp
) {
}
