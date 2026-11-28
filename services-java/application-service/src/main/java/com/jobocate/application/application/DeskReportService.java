package com.jobocate.application.application;

import com.jobocate.platform.tenant.TenantContext;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The desk report: funnel, results by application source, and how people decided on agent drafts,
 * over the last N days. Read-only, and every query is scoped to the tenant from trusted auth.
 *
 * <p>The funnel counts applications that entered in the window by the furthest step they reached,
 * judged from the records a person created: a sent submittal, an interview, an offer, a placement,
 * or the status a person moved the application to.
 */
@Service
public class DeskReportService {

    public static final int MAX_DAYS = 365;

    private final NamedParameterJdbcTemplate jdbc;

    public DeskReportService(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public record Step(String stage, long count) {}

    public record SourceResult(String source, long applications, long submitted, long started) {}

    public record AgentResult(String kind, long proposals, long approved, long rejected) {}

    public record DeskReport(
            int days, Instant since, List<Step> funnel, List<SourceResult> sources, List<AgentResult> agents) {}

    /** Per-application flags for the furthest step reached. Shared by the funnel and sources. */
    private static final String REACHED =
            """
            SELECT a.source,
                   a.status <> 'APPLIED' AS reviewed,
                   EXISTS (SELECT 1 FROM submittals s
                           WHERE s.tenant_id = a.tenant_id AND s.application_id = a.id
                             AND s.submitted_at IS NOT NULL) AS submitted,
                   (a.status IN ('INTERVIEW_SCHEDULED','INTERVIEWED','OFFERED','HIRED')
                    OR EXISTS (SELECT 1 FROM interviews i
                               WHERE i.tenant_id = a.tenant_id AND i.application_id = a.id)) AS interviewed,
                   (a.status IN ('OFFERED','HIRED')
                    OR EXISTS (SELECT 1 FROM offers o
                               WHERE o.tenant_id = a.tenant_id AND o.application_id = a.id)) AS offered,
                   (a.status = 'HIRED'
                    OR EXISTS (SELECT 1 FROM placements p
                               WHERE p.tenant_id = a.tenant_id AND p.application_id = a.id)) AS started
            FROM applications a
            WHERE a.tenant_id = :tenant AND a.status <> 'DRAFT' AND a.applied_at >= :since
            """;

    @Transactional(readOnly = true)
    public DeskReport report(int days) {
        int window = Math.max(1, Math.min(days, MAX_DAYS));
        UUID tenant = TenantContext.requireTenant();
        Instant since = Instant.now().minus(window, ChronoUnit.DAYS);
        var params = new MapSqlParameterSource().addValue("tenant", tenant).addValue("since",
                java.sql.Timestamp.from(since));

        List<Step> funnel =
                jdbc.query(
                        "SELECT count(*) AS applied,"
                                + " count(*) FILTER (WHERE reviewed) AS reviewed,"
                                + " count(*) FILTER (WHERE submitted) AS submitted,"
                                + " count(*) FILTER (WHERE interviewed) AS interviewed,"
                                + " count(*) FILTER (WHERE offered) AS offered,"
                                + " count(*) FILTER (WHERE started) AS started"
                                + " FROM (" + REACHED + ") r",
                        params,
                        (rs, i) ->
                                List.of(
                                        new Step("Applied or sourced", rs.getLong("applied")),
                                        new Step("Reviewed", rs.getLong("reviewed")),
                                        new Step("Submitted", rs.getLong("submitted")),
                                        new Step("Interviewed", rs.getLong("interviewed")),
                                        new Step("Offer", rs.getLong("offered")),
                                        new Step("Started", rs.getLong("started"))))
                        .getFirst();

        List<SourceResult> sources =
                jdbc.query(
                        "SELECT source, count(*) AS applications,"
                                + " count(*) FILTER (WHERE submitted) AS submitted,"
                                + " count(*) FILTER (WHERE started) AS started"
                                + " FROM (" + REACHED + ") r GROUP BY source ORDER BY source",
                        params,
                        (rs, i) ->
                                new SourceResult(
                                        rs.getString("source"),
                                        rs.getLong("applications"),
                                        rs.getLong("submitted"),
                                        rs.getLong("started")));

        List<AgentResult> agents =
                jdbc.query(
                        """
                        SELECT kind, count(*) AS proposals,
                               count(*) FILTER (WHERE status = 'APPROVED') AS approved,
                               count(*) FILTER (WHERE status = 'REJECTED') AS rejected
                        FROM ai_artifacts
                        WHERE tenant_id = :tenant AND created_at >= :since
                          AND status IN ('READY_FOR_REVIEW','APPROVED','REJECTED','ARCHIVED')
                        GROUP BY kind ORDER BY kind
                        """,
                        params,
                        (rs, i) ->
                                new AgentResult(
                                        rs.getString("kind"),
                                        rs.getLong("proposals"),
                                        rs.getLong("approved"),
                                        rs.getLong("rejected")));

        return new DeskReport(window, since, funnel, sources, agents);
    }
}
