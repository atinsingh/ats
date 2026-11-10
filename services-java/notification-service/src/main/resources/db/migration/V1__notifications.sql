CREATE TABLE notifications (
    id                   UUID         PRIMARY KEY,
    tenant_id            UUID,
    recipient_user_id    UUID         NOT NULL,
    type                 VARCHAR(64)  NOT NULL,
    channel              VARCHAR(16)  NOT NULL,
    status               VARCHAR(16)  NOT NULL DEFAULT 'QUEUED',
    payload              JSONB        NOT NULL DEFAULT '{}'::jsonb,
    template_key         VARCHAR(128),
    correlation_id       UUID,
    related_entity_type  VARCHAR(32),
    related_entity_id    UUID,
    attempt_count        INTEGER      NOT NULL DEFAULT 0,
    last_attempted_at    TIMESTAMPTZ,
    last_error           TEXT,
    sent_at              TIMESTAMPTZ,
    delivered_at         TIMESTAMPTZ,
    failed_at            TIMESTAMPTZ,
    read_at              TIMESTAMPTZ,
    created_at           TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT chk_notification_channel
        CHECK (channel IN ('EMAIL','IN_APP','SMS')),
    CONSTRAINT chk_notification_status
        CHECK (status IN ('QUEUED','SENT','DELIVERED','FAILED','SUPPRESSED'))
);

CREATE INDEX idx_notifications_user_recent
    ON notifications (recipient_user_id, created_at DESC);

CREATE INDEX idx_notifications_unread
    ON notifications (recipient_user_id, created_at DESC)
    WHERE read_at IS NULL;

CREATE INDEX idx_notifications_status_due
    ON notifications (status, last_attempted_at)
    WHERE status IN ('QUEUED','FAILED');

CREATE INDEX idx_notifications_tenant_type
    ON notifications (tenant_id, type) WHERE tenant_id IS NOT NULL;
