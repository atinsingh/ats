CREATE TABLE jobs (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status VARCHAR(32) NOT NULL,
    location TEXT,
    employment_type VARCHAR(64),
    remote_policy VARCHAR(64),
    salary_min_cents BIGINT,
    salary_max_cents BIGINT,
    currency_code CHAR(3),
    department TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_jobs_tenant ON jobs (tenant_id);
CREATE INDEX idx_jobs_tenant_status ON jobs (tenant_id, status);
