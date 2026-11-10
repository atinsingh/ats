CREATE TABLE candidates (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    email VARCHAR(320) NOT NULL,
    full_name VARCHAR(512) NOT NULL,
    headline VARCHAR(512),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX ux_candidates_tenant_email ON candidates (tenant_id, lower(email));
