# Coding standards

Strict-but-practical conventions for the Jobocate monorepo. For
Next.js UI patterns (layouts, accessibility, component structure),
also read [`ui-coding-standards.md`](./ui-coding-standards.md).

## 1. Cross-cutting rules

- **Tenant ID never from the request body** for tenant-scoped
  resources. It comes from JWT (`tenant_id` claim) or, in dev only,
  from `X-Jobocate-Tenant-Id` when `jobocate.security.allow-dev-tenant-header=true`.
- **Cross-tenant access returns 404** (not 403) for existence-sensitive
  reads so another tenant’s IDs are not leaked.
- **Idempotency** for critical writes: honor `Idempotency-Key` where
  documented; dedupe keys are scoped per tenant.
- **Internal APIs** live under `/internal/v1/**` and require
  `Authorization: Bearer <JOBOCATE_INTERNAL_TOKEN>`. Never expose
  internal routes to browsers.
- **Contracts first**: change OpenAPI / JSON Schema / Kafka payload
  shapes before or alongside code; CI must lint specs.
- **No secrets in git**: use `.env.example` only; real values in env
  or secret managers.

## 2. Java (Spring Boot 4.x, Java 21)

### 2.1 Layout and packages

- Package by feature under `com.jobocate.<service>.<layer>`:
  `api`, `application`, `domain`, `infrastructure`.
- Controllers are thin: validate input, map DTOs, delegate to
  application services.
- Application services own transactions (`@Transactional`), enforce
  tenant via `TenantContext.requireTenant()`, and emit outbox rows in
  the same transaction as domain mutations.
- Entities live in `infrastructure.persistence`; no Hibernate types in
  `api` DTOs.

### 2.2 Style

- Use **records** for immutable DTOs and command objects.
- Prefer `Optional` only as return types from repositories, not as
  fields.
- `final` for fields and method parameters where not reassigned.
- No wildcard imports; one static import per line for test helpers.
- Line length soft limit **120**; wrap before that for readability.

### 2.3 Spring conventions

- Constructor injection only; no `@Autowired` on fields.
- `@ConfigurationProperties` for externalized config; prefix
  `jobocate.*`.
- Use `@RetryableTopic` + `@DltHandler` on Kafka listeners that must
  not lose messages silently.
- Scheduled outbox publishers: bounded batch size, exponential backoff
  on send failure, never infinite tight loops.

### 2.4 Persistence

- Every tenant-scoped entity has `tenantId` set on insert from
  `TenantContext`, never from the client.
- Repository queries **always** include `tenantId` in `WHERE` for
  tenant-scoped tables.
- Use `@Version` for aggregates that support concurrent updates.
- Flyway: one logical change per migration file; never edit applied
  migrations; use additive `V{n+1}__*.sql`.

### 2.5 API layer

- REST paths: `/api/v1/...` for public/tenant APIs;
  `/internal/v1/...` for workers and orchestrators.
- Use `@Valid` on request bodies; return **400** with field-level
  errors in the canonical envelope.
- Standard error envelope: `request_id`, `correlation_id`, `path`,
  `timestamp`, `error.code`, `error.message` (see existing
  `*RestExceptionHandler` classes).

### 2.6 Security

- Each service’s `SecurityConfig` calls
  `JobocateSecuritySupport.applyDefaults()` then declares URL rules.
- Use `@PreAuthorize` for fine-grained rules that are awkward in URL
  matchers.
- Never log JWTs, internal tokens, or full `Authorization` headers.

### 2.7 Tools

- Spotless (or project formatter) + Checkstyle where configured.
- SpotBugs / ErrorProne on CI for changed modules.
- JaCoCo: meet coverage targets in [`testing-strategy.md`](./testing-strategy.md).

## 3. Go (`services-go/*`)

### 3.1 Layout

- `cmd/<binary>/main.go` — wiring only.
- `internal/` — application code not importable by other modules.
- Handlers stay thin; business logic in small packages (`internal/search`, …).

### 3.2 Style

- `gofmt` / `goimports` mandatory; `golangci-lint` clean on PR.
- Errors: wrap with `%w` for inspection; return typed sentinel errors
  where callers branch.
- Use `context.Context` on all I/O; respect cancellation.
- Structured logging: `slog` JSON handler; **no** `fmt.Printf` in
  production paths.

### 3.3 HTTP

- `chi` router; register middleware in order: request ID → tenant →
  logging → auth (if any) → handler.
- Validate all query parameters; reject unknown filter keys with **400**.
- Never pass raw user input into OpenSearch query DSL without
  escaping / allowlisting.

### 3.4 OpenSearch

- Build queries from typed structs or safe builders; no string
  concatenation of user `q` into JSON.
- Always inject `term: { tenant_id }` for tenant-scoped indices.

## 4. Python (`workers-python/*`)

### 4.1 Layout

- `src/<package>/` as the installable package; `tests/` mirrors module
  structure.
- Lazy-import heavy optional deps (`kafka`, `boto3`) inside `run()` or
  factory functions so unit tests import without the full runtime.

### 4.2 Style

- **Ruff** for lint + format; line length **100**.
- **mypy --strict** on `src/` in CI.
- **Pydantic v2** models for every Kafka payload and HTTP callback body.
- Prefer `orjson` for JSON where performance matters.

### 4.3 Workers

- One consumer loop per process; process messages idempotently using
  stable `event_id` where the platform provides it.
- HTTP callbacks: retries with bounded backoff; never infinite retry
  without DLQ visibility.
- Never log full LLM prompts/responses at INFO in prod.

### 4.4 Tools

- `pytest` + `pytest-cov`; `pip-audit` in CI.

