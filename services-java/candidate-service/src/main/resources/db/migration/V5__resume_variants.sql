CREATE TABLE resume_variants (
    id                    UUID         PRIMARY KEY,
    resume_id             UUID         NOT NULL,
    candidate_profile_id  UUID         NOT NULL,
    tenant_id             UUID,
    for_job_id            UUID,
    s3_key                TEXT,
    output_text           TEXT,
    prompt_version        VARCHAR(64)  NOT NULL,
    model_version         VARCHAR(64)  NOT NULL,
    status                VARCHAR(32)  NOT NULL DEFAULT 'DRAFT',
    created_by_user_id    UUID,
    approved_by_user_id   UUID,
    approved_at           TIMESTAMPTZ,
    created_at            TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_by_user_id    UUID,
    version               BIGINT       NOT NULL DEFAULT 0,
    deleted_at            TIMESTAMPTZ,
    CONSTRAINT chk_resume_variant_status
        CHECK (status IN ('DRAFT','READY_FOR_REVIEW','APPROVED','REJECTED','ARCHIVED'))
);

CREATE INDEX idx_resume_variants_resume          ON resume_variants (resume_id);
CREATE INDEX idx_resume_variants_for_job_status  ON resume_variants (for_job_id, status);
CREATE INDEX idx_resume_variants_tenant          ON resume_variants (tenant_id);
