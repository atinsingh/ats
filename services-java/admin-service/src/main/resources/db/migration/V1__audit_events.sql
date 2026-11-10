-- Centralized audit log. Append-only from application code (DB role grants
-- INSERT only); compliance role performs retention purges.

CREATE TABLE audit_events (
    id              UUID         PRIMARY KEY,
    tenant_id       UUID,
    actor_user_id   UUID,
    actor_role      VARCHAR(32),
    action          VARCHAR(64)  NOT NULL,
    entity_type     VARCHAR(64)  NOT NULL,
    entity_id       UUID,
    correlation_id  UUID,
    request_id      VARCHAR(128),
    ip_address      INET,
    user_agent      TEXT,
    metadata        JSONB        NOT NULL DEFAULT '{}'::jsonb,
    occurred_at     TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_tenant_recent
    ON audit_events (tenant_id, occurred_at DESC);

CREATE INDEX idx_audit_entity_recent
    ON audit_events (entity_type, entity_id, occurred_at DESC);

CREATE INDEX idx_audit_actor_recent
    ON audit_events (actor_user_id, occurred_at DESC)
    WHERE actor_user_id IS NOT NULL;

CREATE INDEX idx_audit_correlation ON audit_events (correlation_id);

CREATE INDEX idx_audit_action_recent
    ON audit_events (action, occurred_at DESC);

CREATE INDEX brin_audit_occurred_at
    ON audit_events USING BRIN (occurred_at);
