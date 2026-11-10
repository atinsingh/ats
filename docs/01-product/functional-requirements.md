# Functional requirements

> **Document type:** Functional requirements (FR) document for the multi-tenant Recruitment Portal + ATS platform.
> **Audience:** Product, engineering (backend, frontend, search, AI, infra), QA, security, compliance.
> **Status:** Authoritative for MVP scope. Acceptance criteria are testable. Module classifications (MVP / Post-MVP) feed the [`mvp-implementation-plan.md`](../18-roadmap/mvp-implementation-plan.md).
> **Conformance keywords:** "shall", "must" = mandatory. "should" = strongly recommended. "may" = optional.

## 0. Glossary

| Term | Definition |
|------|------------|
| **Tenant** | A customer organization (employer or staffing agency). Owns recruiters, jobs, candidates, applications, billing. |
| **Organization** | Synonym for tenant in customer-facing copy; in the data model `tenant` is the canonical name. |
| **Job** (a.k.a. requisition) | An open role posted by a tenant to attract candidates. |
| **Application** | A specific candidate's submission to a specific job. |
| **Candidate** | A person who has a profile in the platform. May exist outside any tenant (marketplace candidate) or be tenant-imported. |
| **Pipeline** | An ordered set of stages through which an application moves. |
| **Resume / CV** | A document representing the candidate's experience. Multiple resumes per candidate; multiple AI variants per resume. |
| **AI artifact** | Any AI-generated content: resume variant, cover letter, candidate summary, match explanation, interview Q&A. |
| **Tenant Admin** | Customer-side admin (manages users, branding, billing, pipelines). |
| **Super Admin** | Platform-side admin (manages tenants, feature flags, AI quotas, abuse). |
| **Idempotency-Key** | Header that ensures a mutating request can be retried safely without duplicating effects. |

## 1. Personas

| Persona | Goals | Primary surface |
|---------|-------|------------------|
| **Job seeker / Candidate** | Find jobs, apply quickly, track status, get help from AI without losing control. | `job-portal-web` |
| **Recruiter** | Source, screen, advance, and hire candidates efficiently across many jobs. | `ats-recruiter-web` |
| **Hiring Manager** | Review shortlists, give decisions, participate in interviews. | `ats-recruiter-web` (limited views) |
| **Interviewer** | Run interviews, submit scorecards. | `ats-recruiter-web` (interview-only views) |
| **Tenant Admin** | Manage users, branding, pipelines, billing settings. | `ats-recruiter-web` admin section |
| **Super Admin** | Manage the platform: tenants, feature flags, AI quotas, abuse, billing flags. | `admin-console-web` |
| **Finance Admin** | Subscriptions, invoices, payments, reports. | `admin-console-web` finance section |
| **Compliance Admin** | Audit logs, privacy requests, retention, exports. | `admin-console-web` compliance section |

## 2. Module map

The platform is described in 24 functional modules (FR-1 through FR-24). Each module section follows the same format:

- **Description** — what the module does and for whom.
- **Functional requirements** — numbered behaviors (FR-x.y).
- **Acceptance criteria** — testable assertions.
- **MVP / Post-MVP** — scope classification.
- **Notes** — implementation pointers and current as-is references.

---

## FR-1. Tenant & Organization Management

### Description
Multi-tenant isolation is the foundation of the platform. Each tenant operates independently with its own jobs, candidates, recruiters, billing, search index slice, and audit stream.

### Functional requirements
- **FR-1.1** The system shall create, update, suspend, and soft-delete tenants.
- **FR-1.2** Tenant profile shall include: legal name, display name, slug (URL-safe, unique), logo URL, primary domain, brand colors, time zone, default locale, billing contact, support contact.
- **FR-1.3** Tenant configuration shall include per-tenant entitlements: job posting limits, recruiter seat count, AI credit allowance, resume database access flag, sponsored slot count.
- **FR-1.4** Every business entity (jobs, candidates, applications, resumes, notes, pipelines, etc.) shall carry `tenant_id` and respect tenant scope on read and write.
- **FR-1.5** Tenant suspension shall block recruiter activity (read + write) while preserving all data and producing an audit event.
- **FR-1.6** Tenant deletion shall be soft (`deleted_at`) and trigger an asynchronous tenant data purge job after a configurable retention window.
- **FR-1.7** Super Admins shall be able to assume a tenant context (with audit), to investigate issues. The original Super Admin identity must be present in every audit row even while assuming a tenant.

### Acceptance criteria
- A user authenticated to Tenant A receives 401/403 (or empty result) for any read or write of Tenant B data, **on every API**.
- Suspending a tenant returns 403 on recruiter writes within ≤ 5 seconds of suspension.
- Tenant Admin cannot read another tenant's data even with a forged `X-Jobocate-Tenant-Id` header (header is rejected when `JOBOCATE_ALLOW_HEADER_TENANT=false`).
- All tenant lifecycle changes (create, suspend, resume, delete) are persisted as audit events containing actor, before/after status, and timestamp.

### MVP / Post-MVP
- **MVP:** Create, update, suspend, soft-delete, list. Per-tenant entitlement skeleton (recruiter seats, job postings).
- **Post-MVP:** AI quotas, sponsored slot count, branding pages, "assume tenant" flow.

### Notes
- See [`09-multi-tenancy/tenancy-strategy.md`](../09-multi-tenancy/) for the cross-cutting strategy.
- As-is: `ats-core-service` exposes `GET /api/v1/tenants/me` and `GET /api/v1/tenants/{slug}`; tenant table seeded with the demo tenant. Suspension/delete endpoints, per-tenant entitlements, and admin tenant CRUD are not implemented yet.

---

## FR-2. Authentication & Authorization

### Description
Identity, session lifecycle, and authorization for all six (target eight) roles. JWT with short-lived access tokens and longer-lived refresh tokens. Future enterprise SSO via OIDC.

