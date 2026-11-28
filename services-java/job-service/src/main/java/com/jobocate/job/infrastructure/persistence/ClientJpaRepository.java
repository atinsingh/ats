package com.jobocate.job.infrastructure.persistence;

import com.jobocate.job.domain.model.JobStatus;
import com.jobocate.job.infrastructure.persistence.ClientEntity.ClientStatus;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ClientJpaRepository extends JpaRepository<ClientEntity, UUID> {

    Optional<ClientEntity> findByTenantIdAndId(UUID tenantId, UUID id);

    List<ClientEntity> findByTenantIdOrderByNameAsc(UUID tenantId, Pageable page);

    List<ClientEntity> findByTenantIdAndStatusOrderByNameAsc(
            UUID tenantId, ClientStatus status, Pageable page);

    boolean existsByTenantIdAndNameIgnoreCase(UUID tenantId, String name);

    boolean existsByTenantIdAndNameIgnoreCaseAndIdNot(UUID tenantId, String name, UUID id);

    /** [clientId, count] for each client with jobs in the given status. */
    @Query(
            "select j.organizationId, count(j) from JobEntity j where j.tenantId = :tenant"
                    + " and j.status = :status and j.organizationId in :ids"
                    + " group by j.organizationId")
    List<Object[]> countJobsByClient(
            @Param("tenant") UUID tenant,
            @Param("status") JobStatus status,
            @Param("ids") Collection<UUID> ids);
}
