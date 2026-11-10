# Jobocate Platform

Production-grade monorepo for a **multi-tenant Recruitment Portal +
Applicant Tracking System (ATS)**. PostgreSQL is the system of
record for workflows; **OpenSearch** is the primary recruiter and
public-job search engine with **denormalized** documents derived
from domain events. **Kafka** is the asynchronous backbone (transactional
outbox + retryable topics + DLQ). **Redis** powers cache,
autocomplete, and rate limiting (post-MVP). **S3-compatible storage**
holds resume binaries and generated AI artifacts.

The product spec, architecture, security baseline, multi-tenancy
strategy, observability plan, testing strategy, and the six-milestone
MVP plan all live under [`docs/`](docs/) — `docs/README.md` is the
folder map.

## 1. Architecture principles

| Concern         | Decision                                                                                                                      |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Search hot path | No SQL joins across ATS tables per recruiter request; search reads **OpenSearch only**                                        |
| Source of truth | **PostgreSQL** for ATS entities and workflow state                                                                            |
| Search index    | **Derived read model**, projected from Kafka events                                                                           |
| Retrieval       | **Hybrid**: lexical + optional vector augmentation (vectors do not replace lexical)                                           |
| Eventing        | **Transactional outbox** in every Java service; `@RetryableTopic` + DLQ on consumers                                          |
| Tenancy         | **Mandatory server-side tenant isolation** (JWT claim → `TenantContext` → repo filters → search filter → S3 prefix → log MDC) |
| Security        | **JWT** auth, RBAC (8 roles), method-level `@PreAuthorize`, internal-token-protected `/internal/v1/**`                        |
| AI              | Pluggable AI artifact pipeline (`DRAFT → READY_FOR_REVIEW → APPROVED/REJECTED/ARCHIVED`); human approval before submission    |
| Observability   | **OpenTelemetry**, structured JSON logs with `correlation_id` + `tenant_id` + `user_id` MDC, Prometheus, Grafana              |

## 2. Repository layout

```
apps/                              Next.js 15 (App Router, TypeScript, Tailwind, shadcn/ui, TanStack Query)
  job-portal-web/                  Candidate-facing job marketplace + candidate portal
  ats-recruiter-web/               Recruiter ATS workspace
  admin-console-web/               Super-admin / tenant-admin console (post-MVP)

services-java/                     Spring Boot 4.x, Java 21, JPA, Flyway, Spring Kafka, OpenTelemetry
  platform-starter/                Shared filters, security, MDC, error envelope
  tenant-auth-service/             Auth, JWT issuance, password hashing
  ats-core-service/                Tenants, recruiter seats
  candidate-service/               Candidate profile, resumes, S3 + parser callbacks
  job-service/                     Job lifecycle (draft/publish/close/clone) + outbox
  application-service/             Applications, pipeline transitions, AI artifact platform
  notification-service/            Notifications + preferences + rate limits + email dispatch
  search-orchestrator-service/     Kafka → OpenSearch projector
  admin-service/                   Platform-level admin

services-go/                       Go 1.23+, chi/v5, opensearch-go, slog
  search-gateway/                  Public + tenant search, autocomplete, internal bulk-index

workers-python/                    Python 3.12+, kafka-python, pydantic, boto3
  resume-parser-worker/            PDF/DOCX → structured fields
  ai-artifact-worker/              Cover letters, summaries, match explanations (pluggable LLM provider)
  embedding-worker/                Vector indexing (post-MVP)

packages/                          Shared TypeScript packages (pnpm workspaces, TurboRepo)
  shared-contracts/                OpenAPI YAMLs, JSON Schemas, Kafka topic specs
  api-sdk/                         Typed client for the Java REST surface (consumed by Next.js apps)
  ui/                              Shared shadcn/ui components

infra/
  docker/                          docker-compose.yml + Dockerfiles for compose-dev
  sql/greenfield/                  Consolidated V1 schema for fresh-start environments
  observability/                   Collector, Prometheus rules, Grafana dashboards
  terraform/                       Cloud scaffolding (VPC, RDS, MSK, …) — post-MVP

docs/                              See docs/README.md for the full map
```

## 3. Tech stack