### Functional requirements
- **FR-2.1** The system shall support candidate self-service registration with email/password.
- **FR-2.2** The system shall support invitation-based onboarding for recruiters, hiring managers, interviewers, tenant admins, finance admins, and compliance admins.
- **FR-2.3** Email verification shall be required before a candidate can apply, and before any tenant-side user can take destructive actions.
- **FR-2.4** Forgot-password and reset-password flows shall be supported with tokens that expire within 30 minutes and are single-use.
- **FR-2.5** Authentication shall use JWT bearer tokens; access tokens expire ≤ 60 minutes; refresh tokens expire within a configurable window (default 30 days), bound to device fingerprint and revocable.
- **FR-2.6** Authorization shall use role-based access control (RBAC). Roles must be present as JWT claims (`roles: ["RECRUITER","HIRING_MANAGER"]`) — never inferred from request body.
- **FR-2.7** A user may hold multiple roles within a single tenant. A user may also hold roles in multiple tenants and select an active tenant on login.
- **FR-2.8** The platform shall support enterprise SSO via OIDC for Tenant-configured IdPs (Okta, Azure AD, Google Workspace).
- **FR-2.9** Sessions shall be revocable by the user (logout this device / logout all) and by Super/Tenant Admins (force logout user).
- **FR-2.10** Brute-force protection: after N failed login attempts (configurable), the account is throttled with exponential backoff and the events are audited.

### Roles (canonical)
- `SUPER_ADMIN`
- `TENANT_ADMIN`
- `RECRUITER`
- `HIRING_MANAGER`
- `INTERVIEWER`
- `CANDIDATE`
- `FINANCE_ADMIN`
- `COMPLIANCE_ADMIN`

### Acceptance criteria
- Protected APIs return 401 for missing/invalid token and 403 for insufficient role.
- Candidate users cannot reach any `/api/v1/recruiter/*` or admin endpoint.
- Recruiter users cannot reach any `/api/v1/admin/*` or platform-level endpoint.
- Refresh token rotation invalidates the previous refresh token on use; reuse triggers full session revocation and audit event.
- Forgot-password tokens cannot be used twice and cannot be used after expiry.
- A login from a new device for a user with strict policy generates an alert email.

### MVP / Post-MVP
- **MVP:** Email/password, candidate self-signup, recruiter invitations, JWT with refresh, basic RBAC, forgot-password.
- **Post-MVP:** Enterprise OIDC, MFA, device fingerprinting, brute-force backoff, session list & revoke UI.

### Notes
- As-is: `tenant-auth-service` issues HS256 demo tokens with `tenant_id` and `subject` claims only — **no roles**, no refresh, no signup, no password reset. The PRD's full auth model is a major build.

---

## FR-3. Candidate Portal

### Description
The authenticated candidate workspace inside `job-portal-web` for profile, resumes, applications, alerts, and AI assistance.

### Functional requirements
- **FR-3.1** Candidate signup with email/password and optional social login (post-MVP).
- **FR-3.2** Candidate profile fields: full name, headline, location, phone, social links, summary, desired role, desired salary range, work authorization, availability, preferred work modes (remote/hybrid/onsite).
- **FR-3.3** Resume upload (PDF, DOC, DOCX) up to 10 MB; multiple resumes per candidate; default-resume designation.
- **FR-3.4** Resume parsing extracts skills, work experience, education, certifications, languages, contact details. Candidate may review and correct extracted fields; corrections persist back to the structured profile.
- **FR-3.5** Work experience CRUD (company, title, start, end, current flag, description, skills).
- **FR-3.6** Education CRUD (institution, degree, field of study, start, end, GPA optional).
- **FR-3.7** Certifications CRUD (name, issuer, issued date, expiry date, credential URL).
- **FR-3.8** Saved jobs (heart/star) with view of saved list.
- **FR-3.9** Application history showing every application with current status and timeline.
- **FR-3.10** Saved searches with optional alerts (immediate, daily digest, weekly digest).
- **FR-3.11** Job alerts honor user notification preferences and run on schedule.
- **FR-3.12** Candidate privacy controls: profile visibility (PUBLIC, TENANT_ONLY, PRIVATE), consent for recruiter searchability (boolean), opt-out of AI assistance (boolean).
- **FR-3.13** AI tools available to the candidate: resume tailoring per job, cover letter draft, fit explanation, interview prep Q&A. All AI output is editable and requires explicit submit before going to the recruiter.
- **FR-3.14** Candidate may withdraw an application at any non-terminal state.

### Acceptance criteria
- Candidate can complete profile, upload at least one resume, and successfully apply to a published job in a single session.
- Candidate cannot apply twice to the same job (enforced server-side).
- Candidate can revoke recruiter visibility; within ≤ 60 s the candidate document is removed from the recruiter resume database search index.
- Candidate sees their full application history with stage and last-updated timestamp.
- AI-tailored resume / cover letter sits in DRAFT until the candidate explicitly submits.

### MVP / Post-MVP
- **MVP:** Signup, profile, resume upload + parsing review, work/education/certs CRUD, saved jobs, application history, withdraw, basic privacy controls.
- **Post-MVP:** Saved searches with scheduled alerts, AI assistance, social login, profile visibility = recruiter searchable.

### Notes
- As-is: `candidate-service` exposes a list endpoint only; no profile CRUD, no resume linkage, no consent fields. Major build.

---

## FR-4. Job Marketplace / Public Job Portal

### Description
The unauthenticated public surface where candidates discover jobs, view details, and start the apply flow.

### Functional requirements
- **FR-4.1** Public job listing (`/jobs`) with keyword search, faceted filters, and pagination.
- **FR-4.2** Public job detail (`/jobs/[id]`) with structured `JobPosting` schema.org metadata for SEO.
- **FR-4.3** Filters: location (city/region/country/remote), salary range, experience range, employment type, remote policy, company, skills, posted-within window.
- **FR-4.4** Sort by relevance (default), date posted (newest), salary (highest), match score (when authenticated).
- **FR-4.5** SEO-friendly URLs: `/jobs/[seo-slug]-[id]`. `robots.txt` and `sitemap.xml` updated daily.
- **FR-4.6** Featured jobs and sponsored jobs may receive ranking boost via the index `boost_score`; ranking transparency: a "Sponsored" label is shown.
- **FR-4.7** "Similar jobs" panel uses lexical+vector similarity from the search service.
- **FR-4.8** Apply CTA on job detail. Unauthenticated apply routes through register/login then resumes the apply.
- **FR-4.9** "Report this job" CTA submits the job to the moderation queue (FR-20).
- **FR-4.10** Closed, draft, expired, and tenant-suspended jobs are not returned in any public search or detail page (return 404 publicly).

