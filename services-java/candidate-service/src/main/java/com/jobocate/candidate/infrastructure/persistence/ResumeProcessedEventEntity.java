package com.jobocate.candidate.infrastructure.persistence;

import jakarta.persistence.Access;
import jakarta.persistence.AccessType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/** Idempotency record for parser callbacks (HTTP or Kafka). */
@Entity
@Access(AccessType.FIELD)
@Table(name = "resume_processed_events")
public class ResumeProcessedEventEntity {

    @Id
    @Column(name = "event_id")
    private UUID eventId;

    @Column(name = "resume_id", nullable = false)
    private UUID resumeId;

    @Column(name = "received_at", nullable = false)
    private Instant receivedAt;

    public ResumeProcessedEventEntity() {}

    public ResumeProcessedEventEntity(UUID eventId, UUID resumeId, Instant receivedAt) {
        this.eventId = eventId;
        this.resumeId = resumeId;
        this.receivedAt = receivedAt;
    }

    public UUID getEventId() {
        return eventId;
    }

    public UUID getResumeId() {
        return resumeId;
    }

    public Instant getReceivedAt() {
        return receivedAt;
    }
}
