package com.jobocate.auth.api;

import com.jobocate.platform.tenant.TenantContext;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * The people who work at the caller's tenant, for desk names and the Settings screen. Tenant from
 * trusted auth only; recruiter roles only (see SecurityConfig). Candidates are never listed, and
 * nothing about passwords, tokens or MFA leaves this service.
 */
@RestController
@RequestMapping("/api/v1/colleagues")
public class ColleagueController {

    private final NamedParameterJdbcTemplate jdbc;

    public ColleagueController(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public record Colleague(
            UUID id, String displayName, String email, List<String> roles, Instant lastLoginAt) {}

    @GetMapping
    @Transactional(readOnly = true)
    public List<Colleague> list() {
        UUID tenant = TenantContext.requireTenant();
        return jdbc.query(
                """
                SELECT u.id, u.display_name, u.email, u.last_login_at,
                       array_agg(DISTINCT r.role ORDER BY r.role) AS roles
                FROM user_roles r
                JOIN users u ON u.id = r.user_id AND u.deleted_at IS NULL
                WHERE r.tenant_id = :tenant AND r.revoked_at IS NULL
                  AND r.role IN ('RECRUITER','HIRING_MANAGER','TENANT_ADMIN')
                GROUP BY u.id, u.display_name, u.email, u.last_login_at
                ORDER BY lower(coalesce(u.display_name, u.email))
                """,
                new MapSqlParameterSource("tenant", tenant),
                (rs, i) ->
                        new Colleague(
                                rs.getObject("id", UUID.class),
                                rs.getString("display_name"),
                                rs.getString("email"),
                                List.of((String[]) rs.getArray("roles").getArray()),
                                rs.getTimestamp("last_login_at") == null
                                        ? null
                                        : rs.getTimestamp("last_login_at").toInstant()));
    }
}
