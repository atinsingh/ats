-- Placements: a record that a person hired a candidate for a client. One per application. Pay,
-- bill and timesheets run in the firm's back office; these are the rates agreed at placement.

CREATE TABLE IF NOT EXISTS placements (
    id                    UUID          PRIMARY KEY,
    tenant_id             UUID          NOT NULL,
    application_id        UUID          NOT NULL REFERENCES applications (id),
    job_id                UUID          NOT NULL,
    candidate_profile_id  UUID          NOT NULL,
    client_id             UUID,
    start_date            DATE          NOT NULL,
    end_date              DATE          NOT NULL,
    bill_rate             NUMERIC(10,2) NOT NULL,
    pay_rate              NUMERIC(10,2) NOT NULL,
    extension             VARCHAR(16)   NOT NULL DEFAULT 'NONE',
    owner_user_id         UUID,
    created_at            TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ   NOT NULL DEFAULT now(),
    created_by_user_id    UUID,
    updated_by_user_id    UUID,
    version               BIGINT        NOT NULL DEFAULT 0,
    CONSTRAINT chk_placement_dates     CHECK (end_date >= start_date),
    CONSTRAINT chk_placement_rates     CHECK (bill_rate >= 0 AND pay_rate >= 0),
    CONSTRAINT chk_placement_extension CHECK (extension IN ('NONE','ASKED','AGREED','DECLINED'))
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_placements_application ON placements (tenant_id, application_id);
CREATE INDEX IF NOT EXISTS idx_placements_tenant_start ON placements (tenant_id, start_date DESC);
