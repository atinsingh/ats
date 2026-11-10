# Security baseline

This document is the source of truth for how authentication, authorisation,
tenant isolation, and the supporting controls (CORS, CSRF, password
hashing, secrets, file uploads, rate limits, audit) are wired across
Jobocate's Java services.

The baseline lives in `services-java/platform-starter` so every service
inherits identical filters and conventions. Service-local
`SecurityConfig.java` files only declare URL → role rules.

## 1. Authentication

### 1.1 JWT (production)

* **Algorithm**: HS256 with a tenant-wide secret (`jobocate.security.jwt-secret`).
  Replaced by RS256 + JWKS in the post-MVP federated-identity work; the
  HS256 path is sufficient until then because all services are in the same
  trust boundary.
* **Issuer**: `tenant-auth-service` is the only issuer. Other services
  verify but never sign.
* **Required claims**: `sub` (user id, UUID), `tenant_id` (UUID), `roles`
  (array of {@link Role} names), `iat`, `exp`, `iss=jobocate-tenant-auth`.
* **Token lifetime**: 1h access token, 30d refresh (refresh implementation
  tracked under `tenant-auth-service` MVP work).
* **Verification**: `TenantIdentityFilter` validates the signature,
  rejects expired/malformed tokens with HTTP 401, and populates
  `TenantContext`, `UserContext`, and `SecurityContextHolder` with a
  `JobocateAuthentication`.
* **Authorities**: `Role` values are exposed as Spring authorities
  prefixed with `ROLE_` (e.g. `RECRUITER` → `ROLE_RECRUITER`) so
  `@PreAuthorize("hasRole('RECRUITER')")` works without translation.

### 1.2 Dev-only headers

When `jobocate.security.allow-dev-tenant-header=true` (default in the
`docker-compose.dev.yml` profile), `TenantIdentityFilter` accepts:

| Header | Meaning |
|---|---|
| `X-Jobocate-Tenant-Id` | Active tenant. Required. |
| `X-Jobocate-User-Id`   | Acting user. Optional; populates `UserContext`. |
| `X-Jobocate-Roles`     | Comma-separated `Role` names. Optional; **defaults to all roles** so curl/Postman flows don't have to enumerate. |

Production deployments must set
`jobocate.security.allow-dev-tenant-header=false` (or simply omit it —
the property defaults to `false`).

### 1.3 Service-to-service (`/internal/v1/**`)

`InternalTokenFilter` requires `Authorization: Bearer <internal-token>`,
where `<internal-token>` is shared between the Java services and the
python workers via `jobocate.internal-token`. On success the filter
installs a synthetic `JobocateAuthentication.internal()` carrying
`SUPER_ADMIN` so the per-service `SecurityConfig` can express the rule
as `requestMatchers("/internal/**").hasRole("SUPER_ADMIN")`.

The static token is a stop-gap. Production must move to mTLS or SPIFFE;
the swap is contained to `InternalTokenFilter` + the workers' HTTP
clients.

## 2. Authorisation

### 2.1 RBAC

Authoritative role list and per-API expectations: see
`docs/08-security/rbac-permissions-matrix.md`. Highlights:

| Service | Default URL rules |
|---|---|
| `application-service` | `/api/v1/applications/**` and `/api/v1/ai-artifacts/**` require an authenticated principal; service-level checks enforce candidate-vs-recruiter ownership. |
| `job-service` | Mutating ops (`POST` / `PATCH` / `*/publish`, `*/unpublish`, `*/close`, `*/clone`) require `RECRUITER`/`HIRING_MANAGER`/`TENANT_ADMIN`/`SUPER_ADMIN`. Reads are tenant-scoped (i.e. authenticated). |
| `candidate-service` | `/api/v1/me/**` and `/api/v1/candidates/me/**` require `CANDIDATE`. `/api/v1/candidates/**` requires `RECRUITER`/`HIRING_MANAGER`/`TENANT_ADMIN`/`SUPER_ADMIN`. |
| `notification-service` | `/api/v1/me/**` requires authenticated; `/internal/**` requires the internal token. |
| `admin-service` | `/api/v1/admin/**` requires `SUPER_ADMIN`. |
| `tenant-auth-service` | `/api/auth/**` is public (login/refresh issue tokens); everything else is denied until explicitly opened. |

### 2.2 Method-level authorisation

Every service enables `@EnableMethodSecurity` in its `SecurityConfig`.
Services should add `@PreAuthorize("hasRole('TENANT_ADMIN')")` (etc.) to
service methods that are role-sensitive **in addition to** the URL rules
— defence in depth catches accidentally-public routes added later.

### 2.3 Tenant isolation

* `TenantContext.requireTenant()` is the only sanctioned way to read the
  current tenant inside a service. Throws if no tenant is in scope (e.g.
  a `/internal` worker call that forgot to send `X-Jobocate-Tenant-Id`).
* JPA repositories must include `tenantId` in every read/write predicate
  (`findByTenantIdAndId(...)` etc.). Cross-tenant access returns 404, not
  403, to avoid leaking the existence of resources owned by another
  tenant.
* Kafka events always include `tenant_id` in the payload — see
  `docs/05-api-contracts/kafka-topics.md`. Consumers reject messages
  missing it.
* OpenSearch indices include `tenant_id` and the search-gateway adds
  `term: { tenant_id }` to every query.
