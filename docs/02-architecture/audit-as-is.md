# Architecture audit — as-is snapshot

> **Snapshot date:** initial documentation pass. **Update this doc whenever a service crosses a stub-vs-real boundary.** Everything described here was verified by reading the code; treat it as the canonical baseline against which the to-be docs in this repo are written.

## 1. Monorepo layout

```
apps/                          Next.js 15 / React 19 (Tailwind 3, @jobocate/ui)
  job-portal-web/              port 3000  — public marketplace + SERP, has BFF route /api/search/jobs
  ats-recruiter-web/           port 3001  — recruiter ATS shell (stub)
  admin-console-web/           port 3002  — admin shell (stub)
services-java/                 Java 21, Spring Boot 4.0.4, Gradle multi-module
  platform-starter/            shared library (TenantIdentityFilter, TenantContext, JJWT)
  ats-core-service/            port 8081  — tenants read API
  candidate-service/           port 8083  — candidates list API
  job-service/                 port 8082  — jobs CRUD + Kafka publish (most complete)
  application-service/         port 8084  — applications create/list + Kafka publish
  tenant-auth-service/         port 8090  — demo HS256 JWT issuer (POST /api/auth/demo-token)
  admin-service/               port 8085  — placeholder summary endpoint
  notification-service/        port 8086  — Kafka consumer (logs only)
  search-orchestrator-service/ port 8087  — Kafka → HTTP indexer (consumes job events, POSTs to gateway)
services-go/                   Go 1.23
  search-gateway/              port 7070  — hybrid lexical+kNN job search, /v1/search/jobs and /internal/v1/index/jobs
  autocomplete-service/        port 7071  — Redis sorted-set autocomplete
  resume-ingestion-service/    port 7072  — POST /v1/resumes/ingest → Kafka jobocate.resume.raw
  analytics-event-collector/   port 7074  — POST /v1/events → Kafka jobocate.analytics.events
  index-builder-service/       no HTTP    — Kafka consumer (no-op pipeline)
  reindex-tool/                CLI        — flag parsing only, no work yet
workers-python/                Python 3.12
  resume-parser-worker/        Kafka consumer/producer — emits deterministic stub RESUME_PARSED
  embedding-worker/            Kafka consumer/producer — emits deterministic 128-dim pseudo-vector
packages/
  shared-contracts/            openapi/recruiter-search-gateway.yaml, schemas/job-index-document.schema.json, kafka/topics.yaml
  api-sdk/                     hand-written fetch client (jobs.listOpen, jobs.get, tenants.me, searchJobs)
  ui/                          Button + cn() only (shadcn-style)
infra/
  docker/                      docker-compose.yml: Postgres 16, Redis 7, Redpanda, OpenSearch 2.17, MinIO + init bucket, OTel collector, Jaeger
  observability/               otel-collector-config.yaml, prometheus-scrape example
  terraform/                   stub modules (network/data/search/storage)
```

## 2. Java services

### platform-starter (shared library)
- `com.jobocate.platform.security.TenantIdentityFilter` — `OncePerRequestFilter`. Skips `/actuator`. Resolves tenant from `Authorization: Bearer <jwt>` claim **`tenant_id`** (HS256 via JJWT 0.12.6, secret padded to 32 bytes if shorter); falls back to `X-Jobocate-Tenant-Id` header when `allowDevTenantHeader=true`. Returns 401 on missing/invalid tenant.
- `com.jobocate.platform.tenant.TenantContext` — `ThreadLocal`-style holder; `MissingTenantException` for unset access.

### Common per-service Spring Security pattern
```
http.csrf(disable).sessionManagement(STATELESS)
    .authorizeHttpRequests(/actuator/** permit, /api/** permit)
    .addFilterBefore(TenantIdentityFilter, AnonymousAuthenticationFilter)
```
i.e. Spring Security is configured but no role-based authorization is enforced yet — tenancy is the only check, and `permitAll` is used elsewhere. **This is a known gap.**

### Per-service inventory

