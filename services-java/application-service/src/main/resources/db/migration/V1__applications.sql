CREATE TABLE applications (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    job_id UUID NOT NULL,
    candidate_id UUID NOT NULL,
    status VARCHAR(32) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_applications_tenant ON applications (tenant_id);
CREATE INDEX idx_applications_job ON applications (tenant_id, job_id);
CREATE INDEX idx_applications_candidate ON applications (tenant_id, candidate_id);
