package com.gabriel.backend.service;

import com.gabriel.backend.dto.AuthResponse;
import com.gabriel.backend.dto.LoginRequest;
import com.gabriel.backend.dto.RegisterRequest;
import com.gabriel.backend.entity.User;
import com.gabriel.backend.exception.EmailAlreadyRegisteredException;
import com.gabriel.backend.exception.InvalidCredentialsException;
import com.gabriel.backend.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.Base64;

@Service
public class AuthService {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.email())) {
            throw new EmailAlreadyRegisteredException(request.email());
        }
        User user = new User(request.email(), passwordEncoder.encode(request.password()));
        user.setToken(generateToken());
        userRepository.save(user);
        return AuthResponse.from(user);
    }

    @Transactional
    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.email())
                .orElseThrow(InvalidCredentialsException::new);
        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new InvalidCredentialsException();
        }
        user.setToken(generateToken());
        userRepository.save(user);
        return AuthResponse.from(user);
    }

    private String generateToken() {
        byte[] randomBytes = new byte[32];
        SECURE_RANDOM.nextBytes(randomBytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);
    }
}
