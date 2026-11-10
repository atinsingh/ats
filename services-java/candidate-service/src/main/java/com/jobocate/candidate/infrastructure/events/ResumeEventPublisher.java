package com.jobocate.candidate.infrastructure.events;

import com.jobocate.candidate.infrastructure.persistence.EventOutboxEntity;
import com.jobocate.candidate.infrastructure.persistence.EventOutboxJpaRepository;
import com.jobocate.candidate.infrastructure.persistence.ResumeEntity;
import java.time.Instant;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Writes {@code resume.uploaded} events into the candidate-service outbox.
 * The {@link OutboxPublisher} drains them to {@code jobocate.resume.raw} where
 * the resume-parser-worker consumes them.
 */
@Component
public class ResumeEventPublisher {

    private final EventOutboxJpaRepository outbox;
    private final String topic;

    public ResumeEventPublisher(
            EventOutboxJpaRepository outbox,
            @Value("${jobocate.kafka.resume-raw-topic:jobocate.resume.raw}") String topic) {
        this.outbox = outbox;
        this.topic = topic;
    }

    public void publishResumeUploaded(ResumeEntity resume) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("type", "RESUME_UPLOADED");
        payload.put("schema_version", "v1");
        payload.put("resume_id", resume.getId().toString());
        payload.put("candidate_id", resume.getCandidateProfileId().toString());
        payload.put("tenant_id", resume.getTenantId() == null ? null : resume.getTenantId().toString());
        payload.put("s3_key", resume.getS3Key());
        payload.put("mime_type", resume.getMimeType());
        payload.put("size_bytes", resume.getSizeBytes());
        payload.put("original_filename", resume.getOriginalFilename());
        payload.put("emitted_at", Instant.now().toString());

        EventOutboxEntity row = new EventOutboxEntity();
        row.setId(UUID.randomUUID());
        row.setAggregateType("Resume");
        row.setAggregateId(resume.getId());
        row.setTenantId(resume.getTenantId());
        row.setEventType("resume.uploaded");
        row.setTopic(topic);
        row.setPartitionKey(resume.getCandidateProfileId().toString());
        row.setPayload(payload);
        row.setHeaders(new HashMap<>());
        row.setCreatedAt(Instant.now());
        outbox.save(row);
    }
}
