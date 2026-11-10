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
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/** JPA entity for the {@code candidate_profiles} table. */
@Entity
@Access(AccessType.FIELD)
@Table(name = "candidate_profiles")
public class CandidateProfileEntity extends AuditableEntity {

    @Id
    private UUID id;

    @Column(name = "user_id")
    private UUID userId;

    @Column(name = "tenant_id")
    private UUID tenantId;

    @NotNull
    @Size(max = 512)
    @Column(name = "full_name", nullable = false)
    private String fullName;

    @Size(max = 512)
    @Column private String headline;

    @NotNull
    @Email
    @Size(max = 320)
    @Column(nullable = false)
    private String email;

    @Size(max = 64)
    @Column private String phone;

    @Column(name = "location_city")
    private String locationCity;

    @Column(name = "location_region")
    private String locationRegion;

    @Column(name = "location_country", length = 64)
    private String locationCountry;

    @Column private String summary;

    @Column(name = "desired_role")
    private String desiredRole;

    @Column(name = "salary_expectation_min_cents")
    private Long salaryExpectationMinCents;

    @Column(name = "salary_expectation_max_cents")
    private Long salaryExpectationMaxCents;

    @Column(name = "currency_code", length = 3)
    private String currencyCode;

    @Enumerated(EnumType.STRING)
    @Column private Availability availability;

    @Column(name = "work_authorization")
    private String workAuthorization;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "links", nullable = false)
    private Map<String, String> links = new HashMap<>();

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "profile_visibility", nullable = false)
    private ProfileVisibility profileVisibility = ProfileVisibility.PRIVATE;

    @Column(name = "consent_searchable", nullable = false)
    private boolean consentSearchable;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    public CandidateProfileEntity() {}

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

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public String getHeadline() {
        return headline;
    }

    public void setHeadline(String headline) {
        this.headline = headline;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public ProfileVisibility getProfileVisibility() {
        return profileVisibility;
    }

    public void setProfileVisibility(ProfileVisibility v) {
        this.profileVisibility = v;
    }

    public boolean isConsentSearchable() {
        return consentSearchable;
    }

    public void setConsentSearchable(boolean consentSearchable) {
        this.consentSearchable = consentSearchable;
    }

    public Availability getAvailability() {
        return availability;
    }

    public void setAvailability(Availability availability) {
        this.availability = availability;
    }

    public Instant getDeletedAt() {
        return deletedAt;
    }

    public void markDeleted(Instant when) {
        this.deletedAt = when;
    }
}
