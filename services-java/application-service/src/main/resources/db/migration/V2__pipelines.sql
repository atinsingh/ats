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

CREATE UNIQUE INDEX ux_pipelines_default_per_tenant
    ON pipelines (tenant_id) WHERE is_default = true AND deleted_at IS NULL;

CREATE INDEX idx_pipelines_tenant ON pipelines (tenant_id) WHERE deleted_at IS NULL;
