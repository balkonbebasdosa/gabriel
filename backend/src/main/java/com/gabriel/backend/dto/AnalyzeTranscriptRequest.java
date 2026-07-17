package com.gabriel.backend.dto;

/**
 * Optional request body for POST /transcripts/{id}/analyze.
 * personOfInterest is a speaker label from the transcript (typically the child/minor)
 * to get a focused conclusion on. Omit the whole body, or personOfInterest, for the
 * pre-existing behavior with no focused conclusion.
 */
public record AnalyzeTranscriptRequest(String personOfInterest) {
}