| Service | Boot? | JPA | Flyway | Kafka P/C | HTTP API | TenantFilter | Tests |
|---------|-------|-----|--------|-----------|----------|--------------|-------|
| platform-starter | library | — | — | — | — | provides | none |
| ats-core-service | yes | yes | `V1__tenants.sql` | — | `GET /api/v1/tenants/me`, `GET /api/v1/tenants/{slug}` | yes | none |
| candidate-service | yes | yes | `V1__candidates.sql` | — | `GET /api/v1/candidates` | yes | none |
| job-service | yes | yes | `V1__jobs.sql`, `V2__seed_demo_jobs.sql`, `V3__demo_jobs_compensation.sql` | producer to `jobocate.job.events` | `GET /api/v1/jobs` (paged), `GET /api/v1/jobs/{id}`, `POST /api/v1/jobs` | yes | declared, none written |
| application-service | yes | yes | `V1__applications.sql` | producer to `jobocate.application.events` | `GET /api/v1/applications`, `POST /api/v1/applications` | yes | none |
| tenant-auth-service | yes | — | — | — | `POST /api/auth/demo-token` | no (issuer) | none |
| admin-service | yes | — | — | — | `GET /api/v1/admin/summary` (stub) | yes | none |
| notification-service | yes | — | — | consumer of job + application topics (logs only) | — | no | none |
| search-orchestrator-service | yes | — | — | consumer of job topic; outbound `POST /internal/v1/index/jobs` to gateway with `X-Internal-Token` | — | no | none |

### Critical gaps versus PRD and best practice
- **No transactional outbox.** `KafkaJobEventPublisher` and `ApplicationEventPublisher` send directly inside the JPA transaction — if Kafka is down, the row is still saved with no event.
- **No DTO/Mapper layer.** Controllers use inline `record` types. No MapStruct (declared in `libs.versions.toml` but unreferenced).
- **No tests of any kind under `src/test/java`** in any Java module. `job-service` declares Testcontainers deps but has no test files.
- **Method-level RBAC is not configured.** No `@PreAuthorize`, no role grants in JWT.
- **No OpenAPI generation in services** (no `springdoc` dependency wired).
- **Two services skip `platform-starter`** (`tenant-auth-service` for legitimate reasons; `notification-service` and `search-orchestrator-service` because they have no inbound HTTP that needs tenancy yet).

## 3. Go services

### search-gateway (substantive)
- `chi` router; signal-aware shutdown; `LOG_LEVEL` for slog.
- `GET /healthz`, `POST /v1/search/jobs` (requires `X-Jobocate-Tenant-Id`), `POST /internal/v1/index/jobs` (requires `X-Internal-Token`).
- OpenSearch index `JOB_SEARCH_INDEX` (default `jobocate-jobs`) with `index.knn: true`, `title_vector` knn_vector dim 128, text/keyword fields. Mapping is created/updated on startup.
- `buildJobsSearchBody`: bool query with mandatory tenant term filter, optional `multi_match` on `title^3`/`description`, optional `knn` on `title_vector` (when len==128), terms aggs on `employment_type` and `remote_policy`, highlight on title/description.
- One unit test (`search_body_test.go`) for query building.
- **Gaps:** no OpenSearch auth, internal token is a static shared secret, no batch index endpoint, no integration test against an OpenSearch container.

### Other Go services
- `autocomplete-service`: reads from pre-populated Redis sorted set `ac:jobs:{tenant}:{lower(q)}`. **No writer/indexer for those keys exists yet.**
- `resume-ingestion-service`: trusts `s3_key` provided in body, emits `RESUME_UPLOADED` event. Does not touch S3.
- `analytics-event-collector`: thin HTTP→Kafka forwarder, no schema validation.
- `index-builder-service`: consumes and commits Kafka messages but performs no indexing work.
- `reindex-tool`: flag parsing only, prints placeholder.

## 4. Python workers

Both workers share the same shape: kafka-python consumer + producer loop, JSON payloads, deterministic stub processing.

- `resume-parser-worker`: consumes `jobocate.resume.raw` group `jobocate-resume-parser`, emits `RESUME_PARSED` to `jobocate.resume.parsed`. **Does not read S3.** "Parsing" is filename → headline guess + a fixed summary string.
- `embedding-worker`: consumes `jobocate.embedding.request`, emits `EMBEDDING_READY` to `jobocate.embedding.ready` with a SHA256-seeded 128-dim `pseudo-dev` vector. **No real model call.**