| Layer          | Stack                                                                                                   |
| -------------- | ------------------------------------------------------------------------------------------------------- |
| Backend        | Java 21, Spring Boot 4.x, Spring Security, Spring Data JPA, PostgreSQL 16, Flyway 11                    |
| Search gateway | Go 1.23, chi/v5, opensearch-go/v2, slog                                                                 |
| Workers        | Python 3.12, kafka-python, pydantic, boto3, pypdf / python-docx (resumes), httpx (callbacks)            |
| Frontend       | Next.js 15 (App Router), React 19, TypeScript, Tailwind, shadcn/ui, TanStack Query                      |
| Infra (local)  | Postgres 16, Redpanda (Kafka API), OpenSearch 2.17.1, MinIO, Jaeger, OTel collector                     |
| Eventing       | Kafka, transactional outbox, `@RetryableTopic` + DLQ                                                    |
| Observability  | OpenTelemetry, Prometheus, Grafana, structured JSON logs                                                |
| Test infra     | JUnit 5 + Testcontainers (Java), `go test` + `httptest` (Go), pytest (Python), Vitest + Playwright (TS) |

## 4. Documentation map

The full documentation tree lives under [`docs/`](docs/) — see
[`docs/README.md`](docs/README.md) for the folder map. Quick links:

| Topic                         | Doc                                                                                                  |
| ----------------------------- | ---------------------------------------------------------------------------------------------------- |
| As-is implementation snapshot | [`docs/02-architecture/audit-as-is.md`](docs/02-architecture/audit-as-is.md)                         |
| Functional requirements       | [`docs/01-product/functional-requirements.md`](docs/01-product/functional-requirements.md)           |
| Domain model                  | [`docs/03-domain-model/domain-model.md`](docs/03-domain-model/domain-model.md)                       |
| Database design               | [`docs/03-domain-model/database-design.md`](docs/03-domain-model/database-design.md)                 |
| Application state machine     | [`docs/04-workflows/application-state-machine.md`](docs/04-workflows/application-state-machine.md)   |
| Resume upload + parsing       | [`docs/04-workflows/resume-upload-and-parsing.md`](docs/04-workflows/resume-upload-and-parsing.md)   |
| API contract plan             | [`docs/05-api-contracts/api-contract-plan.md`](docs/05-api-contracts/api-contract-plan.md)           |
| OpenAPI specs                 | [`packages/shared-contracts/openapi/`](packages/shared-contracts/openapi/)                           |
| Search architecture           | [`docs/06-search-engine/search-architecture.md`](docs/06-search-engine/search-architecture.md)       |
| AI artifact platform          | [`docs/07-ai-platform/ai-artifact-platform.md`](docs/07-ai-platform/ai-artifact-platform.md)         |
| Security baseline             | [`docs/08-security/security-baseline.md`](docs/08-security/security-baseline.md)                     |
| RBAC matrix                   | [`docs/08-security/rbac-permissions-matrix.md`](docs/08-security/rbac-permissions-matrix.md)         |
| Tenancy strategy              | [`docs/09-multi-tenancy/tenancy-strategy.md`](docs/09-multi-tenancy/tenancy-strategy.md)             |
| Cross-tenant test plan        | [`docs/09-multi-tenancy/cross-tenant-test-plan.md`](docs/09-multi-tenancy/cross-tenant-test-plan.md) |
| Notification service          | [`docs/13-notifications/notification-service.md`](docs/13-notifications/notification-service.md)     |
| Observability plan            | [`docs/15-observability/observability-plan.md`](docs/15-observability/observability-plan.md)         |
| Testing strategy              | [`docs/16-devops/testing-strategy.md`](docs/16-devops/testing-strategy.md)                           |
| Full SDLC playbook            | [`docs/16-devops/full-sdlc.md`](docs/16-devops/full-sdlc.md)                                         |
| Agent delivery framework      | [`docs/16-devops/agent-delivery-framework.md`](docs/16-devops/agent-delivery-framework.md) — start with [`AGENTS.md`](AGENTS.md) |
| Coding standards              | [`docs/16-devops/coding-standards.md`](docs/16-devops/coding-standards.md)                           |
| UI coding standards           | [`docs/16-devops/ui-coding-standards.md`](docs/16-devops/ui-coding-standards.md)                     |
| Environment variables         | [`docs/16-devops/environment-variables.md`](docs/16-devops/environment-variables.md)                 |
| MVP implementation plan       | [`docs/18-roadmap/mvp-implementation-plan.md`](docs/18-roadmap/mvp-implementation-plan.md)           |
| Portal parity roadmap         | [`docs/18-roadmap/portal-parity-roadmap.md`](docs/18-roadmap/portal-parity-roadmap.md)               |

