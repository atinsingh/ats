-- Rename `candidates` to `candidate_profiles` and expand to the full domain
-- shape. The rename is the cheapest path because no non-MVP code references
-- the old name yet.

ALTER TABLE candidates RENAME TO candidate_profiles;

ALTER TABLE candidate_profiles
    ADD COLUMN IF NOT EXISTS user_id                       UUID,
    ADD COLUMN IF NOT EXISTS phone                         VARCHAR(64),
    ADD COLUMN IF NOT EXISTS location_city                 VARCHAR(128),
    ADD COLUMN IF NOT EXISTS location_region               VARCHAR(128),
    ADD COLUMN IF NOT EXISTS location_country              VARCHAR(64),
    ADD COLUMN IF NOT EXISTS summary                       TEXT,
    ADD COLUMN IF NOT EXISTS desired_role                  VARCHAR(256),
    ADD COLUMN IF NOT EXISTS salary_expectation_min_cents  BIGINT,
    ADD COLUMN IF NOT EXISTS salary_expectation_max_cents  BIGINT,
    ADD COLUMN IF NOT EXISTS currency_code                 CHAR(3),
    ADD COLUMN IF NOT EXISTS availability                  VARCHAR(32),
    ADD COLUMN IF NOT EXISTS work_authorization            VARCHAR(64),
    ADD COLUMN IF NOT EXISTS links                         JSONB        NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS profile_visibility            VARCHAR(32)  NOT NULL DEFAULT 'PRIVATE',
    ADD COLUMN IF NOT EXISTS consent_searchable            BOOLEAN      NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS updated_at                    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    ADD COLUMN IF NOT EXISTS created_by_user_id            UUID,
    ADD COLUMN IF NOT EXISTS updated_by_user_id            UUID,
    ADD COLUMN IF NOT EXISTS version                       BIGINT       NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS deleted_at                    TIMESTAMPTZ;

ALTER TABLE candidate_profiles
    ALTER COLUMN tenant_id DROP NOT NULL;

ALTER TABLE candidate_profiles
    ADD CONSTRAINT chk_candidate_profile_visibility
        CHECK (profile_visibility IN ('PUBLIC', 'TENANT_ONLY', 'PRIVATE')),
    ADD CONSTRAINT chk_candidate_availability
        CHECK (availability IS NULL OR availability IN ('IMMEDIATE','TWO_WEEKS','ONE_MONTH','THREE_MONTHS','PASSIVE'));

DROP INDEX IF EXISTS ux_candidates_tenant_email;

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
