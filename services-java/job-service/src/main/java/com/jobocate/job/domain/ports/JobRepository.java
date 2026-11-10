package com.jobocate.job.domain.ports;

import com.jobocate.job.domain.model.Job;
import com.jobocate.job.domain.model.JobStatus;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface JobRepository {

    Job save(Job job);

    Optional<Job> findByTenantAndId(UUID tenantId, UUID id);

    Optional<Job> findByTenantAndSlug(UUID tenantId, String slug);

    List<Job> searchByTenant(UUID tenantId, JobStatus status, int limit, int offset);
}
