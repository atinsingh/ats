-- Adds the worker-callback fields + idempotency index introduced by Prompt 23
-- (AI artifact platform). The `FAILED` status is added to the CHECK so the
-- worker callback can record generation failures.
ALTER TABLE ai_artifacts
    ADD COLUMN IF NOT EXISTS requested_by_user_id UUID,
    ADD COLUMN IF NOT EXISTS ready_at             TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS failure_reason       TEXT,
    ADD COLUMN IF NOT EXISTS idempotency_key      VARCHAR(128);

ALTER TABLE ai_artifacts DROP CONSTRAINT IF EXISTS chk_ai_artifact_status;
ALTER TABLE ai_artifacts
    ADD CONSTRAINT chk_ai_artifact_status
    CHECK (status IN (
        'DRAFT','READY_FOR_REVIEW','APPROVED','REJECTED','FAILED','ARCHIVED'
    ));

CREATE UNIQUE INDEX IF NOT EXISTS uq_ai_artifacts_tenant_idempotency
    ON ai_artifacts (tenant_id, idempotency_key)
    WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ai_artifacts_tenant_status_created
    ON ai_artifacts (tenant_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_artifacts_requested_by
    ON ai_artifacts (tenant_id, requested_by_user_id, created_at DESC)
    WHERE requested_by_user_id IS NOT NULL;
