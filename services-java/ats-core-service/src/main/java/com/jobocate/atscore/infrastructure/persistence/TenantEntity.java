package com.jobocate.atscore.infrastructure.persistence;

import com.jobocate.platform.persistence.AuditableEntity;
import jakarta.persistence.Access;
import jakarta.persistence.AccessType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.UUID;

/** JPA entity for the {@code tenants} table. */
@Entity
@Access(AccessType.FIELD)
@Table(name = "tenants")
public class TenantEntity extends AuditableEntity {

    @Id
    private UUID id;

    @NotBlank
    @Pattern(regexp = "^[a-z0-9-]+$")
    @Size(max = 128)
    @Column(nullable = false, unique = true)
    private String slug;

    @Size(max = 256)
    @Column(name = "legal_name")
    private String legalName;

    @NotBlank
    @Size(max = 256)
    @Column(name = "display_name", nullable = false)
    private String displayName;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TenantStatus status = TenantStatus.ACTIVE;

    @Column(name = "time_zone", nullable = false, length = 64)
    private String timeZone = "UTC";

    @Column(name = "default_locale", nullable = false, length = 16)
    private String defaultLocale = "en-US";

    @Column(name = "logo_url")
    private String logoUrl;

    @Size(max = 256)
    @Column(name = "primary_domain")
    private String primaryDomain;

    @Size(max = 16)
    @Column(name = "brand_color_primary")
    private String brandColorPrimary;

    @Size(max = 16)
    @Column(name = "brand_color_accent")
    private String brandColorAccent;

    @Email
    @Size(max = 320)
    @Column(name = "billing_email")
    private String billingEmail;

    @Email
    @Size(max = 320)
    @Column(name = "support_email")
    private String supportEmail;

    public TenantEntity() {}

    public UUID getId() {
        return id;
    }

    public String getSlug() {
        return slug;
    }

    public String getDisplayName() {
        return displayName;
    }

    /** @return the canonical enum status value. */
    public TenantStatus getStatusEnum() {
        return status;
    }

    /** @return string form of the status to keep callers backwards-compatible. */
    public String getStatus() {
        return status == null ? null : status.name();
    }

    public String getTimeZone() {
        return timeZone;
    }

    public String getDefaultLocale() {
        return defaultLocale;
    }

    public String getLogoUrl() {
        return logoUrl;
    }

    public String getPrimaryDomain() {
        return primaryDomain;
    }

    public String getBillingEmail() {
        return billingEmail;
    }

    public String getSupportEmail() {
        return supportEmail;
    }
}
