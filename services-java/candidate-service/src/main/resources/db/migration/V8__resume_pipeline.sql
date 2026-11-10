-- Adds the resume ingestion pipeline pieces:
--   * candidate_event_outbox   — transactional outbox for resume.* + candidate.* events
--   * resume_processed_events  — idempotency table for parser callbacks
--   * resume_parsed_fields     — review_status + reviewed_at columns
--   * resumes                  — adds IN_PROGRESS to the parser status enum
--
-- Mirrors the application-service outbox shape so OutboxPublisher can be reused
-- without modification.

CREATE TABLE candidate_event_outbox (
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
    CONSTRAINT chk_candidate_event_outbox_status
        CHECK (status IN ('PENDING','PUBLISHED','FAILED'))
);

CREATE INDEX idx_candidate_event_outbox_due
    ON candidate_event_outbox (status, next_attempt_at)
    WHERE status IN ('PENDING','FAILED');

CREATE INDEX idx_candidate_event_outbox_aggregate
    ON candidate_event_outbox (aggregate_type, aggregate_id);

-- Idempotency for the parser worker callback so a re-delivered Kafka message
-- (or replayed HTTP call) cannot double-write parsed fields.
CREATE TABLE resume_processed_events (
    event_id    UUID         PRIMARY KEY,
    resume_id   UUID         NOT NULL,
    received_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_resume_processed_events_resume ON resume_processed_events (resume_id);

ALTER TABLE resume_parsed_fields
    ADD COLUMN review_status VARCHAR(16) NOT NULL DEFAULT 'PROPOSED',
    ADD COLUMN reviewed_at   TIMESTAMPTZ,
    ADD CONSTRAINT chk_resume_parsed_fields_review_status
        CHECK (review_status IN ('PROPOSED','APPLIED','REJECTED'));

ALTER TABLE resumes
    DROP CONSTRAINT IF EXISTS chk_resume_parser_status;
ALTER TABLE resumes
    ADD CONSTRAINT chk_resume_parser_status
        CHECK (parser_status IN ('PENDING','IN_PROGRESS','PARSED','FAILED'));
