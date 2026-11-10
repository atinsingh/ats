-- Preferences are per (user, optional tenant, type, channel). The unique
-- index uses a sentinel UUID for global preferences to make NULL-aware
-- uniqueness work without a partial index.

CREATE TABLE notification_preferences (
    id                   UUID         PRIMARY KEY,
    user_id              UUID         NOT NULL,
    tenant_id            UUID,
    notification_type    VARCHAR(64)  NOT NULL,
    channel              VARCHAR(16)  NOT NULL,
    enabled              BOOLEAN      NOT NULL DEFAULT true,
    cadence              VARCHAR(16)  NOT NULL DEFAULT 'IMMEDIATE',
    created_at           TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ  NOT NULL DEFAULT now(),
    version              BIGINT       NOT NULL DEFAULT 0,
    CONSTRAINT chk_notification_pref_channel
        CHECK (channel IN ('EMAIL','IN_APP','SMS')),
    CONSTRAINT chk_notification_pref_cadence
        CHECK (cadence IN ('IMMEDIATE','DAILY','WEEKLY','OFF'))
);

CREATE UNIQUE INDEX ux_notification_pref_unique
    ON notification_preferences (
        user_id,
        COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid),
        notification_type,
        channel
    );

CREATE INDEX idx_notification_pref_user ON notification_preferences (user_id);
