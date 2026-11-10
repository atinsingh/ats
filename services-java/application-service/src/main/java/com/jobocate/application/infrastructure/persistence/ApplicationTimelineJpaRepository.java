package com.jobocate.application.infrastructure.persistence;

import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ApplicationTimelineJpaRepository
        extends JpaRepository<ApplicationTimelineEntryEntity, UUID> {

    List<ApplicationTimelineEntryEntity>
            findByTenantIdAndApplicationIdOrderByCreatedAtDesc(
                    UUID tenantId, UUID applicationId, Pageable pageable);
}
