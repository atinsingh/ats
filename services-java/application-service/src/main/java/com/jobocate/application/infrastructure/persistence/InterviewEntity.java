package com.jobocate.application.infrastructure.persistence;

import com.jobocate.platform.persistence.AuditableEntity;
import jakarta.persistence.Access;
import jakarta.persistence.AccessType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.util.UUID;

/** Post-MVP placeholder. */
@Entity
@Access(AccessType.FIELD)
@Table(name = "interviews")
public class InterviewEntity extends AuditableEntity {

    @Id
    private UUID id;

    @NotNull
    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @NotNull
    @Column(name = "application_id", nullable = false)
    private UUID applicationId;

    @NotNull
    @Column(name = "job_id", nullable = false)
    private UUID jobId;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private InterviewType type;

    @Column private String location;

    @Column(name = "meeting_url")
    private String meetingUrl;

    @NotNull
    @Column(name = "scheduled_start", nullable = false)
    private Instant scheduledStart;

    @NotNull
    @Column(name = "scheduled_end", nullable = false)
    private Instant scheduledEnd;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private InterviewStatus status = InterviewStatus.SCHEDULED;

    @Column(name = "cancellation_reason")
    private String cancellationReason;

    public enum InterviewType {
        PHONE,
        VIDEO,
        ONSITE,
        TECHNICAL,
        PANEL
    }

    public enum InterviewStatus {
        SCHEDULED,
        RESCHEDULED,
        COMPLETED,
        CANCELLED,
        NO_SHOW
    }

    public InterviewEntity() {}

    public UUID getId() {
        return id;
    }
}
