CREATE TABLE tenants (
    id UUID PRIMARY KEY,
    slug VARCHAR(128) NOT NULL UNIQUE,
    display_name VARCHAR(256) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO tenants (id, slug, display_name, status)
VALUES ('11111111-1111-1111-1111-111111111111', 'demo', 'Demo Tenant', 'ACTIVE');
