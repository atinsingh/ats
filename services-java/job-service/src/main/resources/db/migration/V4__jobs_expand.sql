-- Expand `jobs` to the canonical shape. The legacy `location TEXT` column is
-- preserved for backward compatibility with V2/V3 demo seeds; new code reads
-- structured city/region/country.

ALTER TABLE jobs
    ADD COLUMN IF NOT EXISTS organization_id        UUID,
    ADD COLUMN IF NOT EXISTS slug                   VARCHAR(256),
    ADD COLUMN IF NOT EXISTS responsibilities       TEXT,
    ADD COLUMN IF NOT EXISTS qualifications         TEXT,
    ADD COLUMN IF NOT EXISTS experience_min_years   INTEGER,
    ADD COLUMN IF NOT EXISTS experience_max_years   INTEGER,
    ADD COLUMN IF NOT EXISTS location_city          VARCHAR(128),
    ADD COLUMN IF NOT EXISTS location_region        VARCHAR(128),
    ADD COLUMN IF NOT EXISTS location_country       VARCHAR(64),
    ADD COLUMN IF NOT EXISTS published_at           TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS closed_at              TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS pipeline_id            UUID,
    ADD COLUMN IF NOT EXISTS boost_score            INTEGER     NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS created_by_user_id     UUID,
    ADD COLUMN IF NOT EXISTS updated_by_user_id     UUID,
    ADD COLUMN IF NOT EXISTS version                BIGINT      NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS deleted_at             TIMESTAMPTZ;

UPDATE jobs SET status = 'PUBLISHED' WHERE status = 'OPEN';

ALTER TABLE jobs
    ADD CONSTRAINT chk_jobs_status
        CHECK (status IN ('DRAFT','PUBLISHED','CLOSED','ARCHIVED')),
    ADD CONSTRAINT chk_jobs_employment_type
        CHECK (employment_type IS NULL OR employment_type IN ('FULL_TIME','PART_TIME','CONTRACT','INTERNSHIP','TEMPORARY')),
    ADD CONSTRAINT chk_jobs_remote_policy
        CHECK (remote_policy IS NULL OR remote_policy IN ('ONSITE','HYBRID','REMOTE','REMOTE_FIRST')),
    ADD CONSTRAINT chk_jobs_experience_range
        CHECK (experience_min_years IS NULL OR experience_max_years IS NULL OR experience_min_years <= experience_max_years),
    ADD CONSTRAINT chk_jobs_salary_range
        CHECK (salary_min_cents IS NULL OR salary_max_cents IS NULL OR salary_min_cents <= salary_max_cents);

CREATE UNIQUE INDEX ux_jobs_tenant_slug
    ON jobs (tenant_id, slug)
    WHERE slug IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX idx_jobs_published
    ON jobs (status, published_at DESC)
    WHERE status = 'PUBLISHED' AND deleted_at IS NULL;

CREATE INDEX idx_jobs_tenant_country_region
    ON jobs (tenant_id, location_country, location_region)
    WHERE deleted_at IS NULL;
