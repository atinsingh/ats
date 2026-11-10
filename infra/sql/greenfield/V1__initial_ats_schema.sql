-- =====================================================================
-- Jobocate ATS — Greenfield bootstrap (V1__initial_ats_schema.sql)
-- =====================================================================
-- This is a single-file consolidated schema for spinning up a brand-new
-- PostgreSQL 16 database. It is functionally equivalent to running each
-- service's per-service Flyway history end to end, but expressed as one
-- monolithic V1.
--
-- DO NOT apply this migration to an environment that already ran the
-- per-service V1 baselines. Use the additive V2+ migrations under each
-- service's `src/main/resources/db/migration/` instead.
--
-- Usage (greenfield):
--   psql -h localhost -U jobocate -d jobocate -f V1__initial_ats_schema.sql
--
-- Conventions:
--   - All ids are UUID v4 (generated server-side in JPA).
--   - All timestamps are TIMESTAMPTZ stored in UTC.
--   - Money is stored as BIGINT cents + CHAR(3) currency.
--   - Tenant-scoped tables carry tenant_id (and indexes on it).
--   - Optimistic locking via `version` BIGINT.
--   - Soft delete via nullable `deleted_at` only where retention requires it.
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS citext;

-- ---------------------------------------------------------------------
-- 1. Identity & tenancy
-- ---------------------------------------------------------------------

CREATE TABLE tenants (
    id                    UUID         PRIMARY KEY,
    slug                  VARCHAR(128) NOT NULL,
    legal_name            VARCHAR(256),
    display_name          VARCHAR(256) NOT NULL,
    status                VARCHAR(32)  NOT NULL DEFAULT 'ACTIVE',
    time_zone             VARCHAR(64)  NOT NULL DEFAULT 'UTC',
    default_locale        VARCHAR(16)  NOT NULL DEFAULT 'en-US',
    logo_url              TEXT,
    primary_domain        VARCHAR(256),
    brand_color_primary   VARCHAR(16),
    brand_color_accent    VARCHAR(16),
    billing_email         VARCHAR(320),
    support_email         VARCHAR(320),
    created_at            TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ  NOT NULL DEFAULT now(),
    created_by_user_id    UUID,
    updated_by_user_id    UUID,
    version               BIGINT       NOT NULL DEFAULT 0,
    CONSTRAINT chk_tenant_status CHECK (status IN ('ACTIVE','SUSPENDED','DELETED'))
);
CREATE UNIQUE INDEX ux_tenants_slug_lower ON tenants (lower(slug));
CREATE        INDEX idx_tenants_status     ON tenants (status);
CREATE        INDEX idx_tenants_created_at ON tenants (created_at);

CREATE TABLE users (
    id                    UUID         PRIMARY KEY,
    email                 VARCHAR(320) NOT NULL,
    password_hash         VARCHAR(255),
    email_verified_at     TIMESTAMPTZ,
    mfa_enabled           BOOLEAN      NOT NULL DEFAULT false,
    last_login_at         TIMESTAMPTZ,
    locked_until          TIMESTAMPTZ,
    failed_login_count    INTEGER      NOT NULL DEFAULT 0,
    display_name          VARCHAR(256),
    avatar_url            TEXT,
    time_zone             VARCHAR(64)  NOT NULL DEFAULT 'UTC',
    locale                VARCHAR(16)  NOT NULL DEFAULT 'en-US',
    created_at            TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ  NOT NULL DEFAULT now(),
    created_by_user_id    UUID,
    updated_by_user_id    UUID,
    version               BIGINT       NOT NULL DEFAULT 0,
    deleted_at            TIMESTAMPTZ
);
CREATE UNIQUE INDEX ux_users_email_lower ON users (lower(email)) WHERE deleted_at IS NULL;
CREATE        INDEX idx_users_last_login ON users (last_login_at DESC);

CREATE TABLE user_roles (
    id                    UUID         PRIMARY KEY,
    user_id               UUID         NOT NULL,
    tenant_id             UUID         NOT NULL,
    role                  VARCHAR(32)  NOT NULL,
    granted_by_user_id    UUID,
    granted_at            TIMESTAMPTZ  NOT NULL DEFAULT now(),
    revoked_at            TIMESTAMPTZ,
    revoked_by_user_id    UUID,
    revocation_reason     TEXT,
    CONSTRAINT chk_user_roles_role CHECK (role IN (
        'SUPER_ADMIN','TENANT_ADMIN','RECRUITER','HIRING_MANAGER',
        'INTERVIEWER','CANDIDATE','FINANCE_ADMIN','COMPLIANCE_ADMIN'
    ))
);
CREATE UNIQUE INDEX ux_user_roles_active ON user_roles (user_id, tenant_id, role) WHERE revoked_at IS NULL;
CREATE        INDEX idx_user_roles_user        ON user_roles (user_id);
CREATE        INDEX idx_user_roles_tenant_role ON user_roles (tenant_id, role);