* Audit events and structured logs include `tenant_id` and (when
  available) `correlation_id` to support per-tenant log analysis.

A dedicated multi-tenancy enforcement test suite — including "tenant A
cannot see tenant B" assertions — is implemented under Prompt 25.

## 3. CORS

Allowed origins default to the local Next.js dev ports
(`http://localhost:3000`, `:3001`). Production must explicitly set
`jobocate.security.cors.allowed-origins` to the deployed portal +
recruiter origins. `allowCredentials` defaults to `false`; only flip to
`true` if the portal needs to send cookies.

## 4. CSRF

CSRF is **disabled** for all services because every endpoint is a stateless
JSON API authenticated via bearer JWT. There are no cookie-mediated state
changes. If a future endpoint accepts cookies (e.g. server-rendered admin
console), CSRF must be re-enabled for that path.

## 5. Password hashing

`tenant-auth-service` exposes a single `PasswordEncoder` bean —
`BCryptPasswordEncoder(strength=12)`. New password hashes always use
this encoder. Existing hashes (none today) would be migrated using
`DelegatingPasswordEncoder` rather than rehashing on read.

## 6. Token expiry + refresh

* Access token: 1h. Lifetime is hard-coded in `DemoTokenController` for
  the MVP; production migrates to a configurable property.
* Refresh token: 30d, single-use, rotates on use. Implementation lives
  with the post-MVP "real auth" milestone (`tenant-auth-service`).
* Revocation: refresh tokens are stored hashed in
  `tenant_auth.refresh_tokens`. Logout deletes the row; access tokens
  ride out their natural 1h expiry.

## 7. PII masking

* Resume text and parsed PII are stored in `candidate-service` and
  `resume_parsed_fields`. Recruiter-facing surfaces apply masks
  controlled by `consent_searchable` + `consent_resume_shared` on the
  candidate profile.
* Logs must never contain raw PII (email, phone, SSN). Shared logging
  helpers in `platform-starter` will log identifiers (UUIDs) instead.
* AI worker plug-ins are responsible for redacting PII before sending
  prompts to third-party LLMs — see
  `docs/07-ai-platform/ai-artifact-platform.md`.

## 8. File upload security

Resumes follow a strict pre-signed PUT upload flow handled by
`candidate-service` (PRD §3.9):

1. Client requests a pre-signed URL with the file metadata. Service
   validates `mimeType ∈ {pdf, doc, docx}` and `sizeBytes ≤ 10 MiB`.
2. Client uploads directly to S3 against the pre-signed URL. The bucket
   is private; no public reads are allowed.
3. Client calls `finalize` to mark the upload complete and emit
   `resume.uploaded`.

Antivirus scanning is on the post-MVP roadmap (queued via the
`resume-scanned` Kafka topic; ClamAV worker).

## 9. Rate limiting

* Per-(user, type) notification rate limits in `notification-service`
  (see `docs/13-notifications/notification-service.md`).
* Per-tenant request quotas at the gateway/Ingress are tracked in the
  observability plan.
* AI workers respect `jobocate.ai.quota.*` counters (post-MVP, paired
  with billing).

## 10. Audit logging

Domain events are written through the transactional outbox (`*_event_outbox`
tables) and consumed off the relevant Kafka topic. Every event payload
includes `event_id`, `tenant_id`, `actor_user_id` (when available), and
`occurred_at`, which is the canonical audit trail. Operational logs go to
the standard logging pipeline; they include `correlationId`/`requestId`
via SLF4J MDC.

## 11. Secrets management

* `application.yml` reads every secret from environment variables
  (`${VAR:default}`). The committed defaults are deliberately weak so a
  forgotten production deploy fails fast.
* Production loads secrets from the cluster secret manager (HashiCorp
  Vault / AWS Secrets Manager / GCP Secret Manager) and injects them as
  env vars or files.
* Never log secrets. The shared `LoggingEmailDispatcher` already redacts
  the message body when running in non-dev profiles.

## 12. Header reference

| Header | Direction | Purpose |
|---|---|---|
| `Authorization: Bearer <jwt>` | inbound | Production identity. |
| `Authorization: Bearer <internal-token>` | inbound, `/internal/**` | Service-to-service. |
| `X-Jobocate-Tenant-Id`, `X-Jobocate-User-Id`, `X-Jobocate-Roles` | inbound, dev-only | Local DX shim. |
| `X-Correlation-Id` | inbound | Propagated across services + Kafka headers; populated into MDC. |
| `Idempotency-Key` | inbound | Required on POST `/api/v1/applications` and POST `/api/v1/ai-artifacts`. |

## 13. Implementation pointers

* `services-java/platform-starter/src/main/java/com/jobocate/platform/security/`
  - `JobocateSecuritySupport` — applies CSRF/session/CORS defaults and
    registers `InternalTokenFilter` + `TenantIdentityFilter`.
  - `JobocateAuthentication` — Spring `Authentication` carrying
    `userId`, `tenantId`, `roles`.
  - `TenantIdentityFilter` — JWT or dev-header → `TenantContext` +
    `UserContext` + `SecurityContextHolder`.
  - `InternalTokenFilter` — bearer token → `JobocateAuthentication.internal()`.
  - `Role` — canonical role enum.
* Per-service `SecurityConfig.java` files declare the URL rules that
  layer on top.
