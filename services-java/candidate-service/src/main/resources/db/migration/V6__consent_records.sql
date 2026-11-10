-- Append-only consent ledger. Latest record per (user, kind, tenant?)
-- determines effective consent.

CREATE TABLE consent_records (
    id                   UUID         PRIMARY KEY,
    user_id              UUID         NOT NULL,
    candidate_profile_id UUID,
    tenant_id            UUID,
    consent_kind         VARCHAR(64)  NOT NULL,
    consent_value        BOOLEAN      NOT NULL,
    policy_version       VARCHAR(64),
    source               VARCHAR(32),
    ip_address           INET,
    user_agent           TEXT,
    recorded_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT chk_consent_kind
        CHECK (consent_kind IN ('SEARCHABLE','AI_TOOLS','MARKETING','DATA_PROCESSING_TOS')),
    CONSTRAINT chk_consent_source
        CHECK (source IS NULL OR source IN ('SIGNUP_PAGE','SETTINGS_PAGE','APPLY_FLOW','IMPORT'))
);

CREATE INDEX idx_consent_user_kind_recent
    ON consent_records (user_id, consent_kind, recorded_at DESC);

CREATE INDEX idx_consent_tenant_kind_recent
    ON consent_records (tenant_id, consent_kind, recorded_at DESC)
    WHERE tenant_id IS NOT NULL;