### Acceptance criteria
- An unauthenticated user can complete a search → job detail → apply CTA → register → apply flow without losing context.
- Closed and draft jobs return 404 to unauthenticated users.
- The SERP returns results within P95 ≤ 500 ms (indexed).
- Sponsored jobs are visibly labeled "Sponsored" and never bypass tenant or status filters.

### MVP / Post-MVP
- **MVP:** Listing, detail, keyword search, location/employment-type/remote-policy filters, sort by relevance/date, SEO slugs.
- **Post-MVP:** Salary/experience filters, similar jobs, sponsored slots, report job, sitemap automation, structured-data schema.org tags.

### Notes
- As-is: `job-portal-web` has `/jobs` (BFF→gateway) and `/jobs/[id]` (api-sdk→job-service). Filter UI is minimal; SEO slugs not implemented.

---

## FR-5. Job Management

### Description
Recruiter-facing job lifecycle.

### Functional requirements
- **FR-5.1** Create job (DRAFT status) with: title, department, location, employment type, remote policy, experience range (years min/max), salary range (min/max + currency), description, responsibilities, qualifications, skills (tag list), screening questions (zero or more).
- **FR-5.2** Save job as draft at any time without validation gates.
- **FR-5.3** Edit job in any non-final state.
- **FR-5.4** Publish job (DRAFT → PUBLISHED) requires all required fields and triggers the indexing pipeline.
- **FR-5.5** Unpublish job (PUBLISHED → DRAFT) removes it from public search within ≤ 60 s.
- **FR-5.6** Close job (PUBLISHED → CLOSED) freezes new applications, retains existing applications.
- **FR-5.7** Clone job duplicates fields into a new DRAFT, with title suffix " (Copy)".
- **FR-5.8** Assign hiring team: zero or more recruiters and hiring managers, each with role per-job.
- **FR-5.9** View job performance: views, apply clicks, applications received, conversion rates, time-on-page.
- **FR-5.10** Per-job pipeline override (uses tenant default unless overridden).
- **FR-5.11** Status transitions emit Kafka events (`job.created`, `job.published`, `job.updated`, `job.closed`, `job.reopened`) via the outbox.

### Acceptance criteria
- Draft jobs are not searchable publicly and not returned by the gateway.
- Publishing a job results in an indexed document within ≤ 5 s.
- Updating a published job re-indexes within ≤ 5 s with the new content.
- Closing a job removes it from public search within ≤ 60 s.
- Recruiter without permission to a job (not on hiring team and not Tenant Admin) receives 403 on edit/publish/close.

### MVP / Post-MVP
- **MVP:** Create, edit, publish, close, list, basic performance counters (views, apply clicks).
- **Post-MVP:** Clone, screening questions, per-job pipeline override, hiring team assignment, full performance dashboard.

### Notes
- As-is: `job-service` supports list (open), get, create (DRAFT default? actually defaults to OPEN per current code) — hexagonal layout already in place. Publish/unpublish/close/clone/screening questions/hiring team are unimplemented.

---

## FR-6. Application Management

### Description
Candidate application lifecycle from submission through outcome.

### Functional requirements
- **FR-6.1** Apply to a job using a selected resume (default if not specified).
- **FR-6.2** Optional cover letter (free text or AI-drafted).
- **FR-6.3** Answer all screening questions if present (required questions cannot be skipped).
- **FR-6.4** Server-side duplicate prevention: a candidate may have at most one non-terminal application per (tenant, job).
- **FR-6.5** Submitting an application requires the `Idempotency-Key` header; reuse with the same payload returns the existing application; reuse with different payload returns 409.
- **FR-6.6** Application creates an immutable timeline entry on every status change (recruiter or candidate or system action).
- **FR-6.7** Recruiter may transition application across pipeline stages (subject to allowed transitions per FR-7).
- **FR-6.8** Recruiter may reject an application with a disposition reason from the tenant's catalog.
- **FR-6.9** Candidate may withdraw an application at any non-terminal state.
- **FR-6.10** Every application status transition emits a Kafka event (`application.<event>`) via the outbox and an audit row.
- **FR-6.11** Standard application states: `DRAFT`, `APPLIED`, `SCREENING`, `SHORTLISTED`, `INTERVIEW_SCHEDULED`, `INTERVIEWED`, `OFFERED`, `HIRED`, `REJECTED`, `WITHDRAWN`, `EXPIRED`. Terminal: `HIRED`, `REJECTED`, `WITHDRAWN`, `EXPIRED`.

### Acceptance criteria
- Duplicate apply attempts return `409 CONFLICT` with code `APPLICATION_DUPLICATE` and the existing application id.
- Submission without `Idempotency-Key` returns `400` with code `IDEMPOTENCY_KEY_REQUIRED`.
- Every transition appears in the candidate's application timeline within ≤ 2 s.
- Recruiter can see the full timeline (states, actor, timestamp, optional reason).
- Withdraw is final: subsequent recruiter transition attempts return 409.

### MVP / Post-MVP
- **MVP:** Apply, withdraw, recruiter transition (full state machine), duplicate prevention, idempotency, timeline, Kafka publish via outbox.
- **Post-MVP:** Disposition reason catalog editor, automated `EXPIRED` job, batch transitions, attachment-based applications (CSV import).

### Notes
- See [`04-workflows/application-state-machine.md`](../04-workflows/application-state-machine.md) for the full state machine (transitions, side effects, events).
- As-is: `application-service` accepts POST with status defaulting to `SUBMITTED` (a non-canonical state — to be normalized to `APPLIED`), publishes `APPLICATION_SUBMITTED` directly (no outbox). No timeline, no idempotency, no duplicate check.

---

## FR-7. Recruiter ATS Workspace

### Description
Recruiter-facing tools to manage jobs, applicants, pipelines, and team collaboration.

