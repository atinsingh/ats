package com.jobocate.notification.infrastructure.persistence;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NotificationPreferenceJpaRepository
        extends JpaRepository<NotificationPreferenceEntity, UUID> {

    List<NotificationPreferenceEntity> findByUserId(UUID userId);

    Optional<NotificationPreferenceEntity>
            findByUserIdAndNotificationTypeAndChannel(
                    UUID userId, NotificationType type, NotificationChannel channel);
}
