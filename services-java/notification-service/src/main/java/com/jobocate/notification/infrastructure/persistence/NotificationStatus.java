package com.jobocate.notification.infrastructure.persistence;

public enum NotificationStatus {
    QUEUED,
    SENT,
    DELIVERED,
    FAILED,
    SUPPRESSED
}
