# MVP implementation plan

The MVP for the Recruitment Portal + ATS is broken into six
engineering milestones (`M1–M6`). Each milestone is small enough for
a 4–6 engineer team to land in 2–3 weeks, and produces a
demonstrable end-to-end slice (not "code complete"). Milestones
build on each other; the dependency edges are explicit.

The PRD MVP scope (PRD §4) is the contract this plan satisfies.
Everything outside that scope is parked in `post-mvp-roadmap.md`
(planned).

## Milestone overview

| ID | Theme | Duration (target) | Exit demo |
|---|---|---|---|
| M1 | Platform foundation | 2 wks | `pnpm`, Gradle, compose-dev, CI green; one health-check endpoint per service responds; Flyway greenfield script applies cleanly |
| M2 | Auth, tenant, RBAC | 2 wks | Recruiter signs up → invites a candidate → both log in → both see their own tenant data only |
| M3 | Job management | 2 wks | Recruiter creates → publishes → updates → closes a job; published job lands in OpenSearch index |
| M4 | Candidate profile + resume upload | 2 wks | Candidate signs up → uploads resume → parser produces structured fields → candidate reviews & accepts |
| M5 | Application workflow + recruiter review | 3 wks | Candidate applies (idempotent) → recruiter sees applicant on Kanban → moves through pipeline; status changes audited |
| M6 | Search + public job portal | 2 wks | Anonymous visitor searches public marketplace with facets → opens a job → completes apply flow |

Total runway: **~13 weeks** with the team above. Add 20% slack for
unknowns.

---

## M1 — Platform foundation

### Goals
- Repo + tooling stand up cleanly for every contributor.
- Every service / app / worker compiles, lints, and runs locally
  via a single `make` (or `pnpm`) command.
- CI runs the full matrix on every PR.

### Scope
- Monorepo (TurboRepo + pnpm) layout for `apps/`, `packages/`,
  `services-java/`, `services-go/`, `workers-python/`, `infra/`, `docs/`.
- Compose-dev profile: Postgres, Kafka (Redpanda), OpenSearch, MinIO.
- Spring Boot `platform-starter` with `TenantContext`, identity
  filters, `RequestLoggingFilter`, error envelope.
- Flyway greenfield script `infra/sql/greenfield/V1__initial_ats_schema.sql`.
- CI workflow with all gates from the testing strategy.

### Backend tasks
- `platform-starter` published as a Gradle subproject.
- One Spring Boot service skeleton per planned module (boots cleanly,
  exposes `/actuator/health`).
- Wire Flyway into every Java service.

### Frontend tasks
- `apps/job-portal-web` and `apps/ats-recruiter-web` Next.js
  skeletons (App Router, Tailwind, shadcn/ui, TanStack Query).
- `packages/api-sdk`, `packages/ui`, `packages/shared-contracts`
  established.
- One placeholder page per app that fetches `/actuator/health` from
  the matching service.

### Database tasks
- Greenfield script defines all MVP tables (or stubs them).
- Flyway runs in CI against a Testcontainers Postgres.

### Search / event tasks
- `services-go/search-gateway` skeleton with `/healthz` and `/metrics`.
- `services-java/search-orchestrator-service` skeleton with a no-op
  Kafka consumer.

### Testing tasks
- One unit test per service that fails CI when removed (smoke test).
- CI quality gates wired (see `docs/16-devops/testing-strategy.md`).
- `IntegrationTestBase` per Java service.

### Acceptance criteria
- `make up` (or `docker compose up`) brings the full stack up locally.
- `pnpm -r build` and `./gradlew build` are green.
- CI is green on `main`.
- A new contributor can onboard in < 1 day from the README.

### Risks
- Toolchain drift across machines → fix versions in `.tool-versions` /
  `pnpm-workspace.yaml`.
- CI runtime growing too long → split jobs early; cache
  pnpm/Gradle/Go modules.

### Dependencies
- None. M1 is the foundation.

---

## M2 — Auth, tenant, RBAC

### Goals
- Multi-tenant signup, login, and role assignment work end-to-end.
- Tenant isolation is enforced everywhere a tenant-scoped resource
  is touched.
- Cross-tenant access is unrepresentable in the API surface.

