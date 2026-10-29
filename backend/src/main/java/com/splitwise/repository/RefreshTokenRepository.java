package com.splitwise.repository;

import com.splitwise.entity.RefreshToken;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, String> {
    Optional<RefreshToken> findByTokenHash(String tokenHash);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("delete from RefreshToken r where r.revoked = true or r.expiresAt < :now")
    int deleteRevokedOrExpiredTokens(@org.springframework.data.repository.query.Param("now") java.time.Instant now);
}
