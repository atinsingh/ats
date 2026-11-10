package com.jobocate.platform.observability;

import static org.assertj.core.api.Assertions.assertThat;

import com.jobocate.platform.security.UserContext;
import com.jobocate.platform.tenant.TenantContext;
import jakarta.servlet.FilterChain;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.slf4j.MDC;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

class RequestLoggingFilterTest {

    private final RequestLoggingFilter filter = new RequestLoggingFilter();

    @AfterEach
    void cleanup() {
        TenantContext.clear();
        UserContext.clear();
        MDC.clear();
    }

    @Test
    void copiesTenantAndUserIntoMdcAndEchoesRequestId() throws Exception {
        UUID tenant = UUID.randomUUID();
        UUID user = UUID.randomUUID();
        TenantContext.setCurrentTenant(tenant);
        UserContext.setCurrentUser(user);

        MockHttpServletRequest req = new MockHttpServletRequest("GET", "/api/v1/jobs");
        req.addHeader(RequestLoggingFilter.REQUEST_ID_HEADER, "req-123");
        req.addHeader(RequestLoggingFilter.CORRELATION_ID_HEADER, "corr-456");
        MockHttpServletResponse res = new MockHttpServletResponse();

        // Capture MDC values that the downstream filter / controller would
        // observe. The filter clears MDC in its `finally` block, so we read
        // them inside the chain.
        FilterChain chain = (request, response) -> {
            assertThat(MDC.get(RequestLoggingFilter.MDC_REQUEST_ID)).isEqualTo("req-123");
            assertThat(MDC.get(RequestLoggingFilter.MDC_CORRELATION_ID)).isEqualTo("corr-456");
            assertThat(MDC.get(RequestLoggingFilter.MDC_TENANT_ID)).isEqualTo(tenant.toString());
            assertThat(MDC.get(RequestLoggingFilter.MDC_USER_ID)).isEqualTo(user.toString());
        };

        filter.doFilter(req, res, chain);

        assertThat(res.getHeader(RequestLoggingFilter.REQUEST_ID_HEADER)).isEqualTo("req-123");
        assertThat(MDC.get(RequestLoggingFilter.MDC_REQUEST_ID)).isNull();
        assertThat(MDC.get(RequestLoggingFilter.MDC_CORRELATION_ID)).isNull();
        assertThat(MDC.get(RequestLoggingFilter.MDC_TENANT_ID)).isNull();
        assertThat(MDC.get(RequestLoggingFilter.MDC_USER_ID)).isNull();
    }

    @Test
    void generatesRequestIdWhenHeaderMissingAndCorrelationFallsBackToRequestId() throws Exception {
        MockHttpServletRequest req = new MockHttpServletRequest("GET", "/api/v1/jobs");
        MockHttpServletResponse res = new MockHttpServletResponse();

        String[] capturedRequestId = new String[1];
        String[] capturedCorrelationId = new String[1];
        FilterChain chain = (request, response) -> {
            capturedRequestId[0] = MDC.get(RequestLoggingFilter.MDC_REQUEST_ID);
            capturedCorrelationId[0] = MDC.get(RequestLoggingFilter.MDC_CORRELATION_ID);
            assertThat(MDC.get(RequestLoggingFilter.MDC_TENANT_ID)).isNull();
            assertThat(MDC.get(RequestLoggingFilter.MDC_USER_ID)).isNull();
        };

        filter.doFilter(req, res, chain);

        assertThat(capturedRequestId[0]).isNotBlank();
        assertThat(UUID.fromString(capturedRequestId[0])).isNotNull();
        assertThat(capturedCorrelationId[0]).isEqualTo(capturedRequestId[0]);
        assertThat(res.getHeader(RequestLoggingFilter.REQUEST_ID_HEADER))
                .isEqualTo(capturedRequestId[0]);
    }

    @Test
    void clearsMdcEvenWhenChainThrows() {
        TenantContext.setCurrentTenant(UUID.randomUUID());
        UserContext.setCurrentUser(UUID.randomUUID());
        MockHttpServletRequest req = new MockHttpServletRequest("GET", "/api/v1/jobs");
        MockHttpServletResponse res = new MockHttpServletResponse();
        FilterChain chain = (request, response) -> {
            throw new IllegalStateException("boom");
        };

        try {
            filter.doFilter(req, res, chain);
        } catch (Exception expected) {
            // intentional
        }

        assertThat(MDC.get(RequestLoggingFilter.MDC_REQUEST_ID)).isNull();
        assertThat(MDC.get(RequestLoggingFilter.MDC_CORRELATION_ID)).isNull();
        assertThat(MDC.get(RequestLoggingFilter.MDC_TENANT_ID)).isNull();
        assertThat(MDC.get(RequestLoggingFilter.MDC_USER_ID)).isNull();
    }
}