### Scope (PRD §3.1, §3.2)
- `tenant-auth-service`: signup (candidate), invitation flow
  (recruiter), login, refresh, password reset (email-link).
- `ats-core-service`: tenant CRUD, recruiter seat management.
- `admin-service` skeleton with `SUPER_ADMIN` listing.
- JWT issuance with `tenant_id`, `sub`, `roles` claims.
- `TenantIdentityFilter` + `InternalTokenFilter` finalized in
  `platform-starter`.
- `RequestLoggingFilter` wires `tenantId` + `userId` into MDC.

### Backend tasks
- Implement `users`, `user_roles`, `tenants`, `tenant_users` tables
  + JPA entities.
- BCrypt password hashing (strength 12).
- Refresh-token rotation; revocation table.
- `@EnableMethodSecurity`; `@PreAuthorize` on every privileged
  endpoint per the RBAC matrix.
- Internal bearer token + filter for `/internal/v1/**`.

### Frontend tasks
- Auth pages in `job-portal-web` (candidate) and `ats-recruiter-web`
  (recruiter): signup, login, forgot/reset password, accept-invite.
- Auth-aware Next.js layout + middleware that reads the JWT from a
  secure HTTP-only cookie or the Authorization header.
- 401 handler that bounces to login.

### Database tasks
- `users`, `user_roles`, `tenants`, `tenant_users`, `password_reset_tokens`,
  `refresh_tokens` tables.
- Seed data for `SUPER_ADMIN` user (env-gated, dev only).

### Search / event tasks
- Stub Kafka topic `jobocate.user.events` (created, invited, role
  changed) for downstream notifications.

### Testing tasks
- `TenantIdentityFilterTest`, `InternalTokenFilterTest`,
  `RequestLoggingFilterTest` (these are already in repo from
  Prompt 24/25 — keep them green).
- Cross-tenant tests for `tenants`, `users` endpoints.
- `WebMvcTest` for every auth controller covering the canonical error
  envelope.

### Acceptance criteria
- A recruiter can sign up, create a tenant, invite a teammate, and
  the invitee can accept and log in.
- A candidate can sign up, log in, and request a password reset.
- A request from tenant B for a resource owned by tenant A returns
  404 with the canonical error envelope.
- Every audit-relevant action writes an `audit_events` row.

### Risks
- JWT secret management → use env vars per env, doc'd in
  `security-baseline.md`.
- Email delivery for invites/reset → start with `LoggingEmailDispatcher`
  in dev/CI; SES wired only in stg/prod.

### Dependencies
- M1.

---

## M3 — Job management

### Goals
- Recruiters can manage jobs through the full lifecycle.
- Published jobs are immediately searchable via the public job
  index.

### Scope (PRD §3.5)
- `job-service` REST: create, update, publish, unpublish, close, clone.
- Outbox-backed Kafka events `job.published`, `job.updated`, `job.closed`.
- `search-orchestrator-service` consumes job events and indexes
  documents matching `packages/shared-contracts/schemas/job-index-document.schema.json`.
- Recruiter UI for the job-management lifecycle.

### Backend tasks
- `JobEntity`, `JobSkillEntity`, `JobScreeningQuestionEntity`.
- `JobCommandService` with role checks (`RECRUITER`,
  `HIRING_MANAGER`, `TENANT_ADMIN`, `SUPER_ADMIN`).
- Validation rules: required fields before publish, salary range
  sanity, location normalization.
- Outbox publisher.

### Frontend tasks
- `/recruiter/jobs` list with status filters.
- `/recruiter/jobs/new` create form (multi-step or single-page).
- `/recruiter/jobs/[id]` detail + edit + lifecycle actions.

### Database tasks
- `jobs`, `job_skills`, `job_screening_questions`, `event_outbox` (job).
- Indexes on `(tenant_id, status, published_at)`.

### Search / event tasks
- `search-orchestrator-service` listener with `@RetryableTopic` /
  `@DltHandler`.
- Job index mapping committed to `services-go/search-gateway/internal/httpserver/job_index_mapping.go`.
- Bulk `INTERNAL_BULK` index endpoint in the gateway.
- Metrics: `search.indexer.documents.indexed` / `.failed` counters.