## 5. Next.js / TypeScript (`apps/*`, `packages/*`)

### 5.1 General

- **Strict** `tsconfig`; no `any` without a comment and reviewer
  approval.
- Server Components by default; `"use client"` only when hooks,
  browser APIs, or event handlers require it.
- Data fetching: TanStack Query on the client; `fetch` in RSC with
  explicit caching policy.
- All API calls go through `@jobocate/api-sdk`; no ad-hoc `fetch` URLs
  duplicated across files.

### 5.2 UI

- Follow [`ui-coding-standards.md`](./ui-coding-standards.md): shadcn
  primitives, accessible labels, loading/empty/error states.

### 5.3 Tools

- Prettier + ESLint (`pnpm format`, `pnpm lint`).
- `pnpm -r tsc --noEmit` must pass before merge.

## 6. SQL / Flyway

- **Naming**: `snake_case` tables and columns; plural table names for
  entity sets (`applications`, `jobs`).
- **Keys**: UUID primary keys (`gen_random_uuid()` default).
- **Tenancy**: `tenant_id UUID NOT NULL` on tenant-scoped tables;
  composite unique constraints include `tenant_id`.
- **Timestamps**: `created_at`, `updated_at` with `TIMESTAMPTZ`;
  triggers or `@PreUpdate` for `updated_at`.
- **Soft delete**: `deleted_at TIMESTAMPTZ NULL` only where the PRD
  requires it; never use soft delete to skip tenant filters.
- **Indexes**: every foreign key and every common filter column
  (`tenant_id`, `status`, `created_at DESC`, …).
- **Migrations**: descriptive names `V12__add_notification_idempotency.sql`;
  never modify a migration that has run in any shared environment.

## 7. OpenAPI (`packages/shared-contracts/openapi`)

- OpenAPI **3.1**; reuse components via `_common.yaml` or `$ref`
  fragments.
- Every operation documents: auth scheme, required headers
  (`X-Jobocate-Tenant-Id` where applicable), idempotency, tenant
  isolation behavior.
- Error response references a single shared `Error` schema.
- Pagination: shared `Page`, `PageRequest` components.
- Run **Spectral** locally before PR; breaking changes require label
  `breaking-change` and consumer updates in the same PR.

## 8. JSON Schema (`packages/shared-contracts/schemas`)

- Draft **2020-12**; `$id` stable URLs under the repo’s doc base.
- `required` arrays are explicit; use `additionalProperties: false`
  for closed objects where safe.
- Index documents (`job-index-document`, `candidate-index-document`)
  must include `tenant_id` as required.

## 9. Kafka events

- **Topic naming**: `jobocate.<domain>.<stream>` (e.g.
  `jobocate.job.events`, `jobocate.application.events`).
- **Payload**: JSON with **required** `event_id`, `event_type`,
  `occurred_at`, `tenant_id`, `correlation_id` (when originating from
  HTTP).
- **Versioning**: additive fields only in patch releases; breaking
  changes need a new `event_type` or version field and a consumer
  dual-read window documented in the PR.
- **Producers**: transactional outbox only for domain-originated
  events; no direct `KafkaTemplate.send` inside `@Transactional`
  business methods without outbox.
- **Consumers**: idempotent handlers; use dedupe tables
  (`*_processed_events`) for at-least-once delivery.

## 10. Testing

- Follow [`testing-strategy.md`](./testing-strategy.md).
- Every tenant-scoped change ships or updates a `*CrossTenant*` test.
- Golden fixtures for parsers and search relevance live under
  `packages/shared-contracts/fixtures/` or `tests/fixtures/`.

## 11. Logging

- **Java**: SLF4J; MDC keys `requestId`, `correlationId`, `tenantId`,
  `userId` (see `RequestLoggingFilter` and
  [`observability-plan.md`](../15-observability/observability-plan.md)).
- **Go**: `slog` with the same key names in snake_case or consistent
  camelCase per service (pick one per binary and document it).
- **Python**: JSON logs with matching fields for cross-service grep.
- **Never** log PII, tokens, resume text, or full AI outputs at INFO.

## 12. Error handling

- **Java**: domain exceptions map to HTTP status + stable `error.code`;
  `@RestControllerAdvice` produces the canonical envelope.
- **Go**: `writeError(w, status, code, message)` helper; consistent
  JSON shape across routes.
- **Python**: structured log + non-zero exit on fatal startup; per-
  message errors increment metrics and optionally send to DLQ after
  retries.
- **Frontend**: surface `error.code` to users where actionable;
  otherwise generic message + support `request_id`.

## 13. Security checklist (per PR)

- [ ] No new endpoint without auth rule in `SecurityConfig`.
- [ ] No tenant-scoped read without `tenant_id` in the query.
- [ ] No secret or token in source or logs.
- [ ] File uploads: MIME allowlist + size cap + virus scan hook (when
      available).
- [ ] CORS origins tightened to known frontends in non-dev.

## 14. Git and PR hygiene

- **Branches**: `feat/`, `fix/`, `chore/`, `docs/` prefixes.
- **Commits**: Conventional Commits.
- **PR description**: what / why / test plan / risk / rollout (DB
  migration order if any).
- **Size**: prefer &lt; 400 lines of product code per PR when possible;
  split refactors.

## 15. References

- [`testing-strategy.md`](./testing-strategy.md)
- [`environment-variables.md`](./environment-variables.md)
- [`../08-security/security-baseline.md`](../08-security/security-baseline.md)
- [`../09-multi-tenancy/tenancy-strategy.md`](../09-multi-tenancy/tenancy-strategy.md)
- [`../15-observability/observability-plan.md`](../15-observability/observability-plan.md)
