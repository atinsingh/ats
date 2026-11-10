package com.jobocate.notification.application;

import com.jobocate.notification.infrastructure.persistence.NotificationJpaRepository;
import com.jobocate.notification.infrastructure.persistence.NotificationType;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Component;

/**
 * Naive per-(user,type) rate limiter that backs onto the notifications table.
 * Production should layer Redis-backed token-bucket on top, but this gives
 * MVP-grade abuse protection without adding infra.
 */
@Component
public class NotificationRateLimiter {

    /** Default per-hour caps; tune via tenant policy later. */
    private static final Map<NotificationType, Integer> PER_HOUR_LIMITS = Map.of(
            NotificationType.JOB_ALERT, 6,
            NotificationType.SAVED_SEARCH_DIGEST, 3,
            NotificationType.AI_DRAFT_READY, 20,
            NotificationType.MENTION, 30,
            NotificationType.INTERVIEW_REMINDER, 10);

    private static final int DEFAULT_LIMIT = 60;
    private static final Duration WINDOW = Duration.ofHours(1);

    private final NotificationJpaRepository notifications;

    public NotificationRateLimiter(NotificationJpaRepository notifications) {
        this.notifications = notifications;
    }

    public boolean allow(UUID userId, NotificationType type) {
        if (userId == null || type == null) return true;
        int limit = PER_HOUR_LIMITS.getOrDefault(type, DEFAULT_LIMIT);
        Instant since = Instant.now().minus(WINDOW);
        long recent = notifications.countRecentByType(userId, type, since);
        return recent < limit;
    }
}
