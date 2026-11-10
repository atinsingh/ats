CREATE TABLE saved_searches (
    id                  UUID         PRIMARY KEY,
    user_id             UUID         NOT NULL,
    tenant_id           UUID,
    target              VARCHAR(16)  NOT NULL,
    name                VARCHAR(256) NOT NULL,
    query_dsl           JSONB        NOT NULL,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    created_by_user_id  UUID,
    updated_by_user_id  UUID,
    version             BIGINT       NOT NULL DEFAULT 0,
    deleted_at          TIMESTAMPTZ,
    CONSTRAINT chk_saved_search_target CHECK (target IN ('JOBS','CANDIDATES'))
);
CREATE INDEX idx_saved_searches_user ON saved_searches (user_id);

CREATE TABLE alert_subscriptions (
    id                  UUID         PRIMARY KEY,
    saved_search_id     UUID         NOT NULL,
    user_id             UUID         NOT NULL,
    tenant_id           UUID,
    cadence             VARCHAR(16)  NOT NULL DEFAULT 'DAILY',
    last_run_at         TIMESTAMPTZ,
    next_run_at         TIMESTAMPTZ,
    enabled             BOOLEAN      NOT NULL DEFAULT true,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    version             BIGINT       NOT NULL DEFAULT 0,
    CONSTRAINT chk_alert_cadence CHECK (cadence IN ('IMMEDIATE','DAILY','WEEKLY','OFF'))
);
CREATE INDEX idx_alert_subscriptions_user        ON alert_subscriptions (user_id);
CREATE INDEX idx_alert_subscriptions_due
    ON alert_subscriptions (next_run_at)
    WHERE enabled = true;

CREATE TABLE saved_jobs (
    user_id     UUID         NOT NULL,
    job_id      UUID         NOT NULL,
    tenant_id   UUID,
    saved_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, job_id)
);
CREATE INDEX idx_saved_jobs_user_recent ON saved_jobs (user_id, saved_at DESC);
