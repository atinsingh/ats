# 15 — Observability

Logging standards, OpenTelemetry instrumentation, Prometheus metrics, Grafana dashboards, SLOs, and error budgets.

## Files (current and planned)

| File | Purpose | Status |
|------|---------|--------|
| [`observability-plan.md`](./observability-plan.md) | Logging standards, correlation IDs, tenant-aware logs, OTel setup, Prometheus metrics, Grafana dashboards, SLOs, error budget policy, audit-vs-operational logging distinction. | Done |
| `dashboards.md` | Grafana dashboard catalog, panels, links. | Planned |
| `alerts.md` | Alert rules, severity, on-call routing. | Planned |
| `runbooks/` | Per-incident response runbooks (search down, Kafka lag, DB at capacity, etc.). | Planned |

## Non-negotiables

- Every log line includes: `service`, `env`, `correlation_id`, `tenant_id` (when known), `user_id` (when known), `request_id`.
- Every Kafka consumer publishes consumer lag and processing latency to Prometheus.
- Audit logs are persisted to a dedicated table (and exportable), separate from operational logs which may be sampled.
- SLOs cover: P99 search latency, application submission success rate, resume parsing latency, notification delivery time.
