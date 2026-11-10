# Database design (PostgreSQL)

> **Document type:** Physical schema design for the multi-tenant ATS on PostgreSQL 16.
> **Audience:** Backend engineers writing JPA entities and Flyway migrations.
> **Pairs with:** [`domain-model.md`](./domain-model.md) (logical), [`16-devops/coding-standards.md`](../16-devops/coding-standards.md) (SQL/Flyway conventions).
> **Note:** This document specifies the *design*. The SQL migration (`V1__initial_ats_schema.sql`) is generated separately per Prompt 14 and committed under each owning service.

## 1. Database topology

For MVP we run **one logical database** (`jobocate`) with one schema (`public`) and **per-service Flyway histories** (so Flyway tables don't collide). Each service owns its own tables and is the only writer.

```
PostgreSQL: jobocate
└── schema: public
    ├── tables owned by ats-core-service          (flyway_ats_core_schema_history)
    ├── tables owned by candidate-service         (flyway_candidate_schema_history)
    ├── tables owned by job-service               (flyway_job_schema_history)
    ├── tables owned by application-service       (flyway_application_schema_history)
    ├── tables owned by tenant-auth-service       (flyway_auth_schema_history)
    ├── tables owned by notification-service      (flyway_notification_schema_history)
    ├── tables owned by admin-service             (flyway_admin_schema_history)
    ├── tables owned by future billing-service    (flyway_billing_schema_history)
    └── partitioned audit table (audit-service)   (flyway_audit_schema_history)
```

**Cross-service reads** are permitted (joins are useful for now); **cross-service writes are forbidden** — only the owning service writes its tables. When a service grows beyond the modular monolith, splitting the database means splitting these table groups.

## 2. Universal column conventions

Every table SHALL include:

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| `id` | `UUID` | required, PK | UUID v4, generated server-side. |
| `tenant_id` | `UUID` | NOT NULL on tenant-scoped tables | Indexed; foreign key to `tenants(id)` only on critical tables (FK enforcement is a perf trade-off — see §6). |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | UTC. |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | Updated by JPA `@PreUpdate` (preferred) or DB trigger. Choose **one** mechanism per service to avoid double-bumps. |
| `created_by_user_id` | `UUID` | nullable | NULL for system-generated rows. |
| `updated_by_user_id` | `UUID` | nullable | NULL for system updates. |
| `version` | `BIGINT` | `NOT NULL DEFAULT 0` | Mapped to JPA `@Version`. |
| `deleted_at` | `TIMESTAMPTZ` | nullable, only on soft-delete-enabled tables | When NOT NULL, queries must filter unless explicitly including. |

**Append-only tables** (`audit_events`, `application_timeline_entries`, `consent_records`, `usage_records`) omit `updated_at`, `updated_by_user_id`, `version`, and `deleted_at`.

## 3. Indexing baseline

All tenant-scoped tables SHALL have at minimum:

- `CREATE INDEX idx_<table>_tenant ON <table> (tenant_id);` — drop this only if all queries already include the tenant in another composite index.
- A composite index on `(tenant_id, status)` for tables with a `status` column queried with both predicates.
- Indexes on every FK column referenced in queries.
- Unique indexes for natural keys (e.g., `(tenant_id, slug)` for jobs).

Use `pg_stat_statements` and `pg_stat_all_indexes` after one month of production load to add or remove indexes; design for read patterns, not for "more indexes is safer".

## 4. Table catalog

> Below: `PK` = primary key, `FK` = foreign key, `UQ` = unique, `IX` = index. Column data types follow Postgres conventions; JPA mapping notes appear inline where they affect schema choices.

### 4.1 Identity & Tenancy (owned by `ats-core-service` and `tenant-auth-service`)

#### `tenants` (owned by `ats-core-service`)
| Column | Type | Notes |
|--------|------|-------|
| `id` (PK) | `UUID` | |
| `slug` (UQ) | `VARCHAR(128)` | URL-safe; case-insensitive unique. |
| `legal_name` | `VARCHAR(256)` | |
| `display_name` | `VARCHAR(256)` | |
| `status` | `VARCHAR(32)` | `ACTIVE`, `SUSPENDED`, `DELETED` |
| `time_zone` | `VARCHAR(64)` | IANA tz; default `UTC`. |
| `default_locale` | `VARCHAR(16)` | BCP-47; default `en-US`. |
| `logo_url` | `TEXT` | |
| `primary_domain` | `VARCHAR(256)` | |
| `brand_color_primary` | `VARCHAR(16)` | hex. |
| `brand_color_accent` | `VARCHAR(16)` | hex. |
| `billing_email` | `VARCHAR(320)` | |
| `support_email` | `VARCHAR(320)` | |
| audit columns | | except `tenant_id` (this *is* the tenant) and `deleted_at`. |

**Indexes:** `IX (status)`, `IX (created_at)`. **Note:** the existing `V1__tenants.sql` already creates a small subset; an additive `V2__tenants_expand.sql` will fill the gaps.

#### `users` (owned by `tenant-auth-service`)
| Column | Type | Notes |
|--------|------|-------|
| `id` (PK) | `UUID` | |
| `email` (UQ) | `VARCHAR(320)` | Stored lowercased; unique global. |
| `password_hash` | `VARCHAR(255)` | Argon2id (preferred) or bcrypt. NULL for SSO-only users. |
| `email_verified_at` | `TIMESTAMPTZ` | |
| `mfa_enabled` | `BOOLEAN NOT NULL DEFAULT false` | |
| `last_login_at` | `TIMESTAMPTZ` | |
| `locked_until` | `TIMESTAMPTZ` | brute-force lockout. |
| `failed_login_count` | `INT NOT NULL DEFAULT 0` | |
| `display_name` | `VARCHAR(256)` | |
| `avatar_url` | `TEXT` | |
| `time_zone` | `VARCHAR(64)` | |
| `locale` | `VARCHAR(16)` | |
| audit columns | | no `tenant_id` (User is global). |

**Indexes:** `UQ lower(email)`, `IX (last_login_at)`.

#### `user_roles` (owned by `tenant-auth-service`)
| Column | Type | Notes |
|--------|------|-------|
| `id` (PK) | `UUID` | |
| `user_id` (FK → `users.id`) | `UUID NOT NULL` | |
| `tenant_id` (FK → `tenants.id`) | `UUID NOT NULL` | |
| `role` | `VARCHAR(32) NOT NULL` | enum value (FR-2 roles) |
| `granted_by_user_id` | `UUID` | |
| `granted_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` | |
| `revoked_at` | `TIMESTAMPTZ` | NULL = active grant. |

**Constraints:** `UQ (user_id, tenant_id, role) WHERE revoked_at IS NULL` (partial unique). **Indexes:** `IX (user_id)`, `IX (tenant_id, role)`.

### 4.2 Candidate (owned by `candidate-service`)

#### `candidate_profiles`
| Column | Type | Notes |
|--------|------|-------|
| `id` (PK) | `UUID` | |
| `user_id` (FK → `users.id`) | `UUID` | NULL for recruiter-imported. |
| `tenant_id` | `UUID` | NULL for marketplace-only profile. |
| `full_name` | `VARCHAR(512) NOT NULL` | |
| `headline` | `VARCHAR(512)` | |
| `email` | `VARCHAR(320) NOT NULL` | |
| `phone` | `VARCHAR(64)` | |
| `location_city` | `VARCHAR(128)` | |
| `location_region` | `VARCHAR(128)` | |
| `location_country` | `VARCHAR(64)` | ISO-3166-1 alpha-2 preferred. |
| `summary` | `TEXT` | |
| `desired_role` | `VARCHAR(256)` | |
| `salary_expectation_min_cents` | `BIGINT` | |
| `salary_expectation_max_cents` | `BIGINT` | |
| `currency_code` | `CHAR(3)` | |
| `availability` | `VARCHAR(32)` | enum |
| `work_authorization` | `VARCHAR(64)` | |
| `links` | `JSONB` | `{ "linkedin": "...", "github": "...", ... }` |
| `profile_visibility` | `VARCHAR(32) NOT NULL DEFAULT 'PRIVATE'` | enum |
| `consent_searchable` | `BOOLEAN NOT NULL DEFAULT false` | |
| audit + `deleted_at` | | |

**Constraints:** `UQ (tenant_id, lower(email)) WHERE tenant_id IS NOT NULL` (existing migration covers this for the simpler tenant-scoped row). For marketplace candidates use `UQ lower(email) WHERE tenant_id IS NULL` (separate partial unique). **Indexes:** `IX (tenant_id)`, `IX (consent_searchable, profile_visibility)`, `IX (location_country, location_region)`, `IX (created_at DESC)`.

#### `candidate_work_experiences`
`id, candidate_profile_id (FK NOT NULL), company_name, title, started_at DATE, ended_at DATE NULL, current BOOL, description TEXT, skills TEXT[]`. **IX:** `(candidate_profile_id)`.

#### `candidate_educations`
`id, candidate_profile_id, institution, degree, field_of_study, started_at, ended_at, gpa NUMERIC(3,2)`. **IX:** `(candidate_profile_id)`.

#### `candidate_certifications`
`id, candidate_profile_id, name, issuer, issued_at, expires_at, credential_url`. **IX:** `(candidate_profile_id)`.

#### `resumes`
| Column | Type | Notes |
|--------|------|-------|
| `id` (PK) | `UUID` | |
| `candidate_profile_id` (FK) | `UUID NOT NULL` | |
| `tenant_id` | `UUID` | |
| `original_filename` | `VARCHAR(512)` | |
| `mime_type` | `VARCHAR(128)` | |
| `size_bytes` | `BIGINT` | |
| `s3_key` | `TEXT NOT NULL` | `tenants/{tenant_id}/candidates/{candidate_id}/resumes/{id}/{version}.{ext}` |
| `version_label` | `VARCHAR(64)` | optional human label. |
| `is_default` | `BOOLEAN NOT NULL DEFAULT false` | |
| `parser_status` | `VARCHAR(32) NOT NULL DEFAULT 'PENDING'` | `PENDING`, `PARSED`, `FAILED` |
| `parsed_at` | `TIMESTAMPTZ` | |
| `parser_error` | `TEXT` | |
| audit (no `deleted_at`) | | |

**Constraints:** `UQ (candidate_profile_id) WHERE is_default = true` (partial unique to enforce single default). **Indexes:** `IX (candidate_profile_id)`, `IX (parser_status, created_at)`.

#### `resume_variants`
`id, resume_id (FK NOT NULL), for_job_id, s3_key TEXT, prompt_version, model_version, status (DRAFT/READY_FOR_REVIEW/APPROVED/REJECTED/ARCHIVED), created_by_user_id, approved_by_user_id, approved_at, audit columns`. **IX:** `(resume_id)`, `(for_job_id, status)`.

#### `consent_records`
| Column | Type | Notes |
|--------|------|-------|
| `id` (PK) | `UUID` | |
| `user_id` (FK → `users.id`) | `UUID NOT NULL` | |
| `tenant_id` | `UUID` | NULL for global consents (e.g., AI tools, marketing). |
| `consent_kind` | `VARCHAR(64) NOT NULL` | `SEARCHABLE`, `AI_TOOLS`, `MARKETING`, `DATA_PROCESSING_TOS` |
| `consent_value` | `BOOLEAN NOT NULL` | |
| `policy_version` | `VARCHAR(64)` | |
| `source` | `VARCHAR(32)` | `SIGNUP_PAGE`, `SETTINGS_PAGE`, `APPLY_FLOW`, `IMPORT` |
| `ip_address` | `INET` | optional |
| `user_agent` | `TEXT` | optional |
| `recorded_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` | |

**Append-only.** **Indexes:** `IX (user_id, consent_kind, recorded_at DESC)`, `IX (tenant_id, consent_kind, recorded_at DESC)`.

#### `saved_searches`, `alert_subscriptions`
Standard CRUD tables. **IX** on `(user_id)`.

### 4.3 Job (owned by `job-service`)

#### `jobs` (extends existing `V1__jobs.sql`)
| Column | Type | Notes |
|--------|------|-------|
| `id` (PK) | `UUID` | |
| `tenant_id` (NOT NULL) | `UUID` | |
| `organization_id` (NOT NULL) | `UUID` | For MVP, defaults to a tenant-default org id. |
| `title` (NOT NULL) | `TEXT` | |
| `slug` | `VARCHAR(256)` | UQ within `(tenant_id, slug)`. |
| `department` | `VARCHAR(256)` | |
| `description` | `TEXT` | |
| `responsibilities` | `TEXT` | |
| `qualifications` | `TEXT` | |
| `employment_type` | `VARCHAR(32)` | enum |
| `remote_policy` | `VARCHAR(32)` | enum |
| `experience_min_years` | `INT` | |
| `experience_max_years` | `INT` | |
| `salary_min_cents` | `BIGINT` | |
| `salary_max_cents` | `BIGINT` | |
| `currency_code` | `CHAR(3)` | |
| `location_city` | `VARCHAR(128)` | |
| `location_region` | `VARCHAR(128)` | |
| `location_country` | `VARCHAR(64)` | |
| `status` (NOT NULL) | `VARCHAR(32)` | `DRAFT`, `PUBLISHED`, `CLOSED`, `ARCHIVED` |
| `published_at` | `TIMESTAMPTZ` | |
| `closed_at` | `TIMESTAMPTZ` | |
| `pipeline_id` | `UUID` | nullable; falls back to tenant default at apply time. |
| `boost_score` | `INT NOT NULL DEFAULT 0` | sponsored ranking boost. |
| audit + `deleted_at` | | |

**Constraints:** `UQ (tenant_id, slug) WHERE deleted_at IS NULL`. **Indexes:** existing `IX (tenant_id)`, `IX (tenant_id, status)`; add `IX (status, published_at DESC) WHERE status = 'PUBLISHED'`, `IX (tenant_id, location_country, location_region)`.

#### `job_skills`
`(job_id, skill_name, requirement)`. PK = `(job_id, skill_name)`. **IX:** `(skill_name)` for cross-job skill aggregations (when permitted by RBAC).

#### `screening_questions`
`id, job_id, position INT NOT NULL, question_text, question_type, options JSONB NULL, required BOOL, disqualifying_answer JSONB NULL`. **IX:** `(job_id, position)`.

#### `hiring_team_members`
`(job_id, user_id, team_role)`. PK = composite. **IX:** `(user_id)`.

### 4.4 Application & Pipeline (owned by `application-service`)

#### `pipelines`
`id, tenant_id, name, is_default BOOL, audit + deleted_at + version`. **Constraint:** `UQ (tenant_id) WHERE is_default = true` to enforce exactly one default per tenant.

#### `pipeline_stages`
`id, pipeline_id, position INT, name, color VARCHAR(16), disabled BOOL, audit`. **IX:** `(pipeline_id, position)`. **Constraint:** `UQ (pipeline_id, position)`.

#### `applications` (extends existing `V1__applications.sql`)
| Column | Type | Notes |
|--------|------|-------|
| `id` (PK) | `UUID` | |
| `tenant_id` (NOT NULL) | `UUID` | |
| `job_id` (NOT NULL) | `UUID` | |
| `candidate_profile_id` (NOT NULL) | `UUID` | |
| `resume_id_used` | `UUID` | references resumes.id at apply time (snapshot). |
| `cover_letter_text` | `TEXT` | |
| `screening_answers` | `JSONB` | keyed by question id. |
| `status` (NOT NULL) | `VARCHAR(32)` | FR-6 enum. |
| `current_stage_id` | `UUID` | nullable until first non-terminal stage move. |
| `source` | `VARCHAR(32)` | `DIRECT`, `JOB_BOARD`, `IMPORT`, `REFERRAL` |
| `applied_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` | |
| `submitted_via_idempotency_key` | `VARCHAR(128)` | |
| audit + version | | |

**Constraints:**
- `UQ (tenant_id, job_id, candidate_profile_id) WHERE status NOT IN ('REJECTED','WITHDRAWN','EXPIRED','HIRED')` — at most one non-terminal application per job per candidate per tenant. (Postgres partial unique index.)
- `UQ (tenant_id, submitted_via_idempotency_key) WHERE submitted_via_idempotency_key IS NOT NULL` — idempotency per tenant.

**Indexes:** existing `IX (tenant_id)`, `IX (tenant_id, job_id)`, `IX (tenant_id, candidate_profile_id)`; add `IX (tenant_id, status, updated_at DESC)`.

#### `application_timeline_entries` (append-only)
`id, application_id, tenant_id, entry_type, from_value, to_value, actor_user_id, actor_role, metadata JSONB, created_at`. **IX:** `(application_id, created_at DESC)`, `(tenant_id, created_at DESC)`.

#### `application_notes`
`id, application_id, tenant_id, author_user_id, body_md TEXT, mentioned_user_ids UUID[], audit + deleted_at`. **IX:** `(application_id, created_at DESC)`.

#### `application_tags`
`id, application_id, tenant_id, tag CITEXT NOT NULL, created_by_user_id, created_at`. **Constraint:** `UQ (application_id, tag)`. **IX:** `(tenant_id, tag)`.

#### `application_ratings`
`id, application_id, rater_user_id, score SMALLINT, audit`. **Constraint:** `UQ (application_id, rater_user_id)`.

### 4.5 Interview & Offer (post-MVP — design now, ship later)

`interviews`, `interview_participants`, `interview_feedback`, `offers`, `offer_approvals`, `offer_documents` follow the same column conventions; full column lists deferred until those services are built.

### 4.6 Notification (owned by `notification-service`)

#### `notifications`
`id, tenant_id (nullable), recipient_user_id, type, channel, status, payload JSONB, attempt_count INT, last_attempted_at, last_error TEXT, created_at, read_at`. **IX:** `(recipient_user_id, created_at DESC)`, `(status, last_attempted_at)` for retry workers, `(tenant_id, type)`.

#### `notification_preferences`
`id, user_id, tenant_id (nullable), notification_type, channel, enabled BOOL, cadence`. **Constraint:** `UQ (user_id, COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid), notification_type, channel)`.

### 4.7 AI artifact (metadata stored alongside owning aggregate; stored in `application-service` for MVP)

#### `ai_artifacts`
`id, tenant_id, kind, subject_entity_type, subject_entity_id, prompt_version, model_version, inputs_json JSONB, output_text TEXT NULL, output_s3_key TEXT NULL, status, created_by_user_id, approved_by_user_id, approved_at, audit + version`. **IX:** `(tenant_id, kind, status)`, `(subject_entity_type, subject_entity_id)`.

### 4.8 Audit (owned by audit module — readable by `admin-service`)

#### `audit_events` (partitioned)
| Column | Type | Notes |
|--------|------|-------|
| `id` (PK) | `UUID` | |
| `tenant_id` | `UUID` | NULL only for Super-Admin platform actions. |
| `actor_user_id` | `UUID` | |
| `actor_role` | `VARCHAR(32)` | |
| `action` | `VARCHAR(64) NOT NULL` | e.g., `JOB_PUBLISHED`. |
| `entity_type` | `VARCHAR(64) NOT NULL` | |
| `entity_id` | `UUID` | |
| `correlation_id` | `UUID` | |
| `request_id` | `VARCHAR(128)` | |
| `ip_address` | `INET` | |
| `user_agent` | `TEXT` | |
| `metadata` | `JSONB` | structured before/after as needed. |
| `occurred_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` | partition key. |

**Append-only.** **Partitioning:** declarative monthly range partitions on `occurred_at` once volume crosses ~5M rows/month. Initial unpartitioned table is acceptable; switching to partitioned later requires a documented migration with downtime window or `pg_partman`.

**Indexes:**
- `IX (tenant_id, occurred_at DESC)`
- `IX (entity_type, entity_id, occurred_at DESC)`
- `IX (actor_user_id, occurred_at DESC)`
- `IX (correlation_id)`
- BRIN on `occurred_at` for the partitioned variant.

**Permissions:** application roles get `INSERT` only. Compliance retention purges run as a separate role with `DELETE` capability.

### 4.9 Outbox (owned by every service that publishes events)

#### `<service>_event_outbox` (per-service table)

> Because all services currently share the `public` schema, outbox tables are name-qualified by the owning service: `job_event_outbox`, `application_event_outbox`, etc. When a service splits to its own database, the qualifier may be dropped.
| Column | Type | Notes |
|--------|------|-------|
| `id` (PK) | `UUID` | |
| `aggregate_type` | `VARCHAR(64) NOT NULL` | e.g., `Application`, `Job`. |
| `aggregate_id` | `UUID NOT NULL` | |
| `tenant_id` | `UUID` | |
| `event_type` | `VARCHAR(128) NOT NULL` | e.g., `application.submitted`. |
| `payload` | `JSONB NOT NULL` | the full event body. |
| `headers` | `JSONB` | Kafka headers (correlation, idempotency, etc.). |
| `status` | `VARCHAR(16) NOT NULL DEFAULT 'PENDING'` | `PENDING`, `PUBLISHED`, `FAILED`. |
| `attempt_count` | `INT NOT NULL DEFAULT 0` | |
| `next_attempt_at` | `TIMESTAMPTZ` | |
| `last_error` | `TEXT` | |
| `created_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` | |
| `published_at` | `TIMESTAMPTZ` | |

**Indexes:** `IX (status, next_attempt_at)` for the publisher loop.

A dedicated **outbox publisher** (in-process scheduled task) reads `PENDING` rows in tenant order, publishes to Kafka, marks `PUBLISHED`, and retries `FAILED` with exponential backoff. The write of the row is in the **same DB transaction** as the domain change, ensuring consistency.

### 4.10 Subscription & billing (post-MVP)

`subscription_plans` (global), `tenant_subscriptions`, `invoices`, `usage_records` — same column conventions; full SQL deferred.

## 5. Tenant isolation strategy

- **Application enforcement (primary):** every JPA repository method that touches a tenant-scoped table includes `tenant_id` in WHERE; every write sets `tenant_id` from `TenantContext` (never from a request DTO).
- **DB-level enforcement (defense in depth, post-MVP):** add Postgres **Row-Level Security (RLS)** policies on tenant-scoped tables that read `current_setting('app.tenant_id')`. Set this GUC at connection-checkout time from the JDBC `Connection` based on `TenantContext`. If RLS is enabled, every connection must set the GUC or queries return zero rows.
- **Search isolation:** the gateway always adds the tenant filter; client-supplied filters are merged on top.
- **S3 isolation:** all keys are prefixed `tenants/{tenant_id}/...`.
- **Kafka isolation:** all events carry `tenant_id` in the payload (and optionally headers). Topics are not partitioned by tenant for now (volume-driven decision later).

## 6. Foreign key strategy

- **Within a service**: enforce FKs.
- **Across services**: do **not** add cross-service FKs (e.g., `applications.job_id → jobs.id`) when the services are intended to split. Use application-level integrity (lookups + validation) and rely on Kafka events for eventual consistency. For MVP (modular monolith), cross-service FKs are acceptable and removable later.
- **Cascades**: avoid `ON DELETE CASCADE` for tenant-scoped data. Use soft-delete on the parent and ignore orphans (or a scheduled cleanup job).

## 7. Soft delete strategy

- Add `deleted_at TIMESTAMPTZ` only where retention requires it (e.g., `tenants`, `jobs`, `pipelines`, `application_notes`, `candidate_profiles`).
- Append-only tables (`audit_events`, `application_timeline_entries`, `consent_records`, `usage_records`) never get soft delete.
- Hard delete is reserved for compliance purges run by Compliance Admin (DSAR delete) and tenant retention sweeps.
- All read queries SHALL filter `deleted_at IS NULL` by default; explicit "include deleted" flag required to bypass.

## 8. Audit strategy

- Every write API SHALL emit an audit row in the same DB transaction. Implementation: a thin `AuditWriter` injected into every service that calls `INSERT INTO audit_events ...` synchronously. This keeps the audit guarantee tight without round-tripping Kafka.
- The audit row's `correlation_id` matches the inbound request's `X-Correlation-Id` (auto-generated if absent).
- Auditable actions are enumerated in [`08-security/security-baseline.md`](../08-security/security-baseline.md#audit).

## 9. Optimistic locking

- Use JPA `@Version` on aggregate roots only (`Tenant`, `User`, `Job`, `Application`, `Pipeline`, `Resume`, `Offer`, etc.).
- Sub-aggregates do not need their own `@Version` — concurrency is controlled at the aggregate root.
- 409 Conflict is returned to clients on `OptimisticLockException`; the response includes the conflicting entity's current version.

## 10. ID strategy

- UUID v4 generated server-side. Do not generate at the DB level (`uuid_generate_v4()`) — generate in the JVM so the entity has its id before INSERT, simplifying outbox writes.
- Don't expose internal sequence ids; always use UUIDs in URLs.
- For external display only, derive a short slug (e.g., `J-7K2L` from a Hashids of the UUID) where users will type or share.

## 11. Money and currency

- Always store cents as `BIGINT` and currency as `CHAR(3)` (ISO-4217). Never store floats.
- Mixed-currency reporting requires a separate `currency_rates` table (FX) with timestamped daily rates — not in MVP.

## 12. Time and time zones

- All `TIMESTAMPTZ`, all written as UTC.
- User-displayed times are formatted in the user's `time_zone`.
- `DATE` (not `TIMESTAMPTZ`) for date-only fields like work-experience start/end and offer start dates.

## 13. JSONB conventions

- Use `JSONB` (not `JSON`) for flexibility-heavy columns (`screening_answers`, `links`, `metadata`, `payload`, `inputs_json`).
- Add a GIN index only when querying inside the JSON; otherwise the column is opaque from the DB's perspective.
- Keep JSONB shapes documented in this folder; treat them as schemas (consider JSON Schema files when shapes harden).

## 14. Flyway migration strategy

| Aspect | Convention |
|--------|------------|
| Location | `src/main/resources/db/migration/` per owning service. |
| Naming | `V<n>__<snake_case_description>.sql`. Versions are per-service, monotonic, never re-numbered. |
| One change per migration | Each migration does one logical thing. Splitting a feature into multiple V-files is fine. |
| Idempotency | Migrations SHALL be deterministic; do not embed `now()`-based seeds. |
| Backwards-compat | Additive only inside a release; destructive changes require a two-deploy plan (add column → backfill → switch reads → drop old column). |
| Per-service histories | `flyway.schemas=public`; `flyway.table=flyway_<service>_schema_history`. Already in use. |
| Seed data | Demo seeds live in clearly named V-files (e.g., `V2__seed_demo_jobs.sql`); production deploys disable seed migrations via Flyway placeholders (`-- flyway:skip:if env != local`). |
| Order across services | Documented in each service's README; e.g., `ats-core-service.tenants` must exist before any tenant-scoped table is queried. (For MVP, services that share the DB also share Flyway visibility — but each tracks its own history.) |
| The big bang (V1) | Per Prompt 14, an `application-service`-owned `V1__initial_ats_schema.sql` may be authored as the consolidated MVP schema across modules **only** when starting fresh; in this repo we already have V1s per service so the new doc reflects an *additive* migration plan. |

### 14.1 Migration plan (additive on top of current state)

Existing migrations: `tenants V1`, `candidates V1`, `jobs V1+V2+V3`, `applications V1`. We will *add* per service:

| Service | New migrations |
|---------|----------------|
| `ats-core-service` | `V2__tenants_expand.sql` (logo/branding/billing email/version/audit columns), `V3__user_roles.sql` (or move to auth service if preferred). |
| `tenant-auth-service` | `V1__users.sql`, `V2__user_roles.sql`. |
| `candidate-service` | `V2__candidate_profile_expand.sql`, `V3__work_experiences_education_certifications.sql`, `V4__resumes.sql`, `V5__resume_variants.sql`, `V6__consent_records.sql`, `V7__saved_searches_alerts.sql`. |
| `job-service` | `V4__jobs_expand.sql` (slug, organization_id, pipeline_id, boost_score, audit), `V5__job_skills.sql`, `V6__screening_questions.sql`, `V7__hiring_team_members.sql`, `V8__event_outbox.sql`. |
| `application-service` | `V2__pipelines.sql`, `V3__pipeline_stages.sql`, `V4__applications_expand.sql` (resume_id_used, cover letter, screening answers, idempotency key, version, audit), `V5__application_timeline_entries.sql`, `V6__application_notes.sql`, `V7__application_tags.sql`, `V8__application_ratings.sql`, `V9__ai_artifacts.sql`, `V10__event_outbox.sql`. |
| `notification-service` | `V1__notifications.sql`, `V2__notification_preferences.sql`. |
| `admin-service` (or new audit module) | `V1__audit_events.sql`. |

Prompt 14 emits the consolidated **`V1__initial_ats_schema.sql`** intended for a brand-new database (a useful artifact for greenfield environments). For *this* repo, we additionally produce the additive V-files above so we don't re-baseline an existing dev DB.

## 15. Retention defaults (sketch — finalized in Compliance docs)

| Data | Default retention | Notes |
|------|-------------------|-------|
| `applications` | 7 years after terminal state | Per recruiting industry norms; tenant-configurable down to 2 years. |
| `resumes` (binary) | Same as `applications` | Soft-delete then S3 lifecycle to archive then expire. |
| `candidate_profiles` (orphan, no applications) | 2 years inactive | Deletable on DSAR. |
| `audit_events` | 7 years | Compliance-driven; never deleted by application. |
| `notifications` | 90 days | Then archive, then purge. |
| `analytics_events` | 13 months | For YoY comparisons. |

## 16. Common queries (sketch)

```sql
-- "List my open jobs by recency for tenant T"
SELECT id, title, status, published_at FROM jobs
WHERE tenant_id = :tenant AND status = 'PUBLISHED' AND deleted_at IS NULL
ORDER BY published_at DESC LIMIT 25 OFFSET 0;

-- "Dedupe non-terminal application"
SELECT id FROM applications
WHERE tenant_id = :tenant AND job_id = :job AND candidate_profile_id = :cand
  AND status NOT IN ('REJECTED','WITHDRAWN','EXPIRED','HIRED')
LIMIT 1;

-- "Recent timeline entries for an application"
SELECT entry_type, from_value, to_value, actor_user_id, created_at
FROM application_timeline_entries
WHERE application_id = :app AND tenant_id = :tenant
ORDER BY created_at DESC LIMIT 100;
```

These queries inform the indexes recommended above.

## 17. Open issues

| # | Issue | Recommendation |
|---|-------|----------------|
| 1 | Per-service Flyway sharing one DB makes table ownership boundaries social, not enforced. | Acceptable for MVP. When splitting to multiple DBs, add a script that copies tables and switches each service's `SPRING_DATASOURCE_URL`. |
| 2 | Status enum drift (e.g., `application-service` currently writes `SUBMITTED` instead of `APPLIED`). | Normalize on canonical FR-6 enum in Prompt 15 implementation. |
| 3 | `audit_events` write coupling. | Inject `AuditWriter` everywhere; keep cross-service in mind but synchronous DB write is acceptable while modular monolith. |
| 4 | RLS adoption. | Defer past MVP; keep application-side enforcement strong and the cross-tenant test suite enforcing. |
