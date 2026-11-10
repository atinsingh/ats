# API contract plan

> **Document type:** API surface plan — endpoint inventory, conventions, and authorization mapping.
> **Audience:** Backend engineers writing controllers; frontend engineers consuming via `@jobocate/api-sdk`; QA writing contract tests.
> **Authoritative spec:** OpenAPI YAML files in [`packages/shared-contracts/openapi/`](../../packages/shared-contracts/openapi/) (created in Prompt 8). This doc is the design intent; the YAMLs are the wire contract.

## 1. Conventions

### 1.1 Base paths
- Service APIs: `/api/v1/<resource>` (per-service Spring controllers).
- Search gateway: `/v1/search/...` (Go gateway, no `/api` prefix — preserves existing convention).
- Internal endpoints (service-to-service): `/internal/v1/...` with internal token header (`X-Internal-Token`).

### 1.2 Versioning
- Major version is in the URL (`/v1`).
- Breaking changes require a new major (`/v2`) AND parallel availability for at least one release cycle.
- Additive changes (new optional fields, new endpoints) ship in `v1`.

### 1.3 Authentication
- Default: bearer JWT (`Authorization: Bearer <token>`).
- JWT claims: `sub` (user id), `tenant_id`, `roles[]`, `iat`, `exp`, `iss=jobocate-tenant-auth`.
- Public endpoints (e.g., `GET /api/v1/jobs/public/{id}`) are unauthenticated and tagged with `security: []`.
- Dev-only `X-Jobocate-Tenant-Id` header is accepted **iff** `JOBOCATE_ALLOW_HEADER_TENANT=true` (must be off in production).

