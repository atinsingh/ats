package com.jobocate.searchorch.infrastructure.kafka;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatusCode;
import org.springframework.kafka.annotation.DltHandler;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.annotation.RetryableTopic;
import org.springframework.kafka.retrytopic.DltStrategy;
import org.springframework.kafka.support.KafkaHeaders;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.retry.annotation.Backoff;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

/**
 * Drains job lifecycle events emitted by job-service into the OpenSearch
 * index served by search-gateway.
 *
 * <p>Event sources:
 *
 * <ul>
 *   <li>Outbox payloads (preferred): {@code job.upserted}, {@code job.published},
 *       {@code job.unpublished}, {@code job.closed}.
 *   <li>Legacy direct payloads: {@code JOB_UPSERTED} (the old single-shot
 *       publisher kept for backward compatibility during the migration).
 * </ul>
 *
 * <p>Failure handling: transient HTTP/5xx errors and timeouts go through the
 * Spring Kafka retry topic with exponential backoff (3 attempts) before
 * landing in the DLT. Validation failures (4xx) are logged and dropped to
 * keep the stream moving — those rows must be fixed at the source.
 */
@Component
public class JobSearchProjectionListener {

    private static final Logger log = LoggerFactory.getLogger(JobSearchProjectionListener.class);

    private final RestClient searchGateway;
    private final ObjectMapper json;
    private final String internalIndexToken;
    private final Counter eventsAccepted;
    private final Counter eventsDropped;
    private final Counter eventsRetried;
    private final Counter eventsDeadLetter;

    public JobSearchProjectionListener(
            RestClient searchGatewayRestClient,
            ObjectMapper json,
            @Value("${jobocate.search-gateway.internal-token}") String internalIndexToken,
            MeterRegistry meters) {
        this.searchGateway = searchGatewayRestClient;
        this.json = json;
        this.internalIndexToken = internalIndexToken;
        this.eventsAccepted = meters.counter("jobocate.search.indexing.events", "outcome", "accepted");
        this.eventsDropped = meters.counter("jobocate.search.indexing.events", "outcome", "dropped");
        this.eventsRetried = meters.counter("jobocate.search.indexing.events", "outcome", "retried");
        this.eventsDeadLetter =
                meters.counter("jobocate.search.indexing.events", "outcome", "dead_letter");
    }

    @RetryableTopic(
            attempts = "3",
            backoff = @Backoff(delay = 2000, multiplier = 2.0),
            dltStrategy = DltStrategy.FAIL_ON_ERROR,
            autoCreateTopics = "true")
    @KafkaListener(topics = "${jobocate.kafka.job-events-topic}")
    public void onJobEvent(
            String payload,
            @Header(value = KafkaHeaders.RECEIVED_TOPIC, required = false) String topic,
            @Header(value = KafkaHeaders.RECEIVED_PARTITION, required = false) Integer partition,
            @Header(value = KafkaHeaders.OFFSET, required = false) Long offset) {
        JsonNode node;
        try {
            node = json.readTree(payload);
        } catch (Exception ex) {
            // Bad JSON is a permanent error — drop, do not retry.
            log.error(
                    "search_index_bad_payload topic={} partition={} offset={} error={}",
                    topic,
                    partition,
                    offset,
                    ex.getMessage());
            eventsDropped.increment();
            return;
        }

        String type = textOrEmpty(node, "type");
        if (type.isEmpty()) {
            log.warn("search_index_missing_type partition={} offset={}", partition, offset);
            eventsDropped.increment();
            return;
        }

        switch (type) {
            case "job.upserted", "job.published", "JOB_UPSERTED" -> upsert(node);
            case "job.unpublished", "job.closed", "job.archived" -> closeOrDelete(node, type);
            default -> {
                log.debug("search_index_ignored_event type={}", type);
                eventsDropped.increment();
            }
        }
    }

