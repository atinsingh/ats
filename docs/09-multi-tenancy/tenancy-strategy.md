# Tenancy strategy

End-to-end story for how Jobocate enforces tenant isolation across every
boundary. The implementation lives across `platform-starter` (filters,
context), every Java service's repositories + services, the Go
search-gateway, the Python workers, and the contracts package.

## 1. Tenant resolution

The active tenant for any inbound HTTP request is resolved exactly once,
by `TenantIdentityFilter`, in this priority:

1. `Authorization: Bearer <jwt>` → the verified `tenant_id` claim.
2. *(dev only, gated by `jobocate.security.allow-dev-tenant-header=true`)*
   `X-Jobocate-Tenant-Id` header. Production environments must set
   `JOBOCATE_ALLOW_HEADER_TENANT=false`.

The resolved tenant is stored on:

* `TenantContext` (a request-scoped ThreadLocal) — read with
  `TenantContext.requireTenant()` from any service / repository helper.
* `JobocateAuthentication.tenantId()` — accessed when Spring Security
  context is the right place (e.g. `@PreAuthorize` SpEL).
* SLF4J MDC under the `tenantId` key (populated by `RequestLoggingFilter`)
  so every log line for the request automatically carries it.

`/internal/v1/**` requests authenticate via `InternalTokenFilter`. The
tenant **must** be supplied explicitly by the calling service via
`X-Jobocate-Tenant-Id`; the internal principal does not carry one.

### Tenant attribution rules

| Surface | Rule |
|---|---|
| HTTP request | Resolved by filter; never read from request body / path. |
| JPA insert | Service must set `entity.setTenantId(TenantContext.requireTenant())` before `save()`. |
| JPA read | Repository method must include `tenantId` in WHERE clause. Cross-tenant lookup returns 404, not 403, to avoid existence leaks. |
| Kafka publish | `payload.tenant_id` is a required field on every domain event. The producer copies it from the aggregate. |
| Kafka consume | Consumer reads `payload.tenant_id` and must use it for any subsequent reads or writes. The consumer never trusts in-flight `TenantContext` for Kafka-driven work — it sets its own using the payload field. |
| OpenSearch index | Document must include `tenant_id`. Search queries always include `term: { tenant_id }`. |
| Search-gateway | Reads tenant from `X-Jobocate-Tenant-Id` (or future JWT) and adds the filter clause server-side. |
| S3 object key | Always prefixed with `tenants/{tenant_id}/...` (resumes, AI artifact outputs, attachments). |
| Logs | `tenantId` MDC field is included by every log line — see `RequestLoggingFilter`. |
| Audit events | `audit_events.tenant_id` is required for every row. |

## 2. Database

* Every tenant-scoped table has `tenant_id UUID NOT NULL` (or `NULL` for
  intentionally tenant-agnostic rows like the global `users` table).
* Tenant-scoped tables have an index on `(tenant_id, ...)`. The exact key
  depends on access patterns; common ones include `(tenant_id, status, created_at DESC)`.
* Soft-delete columns are not used to bypass tenant filters — `deleted_at`
  is layered on top of, not instead of, the tenant filter.
* Composite uniqueness constraints include `tenant_id` so two tenants can
  reuse the same business key (e.g. `unique (tenant_id, slug)` on jobs).
* Migrations create per-service `flyway_*_schema_history` tables to keep
  service ownership clear; the consolidated greenfield script lives in
  `infra/sql/greenfield/V1__initial_ats_schema.sql`.

## 3. Search-gateway

* Every `GET /v1/search/jobs` request requires `X-Jobocate-Tenant-Id`. The
  gateway adds `term: { tenant_id }` to the OpenSearch query before any
  caller-supplied filters.
* Documents are bulk-indexed by `search-orchestrator-service` from
  `jobocate.job.events`; the orchestrator copies `tenant_id` from the event
  payload into the document.
* The gateway's `INTERNAL_BULK` endpoints accept tenant + tenant-scoped
  documents only; they reject documents without a `tenant_id`.

## 4. Kafka

Topic-level isolation is **not** used. Instead, every event carries
`tenant_id` in its payload. This keeps the topic count manageable while
still letting consumers fan out per-tenant work or filter at read time.

| Topic | Tenant field on payload |
|---|---|
| `jobocate.application.events` | `tenant_id` (UUID) |
| `jobocate.job.events` | `tenant_id` |
| `jobocate.resume.raw` / `jobocate.resume.parsed` | `tenant_id` |
| `jobocate.notification.events` | `tenant_id` |
| `jobocate.ai.artifact.events` | `tenant_id` |

