-- Transactional outbox owned by job-service. Rows are written in the same
-- transaction as the domain change; an in-process publisher loop drains
-- PENDING rows to Kafka and marks them PUBLISHED.
--
-- Table name is service-qualified (`job_event_outbox`) because all services
-- currently share the same `public` schema; see database-design.md §1.

CREATE TABLE job_event_outbox (
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
    CONSTRAINT chk_job_event_outbox_status
        CHECK (status IN ('PENDING','PUBLISHED','FAILED'))
);

CREATE INDEX idx_job_event_outbox_due
    ON job_event_outbox (status, next_attempt_at)
    WHERE status IN ('PENDING','FAILED');

CREATE INDEX idx_job_event_outbox_aggregate
    ON job_event_outbox (aggregate_type, aggregate_id);
