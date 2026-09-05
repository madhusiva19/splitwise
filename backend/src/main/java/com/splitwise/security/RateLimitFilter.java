package com.splitwise.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

// Fixed-window rate limiter, in-memory and per-instance — enough to blunt naive brute-force
// / credential-stuffing against /api/auth/**, without pulling in Redis or a distributed
// limiter for what's currently a single-instance app. If this ever runs behind multiple
// instances, the window needs to move to a shared store (Redis) to stay effective.
@Component
public class RateLimitFilter extends OncePerRequestFilter {

    private static final String PROTECTED_PATH_PREFIX = "/api/auth/";

    @Value("${app.rate-limit.auth.max-requests}")
    private int maxRequests;

    @Value("${app.rate-limit.auth.window-seconds}")
    private long windowSeconds;

    private final ConcurrentHashMap<String, Window> windowsByClient = new ConcurrentHashMap<>();

    private static final class Window {
        volatile long windowStartEpochSeconds;
        final AtomicInteger count = new AtomicInteger(0);

        Window(long windowStartEpochSeconds) {
            this.windowStartEpochSeconds = windowStartEpochSeconds;
        }
    }

    @Override
    protected boolean shouldNotFilter(@NonNull HttpServletRequest request) {
        return !request.getRequestURI().startsWith(PROTECTED_PATH_PREFIX);
    }

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                     @NonNull HttpServletResponse response,
                                     @NonNull FilterChain filterChain)
            throws ServletException, IOException {

        String clientKey = clientKey(request);
        long now = Instant.now().getEpochSecond();

        Window window = windowsByClient.computeIfAbsent(clientKey, k -> new Window(now));
        synchronized (window) {
            if (now - window.windowStartEpochSeconds >= windowSeconds) {
                window.windowStartEpochSeconds = now;
                window.count.set(0);
            }
            if (window.count.incrementAndGet() > maxRequests) {
                response.setStatus(429);
                response.setContentType("application/json");
                response.getWriter().write("{\"message\":\"Too many requests, try again shortly.\"}");
                return;
            }
        }

        opportunisticCleanup(now);
        filterChain.doFilter(request, response);
    }

    // Bounds memory from distinct clients over time without a scheduled job — cheap to check,
    // and only actually sweeps once the map has grown large enough to matter.
    private void opportunisticCleanup(long now) {
        if (windowsByClient.size() < 10_000) return;
        windowsByClient.entrySet().removeIf(e -> now - e.getValue().windowStartEpochSeconds >= windowSeconds * 2);
    }

    private String clientKey(HttpServletRequest request) {
        String forwardedFor = request.getHeader("X-Forwarded-For");
        if (forwardedFor != null && !forwardedFor.isBlank()) {
            return forwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
