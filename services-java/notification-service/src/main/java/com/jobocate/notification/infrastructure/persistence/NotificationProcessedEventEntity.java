package com.jobocate.notification.infrastructure.persistence;

import jakarta.persistence.Access;
import jakarta.persistence.AccessType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Access(AccessType.FIELD)
@Table(name = "notification_processed_events")
public class NotificationProcessedEventEntity {

    @Id
    @Column(name = "event_id")
    private UUID eventId;

    @Column(name = "source_topic", nullable = false, length = 128)
    private String sourceTopic;

    @Column(name = "received_at", nullable = false)
    private Instant receivedAt;

    @Column(name = "notification_id")
    private UUID notificationId;

    public NotificationProcessedEventEntity() {}

    public NotificationProcessedEventEntity(
            UUID eventId, String sourceTopic, Instant receivedAt, UUID notificationId) {
        this.eventId = eventId;
        this.sourceTopic = sourceTopic;
        this.receivedAt = receivedAt;
        this.notificationId = notificationId;
    }

    public UUID getEventId() {
        return eventId;
    }

    public String getSourceTopic() {
        return sourceTopic;
    }

    public Instant getReceivedAt() {
        return receivedAt;
    }

    public UUID getNotificationId() {
        return notificationId;
    }
}
