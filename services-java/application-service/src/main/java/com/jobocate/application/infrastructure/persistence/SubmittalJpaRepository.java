package com.jobocate.application.infrastructure.persistence;

import com.jobocate.application.infrastructure.persistence.SubmittalEntity.SubmittalStatus;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SubmittalJpaRepository extends JpaRepository<SubmittalEntity, UUID> {

    Optional<SubmittalEntity> findByTenantIdAndId(UUID tenantId, UUID id);

    List<SubmittalEntity> findByTenantIdOrderByCreatedAtDesc(UUID tenantId, Pageable page);

    List<SubmittalEntity> findByTenantIdAndStatusOrderByCreatedAtDesc(
            UUID tenantId, SubmittalStatus status, Pageable page);

    boolean existsByTenantIdAndApplicationIdAndStatusIn(
            UUID tenantId, UUID applicationId, Collection<SubmittalStatus> statuses);
}
