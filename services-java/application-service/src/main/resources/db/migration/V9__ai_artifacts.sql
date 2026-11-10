CREATE TABLE ai_artifacts (
    id                    UUID         PRIMARY KEY,
    tenant_id             UUID,
    kind                  VARCHAR(32)  NOT NULL,
    subject_entity_type   VARCHAR(32)  NOT NULL,
    subject_entity_id     UUID         NOT NULL,
    related_application_id UUID,
    related_job_id        UUID,
    related_resume_id     UUID,
    prompt_version        VARCHAR(64)  NOT NULL,
    model_version         VARCHAR(64)  NOT NULL,
    inputs_json           JSONB        NOT NULL DEFAULT '{}'::jsonb,
    output_text           TEXT,
    output_s3_key         TEXT,
    status                VARCHAR(32)  NOT NULL DEFAULT 'DRAFT',
    review_required       BOOLEAN      NOT NULL DEFAULT true,
    created_by_user_id    UUID,
    approved_by_user_id   UUID,
    approved_at           TIMESTAMPTZ,
    rejected_by_user_id   UUID,
    rejected_at           TIMESTAMPTZ,
    rejection_reason      TEXT,
    created_at            TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_by_user_id    UUID,
    version               BIGINT       NOT NULL DEFAULT 0,
    CONSTRAINT chk_ai_artifact_kind
        CHECK (kind IN (
            'RESUME_VARIANT','COVER_LETTER','CANDIDATE_SUMMARY',
            'MATCH_EXPLANATION','INTERVIEW_QA','REJECTION_EMAIL',
            'SCREENING_QUESTIONS','SHORTLIST_RECOMMENDATION'
        )),
    CONSTRAINT chk_ai_artifact_status
        CHECK (status IN ('DRAFT','READY_FOR_REVIEW','APPROVED','REJECTED','ARCHIVED')),
    CONSTRAINT chk_ai_artifact_subject_type
        CHECK (subject_entity_type IN (
            'CANDIDATE_PROFILE','APPLICATION','JOB','RESUME','INTERVIEW'
        ))
);

CREATE INDEX idx_ai_artifacts_tenant_kind_status ON ai_artifacts (tenant_id, kind, status);
CREATE INDEX idx_ai_artifacts_subject            ON ai_artifacts (subject_entity_type, subject_entity_id);
CREATE INDEX idx_ai_artifacts_application        ON ai_artifacts (related_application_id) WHERE related_application_id IS NOT NULL;
