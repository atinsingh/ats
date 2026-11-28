-- Submittals: a candidate put forward to a client for a job. A person approves each one before it
-- counts as submitted; the API never sends anything to a client or VMS.

CREATE TABLE IF NOT EXISTS submittals (
    id                      UUID          PRIMARY KEY,
    tenant_id               UUID          NOT NULL,
    application_id          UUID          NOT NULL REFERENCES applications (id),
    job_id                  UUID          NOT NULL,
    candidate_profile_id    UUID          NOT NULL,
    client_id               UUID,
    channel                 VARCHAR(64)   NOT NULL DEFAULT 'Direct',
    status                  VARCHAR(32)   NOT NULL DEFAULT 'AWAITING_APPROVAL',
    bill_rate               NUMERIC(10,2),
    owner_user_id           UUID,
    approved_by_user_id     UUID,
    submitted_at            TIMESTAMPTZ,
    last_client_activity_at TIMESTAMPTZ,
    latest_note             VARCHAR(280),
    created_at              TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ   NOT NULL DEFAULT now(),
    created_by_user_id      UUID,
    updated_by_user_id      UUID,
    version                 BIGINT        NOT NULL DEFAULT 0,
    CONSTRAINT chk_submittal_status CHECK (status IN
        ('AWAITING_APPROVAL','CLIENT_REVIEWING','INTERVIEW','OFFER','CLIENT_PASSED','WITHDRAWN')),
    CONSTRAINT chk_submittal_bill_rate CHECK (bill_rate IS NULL OR bill_rate >= 0)
);

-- One open submittal per application.
CREATE UNIQUE INDEX IF NOT EXISTS ux_submittals_open_application
    ON submittals (tenant_id, application_id)
    WHERE status IN ('AWAITING_APPROVAL','CLIENT_REVIEWING','INTERVIEW','OFFER');
CREATE INDEX IF NOT EXISTS idx_submittals_tenant_created ON submittals (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_submittals_tenant_status  ON submittals (tenant_id, status, created_at DESC);
