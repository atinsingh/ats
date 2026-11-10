-- citext keeps tags case-insensitive without the read-side LOWER(...).
CREATE EXTENSION IF NOT EXISTS citext;

CREATE TABLE application_tags (
    id                  UUID         PRIMARY KEY,
    application_id      UUID         NOT NULL,
    tenant_id           UUID         NOT NULL,
    tag                 CITEXT       NOT NULL,
    created_by_user_id  UUID,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX ux_application_tags_unique
    ON application_tags (application_id, tag);

CREATE INDEX idx_application_tags_tenant_tag ON application_tags (tenant_id, tag);