CREATE TABLE password_reset_tokens (
    token_hash    CHAR(64)     PRIMARY KEY,
    user_id       UUID         NOT NULL,
    expires_at    TIMESTAMPTZ  NOT NULL,
    consumed_at   TIMESTAMPTZ,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_password_reset_user ON password_reset_tokens (user_id);

CREATE TABLE refresh_tokens (
    id            UUID         PRIMARY KEY,
    user_id       UUID         NOT NULL,
    token_hash    CHAR(64)     NOT NULL,
    family_id     UUID         NOT NULL,
    issued_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    expires_at    TIMESTAMPTZ  NOT NULL,
    revoked_at    TIMESTAMPTZ,
    user_agent    TEXT,
    ip_address    INET
);
CREATE UNIQUE INDEX ux_refresh_tokens_hash        ON refresh_tokens (token_hash);
CREATE        INDEX idx_refresh_tokens_user_family ON refresh_tokens (user_id, family_id);

CREATE TABLE invitations (
    id                  UUID         PRIMARY KEY,
    tenant_id           UUID         NOT NULL,
    email               VARCHAR(320) NOT NULL,
    role                VARCHAR(32)  NOT NULL,
    token_hash          CHAR(64)     NOT NULL,
    invited_by_user_id  UUID,
    expires_at          TIMESTAMPTZ  NOT NULL,
    accepted_at         TIMESTAMPTZ,
    revoked_at          TIMESTAMPTZ,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX ux_invitations_token        ON invitations (token_hash);
CREATE        INDEX idx_invitations_tenant_email ON invitations (tenant_id, lower(email));

-- ---------------------------------------------------------------------
-- 2. Candidate
-- ---------------------------------------------------------------------

CREATE TABLE candidate_profiles (
    id                            UUID         PRIMARY KEY,
    user_id                       UUID,
    tenant_id                     UUID,
    full_name                     VARCHAR(512) NOT NULL,
    headline                      VARCHAR(512),
    email                         VARCHAR(320) NOT NULL,
    phone                         VARCHAR(64),
    location_city                 VARCHAR(128),
    location_region               VARCHAR(128),
    location_country              VARCHAR(64),
    summary                       TEXT,
    desired_role                  VARCHAR(256),
    salary_expectation_min_cents  BIGINT,
    salary_expectation_max_cents  BIGINT,
    currency_code                 CHAR(3),
    availability                  VARCHAR(32),
    work_authorization            VARCHAR(64),
    links                         JSONB        NOT NULL DEFAULT '{}'::jsonb,
    profile_visibility            VARCHAR(32)  NOT NULL DEFAULT 'PRIVATE',
    consent_searchable            BOOLEAN      NOT NULL DEFAULT false,
    created_at                    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at                    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    created_by_user_id            UUID,
    updated_by_user_id            UUID,
    version                       BIGINT       NOT NULL DEFAULT 0,
    deleted_at                    TIMESTAMPTZ,
    CONSTRAINT chk_candidate_profile_visibility CHECK (profile_visibility IN ('PUBLIC','TENANT_ONLY','PRIVATE')),
    CONSTRAINT chk_candidate_availability       CHECK (availability IS NULL OR availability IN ('IMMEDIATE','TWO_WEEKS','ONE_MONTH','THREE_MONTHS','PASSIVE'))
);
CREATE UNIQUE INDEX ux_candidate_profiles_tenant_email
    ON candidate_profiles (tenant_id, lower(email))
    WHERE tenant_id IS NOT NULL AND deleted_at IS NULL;
CREATE UNIQUE INDEX ux_candidate_profiles_marketplace_email
    ON candidate_profiles (lower(email))
    WHERE tenant_id IS NULL AND deleted_at IS NULL;
CREATE INDEX idx_candidate_profiles_tenant       ON candidate_profiles (tenant_id);
CREATE INDEX idx_candidate_profiles_searchable   ON candidate_profiles (consent_searchable, profile_visibility) WHERE deleted_at IS NULL;
CREATE INDEX idx_candidate_profiles_country      ON candidate_profiles (location_country, location_region) WHERE deleted_at IS NULL;
CREATE INDEX idx_candidate_profiles_created_at   ON candidate_profiles (created_at DESC);
CREATE INDEX idx_candidate_profiles_user         ON candidate_profiles (user_id) WHERE user_id IS NOT NULL;

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
    CONSTRAINT chk_resume_parser_status CHECK (parser_status IN ('PENDING','IN_PROGRESS','PARSED','FAILED')),
    CONSTRAINT chk_resume_mime_type CHECK (mime_type IN (
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    )),
    CONSTRAINT chk_resume_size_max CHECK (size_bytes > 0 AND size_bytes <= 10485760)
);
CREATE UNIQUE INDEX ux_resumes_default_per_candidate ON resumes (candidate_profile_id) WHERE is_default = true;
CREATE        INDEX idx_resumes_candidate          ON resumes (candidate_profile_id);
CREATE        INDEX idx_resumes_parser_status      ON resumes (parser_status, created_at);
CREATE UNIQUE INDEX ux_resumes_s3_key              ON resumes (s3_key);

CREATE TABLE resume_parsed_fields (
    resume_id              UUID        PRIMARY KEY,
    candidate_profile_id   UUID        NOT NULL,
    full_name              TEXT,
    email                  TEXT,
    phone                  TEXT,
    location_city          TEXT,
    location_region        TEXT,
    location_country       TEXT,
    skills                 TEXT[]      NOT NULL DEFAULT ARRAY[]::TEXT[],
    total_experience_years NUMERIC(4,1),
    parsed_text            TEXT,
    structured             JSONB,
    parser_version         VARCHAR(32),
    parsed_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    review_status          VARCHAR(16) NOT NULL DEFAULT 'PROPOSED',
    reviewed_at            TIMESTAMPTZ,
    CONSTRAINT chk_resume_parsed_fields_review_status CHECK (review_status IN ('PROPOSED','APPLIED','REJECTED'))
);
CREATE INDEX idx_resume_parsed_fields_candidate ON resume_parsed_fields (candidate_profile_id);

-- Idempotency for parser callbacks (HTTP or Kafka).
CREATE TABLE resume_processed_events (
    event_id    UUID        PRIMARY KEY,
    resume_id   UUID        NOT NULL,
    received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_resume_processed_events_resume ON resume_processed_events (resume_id);

-- candidate-service transactional outbox (mirror of application_event_outbox).
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
    CONSTRAINT chk_candidate_event_outbox_status CHECK (status IN ('PENDING','PUBLISHED','FAILED'))
);
CREATE INDEX idx_candidate_event_outbox_due       ON candidate_event_outbox (status, next_attempt_at) WHERE status IN ('PENDING','FAILED');
CREATE INDEX idx_candidate_event_outbox_aggregate ON candidate_event_outbox (aggregate_type, aggregate_id);

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
    CONSTRAINT chk_resume_variant_status CHECK (status IN ('DRAFT','READY_FOR_REVIEW','APPROVED','REJECTED','ARCHIVED'))
);
CREATE INDEX idx_resume_variants_resume          ON resume_variants (resume_id);
CREATE INDEX idx_resume_variants_for_job_status  ON resume_variants (for_job_id, status);
CREATE INDEX idx_resume_variants_tenant          ON resume_variants (tenant_id);

