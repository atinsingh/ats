CREATE TABLE candidate_work_experiences (
    id                    UUID          PRIMARY KEY,
    candidate_profile_id  UUID          NOT NULL,
    tenant_id             UUID,
    company_name          VARCHAR(256)  NOT NULL,
    title                 VARCHAR(256)  NOT NULL,
    started_at            DATE          NOT NULL,
    ended_at              DATE,
    is_current            BOOLEAN       NOT NULL DEFAULT false,
    description           TEXT,
    skills                TEXT[]        NOT NULL DEFAULT ARRAY[]::TEXT[],
    created_at            TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ   NOT NULL DEFAULT now(),
    created_by_user_id    UUID,
    updated_by_user_id    UUID,
    version               BIGINT        NOT NULL DEFAULT 0,
    CONSTRAINT chk_work_dates CHECK (ended_at IS NULL OR ended_at >= started_at)
);
CREATE INDEX idx_work_exp_candidate ON candidate_work_experiences (candidate_profile_id);

CREATE TABLE candidate_educations (
    id                    UUID          PRIMARY KEY,
    candidate_profile_id  UUID          NOT NULL,
    tenant_id             UUID,
    institution           VARCHAR(256)  NOT NULL,
    degree                VARCHAR(128),
    field_of_study        VARCHAR(256),
    started_at            DATE,
    ended_at              DATE,
    gpa                   NUMERIC(3,2),
    created_at            TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ   NOT NULL DEFAULT now(),
    created_by_user_id    UUID,
    updated_by_user_id    UUID,
    version               BIGINT        NOT NULL DEFAULT 0
);
CREATE INDEX idx_education_candidate ON candidate_educations (candidate_profile_id);

CREATE TABLE candidate_certifications (
    id                    UUID          PRIMARY KEY,
    candidate_profile_id  UUID          NOT NULL,
    tenant_id             UUID,
    name                  VARCHAR(256)  NOT NULL,
    issuer                VARCHAR(256),
    issued_at             DATE,
    expires_at            DATE,
    credential_url        TEXT,
    created_at            TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ   NOT NULL DEFAULT now(),
    created_by_user_id    UUID,
    updated_by_user_id    UUID,
    version               BIGINT        NOT NULL DEFAULT 0
);
CREATE INDEX idx_certifications_candidate ON candidate_certifications (candidate_profile_id);