### Testing tasks
- `JobCommandServiceTest` (Testcontainers).
- `JobControllerTest` including cross-tenant 404.
- `JobSearchProjectionListenerTest`.
- Go unit tests for index document validation.

### Acceptance criteria
- A recruiter can take a job from `DRAFT` to `CLOSED`.
- A `PUBLISHED` job appears in the search index within the indexing
  SLO (P95 < 10 s).
- A `CLOSED` job is removed from public search (or hidden).
- A request from tenant B to update tenant A's job returns 404.

### Risks
- Search index drift from job schema → enforce JSON-schema
  validation at the gateway boundary.
- Long-running indexing during bulk publish → bulk APIs + paging.

### Dependencies
- M1, M2.

---

## M4 — Candidate profile + resume upload

### Goals
- Candidates can build a profile, upload a resume, and review the
  AI-extracted fields before they hit the profile.

### Scope (PRD §3.3, §3.9)
- `candidate-service` REST for `me/profile`, `me/resumes`,
  `me/resumes/{id}/parsed-fields`.
- Resume storage in S3 (MinIO locally) with pre-signed PUT/GET.
- `resume-parser-worker` consumes `resume.uploaded`, extracts
  fields, publishes `resume.parsed`.
- Idempotent parser callbacks.
- Candidate UI for profile, resumes, and parsed-field review.

### Backend tasks
- `CandidateProfileEntity`, `ResumeEntity`, `ResumeParsedFieldsEntity`,
  `ResumeProcessedEventEntity`.
- `ResumeService` with the upload lifecycle (reserve → finalize →
  parse → review → apply/reject).
- S3 abstraction (`ResumeStorage`) with MinIO + AWS S3
  implementations.
- Internal endpoint `/internal/v1/resumes/{id}/parsed` for worker
  callbacks.
- Outbox publisher for `resume.uploaded`.

### Frontend tasks
- `/candidate/profile` view + edit form.
- `/candidate/resumes` list with default + version label.
- `/candidate/resumes/upload` multi-step (reserve, S3 PUT, finalize).
- `/candidate/resumes/[id]` view with parsed-field review actions.

### Database tasks
- `candidate_profiles`, `resumes`, `resume_parsed_fields`,
  `resume_processed_events`, `event_outbox` (candidate).

### Search / event tasks
- Topics `jobocate.resume.raw` (uploaded), `jobocate.resume.parsed`.
- Lazy `kafka` import in worker so tests don't need the runtime dep.

### Testing tasks
- `ResumeServiceTest` (Testcontainers + mock S3).
- Cross-tenant tests for `me/resumes`.
- Worker tests: `test_normalize.py`, `test_parse_event.py`,
  golden PDF / DOCX fixtures.
- E2E: candidate uploads → fields parsed → fields applied to
  profile.

### Acceptance criteria
- Candidate can upload a PDF or DOCX up to 10 MiB; invalid types /
  sizes are rejected with the canonical error envelope.
