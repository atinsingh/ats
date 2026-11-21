-- IATS-146: interviews, interview participants, interview feedback and offers.
-- These tables were only in infra/sql/greenfield, so a database built from Flyway alone failed
-- `ddl-auto: validate` for InterviewEntity, InterviewFeedbackEntity and OfferEntity.
-- Copied from the greenfield script. IF NOT EXISTS keeps databases that were bootstrapped from
-- that script (then baselined) working.

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

CREATE TABLE IF NOT EXISTS interview_participants (
    interview_id    UUID        NOT NULL,
    user_id         UUID        NOT NULL,
    role            VARCHAR(32) NOT NULL,
    confirmed_at    TIMESTAMPTZ,
    PRIMARY KEY (interview_id, user_id),
    CONSTRAINT chk_interview_participant_role CHECK (role IN ('CANDIDATE','INTERVIEWER','RECRUITER','OBSERVER'))
);

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
CREATE UNIQUE INDEX IF NOT EXISTS ux_interview_feedback_per_interviewer ON interview_feedback (interview_id, interviewer_user_id);

CREATE TABLE IF NOT EXISTS offers (
    id                  UUID         PRIMARY KEY,
    tenant_id           UUID         NOT NULL,
    application_id      UUID         NOT NULL,
    title               VARCHAR(256) NOT NULL,
    base_salary_cents   BIGINT       NOT NULL,
    currency_code       CHAR(3)      NOT NULL,
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
