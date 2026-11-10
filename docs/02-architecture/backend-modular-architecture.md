# Backend modular architecture (Spring Boot)

> **Document type:** Architecture spec for the Java backend.
> **Audience:** Backend engineers writing Spring Boot modules.
> **Stack:** Java 21, Spring Boot 4.0.x, Spring Data JPA, Spring Security, Spring Kafka, PostgreSQL 16, Flyway, JJWT.
> **Pairs with:** [`audit-as-is.md`](./audit-as-is.md), [`03-domain-model/`](../03-domain-model/), [`08-security/security-baseline.md`](../08-security/security-baseline.md), [`09-multi-tenancy/`](../09-multi-tenancy/).
> **Note on Spring Boot version:** the PRD specifies 3.x; this repo runs on 4.0.4. We document and target 4.x.

## 1. Modular monolith philosophy

For MVP we run a **modular monolith** at the team level: each module is a Gradle subproject under `services-java/` with strict package boundaries; modules deploy as separate Spring Boot applications today (one JVM per module) but could collapse into a single JVM later if operational simplicity wins. The distinction between "module" and "service" is fuzzy by design — code is organized as if everything could be split, but split only when measurement says so.

**Rules:**
1. **One responsibility per module.** A module owns a small set of aggregates (see [`03-domain-model/domain-model.md`](../03-domain-model/domain-model.md) §2).
2. **No cross-module Java imports.** Cross-module communication is REST (synchronous) or Kafka (asynchronous). Even in a shared monolith deployment, modules treat each other as remote.
3. **Each module owns its tables and writes them only.** Cross-module reads are permitted in MVP via REST or shared Postgres queries; cross-module writes are forbidden.
4. **Shared concerns live in `platform-starter`** (already a library): tenancy, JWT validation, audit writer, error envelope.
5. **Contracts live in `packages/shared-contracts`** (OpenAPI YAML, JSON Schema, Kafka topic names) — the JVM does not import these directly; they are generated into TS for clients and into Java for tests as needed.

## 2. Modules

| # | Module (Gradle path) | Owns | Status (today) |
|---|---|---|---|
| 1 | `services-java:platform-starter` | shared library: TenantIdentityFilter, TenantContext, future AuditWriter, ErrorAdvice, OpenAPI starter | exists |
| 2 | `services-java:tenant-auth-service` | users, role grants, sessions, JWT issuance | exists (demo issuer only) |
| 3 | `services-java:ats-core-service` | tenants, organizations | exists (read-only on tenants) |
| 4 | `services-java:candidate-service` | candidate profiles, resumes (metadata), work/edu/cert, consents, saved searches | exists (list only) |
| 5 | `services-java:job-service` | jobs, job skills, screening questions, hiring team | exists (CRUD lite) |
| 6 | `services-java:application-service` | applications, timeline, notes, tags, ratings, pipelines, stages, AI artifacts | exists (create + list) |
| 7 | `services-java:notification-service` | notifications, preferences | exists (stub consumer) |
| 8 | `services-java:search-orchestrator-service` | Kafka → search-gateway projector | exists (job projector only) |
| 9 | `services-java:admin-service` | cross-tenant admin, feature flags, prompt registry, audit query | exists (stub) |
| 10 | `services-java:audit-service` | append-only audit table writer/reader | **new** |
| 11 | `services-java:billing-service` (post-MVP) | subscriptions, invoices, usage records, Stripe webhooks | **new** |
| 12 | `services-java:interview-service` (post-MVP, optional) | interviews, feedback (extracted from application-service if needed) | optional |
| 13 | `services-java:offer-service` (post-MVP, optional) | offers, approvals, documents | optional |

For MVP, sticking with the existing 9 modules + new `audit-service` is enough. Interview and Offer can live inside `application-service` as packages until volume warrants extraction.

## 3. Per-module package layout

The package convention for each module is:

```
com.jobocate.<module>
├── api                  // REST controllers (thin)
│   ├── dto              // request/response records
│   ├── mapper           // record ↔ domain mappers (no MapStruct yet)
│   └── advice           // @ControllerAdvice for error envelope
├── application          // use-case services (orchestrate domain + ports)
│   ├── command          // command handlers (write side)
│   └── query            // query handlers (read side)
├── domain
│   ├── model            // value objects, aggregates (POJOs / records)
│   └── ports            // interfaces (repositories, event publishers)
├── infrastructure
│   ├── persistence      // JPA entities + repository adapters
│   ├── events           // Kafka producer (outbox publisher) + consumers
│   ├── outbox           // outbox table mapping + publisher loop
│   ├── http             // REST clients to other services / gateway
│   └── config           // SecurityConfig, KafkaConfig, RestClientsConfig
└── <ModuleName>Application.java
```

