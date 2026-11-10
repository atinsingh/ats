-- Expand `applications` to the canonical shape. Renames `candidate_id` to
-- `candidate_profile_id` (the canonical FK target).

ALTER TABLE applications
    RENAME COLUMN candidate_id TO candidate_profile_id;

ALTER TABLE applications
    ADD COLUMN IF NOT EXISTS resume_id_used                    UUID,
    ADD COLUMN IF NOT EXISTS cover_letter_text                 TEXT,
    ADD COLUMN IF NOT EXISTS screening_answers                 JSONB,
    ADD COLUMN IF NOT EXISTS current_stage_id                  UUID,
    ADD COLUMN IF NOT EXISTS source                            VARCHAR(32) NOT NULL DEFAULT 'DIRECT',
    ADD COLUMN IF NOT EXISTS applied_at                        TIMESTAMPTZ NOT NULL DEFAULT now(),
    ADD COLUMN IF NOT EXISTS submitted_via_idempotency_key     VARCHAR(128),
    ADD COLUMN IF NOT EXISTS pipeline_id                       UUID,
    ADD COLUMN IF NOT EXISTS rejection_reason                  VARCHAR(64),
    ADD COLUMN IF NOT EXISTS withdrawal_reason                 TEXT,
    ADD COLUMN IF NOT EXISTS hired_at                          TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS terminal_at                       TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS updated_at                        TIMESTAMPTZ NOT NULL DEFAULT now(),
    ADD COLUMN IF NOT EXISTS created_by_user_id                UUID,
    ADD COLUMN IF NOT EXISTS updated_by_user_id                UUID,
    ADD COLUMN IF NOT EXISTS version                           BIGINT      NOT NULL DEFAULT 0;

UPDATE applications SET status = 'APPLIED' WHERE status = 'SUBMITTED';

ALTER TABLE applications
    ADD CONSTRAINT chk_application_status
        CHECK (status IN (
            'DRAFT','APPLIED','SCREENING','SHORTLISTED',
            'INTERVIEW_SCHEDULED','INTERVIEWED',
            'OFFERED','HIRED','REJECTED','WITHDRAWN','EXPIRED'
        )),
    ADD CONSTRAINT chk_application_source
        CHECK (source IN ('DIRECT','JOB_BOARD','IMPORT','REFERRAL'));

DROP INDEX IF EXISTS idx_applications_candidate;
CREATE INDEX idx_applications_candidate
    ON applications (tenant_id, candidate_profile_id);

CREATE UNIQUE INDEX ux_applications_non_terminal_dedup
    ON applications (tenant_id, job_id, candidate_profile_id)
    WHERE status NOT IN ('REJECTED','WITHDRAWN','EXPIRED','HIRED');

CREATE UNIQUE INDEX ux_applications_idempotency
    ON applications (tenant_id, submitted_via_idempotency_key)
    WHERE submitted_via_idempotency_key IS NOT NULL;

CREATE INDEX idx_applications_status_recent
    ON applications (tenant_id, status, updated_at DESC);