CREATE TABLE consent_records (
    id                    UUID         PRIMARY KEY,
    user_id               UUID         NOT NULL,
    candidate_profile_id  UUID,
    tenant_id             UUID,
    consent_kind          VARCHAR(64)  NOT NULL,
    consent_value         BOOLEAN      NOT NULL,
    policy_version        VARCHAR(64),
    source                VARCHAR(32),
    ip_address            INET,
    user_agent            TEXT,
    recorded_at           TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT chk_consent_kind   CHECK (consent_kind IN ('SEARCHABLE','AI_TOOLS','MARKETING','DATA_PROCESSING_TOS')),
    CONSTRAINT chk_consent_source CHECK (source IS NULL OR source IN ('SIGNUP_PAGE','SETTINGS_PAGE','APPLY_FLOW','IMPORT'))
);
CREATE INDEX idx_consent_user_kind_recent   ON consent_records (user_id, consent_kind, recorded_at DESC);
CREATE INDEX idx_consent_tenant_kind_recent ON consent_records (tenant_id, consent_kind, recorded_at DESC) WHERE tenant_id IS NOT NULL;

CREATE TABLE saved_searches (
    id                  UUID         PRIMARY KEY,
    user_id             UUID         NOT NULL,
    tenant_id           UUID,
    target              VARCHAR(16)  NOT NULL,
    name                VARCHAR(256) NOT NULL,
    query_dsl           JSONB        NOT NULL,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    created_by_user_id  UUID,
    updated_by_user_id  UUID,
    version             BIGINT       NOT NULL DEFAULT 0,
    deleted_at          TIMESTAMPTZ,
    CONSTRAINT chk_saved_search_target CHECK (target IN ('JOBS','CANDIDATES'))
);
CREATE INDEX idx_saved_searches_user ON saved_searches (user_id);

CREATE TABLE alert_subscriptions (
    id                  UUID         PRIMARY KEY,
    saved_search_id     UUID         NOT NULL,
    user_id             UUID         NOT NULL,
    tenant_id           UUID,
    cadence             VARCHAR(16)  NOT NULL DEFAULT 'DAILY',
    last_run_at         TIMESTAMPTZ,
    next_run_at         TIMESTAMPTZ,
    enabled             BOOLEAN      NOT NULL DEFAULT true,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    version             BIGINT       NOT NULL DEFAULT 0,
    CONSTRAINT chk_alert_cadence CHECK (cadence IN ('IMMEDIATE','DAILY','WEEKLY','OFF'))
);
CREATE INDEX idx_alert_subscriptions_user ON alert_subscriptions (user_id);
CREATE INDEX idx_alert_subscriptions_due  ON alert_subscriptions (next_run_at) WHERE enabled = true;

