-- Role grants of a global user inside a tenant. SUPER_ADMIN grants set
-- tenant_id to a sentinel UUID (00000000-0000-0000-0000-000000000000) and
-- the application enforces cross-tenant scope when role = 'SUPER_ADMIN'.

CREATE TABLE user_roles (
    id                   UUID         PRIMARY KEY,
    user_id              UUID         NOT NULL,
    tenant_id            UUID         NOT NULL,
    role                 VARCHAR(32)  NOT NULL,
    granted_by_user_id   UUID,
    granted_at           TIMESTAMPTZ  NOT NULL DEFAULT now(),
    revoked_at           TIMESTAMPTZ,
    revoked_by_user_id   UUID,
    revocation_reason    TEXT,
    CONSTRAINT chk_user_roles_role
        CHECK (role IN (
            'SUPER_ADMIN', 'TENANT_ADMIN', 'RECRUITER',
            'HIRING_MANAGER', 'INTERVIEWER', 'CANDIDATE',
            'FINANCE_ADMIN', 'COMPLIANCE_ADMIN'
        ))
);

CREATE UNIQUE INDEX ux_user_roles_active
    ON user_roles (user_id, tenant_id, role)
    WHERE revoked_at IS NULL;

CREATE INDEX idx_user_roles_user            ON user_roles (user_id);
CREATE INDEX idx_user_roles_tenant_role     ON user_roles (tenant_id, role);
CREATE INDEX idx_user_roles_granted_at      ON user_roles (granted_at DESC);
