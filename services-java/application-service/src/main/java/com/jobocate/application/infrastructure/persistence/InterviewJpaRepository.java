package com.jobocate.application.infrastructure.persistence;

import com.jobocate.application.infrastructure.persistence.InterviewEntity.InterviewStatus;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InterviewJpaRepository extends JpaRepository<InterviewEntity, UUID> {

    Optional<InterviewEntity> findByTenantIdAndId(UUID tenantId, UUID id);

    List<InterviewEntity>
            findByTenantIdAndStatusInAndScheduledStartBetweenOrderByScheduledStartAsc(
                    UUID tenantId,
                    Collection<InterviewStatus> statuses,
                    Instant from,
                    Instant to,
                    Pageable page);

    List<InterviewEntity> findByTenantIdAndApplicationIdOrderByScheduledStartAsc(
            UUID tenantId, UUID applicationId);
}
