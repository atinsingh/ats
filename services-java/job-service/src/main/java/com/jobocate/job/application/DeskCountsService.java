package com.jobocate.job.application;

import com.jobocate.platform.tenant.TenantContext;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Per-desk counts for the Agency view. A job belongs to the desk that owns its client, else to
 * whoever created it. A new client belongs to its owner, else to whoever created it. Read-only and
 * tenant-scoped from trusted auth.
 */
@Service
public class DeskCountsService {

    public static final int MAX_DAYS = 90;

    private final NamedParameterJdbcTemplate jdbc;

    public DeskCountsService(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /** roles: published jobs now. newClients: clients added in the window. */
    public record DeskCounts(UUID userId, long roles, long newClients) {}

    public record DeskCountsReport(int days, Instant since, List<DeskCounts> desks) {}

    @Transactional(readOnly = true)
    public DeskCountsReport counts(int days) {
        int window = Math.max(1, Math.min(days, MAX_DAYS));
        UUID tenant = TenantContext.requireTenant();
        Instant since = Instant.now().minus(window, ChronoUnit.DAYS);
        var p =
                new MapSqlParameterSource()
                        .addValue("tenant", tenant)
                        .addValue("since", Timestamp.from(since));
        List<DeskCounts> desks =
                jdbc.query(
                        """
                        WITH roles AS (
                            SELECT COALESCE(c.owner_user_id, j.created_by_user_id) AS user_id,
                                   count(*) AS n
                            FROM jobs j
                            LEFT JOIN clients c
                              ON c.id = j.organization_id AND c.tenant_id = j.tenant_id
                            WHERE j.tenant_id = :tenant
                              AND j.status = 'PUBLISHED'
                              AND j.deleted_at IS NULL
                            GROUP BY 1
                        ), added AS (
                            SELECT COALESCE(owner_user_id, created_by_user_id) AS user_id,
                                   count(*) AS n
                            FROM clients
                            WHERE tenant_id = :tenant AND created_at >= :since
                            GROUP BY 1
                        )
                        SELECT COALESCE(r.user_id, a.user_id) AS user_id,
                               COALESCE(r.n, 0) AS roles,
                               COALESCE(a.n, 0) AS new_clients
                        FROM roles r
                        FULL OUTER JOIN added a ON a.user_id = r.user_id
                        WHERE COALESCE(r.user_id, a.user_id) IS NOT NULL
                        ORDER BY roles DESC, new_clients DESC
                        """,
                        p,
                        (rs, i) ->
                                new DeskCounts(
                                        rs.getObject("user_id", UUID.class),
                                        rs.getLong("roles"),
                                        rs.getLong("new_clients")));
        return new DeskCountsReport(window, since, desks);
    }
}