### Functional requirements
- **FR-7.1** Recruiter dashboard: today's tasks, recently active jobs, candidates needing review, pipeline summaries.
- **FR-7.2** Job-wise applicant list with filters (stage, source, score, tag) and sort (date, score, last activity).
- **FR-7.3** Candidate kanban board grouped by pipeline stage with drag-and-drop transitions.
- **FR-7.4** Candidate table view with the same filters/sort.
- **FR-7.5** Candidate profile view: header (name, current title, location), resume viewer, AI summary panel (when available), notes, history, ratings, mentions.
- **FR-7.6** Resume viewer renders PDF in-browser; DOC/DOCX rendered as text fallback.
- **FR-7.7** Notes and comments on candidate-application: rich text, mentions of teammates, reactions.
- **FR-7.8** Candidate tags (free-form per tenant) and rating (1–5 stars or thumbs up/down).
- **FR-7.9** Shortlist action moves application to `SHORTLISTED`.
- **FR-7.10** Bulk actions: tag, move stage, reject (with reason), assign owner. Subject to per-action role permissions.
- **FR-7.11** Mention a teammate triggers an in-app + email notification (per recipient preferences).
- **FR-7.12** Activity log per application: every recruiter action timestamped.
- **FR-7.13** AI-generated candidate summary visible (clearly labeled), with "Regenerate" and "Hide" options.

### Acceptance criteria
- Recruiter can switch kanban ↔ list view without losing filter state.
- Notes are tenant-scoped and audited.
- Bulk actions enforce per-row role check (do not silently skip; report partial success with per-row reasons).
- Mentioning a teammate not on the hiring team for that job is allowed if both are in the same tenant; teammate visibility is governed by RBAC.

### MVP / Post-MVP
- **MVP:** Dashboard (basic), job applicant list, candidate profile view, resume viewer (PDF), notes, basic tagging, simple bulk reject.
- **Post-MVP:** Kanban board, mentions with notifications, ratings, full bulk-action suite, AI summary panel, AI shortlist suggestions.

### Notes
- As-is: `ats-recruiter-web` is a static stub; nothing here is built. All API support is also unbuilt.

---

## FR-8. Pipeline & Stage Management

### Description
Configurable hiring pipelines per tenant and per job.

### Functional requirements
- **FR-8.1** Tenant default pipeline created on tenant onboarding with seed stages: New, Screening, Interview, Offer, Hired, Rejected.
- **FR-8.2** Per-job pipeline overrides default; jobs inherit tenant default if no override.
- **FR-8.3** Stage CRUD: name, color, position, optional auto-action (e.g., send template), disable flag.
- **FR-8.4** Move applications between stages records transition history (from, to, actor, timestamp, optional reason).
- **FR-8.5** Disabled stages cannot receive new candidates; existing candidates remain.
- **FR-8.6** Rejection reasons (disposition codes) are tenant-configurable; rejection requires choosing a code.
- **FR-8.7** Stage change emits Kafka event (`application.stage_changed`) and triggers configured notifications.
- **FR-8.8** Time-in-stage analytics computed per pipeline.

### Acceptance criteria
- Each job has exactly one active pipeline at any time.
- Moving a candidate updates current stage atomically with timeline entry and event emission.
- Reordering stages persists immediately and is audited.
- Disabling a stage with active candidates surfaces the count and requires confirmation.

### MVP / Post-MVP
- **MVP:** Tenant default pipeline (seeded), basic stage CRUD, application move with history.
- **Post-MVP:** Per-job override, stage auto-actions, disposition code editor, time-in-stage analytics.

### Notes
- Not yet implemented. Persisting pipelines as a tenant-owned aggregate (with per-job snapshot at apply time to avoid retroactive shifts) is the recommended model.

---

## FR-9. Resume Management

### Description
Secure storage, parsing, and versioning of candidate resumes.

### Functional requirements
- **FR-9.1** Resume upload from candidate portal accepts PDF, DOC, DOCX up to 10 MB.
- **FR-9.2** Server validates content type by both MIME and magic bytes; rejects with `415` on mismatch.
- **FR-9.3** Resumes are stored under `s3://{bucket}/tenants/{tenant_id}/candidates/{candidate_id}/resumes/{resume_id}/{version}.{ext}`.
- **FR-9.4** Each upload creates a new resume row (immutable) and links to the candidate.
- **FR-9.5** Resume parsing pipeline extracts: name, email, phone, location, links, skills, work history, education, certifications.
- **FR-9.6** Parsed fields are exposed for candidate review/correction; corrections write to the structured profile, not the original resume.
- **FR-9.7** AI-generated resume variants (per-job tailored) are stored as separate AI artifacts (FR-12) but reference the source resume id.
- **FR-9.8** When a candidate applies, the application records the **specific resume version** used at submit time; later edits to the resume do not retroactively change the application's snapshot.

### Acceptance criteria
- Upload of an oversized or wrong-type file returns `413` or `415` with a clear error envelope.
- Parsing failures surface a "Could not parse — please review and edit" UI; the application can still proceed with the raw file attached.
- Each application page on the recruiter side shows which resume version was used.

### MVP / Post-MVP
- **MVP:** Upload, store, list, link to application snapshot. Real parser worker (replace stub).
- **Post-MVP:** AI variants, multiple versions per resume, automatic skill extraction with confidence scores.

### Notes
- As-is: `resume-ingestion-service` is an HTTP→Kafka forwarder that does **not** read S3. `resume-parser-worker` returns deterministic stub output. Both need to be replaced with real implementations.

---

## FR-10. Resume Database

### Description
Recruiter search over candidate profiles that have opted-in.

### Functional requirements
- **FR-10.1** Candidates have `profile_visibility` of `PUBLIC` (visible to all tenants), `TENANT_ONLY` (visible only to tenants the candidate has applied to), or `PRIVATE` (not searchable by recruiters).
- **FR-10.2** Candidates have a separate `consent_searchable` boolean that must be true for inclusion in any recruiter search.
- **FR-10.3** Recruiter search filters: skills, location, experience range, salary expectation, availability, education, certifications, tags, last active.
- **FR-10.4** Recruiter may save candidates to a tenant-scoped shortlist with notes and tags.
- **FR-10.5** Recruiter may contact a candidate where allowed by visibility settings; contact attempts are rate-limited and audited.
- **FR-10.6** Recruiter export of candidate data is gated by tenant entitlement and Compliance Admin policy.
- **FR-10.7** Candidate consent revocation removes the candidate from the recruiter database within ≤ 60 s.

