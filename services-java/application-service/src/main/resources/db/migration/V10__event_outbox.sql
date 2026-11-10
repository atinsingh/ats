-- Transactional outbox owned by application-service. Service-qualified
-- table name (`application_event_outbox`) because all services currently
-- share the same `public` schema; see database-design.md §1.

CREATE TABLE application_event_outbox (
    id                  UUID         PRIMARY KEY,
    aggregate_type      VARCHAR(64)  NOT NULL,
    aggregate_id        UUID         NOT NULL,
    tenant_id           UUID,
    event_type          VARCHAR(128) NOT NULL,
    topic               VARCHAR(128) NOT NULL,
    partition_key       VARCHAR(128),
    payload             JSONB        NOT NULL,
    headers             JSONB        NOT NULL DEFAULT '{}'::jsonb,
    status              VARCHAR(16)  NOT NULL DEFAULT 'PENDING',
    attempt_count       INTEGER      NOT NULL DEFAULT 0,
    next_attempt_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    last_error          TEXT,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    published_at        TIMESTAMPTZ,
    correlation_id      UUID,
    CONSTRAINT chk_application_event_outbox_status
        CHECK (status IN ('PENDING','PUBLISHED','FAILED'))
);

CREATE INDEX idx_application_event_outbox_due
    ON application_event_outbox (status, next_attempt_at)
    WHERE status IN ('PENDING','FAILED');

CREATE INDEX idx_application_event_outbox_aggregate
    ON application_event_outbox (aggregate_type, aggregate_id);
