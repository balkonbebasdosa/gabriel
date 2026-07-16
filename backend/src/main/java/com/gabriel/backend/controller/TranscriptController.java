package com.gabriel.backend.controller;

import com.gabriel.backend.dto.AnalysisResponse;
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
            @RequestBody(required = false) List<MessageRequest> messages) {
        Transcript transcript = transcriptService.createTranscript(messages);
        return ResponseEntity.status(HttpStatus.CREATED).body(TranscriptCreatedResponse.from(transcript));
    }

    @PostMapping("/{id}/analyze")
    public ResponseEntity<AnalysisResponse> analyzeTranscript(@PathVariable UUID id) {
        return ResponseEntity.ok(analysisService.analyzeTranscript(id));
    }

    @GetMapping("/{id}")
    public ResponseEntity<TranscriptDetailResponse> getTranscript(@PathVariable UUID id) {
        return ResponseEntity.ok(transcriptService.getTranscriptDetail(id));
    }
}
