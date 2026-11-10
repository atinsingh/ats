package com.jobocate.notification.infrastructure.kafka;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.jobocate.notification.application.NotificationService;
import com.jobocate.notification.application.NotificationService.EnqueueRequest;
import com.jobocate.notification.infrastructure.persistence.NotificationChannel;
import com.jobocate.notification.infrastructure.persistence.NotificationType;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.DltHandler;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.annotation.RetryableTopic;
import org.springframework.kafka.retrytopic.SameIntervalTopicReuseStrategy;
import org.springframework.retry.annotation.Backoff;
import org.springframework.stereotype.Component;

/**
 * Translates domain events into channel-specific notifications. Uses
 * Spring Kafka's {@code @RetryableTopic} so transient failures (DB blips,
 * email provider timeouts) move through retry topics before landing in DLT.
 */
@Component
public class DomainEventListeners {

    private static final Logger log = LoggerFactory.getLogger(DomainEventListeners.class);

    private final NotificationService notifications;
    private final ObjectMapper json;
    private final Counter accepted;
    private final Counter dropped;

    public DomainEventListeners(
            NotificationService notifications, ObjectMapper json, MeterRegistry meters) {
        this.notifications = notifications;
        this.json = json;
        this.accepted = Counter.builder("notification.events.accepted").register(meters);
        this.dropped = Counter.builder("notification.events.dropped").register(meters);
    }

    @RetryableTopic(
            attempts = "4",
            backoff = @Backoff(delay = 2000, multiplier = 2.0),
            sameIntervalTopicReuseStrategy = SameIntervalTopicReuseStrategy.SINGLE_TOPIC,
            dltTopicSuffix = ".DLT")
    @KafkaListener(
            topics = "${jobocate.kafka.application-events-topic}",
            groupId = "${spring.kafka.consumer.group-id}")
    public void onApplicationEvent(ConsumerRecord<String, String> record) {
        try {
            JsonNode root = json.readTree(record.value());
            String type = root.path("type").asText("");
            switch (type) {
                case "APPLICATION_SUBMITTED" -> handleApplicationSubmitted(root);
                case "APPLICATION_STATUS_CHANGED" -> handleStatusChanged(root);
                case "APPLICATION_WITHDRAWN" -> handleWithdrawn(root);
                default -> {
                    dropped.increment();
                    log.debug("notification.application_event ignored type={}", type);
                }
            }
            accepted.increment();
        } catch (Exception ex) {
            log.warn("notification.application_event parse error: {}", ex.getMessage());
            throw new RuntimeException(ex); // trigger retry
        }
    }

    @KafkaListener(
            topics = "${jobocate.kafka.job-events-topic}",
            groupId = "${spring.kafka.consumer.group-id}")
    public void onJobEvent(String body) {
        try {
            JsonNode root = json.readTree(body);
            String type = root.path("type").asText("");
            // MVP: job events feed search-orchestrator. Job alerts (post-MVP)
            // would translate published jobs into JOB_ALERT notifications here.
            log.debug("notification.job_event observed type={}", type);
            accepted.increment();
        } catch (Exception ex) {
            log.debug("notification.job_event ignored: {}", ex.getMessage());
        }
    }

    @DltHandler
    public void dlt(ConsumerRecord<String, String> record, Exception ex) {
        log.error(
                "notification.dlt topic={} key={} reason={}",
                record.topic(),
                record.key(),
                ex == null ? "n/a" : ex.getMessage());
    }

    private void handleApplicationSubmitted(JsonNode root) {
        UUID candidateUserId = uuid(root, "candidate_user_id");
        UUID recruiterUserId = uuid(root, "owner_user_id");
        Map<String, Object> ctx = baseContext(root);

        if (candidateUserId != null) {
            notifications.enqueue(new EnqueueRequest(
                    derivedEventId(root, "candidate"),
                    "application.events",
                    uuid(root, "tenant_id"),
                    candidateUserId,
                    text(root, "candidate_email"),
                    text(root, "candidate_name"),
                    NotificationType.APPLICATION_SUBMITTED,
                    NotificationChannel.EMAIL,
                    ctx,
                    uuid(root, "correlation_id"),
                    uuid(root, "application_id"),
                    "Application"));
        }
        if (recruiterUserId != null) {
            notifications.enqueue(new EnqueueRequest(
                    derivedEventId(root, "recruiter"),
                    "application.events",
                    uuid(root, "tenant_id"),
                    recruiterUserId,
                    text(root, "recruiter_email"),
                    text(root, "recruiter_name"),
                    NotificationType.APPLICATION_RECEIVED,
                    NotificationChannel.IN_APP,
                    ctx,
                    uuid(root, "correlation_id"),
                    uuid(root, "application_id"),
                    "Application"));
        }
    }

    private void handleStatusChanged(JsonNode root) {
        UUID candidateUserId = uuid(root, "candidate_user_id");
        if (candidateUserId == null) return;
        Map<String, Object> ctx = baseContext(root);
        ctx.put("from_status", text(root, "from_status"));
        ctx.put("to_status", text(root, "to_status"));
        notifications.enqueue(new EnqueueRequest(
                uuid(root, "event_id"),
                "application.events",
                uuid(root, "tenant_id"),
                candidateUserId,
                text(root, "candidate_email"),
                text(root, "candidate_name"),
                NotificationType.APPLICATION_STATUS_CHANGED,
                NotificationChannel.EMAIL,
                ctx,
                uuid(root, "correlation_id"),
                uuid(root, "application_id"),
                "Application"));
    }

    private void handleWithdrawn(JsonNode root) {
        UUID recruiterUserId = uuid(root, "owner_user_id");
        if (recruiterUserId == null) return;
        Map<String, Object> ctx = baseContext(root);
        notifications.enqueue(new EnqueueRequest(
                uuid(root, "event_id"),
                "application.events",
                uuid(root, "tenant_id"),
                recruiterUserId,
                text(root, "recruiter_email"),
                text(root, "recruiter_name"),
                NotificationType.CANDIDATE_WITHDREW,
                NotificationChannel.IN_APP,
                ctx,
                uuid(root, "correlation_id"),
                uuid(root, "application_id"),
                "Application"));
    }

    private static Map<String, Object> baseContext(JsonNode root) {
        Map<String, Object> ctx = new LinkedHashMap<>();
        ctx.put("application_id", text(root, "application_id"));
        ctx.put("job_id", text(root, "job_id"));
        ctx.put("job_title", text(root, "job_title"));
        ctx.put("candidate_name", text(root, "candidate_name"));
        ctx.put("recruiter_name", text(root, "recruiter_name"));
        return ctx;
    }

    /** Derives a stable per-(event,recipient) id so retries don't double-fire. */
    private static UUID derivedEventId(JsonNode root, String suffix) {
        UUID base = uuid(root, "event_id");
        if (base == null) return null;
        return UUID.nameUUIDFromBytes((base + ":" + suffix).getBytes());
    }

    private static UUID uuid(JsonNode root, String field) {
        JsonNode v = root.path(field);
        if (v.isMissingNode() || v.isNull() || v.asText().isBlank()) return null;
        try {
            return UUID.fromString(v.asText());
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }

    private static String text(JsonNode root, String field) {
        JsonNode v = root.path(field);
        return v.isMissingNode() || v.isNull() ? null : v.asText();
    }
}