Producers source `tenant_id` from the aggregate they're describing.
Consumers must validate `tenant_id` is present and use it as the basis
for any further work.

## 5. Caches

When per-tenant Redis caches are added (post-MVP), keys must always be
prefixed with `t:{tenant_id}:`. Cross-tenant reads are impossible by
construction. The convention is documented under
`docs/15-observability/observability-plan.md`.

## 6. Object storage (S3)

* Bucket is shared; isolation is by key prefix.
* Resumes: `tenants/{tenant_id}/candidates/{candidate_id}/resumes/{resume_id}/{filename}`.
* AI artifact outputs: `tenants/{tenant_id}/ai-artifacts/{artifact_id}/{filename}`.
* Pre-signed URLs are scoped to the exact key; they cannot be re-used
  to access another tenant's prefix.

## 7. Logs + observability

* `RequestLoggingFilter` populates MDC with `requestId`, `correlationId`,
  `tenantId`, `userId`. Logback patterns include those fields.
* The canonical error envelope returned by every `@RestControllerAdvice`
  includes `request_id`, `correlation_id`, `path`, `timestamp`. See
  `docs/05-api-contracts/api-contract-plan.md`.
* Metrics tagged with `tenant_id` are intentionally **not** exposed
  globally — high-cardinality tenant tags blow up Prometheus. Per-tenant
  metrics live in the analytics warehouse, not Prometheus.

## 8. Test contract — "tenant A cannot see tenant B"

Every tenant-scoped service must include integration tests covering:

1. **Read isolation**: A row owned by tenant A is invisible to a request
   carrying tenant B's identity (returns 404 / empty list).
2. **Write isolation**: A request from tenant B cannot patch / delete a
   row owned by tenant A (returns 404).
3. **Idempotency-key isolation**: An `Idempotency-Key` previously seen
   under tenant A creates a fresh resource under tenant B.
4. **Search isolation**: Search for tenant B does not return tenant A
   results — verified at the gateway level using `term: { tenant_id }`.
5. **Event isolation**: Kafka consumers reject events whose payload
   `tenant_id` doesn't match the aggregate they're updating.

Concrete test fixtures already covering this:

| Service | Test | What it proves |
|---|---|---|
| `application-service` | `ApplicationServiceTest.crossTenantReadIsBlocked()` | Cross-tenant get returns 404 (`APPLICATION_NOT_FOUND`). |
| `application-service` | `ApplicationControllerTest.getReturns404ForOtherTenant` | End-to-end MockMvc cross-tenant GET → 404 + canonical error envelope. |
| `application-service` | `AiArtifactServiceTest.crossTenantLookupReturnsNotFound` | AI artifact cross-tenant get returns 404 (`AI_ARTIFACT_NOT_FOUND`). |
| `job-service` | `JobControllerTest.getReturns404ForOtherTenant` | End-to-end MockMvc cross-tenant GET → 404 + canonical envelope. |
| `platform-starter` | `TenantIdentityFilterTest.rejectsRequestWithoutTokenWhenDevHeaderDisabled` | No tenant → 401, never silent skip. |
| Go `search-gateway` | `searchHandlerTests` (gateway-side) | Tenant filter is added regardless of caller filters. |

## 9. When tenancy is intentionally absent

Some surfaces are tenant-agnostic by design:

| Surface | Reason |
|---|---|
| `users` table (`tenant_auth-service`) | A user can belong to multiple tenants via `user_roles`. The `users` row itself is global. |
| `tenants` table (`ats-core-service`) | Self-referential; the row IS the tenant. |
| `audit_events` for super-admin actions | Tenant column is nullable; super-admin actions are tenant-agnostic. |
| `/api/auth/**` | Login / refresh; tenant is established by the response, not the request. |
| `/actuator/**` | Operational endpoints. |

These exceptions are documented per-table in
`docs/03-domain-model/database-design.md` and per-route in the
respective service's `SecurityConfig`.

## 10. Tenant suspension

* `tenant_status` ∈ {`ACTIVE`, `SUSPENDED`, `DELETED`} on the `tenants`
  table. The platform's identity filter would (post-MVP) refuse to mint
  JWTs for suspended tenants and drop bearer tokens on the next refresh.
* Recruiter writes are blocked for `SUSPENDED` tenants but reads are
  preserved for billing dispute resolution.
* `DELETED` tenants follow the data-retention policy in
  `docs/17-compliance/`.
