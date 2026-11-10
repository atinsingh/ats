package com.jobocate.platform.observability;

import com.jobocate.platform.security.UserContext;
import com.jobocate.platform.tenant.TenantContext;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.UUID;
import org.slf4j.MDC;
import org.springframework.lang.NonNull;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Populates SLF4J MDC with the per-request fields every Jobocate log line is
 * expected to carry:
 *
 * <ul>
 *   <li>{@code requestId}     — generated locally if no inbound id; echoed via
 *       the {@code X-Request-Id} response header.
 *   <li>{@code correlationId} — read from the {@code X-Correlation-Id} request
 *       header (callers propagate it across services); falls back to
 *       {@code requestId}.
 *   <li>{@code tenantId}      — pulled from {@link TenantContext} after the
 *       identity filter has run.
 *   <li>{@code userId}        — pulled from {@link UserContext} after the
 *       identity filter has run.
 * </ul>
 *
 * <p>Must be ordered <em>after</em> the identity filters so the tenant + user
 * are already populated by the time we copy them.
 */
public class RequestLoggingFilter extends OncePerRequestFilter {

    public static final String REQUEST_ID_HEADER = "X-Request-Id";
    public static final String CORRELATION_ID_HEADER = "X-Correlation-Id";

    public static final String MDC_REQUEST_ID = "requestId";
    public static final String MDC_CORRELATION_ID = "correlationId";
    public static final String MDC_TENANT_ID = "tenantId";
    public static final String MDC_USER_ID = "userId";

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain)
            throws ServletException, IOException {
        String requestId = orGenerated(request.getHeader(REQUEST_ID_HEADER));
        String correlationId = orDefault(request.getHeader(CORRELATION_ID_HEADER), requestId);
        try {
            MDC.put(MDC_REQUEST_ID, requestId);
            MDC.put(MDC_CORRELATION_ID, correlationId);
            UUID tenant = TenantContext.currentTenantOrNull();
            if (tenant != null) MDC.put(MDC_TENANT_ID, tenant.toString());
            UUID user = UserContext.currentUserOrNull();
            if (user != null) MDC.put(MDC_USER_ID, user.toString());

            response.setHeader(REQUEST_ID_HEADER, requestId);
            filterChain.doFilter(request, response);
        } finally {
            MDC.remove(MDC_REQUEST_ID);
            MDC.remove(MDC_CORRELATION_ID);
            MDC.remove(MDC_TENANT_ID);
            MDC.remove(MDC_USER_ID);
        }
    }

    private static String orGenerated(String s) {
        return (s == null || s.isBlank()) ? UUID.randomUUID().toString() : s.trim();
    }

    private static String orDefault(String s, String fallback) {
        return (s == null || s.isBlank()) ? fallback : s.trim();
    }
}
