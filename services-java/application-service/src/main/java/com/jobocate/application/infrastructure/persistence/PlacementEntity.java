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
import java.time.LocalDate;
import java.util.UUID;

/** A person hired a candidate for a client. One per application; see PlacementService. */
@Entity
@Access(AccessType.FIELD)
@Table(name = "placements")
public class PlacementEntity extends AuditableEntity {

    public enum Extension {
        NONE,
        ASKED,
        AGREED,
        DECLINED
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
    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @NotNull
    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @NotNull
    @Column(name = "bill_rate", nullable = false)
    private BigDecimal billRate;

    @NotNull
    @Column(name = "pay_rate", nullable = false)
    private BigDecimal payRate;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Extension extension = Extension.NONE;

    @Column(name = "owner_user_id")
    private UUID ownerUserId;

    protected PlacementEntity() {}

    public PlacementEntity(
            UUID id, UUID tenantId, UUID applicationId, UUID jobId, UUID candidateProfileId) {
        this.id = id;
        this.tenantId = tenantId;
        this.applicationId = applicationId;
        this.jobId = jobId;
        this.candidateProfileId = candidateProfileId;
    }

    public UUID getId() { return id; }
    public UUID getTenantId() { return tenantId; }
    public UUID getApplicationId() { return applicationId; }
    public UUID getJobId() { return jobId; }
    public UUID getCandidateProfileId() { return candidateProfileId; }
    public UUID getClientId() { return clientId; }
    public void setClientId(UUID clientId) { this.clientId = clientId; }
    public LocalDate getStartDate() { return startDate; }
    public void setStartDate(LocalDate startDate) { this.startDate = startDate; }
    public LocalDate getEndDate() { return endDate; }
    public void setEndDate(LocalDate endDate) { this.endDate = endDate; }
    public BigDecimal getBillRate() { return billRate; }
    public void setBillRate(BigDecimal billRate) { this.billRate = billRate; }
    public BigDecimal getPayRate() { return payRate; }
    public void setPayRate(BigDecimal payRate) { this.payRate = payRate; }
    public Extension getExtension() { return extension; }
    public void setExtension(Extension extension) { this.extension = extension; }
    public UUID getOwnerUserId() { return ownerUserId; }
    public void setOwnerUserId(UUID ownerUserId) { this.ownerUserId = ownerUserId; }
}
