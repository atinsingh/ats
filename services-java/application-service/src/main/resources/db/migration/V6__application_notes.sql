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

CREATE INDEX idx_application_notes_app_recent
    ON application_notes (application_id, created_at DESC)
    WHERE deleted_at IS NULL;

CREATE INDEX idx_application_notes_tenant
    ON application_notes (tenant_id) WHERE deleted_at IS NULL;
