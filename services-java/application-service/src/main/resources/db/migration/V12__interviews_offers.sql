-- InterviewEntity, InterviewFeedbackEntity and OfferEntity were mapped without tables, so the
-- service failed schema validation at start-up. Definitions follow
-- infra/sql/greenfield/V1__initial_ats_schema.sql; currency_code is VARCHAR(3) to match the entity.

CREATE TABLE IF NOT EXISTS interviews (
    id                    UUID         PRIMARY KEY,
    tenant_id             UUID         NOT NULL,
    application_id        UUID         NOT NULL,
    job_id                UUID         NOT NULL,
    type                  VARCHAR(32)  NOT NULL,
    location              TEXT,
    meeting_url           TEXT,
    scheduled_start       TIMESTAMPTZ  NOT NULL,
    scheduled_end         TIMESTAMPTZ  NOT NULL,
    status                VARCHAR(32)  NOT NULL DEFAULT 'SCHEDULED',
    cancellation_reason   TEXT,
    created_at            TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ  NOT NULL DEFAULT now(),
    created_by_user_id    UUID,
    updated_by_user_id    UUID,
    version               BIGINT       NOT NULL DEFAULT 0,
    CONSTRAINT chk_interview_status CHECK (status IN ('SCHEDULED','RESCHEDULED','COMPLETED','CANCELLED','NO_SHOW')),
    CONSTRAINT chk_interview_type   CHECK (type IN ('PHONE','VIDEO','ONSITE','TECHNICAL','PANEL'))
);
CREATE INDEX IF NOT EXISTS idx_interviews_app    ON interviews (application_id);
CREATE INDEX IF NOT EXISTS idx_interviews_tenant ON interviews (tenant_id, scheduled_start);

CREATE TABLE IF NOT EXISTS interview_feedback (
    id                  UUID         PRIMARY KEY,
    interview_id        UUID         NOT NULL,
    application_id      UUID         NOT NULL,
    tenant_id           UUID         NOT NULL,
    interviewer_user_id UUID         NOT NULL,
    overall_score       SMALLINT,
    recommendation      VARCHAR(32),
    structured          JSONB        NOT NULL DEFAULT '{}'::jsonb,
    summary             TEXT,
    submitted_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT chk_interview_feedback_score CHECK (overall_score IS NULL OR overall_score BETWEEN 1 AND 5),
    CONSTRAINT chk_interview_recommendation CHECK (recommendation IS NULL OR recommendation IN ('STRONG_HIRE','HIRE','NO_HIRE','STRONG_NO_HIRE'))
);
CREATE INDEX IF NOT EXISTS idx_interview_feedback_interview ON interview_feedback (interview_id);
CREATE INDEX IF NOT EXISTS idx_interview_feedback_tenant    ON interview_feedback (tenant_id);

CREATE TABLE IF NOT EXISTS offers (
    id                  UUID         PRIMARY KEY,
    tenant_id           UUID         NOT NULL,
    application_id      UUID         NOT NULL,
    title               VARCHAR(256) NOT NULL,
    base_salary_cents   BIGINT       NOT NULL,
    currency_code       VARCHAR(3)   NOT NULL,
    bonus_cents         BIGINT,
    equity_terms        TEXT,
    start_date          DATE,
    expires_at          TIMESTAMPTZ,
    notes               TEXT,
    status              VARCHAR(32)  NOT NULL DEFAULT 'DRAFT',
    sent_at             TIMESTAMPTZ,
    accepted_at         TIMESTAMPTZ,
    declined_at         TIMESTAMPTZ,
    declined_reason     TEXT,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    created_by_user_id  UUID,
    updated_by_user_id  UUID,
    version             BIGINT       NOT NULL DEFAULT 0,
    CONSTRAINT chk_offer_status CHECK (status IN ('DRAFT','PENDING_APPROVAL','APPROVED','SENT','ACCEPTED','DECLINED','EXPIRED','RESCINDED'))
);
CREATE INDEX IF NOT EXISTS idx_offers_application ON offers (application_id);
CREATE INDEX IF NOT EXISTS idx_offers_tenant      ON offers (tenant_id, status);

-- ApplicationNoteEntity extends AuditableEntity, which maps the audit user columns.
ALTER TABLE application_notes ADD COLUMN IF NOT EXISTS created_by_user_id UUID;
ALTER TABLE application_notes ADD COLUMN IF NOT EXISTS updated_by_user_id UUID;
