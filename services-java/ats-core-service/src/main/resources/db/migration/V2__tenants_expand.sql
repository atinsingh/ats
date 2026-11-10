-- Expand the bootstrap `tenants` table with the full column set required by
-- the canonical domain model. All ALTERs are additive and safe to re-run on
-- an environment that already has the V1 baseline.

ALTER TABLE tenants
    ADD COLUMN IF NOT EXISTS legal_name           VARCHAR(256),
    ADD COLUMN IF NOT EXISTS time_zone            VARCHAR(64)  NOT NULL DEFAULT 'UTC',
    ADD COLUMN IF NOT EXISTS default_locale       VARCHAR(16)  NOT NULL DEFAULT 'en-US',
    ADD COLUMN IF NOT EXISTS logo_url             TEXT,
    ADD COLUMN IF NOT EXISTS primary_domain       VARCHAR(256),
    ADD COLUMN IF NOT EXISTS brand_color_primary  VARCHAR(16),
    ADD COLUMN IF NOT EXISTS brand_color_accent   VARCHAR(16),
    ADD COLUMN IF NOT EXISTS billing_email        VARCHAR(320),
    ADD COLUMN IF NOT EXISTS support_email        VARCHAR(320),
    ADD COLUMN IF NOT EXISTS updated_at           TIMESTAMPTZ  NOT NULL DEFAULT now(),
    ADD COLUMN IF NOT EXISTS created_by_user_id   UUID,
    ADD COLUMN IF NOT EXISTS updated_by_user_id   UUID,
    ADD COLUMN IF NOT EXISTS version              BIGINT       NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS ux_tenants_slug_lower ON tenants (lower(slug));
CREATE        INDEX IF NOT EXISTS idx_tenants_status     ON tenants (status);
CREATE        INDEX IF NOT EXISTS idx_tenants_created_at ON tenants (created_at);
