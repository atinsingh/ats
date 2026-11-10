package com.jobocate.job.infrastructure.events;

import com.jobocate.job.domain.model.Job;
import com.jobocate.job.domain.ports.JobEventPublisher;
import com.jobocate.job.infrastructure.persistence.EventOutboxEntity;
import com.jobocate.job.infrastructure.persistence.EventOutboxJpaRepository;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Domain-port adapter that writes job lifecycle events into the
 * {@code job_event_outbox} table within the same DB transaction. The
 * {@link OutboxPublisher} drains the table to Kafka.
 */
@Component
public class OutboxJobEventPublisher implements JobEventPublisher {

    private final EventOutboxJpaRepository outbox;
    private final String topic;

    public OutboxJobEventPublisher(
            EventOutboxJpaRepository outbox,
            @Value("${jobocate.kafka.job-events-topic:jobocate.job.events}") String topic) {
        this.outbox = outbox;
        this.topic = topic;
    }

    @Override
    public void publishJobUpserted(Job job) {
        enqueue(job, "job.upserted");
    }

    @Override
    public void publishJobPublished(Job job) {
        enqueue(job, "job.published");
    }

    @Override
    public void publishJobUnpublished(Job job) {
        enqueue(job, "job.unpublished");
    }

    @Override
    public void publishJobClosed(Job job) {
        enqueue(job, "job.closed");
    }

    private void enqueue(Job job, String eventType) {
        EventOutboxEntity row = new EventOutboxEntity();
        row.setId(UUID.randomUUID());
        row.setAggregateType("Job");
        row.setAggregateId(job.id());
        row.setTenantId(job.tenantId());
        row.setEventType(eventType);
        row.setTopic(topic);
        row.setPartitionKey(job.id().toString());
        row.setCreatedAt(Instant.now());

        Map<String, Object> payload = new HashMap<>();
        payload.put("type", eventType);
        payload.put("schema_version", "v1");
        payload.put("event_id", row.getId().toString());
        payload.put("occurred_at", Instant.now().toString());
        payload.put("tenant_id", job.tenantId().toString());
        payload.put("job_id", job.id().toString());
        payload.put("status", job.status().name());
        if (job.organizationId() != null) {
            payload.put("organization_id", job.organizationId().toString());
        }
        payload.put("title", job.title());
        if (job.slug() != null) {
            payload.put("slug", job.slug());
        }
        if (job.description() != null) {
            payload.put("description", job.description());
        }
        if (job.responsibilities() != null) {
            payload.put("responsibilities", job.responsibilities());
        }
        if (job.qualifications() != null) {
            payload.put("qualifications", job.qualifications());
        }
        if (job.department() != null) {
            payload.put("department", job.department());
        }
        if (job.employmentType() != null) {
            payload.put("employment_type", job.employmentType());
        }
        if (job.remotePolicy() != null) {
            payload.put("remote_policy", job.remotePolicy());
        }
        if (job.experienceMinYears() != null) {
            payload.put("experience_min_years", job.experienceMinYears());
        }
        if (job.experienceMaxYears() != null) {
            payload.put("experience_max_years", job.experienceMaxYears());
        }
        if (job.salaryMinCents() != null) {
            payload.put("salary_min_cents", job.salaryMinCents());
        }
        if (job.salaryMaxCents() != null) {
            payload.put("salary_max_cents", job.salaryMaxCents());
        }
        if (job.currencyCode() != null) {
            payload.put("currency_code", job.currencyCode());
        }
        if (job.location() != null) {
            payload.put("location", job.location());
        }
        if (job.locationCity() != null) {
            payload.put("location_city", job.locationCity());
        }
        if (job.locationRegion() != null) {
            payload.put("location_region", job.locationRegion());
        }
        if (job.locationCountry() != null) {
            payload.put("location_country", job.locationCountry());
        }
        if (job.publishedAt() != null) {
            payload.put("published_at", job.publishedAt().toString());
        }
        if (job.closedAt() != null) {
            payload.put("closed_at", job.closedAt().toString());
        }
        payload.put("boost_score", job.boostScore());
        payload.put("skills", job.skills() == null ? java.util.List.of() : job.skills());
        row.setPayload(payload);

        Map<String, String> headers = new HashMap<>();
        String correlationId = MDC.get("correlationId");
        if (correlationId != null) {
            headers.put("X-Correlation-Id", correlationId);
            try {
                row.setCorrelationId(UUID.fromString(correlationId));
            } catch (IllegalArgumentException ignored) {
                // correlation IDs do not have to be UUIDs at the wire boundary
            }
        }
        row.setHeaders(headers);

        outbox.save(row);
    }
}
