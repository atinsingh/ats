# Jobocate Platform Documentation

This is the engineering documentation root for the Jobocate Recruitment Portal + ATS — a multi-tenant SaaS platform for job discovery, candidate management, recruiter workflows, and resume database search backed by **PostgreSQL** (system of record), **OpenSearch** (denormalized read model), **Kafka** (asynchronous backbone), **S3** (object storage), and an **AI worker pool** (Python).

> Audience: engineers, architects, product managers, security/compliance reviewers, and operators of the platform. New contributors should start with `02-architecture/audit-as-is.md` (current state) and `01-product/functional-requirements.md` (target scope).

---

## Folder map

| Folder                                    | What lives here                                                                                                                                                                               |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`01-product`](./01-product/)             | Product requirements, functional requirements, scope decisions, MVP vs post-MVP classifications.                                                                                              |
| [`02-architecture`](./02-architecture/)   | System and service architecture, technology choices, deployment topology, **as-is** snapshot of the current monorepo.                                                                         |
| [`03-domain-model`](./03-domain-model/)   | Bounded contexts, aggregates, entity relationships, database design, ER diagrams, ID strategy, soft-delete and audit strategy.                                                                |
| [`04-workflows`](./04-workflows/)         | Cross-service workflows: application state machine, job lifecycle, interview pipeline, offer flow, resume parsing pipeline.                                                                   |
| [`05-api-contracts`](./05-api-contracts/) | REST API contract plan, error model, pagination, idempotency, versioning. The OpenAPI YAMLs themselves live in [`packages/shared-contracts/openapi/`](../packages/shared-contracts/openapi/). |
| [`06-search-engine`](./06-search-engine/) | OpenSearch architecture, index strategy, mappings, hybrid lexical+vector ranking, autocomplete, reindex strategy, search SLOs.                                                                |
| [`07-ai-platform`](./07-ai-platform/)     | AI artifact platform: prompt + model versioning, quotas, human-in-the-loop, AI worker contracts.                                                                                              |
| [`08-security`](./08-security/)           | Security baseline, threat model, RBAC permissions matrix, JWT/OIDC integration, secrets management, file-upload security.                                                                     |
| [`09-multi-tenancy`](./09-multi-tenancy/) | Tenant isolation strategy across DB, search, cache, Kafka, S3, logs, and analytics. Tenant resolution from JWT claims, dev-header escape hatch, cross-tenant test strategy.                   |
| [`10-recruiter-ux`](./10-recruiter-ux/)   | Recruiter-facing screens, kanban/list, candidate packet, bulk actions, IA.                                                                                                                    |
| [`11-candidate-ux`](./11-candidate-ux/)   | Candidate-facing screens, profile/resume management, application history, AI assistance flows.                                                                                                |
| [`12-admin-console`](./12-admin-console/) | Super-admin and tenant-admin features: tenant management, feature flags, AI quotas, abuse moderation, audit views.                                                                            |
| [`13-notifications`](./13-notifications/) | Notification types, channel abstractions (email, in-app, future SMS/push), preference model, rate limiting, digest design.                                                                    |
| [`14-billing`](./14-billing/)             | Subscription plans, entitlements, seat/quota enforcement, Stripe integration, invoice generation, sponsored job billing.                                                                      |
| [`15-observability`](./15-observability/) | Logging standards, OpenTelemetry, Prometheus metrics, Grafana dashboards, SLOs, error budgets.                                                                                                |
| [`16-devops`](./16-devops/)               | Full SDLC, local development, build/test, CI/CD, environment variables, coding standards, and testing strategy.                                                                               |
| [`17-compliance`](./17-compliance/)       | Privacy, consent, retention, data export/deletion (DSAR), audit immutability, regional considerations.                                                                                        |
| [`18-roadmap`](./18-roadmap/)             | MVP plan, phased delivery, capability roadmap, parity benchmarks.                                                                                                                             |

---

## Source-of-truth conventions

- **Code-adjacent contracts** (OpenAPI, JSON Schema, Kafka topic names, event payloads) live in [`packages/shared-contracts/`](../packages/shared-contracts/) — the docs here describe and reference them, but the YAML/JSON files in that package are authoritative for consumers and for codegen.
- **Database migrations** live per-service under `src/main/resources/db/migration` (Flyway). The design docs in `03-domain-model/` describe what _should_ exist; the running migration set is what _does_ exist.
- **`audit-as-is.md`** in [`02-architecture/`](./02-architecture/audit-as-is.md) is a snapshot of the current implementation and gaps. Update it whenever a service moves from "stub" to "real" so the to-be docs stay grounded.

## Reading order for new joiners

1. [`02-architecture/audit-as-is.md`](./02-architecture/audit-as-is.md) — what exists today.
2. [`01-product/functional-requirements.md`](./01-product/functional-requirements.md) — what we are building.
3. [`02-architecture/backend-modular-architecture.md`](./02-architecture/backend-modular-architecture.md) — how the backend is organized.
4. [`03-domain-model/domain-model.md`](./03-domain-model/domain-model.md) and [`database-design.md`](./03-domain-model/database-design.md) — entities and persistence.
5. [`04-workflows/application-state-machine.md`](./04-workflows/application-state-machine.md) — the central workflow.
6. [`08-security/rbac-permissions-matrix.md`](./08-security/rbac-permissions-matrix.md) and [`09-multi-tenancy/tenancy-strategy.md`](./09-multi-tenancy/tenancy-strategy.md) — non-negotiables.
7. [`18-roadmap/mvp-implementation-plan.md`](./18-roadmap/mvp-implementation-plan.md) — execution order.

## Related repo files

- Root [`README.md`](../README.md) — local dev quickstart and repo layout.
- [`packages/shared-contracts/`](../packages/shared-contracts/) — contracts.
- [`infra/docker/docker-compose.yml`](../infra/docker/docker-compose.yml) — local infra stack.
- [`16-devops/full-sdlc.md`](./16-devops/full-sdlc.md) — canonical delivery workflow used by Claude Code and Cursor.