## 5. Prerequisites

- **Node.js** 20+, **pnpm** 9+
- **Java** 21, **Gradle** 8.14+ (or generate the wrapper:
  `gradle wrapper --gradle-version 8.14`)
- **Go** 1.23+
- **Python** 3.12+
- **Docker** + Docker Compose

## 6. Local development

### 6.1 Start infrastructure

```bash
docker compose -f infra/docker/docker-compose.yml up -d
```

Brings up: PostgreSQL 16, Redpanda (Kafka API), OpenSearch 2.17.1,
MinIO, Jaeger, OpenTelemetry collector.

### 6.2 Install JS workspace

```bash
pnpm install
```

### 6.3 Run web apps

```bash
pnpm dev:job-portal      # http://localhost:3000  (candidate portal + public marketplace)
pnpm dev:ats-recruiter   # http://localhost:3001  (recruiter ATS)
pnpm dev:admin           # http://localhost:3002  (post-MVP)
```

The internal developer hub is available at
[`http://localhost:3002/developer`](http://localhost:3002/developer). It summarizes the local
architecture, contract catalog, service endpoints, delivery gates, and engineering sources of truth.

### 6.3.1 AI-assisted delivery workflow

The repository provides one SDLC source of truth with native entry points for both supported editors:

- Claude Code skill: [`.claude/skills/full-sdlc/SKILL.md`](.claude/skills/full-sdlc/SKILL.md)
- Cursor project rule: [`.cursor/rules/full-sdlc.mdc`](.cursor/rules/full-sdlc.mdc)
- Cursor command: [`.cursor/commands/full-sdlc.md`](.cursor/commands/full-sdlc.md)

Both adapters require the canonical [`docs/16-devops/full-sdlc.md`](docs/16-devops/full-sdlc.md)
playbook so planning, TDD, security, tenancy, Responsible AI, verification, and release evidence stay
consistent across tools.

Every change follows the strict story workflow in
[`docs/16-devops/agent-delivery-framework.md`](docs/16-devops/agent-delivery-framework.md): one Jira
`IATS` story = one branch `<type>/IATS-<n>-<slug>` = one PR, Conventional Commits with the Jira key,
a draft PR with the template, `scripts/agent/preflight.sh`, independent AI review plus code-owner
approval, and human-only squash merge. Entry points: [`AGENTS.md`](AGENTS.md) (Codex, Cursor),
[`CLAUDE.md`](CLAUDE.md) (Claude Code), `.cursor/rules/agent-workflow.mdc`, and the `deliver-story`
and `review-pr` commands/skills.

```bash
bash scripts/agent/install-protected-files.sh        # once: installs .github/ and .claude/ files, enables hooks
scripts/agent/start-story.sh IATS-98 feat board-dialect-emitters --worktree
scripts/agent/preflight.sh                           # before requesting review
```

For the public job SERP (`/jobs`), set `SEARCH_GATEWAY_URL` and
optional `PORTAL_SEARCH_TENANT_ID` in `.env`
([see `.env.example`](.env.example)) and run `search-gateway`
plus indexed jobs.

### 6.4 Run Java services

Generate the Gradle wrapper once:

```bash
gradle wrapper --gradle-version 8.14
```

From the repo root:

```bash
./gradlew :services-java:tenant-auth-service:bootRun
./gradlew :services-java:ats-core-service:bootRun
./gradlew :services-java:job-service:bootRun
./gradlew :services-java:candidate-service:bootRun
./gradlew :services-java:application-service:bootRun
./gradlew :services-java:notification-service:bootRun
./gradlew :services-java:search-orchestrator-service:bootRun
```

> **Run `ats-core-service` before `job-service`** at least once so the
> demo tenant exists before Flyway applies job seed data.

Each service exposes:

- `GET /actuator/health` — liveness/readiness
- `GET /actuator/prometheus` — metrics
- `POST /internal/v1/...` — service-to-service surface, gated by
  `JOBOCATE_INTERNAL_TOKEN`

Configure `SPRING_DATASOURCE_*` to point at local Postgres (compose
defaults). All services share the same `JOBOCATE_JWT_SECRET`,
`JOBOCATE_INTERNAL_TOKEN`, and security baseline; see
[`docs/16-devops/environment-variables.md`](docs/16-devops/environment-variables.md).

#### Demo JWT (local)

Issue a tenant-scoped access token from `tenant-auth-service`:

```bash
curl -s http://localhost:8090/api/auth/demo-token \
  -H 'Content-Type: application/json' \
  -d '{"tenant_id":"11111111-1111-1111-1111-111111111111","subject":"recruiter@demo.com"}'
```

Call APIs:

```bash
TOKEN="paste_access_token_here"
curl -s http://localhost:8082/api/v1/jobs -H "Authorization: Bearer $TOKEN"
```

Optional dev-only headers (disabled in prod via
`JOBOCATE_ALLOW_HEADER_TENANT=false` and never honored in prod
gated paths):

```bash
curl -s http://localhost:8082/api/v1/jobs \
  -H 'X-Jobocate-Tenant-Id: 11111111-1111-1111-1111-111111111111' \
  -H 'X-Jobocate-User-Id: 22222222-2222-2222-2222-222222222222' \
  -H 'X-Jobocate-Roles: RECRUITER,TENANT_ADMIN'
```

When `X-Jobocate-Roles` is absent in dev, the filter grants every
role so smoke tests don't break.

### 6.5 Run the Go search gateway

```bash
cd services-go/search-gateway && go run ./cmd/search-gateway
```

Default: `http://localhost:8086`. Tenant header is required:

```bash
curl -s 'http://localhost:8086/v1/search/jobs?q=engineer' \
  -H 'X-Jobocate-Tenant-Id: 11111111-1111-1111-1111-111111111111'
```

### 6.6 Run Python workers

```bash
# Resume parser
cd workers-python/resume-parser-worker
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
python -m resume_parser_worker

# AI artifact worker
cd workers-python/ai-artifact-worker
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
python -m ai_artifact_worker
```

Both workers default to a deterministic `StubProvider` so you can
run them offline; LLM provider extras (`pip install -e .[openai]`)
are optional.

## 7. Database migrations + seed data

- Flyway migrations live in each owning Java service under
  `src/main/resources/db/migration/`. Each service maintains its
  own `flyway_<service>_schema_history` table.
- Consolidated greenfield script: [`infra/sql/greenfield/V1__initial_ats_schema.sql`](infra/sql/greenfield/V1__initial_ats_schema.sql)
  — apply this to a fresh database when bringing up a brand-new
  environment, then start services normally; per-service `V2+`
  migrations remain authoritative going forward.
- Demo data:
  - Demo tenant: `services-java/ats-core-service/src/main/resources/db/migration/V1__tenants.sql`.
  - Demo jobs: `services-java/job-service/src/main/resources/db/migration/V2__seed_demo_jobs.sql` (and `V3__demo_jobs_compensation.sql`).

## 8. OpenAPI + contract generation

- OpenAPI 3.1 YAMLs live under
  [`packages/shared-contracts/openapi/`](packages/shared-contracts/openapi/),
  organized by domain (auth, tenant, candidate, resume, job,
  application, search, notification, AI artifact, admin).
- JSON Schemas (e.g. job/candidate index documents) live under
  [`packages/shared-contracts/schemas/`](packages/shared-contracts/schemas/).
- The TypeScript SDK is built from these contracts:
  ```bash
  pnpm --filter @jobocate/api-sdk build
  ```
- Lint contracts:
  ```bash
  pnpm spectral lint packages/shared-contracts/openapi/*.yaml
  ```

## 9. Testing

The full strategy lives at
[`docs/16-devops/testing-strategy.md`](docs/16-devops/testing-strategy.md).
Quick commands:

```bash
# Java
./gradlew test
./gradlew :services-java:application-service:test
./gradlew test --tests "*CrossTenant*"     # cross-tenant fast loop

# Go
cd services-go/search-gateway && go test ./...

# Python (per worker)
cd workers-python/resume-parser-worker && PYTHONPATH=src pytest
cd workers-python/ai-artifact-worker  && PYTHONPATH=src pytest

# TypeScript
pnpm -r tsc --noEmit
pnpm -r lint
pnpm --filter @jobocate/api-sdk build

# Contracts
pnpm spectral lint packages/shared-contracts/openapi/*.yaml
```

CI quality gates are enumerated in
[`docs/16-devops/testing-strategy.md`](docs/16-devops/testing-strategy.md)
§13 — including the mandatory cross-tenant test class on every
tenant-scoped service.

## 10. Observability

- **OTLP collector** + **Jaeger UI** at `http://localhost:16686`
  in compose-dev.
- **Prometheus** scrape rules + **Grafana** dashboards live under
  `infra/observability/`.
- Every log line carries `service`, `env`, `request_id`,
  `correlation_id`, `tenant_id`, `user_id` (when known); see the
  observability plan for log conventions, metric catalog, SLOs, and
  the runbook list.

## 11. Coding standards + branch / commit conventions

- Cross-stack standards: [`docs/16-devops/coding-standards.md`](docs/16-devops/coding-standards.md)
- UI-specific standards: [`docs/16-devops/ui-coding-standards.md`](docs/16-devops/ui-coding-standards.md)
- Branch naming: `feat/<area>-<short-desc>`, `fix/<area>-<short-desc>`,
  `chore/<area>-<short-desc>`.
- Commits: Conventional Commits (`feat:`, `fix:`, `chore:`,
  `docs:`, `refactor:`, `test:`).
- PRs must include: a short summary, the test plan, and (for
  tenant-scoped surfaces) confirmation a cross-tenant test was
  added or updated.

## 12. Security notes

- Never commit real secrets; use `.env.example` and a secret
  manager in cloud (`SOPS`/`SSM`/`Secrets Manager`).
- `JOBOCATE_JWT_SECRET` and `JOBOCATE_INTERNAL_TOKEN` must be
  generated per environment; see
  [`docs/08-security/security-baseline.md`](docs/08-security/security-baseline.md).
- `tenant-auth-service` issues JWTs with `tenant_id`, `sub`, `roles`
  claims; all downstream services validate and scope queries via
  `TenantContext`.
- Search-gateway always adds `term: { tenant_id }` to OpenSearch
  queries — see
  [`services-go/search-gateway/internal/httpserver/server.go`](services-go/search-gateway/internal/httpserver/server.go).

## 13. Troubleshooting

| Symptom                                             | Likely cause                                       | Fix                                                                                                        |
| --------------------------------------------------- | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `./gradlew: not found`                              | Wrapper not generated                              | `gradle wrapper --gradle-version 8.14` (needs system Gradle)                                               |
| Java service 401 on every request                   | Missing/expired JWT or wrong `JOBOCATE_JWT_SECRET` | Re-issue demo token; verify env var matches across services                                                |
| Search returns empty for known jobs                 | Job not yet projected                              | Confirm `search-orchestrator-service` is running and Kafka has the events; check `kafka_consumergroup_lag` |
| Resume upload S3 error                              | MinIO not running                                  | `docker compose ps`; restart the `minio` service                                                           |
| Worker tests fail with `ModuleNotFoundError: kafka` | `kafka-python` not installed                       | The worker imports `kafka` lazily; tests run without it. Check `PYTHONPATH=src` is set.                    |
| Cross-tenant 200 instead of 404                     | `JOBOCATE_ALLOW_HEADER_TENANT=true` in non-dev     | Set to `false` outside dev/CI                                                                              |
| OpenAPI lint fails                                  | Spec drift                                         | Run `pnpm spectral lint packages/shared-contracts/openapi/*.yaml` locally                                  |

## 14. License

Proprietary — adjust per your organization.
