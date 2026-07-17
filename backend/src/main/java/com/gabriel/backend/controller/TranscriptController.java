package com.gabriel.backend.controller;

import com.gabriel.backend.dto.AnalysisResponse;
import com.gabriel.backend.dto.AnalyzeTranscriptRequest;
import com.gabriel.backend.dto.MessageRequest;
import com.gabriel.backend.dto.TranscriptCreatedResponse;
import com.gabriel.backend.dto.TranscriptDetailResponse;
import com.gabriel.backend.entity.Transcript;
import com.gabriel.backend.service.AnalysisService;
import com.gabriel.backend.service.TranscriptService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/transcripts")
public class TranscriptController {

    private final TranscriptService transcriptService;
    private final AnalysisService analysisService;

    public TranscriptController(TranscriptService transcriptService, AnalysisService analysisService) {
        this.transcriptService = transcriptService;
        this.analysisService = analysisService;
    }

    @PostMapping
    public ResponseEntity<TranscriptCreatedResponse> uploadTranscript(
            @RequestAttribute UUID currentUserId,
            @RequestBody(required = false) List<MessageRequest> messages) {
        Transcript transcript = transcriptService.createTranscript(messages, currentUserId);
        return ResponseEntity.status(HttpStatus.CREATED).body(TranscriptCreatedResponse.from(transcript));
    }

    @GetMapping
    public ResponseEntity<List<TranscriptDetailResponse>> listTranscripts(@RequestAttribute UUID currentUserId) {
        return ResponseEntity.ok(transcriptService.listTranscripts(currentUserId));
    }

    @PostMapping("/{id}/analyze")
    public ResponseEntity<AnalysisResponse> analyzeTranscript(
            @RequestAttribute UUID currentUserId,
            @PathVariable UUID id,
            @RequestBody(required = false) AnalyzeTranscriptRequest request) {
        String personOfInterest = request == null ? null : request.personOfInterest();
        return ResponseEntity.ok(analysisService.analyzeTranscript(id, currentUserId, personOfInterest));
    }

    @GetMapping("/{id}")
    public ResponseEntity<TranscriptDetailResponse> getTranscript(
            @RequestAttribute UUID currentUserId,
            @PathVariable UUID id) {
        return ResponseEntity.ok(transcriptService.getTranscriptDetail(id, currentUserId));
    }
}
