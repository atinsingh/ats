package com.jobocate.candidate.infrastructure.persistence;

import com.jobocate.platform.persistence.AuditableEntity;
import jakarta.persistence.Access;
import jakarta.persistence.AccessType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.time.Instant;
import java.util.UUID;

@Entity
@Access(AccessType.FIELD)
@Table(name = "resumes")
public class ResumeEntity extends AuditableEntity {

    @Id
    private UUID id;

    @NotNull
    @Column(name = "candidate_profile_id", nullable = false)
    private UUID candidateProfileId;

    @Column(name = "tenant_id")
    private UUID tenantId;

    @NotBlank
    @Column(name = "original_filename", nullable = false)
    private String originalFilename;

    @NotBlank
    @Column(name = "mime_type", nullable = false)
    private String mimeType;

    @Positive
    @Max(10_485_760)
    @Column(name = "size_bytes", nullable = false)
    private long sizeBytes;

    @NotBlank
    @Column(name = "s3_key", nullable = false)
    private String s3Key;

    @Column(name = "version_label")
    private String versionLabel;

    @Column(name = "is_default", nullable = false)
    private boolean isDefault;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "parser_status", nullable = false)
    private ResumeParserStatus parserStatus = ResumeParserStatus.PENDING;

    @Column(name = "parsed_at")
    private Instant parsedAt;

    @Column(name = "parser_error")
    private String parserError;

    public ResumeEntity() {}

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getCandidateProfileId() {
        return candidateProfileId;
    }

    public void setCandidateProfileId(UUID candidateProfileId) {
        this.candidateProfileId = candidateProfileId;
    }

    public UUID getTenantId() {
        return tenantId;
    }

    public void setTenantId(UUID tenantId) {
        this.tenantId = tenantId;
    }

    public String getOriginalFilename() {
        return originalFilename;
    }

    public void setOriginalFilename(String originalFilename) {
        this.originalFilename = originalFilename;
    }

    public String getMimeType() {
        return mimeType;
    }

    public void setMimeType(String mimeType) {
        this.mimeType = mimeType;
    }

    public long getSizeBytes() {
        return sizeBytes;
    }

    public void setSizeBytes(long sizeBytes) {
        this.sizeBytes = sizeBytes;
    }

    public String getS3Key() {
        return s3Key;
    }

    public void setS3Key(String s3Key) {
        this.s3Key = s3Key;
    }

    public boolean isDefault() {
        return isDefault;
    }

    public void setDefault(boolean aDefault) {
        isDefault = aDefault;
    }

    public ResumeParserStatus getParserStatus() {
        return parserStatus;
    }

    public Instant getParsedAt() {
        return parsedAt;
    }

    public String getParserError() {
        return parserError;
    }

    public String getVersionLabel() {
        return versionLabel;
    }

    public void setVersionLabel(String versionLabel) {
        this.versionLabel = versionLabel;
    }

    public void markInProgress() {
        this.parserStatus = ResumeParserStatus.IN_PROGRESS;
    }

    public void markParsed(Instant when) {
        this.parserStatus = ResumeParserStatus.PARSED;
        this.parsedAt = when;
        this.parserError = null;
    }

    public void markFailed(String error) {
        this.parserStatus = ResumeParserStatus.FAILED;
        this.parserError = error;
    }
}
