package com.jobocate.job.infrastructure.events;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.jobocate.job.infrastructure.persistence.EventOutboxEntity;
import com.jobocate.job.infrastructure.persistence.EventOutboxJpaRepository;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.domain.PageRequest;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Drains {@code job_event_outbox} to Kafka. Single-replica is fine for MVP;
 * leader-elected variant is a post-MVP concern. See
 * {@code docs/15-observability/} for SLOs and {@code docs/04-workflows/}.
 */
@Component
@ConditionalOnProperty(
        prefix = "jobocate.outbox",
        name = "publisher.enabled",
        havingValue = "true",
        matchIfMissing = true)
@EnableScheduling
public class OutboxPublisher {

    private static final Logger log = LoggerFactory.getLogger(OutboxPublisher.class);

    private final EventOutboxJpaRepository outbox;
    private final KafkaTemplate<String, String> kafka;
    private final ObjectMapper json;
    private final int batchSize;
    private final long maxBackoffSeconds;

    public OutboxPublisher(
            EventOutboxJpaRepository outbox,
            KafkaTemplate<String, String> kafka,
            ObjectMapper json,
            @Value("${jobocate.outbox.batch-size:50}") int batchSize,
            @Value("${jobocate.outbox.max-backoff-seconds:600}") long maxBackoffSeconds) {
        this.outbox = outbox;
        this.kafka = kafka;
        this.json = json;
        this.batchSize = batchSize;
        this.maxBackoffSeconds = maxBackoffSeconds;
    }

    @Scheduled(fixedDelayString = "${jobocate.outbox.poll-delay-ms:1000}")
    @Transactional
    public void drain() {
        List<EventOutboxEntity> due =
                outbox.findDue(Instant.now(), PageRequest.of(0, batchSize));
        if (due.isEmpty()) {
            return;
        }
        for (EventOutboxEntity row : due) {
            try {
                String body = json.writeValueAsString(row.getPayload());
                kafka.send(row.getTopic(), row.getPartitionKey(), body).get();
                row.markPublished(Instant.now());
            } catch (InterruptedException ie) {
                Thread.currentThread().interrupt();
                row.recordFailure("interrupted", nextBackoff(row));
            } catch (Exception ex) {
                log.warn(
                        "Outbox publish failed: id={} type={} err={}",
                        row.getId(),
                        row.getEventType(),
                        ex.getMessage());
                row.recordFailure(short_(ex), nextBackoff(row));
            }
        }
    }

    private Instant nextBackoff(EventOutboxEntity row) {
        long seconds = Math.min(maxBackoffSeconds, (long) Math.pow(2, row.getAttemptCount()));
        return Instant.now().plus(Duration.ofSeconds(Math.max(1, seconds)));
    }

    private static String short_(Exception ex) {
        String msg = ex.getMessage();
        if (msg == null) {
            return ex.getClass().getName();
        }
        return msg.length() > 1000 ? msg.substring(0, 1000) : msg;
    }
}
