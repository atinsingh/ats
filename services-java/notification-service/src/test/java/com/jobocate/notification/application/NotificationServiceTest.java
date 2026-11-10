package com.jobocate.notification.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.jobocate.notification.application.NotificationService.EnqueueRequest;
import com.jobocate.notification.infrastructure.persistence.NotificationChannel;
import com.jobocate.notification.infrastructure.persistence.NotificationEntity;
import com.jobocate.notification.infrastructure.persistence.NotificationJpaRepository;
import com.jobocate.notification.infrastructure.persistence.NotificationPreferenceEntity;
import com.jobocate.notification.infrastructure.persistence.NotificationPreferenceJpaRepository;
import com.jobocate.notification.infrastructure.persistence.NotificationProcessedEventEntity;
import com.jobocate.notification.infrastructure.persistence.NotificationProcessedEventJpaRepository;
import com.jobocate.notification.infrastructure.persistence.NotificationStatus;
import com.jobocate.notification.infrastructure.persistence.NotificationType;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class NotificationServiceTest {

    @Test
    void enqueueDispatchesEmailAndIsIdempotentOnEventId() {
        NotificationJpaRepository notifs = mock(NotificationJpaRepository.class);
        NotificationProcessedEventJpaRepository processed =
                mock(NotificationProcessedEventJpaRepository.class);
        NotificationPreferenceJpaRepository prefs = mock(NotificationPreferenceJpaRepository.class);
        NotificationRateLimiter limiter = new AlwaysAllowLimiter(notifs);
        StubEmail email = new StubEmail();

        when(notifs.save(any(NotificationEntity.class))).thenAnswer(inv -> inv.getArgument(0));
        when(processed.existsByEventId(any())).thenReturn(false, true);
        when(prefs.findByUserIdAndNotificationTypeAndChannel(any(), any(), any()))
                .thenReturn(Optional.empty());

        NotificationService svc = new NotificationService(
                notifs, prefs, processed, limiter, email, new SimpleMeterRegistry());

        UUID eventId = UUID.randomUUID();
        Map<String, Object> ctx = new LinkedHashMap<>();
        ctx.put("job_title", "Senior Engineer");
        ctx.put("candidate_name", "Alex Lee");
        EnqueueRequest req = new EnqueueRequest(
                eventId,
                "application.events",
                UUID.randomUUID(),
                UUID.randomUUID(),
                "alex@example.com",
                "Alex Lee",
                NotificationType.APPLICATION_SUBMITTED,
                NotificationChannel.EMAIL,
                ctx,
                null,
                UUID.randomUUID(),
                "Application");

        Optional<NotificationEntity> first = svc.enqueue(req);
        Optional<NotificationEntity> second = svc.enqueue(req);

        assertThat(first).isPresent();
        assertThat(first.get().getStatus()).isEqualTo(NotificationStatus.SENT);
        assertThat(second).isEmpty();
        assertThat(email.sent).hasSize(1);
        assertThat(email.sent.get(0).subject()).contains("Senior Engineer");
        verify(notifs, times(1)).save(any(NotificationEntity.class));
        verify(processed, times(1)).save(any(NotificationProcessedEventEntity.class));
    }

    @Test
    void rateLimitedTypesAreSuppressed() {
        NotificationJpaRepository notifs = mock(NotificationJpaRepository.class);
        NotificationProcessedEventJpaRepository processed =
                mock(NotificationProcessedEventJpaRepository.class);
        NotificationPreferenceJpaRepository prefs = mock(NotificationPreferenceJpaRepository.class);
        NotificationRateLimiter limiter = new NeverAllowLimiter(notifs);
        StubEmail email = new StubEmail();

        when(notifs.save(any(NotificationEntity.class))).thenAnswer(inv -> inv.getArgument(0));
        when(prefs.findByUserIdAndNotificationTypeAndChannel(any(), any(), any()))
                .thenReturn(Optional.empty());

        NotificationService svc = new NotificationService(
                notifs, prefs, processed, limiter, email, new SimpleMeterRegistry());

        Optional<NotificationEntity> result = svc.enqueue(new EnqueueRequest(
                UUID.randomUUID(),
                "application.events",
                null,
                UUID.randomUUID(),
                "x@example.com",
                "X",
                NotificationType.JOB_ALERT,
                NotificationChannel.EMAIL,
                Map.of(),
                null,
                null,
                null));

        assertThat(result).isPresent();
        assertThat(result.get().getStatus()).isEqualTo(NotificationStatus.SUPPRESSED);
        assertThat(email.sent).isEmpty();
    }

    @Test
    void preferenceOffSuppressesDispatch() {
        NotificationJpaRepository notifs = mock(NotificationJpaRepository.class);
        NotificationProcessedEventJpaRepository processed =
                mock(NotificationProcessedEventJpaRepository.class);
        NotificationPreferenceJpaRepository prefs = mock(NotificationPreferenceJpaRepository.class);
        NotificationRateLimiter limiter = new AlwaysAllowLimiter(notifs);
        StubEmail email = new StubEmail();

        NotificationPreferenceEntity pref = new NotificationPreferenceEntity();
        pref.setUserId(UUID.randomUUID());
        pref.setEnabled(false);
        pref.setCadence(NotificationPreferenceEntity.Cadence.OFF);
        pref.setNotificationType(NotificationType.JOB_ALERT);
        pref.setChannel(NotificationChannel.EMAIL);

        when(notifs.save(any(NotificationEntity.class))).thenAnswer(inv -> inv.getArgument(0));
        when(prefs.findByUserIdAndNotificationTypeAndChannel(any(), any(), any()))
                .thenReturn(Optional.of(pref));

        NotificationService svc = new NotificationService(
                notifs, prefs, processed, limiter, email, new SimpleMeterRegistry());

        Optional<NotificationEntity> out = svc.enqueue(new EnqueueRequest(
                UUID.randomUUID(),
                "application.events",
                null,
                UUID.randomUUID(),
                "x@example.com",
                "X",
                NotificationType.JOB_ALERT,
                NotificationChannel.EMAIL,
                Map.of(),
                null,
                null,
                null));
        assertThat(out).isPresent();
        assertThat(out.get().getStatus()).isEqualTo(NotificationStatus.SUPPRESSED);
        assertThat(email.sent).isEmpty();
    }

    static class AlwaysAllowLimiter extends NotificationRateLimiter {
        AlwaysAllowLimiter(NotificationJpaRepository repo) { super(repo); }
        @Override public boolean allow(UUID userId, NotificationType type) { return true; }
    }

    static class NeverAllowLimiter extends NotificationRateLimiter {
        NeverAllowLimiter(NotificationJpaRepository repo) { super(repo); }
        @Override public boolean allow(UUID userId, NotificationType type) { return false; }
    }

    static final class StubEmail implements EmailDispatcher {
        final List<EmailMessage> sent = new java.util.ArrayList<>();

        @Override
        public DispatchResult send(EmailMessage message) {
            sent.add(message);
            return DispatchResult.ok("stub-" + sent.size());
        }
    }
}