**Inspirations:** the existing `job-service` already follows this hexagonal layout (`domain.model`, `domain.ports`, `infrastructure.persistence` with `JpaJobRepositoryAdapter`). Use it as the template for new modules.

**Dependency direction:**
- `api` may depend on `application`.
- `application` may depend on `domain`.
- `infrastructure` depends on `domain` (implements ports) and is wired into `application` via Spring DI.
- `domain` depends on **nothing** (pure Java, easily unit-tested).

ArchUnit (post-MVP) enforces these rules in CI. For now, code review.

## 4. Per-module responsibilities

### 4.1 `platform-starter` (shared library)
- **Provides:**
  - `TenantIdentityFilter` (existing): JWT validation + dev-header tenant resolution → `TenantContext`.
  - `TenantContext` (existing): per-request tenant id holder.
  - `AuditWriter` (new): synchronous audit row writer used by every module.
  - `ErrorEnvelope` advice (new): `@ControllerAdvice` that converts exceptions to canonical `{ "error": {...} }`.
  - `IdempotencyService` (new): per-tenant `(idempotency_key) → response_hash` Redis-backed dedupe.
  - `OutboxRowWriter` (new): convenience to insert into the per-module outbox table inside the same TX.
  - `RoleGrantsFilter` (new): extracts `roles` claim, sets Spring Security authorities.
- **Does not** provide JPA entities or controllers — pure infrastructure.

### 4.2 `tenant-auth-service`
- **REST API:** `/api/auth/...` per [`05-api-contracts/api-contract-plan.md`](../05-api-contracts/api-contract-plan.md) §3.1.
- **Owns DB tables:** `users`, `user_roles`, `password_reset_tokens`, `email_verification_tokens`, `refresh_tokens`.
- **Issues JWTs** with claims `sub`, `tenant_id`, `roles[]`, `iat`, `exp`, `iss`. Uses HS256 for MVP (shared secret); RS256 + JWKS post-MVP.
- **Emits events:** `user.created`, `user.invited`, `user.activated`, `user.role_granted`, `user.role_revoked`, `user.password_changed`, `user.suspended`.
- **Does not depend on** `platform-starter`'s `TenantIdentityFilter` for issuance endpoints (`/api/auth/*`); does depend on it for `/api/v1/users/*` admin endpoints.

### 4.3 `ats-core-service`
- **REST API:** `/api/v1/tenants/...` and `/api/v1/organizations/...`.
- **Owns DB tables:** `tenants`, `organizations`.
- **Emits events:** `tenant.created`, `tenant.updated`, `tenant.suspended`, `tenant.deleted`.
- **Read API used by** all other modules to look up tenant info (cached locally in Redis with TTL).

### 4.4 `candidate-service`
- **REST API:** `/api/v1/me/profile`, `/api/v1/me/work-experiences`, ... and `/api/v1/candidates/...` (recruiter side).
- **Owns DB tables:** `candidate_profiles`, `candidate_work_experiences`, `candidate_educations`, `candidate_certifications`, `resumes`, `resume_variants`, `consent_records`, `saved_searches`, `alert_subscriptions`.
- **Emits events:** `candidate.profile_changed`, `candidate.consent_changed`, `resume.uploaded` (also emitted by ingestion service depending on path), `resume.parsed_applied` (when candidate accepts parser-extracted fields), `saved_search.alert_due` (scheduler).
- **Consumes events:** `resume.parsed` (apply fields).

### 4.5 `job-service`
- **REST API:** `/api/v1/jobs/...` (recruiter) and `/api/v1/jobs/public/...`.
- **Owns DB tables:** `jobs`, `job_skills`, `screening_questions`, `hiring_team_members`, `event_outbox`.
- **Emits events:** `job.created`, `job.updated`, `job.published`, `job.unpublished`, `job.closed`, `job.archived`.
- **Existing kafka producer** to be replaced with outbox-driven publisher.

