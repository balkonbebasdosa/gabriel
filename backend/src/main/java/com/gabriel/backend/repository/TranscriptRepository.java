package com.gabriel.backend.repository;

import com.gabriel.backend.entity.Transcript;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TranscriptRepository extends JpaRepository<Transcript, UUID> {

    Optional<Transcript> findByIdAndUserId(UUID id, UUID userId);

    List<Transcript> findByUserIdOrderByCreatedAtDesc(UUID userId);
}
