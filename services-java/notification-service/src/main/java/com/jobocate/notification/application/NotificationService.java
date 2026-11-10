package com.jobocate.notification.application;

import com.jobocate.notification.infrastructure.persistence.NotificationChannel;
import com.jobocate.notification.infrastructure.persistence.NotificationEntity;
import com.jobocate.notification.infrastructure.persistence.NotificationJpaRepository;
import com.jobocate.notification.infrastructure.persistence.NotificationPreferenceEntity;
import com.jobocate.notification.infrastructure.persistence.NotificationPreferenceJpaRepository;
import com.jobocate.notification.infrastructure.persistence.NotificationProcessedEventEntity;
import com.jobocate.notification.infrastructure.persistence.NotificationProcessedEventJpaRepository;
import com.jobocate.notification.infrastructure.persistence.NotificationStatus;
import com.jobocate.notification.infrastructure.persistence.NotificationType;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class NotificationService {

    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);

    private final NotificationJpaRepository notifications;
    private final NotificationPreferenceJpaRepository preferences;
    private final NotificationProcessedEventJpaRepository processed;
    private final NotificationRateLimiter limiter;
    private final EmailDispatcher email;
    private final Counter created;
    private final Counter suppressed;
    private final Counter dispatched;
    private final Counter failed;

    public NotificationService(
            NotificationJpaRepository notifications,
            NotificationPreferenceJpaRepository preferences,
            NotificationProcessedEventJpaRepository processed,
            NotificationRateLimiter limiter,
            EmailDispatcher email,
            MeterRegistry meters) {
        this.notifications = notifications;
        this.preferences = preferences;
        this.processed = processed;
        this.limiter = limiter;
        this.email = email;
        this.created = Counter.builder("notification.created").register(meters);
        this.suppressed = Counter.builder("notification.suppressed").register(meters);
        this.dispatched = Counter.builder("notification.dispatched").register(meters);
        this.failed = Counter.builder("notification.failed").register(meters);
    }

    @Transactional(readOnly = true)
    public List<NotificationEntity> listForUser(UUID userId, int limit) {
        if (userId == null) return List.of();
        Pageable page = Pageable.ofSize(Math.min(Math.max(limit, 1), 100));
        return notifications.findByRecipientUserIdOrderByCreatedAtDesc(userId, page);
    }

    @Transactional
    public NotificationEntity markRead(UUID userId, UUID notificationId) {
        NotificationEntity row = notifications
                .findByIdAndRecipientUserId(notificationId, userId)
                .orElseThrow(() -> new NotificationNotFoundException(notificationId));
        row.markRead(Instant.now());
        return row;
    }

    @Transactional(readOnly = true)
    public List<NotificationPreferenceEntity> preferencesFor(UUID userId) {
        if (userId == null) return List.of();
        return preferences.findByUserId(userId);
    }

    @Transactional
    public NotificationPreferenceEntity upsertPreference(
            UUID userId,
            UUID tenantId,
            NotificationType type,
            NotificationChannel channel,
            boolean enabled,
            NotificationPreferenceEntity.Cadence cadence) {
        NotificationPreferenceEntity row = preferences
                .findByUserIdAndNotificationTypeAndChannel(userId, type, channel)
                .orElseGet(() -> {
                    NotificationPreferenceEntity newRow = new NotificationPreferenceEntity();
                    newRow.setId(UUID.randomUUID());
                    newRow.setUserId(userId);
                    newRow.setTenantId(tenantId);
                    newRow.setNotificationType(type);
                    newRow.setChannel(channel);
                    return newRow;
                });
        row.setEnabled(enabled);
        if (cadence != null) row.setCadence(cadence);
        return preferences.save(row);
    }

    /**
     * Idempotent enqueue: if the {@code eventId} was already processed, the
     * existing notification is returned. Honors per-user preferences and
     * rate-limit caps before dispatching to the channel.
     */
    @Transactional
    public Optional<NotificationEntity> enqueue(@NotNull EnqueueRequest req) {
        if (req.recipientUserId() == null || req.type() == null || req.channel() == null) {
            log.warn("notification.enqueue dropped: missing required fields");
            return Optional.empty();
        }
        if (req.eventId() != null && processed.existsByEventId(req.eventId())) {
            log.debug("notification.enqueue skip duplicate eventId={}", req.eventId());
            return Optional.empty();
        }

        NotificationStatus initial = NotificationStatus.QUEUED;
        if (!preferenceAllows(req.recipientUserId(), req.type(), req.channel())) {
            initial = NotificationStatus.SUPPRESSED;
            suppressed.increment();
        } else if (!limiter.allow(req.recipientUserId(), req.type())) {
            initial = NotificationStatus.SUPPRESSED;
            suppressed.increment();
            log.info(
                    "notification.enqueue rate-limited user={} type={}",
                    req.recipientUserId(),
                    req.type());
        }

        NotificationEntity row = new NotificationEntity();
        row.setId(UUID.randomUUID());
        row.setTenantId(req.tenantId());
        row.setRecipientUserId(req.recipientUserId());
        row.setType(req.type());
        row.setChannel(req.channel());
        row.setPayload(req.payload() == null ? new HashMap<>() : new LinkedHashMap<>(req.payload()));
        row.setCreatedAt(Instant.now());
        if (initial == NotificationStatus.SUPPRESSED) {
            row.markSuppressed();
        }
        notifications.save(row);
        created.increment();

        if (req.eventId() != null) {
            processed.save(new NotificationProcessedEventEntity(
                    req.eventId(), req.sourceTopic() == null ? "n/a" : req.sourceTopic(),
                    Instant.now(), row.getId()));
        }

        if (initial == NotificationStatus.QUEUED) {
            dispatch(row, req);
        }
        return Optional.of(row);
    }

    private void dispatch(NotificationEntity row, EnqueueRequest req) {
        try {
            if (row.getChannel() == NotificationChannel.EMAIL && req.recipientEmail() != null) {
                NotificationTemplate.Rendered rendered =
                        NotificationTemplate.render(row.getType(), row.getPayload());
                EmailDispatcher.DispatchResult result = email.send(
                        new EmailDispatcher.EmailMessage(
                                req.recipientEmail(),
                                req.recipientName(),
                                rendered.subject(),
                                rendered.htmlBody(),
                                rendered.textBody(),
                                req.correlationId() == null ? null : req.correlationId().toString()));
                if (result.success()) {
                    row.markSent(Instant.now());
                    dispatched.increment();
                } else {
                    row.markFailed(result.failureReason(), Instant.now());
                    failed.increment();
                }
            } else if (row.getChannel() == NotificationChannel.IN_APP) {
                row.markSent(Instant.now()); // in-app delivery = persisted; client polls.
                dispatched.increment();
            } else {
                // SMS / unknown — leave QUEUED for a later worker (post-MVP).
                log.debug("notification.dispatch deferred channel={}", row.getChannel());
            }
        } catch (Exception ex) {
            row.markFailed(ex.getMessage(), Instant.now());
            failed.increment();
            log.warn("notification.dispatch failed id={} err={}", row.getId(), ex.getMessage());
        }
    }

    private boolean preferenceAllows(UUID userId, NotificationType type, NotificationChannel channel) {
        return preferences
                .findByUserIdAndNotificationTypeAndChannel(userId, type, channel)
                .map(p -> p.isEnabled() && p.getCadence() != NotificationPreferenceEntity.Cadence.OFF)
                .orElse(true); // default-on
    }

    public record EnqueueRequest(
            UUID eventId,
            String sourceTopic,
            UUID tenantId,
            UUID recipientUserId,
            String recipientEmail,
            String recipientName,
            NotificationType type,
            NotificationChannel channel,
            Map<String, Object> payload,
            UUID correlationId,
            UUID relatedEntityId,
            String relatedEntityType) {}

    public static class NotificationNotFoundException extends RuntimeException {
        public NotificationNotFoundException(UUID id) {
            super("Notification not found: " + id);
        }
    }
}
