package com.jobocate.application.infrastructure.persistence;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ApplicationJpaRepository extends JpaRepository<ApplicationEntity, UUID> {

    List<ApplicationEntity> findByTenantIdOrderByCreatedAtDesc(UUID tenantId);

    Optional<ApplicationEntity> findByTenantIdAndId(UUID tenantId, UUID id);

    Optional<ApplicationEntity> findByTenantIdAndSubmittedViaIdempotencyKey(
            UUID tenantId, String idempotencyKey);

    @Query(
            "select a from ApplicationEntity a "
                    + "where a.tenantId = :tenantId "
                    + "  and a.jobId = :jobId "
                    + "  and a.candidateProfileId = :candidateProfileId "
                    + "  and a.status not in ("
                    + "       com.jobocate.application.infrastructure.persistence.ApplicationStatus.REJECTED,"
                    + "       com.jobocate.application.infrastructure.persistence.ApplicationStatus.WITHDRAWN,"
                    + "       com.jobocate.application.infrastructure.persistence.ApplicationStatus.EXPIRED,"
                    + "       com.jobocate.application.infrastructure.persistence.ApplicationStatus.HIRED)")
    Optional<ApplicationEntity> findActiveDuplicate(
            @Param("tenantId") UUID tenantId,
            @Param("jobId") UUID jobId,
            @Param("candidateProfileId") UUID candidateProfileId);
}