### Acceptance criteria
- A candidate with `consent_searchable=false` does not appear in any recruiter search, regardless of other filters.
- A candidate with `profile_visibility=TENANT_ONLY` only appears in searches by tenants where the candidate has at least one application.
- Consent revocation is reflected in the search index within ≤ 60 s; the recruiter UI shows "no longer available" if a previously visible candidate has revoked.

### MVP / Post-MVP
- **MVP (lite):** Schema for visibility + consent on candidate profile; recruiter search disabled by feature flag.
- **Post-MVP:** Full recruiter database search UI, contact flows, exports.

### Notes
- See FR-11 (Search) for the search architecture; the candidate index has its own JSON Schema in `packages/shared-contracts/schemas/candidate-index-document.schema.json`.

---

## FR-11. Search & Filtering

### Description
Fast, scalable search for jobs and candidates via OpenSearch through the Go `search-gateway`.

### Functional requirements
- **FR-11.1** Job search supports: keyword (multi-match on title^3, description, skills), filters (see FR-4 list), sort (relevance, date, salary, match score), pagination (limit≤100, offset≤10000), facets (employment type, remote policy, company, location, skills).
- **FR-11.2** Candidate search supports: keyword, filters (FR-10), sort, pagination, facets (skills, location, experience, certifications). Always tenant- and consent-filtered.
- **FR-11.3** Autocomplete: `/v1/autocomplete/jobs` returns up to 10 suggestions for a tenant + prefix in ≤ 100 ms P95.
- **FR-11.4** Hybrid retrieval: lexical filtering is authoritative; vector similarity boosts matching results when an embedding is supplied.
- **FR-11.5** All search queries enforce tenant filter inside the gateway; client tenant header is for routing/cache only, not authoritative.
- **FR-11.6** Search analytics: every query is logged with tenant, query string (hashed), filters, hit count, click position (if reported by client). Queries containing PII (email/phone) are masked.

### Acceptance criteria
- Job search returns within P95 ≤ 500 ms for warm queries.
- Autocomplete returns within P95 ≤ 100 ms.
- Tenant A's recruiter cannot retrieve jobs or candidates from Tenant B even with manipulated filters.
- Adding an unknown filter key does not break the request — the gateway ignores unknown keys until the contract is extended (consistent with current `recruiter-search-gateway.yaml`).
- Switching from lexical to hybrid (with vector) changes ranking but never changes the filter result set.

### MVP / Post-MVP
- **MVP:** Job search (already partially built), facets for employment type and remote policy, tenant filter, basic autocomplete.
- **Post-MVP:** Candidate search, hybrid embedding boost, search analytics dashboard, A/B ranking experiments.

### Notes
- See [`06-search-engine/search-architecture.md`](../06-search-engine/search-architecture.md).
- As-is: `search-gateway` already implements job search with kNN; index mappings created on startup. Candidate search index does not exist yet.

---

## FR-12. AI-Assisted Job Seeker Features

### Description
AI tools that help candidates prepare better applications, with mandatory human review.

### Functional requirements
- **FR-12.1** AI job matching: rank a candidate's saved/recent jobs by fit score using profile + resume embeddings.
- **FR-12.2** AI fit explanation: per-job natural language summary of why the candidate matches (skill alignment, experience match, gaps).
- **FR-12.3** AI resume tailoring: generates a per-job resume variant; the candidate must approve before it can be selected at apply time.
- **FR-12.4** AI cover letter draft: per-job draft; editable; approval required to attach.
- **FR-12.5** AI application packet: bundles tailored resume + cover letter + screening answers as drafts for batch review.
- **FR-12.6** AI interview preparation: practice Q&A grounded in the JD and the candidate's profile.
- **FR-12.7** AI mock Q&A: the candidate answers, model returns suggested improvements (no scoring sent to the recruiter).
- **FR-12.8** Every AI artifact records prompt version, model version, input references, status, `created_by`, `created_at`. Approved artifacts also record approver and approval time.
- **FR-12.9** Per-tenant and per-user quotas; quota exhaustion returns 429 with reset time.
- **FR-12.10** AI usage logged for billing and abuse detection.

### Acceptance criteria
- AI-generated content sits in `DRAFT` until the candidate explicitly submits/approves it.
- Submission of an AI-tailored resume cannot bypass the approval step (server-side check).
- Quota exhaustion returns `429` with `X-RateLimit-Reset` header.
- Disabling AI for a tenant (kill switch) returns `403` with code `AI_DISABLED` immediately.

### MVP / Post-MVP
- **MVP:** None (quality bar too high for MVP — feature flag off by default).
- **Post-MVP:** Cover letter draft, fit explanation, resume tailoring, interview prep.

### Notes
- See [`07-ai-platform/ai-artifact-platform.md`](../07-ai-platform/) for artifact lifecycle and contracts.

---

## FR-13. AI-Assisted Recruiter Features

### Description
AI productivity tools for recruiters, all clearly labeled and never auto-deciding.

### Functional requirements
- **FR-13.1** AI candidate summary: short structured summary of a candidate for a specific job.
- **FR-13.2** AI resume score: 0–100 with rationale; never auto-rejects.
- **FR-13.3** AI job-candidate match score: hybrid lexical + embedding similarity.
- **FR-13.4** AI skill gap analysis: list of JD-required skills the candidate appears to lack.
- **FR-13.5** AI screening question suggestions when creating a job.
- **FR-13.6** AI interview question generation per job + candidate profile.
- **FR-13.7** AI email draft generation (outreach, scheduling, rejection).
- **FR-13.8** AI rejection email draft with rationale and tone control.
- **FR-13.9** AI shortlist recommendations (suggested candidates per job).
- **FR-13.10** AI duplicate candidate detection across the tenant.

### Acceptance criteria
- All AI outputs are visibly labeled "AI-generated" in the UI.
- Recruiter actions on AI suggestions (accept, edit, reject) are audited.
- AI scoring is advisory only; no transition is automatic.

### MVP / Post-MVP
- **MVP:** None.
- **Post-MVP:** Candidate summary, match score, rejection email draft.

### Notes
- See FR-12 for the shared AI artifact platform.

---

## FR-14. Interview Management

### Description
Schedule, conduct, and evaluate interviews.

