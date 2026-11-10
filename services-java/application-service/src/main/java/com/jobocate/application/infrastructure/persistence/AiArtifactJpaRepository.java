package com.jobocate.application.infrastructure.persistence;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AiArtifactJpaRepository extends JpaRepository<AiArtifactEntity, UUID> {

    Optional<AiArtifactEntity> findByTenantIdAndId(UUID tenantId, UUID id);

    Optional<AiArtifactEntity> findByTenantIdAndIdempotencyKey(UUID tenantId, String idempotencyKey);

    List<AiArtifactEntity> findByTenantIdAndSubjectEntityTypeAndSubjectEntityIdOrderByCreatedAtDesc(
            UUID tenantId, AiArtifactSubjectType subjectType, UUID subjectId, Pageable page);

    List<AiArtifactEntity> findByTenantIdAndRequestedByUserIdOrderByCreatedAtDesc(
            UUID tenantId, UUID requestedByUserId, Pageable page);

    List<AiArtifactEntity> findByTenantIdAndKindOrderByCreatedAtDesc(
            UUID tenantId, AiArtifactKind kind, Pageable page);
}
