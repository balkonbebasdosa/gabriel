package com.gabriel.backend.service;

import com.gabriel.backend.dto.MessageRequest;
import com.gabriel.backend.dto.TranscriptDetailResponse;
import com.gabriel.backend.entity.AnalysisResult;
import com.gabriel.backend.entity.Message;
import com.gabriel.backend.entity.Transcript;
import com.gabriel.backend.exception.InvalidTranscriptException;
import com.gabriel.backend.exception.TranscriptNotFoundException;
import com.gabriel.backend.repository.AnalysisResultRepository;
import com.gabriel.backend.repository.TranscriptRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.UUID;

@Service
public class TranscriptService {

    private final TranscriptRepository transcriptRepository;
    private final AnalysisResultRepository analysisResultRepository;

    public TranscriptService(TranscriptRepository transcriptRepository,
                              AnalysisResultRepository analysisResultRepository) {
        this.transcriptRepository = transcriptRepository;
        this.analysisResultRepository = analysisResultRepository;
    }

    @Transactional
    public Transcript createTranscript(List<MessageRequest> messages) {
        validate(messages);

        Transcript transcript = new Transcript();
        for (int i = 0; i < messages.size(); i++) {
            MessageRequest request = messages.get(i);
            transcript.addMessage(new Message(i, request.speaker(), request.message(), request.timestamp()));
        }
        return transcriptRepository.save(transcript);
    }

    @Transactional(readOnly = true)
    public Transcript getTranscriptOrThrow(UUID id) {
        return transcriptRepository.findById(id)
                .orElseThrow(() -> new TranscriptNotFoundException(id));
    }

    @Transactional(readOnly = true)
    public TranscriptDetailResponse getTranscriptDetail(UUID id) {
        Transcript transcript = getTranscriptOrThrow(id);
        AnalysisResult latest = analysisResultRepository
                .findFirstByTranscriptIdOrderByCreatedAtDesc(id)
                .orElse(null);
        return TranscriptDetailResponse.from(transcript, latest);
    }

    private void validate(List<MessageRequest> messages) {
        if (messages == null || messages.isEmpty()) {
            throw new InvalidTranscriptException("Transcript must contain at least one message.");
        }
        for (int i = 0; i < messages.size(); i++) {
            MessageRequest message = messages.get(i);
            if (message == null
                    || !StringUtils.hasText(message.speaker())
                    || !StringUtils.hasText(message.message())
                    || message.timestamp() == null) {
                throw new InvalidTranscriptException(
                        "Message at index " + i + " is malformed: speaker, message, and timestamp are all required.");
            }
        }
    }
}