### Functional requirements
- **FR-14.1** Schedule interview: type (phone, video, onsite), interviewers, candidate, time window, duration, location or meeting link.
- **FR-14.2** Calendar integration with Google Calendar and Microsoft Outlook (OAuth per user) — post-MVP fallback is a generated `.ics`.
- **FR-14.3** Send interview invitation email to candidate and interviewers; candidate may accept or request reschedule.
- **FR-14.4** Reschedule interview: keeps the interview ID and history.
- **FR-14.5** Cancel interview with reason.
- **FR-14.6** Interview feedback form per interviewer: structured scorecard with custom criteria per job, free-text comment, recommendation (Strong Hire, Hire, No Hire, Strong No Hire).
- **FR-14.7** Visibility of feedback: only Hiring Manager + Recruiter can see other interviewers' feedback after submission to reduce bias.
- **FR-14.8** Interview status visible in candidate timeline and on candidate profile.

### Acceptance criteria
- Interview invite is sent to candidate and all interviewers within ≤ 30 s of scheduling.
- Feedback submission moves the candidate's interview status to `INTERVIEWED` once all required interviewers submit.
- Reschedule preserves the interview id and writes a history entry.

### MVP / Post-MVP
- **MVP:** None.
- **Post-MVP (Phase B+/C):** Schedule + invite + ICS, feedback form, scorecards, visibility rules. Calendar OAuth in a later phase.

### Notes
- Major build — depends on candidate, application, notification, and calendar integration.

---

## FR-15. Offer Management

### Description
Create, approve, send, and track offers.

### Functional requirements
- **FR-15.1** Create offer linked to an application: title, salary, currency, start date, terms, attachments (offer letter PDF).
- **FR-15.2** Internal approval workflow: configurable approvers (e.g., Hiring Manager → Tenant Admin); each approver receives an in-app + email notification.
- **FR-15.3** Send offer to candidate via secure link (signed URL with expiry).
- **FR-15.4** Candidate accepts or declines; signature optional (e-signature out of scope for MVP).
- **FR-15.5** Accepted offer transitions application to `HIRED`; declined offer returns the application to `INTERVIEWED` or moves to `REJECTED` per recruiter choice.
- **FR-15.6** Offer audit trail: every change (draft edits, approver decisions, send/accept/decline) recorded.

### Acceptance criteria
- Offer cannot be sent without all required fields and at least one approver decision.
- Accepting an offer creates the application transition to `HIRED` exactly once even on retry (idempotent).
- Offer link expires per configurable window and cannot be reused after acceptance/decline.

### MVP / Post-MVP
- **MVP:** None.
- **Post-MVP:** Full offer flow.

---

## FR-16. Notifications & Alerts

### Description
Channel-agnostic notifications for users.

### Functional requirements
- **FR-16.1** Notification types include (non-exhaustive): `APPLICATION_SUBMITTED`, `APPLICATION_STATUS_CHANGED`, `INTERVIEW_SCHEDULED`, `INTERVIEW_REMINDER`, `JOB_ALERT`, `AI_DRAFT_READY`, `OFFER_SENT`, `MENTION`.
- **FR-16.2** Channels: email (always), in-app (always), SMS (post-MVP).
- **FR-16.3** Per-user notification preferences with per-channel opt-in and per-type frequency (immediate, daily digest, off).
- **FR-16.4** Saved-search alerts run on schedule (immediate / daily / weekly) per user preference.
- **FR-16.5** Rate limit per user per type; suppress duplicates within configurable window.
- **FR-16.6** Digest emails group multiple events per cadence.
- **FR-16.7** All outbound notifications written to an audit/notification table with status (queued, sent, failed, suppressed) and last error.
- **FR-16.8** Failed deliveries are retried with exponential backoff up to a maximum (configurable).

### Acceptance criteria
- Disabling email for a notification type prevents email delivery within ≤ 5 s of preference change.
- A `JOB_ALERT` digest contains only jobs the user has not already seen.
- Notification audit row exists for every send attempt.

### MVP / Post-MVP
- **MVP:** Application status change emails (transactional), in-app inbox skeleton, basic preferences.
- **Post-MVP:** Saved-search alerts, digests, mention notifications, SMS.

### Notes
- As-is: `notification-service` is a stub Kafka consumer that only logs. Major build.

---

## FR-17. Employer / Company Features

### Description
Tenant-side employer presence and hiring activities.

### Functional requirements
- **FR-17.1** Employer signup creates a tenant + Tenant Admin user.
- **FR-17.2** Company profile: logo, website, description, industry, headquarters, size, social links, photos.
- **FR-17.3** Public company page (`/companies/[slug]`) lists all published jobs.
- **FR-17.4** Job detail pages display the company branding (logo, name, link to company page).
- **FR-17.5** Manage job visibility (public, private link, post to specific channels).
- **FR-17.6** View per-job performance (FR-5.9) and per-tenant funnel (applications → interviews → offers → hires).
- **FR-17.7** Buy sponsored placement (FR-14 billing).
- **FR-17.8** Manage recruiter seats (within plan limit).
- **FR-17.9** Manage billing plan (FR-19).

### Acceptance criteria
- Company page lists only published, non-expired jobs of that tenant.
- Tenant Admin can update branding without redeploy; changes are live within ≤ 30 s.
- Sponsored jobs receive ranking boost without bypassing tenant or status filters.

### MVP / Post-MVP
- **MVP:** Employer signup, company profile, basic public company page, job branding.
- **Post-MVP:** Funnel analytics, sponsored placement, recruiter seat self-service.

---

## FR-18. Admin Console

### Description
Platform-level (Super Admin) and tenant-level (Tenant Admin) administration in `admin-console-web`.

### Functional requirements
- **FR-18.1** View / create / suspend / delete tenants (Super Admin).
- **FR-18.2** View / impersonate users with audit (Super Admin); reset password as user (with audit).
- **FR-18.3** Manage subscriptions and billing flags (Finance Admin).
- **FR-18.4** Configure feature flags per tenant or globally (Super Admin).
- **FR-18.5** Configure AI quotas per tenant (Super Admin).
- **FR-18.6** Manage prompt versions (Super Admin) — versioned, A/B-able, rollback-able.
- **FR-18.7** View abuse reports queue (Compliance + Super Admin) and act (dismiss, hide, escalate).
- **FR-18.8** Moderate suspicious jobs (hide, remove, ban poster).
- **FR-18.9** View audit logs by tenant / actor / entity / time range; export to CSV.
- **FR-18.10** View platform analytics (Super Admin) — total tenants, MRR proxy, active jobs, applications/day.

