package com.jobocate.platform.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.http.HttpHeaders;
import org.springframework.lang.NonNull;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Authenticates {@code /internal/v1/**} requests using a static bearer token
 * shared between the Java services and the python workers
 * ({@code jobocate.internal-token}). On success an {@link
 * JobocateAuthentication#internal()} principal is installed in the
 * {@link SecurityContextHolder}; on failure a 401 is returned.
 *
 * <p>Replaced by mTLS / SPIFFE in production. The static token is only ever
 * used between trusted in-cluster services.
 */
public class InternalTokenFilter extends OncePerRequestFilter {

    private final String expectedToken;

    public InternalTokenFilter(String expectedToken) {
        this.expectedToken = expectedToken;
    }

    @Override
    protected boolean shouldNotFilter(@NonNull HttpServletRequest request) {
        return !request.getRequestURI().startsWith("/internal/");
    }

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain)
            throws ServletException, IOException {
        String header = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (header == null
                || !header.regionMatches(true, 0, "Bearer ", 0, "Bearer ".length())
                || !header.substring("Bearer ".length()).trim().equals(expectedToken)) {
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Invalid internal credentials");
            return;
        }
        try {
            SecurityContextHolder.getContext().setAuthentication(JobocateAuthentication.internal());
            filterChain.doFilter(request, response);
        } finally {
            SecurityContextHolder.clearContext();
        }
    }
}