### 4.6 `application-service`
- **REST API:** `/api/v1/applications/...`, `/api/v1/jobs/{id}/applications`, `/api/v1/pipelines/...`, `/api/v1/applications/{id}/notes/...`, `/api/v1/ai-artifacts/...`, plus interview/offer subresources for MVP-lite (later moved out).
- **Owns DB tables:** `applications`, `application_timeline_entries`, `application_notes`, `application_tags`, `application_ratings`, `pipelines`, `pipeline_stages`, `ai_artifacts`, `event_outbox`. Future: `interviews`, `interview_feedback`, `offers`, `offer_approvals`, `offer_documents`.
- **Implements** the application state machine ([`04-workflows/application-state-machine.md`](../04-workflows/application-state-machine.md)).
- **Emits events:** `application.submitted`, `application.stage_changed`, `application.rejected`, `application.withdrawn`, `application.note_added`, `application.tagged`, plus interview/offer events.
- **Consumes events:** `job.closed` (to trigger `EXPIRED` cascade), `embedding.ready` (for AI artifacts).

### 4.7 `notification-service`
- **REST API:** `/api/v1/notifications/...`, `/api/v1/me/notification-preferences`.
- **Owns DB tables:** `notifications`, `notification_preferences`.
- **Consumes events:** all events that drive notifications (`application.*`, `interview.*`, `offer.*`, `user.*`, etc.).
- **Provider abstraction:** `EmailProvider` interface with adapters `SesAdapter`, `SendGridAdapter`. Default to a `LogOnlyEmailProvider` in dev.

### 4.8 `search-orchestrator-service`
- **No REST API exposed to clients.** Only outbound HTTP to `search-gateway`.
- **Owns DB tables:** none (read-only consumer).
- **Consumes events:** `job.*`, `candidate.*`, `resume.parsed`, `embedding.ready`. Builds index documents and posts to gateway `/internal/v1/index/...`.
- **Resilience:** retry with exponential backoff; DLQ to `jobocate.search.dlq` on persistent failure.

### 4.9 `admin-service`
- **REST API:** `/api/v1/admin/...` per the API plan §3.15.
- **Owns DB tables:** `feature_flags`, `tenant_feature_overrides`, `prompts`, `moderation_queue` (or these can live in `audit-service` / a dedicated `governance-service`).
- **Reads from** `audit-service` (audit log queries), `ats-core-service` (tenants), `tenant-auth-service` (users).
- **Emits events:** `admin.feature_flag_changed`, `admin.prompt_promoted`, `admin.tenant_suspended` (mirror), etc.

### 4.10 `audit-service` (new)
- **Owns DB table:** `audit_events` (the partitioned append-only table).
- **REST API:** `/api/v1/admin/audit-events` (read), used by admin-service via REST.
- **Receives writes** through `platform-starter`'s `AuditWriter` (which calls a thin internal endpoint or writes directly via a shared connection — design choice; MVP recommendation: writes go directly to the table from each service's connection, so no inter-service hop is needed for the audit row, and `audit-service` owns reads only).

### 4.11 `billing-service` (post-MVP)
- **REST API:** `/api/v1/billing/...` and `/internal/v1/billing/stripe-webhook`.
- **Owns DB tables:** `subscription_plans` (global), `tenant_subscriptions`, `invoices`, `usage_records`.
- **Stripe integration:** webhook handling with idempotent processing keyed on `stripe_event_id`.
- **Emits events:** `subscription.*`, `invoice.*`, `usage.recorded`.
- **Enforces** plan entitlements via a separate enforcement library that other services import to check (`EntitlementsClient.canCreateJob(tenant)`).

## 5. Cross-cutting concerns

### 5.1 Tenant resolution
- `TenantIdentityFilter` (existing) sits **before** `AnonymousAuthenticationFilter` in every Spring Security chain.
- Tenant id flows from JWT claim `tenant_id` → `TenantContext` → repository / service layers.
- `tenant-auth-service` is the only module that **does not** require a tenant on its issuance endpoints; admin endpoints inside it do.

### 5.2 Authorization
- `RoleGrantsFilter` (new in `platform-starter`) extracts `roles` claim and seeds `Authentication`.
- Method-level checks via `@PreAuthorize`. SpEL expressions defined in the RBAC matrix.
- Aggregate-scoped checks (H, O) via per-aggregate authz services (`JobAuthz.canManage(jobId)`).

