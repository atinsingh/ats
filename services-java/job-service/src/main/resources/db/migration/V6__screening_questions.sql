CREATE TABLE screening_questions (
    id                   UUID         PRIMARY KEY,
    job_id               UUID         NOT NULL,
    tenant_id            UUID         NOT NULL,
    position             INTEGER      NOT NULL,
    question_text        TEXT         NOT NULL,
    question_type        VARCHAR(32)  NOT NULL,
    options              JSONB,
    required             BOOLEAN      NOT NULL DEFAULT false,
    disqualifying_answer JSONB,
    created_at           TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ  NOT NULL DEFAULT now(),
    version              BIGINT       NOT NULL DEFAULT 0,
    CONSTRAINT chk_screening_q_type
        CHECK (question_type IN ('SHORT_TEXT','LONG_TEXT','SINGLE_SELECT','MULTI_SELECT','BOOLEAN','NUMERIC','FILE_UPLOAD'))
);

CREATE UNIQUE INDEX ux_screening_q_position ON screening_questions (job_id, position);
CREATE        INDEX idx_screening_q_job     ON screening_questions (job_id);
