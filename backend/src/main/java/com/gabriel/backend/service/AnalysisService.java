package com.gabriel.backend.service;

import com.gabriel.backend.client.AnalyzeClient;
import com.gabriel.backend.client.dto.AnalyzeRequest;
import com.gabriel.backend.client.dto.AnalyzeResponse;
import com.gabriel.backend.dto.AnalysisResponse;
import com.gabriel.backend.entity.AnalysisResult;
import com.gabriel.backend.entity.Segment;
import com.gabriel.backend.entity.Transcript;
import com.gabriel.backend.repository.AnalysisResultRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
    public AnalysisResponse analyzeTranscript(UUID transcriptId) {
        Transcript transcript = transcriptService.getTranscriptOrThrow(transcriptId);

        AnalyzeResponse aiResponse = analyzeClient.analyze(toAnalyzeRequest(transcript));

        AnalysisResult result = toAnalysisResult(transcript, aiResponse);
        analysisResultRepository.save(result);

        return AnalysisResponse.from(result);
    }

    private AnalyzeRequest toAnalyzeRequest(Transcript transcript) {
        List<AnalyzeRequest.TranscriptMessage> messages = transcript.getMessages().stream()
                .map(m -> new AnalyzeRequest.TranscriptMessage(m.getSpeaker(), m.getMessage(), m.getTimestamp()))
                .toList();
        return new AnalyzeRequest(messages);
    }

    private AnalysisResult toAnalysisResult(Transcript transcript, AnalyzeResponse aiResponse) {
        AnalysisResult result = new AnalysisResult();
        result.setTranscript(transcript);
        result.setProgressionScore(aiResponse.progressionScore());
        result.setStagesReached(List.copyOf(aiResponse.stagesReached()));
        result.setSummary(aiResponse.summary());

        for (AnalyzeResponse.AnalyzeSegment segment : aiResponse.segments()) {
            result.addSegment(new Segment(segment.messageIndex(), segment.stage(), segment.confidence(), segment.rationale()));
        }
        return result;
    }
}
