package com.splitwise.service;

import com.splitwise.dto.AuthDtos.*;
import com.splitwise.entity.RefreshToken;
import com.splitwise.entity.User;
import com.splitwise.exception.BadRequestException;
import com.splitwise.exception.UnauthorizedException;
import com.splitwise.repository.RefreshTokenRepository;
import com.splitwise.repository.UserRepository;
import com.splitwise.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.Base64;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    private static final long REFRESH_TOKEN_EXPIRY_MS = 604_800_000L; // 7 days — mirrors application.yml

    @Transactional
    public AuthResponse signup(SignupRequest req) {
        if (userRepository.existsByEmail(req.email())) {
            throw new BadRequestException("An account with this email already exists");
        }

        User user = User.builder()
                .name(req.name())
                .email(req.email())
                .passwordHash(passwordEncoder.encode(req.password()))
                .build();

        user = userRepository.save(user);

        return issueTokens(user);
    }

    @Transactional
    public AuthResponse login(LoginRequest req) {
        User user = userRepository.findByEmail(req.email())
                .orElseThrow(() -> new UnauthorizedException("Invalid email or password"));

        if (!passwordEncoder.matches(req.password(), user.getPasswordHash())) {
            throw new UnauthorizedException("Invalid email or password");
        }

        return issueTokens(user);
    }

    @Transactional
    public AuthResponse refresh(RefreshRequest req) {
        String tokenHash = hash(req.refreshToken());

        RefreshToken stored = refreshTokenRepository.findByTokenHash(tokenHash)
                .orElseThrow(() -> new UnauthorizedException("Invalid refresh token"));

        if (stored.isRevoked() || stored.getExpiresAt().isBefore(Instant.now())) {
            throw new UnauthorizedException("Refresh token expired or revoked — please log in again");
        }

        if (!jwtUtil.isTokenValid(req.refreshToken())
                || !"REFRESH".equals(jwtUtil.extractTokenType(req.refreshToken()))) {
            throw new UnauthorizedException("Invalid refresh token");
        }

        User user = stored.getUser();

        // rotate: revoke the old refresh token, issue a fresh pair
        stored.setRevoked(true);
        refreshTokenRepository.save(stored);

        return issueTokens(user);
    }

    @Transactional
    public void logout(RefreshRequest req) {
        refreshTokenRepository.findByTokenHash(hash(req.refreshToken()))
                .ifPresent(stored -> {
                    stored.setRevoked(true);
                    refreshTokenRepository.save(stored);
                });
    }

    private AuthResponse issueTokens(User user) {
        String accessToken = jwtUtil.generateAccessToken(user.getId(), user.getEmail());
        String refreshToken = jwtUtil.generateRefreshToken(user.getId(), user.getEmail());

        RefreshToken record = RefreshToken.builder()
                .user(user)
                .tokenHash(hash(refreshToken))
                .expiresAt(Instant.now().plusMillis(REFRESH_TOKEN_EXPIRY_MS))
                .build();
        refreshTokenRepository.save(record);

        return new AuthResponse(accessToken, refreshToken, user.getId(), user.getName(), user.getEmail());
    }

    // Refresh tokens are hashed before storage (same principle as password hashing) so a
    // DB read alone never leaks a usable token.
    private String hash(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashed = digest.digest(value.getBytes());
            return Base64.getEncoder().encodeToString(hashed);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }
}
