package com.gabriel.backend.service;

import com.gabriel.backend.client.AnalyzeClient;
import com.gabriel.backend.client.dto.AnalyzeRequest;
import com.gabriel.backend.client.dto.AnalyzeResponse;
import com.gabriel.backend.dto.AnalysisResponse;
import com.gabriel.backend.entity.AnalysisResult;
import com.gabriel.backend.entity.Participant;
import com.gabriel.backend.entity.Segment;
import com.gabriel.backend.entity.Transcript;
import com.gabriel.backend.exception.InvalidTranscriptException;
import com.gabriel.backend.repository.AnalysisResultRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.UUID;

@Service
public class AnalysisService {

    private final TranscriptService transcriptService;
    private final AnalyzeClient analyzeClient;
    private final AnalysisResultRepository analysisResultRepository;

    public AnalysisService(TranscriptService transcriptService,
                            AnalyzeClient analyzeClient,
                            AnalysisResultRepository analysisResultRepository) {
        this.transcriptService = transcriptService;
        this.analyzeClient = analyzeClient;
        this.analysisResultRepository = analysisResultRepository;
    }

    @Transactional
    public AnalysisResponse analyzeTranscript(UUID transcriptId, String personOfInterest) {
        Transcript transcript = transcriptService.getTranscriptOrThrow(transcriptId);
        validatePersonOfInterest(transcript, personOfInterest);

        AnalyzeResponse aiResponse = analyzeClient.analyze(toAnalyzeRequest(transcript, personOfInterest));

        AnalysisResult result = toAnalysisResult(transcript, personOfInterest, aiResponse);
        analysisResultRepository.save(result);

        return AnalysisResponse.from(result);
    }

    private void validatePersonOfInterest(Transcript transcript, String personOfInterest) {
        if (!StringUtils.hasText(personOfInterest)) {
            return;
        }
        boolean matchesASpeaker = transcript.getMessages().stream()
                .anyMatch(message -> message.getSpeaker().equals(personOfInterest));
        if (!matchesASpeaker) {
            throw new InvalidTranscriptException(
                    "person_of_interest '" + personOfInterest + "' does not match any speaker in this transcript.");
        }
    }

    private AnalyzeRequest toAnalyzeRequest(Transcript transcript, String personOfInterest) {
        List<AnalyzeRequest.TranscriptMessage> messages = transcript.getMessages().stream()
                .map(m -> new AnalyzeRequest.TranscriptMessage(m.getSpeaker(), m.getMessage(), m.getTimestamp()))
                .toList();
        return new AnalyzeRequest(messages, personOfInterest);
    }

    private AnalysisResult toAnalysisResult(Transcript transcript, String personOfInterest, AnalyzeResponse aiResponse) {
        AnalysisResult result = new AnalysisResult();
        result.setTranscript(transcript);
        result.setProgressionScore(aiResponse.progressionScore());
        result.setStagesReached(List.copyOf(aiResponse.stagesReached()));
        result.setSummary(aiResponse.summary());
        result.setPersonOfInterest(personOfInterest);

        for (AnalyzeResponse.AnalyzeSegment segment : aiResponse.segments()) {
            result.addSegment(new Segment(segment.messageIndex(), segment.stage(), segment.confidence(), segment.rationale()));
        }
        for (var participant : aiResponse.conclusion().participants()) {
            result.addParticipant(new Participant(participant.speaker(), participant.role(), participant.behaviorSummary()));
        }
        return result;
    }
}
