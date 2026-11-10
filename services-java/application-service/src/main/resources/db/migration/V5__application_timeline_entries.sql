-- Append-only application timeline. Drives candidate-facing status history
-- and the recruiter activity feed.

CREATE TABLE application_timeline_entries (
    id              UUID         PRIMARY KEY,
    application_id  UUID         NOT NULL,
    tenant_id       UUID         NOT NULL,
    entry_type      VARCHAR(32)  NOT NULL,
    from_value      VARCHAR(64),
    to_value        VARCHAR(64),
    actor_user_id   UUID,
    actor_role      VARCHAR(32),
    summary         TEXT,
    metadata        JSONB        NOT NULL DEFAULT '{}'::jsonb,
    correlation_id  UUID,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT chk_timeline_entry_type
        CHECK (entry_type IN (
            'STATUS_CHANGE','STAGE_MOVE','NOTE_ADDED','TAG_ADDED','TAG_REMOVED',
            'RATING_ADDED','RESUME_REPLACED','INTERVIEW_SCHEDULED','INTERVIEW_RESCHEDULED',
            'INTERVIEW_CANCELLED','INTERVIEW_FEEDBACK_SUBMITTED','OFFER_SENT','OFFER_ACCEPTED',
            'OFFER_DECLINED','REJECTED','WITHDRAWN','HIRED','EXPIRED','APPLIED','AI_ARTIFACT_LINKED'
        ))
);

CREATE INDEX idx_app_timeline_app_recent
    ON application_timeline_entries (application_id, created_at DESC);

CREATE INDEX idx_app_timeline_tenant_recent
    ON application_timeline_entries (tenant_id, created_at DESC);

CREATE INDEX idx_app_timeline_actor
    ON application_timeline_entries (actor_user_id, created_at DESC)
    WHERE actor_user_id IS NOT NULL;
