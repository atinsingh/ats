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
import java.math.BigDecimal;
import java.time.Instant;
import java.util.EnumSet;
import java.util.Set;
import java.util.UUID;

/** A candidate put forward to a client for a job. Tenant-scoped; see SubmittalService. */
@Entity
@Access(AccessType.FIELD)
@Table(name = "submittals")
public class SubmittalEntity extends AuditableEntity {

    public enum SubmittalStatus {
        AWAITING_APPROVAL,
        CLIENT_REVIEWING,
        INTERVIEW,
        OFFER,
        CLIENT_PASSED,
        WITHDRAWN;

        /** Statuses that still count as an open submittal for the application. */
        public static final Set<SubmittalStatus> OPEN =
                EnumSet.of(AWAITING_APPROVAL, CLIENT_REVIEWING, INTERVIEW, OFFER);

        /** Statuses a client reply can set once the submittal is with the client. */
        public static final Set<SubmittalStatus> CLIENT_SET =
                EnumSet.of(CLIENT_REVIEWING, INTERVIEW, OFFER, CLIENT_PASSED);
    }

    @Id private UUID id;

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
    @Column(name = "candidate_profile_id", nullable = false)
    private UUID candidateProfileId;

    @Column(name = "client_id")
    private UUID clientId;

    @NotNull
    @Column(nullable = false)
    private String channel = "Direct";

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SubmittalStatus status = SubmittalStatus.AWAITING_APPROVAL;

    @Column(name = "bill_rate")
    private BigDecimal billRate;

    @Column(name = "owner_user_id")
    private UUID ownerUserId;

    @Column(name = "approved_by_user_id")
    private UUID approvedByUserId;

    @Column(name = "submitted_at")
    private Instant submittedAt;

    @Column(name = "last_client_activity_at")
    private Instant lastClientActivityAt;

    @Column(name = "latest_note")
    private String latestNote;

    protected SubmittalEntity() {}

    public SubmittalEntity(
            UUID id, UUID tenantId, UUID applicationId, UUID jobId, UUID candidateProfileId) {
        this.id = id;
        this.tenantId = tenantId;
        this.applicationId = applicationId;
        this.jobId = jobId;
        this.candidateProfileId = candidateProfileId;
    }

    /** A person approved it and sent it to the client themselves. */
    public void approve(UUID personUserId, Instant at) {
        this.status = SubmittalStatus.CLIENT_REVIEWING;
        this.approvedByUserId = personUserId;
        this.submittedAt = at;
        this.latestNote = "Submitted";
    }

    public void recordClientUpdate(SubmittalStatus next, String note, Instant at) {
        if (next != null) this.status = next;
        if (note != null) this.latestNote = note;
        this.lastClientActivityAt = at;
    }

    public void withdraw(String reason) {
        this.status = SubmittalStatus.WITHDRAWN;
        this.latestNote = reason != null ? reason : "Withdrawn";
    }

    public UUID getId() { return id; }
    public UUID getTenantId() { return tenantId; }
    public UUID getApplicationId() { return applicationId; }
    public UUID getJobId() { return jobId; }
    public UUID getCandidateProfileId() { return candidateProfileId; }
    public UUID getClientId() { return clientId; }
    public void setClientId(UUID clientId) { this.clientId = clientId; }
    public String getChannel() { return channel; }
    public void setChannel(String channel) { this.channel = channel; }
    public SubmittalStatus getStatus() { return status; }
    public BigDecimal getBillRate() { return billRate; }
    public void setBillRate(BigDecimal billRate) { this.billRate = billRate; }
    public UUID getOwnerUserId() { return ownerUserId; }
    public void setOwnerUserId(UUID ownerUserId) { this.ownerUserId = ownerUserId; }
    public UUID getApprovedByUserId() { return approvedByUserId; }
    public Instant getSubmittedAt() { return submittedAt; }
    public Instant getLastClientActivityAt() { return lastClientActivityAt; }
    public String getLatestNote() { return latestNote; }
}
