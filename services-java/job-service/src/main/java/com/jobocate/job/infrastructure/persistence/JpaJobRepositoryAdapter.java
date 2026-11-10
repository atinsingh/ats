package com.jobocate.job.infrastructure.persistence;

import com.jobocate.job.domain.model.Job;
import com.jobocate.job.domain.model.JobStatus;
import com.jobocate.job.domain.ports.JobRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public class JpaJobRepositoryAdapter implements JobRepository {

    private final SpringDataJobRepository delegate;

    public JpaJobRepositoryAdapter(SpringDataJobRepository delegate) {
        this.delegate = delegate;
    }

    @Override
    @Transactional
    public Job save(Job job) {
        JobEntity entity =
                delegate
                        .findById(job.id())
                        .map(
                                e -> {
                                    e.applyDomain(job);
                                    return e;
                                })
                        .orElseGet(() -> JobEntity.from(job));
        JobEntity saved = delegate.save(entity);
        return saved.toDomain(job.skills() == null ? List.of() : job.skills());
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<Job> findByTenantAndId(UUID tenantId, UUID id) {
        return delegate.findByTenantIdAndId(tenantId, id).map(e -> e.toDomain(List.of()));
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<Job> findByTenantAndSlug(UUID tenantId, String slug) {
        return delegate.findByTenantIdAndSlug(tenantId, slug).map(e -> e.toDomain(List.of()));
    }

    @Override
    @Transactional(readOnly = true)
    public List<Job> searchByTenant(UUID tenantId, JobStatus status, int limit, int offset) {
        int safeLimit = Math.max(1, Math.min(limit, 100));
        return delegate
                .findByTenantIdAndStatusOrderByCreatedAtDesc(
                        tenantId, status, PageRequest.of(offset / safeLimit, safeLimit))
                .stream()
                .map(e -> e.toDomain(List.of()))
                .toList();
    }
}
