package com.jobocate.job.infrastructure.persistence;

import com.jobocate.job.domain.model.Job;
import com.jobocate.job.domain.model.JobStatus;
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
import java.util.List;
import java.util.UUID;

@Entity
@Access(AccessType.FIELD)
@Table(name = "jobs")
class JobEntity extends AuditableEntity {

    @Id
    private UUID id;

    @NotNull
    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(name = "organization_id")
    private UUID organizationId;

    @Size(max = 256)
    @Column(name = "slug")
    private String slug;

    @NotNull
    @Column(nullable = false)
    private String title;

    @Column private String department;

    @Column private String description;

    @Column private String responsibilities;

    @Column private String qualifications;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private JobStatus status;

    @Column private String location;

    @Column(name = "location_city")
    private String locationCity;

    @Column(name = "location_region")
    private String locationRegion;

    @Column(name = "location_country")
    private String locationCountry;

    @Column(name = "employment_type")
    private String employmentType;

    @Column(name = "remote_policy")
    private String remotePolicy;

    @Column(name = "experience_min_years")
    private Integer experienceMinYears;

    @Column(name = "experience_max_years")
    private Integer experienceMaxYears;

    @Column(name = "salary_min_cents")
    private Long salaryMinCents;

    @Column(name = "salary_max_cents")
    private Long salaryMaxCents;

    @Column(name = "currency_code", length = 3)
    private String currencyCode;

    @Column(name = "published_at")
    private Instant publishedAt;

    @Column(name = "closed_at")
    private Instant closedAt;

    @Column(name = "pipeline_id")
    private UUID pipelineId;

    @Column(name = "boost_score", nullable = false)
    private int boostScore;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    JobEntity() {}

    static JobEntity from(Job job) {
        JobEntity e = new JobEntity();
        e.applyDomain(job);
        return e;
    }

    void applyDomain(Job job) {
        this.id = job.id();
        this.tenantId = job.tenantId();
        this.organizationId = job.organizationId();
        this.slug = job.slug();
        this.title = job.title();
        this.department = job.department();
        this.description = job.description();
        this.responsibilities = job.responsibilities();
        this.qualifications = job.qualifications();
        this.status = job.status();
        this.location = job.location();
        this.locationCity = job.locationCity();
        this.locationRegion = job.locationRegion();
        this.locationCountry = job.locationCountry();
        this.employmentType = job.employmentType();
        this.remotePolicy = job.remotePolicy();
        this.experienceMinYears = job.experienceMinYears();
        this.experienceMaxYears = job.experienceMaxYears();
        this.salaryMinCents = job.salaryMinCents();
        this.salaryMaxCents = job.salaryMaxCents();
        this.currencyCode = job.currencyCode();
        this.publishedAt = job.publishedAt();
        this.closedAt = job.closedAt();
        this.pipelineId = job.pipelineId();
        this.boostScore = job.boostScore();
        primeAuditTimestamps(job.createdAt(), job.updatedAt());
    }

    Job toDomain(List<String> skills) {
        return new Job(
                id,
                tenantId,
                organizationId,
                slug,
                title,
                department,
                description,
                responsibilities,
                qualifications,
                status,
                employmentType,
                remotePolicy,
                experienceMinYears,
                experienceMaxYears,
                salaryMinCents,
                salaryMaxCents,
                currencyCode,
                location,
                locationCity,
                locationRegion,
                locationCountry,
                publishedAt,
                closedAt,
                pipelineId,
                boostScore,
                skills,
                getCreatedAt(),
                getUpdatedAt());
    }

    UUID getId() {
        return id;
    }

    UUID getTenantId() {
        return tenantId;
    }

    JobStatus getStatus() {
        return status;
    }
}