### 5.3 Outbox pattern
- Each module that emits Kafka events has its own `event_outbox` table (per [`03-domain-model/database-design.md`](../03-domain-model/database-design.md) §4.9).
- Domain writes and outbox row writes happen in the same DB transaction.
- An in-process scheduled task (`OutboxPublisherJob`) runs every 250ms, reads up to N PENDING rows, publishes to Kafka, marks PUBLISHED. Uses SKIP LOCKED to scale across replicas.
- Failed sends bump `attempt_count` and set `next_attempt_at` with exponential backoff; rows past max attempts go to a parking state for ops review.

### 5.4 Idempotency
- `IdempotencyService` (`platform-starter`) wraps endpoint handlers that require/accept `Idempotency-Key`.
- Storage: Redis with key `idempotency:{tenant_id}:{endpoint}:{key}` → `{request_hash, response_status, response_body, expires_at}`. TTL 24h.
- Hash includes the relevant body fields (excludes timestamps and request IDs).

### 5.5 Audit
- Every controller advice / use-case service wraps mutations to call `AuditWriter.write(auditEvent)` in the same transaction.
- For high-volume read auditing (`RESUME_ACCESSED`), use a dedicated lightweight write path (still synchronous DB but uses a connection from a pool sized for that workload).

### 5.6 Error envelope
- `@RestControllerAdvice` in `platform-starter` converts `Exception → { "error": {...} }`.
- Domain exceptions extend `ApiException` carrying `code`, `httpStatus`, `details`.

### 5.7 Validation
- Jakarta Bean Validation on DTOs (`@NotNull`, `@Size`, `@Pattern`).
- Cross-field validation uses `@ConstraintValidator` on the DTO record class.

### 5.8 Observability
- OpenTelemetry auto-instrumentation via `opentelemetry-spring-boot-starter` (already in `libs.versions.toml`).
- Structured logging: `logback-spring.xml` configured with JSON encoder; MDC fields `tenant_id`, `correlation_id`, `request_id`, `user_id`.
- Prometheus via Micrometer (`micrometer-registry-prometheus`, already in catalog).
- Each Kafka consumer registers a Micrometer gauge for consumer lag.

### 5.9 Internationalization
- Error messages externalized to `messages.properties`; locale resolved from `Accept-Language`.

## 6. REST client patterns

- Use Spring's `RestClient` (Boot 3.2+; Boot 4 default) for service-to-service HTTP.
- Each `RestClient` is configured per target with: base URL, `OAuth2` filter (post-MVP) or `X-Internal-Token` (MVP), retry interceptor, OTel header propagation.
- Centralize in `infrastructure.config.RestClientsConfig` — no `RestTemplate` ad-hoc usage.

## 7. Kafka patterns

- **Topics:** declared in `packages/shared-contracts/kafka/topics.yaml`. Each module imports the names from a generated Java constant (or hand-keeps them in sync — generation is post-MVP).
- **Keying:** by `tenant_id` (string) for fairness across tenants and partition affinity within a tenant.
- **Headers:** `event_id`, `event_type`, `tenant_id`, `correlation_id`, `producer_service`, `producer_version`.
- **Schema:** JSON body matching event-type-specific schemas (Avro/Protobuf is post-MVP; for now JSON with versioned `event_type`).
- **Consumer idempotency:** every consumer dedupes on `event_id` using a small consumed_event_ids table (per consumer module) or Redis SETNX with TTL.

## 8. Security boundaries

| Boundary | Mechanism |
|----|----|
| Browser ↔ Next.js apps | TLS, NextAuth (post-MVP) or hand-rolled session, cookies for session, bearer for downstream APIs. |
| Next.js BFF ↔ Spring services | bearer JWT (forwarded). |
| Service ↔ Service (sync HTTP) | bearer JWT (forwarded user identity), or for service-only calls, signed service token. |
| Service ↔ search-gateway | `X-Internal-Token` (MVP) → mTLS or service JWT (post-MVP). |
| Service ↔ Kafka | Local: plaintext. Cloud: SASL_SSL + ACLs per service. |
| Service ↔ Postgres | TLS-required in cloud; per-service DB user with table-scoped GRANTs. |
| Service ↔ S3 | IAM role per service; objects encrypted at rest (SSE-S3 or KMS). |

## 9. Repository patterns