    @DltHandler
    public void onDeadLetter(
            String payload,
            @Header(value = KafkaHeaders.ORIGINAL_TOPIC, required = false) String origTopic,
            @Header(value = KafkaHeaders.EXCEPTION_MESSAGE, required = false) String reason) {
        eventsDeadLetter.increment();
        // Persist DLT events so on-call has a record beyond Kafka retention.
        log.error(
                "search_index_dlt orig_topic={} reason={} payload={}",
                origTopic,
                reason,
                truncate(payload, 4000));
    }

    private void upsert(JsonNode node) {
        Map<String, Object> doc = buildIndexDocument(node);
        if (doc == null) {
            eventsDropped.increment();
            return;
        }
        try {
            searchGateway
                    .post()
                    .uri("/internal/v1/index/jobs")
                    .headers(h -> h.set("X-Internal-Token", internalIndexToken))
                    .body(doc)
                    .retrieve()
                    .toBodilessEntity();
            eventsAccepted.increment();
        } catch (RestClientResponseException ex) {
            HttpStatusCode status = ex.getStatusCode();
            if (status.is4xxClientError()) {
                log.warn(
                        "search_index_validation_failed status={} body={} job_id={}",
                        status.value(),
                        truncate(ex.getResponseBodyAsString(), 1000),
                        textOrEmpty(node, "job_id"));
                eventsDropped.increment();
                return;
            }
            eventsRetried.increment();
            throw ex;
        } catch (Exception ex) {
            eventsRetried.increment();
            throw ex;
        }
    }

    private void closeOrDelete(JsonNode node, String type) {
        // For now keep the document and just flip status; a "DELETE on close"
        // policy can be enabled per-tenant later. Either way, the gateway
        // applies status=PUBLISHED filtering on public search.
        Map<String, Object> doc = buildIndexDocument(node);
        if (doc == null) {
            eventsDropped.increment();
            return;
        }
        if ("job.closed".equals(type) || "job.archived".equals(type)) {
            doc.put("status", "CLOSED".equals(textOrEmpty(node, "status"))
                    ? "CLOSED" : "ARCHIVED");
        } else {
            doc.put("status", "DRAFT");
        }
        try {
            searchGateway
                    .post()
                    .uri("/internal/v1/index/jobs")
                    .headers(h -> h.set("X-Internal-Token", internalIndexToken))
                    .body(doc)
                    .retrieve()
                    .toBodilessEntity();
            eventsAccepted.increment();
        } catch (RestClientResponseException ex) {
            if (ex.getStatusCode().is4xxClientError()) {
                eventsDropped.increment();
                return;
            }
            eventsRetried.increment();
            throw ex;
        } catch (Exception ex) {
            eventsRetried.increment();
            throw ex;
        }
    }

