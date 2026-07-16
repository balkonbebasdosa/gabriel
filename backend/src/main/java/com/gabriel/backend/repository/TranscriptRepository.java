package com.gabriel.backend.repository;

import com.gabriel.backend.entity.Transcript;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface TranscriptRepository extends JpaRepository<Transcript, UUID> {
}
