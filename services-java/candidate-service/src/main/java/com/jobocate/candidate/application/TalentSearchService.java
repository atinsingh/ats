package com.jobocate.candidate.application;

import com.jobocate.platform.tenant.TenantContext;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Searches the firm's own candidates for a job's must-haves. Tenant-scoped from trusted auth, and
 * only people who agreed to be searchable are considered; deleted profiles never are.
 *
 * <p>Each title list and each skill group counts as one must-have: it is found when any of its
 * terms appears in the person's headline, desired role, summary, work history or parsed resume
 * skills. An exclude term in the headline or desired role leaves the person out. This ranks; it
 * never contacts or decides about anyone.
 */
@Service
public class TalentSearchService {

    public static final int MAX_LIMIT = 50;
    /** How many of the most recently updated profiles are scanned per search. */
    static final int SCAN = 2000;

    private final NamedParameterJdbcTemplate jdbc;

    public TalentSearchService(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public record Query(List<String> titles, List<List<String>> skills, List<String> exclude, Integer limit) {}

    public record Match(
            String id,
            String fullName,
            String headline,
            String locationCity,
            String locationRegion,
            String availability,
            int found,
            int of,
            Instant updatedAt) {}

    private record Row(
            String id,
            String fullName,
            String headline,
            String city,
            String region,
            String availability,
            Instant updatedAt,
            String role,
            String haystack) {}

    private static final String SQL =
            """
            SELECT c.id, c.full_name, c.headline, c.location_city, c.location_region, c.availability,
                   c.updated_at,
                   lower(concat_ws(' ', c.headline, c.desired_role)) AS role,
                   lower(concat_ws(' ', c.headline, c.desired_role, c.summary,
                       (SELECT string_agg(w.title || ' ' || array_to_string(w.skills, ' '), ' ')
                          FROM candidate_work_experiences w WHERE w.candidate_profile_id = c.id),
                       (SELECT string_agg(array_to_string(r.skills, ' '), ' ')
                          FROM resume_parsed_fields r WHERE r.candidate_profile_id = c.id))) AS haystack
            FROM candidate_profiles c
            WHERE c.tenant_id = :tenant AND c.deleted_at IS NULL AND c.consent_searchable
            ORDER BY c.updated_at DESC
            LIMIT :scan
            """;

    private static List<String> clean(List<String> terms) {
        if (terms == null) return List.of();
        return terms.stream()
                .filter(t -> t != null && !t.isBlank())
                .map(t -> t.trim().toLowerCase(Locale.ROOT))
                .distinct()
                .toList();
    }

    @Transactional(readOnly = true)
    public List<Match> search(Query q) {
        UUID tenant = TenantContext.requireTenant();
        List<String> titles = clean(q.titles());
        List<List<String>> groups =
                (q.skills() == null ? List.<List<String>>of() : q.skills())
                        .stream()
                        .map(TalentSearchService::clean)
                        .filter(g -> !g.isEmpty())
                        .toList();
        List<String> exclude = clean(q.exclude());
        int of = (titles.isEmpty() ? 0 : 1) + groups.size();
        if (of == 0) return List.of();
        int limit = Math.max(1, Math.min(q.limit() == null ? 25 : q.limit(), MAX_LIMIT));

        List<Row> rows =
                jdbc.query(
                        SQL,
                        new MapSqlParameterSource().addValue("tenant", tenant).addValue("scan", SCAN),
                        (rs, i) ->
                                new Row(
                                        rs.getString("id"),
                                        rs.getString("full_name"),
                                        rs.getString("headline"),
                                        rs.getString("location_city"),
                                        rs.getString("location_region"),
                                        rs.getString("availability"),
                                        rs.getTimestamp("updated_at").toInstant(),
                                        rs.getString("role"),
                                        rs.getString("haystack")));

        List<Match> out = new ArrayList<>();
        for (Row r : rows) {
            String hay = r.haystack() == null ? "" : r.haystack();
            String role = r.role() == null ? "" : r.role();
            if (exclude.stream().anyMatch(role::contains)) continue;
            int found = 0;
            if (!titles.isEmpty() && titles.stream().anyMatch(hay::contains)) found++;
            for (List<String> g : groups) if (g.stream().anyMatch(hay::contains)) found++;
            if (found == 0) continue;
            out.add(
                    new Match(
                            r.id(),
                            r.fullName(),
                            r.headline(),
                            r.city(),
                            r.region(),
                            r.availability(),
                            found,
                            of,
                            r.updatedAt()));
        }
        out.sort(
                Comparator.comparingInt(Match::found)
                        .reversed()
                        .thenComparing(Match::updatedAt, Comparator.reverseOrder()));
        return out.size() > limit ? out.subList(0, limit) : out;
    }
}
