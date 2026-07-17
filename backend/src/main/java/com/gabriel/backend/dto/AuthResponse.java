package com.gabriel.backend.dto;

import com.gabriel.backend.entity.User;

import java.util.UUID;

public record AuthResponse(
        UUID userId,
        String email,
        String token
) {
    public static AuthResponse from(User user) {
        return new AuthResponse(user.getId(), user.getEmail(), user.getToken());
    }
}
