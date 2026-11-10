-- Global user accounts. Users are NOT tenant-scoped (a user can be a
-- recruiter at one tenant and a candidate in the marketplace).

CREATE TABLE users (
    id                   UUID         PRIMARY KEY,
    email                VARCHAR(320) NOT NULL,
    password_hash        VARCHAR(255),
    email_verified_at    TIMESTAMPTZ,
    mfa_enabled          BOOLEAN      NOT NULL DEFAULT false,
    last_login_at        TIMESTAMPTZ,
    locked_until         TIMESTAMPTZ,
    failed_login_count   INTEGER      NOT NULL DEFAULT 0,
    display_name         VARCHAR(256),
    avatar_url           TEXT,
    time_zone            VARCHAR(64)  NOT NULL DEFAULT 'UTC',
    locale               VARCHAR(16)  NOT NULL DEFAULT 'en-US',
    created_at           TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ  NOT NULL DEFAULT now(),
    created_by_user_id   UUID,
    updated_by_user_id   UUID,
    version              BIGINT       NOT NULL DEFAULT 0,
    deleted_at           TIMESTAMPTZ
);

CREATE UNIQUE INDEX ux_users_email_lower ON users (lower(email)) WHERE deleted_at IS NULL;
CREATE        INDEX idx_users_last_login ON users (last_login_at DESC);

CREATE TABLE password_reset_tokens (
    token_hash    CHAR(64)     PRIMARY KEY,
    user_id       UUID         NOT NULL,
    expires_at    TIMESTAMPTZ  NOT NULL,
    consumed_at   TIMESTAMPTZ,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_password_reset_user ON password_reset_tokens (user_id);

CREATE TABLE refresh_tokens (
    id            UUID         PRIMARY KEY,
    user_id       UUID         NOT NULL,
    token_hash    CHAR(64)     NOT NULL,
    family_id     UUID         NOT NULL,
    issued_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    expires_at    TIMESTAMPTZ  NOT NULL,
    revoked_at    TIMESTAMPTZ,
    user_agent    TEXT,
    ip_address    INET
);
CREATE UNIQUE INDEX ux_refresh_tokens_hash ON refresh_tokens (token_hash);
CREATE        INDEX idx_refresh_tokens_user_family ON refresh_tokens (user_id, family_id);

CREATE TABLE invitations (
    id                  UUID         PRIMARY KEY,
    tenant_id           UUID         NOT NULL,
    email               VARCHAR(320) NOT NULL,
    role                VARCHAR(32)  NOT NULL,
    token_hash          CHAR(64)     NOT NULL,
    invited_by_user_id  UUID,
    expires_at          TIMESTAMPTZ  NOT NULL,
    accepted_at         TIMESTAMPTZ,
    revoked_at          TIMESTAMPTZ,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX ux_invitations_token ON invitations (token_hash);
CREATE        INDEX idx_invitations_tenant_email ON invitations (tenant_id, lower(email));
