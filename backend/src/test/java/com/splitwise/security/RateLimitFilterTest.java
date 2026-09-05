package com.splitwise.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.io.PrintWriter;
import java.io.StringWriter;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RateLimitFilterTest {

    @Mock private HttpServletRequest request;
    @Mock private HttpServletResponse response;
    @Mock private FilterChain filterChain;

    private RateLimitFilter filter;

    @BeforeEach
    void setUp() {
        filter = new RateLimitFilter();
        ReflectionTestUtils.setField(filter, "maxRequests", 2);
        ReflectionTestUtils.setField(filter, "windowSeconds", 60L);
    }

    @Test
    void shouldNotFilter_onlyAppliesToAuthPaths() {
        when(request.getRequestURI()).thenReturn("/api/groups");
        assertThat(filter.shouldNotFilter(request)).isTrue();

        when(request.getRequestURI()).thenReturn("/api/auth/login");
        assertThat(filter.shouldNotFilter(request)).isFalse();
    }

    @Test
    void allowsRequestsUnderTheLimitThenBlocksOnceExceeded() throws Exception {
        when(request.getRemoteAddr()).thenReturn("10.0.0.5");
        StringWriter body = new StringWriter();
        when(response.getWriter()).thenReturn(new PrintWriter(body));

        // maxRequests = 2: first two calls pass through, third is blocked.
        filter.doFilterInternal(request, response, filterChain);
        filter.doFilterInternal(request, response, filterChain);
        verify(filterChain, times(2)).doFilter(request, response);

        filter.doFilterInternal(request, response, filterChain);
        verify(filterChain, times(2)).doFilter(request, response); // still 2 — third was blocked
        verify(response).setStatus(429);
    }

    @Test
    void tracksDifferentClientsIndependently() throws Exception {
        when(request.getRemoteAddr()).thenReturn("10.0.0.1");
        filter.doFilterInternal(request, response, filterChain);
        filter.doFilterInternal(request, response, filterChain);

        when(request.getRemoteAddr()).thenReturn("10.0.0.2");
        filter.doFilterInternal(request, response, filterChain);

        // 2 for the first client + 1 for the second = 3 total passes, none blocked yet.
        verify(filterChain, times(3)).doFilter(request, response);
        verify(response, org.mockito.Mockito.never()).setStatus(429);
    }

    @Test
    void prefersXForwardedForOverRemoteAddrWhenPresent() throws Exception {
        when(request.getHeader("X-Forwarded-For")).thenReturn("203.0.113.7, 10.0.0.1");
        when(response.getWriter()).thenReturn(new PrintWriter(new StringWriter()));

        filter.doFilterInternal(request, response, filterChain);
        filter.doFilterInternal(request, response, filterChain);
        filter.doFilterInternal(request, response, filterChain);

        // Same forwarded client on all three calls -> third one should be blocked.
        verify(filterChain, times(2)).doFilter(request, response);
        verify(response).setStatus(429);
    }
}
