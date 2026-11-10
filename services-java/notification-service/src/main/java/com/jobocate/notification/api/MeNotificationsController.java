package com.jobocate.notification.api;

import com.jobocate.notification.application.NotificationService;
import com.jobocate.notification.infrastructure.persistence.NotificationChannel;
import com.jobocate.notification.infrastructure.persistence.NotificationEntity;
import com.jobocate.notification.infrastructure.persistence.NotificationPreferenceEntity;
import com.jobocate.notification.infrastructure.persistence.NotificationStatus;
import com.jobocate.notification.infrastructure.persistence.NotificationType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/me")
public class MeNotificationsController {

    private final NotificationService service;

    public MeNotificationsController(NotificationService service) {
        this.service = service;
    }

    @GetMapping("/notifications")
    public List<NotificationResponse> list(
            @RequestHeader("X-Jobocate-User-Id") UUID userId,
            @RequestParam(value = "limit", defaultValue = "25") int limit) {
        return service.listForUser(userId, limit).stream().map(NotificationResponse::from).toList();
    }

    @PostMapping("/notifications/{id}/read")
    public NotificationResponse markRead(
            @RequestHeader("X-Jobocate-User-Id") UUID userId, @PathVariable("id") UUID id) {
        return NotificationResponse.from(service.markRead(userId, id));
    }

    @GetMapping("/notification-preferences")
    public List<PreferenceResponse> listPrefs(@RequestHeader("X-Jobocate-User-Id") UUID userId) {
        return service.preferencesFor(userId).stream().map(PreferenceResponse::from).toList();
    }

    @PutMapping("/notification-preferences")
    public ResponseEntity<PreferenceResponse> upsertPref(
            @RequestHeader("X-Jobocate-User-Id") UUID userId,
            @RequestHeader(value = "X-Jobocate-Tenant-Id", required = false) UUID tenantId,
            @Valid @RequestBody PreferenceUpsertRequest body) {
        NotificationPreferenceEntity row = service.upsertPreference(
                userId,
                tenantId,
                body.type(),
                body.channel(),
                body.enabled(),
                body.cadence() == null
                        ? NotificationPreferenceEntity.Cadence.IMMEDIATE
                        : body.cadence());
        return ResponseEntity.ok(PreferenceResponse.from(row));
    }

    @PatchMapping("/notification-preferences")
    public ResponseEntity<PreferenceResponse> patchPref(
            @RequestHeader("X-Jobocate-User-Id") UUID userId,
            @RequestHeader(value = "X-Jobocate-Tenant-Id", required = false) UUID tenantId,
            @Valid @RequestBody PreferenceUpsertRequest body) {
        return upsertPref(userId, tenantId, body);
    }

    public record PreferenceUpsertRequest(
            @NotNull NotificationType type,
            @NotNull NotificationChannel channel,
            boolean enabled,
            NotificationPreferenceEntity.Cadence cadence) {}

    public record PreferenceResponse(
            UUID id,
            NotificationType type,
            NotificationChannel channel,
            boolean enabled,
            NotificationPreferenceEntity.Cadence cadence) {

        static PreferenceResponse from(NotificationPreferenceEntity e) {
            return new PreferenceResponse(
                    e.getId(),
                    e.getNotificationType(),
                    e.getChannel(),
                    e.isEnabled(),
                    e.getCadence());
        }
    }

    public record NotificationResponse(
            UUID id,
            NotificationType type,
            NotificationChannel channel,
            NotificationStatus status,
            Map<String, Object> payload,
            Instant createdAt,
            Instant readAt) {

        static NotificationResponse from(NotificationEntity n) {
            return new NotificationResponse(
                    n.getId(),
                    n.getType(),
                    n.getChannel(),
                    n.getStatus(),
                    n.getPayload(),
                    n.getCreatedAt(),
                    n.getReadAt());
        }
    }
}
