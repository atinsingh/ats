package com.jobocate.job.infrastructure.persistence;

import com.jobocate.job.domain.model.JobStatus;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

interface SpringDataJobRepository extends JpaRepository<JobEntity, UUID> {

    Optional<JobEntity> findByTenantIdAndId(UUID tenantId, UUID id);

    Optional<JobEntity> findByTenantIdAndSlug(UUID tenantId, String slug);

    List<JobEntity> findByTenantIdAndStatusOrderByCreatedAtDesc(
            UUID tenantId, JobStatus status, Pageable pageable);
}
