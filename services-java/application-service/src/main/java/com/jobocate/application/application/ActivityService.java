package com.jobocate.application.application;

import com.jobocate.platform.tenant.TenantContext;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The recruiter activity log, read-only and newest first. It is assembled from records that already
 * exist, all scoped to the tenant from trusted auth:
 *
 * <ul>
 *   <li>application timeline entries (status changes, notes, interviews and so on);
 *   <li>AI drafts becoming ready, failing, and being approved or rejected by a person;
 *   <li>submittals a person approved as sent.
 * </ul>
 */
@Service
public class ActivityService {

    public static final int MAX_LIMIT = 500;

    private final NamedParameterJdbcTemplate jdbc;

    public ActivityService(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /** Who acted: a person, an AI agent, or the system. */
    public enum ActorKind {
        PERSON,
        AGENT,
        SYSTEM
    }

    public record ActivityEvent(
            String id,
            Instant at,
            ActorKind actorKind,
            UUID actorUserId,
            String code,
            String fromValue,
            String toValue,
            String detail,
            String reason,
            UUID applicationId,
            UUID candidateProfileId,
            UUID jobId) {}

    private static final String SQL =
            """
            SELECT * FROM (
              SELECT 't-' || t.id AS id, t.created_at AS at,
                     CASE WHEN t.actor_user_id IS NOT NULL OR t.actor_role IS NOT NULL
                          THEN 'PERSON' ELSE 'SYSTEM' END AS actor_kind,
                     t.actor_user_id, t.entry_type AS code, t.from_value, t.to_value,
                     t.summary AS detail, NULL AS reason,
                     a.id AS application_id, a.candidate_profile_id, a.job_id
              FROM application_timeline_entries t
              JOIN applications a ON a.id = t.application_id AND a.tenant_id = t.tenant_id
              WHERE t.tenant_id = :tenant

              UNION ALL
              SELECT 'r-' || x.id, x.ready_at, 'AGENT', NULL, 'DRAFT_READY', NULL, NULL, x.kind, NULL,
                     a.id, COALESCE(a.candidate_profile_id,
                         CASE WHEN x.subject_entity_type = 'CANDIDATE_PROFILE' THEN x.subject_entity_id END),
                     COALESCE(a.job_id, x.related_job_id)
              FROM ai_artifacts x
              LEFT JOIN applications a ON a.id = x.related_application_id AND a.tenant_id = x.tenant_id
              WHERE x.tenant_id = :tenant AND x.ready_at IS NOT NULL

              UNION ALL
              SELECT 'f-' || x.id, x.updated_at, 'AGENT', NULL, 'DRAFT_FAILED', NULL, NULL, x.kind,
                     x.failure_reason,
                     a.id, COALESCE(a.candidate_profile_id,
                         CASE WHEN x.subject_entity_type = 'CANDIDATE_PROFILE' THEN x.subject_entity_id END),
                     COALESCE(a.job_id, x.related_job_id)
              FROM ai_artifacts x
              LEFT JOIN applications a ON a.id = x.related_application_id AND a.tenant_id = x.tenant_id
              WHERE x.tenant_id = :tenant AND x.status = 'FAILED'

              UNION ALL
              SELECT 'a-' || x.id, x.approved_at, 'PERSON', x.approved_by_user_id, 'DRAFT_APPROVED',
                     NULL, NULL, x.kind, NULL,
                     a.id, COALESCE(a.candidate_profile_id,
                         CASE WHEN x.subject_entity_type = 'CANDIDATE_PROFILE' THEN x.subject_entity_id END),
                     COALESCE(a.job_id, x.related_job_id)
              FROM ai_artifacts x
              LEFT JOIN applications a ON a.id = x.related_application_id AND a.tenant_id = x.tenant_id
              WHERE x.tenant_id = :tenant AND x.approved_at IS NOT NULL

              UNION ALL
              SELECT 'x-' || x.id, x.rejected_at, 'PERSON', x.rejected_by_user_id, 'DRAFT_REJECTED',
                     NULL, NULL, x.kind, x.rejection_reason,
                     a.id, COALESCE(a.candidate_profile_id,
                         CASE WHEN x.subject_entity_type = 'CANDIDATE_PROFILE' THEN x.subject_entity_id END),
                     COALESCE(a.job_id, x.related_job_id)
              FROM ai_artifacts x
              LEFT JOIN applications a ON a.id = x.related_application_id AND a.tenant_id = x.tenant_id
              WHERE x.tenant_id = :tenant AND x.rejected_at IS NOT NULL

              UNION ALL
              SELECT 's-' || s.id, s.submitted_at, 'PERSON', s.approved_by_user_id, 'SUBMITTAL_APPROVED',
                     NULL, NULL, s.channel, NULL, s.application_id, s.candidate_profile_id, s.job_id
              FROM submittals s
              WHERE s.tenant_id = :tenant AND s.submitted_at IS NOT NULL
            ) e
            ORDER BY at DESC, id
            LIMIT :limit
            """;

    @Transactional(readOnly = true)
    public List<ActivityEvent> recent(int limit) {
        UUID tenant = TenantContext.requireTenant();
        var params =
                new MapSqlParameterSource()
                        .addValue("tenant", tenant)
                        .addValue("limit", Math.max(1, Math.min(limit, MAX_LIMIT)));
        return jdbc.query(
                SQL,
                params,
                (rs, i) ->
                        new ActivityEvent(
                                rs.getString("id"),
                                rs.getTimestamp("at").toInstant(),
                                ActorKind.valueOf(rs.getString("actor_kind")),
                                rs.getObject("actor_user_id", UUID.class),
                                rs.getString("code"),
                                rs.getString("from_value"),
                                rs.getString("to_value"),
                                rs.getString("detail"),
                                rs.getString("reason"),
                                rs.getObject("application_id", UUID.class),
                                rs.getObject("candidate_profile_id", UUID.class),
                                rs.getObject("job_id", UUID.class)));
    }
}
