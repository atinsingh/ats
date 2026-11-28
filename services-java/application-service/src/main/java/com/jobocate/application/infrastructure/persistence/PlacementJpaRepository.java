package com.jobocate.application.infrastructure.persistence;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PlacementJpaRepository extends JpaRepository<PlacementEntity, UUID> {

    Optional<PlacementEntity> findByTenantIdAndId(UUID tenantId, UUID id);

    List<PlacementEntity> findByTenantIdOrderByStartDateDescCreatedAtDesc(
            UUID tenantId, Pageable page);

    boolean existsByTenantIdAndApplicationId(UUID tenantId, UUID applicationId);
}
