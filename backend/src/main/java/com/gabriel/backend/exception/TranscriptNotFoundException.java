package com.gabriel.backend.exception;

import java.util.UUID;

public class TranscriptNotFoundException extends RuntimeException {

    public TranscriptNotFoundException(UUID id) {
        super("Transcript not found: " + id);
    }
}
