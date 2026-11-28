-- Client companies a staffing firm places with or is pitching. jobs.organization_id points here.
CREATE TABLE IF NOT EXISTS clients (
    id                  UUID         PRIMARY KEY,
    tenant_id           UUID         NOT NULL,
    name                VARCHAR(256) NOT NULL,
    status              VARCHAR(16)  NOT NULL DEFAULT 'PROSPECT',
    channel             VARCHAR(64)  NOT NULL DEFAULT 'Direct',
    owner_user_id       UUID,
    last_contact_at     TIMESTAMPTZ,
    msa_ends_on         DATE,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    created_by_user_id  UUID,
    updated_by_user_id  UUID,
    version             BIGINT       NOT NULL DEFAULT 0,
    CONSTRAINT chk_client_status CHECK (status IN ('ACTIVE','DORMANT','PROSPECT'))
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_clients_tenant_name ON clients (tenant_id, lower(name));
CREATE INDEX IF NOT EXISTS idx_jobs_tenant_org_status ON jobs (tenant_id, organization_id, status);
