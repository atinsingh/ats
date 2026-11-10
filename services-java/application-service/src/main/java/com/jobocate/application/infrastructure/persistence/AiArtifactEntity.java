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
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/**
 * Metadata + (small) output for an AI-generated artifact. Bulky outputs are
 * stored in S3 and referenced by {@code outputS3Key}; small text outputs (e.g.
 * cover letters) are inlined in {@code outputText}.
 *
 * <p>State machine documented on {@link AiArtifactStatus}; ownership +
 * authorisation rules documented on {@link AiArtifactSubjectType}.
 */
@Entity
@Access(AccessType.FIELD)
@Table(name = "ai_artifacts")
public class AiArtifactEntity extends AuditableEntity {

    @Id private UUID id;

    @Column(name = "tenant_id")
    private UUID tenantId;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private AiArtifactKind kind;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "subject_entity_type", nullable = false, length = 32)
    private AiArtifactSubjectType subjectEntityType;

    @NotNull
    @Column(name = "subject_entity_id", nullable = false)
    private UUID subjectEntityId;

    @Column(name = "related_application_id")
    private UUID relatedApplicationId;

    @Column(name = "related_job_id")
    private UUID relatedJobId;

    @Column(name = "related_resume_id")
    private UUID relatedResumeId;

    @NotBlank
    @Column(name = "prompt_version", nullable = false, length = 64)
    private String promptVersion;

    @NotBlank
    @Column(name = "model_version", nullable = false, length = 64)
    private String modelVersion;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "inputs_json", nullable = false)
    private Map<String, Object> inputs = new HashMap<>();

    @Column(name = "output_text", columnDefinition = "text")
    private String outputText;

    @Column(name = "output_s3_key")
    private String outputS3Key;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private AiArtifactStatus status = AiArtifactStatus.DRAFT;

    @Column(name = "review_required", nullable = false)
    private boolean reviewRequired = true;

    @Column(name = "approved_by_user_id")
    private UUID approvedByUserId;

    @Column(name = "approved_at")
    private Instant approvedAt;

    @Column(name = "rejected_by_user_id")
    private UUID rejectedByUserId;

    @Column(name = "rejected_at")
    private Instant rejectedAt;

    @Column(name = "rejection_reason")
    private String rejectionReason;

    @Column(name = "requested_by_user_id")
    private UUID requestedByUserId;

    @Column(name = "ready_at")
    private Instant readyAt;

    @Column(name = "failure_reason")
    private String failureReason;

    @Column(name = "idempotency_key", length = 128)
    private String idempotencyKey;

    public AiArtifactEntity() {}

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getTenantId() {
        return tenantId;
    }

    public void setTenantId(UUID tenantId) {
        this.tenantId = tenantId;
    }

    public AiArtifactKind getKind() {
        return kind;
    }

    public void setKind(AiArtifactKind kind) {
        this.kind = kind;
    }

    public AiArtifactSubjectType getSubjectEntityType() {
        return subjectEntityType;
    }

    public void setSubjectEntityType(AiArtifactSubjectType type) {
        this.subjectEntityType = type;
    }

    public UUID getSubjectEntityId() {
        return subjectEntityId;
    }

    public void setSubjectEntityId(UUID subjectEntityId) {
        this.subjectEntityId = subjectEntityId;
    }

    public UUID getRelatedApplicationId() {
        return relatedApplicationId;
    }

    public void setRelatedApplicationId(UUID relatedApplicationId) {
        this.relatedApplicationId = relatedApplicationId;
    }

    public UUID getRelatedJobId() {
        return relatedJobId;
    }

    public void setRelatedJobId(UUID relatedJobId) {
        this.relatedJobId = relatedJobId;
    }

    public UUID getRelatedResumeId() {
        return relatedResumeId;
    }

    public void setRelatedResumeId(UUID relatedResumeId) {
        this.relatedResumeId = relatedResumeId;
    }

    public String getPromptVersion() {
        return promptVersion;
    }

    public void setPromptVersion(String promptVersion) {
        this.promptVersion = promptVersion;
    }

    public String getModelVersion() {
        return modelVersion;
    }

    public void setModelVersion(String modelVersion) {
        this.modelVersion = modelVersion;
    }

    public Map<String, Object> getInputs() {
        return inputs;
    }

    public void setInputs(Map<String, Object> inputs) {
        this.inputs = inputs;
    }

    public String getOutputText() {
        return outputText;
    }

    public void setOutputText(String outputText) {
        this.outputText = outputText;
    }

    public String getOutputS3Key() {
        return outputS3Key;
    }

    public void setOutputS3Key(String outputS3Key) {
        this.outputS3Key = outputS3Key;
    }

    public AiArtifactStatus getStatus() {
        return status;
    }

    public boolean isReviewRequired() {
        return reviewRequired;
    }

    public void setReviewRequired(boolean reviewRequired) {
        this.reviewRequired = reviewRequired;
    }

    public UUID getApprovedByUserId() {
        return approvedByUserId;
    }

    public Instant getApprovedAt() {
        return approvedAt;
    }

    public UUID getRejectedByUserId() {
        return rejectedByUserId;
    }

    public Instant getRejectedAt() {
        return rejectedAt;
    }

    public String getRejectionReason() {
        return rejectionReason;
    }

    public UUID getRequestedByUserId() {
        return requestedByUserId;
    }

    public void setRequestedByUserId(UUID requestedByUserId) {
        this.requestedByUserId = requestedByUserId;
    }

    public Instant getReadyAt() {
        return readyAt;
    }

    public String getFailureReason() {
        return failureReason;
    }

    public String getIdempotencyKey() {
        return idempotencyKey;
    }

    public void setIdempotencyKey(String idempotencyKey) {
        this.idempotencyKey = idempotencyKey;
    }

    /** Worker callback success: artifact has produced output and is ready for review. */
    public void markReady(Instant when) {
        this.status = reviewRequired ? AiArtifactStatus.READY_FOR_REVIEW : AiArtifactStatus.APPROVED;
        this.readyAt = when;
        if (!reviewRequired) {
            this.approvedAt = when;
        }
    }

    /** Worker callback failure: artifact generation failed. */
    public void markFailed(String reason, Instant when) {
        this.status = AiArtifactStatus.FAILED;
        this.failureReason = reason;
        this.readyAt = when;
    }

    public void approve(UUID byUser, Instant when) {
        this.status = AiArtifactStatus.APPROVED;
        this.approvedByUserId = byUser;
        this.approvedAt = when;
    }

    public void reject(UUID byUser, String reason, Instant when) {
        this.status = AiArtifactStatus.REJECTED;
        this.rejectedByUserId = byUser;
        this.rejectionReason = reason;
        this.rejectedAt = when;
    }

    public void archive() {
        this.status = AiArtifactStatus.ARCHIVED;
    }

    public void markReadyForReview() {
        this.status = AiArtifactStatus.READY_FOR_REVIEW;
    }
}
