CREATE TABLE resumes (
    id                    UUID         PRIMARY KEY,
    candidate_profile_id  UUID         NOT NULL,
    tenant_id             UUID,
    original_filename     VARCHAR(512) NOT NULL,
    mime_type             VARCHAR(128) NOT NULL,
    size_bytes            BIGINT       NOT NULL,
    s3_key                TEXT         NOT NULL,
    version_label         VARCHAR(64),
    is_default            BOOLEAN      NOT NULL DEFAULT false,
    parser_status         VARCHAR(32)  NOT NULL DEFAULT 'PENDING',
    parsed_at             TIMESTAMPTZ,
    parser_error          TEXT,
    created_at            TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ  NOT NULL DEFAULT now(),
    created_by_user_id    UUID,
    updated_by_user_id    UUID,
    version               BIGINT       NOT NULL DEFAULT 0,
    CONSTRAINT chk_resume_parser_status
        CHECK (parser_status IN ('PENDING','PARSED','FAILED')),
    CONSTRAINT chk_resume_mime_type
        CHECK (mime_type IN (
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        )),
    CONSTRAINT chk_resume_size_max CHECK (size_bytes > 0 AND size_bytes <= 10485760)
);

CREATE UNIQUE INDEX ux_resumes_default_per_candidate
    ON resumes (candidate_profile_id) WHERE is_default = true;

CREATE INDEX idx_resumes_candidate          ON resumes (candidate_profile_id);
CREATE INDEX idx_resumes_parser_status      ON resumes (parser_status, created_at);
CREATE UNIQUE INDEX ux_resumes_s3_key       ON resumes (s3_key);

CREATE TABLE resume_parsed_fields (
    resume_id            UUID        PRIMARY KEY,
    candidate_profile_id UUID        NOT NULL,
    full_name            TEXT,
    email                TEXT,
    phone                TEXT,
    location_city        TEXT,
    location_region      TEXT,
    location_country     TEXT,
    skills               TEXT[]      NOT NULL DEFAULT ARRAY[]::TEXT[],
    total_experience_years NUMERIC(4,1),
    parsed_text          TEXT,
    structured           JSONB,
    parser_version       VARCHAR(32),
    parsed_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_resume_parsed_fields_candidate ON resume_parsed_fields (candidate_profile_id);
