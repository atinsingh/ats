package com.jobocate.notification.infrastructure.persistence;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface NotificationJpaRepository extends JpaRepository<NotificationEntity, UUID> {

    List<NotificationEntity> findByRecipientUserIdOrderByCreatedAtDesc(UUID recipientUserId, Pageable page);

    Optional<NotificationEntity> findByIdAndRecipientUserId(UUID id, UUID recipientUserId);

    @Query(
            "select count(n) from NotificationEntity n "
                    + "where n.recipientUserId = :user and n.type = :type "
                    + "  and n.createdAt > :since")
    long countRecentByType(
            @Param("user") UUID userId,
            @Param("type") NotificationType type,
            @Param("since") java.time.Instant since);
}