    /**
     * Translates a job event payload (from the outbox) into a document that
     * matches {@code packages/shared-contracts/schemas/job-index-document.schema.json}.
     * Returns {@code null} when required fields are missing.
     */
    Map<String, Object> buildIndexDocument(JsonNode node) {
        String tenantId = textOrEmpty(node, "tenant_id");
        String jobId = textOrEmpty(node, "job_id");
        String title = textOrEmpty(node, "title");
        String status = textOrEmpty(node, "status");
        if (tenantId.isEmpty() || jobId.isEmpty() || title.isEmpty() || status.isEmpty()) {
            log.warn(
                    "search_index_missing_required tenant={} job={} title_present={} status_present={}",
                    tenantId,
                    jobId,
                    !title.isEmpty(),
                    !status.isEmpty());
            return null;
        }
        if (!isAllowedStatus(status)) {
            // Tolerate the legacy 'OPEN' value emitted by the prior Kafka publisher.
            if ("OPEN".equals(status)) {
                status = "PUBLISHED";
            } else {
                log.warn("search_index_unknown_status status={}", status);
                return null;
            }
        }

        Map<String, Object> doc = new LinkedHashMap<>();
        doc.put("tenant_id", tenantId);
        doc.put("job_id", jobId);
        doc.put("title", title);
        doc.put("status", status);

        putIfText(doc, "organization_id", node, "organization_id");
        putIfText(doc, "slug", node, "slug");
        putIfText(doc, "company_name", node, "company_name");

        // Description: prefer description_text, fall back to legacy description.
        String descText = textOrEmpty(node, "description_text");
        if (descText.isEmpty()) {
            descText = textOrEmpty(node, "description");
        }
        if (!descText.isEmpty()) {
            doc.put("description_text", descText);
        }

        putIfText(doc, "department", node, "department");
        putIfText(doc, "industry", node, "industry");
        putIfText(doc, "employment_type", node, "employment_type");
        putIfText(doc, "remote_policy", node, "remote_policy");
        putIfText(doc, "location", node, "location");

        // location_country/region/city ➜ schema-canonical country/region/city.
        String country = firstNonEmpty(textOrEmpty(node, "country"), textOrEmpty(node, "location_country"));
        if (!country.isEmpty()) {
            doc.put("country", country);
        }
        String region = firstNonEmpty(textOrEmpty(node, "region"), textOrEmpty(node, "location_region"));
        if (!region.isEmpty()) {
            doc.put("region", region);
        }
        String city = firstNonEmpty(textOrEmpty(node, "city"), textOrEmpty(node, "location_city"));
        if (!city.isEmpty()) {
            doc.put("city", city);
        }

        // currency_code ➜ schema-canonical currency.
        String currency = firstNonEmpty(textOrEmpty(node, "currency"), textOrEmpty(node, "currency_code"));
        if (!currency.isEmpty()) {
            doc.put("currency", currency);
            doc.put("currency_code", currency);
        }

        if (node.path("salary_min_cents").isNumber()) {
            doc.put("salary_min_cents", node.path("salary_min_cents").longValue());
        }
        if (node.path("salary_max_cents").isNumber()) {
            doc.put("salary_max_cents", node.path("salary_max_cents").longValue());
        }
        if (node.path("experience_min_years").isNumber()) {
            doc.put("experience_min_years", node.path("experience_min_years").intValue());
        }
        if (node.path("experience_max_years").isNumber()) {
            doc.put("experience_max_years", node.path("experience_max_years").intValue());
        }
        if (node.path("boost_score").isNumber()) {
            doc.put("boost_score", node.path("boost_score").intValue());
        }

        JsonNode skills = node.path("skills");
        if (skills.isArray()) {
            List<String> out = new ArrayList<>(skills.size());
            for (JsonNode s : skills) {
                if (s.isTextual()) {
                    String v = s.asText().trim();
                    if (!v.isEmpty()) {
                        out.add(v.toLowerCase());
                    }
                }
            }
            doc.put("skills", out);
        }

        putIfText(doc, "published_at", node, "published_at");
        putIfText(doc, "closed_at", node, "closed_at");

        // facets is supplied verbatim if present.
        JsonNode facets = node.path("facets");
        if (facets.isObject()) {
            Map<String, Object> facetMap = new HashMap<>();
            facets.fields().forEachRemaining(e -> facetMap.put(e.getKey(), e.getValue().asText()));
            doc.put("facets", facetMap);
        }

        return doc;
    }

    private static boolean isAllowedStatus(String status) {
        return "DRAFT".equals(status)
                || "PUBLISHED".equals(status)
                || "CLOSED".equals(status)
                || "ARCHIVED".equals(status);
    }

    private static String firstNonEmpty(String a, String b) {
        return (a == null || a.isEmpty()) ? (b == null ? "" : b) : a;
    }

    private static String textOrEmpty(JsonNode node, String field) {
        JsonNode v = node.path(field);
        return (v.isTextual() ? v.asText() : "").trim();
    }

    private static void putIfText(Map<String, Object> doc, String key, JsonNode node, String field) {
        String s = textOrEmpty(node, field);
        if (!s.isEmpty()) {
            doc.put(key, s);
        }
    }

    private static String truncate(String s, int max) {
        if (s == null) {
            return "";
        }
        return s.length() <= max ? s : s.substring(0, max);
    }
}
