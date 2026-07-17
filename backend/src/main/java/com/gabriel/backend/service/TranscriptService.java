package com.gabriel.backend.service;

import com.gabriel.backend.dto.MessageRequest;
import com.gabriel.backend.dto.TranscriptDetailResponse;
import com.gabriel.backend.entity.AnalysisResult;
import com.gabriel.backend.entity.Message;
import com.gabriel.backend.entity.Transcript;
import com.gabriel.backend.entity.User;
import com.gabriel.backend.exception.InvalidTranscriptException;
import com.gabriel.backend.exception.TranscriptNotFoundException;
import com.gabriel.backend.repository.AnalysisResultRepository;
import com.gabriel.backend.repository.TranscriptRepository;
import com.gabriel.backend.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.UUID;

@Service
public class TranscriptService {

    private final TranscriptRepository transcriptRepository;
    private final AnalysisResultRepository analysisResultRepository;
    private final UserRepository userRepository;

    public TranscriptService(TranscriptRepository transcriptRepository,
                              AnalysisResultRepository analysisResultRepository,
                              UserRepository userRepository) {
        this.transcriptRepository = transcriptRepository;
        this.analysisResultRepository = analysisResultRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public Transcript createTranscript(List<MessageRequest> messages, UUID userId) {
        validate(messages);

        User owner = userRepository.getReferenceById(userId);
        Transcript transcript = new Transcript();
        transcript.setUser(owner);
        for (int i = 0; i < messages.size(); i++) {
            MessageRequest request = messages.get(i);
            transcript.addMessage(new Message(i, request.speaker(), request.message(), request.timestamp()));
        }
        return transcriptRepository.save(transcript);
    }

    @Transactional(readOnly = true)
    public Transcript getTranscriptOrThrow(UUID id, UUID userId) {
        return transcriptRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new TranscriptNotFoundException(id));
    }

    @Transactional(readOnly = true)
    public TranscriptDetailResponse getTranscriptDetail(UUID id, UUID userId) {
        Transcript transcript = getTranscriptOrThrow(id, userId);
        AnalysisResult latest = analysisResultRepository
                .findFirstByTranscriptIdOrderByCreatedAtDesc(id)
                .orElse(null);
        return TranscriptDetailResponse.from(transcript, latest);
    }

    @Transactional(readOnly = true)
    public List<TranscriptDetailResponse> listTranscripts(UUID userId) {
        return transcriptRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(transcript -> TranscriptDetailResponse.from(
                        transcript,
                        analysisResultRepository.findFirstByTranscriptIdOrderByCreatedAtDesc(transcript.getId()).orElse(null)))
                .toList();
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