### Acceptance criteria
- Every Super Admin action is audited.
- Tenant impersonation banner is visible at all times in the impersonating session.
- Audit log queries scoped to a tenant return only that tenant's rows for Tenant Admin / Compliance Admin; Super Admin can view across tenants.

### MVP / Post-MVP
- **MVP:** Tenant list + create + suspend; user list within tenant.
- **Post-MVP:** Feature flags, AI quotas, prompt registry, moderation queue, full analytics.

### Notes
- As-is: `admin-service` returns a stub summary. Major build.

---

## FR-19. Billing & Subscription

### Description
SaaS monetization, plan entitlements, Stripe integration.

### Functional requirements
- **FR-19.1** Subscription plans: TRIAL (14 days), STARTER, GROWTH, ENTERPRISE.
- **FR-19.2** Per-plan entitlements: recruiter seats, monthly job postings, resume database access, AI credit allowance, sponsored slots.
- **FR-19.3** Stripe integration for checkout, subscription management, invoices.
- **FR-19.4** Plan upgrades take effect immediately; downgrades effective next billing cycle.
- **FR-19.5** Trial conversion flow: 7-day reminder, 1-day reminder, expiry handling.
- **FR-19.6** Sponsored job billing: pay-per-post or pay-per-impression model (configurable).
- **FR-19.7** Invoice generation, payment history, downloadable PDFs.
- **FR-19.8** Webhook signature verification; idempotent event handling using `stripe_event_id`.
- **FR-19.9** AI usage decremented at worker boundary (post-success), not at request boundary.
- **FR-19.10** Every billing-relevant change audited.

### Acceptance criteria
- Exceeding plan recruiter seats blocks new invitations with `403` and `code: PLAN_LIMIT_EXCEEDED`.
- AI quota exhaustion returns `429` with reset time.
- Stripe webhook duplicates do not double-charge or double-credit.
- Plan downgrade preserves historical entitlements until next cycle.

### MVP / Post-MVP
- **MVP:** None (use a single TRIAL plan with no enforcement; add billing post-MVP).
- **Post-MVP:** Full plan/entitlement model, Stripe integration, sponsored billing.

---

## FR-20. Trust, Safety & Compliance

### Description
Marketplace trust, privacy, and compliance controls.

### Functional requirements
- **FR-20.1** Report job (candidate-facing) routes the job to a moderation queue with reason category.
- **FR-20.2** Block company (candidate-facing) suppresses that company's jobs from the candidate's search results.
- **FR-20.3** Fraud flagging (Tenant Admin / Super Admin) on suspicious recruiter or candidate accounts.
- **FR-20.4** Moderation queue (FR-18.7) with action history.
- **FR-20.5** Hide / remove suspicious job; removed jobs remain in the database (soft delete) with reason and operator.
- **FR-20.6** Candidate consent log: every consent grant/revoke recorded with timestamp, version of policy, and event source.
- **FR-20.7** Candidate data export (DSAR): a candidate may request an export of their data; delivered as a signed-URL ZIP within SLA.
- **FR-20.8** Candidate data deletion (DSAR): a candidate may request deletion; processed within SLA; legal-hold exceptions documented.
- **FR-20.9** Retention policy: per-data-class default retention; configurable per tenant within platform-level minimums/maximums.
- **FR-20.10** Audit logs are append-only and exportable.
- **FR-20.11** Privacy settings UI for candidate: profile visibility, recruiter searchability, AI consent.
- **FR-20.12** PII masking based on role and request context; PII never appears in non-audit logs.

### Acceptance criteria
- Reported jobs appear in the moderation queue within ≤ 30 s and are excluded from public search if auto-hide rules trigger.
- DSAR export delivered within SLA documented in [`17-compliance/dsar-export-and-delete.md`](../17-compliance/).
- Audit table has no UPDATE or DELETE permissions for application roles; only Compliance retention purges (separate job role) may delete.

### MVP / Post-MVP
- **MVP:** Audit log table and writes for major events; PII not in operational logs.
- **Post-MVP:** Report job, block company, moderation queue, DSAR flows, retention engine.

---

## FR-21. Analytics & Reporting

### Description
Operational, recruiter, and business analytics.

### Functional requirements
- **FR-21.1** Tenant analytics: jobs published, applications received per job, conversion rates per stage, source attribution, time-to-hire, time-in-stage, recruiter performance, offer acceptance rate.
- **FR-21.2** Platform analytics (Super Admin): tenants, MRR proxy, active jobs, applications/day, AI usage, search volume, error rates.
- **FR-21.3** Search analytics: query volume per tenant, top zero-result queries, top filters, click-through rates.
- **FR-21.4** AI usage analytics: per-tenant credit consumption, per-user usage, model split.
- **FR-21.5** Source tracking: UTM parameters captured on job views and applies; recruited-from sources logged.

### Acceptance criteria
- Tenant Admin sees only their tenant's analytics; cross-tenant queries are forbidden.
- Super Admin can view platform-wide analytics.
- Numbers are correct to within ±1% of source-of-truth tables (per nightly reconciliation).

### MVP / Post-MVP
- **MVP:** Basic counters per job (views, applies).
- **Post-MVP:** Funnel analytics, cohort analytics, source attribution, AI/search analytics.

### Notes
- `analytics-event-collector` exists as a thin HTTP→Kafka forwarder; downstream warehouse and dashboards are not built.

---

## FR-22. Audit & Activity Tracking

### Description
Track important user and system actions.

### Functional requirements
- **FR-22.1** Track login events (success, failure, MFA challenge), logout, session revocation.
- **FR-22.2** Track job changes (create, update, publish, close, reopen, delete).
- **FR-22.3** Track application status changes.
- **FR-22.4** Track resume access (who viewed which resume when).
- **FR-22.5** Track candidate profile changes.
- **FR-22.6** Track AI artifact creation, approval, rejection, regeneration.
- **FR-22.7** Track recruiter notes and tag changes.
- **FR-22.8** Track billing changes.
- **FR-22.9** Track admin actions (tenant CRUD, impersonation, feature flag flips, prompt edits).
- **FR-22.10** Provide audit export per tenant (Compliance Admin) and per platform (Super Admin).