### 1.4 Tenant scope
- `tenant_id` always comes from the JWT — never from the request body or path.
- Cross-tenant endpoints (Super Admin) accept an explicit `?tenant=<uuid>` query param and require `SUPER_ADMIN` role.
- Service responses do not include `tenant_id` in the body for tenant-scoped endpoints (it's implicit). Cross-tenant responses do include it.

### 1.5 Pagination
- **Default**: cursor pagination on append-mostly tenant lists.
- **Fallback**: offset pagination (`?limit=&offset=`) for legacy / simple cases.
- **Defaults**: `limit=25`, `max=100`.
- Cursor envelope: `{ "items": [...], "next_cursor": "opaque-string-or-null", "has_more": true|false }`.
- Offset envelope: `{ "items": [...], "total": N, "limit": L, "offset": O }`.

### 1.6 Idempotency
- All POST endpoints that create a domain entity SHOULD accept `Idempotency-Key: <client-generated-uuid>`.
- The following endpoints REQUIRE the header (FR-6.5 etc.):
  - `POST /api/v1/applications` (apply)
  - `POST /api/v1/offers/{id}/send`
  - `POST /api/v1/offers/{id}/accept`
- Server stores `(tenant_id, idempotency_key) → request_hash, response, status` for 24 hours.
- Replay with same hash → return original response. Replay with different hash → 409 `IDEMPOTENCY_KEY_PAYLOAD_MISMATCH`.

### 1.7 Optimistic locking
- Mutating endpoints on aggregate roots return `ETag: "<version>"` header on responses.
- PATCH/PUT MAY include `If-Match: "<version>"` to enforce concurrency. When omitted, last-writer-wins is allowed only for low-stakes endpoints (notes, tags); status changes always require `If-Match`.

### 1.8 Error envelope (canonical)
```json
{
  "error": {
    "code": "MACHINE_READABLE_CODE",
    "message": "Human readable summary.",
    "request_id": "req_01HZ...",
    "correlation_id": "corr_01HZ...",
    "timestamp": "2026-05-13T18:25:00Z",
    "details": { "field_name": ["validation message", "..."] }
  }
}
```
- HTTP status mapping: 400 (validation), 401 (unauthenticated), 403 (forbidden), 404 (not found), 409 (conflict), 410 (gone), 415 (unsupported media), 422 (semantic invalid), 429 (rate limited), 500 (internal), 503 (downstream unavailable).
- Common codes: `VALIDATION_FAILED`, `UNAUTHENTICATED`, `FORBIDDEN`, `FORBIDDEN_ROLE`, `NOT_FOUND`, `CONFLICT`, `OPTIMISTIC_LOCK_CONFLICT`, `IDEMPOTENCY_KEY_REQUIRED`, `IDEMPOTENCY_KEY_PAYLOAD_MISMATCH`, `RATE_LIMITED`, `INTERNAL_ERROR`, `DOWNSTREAM_UNAVAILABLE`, `TENANT_SUSPENDED`, `PLAN_LIMIT_EXCEEDED`, `AI_DISABLED`.

### 1.9 Standard headers
- Inbound: `Authorization`, `X-Correlation-Id` (optional; auto-generated when missing), `Idempotency-Key`, `If-Match`, `Accept-Language`.
- Outbound: `X-Request-Id`, `X-Correlation-Id`, `ETag`, `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`.

### 1.10 Content types
- Request/response: `application/json`.
- File uploads: `multipart/form-data`. Returns include `Location` header pointing at the resource.

## 2. Service ↔ API map

| API group | Service | Owns | Public surface |
|----|----|----|----|
| Auth | `tenant-auth-service` | sessions, tokens | `/api/auth/...` |
| Tenant | `ats-core-service` | tenants | `/api/v1/tenants/...` |
| User | `tenant-auth-service` | users, role grants | `/api/v1/users/...` |
| Candidate | `candidate-service` | profile, work/edu/cert, consent | `/api/v1/candidates/...`, `/api/v1/me/...` (own) |
| Resume | `candidate-service` (metadata) + `resume-ingestion-service` (upload) | resumes, parser status | `/api/v1/candidates/{id}/resumes/...` |
| Job | `job-service` | jobs, skills, screening, hiring team | `/api/v1/jobs/...` |
| Application | `application-service` | applications, timeline, notes, tags, ratings, AI artifacts | `/api/v1/applications/...`, `/api/v1/jobs/{id}/applications` |
| Pipeline | `application-service` | pipelines, stages | `/api/v1/pipelines/...` |
| Interview | `application-service` (or new `interview-service` post-MVP) | interviews, feedback | `/api/v1/applications/{id}/interviews`, `/api/v1/interviews/{id}/...` |
| Offer | `application-service` (or new `offer-service` post-MVP) | offers, approvals | `/api/v1/applications/{id}/offers`, `/api/v1/offers/{id}/...` |
| Search | `search-gateway` (Go) | OpenSearch read path | `/v1/search/jobs`, `/v1/search/candidates`, `/v1/autocomplete/jobs` |
| Notification | `notification-service` | inbox, preferences | `/api/v1/notifications/...`, `/api/v1/me/notification-preferences` |
| AI Artifact | `application-service` (storage) + `workers-python` (generation) | AI artifact CRUD | `/api/v1/ai-artifacts/...` |
| Billing | (post-MVP) `billing-service` | subscriptions, invoices, usage | `/api/v1/billing/...` |
| Admin | `admin-service` | tenants, users (cross-tenant), feature flags, AI quotas, moderation, audit, prompt registry | `/api/v1/admin/...` |

## 3. Endpoints by API group

> Notation per endpoint: **`METHOD`** `path` — short summary. **Auth:** roles. **Tenant:** scope behavior. **Idem.:** idempotency rule. **Errors:** non-default error codes worth calling out.

### 3.1 Auth API (file: `auth-api.yaml`)

| Method | Path | Summary | Auth | Idem. | Notes |
|--------|------|---------|------|-------|-------|
| POST | `/api/auth/signup` | Candidate self-signup (email + password) | none | optional | Sends verification email. |
| POST | `/api/auth/login` | Login (email + password) → tokens | none | — | Returns `access_token`, `refresh_token`, `expires_in`. |
| POST | `/api/auth/refresh` | Exchange refresh token for new access token (rotates refresh) | none (uses refresh token) | — | Reuse of an old refresh token revokes the entire chain. |
| POST | `/api/auth/logout` | Revoke current session | bearer | — | |
| POST | `/api/auth/logout-all` | Revoke all sessions for the user | bearer | — | |
| POST | `/api/auth/forgot-password` | Request password reset email | none | optional | Always returns 200 to avoid email enumeration. |
| POST | `/api/auth/reset-password` | Complete password reset with token | none | — | Single-use token; ≤ 30 min TTL. |
| POST | `/api/auth/verify-email` | Confirm email verification token | none | — | |
| POST | `/api/auth/resend-verification` | Resend verification email | bearer | — | Rate-limited per user. |
| POST | `/api/auth/accept-invite` | Tenant-side user accepts invite, sets password | none (uses invite token) | — | |
| POST | `/api/auth/demo-token` | **Local dev only** — issue an HS256 token for `tenant_id`+`subject` | none | — | Disabled in production. *(Existing endpoint.)* |
| GET | `/api/auth/me` | Current session info (roles, tenants) | bearer | — | |

### 3.2 Tenant API (file: `tenant-api.yaml`)

| Method | Path | Summary | Auth | Tenant | Notes |
|--------|------|---------|------|--------|-------|
| GET | `/api/v1/tenants/me` | Current tenant detail | bearer | own | *(Existing.)* |
| GET | `/api/v1/tenants/{slug}` | Lookup by slug (public-fields only when called outside `SUPER_ADMIN`) | bearer | own / cross | *(Existing.)* |
| PATCH | `/api/v1/tenants/me` | Update tenant profile/branding | TENANT_ADMIN | own | `If-Match` recommended. |

Cross-tenant tenant CRUD lives in the Admin API.

### 3.3 User API (file: `user-api.yaml`)

| Method | Path | Summary | Auth | Tenant | Notes |
|--------|------|---------|------|--------|-------|
| GET | `/api/v1/users` | List users in current tenant | TENANT_ADMIN, RECRUITER, HIRING_MANAGER (read-only roster), FINANCE_ADMIN, COMPLIANCE_ADMIN | own | Cursor pagination; filter by role. |
| POST | `/api/v1/users/invite` | Invite a user with role(s) | TENANT_ADMIN | own | Sends invite email. |
| GET | `/api/v1/users/{id}` | User detail | scope-dependent | own | |
| PATCH | `/api/v1/users/{id}` | Update profile fields | TENANT_ADMIN, or self for own profile | own | |
| POST | `/api/v1/users/{id}/roles` | Grant a role | TENANT_ADMIN | own | Body: `{role}`. Audited. |
| DELETE | `/api/v1/users/{id}/roles/{role}` | Revoke a role | TENANT_ADMIN | own | |
| POST | `/api/v1/users/{id}/suspend` | Suspend user | TENANT_ADMIN | own | |
| POST | `/api/v1/users/{id}/reactivate` | Reactivate user | TENANT_ADMIN | own | |
| GET | `/api/v1/me` | Own profile + active tenant + roles | bearer | self | |
| PATCH | `/api/v1/me` | Update own profile | bearer | self | |
| POST | `/api/v1/me/change-password` | Change own password | bearer | self | |
| POST | `/api/v1/me/switch-tenant` | Switch active tenant | bearer (multi-tenant user) | self | Returns new token. |

### 3.4 Candidate API (file: `candidate-api.yaml`)

| Method | Path | Summary | Auth | Tenant | Notes |
|--------|------|---------|------|--------|-------|
| GET | `/api/v1/me/profile` | Own candidate profile | CANDIDATE | self | |
| PUT | `/api/v1/me/profile` | Replace own profile | CANDIDATE | self | `If-Match`. |
| GET | `/api/v1/me/work-experiences` | List own work experiences | CANDIDATE | self | |
| POST | `/api/v1/me/work-experiences` | Add work experience | CANDIDATE | self | Idempotency-Key optional. |
| PATCH | `/api/v1/me/work-experiences/{id}` | Update work experience | CANDIDATE | self | |
| DELETE | `/api/v1/me/work-experiences/{id}` | Delete work experience | CANDIDATE | self | |
| (similar for `/educations`, `/certifications`) | | | | | |
| GET | `/api/v1/me/consents` | List own consent records | CANDIDATE | self | |
| POST | `/api/v1/me/consents` | Grant or revoke consent (creates new record) | CANDIDATE | self | Append-only. |
| GET | `/api/v1/me/saved-jobs` | List saved jobs | CANDIDATE | self | |
| POST | `/api/v1/me/saved-jobs` | Save a job | CANDIDATE | self | |
| DELETE | `/api/v1/me/saved-jobs/{job_id}` | Unsave a job | CANDIDATE | self | |
| GET | `/api/v1/me/saved-searches` | List saved searches | CANDIDATE | self | |
| POST | `/api/v1/me/saved-searches` | Save a search | CANDIDATE | self | |
| DELETE | `/api/v1/me/saved-searches/{id}` | Delete saved search | CANDIDATE | self | |
| POST | `/api/v1/me/data-export` | Initiate DSAR export | CANDIDATE | self | Returns ticket id; signed URL emailed when ready. |
| POST | `/api/v1/me/data-deletion` | Initiate DSAR deletion | CANDIDATE | self | |
| GET | `/api/v1/candidates` | Recruiter list (resume DB) | RECRUITER+ (entitlement) | own | Filters per FR-10; only consenting + non-PRIVATE candidates. *(Existing list endpoint becomes recruiter-side; rename + scope.)* |
| GET | `/api/v1/candidates/{id}` | Candidate detail (recruiter view) | RECRUITER+ | own | Tenant-scoped: candidate must have applied to tenant OR resume DB visibility. |

### 3.5 Resume API (file: `resume-api.yaml`)

| Method | Path | Summary | Auth | Tenant | Idem. | Notes |
|--------|------|---------|------|--------|-------|-------|
| POST | `/api/v1/me/resumes/upload-url` | Get pre-signed PUT URL for direct S3 upload | CANDIDATE | self | optional | Body: `{filename, mime_type, size_bytes}`. Returns `{upload_url, s3_key, resume_id}`. |
| POST | `/api/v1/me/resumes/{id}/finalize` | Finalize after PUT to S3; triggers parser | CANDIDATE | self | required | Server validates magic bytes via S3 Head + first-bytes read. |
| POST | `/api/v1/me/resumes` | Multipart upload (alt to pre-signed) | CANDIDATE | self | required | For browsers that prefer it. |
| GET | `/api/v1/me/resumes` | List own resumes | CANDIDATE | self | — | |
| GET | `/api/v1/me/resumes/{id}` | Resume metadata + parser status | CANDIDATE | self | — | |
| GET | `/api/v1/me/resumes/{id}/download-url` | Pre-signed GET URL | CANDIDATE | self | — | TTL ≤ 5 min; audited. |
| PATCH | `/api/v1/me/resumes/{id}` | Update label, set default | CANDIDATE | self | — | |
| DELETE | `/api/v1/me/resumes/{id}` | Delete resume (only if not referenced by application) | CANDIDATE | self | — | Returns 409 if referenced. |
| GET | `/api/v1/applications/{id}/resume/download-url` | Recruiter download of the resume used | RECRUITER+ | own | — | Audited as `RESUME_ACCESSED`. |
| POST | `/api/v1/me/resumes/{id}/parsed-fields/apply` | Accept parser-extracted fields into structured profile | CANDIDATE | self | — | |

### 3.6 Job API (file: `job-api.yaml`)

| Method | Path | Summary | Auth | Tenant | Idem. | Notes |
|--------|------|---------|------|--------|-------|-------|
| GET | `/api/v1/jobs` | Recruiter-side list with filters (status, owner, etc.) | RECRUITER+ | own | — | Cursor pagination. *(Existing list returns OPEN only; expand to all statuses with filter.)* |
| POST | `/api/v1/jobs` | Create job (DRAFT) | RECRUITER+ | own | optional | *(Existing.)* |
| GET | `/api/v1/jobs/{id}` | Job detail (recruiter view) | RECRUITER+ | own | — | *(Existing.)* |
| PATCH | `/api/v1/jobs/{id}` | Update job | RECRUITER (H), HIRING_MANAGER (H), TENANT_ADMIN | own | — | `If-Match`. |
| POST | `/api/v1/jobs/{id}/publish` | Transition DRAFT→PUBLISHED | RECRUITER (H), HIRING_MANAGER (H), TENANT_ADMIN | own | — | Validates required fields. |
| POST | `/api/v1/jobs/{id}/unpublish` | Transition PUBLISHED→DRAFT | same as publish | own | — | |
| POST | `/api/v1/jobs/{id}/close` | Transition PUBLISHED→CLOSED | same | own | — | Triggers async expiry of non-terminal applications. |
| POST | `/api/v1/jobs/{id}/clone` | Clone into new DRAFT | RECRUITER+ | own | required | |
| GET | `/api/v1/jobs/{id}/skills` | List job skills | RECRUITER+ | own | — | |
| PUT | `/api/v1/jobs/{id}/skills` | Replace job skills | RECRUITER (H), HIRING_MANAGER (H), TENANT_ADMIN | own | — | |
| GET | `/api/v1/jobs/{id}/screening-questions` | List | RECRUITER+ | own | — | |
| PUT | `/api/v1/jobs/{id}/screening-questions` | Replace | RECRUITER (H), HIRING_MANAGER (H), TENANT_ADMIN | own | — | |
| GET | `/api/v1/jobs/{id}/hiring-team` | List members | RECRUITER+ | own | — | |
| POST | `/api/v1/jobs/{id}/hiring-team` | Add member | RECRUITER (H), HIRING_MANAGER (H), TENANT_ADMIN | own | — | |
| DELETE | `/api/v1/jobs/{id}/hiring-team/{user_id}` | Remove member | same | own | — | |
| GET | `/api/v1/jobs/{id}/performance` | Views, applies, conversion | RECRUITER+ | own | — | |
| GET | `/api/v1/jobs/public/{slug-with-id}` | Public job detail (PUBLISHED only) | none | — | — | Returns 404 for non-PUBLISHED. SEO-friendly slug `{seo}-{id}`. |

### 3.7 Application API (file: `application-api.yaml`)

| Method | Path | Summary | Auth | Tenant | Idem. | Notes |
|--------|------|---------|------|--------|-------|-------|
| POST | `/api/v1/applications` | Submit application (or DRAFT) | CANDIDATE | none (carries job's tenant via job_id lookup) | **required** | Errors: `APPLICATION_DUPLICATE`, `JOB_NOT_OPEN`. |
| GET | `/api/v1/applications/{id}` | Detail (candidate own OR recruiter team) | CANDIDATE (own), RECRUITER+ (own tenant) | enforced server-side | — | |
| GET | `/api/v1/me/applications` | Own applications (candidate) | CANDIDATE | self | — | Cursor pagination. |
| GET | `/api/v1/jobs/{job_id}/applications` | Applications for a job (recruiter) | RECRUITER+ | own | — | Filters: stage, source, score, tag. |
| GET | `/api/v1/applications/{id}/timeline` | Application timeline entries | as detail | own/self | — | |
| PATCH | `/api/v1/applications/{id}/status` | Change status (state machine) | RECRUITER+ | own | — | `If-Match` required; body `{ to: STATE, reason?: code, note?: md }`. |
| POST | `/api/v1/applications/{id}/withdraw` | Candidate withdraws | CANDIDATE | self | — | |
| POST | `/api/v1/applications/{id}/reject` | Recruiter rejects with disposition | RECRUITER+ | own | — | Body `{disposition_reason_code, note_md?}`. |
| POST | `/api/v1/applications/{id}/notes` | Add note | RECRUITER+, INTERVIEWER (H) | own | — | |
| GET | `/api/v1/applications/{id}/notes` | List notes | RECRUITER+, INTERVIEWER (H) | own | — | |
| PATCH | `/api/v1/applications/{id}/notes/{note_id}` | Edit note (own) | author | own | — | |
| DELETE | `/api/v1/applications/{id}/notes/{note_id}` | Delete note (own or admin) | author / TENANT_ADMIN | own | — | Soft-delete. |
| POST | `/api/v1/applications/{id}/tags` | Add tag | RECRUITER+ | own | — | |
| DELETE | `/api/v1/applications/{id}/tags/{tag}` | Remove tag | RECRUITER+ | own | — | |
| PUT | `/api/v1/applications/{id}/rating` | Set own rating | RECRUITER+ | own | — | |
| POST | `/api/v1/applications/bulk-actions` | Bulk action (move, tag, reject) | RECRUITER+ | own | required | Returns per-row results (success/failure). |

### 3.8 Pipeline API (file: `application-api.yaml`, shared module)

| Method | Path | Summary | Auth | Tenant | Notes |
|--------|------|---------|------|--------|-------|
| GET | `/api/v1/pipelines` | List tenant pipelines | RECRUITER+ | own | |
| POST | `/api/v1/pipelines` | Create | TENANT_ADMIN | own | |
| GET | `/api/v1/pipelines/{id}` | Detail | RECRUITER+ | own | |
| PATCH | `/api/v1/pipelines/{id}` | Update | TENANT_ADMIN | own | |
| DELETE | `/api/v1/pipelines/{id}` | Soft-delete (when not in use) | TENANT_ADMIN | own | |
| GET | `/api/v1/pipelines/{id}/stages` | List stages | RECRUITER+ | own | |
| PUT | `/api/v1/pipelines/{id}/stages` | Replace stages (with order) | TENANT_ADMIN | own | |

### 3.9 Interview API (file: `interview-api.yaml`, post-MVP)

| Method | Path | Summary | Auth | Tenant | Idem. | Notes |
|--------|------|---------|------|--------|-------|-------|
| GET | `/api/v1/applications/{id}/interviews` | List interviews | RECRUITER+, INTERVIEWER (H) | own | — | |
| POST | `/api/v1/applications/{id}/interviews` | Schedule | RECRUITER (H), HIRING_MANAGER (H) | own | required | Triggers `INTERVIEW_SCHEDULED`. |
| GET | `/api/v1/interviews/{id}` | Detail | RECRUITER+, INTERVIEWER (H) | own | — | |
| PATCH | `/api/v1/interviews/{id}/reschedule` | Reschedule | RECRUITER (H), HIRING_MANAGER (H) | own | — | |
| POST | `/api/v1/interviews/{id}/cancel` | Cancel | same | own | — | |
| POST | `/api/v1/interviews/{id}/feedback` | Submit feedback | INTERVIEWER (H) | own | — | One per (interview, interviewer). |
| GET | `/api/v1/interviews/{id}/feedback` | List feedback | RECRUITER (H), HIRING_MANAGER (H), INTERVIEWER (own only until they submit) | own | — | |

### 3.10 Offer API (file: `offer-api.yaml`, post-MVP)

| Method | Path | Summary | Auth | Tenant | Idem. | Notes |
|--------|------|---------|------|--------|-------|-------|
| GET | `/api/v1/applications/{id}/offers` | List offers for application | RECRUITER+ | own | — | |
| POST | `/api/v1/applications/{id}/offers` | Draft offer | RECRUITER (H), HIRING_MANAGER (H) | own | required | |
| GET | `/api/v1/offers/{id}` | Detail | RECRUITER+ (recruiter side); CANDIDATE via signed URL flow | own/self | — | |
| PATCH | `/api/v1/offers/{id}` | Edit draft | RECRUITER (H), HIRING_MANAGER (H) | own | — | |
| POST | `/api/v1/offers/{id}/approvers` | Set approval chain | RECRUITER (H), HIRING_MANAGER (H), TENANT_ADMIN | own | — | |
| POST | `/api/v1/offers/{id}/approve` | Record approval decision (per approver) | HIRING_MANAGER (approver), TENANT_ADMIN | own | — | |
| POST | `/api/v1/offers/{id}/send` | Send to candidate | RECRUITER (H), HIRING_MANAGER (H) | own | required | All approvers must have approved. |
| POST | `/api/v1/offers/{id}/accept` | Candidate accepts | CANDIDATE | self | required | |
| POST | `/api/v1/offers/{id}/decline` | Candidate declines | CANDIDATE | self | — | |
| POST | `/api/v1/offers/{id}/rescind` | Recruiter rescinds | RECRUITER (H), HIRING_MANAGER (H) | own | — | |
| POST | `/api/v1/offers/{id}/documents` | Attach document (PDF) | RECRUITER (H), HIRING_MANAGER (H), CANDIDATE (signed copy) | own/self | — | |

### 3.11 Search API (file: `search-api.yaml`)

| Method | Path | Summary | Auth | Tenant | Notes |
|--------|------|---------|------|--------|-------|
| POST | `/v1/search/jobs` | Hybrid job search | bearer (any role) | tenant from `X-Jobocate-Tenant-Id` header (or JWT) | *(Existing.)* See `recruiter-search-gateway.yaml` v0.2.0 — to be renamed to `search-api.yaml` and extended. |
| GET | `/v1/search/jobs/public` | Public job search (unauthenticated) | none | none | Used by marketplace; no candidate-side data. |
| POST | `/v1/search/candidates` | Candidate (resume DB) search | RECRUITER+ (entitlement) | required | Always applies tenant + consent filter. |
| GET | `/v1/autocomplete/jobs` | Autocomplete (Redis-backed) | bearer | required | *(Existing in `autocomplete-service`.)* |
| GET | `/v1/autocomplete/candidates` | Autocomplete for candidate search | RECRUITER+ | required | Post-MVP. |
| GET | `/healthz` | Health check | none | — | |
| POST | `/internal/v1/index/jobs` | Single-doc index (orchestrator → gateway) | internal token | — | *(Existing.)* |
| POST | `/internal/v1/index/jobs/bulk` | Bulk index | internal token | — | Post-MVP. |
| POST | `/internal/v1/index/candidates` | Single-doc candidate index | internal token | — | Post-MVP. |

### 3.12 Notification API (file: `notification-api.yaml`)

| Method | Path | Summary | Auth | Tenant | Notes |
|--------|------|---------|------|--------|-------|
| GET | `/api/v1/notifications` | Inbox (own) | bearer | self | Filters: `unread`, `type`, `since`. |
| GET | `/api/v1/notifications/{id}` | Notification detail | bearer | self | |
| POST | `/api/v1/notifications/{id}/read` | Mark read | bearer | self | |
| POST | `/api/v1/notifications/mark-all-read` | Bulk mark read | bearer | self | |
| GET | `/api/v1/me/notification-preferences` | List per-(type, channel) prefs | bearer | self | |
| PATCH | `/api/v1/me/notification-preferences` | Bulk update prefs | bearer | self | |

### 3.13 AI Artifact API (post-MVP) (file: `ai-artifact-api.yaml`)

| Method | Path | Summary | Auth | Tenant | Idem. | Notes |
|--------|------|---------|------|--------|-------|-------|
| POST | `/api/v1/ai-artifacts` | Request generation (e.g., cover letter for job X) | varies (CANDIDATE for own, RECRUITER+ for recruiter-side) | own/self | required | Returns `{id, status:DRAFT|READY_FOR_REVIEW, ...}` |
| GET | `/api/v1/ai-artifacts/{id}` | Detail (incl. output text/url) | owner | own/self | — | |
| POST | `/api/v1/ai-artifacts/{id}/approve` | Approve (candidate or recruiter) | owner | own/self | — | Required before AI artifact can be used in submission. |
| POST | `/api/v1/ai-artifacts/{id}/reject` | Reject | owner | own/self | — | |
| POST | `/api/v1/ai-artifacts/{id}/regenerate` | Regenerate variant | owner | own/self | required | New version chained. |
| GET | `/api/v1/ai-artifacts` | List (own / recruiter-side cross-application) | varies | own/self | — | |

### 3.14 Billing API (post-MVP) (file: `billing-api.yaml`)

| Method | Path | Summary | Auth | Tenant | Notes |
|--------|------|---------|------|--------|-------|
| GET | `/api/v1/billing/plans` | List public plans | none | — | |
| GET | `/api/v1/billing/subscription` | Current tenant subscription | TENANT_ADMIN, FINANCE_ADMIN | own | |
| POST | `/api/v1/billing/checkout-session` | Stripe checkout session for upgrade | TENANT_ADMIN, FINANCE_ADMIN | own | |
| POST | `/api/v1/billing/cancel` | Cancel at period end | TENANT_ADMIN, FINANCE_ADMIN | own | |
| GET | `/api/v1/billing/invoices` | Invoices | FINANCE_ADMIN | own | |
| GET | `/api/v1/billing/invoices/{id}` | Invoice detail (with PDF URL) | FINANCE_ADMIN | own | |
| GET | `/api/v1/billing/usage` | Current period usage | TENANT_ADMIN, FINANCE_ADMIN | own | |
| POST | `/api/v1/billing/sponsored/{job_id}` | Buy sponsored placement for a job | TENANT_ADMIN, FINANCE_ADMIN | own | |
| POST | `/internal/v1/billing/stripe-webhook` | Stripe webhook receiver | signature-verified | — | Idempotent on `stripe_event_id`. |

### 3.15 Admin API (file: `admin-api.yaml`)

| Method | Path | Summary | Auth | Tenant | Notes |
|--------|------|---------|------|--------|-------|
| GET | `/api/v1/admin/tenants` | List tenants (cross-tenant) | SUPER_ADMIN | cross | |
| POST | `/api/v1/admin/tenants` | Create tenant | SUPER_ADMIN | — | |
| PATCH | `/api/v1/admin/tenants/{id}` | Update tenant | SUPER_ADMIN | cross | |
| POST | `/api/v1/admin/tenants/{id}/suspend` | Suspend tenant | SUPER_ADMIN | cross | |
| POST | `/api/v1/admin/tenants/{id}/reactivate` | Reactivate | SUPER_ADMIN | cross | |
| DELETE | `/api/v1/admin/tenants/{id}` | Soft-delete tenant | SUPER_ADMIN | cross | Schedules purge after retention window. |
| GET | `/api/v1/admin/users` | Cross-tenant user search | SUPER_ADMIN | cross | |
| POST | `/api/v1/admin/impersonate` | Start impersonation session | SUPER_ADMIN | — | Returns scoped token; banner enforced. Audited. |
| POST | `/api/v1/admin/impersonate/end` | End impersonation | SUPER_ADMIN | — | |
| GET | `/api/v1/admin/feature-flags` | List feature flags (global + per-tenant) | SUPER_ADMIN | cross | |
| PUT | `/api/v1/admin/feature-flags/{key}` | Set flag | SUPER_ADMIN | cross | |
| GET | `/api/v1/admin/ai-quotas` | List per-tenant quotas | SUPER_ADMIN, FINANCE_ADMIN | cross | |
| PUT | `/api/v1/admin/ai-quotas/{tenant_id}` | Set quota | SUPER_ADMIN, FINANCE_ADMIN | cross | |
| GET | `/api/v1/admin/prompts` | List prompt versions | SUPER_ADMIN | — | |
| POST | `/api/v1/admin/prompts` | Create prompt version | SUPER_ADMIN | — | |
| POST | `/api/v1/admin/prompts/{id}/promote` | Promote a version to production | SUPER_ADMIN | — | |
| GET | `/api/v1/admin/moderation/jobs` | Moderation queue (jobs) | SUPER_ADMIN, COMPLIANCE_ADMIN | cross/own | |
| POST | `/api/v1/admin/moderation/jobs/{id}/decision` | Hide / remove / dismiss | SUPER_ADMIN, COMPLIANCE_ADMIN | cross/own | |
| GET | `/api/v1/admin/audit-events` | Audit log query | varies (see RBAC) | cross/own | Filters: tenant, actor, entity_type, entity_id, time. |
| GET | `/api/v1/admin/summary` | Platform summary (stats) | SUPER_ADMIN | — | *(Existing stub returns placeholder.)* |

## 4. Cross-cutting behaviors

### 4.1 List endpoints
All recruiter-side list endpoints SHALL support:
- `?cursor=` (preferred) or `?limit=&offset=`.
- `?sort=<field>:<asc|desc>` with allowlisted fields per endpoint.
- `?q=` for keyword filter (when the endpoint supports it).
- `?status=...&...` typed filter set per endpoint.

### 4.2 Mutation endpoints
- Set `Content-Type: application/json` (or `multipart/form-data` for uploads).
- Return 201 with `Location` header on create.
- Return 200 with the updated entity on update.
- Return 204 on hard delete (rare); soft-delete returns 200 with the entity in `DELETED` state.
- Always return `ETag` on entity responses.

### 4.3 Webhooks
- Outbound webhooks (FR-23.8) are HMAC-SHA256-signed using a per-tenant secret. Signature header: `X-Jobocate-Signature: t=<unix>, v1=<hex>`. Replay window: 5 minutes.
- Inbound webhooks (Stripe) are signature-verified per the provider's spec; events are idempotent on a provider event id.

### 4.4 Rate limiting
- Per-IP for unauthenticated endpoints (login, signup, search-public).
- Per-user for authenticated endpoints with caps per role (e.g., AI generation lower than recruiter list).
- Per-tenant aggregate cap to prevent one tenant starving others.
- Headers `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` always returned.

### 4.5 CORS
- Per-app allowlist:
  - `job-portal-web` → public marketplace + candidate APIs.
  - `ats-recruiter-web` → recruiter APIs.
  - `admin-console-web` → admin APIs.
- Credentials NOT used (we use bearer tokens, not cookies, for APIs).

### 4.6 Tenant header policy
- Production: `X-Jobocate-Tenant-Id` header is **rejected** as a tenant source. Tenant comes from JWT only.
- Local dev: header is accepted iff `JOBOCATE_ALLOW_HEADER_TENANT=true`. This is enforced by the existing `TenantIdentityFilter`.

## 5. Error response standards (recap)

```json
{
  "error": {
    "code": "APPLICATION_TRANSITION_NOT_ALLOWED",
    "message": "Cannot transition application from REJECTED to APPLIED.",
    "request_id": "req_01HZJK7Q3F9VYAB2Z9C0J7VT4G",
    "correlation_id": "corr_01HZJK7Q3F9VYAB2Z9C0J7VT4G",
    "timestamp": "2026-05-13T18:25:11Z",
    "details": {
      "from": "REJECTED",
      "attempted_to": "APPLIED",
      "allowed_to": []
    }
  }
}
```

- `code` is canonical and stable (consumers may switch on it).
- `message` is human-readable and may change.
- `details` is endpoint-specific and may include validation errors keyed by field name.

## 6. Authorization summary by API group

| API group | Default protection | Notable exceptions |
|----|----|----|
| Auth | mostly public | `me`, `logout`, `change-password` require bearer. |
| Tenant | bearer; method-level role | `tenants/{slug}` exposes only public fields when actor is non-admin. |
| User | bearer; TENANT_ADMIN for grants | Self-service for own profile. |
| Candidate | bearer; CANDIDATE for own; RECRUITER+ for recruiter views | Public job page does not expose candidate data. |
| Resume | bearer; CANDIDATE for own; RECRUITER+ for application-bound access | All access audited. |
| Job | bearer for recruiter; public endpoint for PUBLISHED only | |
| Application | bearer; CANDIDATE own / RECRUITER+ tenant | All status changes audited. |
| Search | bearer for tenant search; public for marketplace | Tenant filter always applied. |
| Notification | bearer; self only | |
| Billing | bearer; FINANCE_ADMIN | Stripe webhook = signature-verified. |
| Admin | bearer; SUPER_ADMIN | Audited; impersonation banner. |

## 7. Open design questions

| # | Question | Recommendation |
|---|---|---|
| 1 | Should public job detail page accept the SEO slug or just UUID? | Both: `/jobs/public/{seo-slug}-{uuid}` and `/jobs/public/{uuid}` (canonical 301 to slug version). |
| 2 | Should resume upload be pre-signed or multipart? | Both endpoints. Frontend prefers pre-signed (offloads bytes from app servers). |
| 3 | Should bulk action be a single endpoint per resource or one global endpoint? | One per resource (`/applications/bulk-actions`) — simpler RBAC. |
| 4 | Should we expose a synchronous AI generation endpoint or only async? | Async for all. Returns 202 with poll URL; clients poll until READY_FOR_REVIEW or APPROVED. |
| 5 | Idempotency-Key TTL? | 24 hours, configurable per-tenant. |
