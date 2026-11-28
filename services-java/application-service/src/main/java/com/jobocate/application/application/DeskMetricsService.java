package com.jobocate.application.application;

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
 * Per-desk counts for the Agency view, plus candidates two desks have both put forward to the same
 * client. A desk is the user who owns the work. Read-only and tenant-scoped from trusted auth.
 */
@Service
public class DeskMetricsService {

    public static final int MAX_DAYS = 90;

    private final NamedParameterJdbcTemplate jdbc;

    public DeskMetricsService(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /** Counts in the window, except queue, which is everything waiting now. */
    public record DeskCounts(UUID userId, long submittals, long interviews, long starts, long queue) {}

    /** The same candidate put forward to the same client by more than one desk, still open. */
    public record Duplicate(UUID candidateProfileId, UUID clientId, List<UUID> ownerUserIds) {}

    public record DeskMetrics(int days, Instant since, List<DeskCounts> desks, List<Duplicate> duplicates) {}

    @Transactional(readOnly = true)
    public DeskMetrics metrics(int days) {
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
                        WITH owner_of AS (
                          SELECT DISTINCT ON (s.application_id) s.application_id, s.owner_user_id
                          FROM submittals s
                          WHERE s.tenant_id = :tenant AND s.owner_user_id IS NOT NULL
                          ORDER BY s.application_id, s.created_at DESC
                        ),
                        events AS (
                          SELECT s.owner_user_id AS user_id, 1 AS sub, 0 AS itv, 0 AS st, 0 AS q
                          FROM submittals s
                          WHERE s.tenant_id = :tenant AND s.submitted_at >= :since
                            AND s.owner_user_id IS NOT NULL
                          UNION ALL
                          SELECT COALESCE(o.owner_user_id, a.created_by_user_id), 0, 1, 0, 0
                          FROM interviews i
                          JOIN applications a ON a.id = i.application_id AND a.tenant_id = i.tenant_id
                          LEFT JOIN owner_of o ON o.application_id = i.application_id
                          WHERE i.tenant_id = :tenant AND i.scheduled_start >= :since
                            AND i.status <> 'CANCELLED'
                          UNION ALL
                          SELECT pl.owner_user_id, 0, 0, 1, 0
                          FROM placements pl
                          WHERE pl.tenant_id = :tenant AND pl.owner_user_id IS NOT NULL
                            AND pl.start_date >= CAST(:since AS date)
                            AND pl.start_date <= CURRENT_DATE
                          UNION ALL
                          SELECT x.requested_by_user_id, 0, 0, 0, 1
                          FROM ai_artifacts x
                          WHERE x.tenant_id = :tenant AND x.status = 'READY_FOR_REVIEW'
                            AND x.requested_by_user_id IS NOT NULL
                        )
                        SELECT user_id, sum(sub) AS submittals, sum(itv) AS interviews,
                               sum(st) AS starts, sum(q) AS queue
                        FROM events WHERE user_id IS NOT NULL
                        GROUP BY user_id ORDER BY user_id
                        """,
                        p,
                        (rs, i) ->
                                new DeskCounts(
                                        rs.getObject("user_id", UUID.class),
                                        rs.getLong("submittals"),
                                        rs.getLong("interviews"),
                                        rs.getLong("starts"),
                                        rs.getLong("queue")));

        List<Duplicate> duplicates =
                jdbc.query(
                        """
                        SELECT candidate_profile_id, client_id,
                               array_agg(DISTINCT owner_user_id) AS owners
                        FROM submittals
                        WHERE tenant_id = :tenant AND client_id IS NOT NULL
                          AND owner_user_id IS NOT NULL
                          AND status NOT IN ('WITHDRAWN','CLIENT_PASSED')
                        GROUP BY candidate_profile_id, client_id
                        HAVING count(DISTINCT owner_user_id) > 1
                        ORDER BY candidate_profile_id
                        """,
                        p,
                        (rs, i) ->
                                new Duplicate(
                                        rs.getObject("candidate_profile_id", UUID.class),
                                        rs.getObject("client_id", UUID.class),
                                        List.of((UUID[]) rs.getArray("owners").getArray())));

        return new DeskMetrics(window, since, desks, duplicates);
    }
}
