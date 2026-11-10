package com.jobocate.platform.security;

import static org.assertj.core.api.Assertions.assertThat;

import com.jobocate.platform.tenant.TenantContext;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.servlet.FilterChain;
import jakarta.servlet.http.HttpServletResponse;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.List;
import java.util.UUID;
import javax.crypto.SecretKey;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

class TenantIdentityFilterTest {

    private static final byte[] SECRET = "test-secret-must-be-32-bytes-or-more!".getBytes(StandardCharsets.UTF_8);

    @AfterEach
    void clear() {
        TenantContext.clear();
        UserContext.clear();
        SecurityContextHolder.clearContext();
    }

    @Test
    void rejectsRequestWithoutTokenWhenDevHeaderDisabled() throws Exception {
        OncePerRequestFilter filter = new TenantIdentityFilter(SECRET, false);
        MockHttpServletRequest req = new MockHttpServletRequest("GET", "/api/v1/jobs");
        MockHttpServletResponse res = new MockHttpServletResponse();
        FilterChain chain = noopChain();
        filter.doFilter(req, res, chain);
        assertThat(res.getStatus()).isEqualTo(HttpServletResponse.SC_UNAUTHORIZED);
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        assertThat(TenantContext.currentTenantOrNull()).isNull();
    }

    @Test
    void resolvesTenantUserAndRolesFromValidJwt() throws Exception {
        UUID tenant = UUID.randomUUID();
        UUID user = UUID.randomUUID();
        SecretKey key = Keys.hmacShaKeyFor(SECRET);
        Instant now = Instant.now();
        String token =
                Jwts.builder()
                        .subject(user.toString())
                        .issuedAt(Date.from(now))
                        .expiration(Date.from(now.plusSeconds(60)))
                        .claim("tenant_id", tenant.toString())
                        .claim("roles", List.of("RECRUITER", "TENANT_ADMIN"))
                        .signWith(key)
                        .compact();

        OncePerRequestFilter filter = new TenantIdentityFilter(SECRET, false);
        MockHttpServletRequest req = new MockHttpServletRequest("GET", "/api/v1/jobs");
        req.addHeader("Authorization", "Bearer " + token);
        MockHttpServletResponse res = new MockHttpServletResponse();

        boolean[] downstream = new boolean[1];
        FilterChain chain =
                (rq, rs) -> {
                    downstream[0] = true;
                    JobocateAuthentication auth =
                            (JobocateAuthentication)
                                    SecurityContextHolder.getContext().getAuthentication();
                    assertThat(auth).isNotNull();
                    assertThat(auth.tenantId()).isEqualTo(tenant);
                    assertThat(auth.userId()).isEqualTo(user);
                    assertThat(auth.roles())
                            .containsExactlyInAnyOrder(Role.RECRUITER, Role.TENANT_ADMIN);
                    assertThat(auth.hasRole(Role.RECRUITER)).isTrue();
                    assertThat(TenantContext.currentTenantOrNull()).isEqualTo(tenant);
                    assertThat(UserContext.currentUserOrNull()).isEqualTo(user);
                };
        filter.doFilter(req, res, chain);
        assertThat(downstream[0]).isTrue();
        assertThat(res.getStatus()).isEqualTo(HttpServletResponse.SC_OK);
    }

    @Test
    void devHeaderGrantsAllRolesByDefault() throws Exception {
        UUID tenant = UUID.randomUUID();
        OncePerRequestFilter filter = new TenantIdentityFilter(SECRET, true);
        MockHttpServletRequest req = new MockHttpServletRequest("POST", "/api/v1/applications");
        req.addHeader(TenantIdentityFilter.DEV_TENANT_HEADER, tenant.toString());
        MockHttpServletResponse res = new MockHttpServletResponse();

        boolean[] downstream = new boolean[1];
        FilterChain chain =
                (rq, rs) -> {
                    downstream[0] = true;
                    JobocateAuthentication auth =
                            (JobocateAuthentication)
                                    SecurityContextHolder.getContext().getAuthentication();
                    assertThat(auth.tenantId()).isEqualTo(tenant);
                    assertThat(auth.roles()).contains(Role.CANDIDATE, Role.RECRUITER, Role.SUPER_ADMIN);
                };
        filter.doFilter(req, res, chain);
        assertThat(downstream[0]).isTrue();
    }

    @Test
    void devHeaderRespectsExplicitRolesList() throws Exception {
        UUID tenant = UUID.randomUUID();
        OncePerRequestFilter filter = new TenantIdentityFilter(SECRET, true);
        MockHttpServletRequest req = new MockHttpServletRequest("POST", "/api/v1/applications");
        req.addHeader(TenantIdentityFilter.DEV_TENANT_HEADER, tenant.toString());
        req.addHeader(TenantIdentityFilter.DEV_ROLES_HEADER, "CANDIDATE");
        MockHttpServletResponse res = new MockHttpServletResponse();

        boolean[] downstream = new boolean[1];
        FilterChain chain =
                (rq, rs) -> {
                    downstream[0] = true;
                    JobocateAuthentication auth =
                            (JobocateAuthentication)
                                    SecurityContextHolder.getContext().getAuthentication();
                    assertThat(auth.roles()).containsExactly(Role.CANDIDATE);
                };
        filter.doFilter(req, res, chain);
        assertThat(downstream[0]).isTrue();
    }

    @Test
    void invalidJwtReturns401() throws Exception {
        OncePerRequestFilter filter = new TenantIdentityFilter(SECRET, false);
        MockHttpServletRequest req = new MockHttpServletRequest("GET", "/api/v1/jobs");
        req.addHeader("Authorization", "Bearer not.a.real.jwt");
        MockHttpServletResponse res = new MockHttpServletResponse();
        filter.doFilter(req, res, noopChain());
        assertThat(res.getStatus()).isEqualTo(HttpServletResponse.SC_UNAUTHORIZED);
    }

    @Test
    void internalAndActuatorPathsBypassFilter() throws Exception {
        OncePerRequestFilter filter = new TenantIdentityFilter(SECRET, false);
        for (String path : List.of("/actuator/health", "/internal/v1/notifications", "/api/auth/demo-token")) {
            MockHttpServletRequest req = new MockHttpServletRequest("GET", path);
            MockHttpServletResponse res = new MockHttpServletResponse();
            boolean[] downstream = new boolean[1];
            filter.doFilter(req, res, (rq, rs) -> downstream[0] = true);
            assertThat(downstream[0]).as(path).isTrue();
            assertThat(res.getStatus()).as(path).isEqualTo(HttpServletResponse.SC_OK);
        }
    }

    private static FilterChain noopChain() {
        return (rq, rs) -> {};
    }
}
