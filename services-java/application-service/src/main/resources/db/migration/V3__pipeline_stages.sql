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

CREATE UNIQUE INDEX ux_pipeline_stages_position
    ON pipeline_stages (pipeline_id, position);

CREATE INDEX idx_pipeline_stages_pipeline ON pipeline_stages (pipeline_id);
