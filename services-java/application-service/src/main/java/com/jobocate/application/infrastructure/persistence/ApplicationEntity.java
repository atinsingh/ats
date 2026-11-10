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
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/**
 * JPA entity for the {@code applications} table. Owned by
 * {@code application-service}.
 *
 * <p>The legacy column {@code candidate_id} was renamed to
 * {@code candidate_profile_id} by Flyway V4. The Java field name is also
 * {@code candidateProfileId} so call sites must use the new accessor.
 */
@Entity
@Access(AccessType.FIELD)
@Table(name = "applications")
public class ApplicationEntity extends AuditableEntity {

    @Id
    private UUID id;

    @NotNull
    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @NotNull
    @Column(name = "job_id", nullable = false)
    private UUID jobId;

    @NotNull
    @Column(name = "candidate_profile_id", nullable = false)
    private UUID candidateProfileId;

    @Column(name = "resume_id_used")
    private UUID resumeIdUsed;

    @Column(name = "cover_letter_text")
    private String coverLetterText;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "screening_answers")
    private String screeningAnswers;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private ApplicationStatus status;

    @Column(name = "current_stage_id")
    private UUID currentStageId;

    @Column(name = "pipeline_id")
    private UUID pipelineId;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "source", nullable = false)
    private ApplicationSource source = ApplicationSource.DIRECT;

    @NotNull
    @Column(name = "applied_at", nullable = false)
    private Instant appliedAt;

    @Size(max = 128)
    @Column(name = "submitted_via_idempotency_key")
    private String submittedViaIdempotencyKey;

    @Column(name = "rejection_reason")
    private String rejectionReason;

    @Column(name = "withdrawal_reason")
    private String withdrawalReason;

    @Column(name = "hired_at")
    private Instant hiredAt;

    @Column(name = "terminal_at")
    private Instant terminalAt;

    public ApplicationEntity() {}

    public void setId(UUID id) {
        this.id = id;
    }

    public void setTenantId(UUID tenantId) {
        this.tenantId = tenantId;
    }

    public void setJobId(UUID jobId) {
        this.jobId = jobId;
    }

    public void setCandidateProfileId(UUID candidateProfileId) {
        this.candidateProfileId = candidateProfileId;
    }

    public void setResumeIdUsed(UUID resumeIdUsed) {
        this.resumeIdUsed = resumeIdUsed;
    }

    public void setStatus(ApplicationStatus status) {
        this.status = status;
    }

    public void setSource(ApplicationSource source) {
        this.source = source;
    }

    public void setAppliedAt(Instant appliedAt) {
        this.appliedAt = appliedAt;
    }

    public void setSubmittedViaIdempotencyKey(String key) {
        this.submittedViaIdempotencyKey = key;
    }

    public void setCurrentStageId(UUID currentStageId) {
        this.currentStageId = currentStageId;
    }

    public void setPipelineId(UUID pipelineId) {
        this.pipelineId = pipelineId;
    }

    public void setCoverLetterText(String coverLetterText) {
        this.coverLetterText = coverLetterText;
    }

    public void setScreeningAnswers(String screeningAnswers) {
        this.screeningAnswers = screeningAnswers;
    }

    public void setRejectionReason(String rejectionReason) {
        this.rejectionReason = rejectionReason;
    }

    public void setWithdrawalReason(String withdrawalReason) {
        this.withdrawalReason = withdrawalReason;
    }

    public void setHiredAt(Instant hiredAt) {
        this.hiredAt = hiredAt;
    }

    public void setTerminalAt(Instant terminalAt) {
        this.terminalAt = terminalAt;
    }

    public UUID getId() {
        return id;
    }

    public UUID getTenantId() {
        return tenantId;
    }

    public UUID getJobId() {
        return jobId;
    }

    public UUID getCandidateProfileId() {
        return candidateProfileId;
    }

    public UUID getResumeIdUsed() {
        return resumeIdUsed;
    }

    public ApplicationStatus getStatus() {
        return status;
    }

    public ApplicationSource getSource() {
        return source;
    }

    public Instant getAppliedAt() {
        return appliedAt;
    }

    public String getSubmittedViaIdempotencyKey() {
        return submittedViaIdempotencyKey;
    }

    public UUID getCurrentStageId() {
        return currentStageId;
    }

    public UUID getPipelineId() {
        return pipelineId;
    }
}
