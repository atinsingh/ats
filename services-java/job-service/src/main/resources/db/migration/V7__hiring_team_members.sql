CREATE TABLE hiring_team_members (
    job_id      UUID         NOT NULL,
    user_id     UUID         NOT NULL,
    tenant_id   UUID         NOT NULL,
    team_role   VARCHAR(32)  NOT NULL,
    added_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    added_by_user_id UUID,
    PRIMARY KEY (job_id, user_id),
    CONSTRAINT chk_hiring_team_role
        CHECK (team_role IN ('OWNER','RECRUITER','HIRING_MANAGER','INTERVIEWER','OBSERVER'))
);

CREATE INDEX idx_hiring_team_user      ON hiring_team_members (user_id);
CREATE INDEX idx_hiring_team_tenant    ON hiring_team_members (tenant_id);
