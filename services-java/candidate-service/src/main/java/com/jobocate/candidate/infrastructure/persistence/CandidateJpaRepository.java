package com.jobocate.candidate.infrastructure.persistence;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CandidateJpaRepository extends JpaRepository<CandidateProfileEntity, UUID> {

    List<CandidateProfileEntity> findByTenantIdOrderByCreatedAtDesc(UUID tenantId);

    Optional<CandidateProfileEntity> findByTenantIdAndIdAndDeletedAtIsNull(UUID tenantId, UUID id);
}