Neither worker has tests, despite `pytest` being declared as a dev dep.

## 5. Next.js apps

| App | Routes implemented | Auth | Data |
|-----|-------------------|------|------|
| job-portal-web | `/` (rich landing — many `href="#"` links), `/jobs` (real SERP via BFF), `/jobs/[id]` (real fetch via api-sdk), `POST /api/search/jobs` (BFF proxy to gateway) | none | tenant from env `PORTAL_SEARCH_TENANT_ID`; gateway URL from env `SEARCH_GATEWAY_URL`. |
| ats-recruiter-web | `/` only (static stub) | none | none |
| admin-console-web | `/` only (static stub) | none | none |

- TanStack Query is **not** installed in any app.
- `next-auth` is **not** installed; `AUTH_SECRET` is documented in `.env.example` but unused in code.
- `@jobocate/ui` exports only `Button` + `cn`. Each app re-implements its own layout markup.
- `job-portal-web/components.json` exists (shadcn config) but no `src/components/ui/` is generated; the SERP and detail pages use plain Tailwind HTML.

## 6. Shared contracts

- `packages/shared-contracts/openapi/recruiter-search-gateway.yaml` — OpenAPI 3.1, `POST /v1/search/jobs`, full request/response schema. Authoritative.
- `packages/shared-contracts/schemas/job-index-document.schema.json` — draft 2020-12, fields aligned to gateway mapping. Authoritative.
- `packages/shared-contracts/kafka/topics.yaml` — canonical topic and consumer-group names.
- **No** OpenAPI YAMLs for any of the Java services.
- **No** JSON Schema for the candidate index document.
- **No** Avro/Protobuf or Schema Registry; events are ad-hoc JSON over String values.

## 7. Infra and tooling

- **docker-compose.yml** brings up Postgres 16, Redis 7, Redpanda (Kafka API on 19092), OpenSearch 2.17.1, MinIO + bucket init, OTel collector, Jaeger. Project name `jobocate-local`.
- **No CI/CD config** in repo (`.github/`, `.gitlab-ci.yml`, `Jenkinsfile` all absent).
- **No Helm or Kubernetes manifests.** Terraform under `infra/terraform/` has stub modules for network/data/search/storage.
- **Gradle wrapper** is not committed; root README instructs `gradle wrapper --gradle-version 8.14`.
- **pnpm 9.15.0**, Node ≥ 20.10.0, Turbo for orchestration.

## 8. Identity, JWT, and tenancy

- **Issuer:** `tenant-auth-service` mints HS256 tokens with claims `tenant_id`, `sub`, issuer `jobocate-tenant-auth`, 1h expiry. Shared secret `JOBOCATE_JWT_SECRET` (HS256). **No roles claim today.**
- **Validator:** every Spring service that includes `platform-starter` validates the token via `TenantIdentityFilter` and pulls `tenant_id` into `TenantContext`.
- **Dev escape hatch:** `JOBOCATE_ALLOW_HEADER_TENANT=true` enables `X-Jobocate-Tenant-Id` header for local curl/testing.
- **Cross-service identity propagation:** `search-orchestrator-service` calls the gateway with a static `X-Internal-Token`, not a propagated user JWT — fine for service-to-service but should be revisited.

## 9. Open issues to track

| # | Issue | Where to address |
|---|-------|------------------|
| 1 | No transactional outbox; Kafka send is best-effort inline | `04-workflows/`, `02-architecture/backend-modular-architecture.md` |
| 2 | No tests anywhere in Java/Python; one Go unit test only | `16-devops/testing-strategy.md` |
| 3 | RBAC not enforced (`permitAll()` everywhere) | `08-security/security-baseline.md`, `08-security/rbac-permissions-matrix.md` |
| 4 | Candidate index document schema does not exist | `06-search-engine/`, `packages/shared-contracts/schemas/` |
| 5 | Resume upload is fake (worker doesn't read S3) | `04-workflows/`, `07-ai-platform/` |
| 6 | Notification service does nothing yet | `13-notifications/` |
| 7 | No CI/CD | `16-devops/` |
| 8 | No real auth/SSO | `08-security/`, `09-multi-tenancy/` |
