package com.jobocate.job.domain.model;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Domain representation of a job posting. Maps 1-to-1 with the
 * {@code jobs} table; transient denormalized fields like {@code skills}
 * are loaded by the repository adapter from {@code job_skills}.
 */
public record Job(
        UUID id,
        UUID tenantId,
        UUID organizationId,
        String slug,
        String title,
        String department,
        String description,
        String responsibilities,
        String qualifications,
        JobStatus status,
        String employmentType,
        String remotePolicy,
        Integer experienceMinYears,
        Integer experienceMaxYears,
        Long salaryMinCents,
        Long salaryMaxCents,
        String currencyCode,
        String location,
        String locationCity,
        String locationRegion,
        String locationCountry,
        Instant publishedAt,
        Instant closedAt,
        UUID pipelineId,
        int boostScore,
        List<String> skills,
        Instant createdAt,
        Instant updatedAt) {

    /** Returns true if this job has the minimum publish-ready fields. */
    public boolean isPublishable() {
        if (title == null || title.isBlank()) {
            return false;
        }
        if (description == null || description.isBlank()) {
            return false;
        }
        if (employmentType == null) {
            return false;
        }
        return true;
    }
}
