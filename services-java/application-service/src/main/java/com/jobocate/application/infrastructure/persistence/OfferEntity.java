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
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/** Post-MVP placeholder for compensation offers. */
@Entity
@Access(AccessType.FIELD)
@Table(name = "offers")
public class OfferEntity extends AuditableEntity {

    @Id
    private UUID id;

    @NotNull
    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @NotNull
    @Column(name = "application_id", nullable = false)
    private UUID applicationId;

    @NotBlank
    @Size(max = 256)
    @Column(nullable = false)
    private String title;

    @NotNull
    @Column(name = "base_salary_cents", nullable = false)
    private Long baseSalaryCents;

    @NotNull
    @Size(min = 3, max = 3)
    @Column(name = "currency_code", nullable = false, length = 3)
    private String currencyCode;

    @Column(name = "bonus_cents")
    private Long bonusCents;

    @Column(name = "equity_terms")
    private String equityTerms;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "expires_at")
    private Instant expiresAt;

    @Column private String notes;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private OfferStatus status = OfferStatus.DRAFT;

    @Column(name = "sent_at")
    private Instant sentAt;

    @Column(name = "accepted_at")
    private Instant acceptedAt;

    @Column(name = "declined_at")
    private Instant declinedAt;

    @Column(name = "declined_reason")
    private String declinedReason;

    public enum OfferStatus {
        DRAFT,
        PENDING_APPROVAL,
        APPROVED,
        SENT,
        ACCEPTED,
        DECLINED,
        EXPIRED,
        RESCINDED
    }

    public OfferEntity() {}

    public UUID getId() {
        return id;
    }

    public OfferStatus getStatus() {
        return status;
    }
}