### Acceptance criteria
- Audit rows are immutable from application code (no UPDATE / DELETE in normal flows).
- Each audit row contains: `actor_user_id`, `actor_role`, `tenant_id`, `action`, `entity_type`, `entity_id`, `timestamp_utc`, `correlation_id`, `metadata` (JSON).
- Audit export streams as NDJSON or CSV with delivery via signed URL.

### MVP / Post-MVP
- **MVP:** Audit table + writes for tenant, user, job, application, resume access.
- **Post-MVP:** AI artifact, billing, admin action audits; export UI.

---

## FR-23. Integrations

### Description
Third-party and platform integrations.

### Functional requirements
- **FR-23.1** Email provider abstraction with adapters for SES (default) and SendGrid.
- **FR-23.2** Calendar integration (Google Calendar, Microsoft Outlook) for interview scheduling (post-MVP).
- **FR-23.3** Meeting links (Zoom, Microsoft Teams) generated for video interviews.
- **FR-23.4** Stripe integration for billing.
- **FR-23.5** S3-compatible storage (MinIO locally, AWS S3 in cloud).
- **FR-23.6** OpenSearch integration via the Go gateway.
- **FR-23.7** Kafka (Redpanda local, MSK / Confluent in cloud).
- **FR-23.8** Outbound webhooks (per-tenant configurable URLs) for major events; HMAC-signed payloads.
- **FR-23.9** Future: partner job board APIs (Indeed, LinkedIn, Glassdoor) for cross-posting.

### Acceptance criteria
- Integration failures retry with exponential backoff up to a max attempts.
- Webhook secret never logged; signature verified by HMAC-SHA256.
- Calendar token storage is encrypted at rest with per-tenant or per-user keys.

### MVP / Post-MVP
- **MVP:** Email provider abstraction (one adapter), S3, OpenSearch, Kafka.
- **Post-MVP:** Calendar OAuth, meeting links, Stripe, webhooks, partner boards.

---

## FR-24. Data Import & Export

### Description
Migration, bulk upload, and enterprise exports.

### Functional requirements
- **FR-24.1** Import candidates by CSV with templated columns; validates rows; commits valid rows; produces a downloadable error report for invalid rows.
- **FR-24.2** Import jobs by CSV with the same pattern.
- **FR-24.3** Bulk resume upload (multiple files per ZIP); spawns parsing jobs.
- **FR-24.4** Export candidate data per tenant (CSV / NDJSON), gated by Compliance Admin role and entitlement.
- **FR-24.5** Export application pipeline data per tenant.
- **FR-24.6** Export reports as CSV / PDF.
- **FR-24.7** Export compliance / audit logs.
- **FR-24.8** All export actions are audited and produce a signed-URL deliverable with expiry.

### Acceptance criteria
- A failed import row never partially commits.
- Error reports include the row number, the error code, and the offending field.
- Export downloads expire per configured window and cannot be reused after expiry.

### MVP / Post-MVP
- **MVP:** None.
- **Post-MVP:** Import (candidate, job), bulk resume, export (candidate, applications, audit).

---

## 3. MVP scope

### MVP modules (in)
1. **Tenant management** (FR-1) — create, update, suspend, list.
2. **Authentication and RBAC** (FR-2) — email/password, JWT with refresh, basic RBAC.
3. **Recruiter dashboard** (FR-7) — basic.
4. **Job creation and publishing** (FR-5) — create/edit/publish/close/list.
5. **Public job search** (FR-4 + FR-11) — listing + detail + keyword/filter/sort/pagination.
6. **Candidate registration** (FR-3) — signup + profile.
7. **Resume upload and parsing** (FR-9) — real S3 + real parser.
8. **Apply to job** (FR-6) — submit, withdraw, idempotency, duplicate prevention.
9. **Application pipeline** (FR-6 + FR-8 lite) — state machine + tenant default pipeline.
10. **Recruiter candidate review** (FR-7) — list + profile + notes.
11. **Basic notifications** (FR-16) — email on application status change.
12. **Audit logging** (FR-22) — tenant, user, job, application, resume access.
13. **OpenSearch-based job search** (FR-11) — already partially built.

### Post-MVP modules (deferred)
1. AI resume tailoring (FR-12)
2. AI cover letter draft (FR-12)
3. AI job matching (FR-12, FR-13)
4. Interview scheduling (FR-14)
5. Offer management (FR-15)
6. Resume database (FR-10)
7. Billing and subscriptions (FR-19)
8. Sponsored jobs (FR-17, FR-19)
9. Advanced analytics (FR-21)
10. Enterprise SSO (FR-2)

## 4. Cross-cutting non-functional requirements

| Concern | Requirement |
|---------|-------------|
| **Tenant isolation** | Every API, query, and search request scoped by `tenant_id`. Wrong-tenant access tests are mandatory in CI. |
| **Performance** | P95 search ≤ 500 ms warm; P95 application submit ≤ 800 ms; resume parsing P95 ≤ 30 s end-to-end. |
| **Availability** | 99.9% target for public marketplace, 99.95% for recruiter ATS. |
| **Audit** | All authentication, authorization, role assignment, billing, and admin actions audited. |
| **Privacy** | PII masked in operational logs; consent recorded; DSAR honored within SLA. |
| **Security** | OWASP ASVS L2 baseline; secrets via secret manager; signed webhooks; bearer JWT; method-level RBAC. |
| **Observability** | Correlation ID per request; tenant id in all relevant log fields; SLO dashboards in Grafana. |
| **Testing** | Unit + integration tests with multi-tenant isolation cases; contract tests for shared-contracts; E2E for critical flows (apply, recruiter review). |

## 5. Traceability

Each functional requirement (FR-x.y) traces to:
- An entity in [`03-domain-model/domain-model.md`](../03-domain-model/domain-model.md).
- An endpoint in [`05-api-contracts/api-contract-plan.md`](../05-api-contracts/api-contract-plan.md).
- A workflow in [`04-workflows/`](../04-workflows/) where applicable.
- A test in [`16-devops/testing-strategy.md`](../16-devops/testing-strategy.md).

When implementing, link the FR id in the PR description so the traceability matrix can be regenerated mechanically.
