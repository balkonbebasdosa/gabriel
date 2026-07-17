package com.gabriel.backend.dto;

import com.gabriel.backend.entity.Segment;

public record SegmentResponse(
        int messageIndex,
        String stage,
        double confidence,
        String rationale
) {
    public static SegmentResponse from(Segment segment) {
        return new SegmentResponse(segment.getMessageIndex(), segment.getStage(), segment.getConfidence(), segment.getRationale());
    }
}
