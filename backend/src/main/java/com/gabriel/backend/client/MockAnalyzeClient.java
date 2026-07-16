package com.gabriel.backend.client;

import com.gabriel.backend.client.dto.AnalyzeConclusion;
import com.gabriel.backend.client.dto.AnalyzeParticipant;
import com.gabriel.backend.client.dto.AnalyzeRequest;
import com.gabriel.backend.client.dto.AnalyzeResponse;
import com.gabriel.backend.client.dto.AnalyzeResponse.AnalyzeSegment;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.IntStream;

/**
 * Stands in for Gabriel's real AI service so the rest of the backend
 * (persistence, DTOs, the frontend integration) can be built and tested with
 * zero dependency on that service being available. Always returns a fixed
 * stage classification - no real analysis logic lives here. Active by
 * default; disable with ai-service.mock-enabled=false (env AI_SERVICE_MOCK)
 * to switch to {@link HttpAnalyzeClient} with no code changes.
 */
@Component
@ConditionalOnProperty(name = "ai-service.mock-enabled", havingValue = "true", matchIfMissing = true)
public class MockAnalyzeClient implements AnalyzeClient {

    @Override
    public AnalyzeResponse analyze(AnalyzeRequest request) {
        int messageCount = request.transcript().size();

        List<AnalyzeSegment> segments = IntStream.range(0, messageCount)
                .mapToObj(index -> new AnalyzeSegment(
                        index,
                        "trust_building",
                        0.5,
                        "mock analysis - stub response for local development, not a real grooming-risk assessment"))
                .toList();

        AnalyzeConclusion conclusion = toMockConclusion(request);

        return new AnalyzeResponse(
                segments,
                0.18,
                List.of("trust_building"),
                "conversation shows early rapport-building only, no escalation detected (mock response)",
                conclusion
        );
    }

    private AnalyzeConclusion toMockConclusion(AnalyzeRequest request) {
        Set<String> speakers = new LinkedHashSet<>();
        for (AnalyzeRequest.TranscriptMessage message : request.transcript()) {
            speakers.add(message.speaker());
        }

        List<AnalyzeParticipant> participants = speakers.stream()
                .map(speaker -> new AnalyzeParticipant(
                        speaker,
                        "unclear",
                        "mock conclusion - stub response for local development, not a real behavior assessment"))
                .toList();

        AnalyzeParticipant personOfInterestSummary = participants.stream()
                .filter(participant -> participant.speaker().equals(request.personOfInterest()))
                .findFirst()
                .orElse(null);

        return new AnalyzeConclusion(participants, personOfInterestSummary);
    }
}
