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
    CONSTRAINT chk_prompt_version_status
        CHECK (status IN ('DRAFT','ACTIVE','ARCHIVED'))
);

CREATE UNIQUE INDEX ux_prompt_versions_kind_version
    ON prompt_versions (kind, version);

CREATE UNIQUE INDEX ux_prompt_versions_active_per_kind
    ON prompt_versions (kind) WHERE status = 'ACTIVE';

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