- Use **Spring Data JPA** repositories as the persistence adapter.
- Hexagonal split: `domain.ports.SomethingRepository` (interface) + `infrastructure.persistence.JpaSomethingRepositoryAdapter` (implements port using Spring Data interface). Existing `job-service` is the template.
- Avoid lazy associations on aggregate roots; prefer explicit FK ids or repository lookups. Keep entity graphs small.
- Use **specifications** or **explicit query methods** for filtered lists; never build dynamic SQL from request strings.
- Always include `tenant_id` in WHERE clauses; provide a `TenantScopedRepository` mixin (post-MVP) to enforce by interface.

## 10. Request flow (representative)

`POST /api/v1/applications` (candidate apply):

```
HTTP request
  ↓ TenantIdentityFilter (validates JWT, sets TenantContext)
  ↓ RoleGrantsFilter (extracts roles, sets Authentication)
  ↓ Spring Security @PreAuthorize("hasRole('CANDIDATE')")
  ↓ ApplicationController.apply(dto, idemKey, ifMatch)
  ↓ IdempotencyService.executeOnce(tenant, key, hash, () -> ...)
  ↓ ApplicationService.apply(command) [transactional]
       ├─ verify Job is PUBLISHED via JobLookupClient (cached)
       ├─ verify candidate identity vs principal
       ├─ check duplicate via partial unique
       ├─ persist Application + ApplicationTimelineEntry + AuditEvent + OutboxRow (same TX)
       └─ return Application
  ↓ ApplicationMapper.toDto
  ↓ HTTP 201 { ETag, Location, body }

Async:
  OutboxPublisherJob → Kafka jobocate.application.events
  notification-service consumes → emails candidate
  search-orchestrator consumes → upserts application-index (post-MVP)
```

## 11. Build and run

- Each module is a Spring Boot app with its own port:

| Module | Port |
|--------|------|
| ats-core-service | 8081 |
| job-service | 8082 |
| candidate-service | 8083 |
| application-service | 8084 |
| admin-service | 8085 |
| notification-service | 8086 |
| search-orchestrator-service | 8087 |
| audit-service | 8088 |
| billing-service | 8089 |
| tenant-auth-service | 8090 |

- `./gradlew :services-java:<module>:bootRun`
- Local DB: shared `jobocate` DB; each module writes its own tables (per Flyway history).
- Local Kafka: Redpanda on `localhost:19092`.
- Local Redis: `localhost:6379`.

## 12. Testing

- **Unit tests:** pure JUnit 5 on `domain` and `application`. No Spring context.
- **Slice tests:** `@WebMvcTest` for controllers (with mocked services), `@DataJpaTest` for repositories using Testcontainers Postgres.
- **Integration tests:** `@SpringBootTest` per module with Testcontainers Postgres + Redpanda; one happy-path + one wrong-tenant per write API.
- **Contract tests** against `shared-contracts` OpenAPI YAMLs (post-MVP).

See [`16-devops/testing-strategy.md`](../16-devops/testing-strategy.md).

## 13. Avoiding circular dependencies

- A module **never** depends on another module's Spring Data interface or JPA entity.
- Cross-module reads use REST clients in `infrastructure.http` of the calling module.
- A small read-only "lookup" adapter (e.g., `JobLookupClient`) hides the call.
- Fast paths may use Redis-cached read models populated by event consumers.

## 14. As-is gaps to close

| # | Gap | Closing prompt |
|---|---|---|
| 1 | No outbox in any module | 15, 16, 18 |
| 2 | No DTO/mapper layer (controllers use inline records) | 13 entities + 15/16 services tighten this |
| 3 | No method-level RBAC | 24 security baseline |
| 4 | No tests anywhere | 27 testing strategy + per-service prompts |
| 5 | `application-service` emits `APPLICATION_SUBMITTED` literal; canonical name is `application.submitted` | 15 |
| 6 | `application-service` defaults status to `SUBMITTED` (non-canonical) | 15 — normalize to `APPLIED` |
| 7 | No audit writes from any module | 24 / cross-cutting |
| 8 | `notification-service` consumer is log-only | 22 |
| 9 | `admin-service` returns a stub | 18 admin work + later prompts |
| 10 | `tenant-auth-service` issues no roles claim | 24 |

## 15. Future module splits

When (and only when) measurement says so:
- `application-service` → split off `interview-service` and `offer-service` once they have meaningful read paths.
- `candidate-service` → split off `resume-service` if upload throughput becomes a hot path.
- `audit-service` may host `governance-service` (moderation queue, prompt registry) initially before that grows.
