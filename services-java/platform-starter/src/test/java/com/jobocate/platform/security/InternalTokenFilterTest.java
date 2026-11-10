package com.jobocate.platform.security;

import static org.assertj.core.api.Assertions.assertThat;

import jakarta.servlet.FilterChain;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;

class InternalTokenFilterTest {

    @AfterEach
    void clear() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void grantsSuperAdminAuthorityWhenTokenMatches() throws Exception {
        InternalTokenFilter filter = new InternalTokenFilter("the-token");
        MockHttpServletRequest req = new MockHttpServletRequest("POST", "/internal/v1/notifications");
        req.addHeader("Authorization", "Bearer the-token");
        MockHttpServletResponse res = new MockHttpServletResponse();

        boolean[] downstream = new boolean[1];
        FilterChain chain =
                (rq, rs) -> {
                    downstream[0] = true;
                    JobocateAuthentication auth =
                            (JobocateAuthentication)
                                    SecurityContextHolder.getContext().getAuthentication();
                    assertThat(auth).isNotNull();
                    assertThat(auth.hasRole(Role.SUPER_ADMIN)).isTrue();
                    assertThat(auth.tenantId()).isNull();
                };
        filter.doFilter(req, res, chain);
        assertThat(downstream[0]).isTrue();
    }

    @Test
    void rejectsMissingHeader() throws Exception {
        InternalTokenFilter filter = new InternalTokenFilter("the-token");
        MockHttpServletRequest req = new MockHttpServletRequest("POST", "/internal/v1/notifications");
        MockHttpServletResponse res = new MockHttpServletResponse();
        filter.doFilter(req, res, (rq, rs) -> {});
        assertThat(res.getStatus()).isEqualTo(HttpServletResponse.SC_UNAUTHORIZED);
    }

    @Test
    void rejectsWrongToken() throws Exception {
        InternalTokenFilter filter = new InternalTokenFilter("the-token");
        MockHttpServletRequest req = new MockHttpServletRequest("POST", "/internal/v1/notifications");
        req.addHeader("Authorization", "Bearer not-the-token");
        MockHttpServletResponse res = new MockHttpServletResponse();
        filter.doFilter(req, res, (rq, rs) -> {});
        assertThat(res.getStatus()).isEqualTo(HttpServletResponse.SC_UNAUTHORIZED);
    }

    @Test
    void skipsNonInternalPaths() throws Exception {
        InternalTokenFilter filter = new InternalTokenFilter("the-token");
        MockHttpServletRequest req = new MockHttpServletRequest("GET", "/api/v1/jobs");
        MockHttpServletResponse res = new MockHttpServletResponse();
        boolean[] downstream = new boolean[1];
        filter.doFilter(req, res, (rq, rs) -> downstream[0] = true);
        assertThat(downstream[0]).isTrue();
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }
}
