package com.jobocate.notification.api;

import com.jobocate.notification.application.NotificationService;
import com.jobocate.notification.application.NotificationService.EnqueueRequest;
import com.jobocate.notification.infrastructure.persistence.NotificationChannel;
import com.jobocate.notification.infrastructure.persistence.NotificationEntity;
import com.jobocate.notification.infrastructure.persistence.NotificationType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.util.Map;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Lets other services (or batch jobs) push notifications directly without
 * going through Kafka. Guarded by {@code jobocate.internal-token} so it
 * cannot be reached from the public internet.
 */
@RestController
@RequestMapping("/internal/v1/notifications")
public class InternalNotificationController {

    private final NotificationService service;
    private final String expectedToken;

    public InternalNotificationController(
            NotificationService service,
            @Value("${jobocate.internal-token:}") String expectedToken) {
        this.service = service;
        this.expectedToken = expectedToken == null ? "" : expectedToken;
    }

    @PostMapping
    public ResponseEntity<EnqueuedResponse> enqueue(
            @RequestHeader(value = "Authorization", required = false) String auth,
            @Valid @RequestBody EnqueueBody body) {
        authorize(auth);
        return service
                .enqueue(new EnqueueRequest(
                        body.eventId(),
                        body.sourceTopic(),
                        body.tenantId(),
                        body.recipientUserId(),
                        body.recipientEmail(),
                        body.recipientName(),
                        body.type(),
                        body.channel(),
                        body.payload(),
                        body.correlationId(),
                        body.relatedEntityId(),
                        body.relatedEntityType()))
                .map(NotificationEntity::getId)
                .map(EnqueuedResponse::new)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NO_CONTENT).build());
    }

    private void authorize(String authHeader) {
        if (expectedToken.isBlank()) return; // dev: open. Configure jobocate.internal-token in prod.
        if (authHeader == null || !authHeader.equals("Bearer " + expectedToken)) {
            throw new AccessDeniedException("invalid internal token");
        }
    }

    public record EnqueueBody(
            UUID eventId,
            String sourceTopic,
            UUID tenantId,
            @NotNull UUID recipientUserId,
            String recipientEmail,
            String recipientName,
            @NotNull NotificationType type,
            @NotNull NotificationChannel channel,
            Map<String, Object> payload,
            UUID correlationId,
            UUID relatedEntityId,
            String relatedEntityType) {}

    public record EnqueuedResponse(UUID notificationId) {}
}
