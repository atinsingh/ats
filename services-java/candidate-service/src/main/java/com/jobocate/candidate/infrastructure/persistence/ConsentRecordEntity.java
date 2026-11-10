package com.jobocate.candidate.infrastructure.persistence;

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

/** Append-only consent ledger row. Latest record per (user, kind, tenant?) wins. */
@Entity
@Access(AccessType.FIELD)
@Table(name = "consent_records")
public class ConsentRecordEntity {

    @Id
    private UUID id;

    @NotNull
    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "candidate_profile_id")
    private UUID candidateProfileId;

    @Column(name = "tenant_id")
    private UUID tenantId;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "consent_kind", nullable = false, length = 64)
    private ConsentKind consentKind;

    @Column(name = "consent_value", nullable = false)
    private boolean consentValue;

    @Column(name = "policy_version", length = 64)
    private String policyVersion;

    @Enumerated(EnumType.STRING)
    @Column(name = "source", length = 32)
    private ConsentSource source;

    @Column(name = "ip_address", columnDefinition = "inet")
    private String ipAddress;

    @Column(name = "user_agent")
    private String userAgent;

    @Column(name = "recorded_at", nullable = false, updatable = false)
    private Instant recordedAt;

    public ConsentRecordEntity() {}

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getUserId() {
        return userId;
    }

    public void setUserId(UUID userId) {
        this.userId = userId;
    }

    public UUID getTenantId() {
        return tenantId;
    }

    public void setTenantId(UUID tenantId) {
        this.tenantId = tenantId;
    }

    public ConsentKind getConsentKind() {
        return consentKind;
    }

    public void setConsentKind(ConsentKind consentKind) {
        this.consentKind = consentKind;
    }

    public boolean getConsentValue() {
        return consentValue;
    }

    public void setConsentValue(boolean consentValue) {
        this.consentValue = consentValue;
    }

    public String getPolicyVersion() {
        return policyVersion;
    }

    public void setPolicyVersion(String policyVersion) {
        this.policyVersion = policyVersion;
    }

    public ConsentSource getSource() {
        return source;
    }

    public void setSource(ConsentSource source) {
        this.source = source;
    }

    public Instant getRecordedAt() {
        return recordedAt;
    }

    public void setRecordedAt(Instant recordedAt) {
        this.recordedAt = recordedAt;
    }

    public enum ConsentKind {
        SEARCHABLE,
        AI_TOOLS,
        MARKETING,
        DATA_PROCESSING_TOS
    }

    public enum ConsentSource {
        SIGNUP_PAGE,
        SETTINGS_PAGE,
        APPLY_FLOW,
        IMPORT
    }
}