CREATE TABLE saved_jobs (
    user_id     UUID         NOT NULL,
    job_id      UUID         NOT NULL,
    tenant_id   UUID,
    saved_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, job_id)
);
CREATE INDEX idx_saved_jobs_user_recent ON saved_jobs (user_id, saved_at DESC);

-- ---------------------------------------------------------------------
-- 3. Job
-- ---------------------------------------------------------------------

CREATE TABLE jobs (
    id                    UUID         PRIMARY KEY,
    tenant_id             UUID         NOT NULL,
    organization_id       UUID,
    slug                  VARCHAR(256),
    title                 TEXT         NOT NULL,
    department            TEXT,
    description           TEXT,
    responsibilities      TEXT,
    qualifications        TEXT,
    employment_type       VARCHAR(32),
    remote_policy         VARCHAR(32),
    experience_min_years  INTEGER,
    experience_max_years  INTEGER,
    salary_min_cents      BIGINT,
    salary_max_cents      BIGINT,
    currency_code         CHAR(3),
    location              TEXT,
    location_city         VARCHAR(128),
    location_region       VARCHAR(128),
    location_country      VARCHAR(64),
    status                VARCHAR(32)  NOT NULL,
    published_at          TIMESTAMPTZ,
    closed_at             TIMESTAMPTZ,
    pipeline_id           UUID,
    boost_score           INTEGER      NOT NULL DEFAULT 0,
    created_at            TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ  NOT NULL DEFAULT now(),
    created_by_user_id    UUID,
    updated_by_user_id    UUID,
    version               BIGINT       NOT NULL DEFAULT 0,
    deleted_at            TIMESTAMPTZ,
    CONSTRAINT chk_jobs_status          CHECK (status IN ('DRAFT','PUBLISHED','CLOSED','ARCHIVED')),
    CONSTRAINT chk_jobs_employment_type CHECK (employment_type IS NULL OR employment_type IN ('FULL_TIME','PART_TIME','CONTRACT','INTERNSHIP','TEMPORARY')),
    CONSTRAINT chk_jobs_remote_policy   CHECK (remote_policy   IS NULL OR remote_policy   IN ('ONSITE','HYBRID','REMOTE','REMOTE_FIRST')),
    CONSTRAINT chk_jobs_experience_range CHECK (experience_min_years IS NULL OR experience_max_years IS NULL OR experience_min_years <= experience_max_years),
    CONSTRAINT chk_jobs_salary_range     CHECK (salary_min_cents     IS NULL OR salary_max_cents     IS NULL OR salary_min_cents     <= salary_max_cents)
);
CREATE        INDEX idx_jobs_tenant                  ON jobs (tenant_id);
CREATE        INDEX idx_jobs_tenant_status           ON jobs (tenant_id, status);
CREATE UNIQUE INDEX ux_jobs_tenant_slug              ON jobs (tenant_id, slug) WHERE slug IS NOT NULL AND deleted_at IS NULL;
CREATE        INDEX idx_jobs_published               ON jobs (status, published_at DESC) WHERE status = 'PUBLISHED' AND deleted_at IS NULL;
CREATE        INDEX idx_jobs_tenant_country_region   ON jobs (tenant_id, location_country, location_region) WHERE deleted_at IS NULL;

CREATE TABLE job_skills (
    job_id        UUID         NOT NULL,
    skill_name    VARCHAR(128) NOT NULL,
    requirement   VARCHAR(16)  NOT NULL DEFAULT 'NICE_TO_HAVE',
    weight        SMALLINT     NOT NULL DEFAULT 1,
    PRIMARY KEY (job_id, skill_name),
    CONSTRAINT chk_job_skill_requirement CHECK (requirement IN ('REQUIRED','NICE_TO_HAVE'))
);
CREATE INDEX idx_job_skills_skill ON job_skills (skill_name);

CREATE TABLE screening_questions (
    id                    UUID         PRIMARY KEY,
    job_id                UUID         NOT NULL,
    tenant_id             UUID         NOT NULL,
    position              INTEGER      NOT NULL,
    question_text         TEXT         NOT NULL,
    question_type         VARCHAR(32)  NOT NULL,
    options               JSONB,
    required              BOOLEAN      NOT NULL DEFAULT false,
    disqualifying_answer  JSONB,
    created_at            TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ  NOT NULL DEFAULT now(),
    version               BIGINT       NOT NULL DEFAULT 0,
    CONSTRAINT chk_screening_q_type CHECK (question_type IN ('SHORT_TEXT','LONG_TEXT','SINGLE_SELECT','MULTI_SELECT','BOOLEAN','NUMERIC','FILE_UPLOAD'))
);
CREATE UNIQUE INDEX ux_screening_q_position ON screening_questions (job_id, position);
CREATE        INDEX idx_screening_q_job     ON screening_questions (job_id);

