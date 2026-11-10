package com.jobocate.candidate.infrastructure.persistence;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ResumeProcessedEventJpaRepository
        extends JpaRepository<ResumeProcessedEventEntity, UUID> {

    boolean existsByEventId(UUID eventId);
}
