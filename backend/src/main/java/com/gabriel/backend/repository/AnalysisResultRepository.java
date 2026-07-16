package com.gabriel.backend.repository;

import com.gabriel.backend.entity.AnalysisResult;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface AnalysisResultRepository extends JpaRepository<AnalysisResult, UUID> {

    Optional<AnalysisResult> findFirstByTranscriptIdOrderByCreatedAtDesc(UUID transcriptId);
}