- Parser callback is idempotent (same `event_id` arriving twice
  doesn't duplicate fields).
- Parsed-field review can apply or dismiss fields without
  overwriting candidate-edited values when dismissed.
- A request from tenant B for a resume in tenant A returns 404.

### Risks
- Worker scaling under bulk upload → measure per-event time;
  horizontal scale by partition count.
- PDF/DOCX parser quality → start with OSS extractors; ratchet up
  later via vendor APIs (post-MVP).

### Dependencies
- M1, M2.

---

## M5 — Application workflow + recruiter review

### Goals
- Candidates can apply to a published job; recruiters can move the
  application through the pipeline; every transition is audited.

### Scope (PRD §3.6, §3.7, §3.8)
- `application-service` REST: submit application (idempotent),
  list mine, status transitions, withdraw.
- Pipeline (per-job, default = system pipeline) with stages.
- Application timeline + audit events.
- Outbox-backed Kafka events `application.submitted`,
  `application.status_changed`, `application.withdrawn`.
- Recruiter UI: per-job applicant list (Kanban + table), candidate
  detail with timeline + status actions, notes (basic).

### Backend tasks
- `ApplicationEntity`, `ApplicationTimelineEntryEntity`,
  `PipelineEntity`, `PipelineStageEntity`, `EventOutboxEntity` (application).
- `ApplicationService` with `Idempotency-Key` handling and the
  duplicate-application guard.
- State machine implementation matching `docs/04-workflows/application-state-machine.md`.

### Frontend tasks
- Candidate: `/jobs/[id]/apply` flow including resume picker +
  cover letter + screening questions; "your applications" view.
- Recruiter: `/recruiter/jobs/[id]/applications` with Kanban + List
  modes; `/recruiter/candidates/[id]` with timeline and status
  actions.

### Database tasks
- `applications` with `(tenant_id, job_id, candidate_id, status)`
  uniqueness on the active status set.
- `application_timeline_entries`, `pipelines`, `pipeline_stages`.

### Search / event tasks
- `notification-service` consumes `application.events` and produces
  notifications (covered in M6 scope conceptually but the topic must
  exist by M5 end).
- Application metrics: `application.submitted` / `.duplicate_blocked`
  / `.status_changed` counters.

### Testing tasks
- `ApplicationServiceTest` (Testcontainers): submit, idempotency,
  duplicate guard, state-machine transitions, withdraw, cross-tenant.
- `ApplicationControllerTest`: error envelope, idempotency
  conflict 409.
- Recruiter UI Vitest smoke tests for Kanban + status-action.

### Acceptance criteria
- A candidate can apply to a published job exactly once per
  `(candidate, job)` (duplicate POST returns 409 with
  `APPLICATION_DUPLICATE`).
- An `Idempotency-Key` collision on the same payload returns the
  original application.
- Every status change writes an audit event and emits a Kafka event.
- Cross-tenant access to an application returns 404.

### Risks
- Race conditions on duplicate submission → `(tenant_id, job_id, candidate_id)`
  unique partial index over active statuses.
- Pipeline complexity creep → ship with one default pipeline +
  per-job override; configurable stages live post-MVP.

### Dependencies
- M3, M4.

---

## M6 — Search + public job portal + notifications wiring

### Goals
- Anonymous visitors can discover and open jobs without logging in.
- The candidate apply flow integrates seamlessly with M5.
- Application status changes notify the candidate.

### Scope (PRD §3.4, §3.11, §3.16)
- Public `/v1/search/jobs` and `/v1/search/jobs/autocomplete` in
  `search-gateway` (anonymous, but tenant-attributed when called by a
  signed-in user).
- Public job portal (`apps/job-portal-web`):
  - `/jobs` search results with filter sidebar, facets, pagination,
    sort.
  - `/jobs/[id]` SEO-friendly job detail with apply CTA.
- `notification-service` end-to-end:
  - Consumes `application.events`, `job.events`.
  - Produces `APPLICATION_SUBMITTED`, `APPLICATION_STATUS_CHANGED`
    notifications via in-app + email (LoggingEmailDispatcher in
    dev).
  - Per-user preferences + rate limits.

### Backend tasks
- Tenant-aware vs anonymous search: when a tenant header is absent
  on `/v1/search/jobs`, the gateway returns only `PUBLIC` jobs.
  When it's present, scoping is enforced.
- Notification idempotency table; `@RetryableTopic` on listeners.

### Frontend tasks
- Public job search with URL-driven filter state for SEO + share-ability.
- Job detail page with structured-data (JSON-LD `JobPosting`) for
  search engines.
- Candidate "you have a notification" indicator (in-app).

### Database tasks
- `notifications`, `notification_preferences`,
  `notification_processed_events` (already created in M5 if M5 ships
  the topic; otherwise here).

### Search / event tasks
- Verify `term: { tenant_id }` filter applies only when caller
  supplies a tenant; verify `status: PUBLISHED` filter for anonymous
  callers.
- Autocomplete endpoint warms via the orchestrator's existing index
  pipeline.

### Testing tasks
- Go: `searchHandlerTests` covering anonymous vs tenant-scoped
  paths.
- Search relevance NDCG harness on a small golden corpus (10 jobs,
  10 queries) — the bar is "fixture results don't move".
- Playwright e2e: anonymous visitor → search → apply path.

### Acceptance criteria
- An anonymous visitor can search the marketplace, open a job, and
  start the apply flow (which prompts login).
- A logged-in candidate's status change triggers a notification
  visible in `/candidate/notifications` within 60 s (P95).
- The notification rate limiter caps `JOB_ALERT` at 6/hr per
  user/type.
- All five `*CrossTenant*` test classes are green.

### Risks
- SEO regressions on dynamic pages → use Next.js SSG/ISR for job
  detail; verify on staging with Lighthouse.
- Notification fan-out during bulk status changes → consumer
  throughput sized for 50 evt/sec; batch where possible.

### Dependencies
- M3, M5.

---

## Cross-cutting workstreams (run in parallel through M1–M6)

### Observability
- Implement the metrics in `docs/15-observability/observability-plan.md`
  §5 incrementally — by M6 every counter named "Planned" should be
  emitted at least in dev.
- Wire the Grafana dashboards listed in §8 against compose-dev
  Prometheus.

### Multi-tenancy
- Every PR that touches a tenant-scoped surface must include a
  cross-tenant test (CI gate).
- The `tenancy-strategy.md` checklist (DB, Kafka, OS, S3, logs) is a
  PR-template item.

### Security
- Every milestone closes a chunk of the security-baseline checklist:
  M1 = filters & TLS, M2 = JWT & RBAC, M3-M5 = method security on
  business endpoints, M6 = file-upload limits, rate limits, CORS.

### Compliance / audit
- `audit_events` writes start in M2 (auth) and grow with each
  milestone. M6 ships the candidate "data export" placeholder
  endpoint (post-MVP completes the full export).

### Documentation
- Every milestone updates `docs/<area>/README.md` checklists from
  Planned → Done.
- API contracts in `packages/shared-contracts/openapi/` are the
  source of truth — every backend change ships an OpenAPI delta.

---

## Post-MVP (out of scope — see `post-mvp-roadmap.md` planned)

Per PRD §4.2: AI resume tailoring, AI cover letter, AI job matching,
interview scheduling, offer management, resume database (recruiter
search), billing/subscriptions, sponsored jobs, advanced analytics,
enterprise SSO. Some scaffolding (`ai-artifact-worker`,
`AiArtifactService`) already exists from Prompt 23 to keep the
post-MVP runway short.

## Risk register

| Risk | Likelihood | Impact | Owner | Mitigation |
|---|---|---|---|---|
| Toolchain version drift | M | M | Platform | Pin versions in `.tool-versions`, `pnpm-workspace.yaml`, Gradle wrapper. |
| Search relevance regression | M | H | Search | Golden NDCG harness in CI (M3+). |
| Resume parser quality | H | M | AI | Start with OSS, ratchet up via vendor parsing post-MVP. |
| Email deliverability | M | H | Platform | LoggingEmailDispatcher for dev; SES with SPF/DKIM/DMARC for stg/prod. |
| Outbox backlog under load | L | H | Platform | Alert at > 100 backlog rows / 5 min; backpressure + scaling runbook. |
| OpenSearch index drift | M | H | Search | Schema validation at gateway boundary; reindex job in `infra/`. |
| JWT secret leakage | L | C | Security | Secrets via env / KMS only; rotation runbook; zero secrets in git (gitleaks gate). |
| Cross-tenant leak | L | C | Platform | Mandatory cross-tenant tests in CI; quarterly red-team. |

## Definition of done (MVP)

The MVP is "done" when every checkbox below is true on `main`:

- [ ] All six milestones' acceptance criteria are demonstrably met
      in a recorded end-to-end run.
- [ ] CI is green on `main` for two consecutive nightlies.
- [ ] Every cross-tenant test class listed in
      `docs/09-multi-tenancy/cross-tenant-test-plan.md` is present
      and green.
- [ ] Every Java service exposes `/actuator/health` and
      `/actuator/prometheus`; every Go service exposes `/healthz` +
      `/metrics`; every Python worker exposes `/healthz`.
- [ ] At least one Grafana dashboard panel exists for each
      observability §8 dashboard.
- [ ] OpenAPI contracts in `packages/shared-contracts/openapi/` are
      consistent with the running services (verified by SDK build +
      type-check).
- [ ] Security baseline checklist is closed (see
      `docs/08-security/security-baseline.md`).
- [ ] Multi-tenancy strategy checklist is closed (see
      `docs/09-multi-tenancy/tenancy-strategy.md`).
- [ ] The "definition of done" demo script runs end-to-end against
      a fresh greenfield database.
