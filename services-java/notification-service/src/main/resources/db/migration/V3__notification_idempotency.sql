-- Tracks Kafka event ids already handled by notification-service so that
-- redelivered messages don't generate duplicate notifications.
CREATE TABLE notification_processed_events (
    event_id     UUID         PRIMARY KEY,
    source_topic VARCHAR(128) NOT NULL,
    received_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    notification_id UUID
);

CREATE INDEX idx_notification_processed_events_topic
    ON notification_processed_events (source_topic, received_at DESC);
