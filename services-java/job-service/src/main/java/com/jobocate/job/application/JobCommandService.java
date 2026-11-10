package com.jobocate.job.application;

import com.jobocate.job.domain.JobErrorCodes;
import com.jobocate.job.domain.JobException;
import com.jobocate.job.domain.model.Job;
import com.jobocate.job.domain.model.JobStatus;
import com.jobocate.job.domain.ports.JobEventPublisher;
import com.jobocate.job.domain.ports.JobRepository;
import com.jobocate.platform.tenant.TenantContext;
import java.text.Normalizer;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class JobCommandService {

    private final JobRepository jobs;
    private final JobEventPublisher events;

    public JobCommandService(JobRepository jobs, JobEventPublisher events) {
        this.jobs = jobs;
        this.events = events;
    }

    @Transactional(readOnly = true)
    public List<Job> listPublishedJobs(int limit, int offset) {
        return jobs.searchByTenant(
                TenantContext.requireTenant(), JobStatus.PUBLISHED, limit, offset);
    }

    @Transactional(readOnly = true)
    public Optional<Job> get(UUID id) {
        return jobs.findByTenantAndId(TenantContext.requireTenant(), id);
    }

    @Transactional
    public Job createDraft(JobInput input, UUID actorUserId) {
        UUID tenant = TenantContext.requireTenant();
        Instant now = Instant.now();
        Job job =
                new Job(
                        UUID.randomUUID(),
                        tenant,
                        input.organizationId(),
                        slugify(input.title()),
                        input.title(),
                        input.department(),
                        input.description(),
                        input.responsibilities(),
                        input.qualifications(),
                        JobStatus.DRAFT,
                        input.employmentType(),
                        input.remotePolicy(),
                        input.experienceMinYears(),
                        input.experienceMaxYears(),
                        input.salaryMinCents(),
                        input.salaryMaxCents(),
                        input.currencyCode(),
                        input.location(),
                        input.locationCity(),
                        input.locationRegion(),
                        input.locationCountry(),
                        null,
                        null,
                        input.pipelineId(),
                        0,
                        input.skills() == null ? List.of() : List.copyOf(input.skills()),
                        now,
                        now);
        Job saved = jobs.save(job);
        events.publishJobUpserted(saved);
        return saved;
    }

    @Transactional
    public Job updateJob(UUID id, JobInput input, UUID actorUserId) {
        UUID tenant = TenantContext.requireTenant();
        Job existing = loadOrThrow(tenant, id);
        Job updated =
                new Job(
                        existing.id(),
                        existing.tenantId(),
                        existing.organizationId(),
                        existing.slug(),
                        nonBlankOr(input.title(), existing.title()),
                        firstNonNull(input.department(), existing.department()),
                        firstNonNull(input.description(), existing.description()),
                        firstNonNull(input.responsibilities(), existing.responsibilities()),
                        firstNonNull(input.qualifications(), existing.qualifications()),
                        existing.status(),
                        firstNonNull(input.employmentType(), existing.employmentType()),
                        firstNonNull(input.remotePolicy(), existing.remotePolicy()),
                        firstNonNull(input.experienceMinYears(), existing.experienceMinYears()),
                        firstNonNull(input.experienceMaxYears(), existing.experienceMaxYears()),
                        firstNonNull(input.salaryMinCents(), existing.salaryMinCents()),
                        firstNonNull(input.salaryMaxCents(), existing.salaryMaxCents()),
                        firstNonNull(input.currencyCode(), existing.currencyCode()),
                        firstNonNull(input.location(), existing.location()),
                        firstNonNull(input.locationCity(), existing.locationCity()),
                        firstNonNull(input.locationRegion(), existing.locationRegion()),
                        firstNonNull(input.locationCountry(), existing.locationCountry()),
                        existing.publishedAt(),
                        existing.closedAt(),
                        firstNonNull(input.pipelineId(), existing.pipelineId()),
                        existing.boostScore(),
                        input.skills() != null ? List.copyOf(input.skills()) : existing.skills(),
                        existing.createdAt(),
                        Instant.now());
        Job saved = saveExpectingVersion(updated);
        events.publishJobUpserted(saved);
        return saved;
    }

    @Transactional
    public Job publish(UUID id, UUID actorUserId) {
        UUID tenant = TenantContext.requireTenant();
        Job existing = loadOrThrow(tenant, id);
        if (existing.status() == JobStatus.CLOSED || existing.status() == JobStatus.ARCHIVED) {
            throw new JobException(
                    JobErrorCodes.INVALID_STATE_TRANSITION,
                    HttpStatus.CONFLICT,
                    "Cannot publish a " + existing.status() + " job; clone it first");
        }
        if (!existing.isPublishable()) {
            throw new JobException(
                    JobErrorCodes.JOB_NOT_PUBLISHABLE,
                    HttpStatus.UNPROCESSABLE_ENTITY,
                    "Job is missing required fields: title, description, employment_type");
        }
        Job published =
                new Job(
                        existing.id(),
                        existing.tenantId(),
                        existing.organizationId(),
                        existing.slug(),
                        existing.title(),
                        existing.department(),
                        existing.description(),
                        existing.responsibilities(),
                        existing.qualifications(),
                        JobStatus.PUBLISHED,
                        existing.employmentType(),
                        existing.remotePolicy(),
                        existing.experienceMinYears(),
                        existing.experienceMaxYears(),
                        existing.salaryMinCents(),
                        existing.salaryMaxCents(),
                        existing.currencyCode(),
                        existing.location(),
                        existing.locationCity(),
                        existing.locationRegion(),
                        existing.locationCountry(),
                        Instant.now(),
                        null,
                        existing.pipelineId(),
                        existing.boostScore(),
                        existing.skills(),
                        existing.createdAt(),
                        Instant.now());
        Job saved = saveExpectingVersion(published);
        events.publishJobPublished(saved);
        return saved;
    }

    @Transactional
    public Job unpublish(UUID id, UUID actorUserId) {
        UUID tenant = TenantContext.requireTenant();
        Job existing = loadOrThrow(tenant, id);
        if (existing.status() != JobStatus.PUBLISHED) {
            throw new JobException(
                    JobErrorCodes.INVALID_STATE_TRANSITION,
                    HttpStatus.CONFLICT,
                    "Only PUBLISHED jobs can be unpublished");
        }
        Job updated = withStatus(existing, JobStatus.DRAFT, null, null);
        Job saved = saveExpectingVersion(updated);
        events.publishJobUnpublished(saved);
        return saved;
    }

    @Transactional
    public Job close(UUID id, UUID actorUserId) {
        UUID tenant = TenantContext.requireTenant();
        Job existing = loadOrThrow(tenant, id);
        if (existing.status() == JobStatus.CLOSED || existing.status() == JobStatus.ARCHIVED) {
            return existing;
        }
        Job updated = withStatus(existing, JobStatus.CLOSED, existing.publishedAt(), Instant.now());
        Job saved = saveExpectingVersion(updated);
        events.publishJobClosed(saved);
        return saved;
    }

    @Transactional
    public Job clone(UUID sourceId, UUID actorUserId) {
        UUID tenant = TenantContext.requireTenant();
        Job source = loadOrThrow(tenant, sourceId);
        Instant now = Instant.now();
        Job clone =
                new Job(
                        UUID.randomUUID(),
                        source.tenantId(),
                        source.organizationId(),
                        slugify(source.title() + " (copy)"),
                        source.title() + " (copy)",
                        source.department(),
                        source.description(),
                        source.responsibilities(),
                        source.qualifications(),
                        JobStatus.DRAFT,
                        source.employmentType(),
                        source.remotePolicy(),
                        source.experienceMinYears(),
                        source.experienceMaxYears(),
                        source.salaryMinCents(),
                        source.salaryMaxCents(),
                        source.currencyCode(),
                        source.location(),
                        source.locationCity(),
                        source.locationRegion(),
                        source.locationCountry(),
                        null,
                        null,
                        source.pipelineId(),
                        0,
                        source.skills(),
                        now,
                        now);
        Job saved = jobs.save(clone);
        events.publishJobUpserted(saved);
        return saved;
    }

    private Job saveExpectingVersion(Job job) {
        try {
            return jobs.save(job);
        } catch (OptimisticLockingFailureException ex) {
            throw new JobException(
                    JobErrorCodes.OPTIMISTIC_LOCK_CONFLICT,
                    HttpStatus.CONFLICT,
                    "Job was modified concurrently — refresh and retry");
        }
    }

    private Job loadOrThrow(UUID tenant, UUID id) {
        return jobs.findByTenantAndId(tenant, id)
                .orElseThrow(
                        () ->
                                new JobException(
                                        JobErrorCodes.JOB_NOT_FOUND,
                                        HttpStatus.NOT_FOUND,
                                        "Job not found"));
    }

    private static Job withStatus(Job j, JobStatus status, Instant publishedAt, Instant closedAt) {
        return new Job(
                j.id(),
                j.tenantId(),
                j.organizationId(),
                j.slug(),
                j.title(),
                j.department(),
                j.description(),
                j.responsibilities(),
                j.qualifications(),
                status,
                j.employmentType(),
                j.remotePolicy(),
                j.experienceMinYears(),
                j.experienceMaxYears(),
                j.salaryMinCents(),
                j.salaryMaxCents(),
                j.currencyCode(),
                j.location(),
                j.locationCity(),
                j.locationRegion(),
                j.locationCountry(),
                publishedAt,
                closedAt,
                j.pipelineId(),
                j.boostScore(),
                j.skills(),
                j.createdAt(),
                Instant.now());
    }

    private static <T> T firstNonNull(T a, T b) {
        return a != null ? a : b;
    }

    private static String nonBlankOr(String a, String b) {
        return (a != null && !a.isBlank()) ? a : b;
    }

    static String slugify(String input) {
        if (input == null || input.isBlank()) {
            return null;
        }
        String normalized = Normalizer.normalize(input, Normalizer.Form.NFKD);
        String ascii = normalized.replaceAll("\\p{InCombiningDiacriticalMarks}+", "");
        String slug =
                ascii.toLowerCase(Locale.ROOT)
                        .replaceAll("[^a-z0-9]+", "-")
                        .replaceAll("(^-|-$)", "");
        if (slug.length() > 240) {
            slug = slug.substring(0, 240);
        }
        return slug.isEmpty() ? null : slug + "-" + Long.toUnsignedString(System.nanoTime(), 36);
    }

    /** Mutable input for create / update flows. */
    public record JobInput(
            String title,
            String department,
            String description,
            String responsibilities,
            String qualifications,
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
            UUID organizationId,
            UUID pipelineId,
            List<String> skills) {}
}