CREATE TABLE hiring_team_members (
    job_id              UUID         NOT NULL,
    user_id             UUID         NOT NULL,
    tenant_id           UUID         NOT NULL,
    team_role           VARCHAR(32)  NOT NULL,
    added_at            TIMESTAMPTZ  NOT NULL DEFAULT now(),
    added_by_user_id    UUID,
    PRIMARY KEY (job_id, user_id),
    CONSTRAINT chk_hiring_team_role CHECK (team_role IN ('OWNER','RECRUITER','HIRING_MANAGER','INTERVIEWER','OBSERVER'))
);
CREATE INDEX idx_hiring_team_user   ON hiring_team_members (user_id);
CREATE INDEX idx_hiring_team_tenant ON hiring_team_members (tenant_id);

-- ---------------------------------------------------------------------
-- 4. Pipeline & Application
-- ---------------------------------------------------------------------

CREATE TABLE pipelines (
    id                  UUID         PRIMARY KEY,
    tenant_id           UUID         NOT NULL,
    name                VARCHAR(128) NOT NULL,
    description         TEXT,
    is_default          BOOLEAN      NOT NULL DEFAULT false,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    created_by_user_id  UUID,
    updated_by_user_id  UUID,
    version             BIGINT       NOT NULL DEFAULT 0,
    deleted_at          TIMESTAMPTZ
);
CREATE UNIQUE INDEX ux_pipelines_default_per_tenant ON pipelines (tenant_id) WHERE is_default = true AND deleted_at IS NULL;
CREATE        INDEX idx_pipelines_tenant            ON pipelines (tenant_id) WHERE deleted_at IS NULL;

