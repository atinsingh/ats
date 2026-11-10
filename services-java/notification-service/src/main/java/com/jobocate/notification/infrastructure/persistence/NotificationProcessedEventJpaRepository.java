package com.jobocate.notification.infrastructure.persistence;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NotificationProcessedEventJpaRepository
        extends JpaRepository<NotificationProcessedEventEntity, UUID> {

    boolean existsByEventId(UUID eventId);
}