CREATE TABLE pipeline_stages (
    id                   UUID         PRIMARY KEY,
    pipeline_id          UUID         NOT NULL,
    tenant_id            UUID         NOT NULL,
    position             INTEGER      NOT NULL,
    name                 VARCHAR(128) NOT NULL,
    color                VARCHAR(16),
    application_status   VARCHAR(32),
    is_disabled          BOOLEAN      NOT NULL DEFAULT false,
    created_at           TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ  NOT NULL DEFAULT now(),
    created_by_user_id   UUID,
    updated_by_user_id   UUID,
    version              BIGINT       NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX ux_pipeline_stages_position ON pipeline_stages (pipeline_id, position);
CREATE        INDEX idx_pipeline_stages_pipeline ON pipeline_stages (pipeline_id);

CREATE TABLE applications (
    id                              UUID         PRIMARY KEY,
    tenant_id                       UUID         NOT NULL,
    job_id                          UUID         NOT NULL,
    candidate_profile_id            UUID         NOT NULL,
    resume_id_used                  UUID,
    cover_letter_text               TEXT,
    screening_answers               JSONB,
    status                          VARCHAR(32)  NOT NULL,
    current_stage_id                UUID,
    pipeline_id                     UUID,
    source                          VARCHAR(32)  NOT NULL DEFAULT 'DIRECT',
    applied_at                      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    submitted_via_idempotency_key   VARCHAR(128),
    rejection_reason                VARCHAR(64),
    withdrawal_reason               TEXT,
    hired_at                        TIMESTAMPTZ,
    terminal_at                     TIMESTAMPTZ,
    created_at                      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at                      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    created_by_user_id              UUID,
    updated_by_user_id              UUID,
    version                         BIGINT       NOT NULL DEFAULT 0,
    CONSTRAINT chk_application_status CHECK (status IN (
        'DRAFT','APPLIED','SCREENING','SHORTLISTED','INTERVIEW_SCHEDULED','INTERVIEWED',
        'OFFERED','HIRED','REJECTED','WITHDRAWN','EXPIRED'
    )),
    CONSTRAINT chk_application_source CHECK (source IN ('DIRECT','JOB_BOARD','IMPORT','REFERRAL'))
);
CREATE        INDEX idx_applications_tenant            ON applications (tenant_id);
CREATE        INDEX idx_applications_tenant_job        ON applications (tenant_id, job_id);
CREATE        INDEX idx_applications_candidate         ON applications (tenant_id, candidate_profile_id);
CREATE UNIQUE INDEX ux_applications_non_terminal_dedup ON applications (tenant_id, job_id, candidate_profile_id) WHERE status NOT IN ('REJECTED','WITHDRAWN','EXPIRED','HIRED');
CREATE UNIQUE INDEX ux_applications_idempotency        ON applications (tenant_id, submitted_via_idempotency_key) WHERE submitted_via_idempotency_key IS NOT NULL;
CREATE        INDEX idx_applications_status_recent     ON applications (tenant_id, status, updated_at DESC);

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
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_app_timeline_app_recent     ON application_timeline_entries (application_id, created_at DESC);
CREATE INDEX idx_app_timeline_tenant_recent  ON application_timeline_entries (tenant_id, created_at DESC);
CREATE INDEX idx_app_timeline_actor          ON application_timeline_entries (actor_user_id, created_at DESC) WHERE actor_user_id IS NOT NULL;

CREATE TABLE application_notes (
    id                   UUID         PRIMARY KEY,
    application_id       UUID         NOT NULL,
    tenant_id            UUID         NOT NULL,
    author_user_id       UUID         NOT NULL,
    body_md              TEXT         NOT NULL,
    mentioned_user_ids   UUID[]       NOT NULL DEFAULT ARRAY[]::UUID[],
    created_at           TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_by_user_id   UUID,
    version              BIGINT       NOT NULL DEFAULT 0,
    deleted_at           TIMESTAMPTZ
);
CREATE INDEX idx_application_notes_app_recent ON application_notes (application_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_application_notes_tenant     ON application_notes (tenant_id) WHERE deleted_at IS NULL;

CREATE TABLE application_tags (
    id                  UUID         PRIMARY KEY,
    application_id      UUID         NOT NULL,
    tenant_id           UUID         NOT NULL,
    tag                 CITEXT       NOT NULL,
    created_by_user_id  UUID,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX ux_application_tags_unique  ON application_tags (application_id, tag);
CREATE        INDEX idx_application_tags_tenant ON application_tags (tenant_id, tag);

CREATE TABLE application_ratings (
    id                  UUID         PRIMARY KEY,
    application_id      UUID         NOT NULL,
    tenant_id           UUID         NOT NULL,
    rater_user_id       UUID         NOT NULL,
    score               SMALLINT     NOT NULL,
    rating_comment      TEXT,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    version             BIGINT       NOT NULL DEFAULT 0,
    CONSTRAINT chk_application_rating_score CHECK (score BETWEEN 1 AND 5)
);
CREATE UNIQUE INDEX ux_application_ratings_one_per_rater ON application_ratings (application_id, rater_user_id);
CREATE        INDEX idx_application_ratings_app          ON application_ratings (application_id);

-- ---------------------------------------------------------------------
-- 5. Interview & Offer (post-MVP placeholders — minimal shape, expand later)
-- ---------------------------------------------------------------------

CREATE TABLE interviews (
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
CREATE INDEX idx_interviews_app    ON interviews (application_id);
CREATE INDEX idx_interviews_tenant ON interviews (tenant_id, scheduled_start);

CREATE TABLE interview_participants (
    interview_id    UUID        NOT NULL,
    user_id         UUID        NOT NULL,
    role            VARCHAR(32) NOT NULL,
    confirmed_at    TIMESTAMPTZ,
    PRIMARY KEY (interview_id, user_id),
    CONSTRAINT chk_interview_participant_role CHECK (role IN ('CANDIDATE','INTERVIEWER','RECRUITER','OBSERVER'))
);

CREATE TABLE interview_feedback (
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
CREATE UNIQUE INDEX ux_interview_feedback_per_interviewer ON interview_feedback (interview_id, interviewer_user_id);

CREATE TABLE offers (
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
CREATE INDEX idx_offers_application ON offers (application_id);
CREATE INDEX idx_offers_tenant      ON offers (tenant_id, status);

-- ---------------------------------------------------------------------
-- 6. Notification
-- ---------------------------------------------------------------------

CREATE TABLE notifications (
    id                   UUID         PRIMARY KEY,
    tenant_id            UUID,
    recipient_user_id    UUID         NOT NULL,
    type                 VARCHAR(64)  NOT NULL,
    channel              VARCHAR(16)  NOT NULL,
    status               VARCHAR(16)  NOT NULL DEFAULT 'QUEUED',
    payload              JSONB        NOT NULL DEFAULT '{}'::jsonb,
    template_key         VARCHAR(128),
    correlation_id       UUID,
    related_entity_type  VARCHAR(32),
    related_entity_id    UUID,
    attempt_count        INTEGER      NOT NULL DEFAULT 0,
    last_attempted_at    TIMESTAMPTZ,
    last_error           TEXT,
    sent_at              TIMESTAMPTZ,
    delivered_at         TIMESTAMPTZ,
    failed_at            TIMESTAMPTZ,
    read_at              TIMESTAMPTZ,
    created_at           TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT chk_notification_channel CHECK (channel IN ('EMAIL','IN_APP','SMS')),
    CONSTRAINT chk_notification_status  CHECK (status IN ('QUEUED','SENT','DELIVERED','FAILED','SUPPRESSED'))
);
CREATE INDEX idx_notifications_user_recent  ON notifications (recipient_user_id, created_at DESC);
CREATE INDEX idx_notifications_unread       ON notifications (recipient_user_id, created_at DESC) WHERE read_at IS NULL;
CREATE INDEX idx_notifications_status_due   ON notifications (status, last_attempted_at) WHERE status IN ('QUEUED','FAILED');
CREATE INDEX idx_notifications_tenant_type  ON notifications (tenant_id, type) WHERE tenant_id IS NOT NULL;

CREATE TABLE notification_preferences (
    id                   UUID         PRIMARY KEY,
    user_id              UUID         NOT NULL,
    tenant_id            UUID,
    notification_type    VARCHAR(64)  NOT NULL,
    channel              VARCHAR(16)  NOT NULL,
    enabled              BOOLEAN      NOT NULL DEFAULT true,
    cadence              VARCHAR(16)  NOT NULL DEFAULT 'IMMEDIATE',
    created_at           TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ  NOT NULL DEFAULT now(),
    version              BIGINT       NOT NULL DEFAULT 0,
    CONSTRAINT chk_notification_pref_channel CHECK (channel IN ('EMAIL','IN_APP','SMS')),
    CONSTRAINT chk_notification_pref_cadence CHECK (cadence IN ('IMMEDIATE','DAILY','WEEKLY','OFF'))
);
CREATE UNIQUE INDEX ux_notification_pref_unique
    ON notification_preferences (
        user_id,
        COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid),
        notification_type,
        channel
    );
CREATE INDEX idx_notification_pref_user ON notification_preferences (user_id);

-- Idempotency for notification-service Kafka listeners (drops re-delivered events).
CREATE TABLE notification_processed_events (
    event_id        UUID         PRIMARY KEY,
    source_topic    VARCHAR(128) NOT NULL,
    received_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    notification_id UUID
);
CREATE INDEX idx_notification_processed_events_topic
    ON notification_processed_events (source_topic, received_at DESC);

-- ---------------------------------------------------------------------
-- 7. AI artifact + audit + outbox + admin
-- ---------------------------------------------------------------------

CREATE TABLE ai_artifacts (
    id                     UUID         PRIMARY KEY,
    tenant_id              UUID,
    kind                   VARCHAR(32)  NOT NULL,
    subject_entity_type    VARCHAR(32)  NOT NULL,
    subject_entity_id      UUID         NOT NULL,
    related_application_id UUID,
    related_job_id         UUID,
    related_resume_id      UUID,
    prompt_version         VARCHAR(64)  NOT NULL,
    model_version          VARCHAR(64)  NOT NULL,
    inputs_json            JSONB        NOT NULL DEFAULT '{}'::jsonb,
    output_text            TEXT,
    output_s3_key          TEXT,
    status                 VARCHAR(32)  NOT NULL DEFAULT 'DRAFT',
    review_required        BOOLEAN      NOT NULL DEFAULT true,
    created_by_user_id     UUID,
    requested_by_user_id   UUID,
    ready_at               TIMESTAMPTZ,
    failure_reason         TEXT,
    idempotency_key        VARCHAR(128),
    approved_by_user_id    UUID,
    approved_at            TIMESTAMPTZ,
    rejected_by_user_id    UUID,
    rejected_at            TIMESTAMPTZ,
    rejection_reason       TEXT,
    created_at             TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_by_user_id     UUID,
    version                BIGINT       NOT NULL DEFAULT 0,
    CONSTRAINT chk_ai_artifact_kind CHECK (kind IN (
        'RESUME_VARIANT','COVER_LETTER','CANDIDATE_SUMMARY','MATCH_EXPLANATION',
        'INTERVIEW_QA','REJECTION_EMAIL','SCREENING_QUESTIONS','SHORTLIST_RECOMMENDATION'
    )),
    CONSTRAINT chk_ai_artifact_status        CHECK (status IN ('DRAFT','READY_FOR_REVIEW','APPROVED','REJECTED','FAILED','ARCHIVED')),
    CONSTRAINT chk_ai_artifact_subject_type  CHECK (subject_entity_type IN ('CANDIDATE_PROFILE','APPLICATION','JOB','RESUME','INTERVIEW'))
);
CREATE INDEX idx_ai_artifacts_tenant_kind_status ON ai_artifacts (tenant_id, kind, status);
CREATE INDEX idx_ai_artifacts_subject            ON ai_artifacts (subject_entity_type, subject_entity_id);
CREATE INDEX idx_ai_artifacts_application        ON ai_artifacts (related_application_id) WHERE related_application_id IS NOT NULL;
CREATE INDEX idx_ai_artifacts_tenant_status_created
    ON ai_artifacts (tenant_id, status, created_at DESC);
CREATE INDEX idx_ai_artifacts_requested_by
    ON ai_artifacts (tenant_id, requested_by_user_id, created_at DESC)
    WHERE requested_by_user_id IS NOT NULL;
CREATE UNIQUE INDEX uq_ai_artifacts_tenant_idempotency
    ON ai_artifacts (tenant_id, idempotency_key)
    WHERE idempotency_key IS NOT NULL;

CREATE TABLE audit_events (
    id              UUID         PRIMARY KEY,
    tenant_id       UUID,
    actor_user_id   UUID,
    actor_role      VARCHAR(32),
    action          VARCHAR(64)  NOT NULL,
    entity_type     VARCHAR(64)  NOT NULL,
    entity_id       UUID,
    correlation_id  UUID,
    request_id      VARCHAR(128),
    ip_address      INET,
    user_agent      TEXT,
    metadata        JSONB        NOT NULL DEFAULT '{}'::jsonb,
    occurred_at     TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_tenant_recent  ON audit_events (tenant_id, occurred_at DESC);
CREATE INDEX idx_audit_entity_recent  ON audit_events (entity_type, entity_id, occurred_at DESC);
CREATE INDEX idx_audit_actor_recent   ON audit_events (actor_user_id, occurred_at DESC) WHERE actor_user_id IS NOT NULL;
CREATE INDEX idx_audit_correlation    ON audit_events (correlation_id);
CREATE INDEX idx_audit_action_recent  ON audit_events (action, occurred_at DESC);
CREATE INDEX brin_audit_occurred_at   ON audit_events USING BRIN (occurred_at);

-- One outbox table per service (services share the public schema for now).
CREATE TABLE job_event_outbox (
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
    CONSTRAINT chk_job_event_outbox_status CHECK (status IN ('PENDING','PUBLISHED','FAILED'))
);
CREATE INDEX idx_job_event_outbox_due       ON job_event_outbox (status, next_attempt_at) WHERE status IN ('PENDING','FAILED');
CREATE INDEX idx_job_event_outbox_aggregate ON job_event_outbox (aggregate_type, aggregate_id);

CREATE TABLE application_event_outbox (
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
    CONSTRAINT chk_application_event_outbox_status CHECK (status IN ('PENDING','PUBLISHED','FAILED'))
);
CREATE INDEX idx_application_event_outbox_due       ON application_event_outbox (status, next_attempt_at) WHERE status IN ('PENDING','FAILED');
CREATE INDEX idx_application_event_outbox_aggregate ON application_event_outbox (aggregate_type, aggregate_id);

CREATE TABLE feature_flags (
    flag_key             VARCHAR(128) NOT NULL,
    tenant_id            UUID,
    value                BOOLEAN      NOT NULL,
    description          TEXT,
    updated_at           TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_by_user_id   UUID,
    PRIMARY KEY (flag_key, COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid))
);
CREATE INDEX idx_feature_flags_tenant ON feature_flags (tenant_id) WHERE tenant_id IS NOT NULL;

CREATE TABLE ai_quotas (
    tenant_id                  UUID         PRIMARY KEY,
    monthly_credits            INTEGER      NOT NULL,
    used_credits_this_period   INTEGER      NOT NULL DEFAULT 0,
    hard_limit                 BOOLEAN      NOT NULL DEFAULT true,
    period_start               TIMESTAMPTZ  NOT NULL DEFAULT now(),
    period_end                 TIMESTAMPTZ  NOT NULL,
    updated_at                 TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_by_user_id         UUID,
    version                    BIGINT       NOT NULL DEFAULT 0
);

CREATE TABLE prompt_versions (
    id                   UUID         PRIMARY KEY,
    kind                 VARCHAR(64)  NOT NULL,
    version              VARCHAR(64)  NOT NULL,
    status               VARCHAR(16)  NOT NULL DEFAULT 'DRAFT',
    prompt_text          TEXT         NOT NULL,
    model_target         VARCHAR(64),
    notes                TEXT,
    created_at           TIMESTAMPTZ  NOT NULL DEFAULT now(),
    created_by_user_id   UUID,
    promoted_at          TIMESTAMPTZ,
    archived_at          TIMESTAMPTZ,
    CONSTRAINT chk_prompt_version_status CHECK (status IN ('DRAFT','ACTIVE','ARCHIVED'))
);
CREATE UNIQUE INDEX ux_prompt_versions_kind_version    ON prompt_versions (kind, version);
CREATE UNIQUE INDEX ux_prompt_versions_active_per_kind ON prompt_versions (kind) WHERE status = 'ACTIVE';

CREATE TABLE moderation_queue_items (
    id                  UUID         PRIMARY KEY,
    tenant_id           UUID,
    entity_type         VARCHAR(32)  NOT NULL,
    entity_id           UUID         NOT NULL,
    reason_code         VARCHAR(64),
    reported_by_user_id UUID,
    reported_at         TIMESTAMPTZ  NOT NULL DEFAULT now(),
    status              VARCHAR(16)  NOT NULL DEFAULT 'OPEN',
    decision            VARCHAR(16),
    decided_by_user_id  UUID,
    decided_at          TIMESTAMPTZ,
    note                TEXT,
    CONSTRAINT chk_moderation_status   CHECK (status   IN ('OPEN','DECIDED','DISMISSED')),
    CONSTRAINT chk_moderation_decision CHECK (decision IS NULL OR decision IN ('HIDE','REMOVE','DISMISS')),
    CONSTRAINT chk_moderation_entity   CHECK (entity_type IN ('JOB','PROFILE','MESSAGE'))
);
CREATE INDEX idx_moderation_open ON moderation_queue_items (status, reported_at DESC);

-- =====================================================================
-- End of Jobocate ATS V1 greenfield bootstrap.
-- =====================================================================
