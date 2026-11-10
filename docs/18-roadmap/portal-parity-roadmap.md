# Job portal parity roadmap (ZipRecruiter · Naukri · TimesJobs · AIApply-class AI)

This document maps **capabilities common to large job marketplaces** plus **AI-native job seeker workflows** (in the spirit of tools like [AIApply](https://aiapply.co/)) to the Jobocate monorepo so we can implement them consistently across **job seeker UI**, **recruiter/ATS UI**, **search**, **Java workflow services**, **AI workers**, and **notifications**.

Reference positioning (examples, not copies):

- [ZipRecruiter](https://www.ziprecruiter.com/) — strong job-seeker conversion flows, “stand out” application features, SMB employer acquisition, ratings/social proof.
- **Naukri** — recruiter-led market: resume database, paid visibility, high-volume search and alerts, employer branding.
- **TimesJobs** — browse-first discovery, location/experience/salary filters, classified-style job listings.
- **[AIApply](https://aiapply.co/)** — job seeker copilot patterns: **high-volume or guided apply**, **resume tailoring per job / ATS-aware variants**, **personalized cover letters**, **job-to-candidate matching**, **interview prep and practice** (see also their public pages such as [auto apply](https://aiapply.co/auto-fill-job-application), [resume builder](https://www.aiapply.co/resume-builder), and [interview / answer buddy](https://www.aiapply.co/interview-answer-buddy)). Jobocate should implement the _capabilities_, not clone third-party UX or claims.

---

## Capability clusters → Jobocate surfaces

| Cluster                                      | Job seeker (`job-portal-web`)                                                                                                         | Recruiter (`ats-recruiter-web`)                                   | Admin (`admin-console-web`)            | Search (Go + OpenSearch)                                                          | Workflow (Java + Kafka)                                                                                                                                  | Comms                                      |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | -------------------------------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| **Discovery**                                | Home, SERP, job detail, SEO landings                                                                                                  | —                                                                 | Featured/quality rules                 | Hybrid `/v1/search/jobs`, facets, autocomplete                                    | Job publish → index projection                                                                                                                           | —                                          |
| **Filters & relevance**                      | Facet UI, sort, saved views                                                                                                           | —                                                                 | Abuse / stale job policies             | Index mappings + aggregations; `job-index-document.schema.json`                   | Job fields in DB ↔ index contract                                                                                                                        | —                                          |
| **Profile & apply**                          | Profile, resume upload, 1-click apply                                                                                                 | Application inbox, stages                                         | Support tools                          | Optional: application-side index for recruiter search                             | `application-service`, `candidate-service`, S3 artifacts                                                                                                 | `notification-service`                     |
| **AI-assisted apply & prep** (AIApply-class) | Apply queue with caps/safeguards, JD-tailored resume + cover drafts, **human-in-the-loop review** before send, interview Q&A practice | Clear labels on AI-assisted packets; optional disclosure settings | Prompt/version registry, quotas, audit | Embeddings + lexical match for “fit” explanations (hybrid search already aligned) | `application-service` (submissions, consent flags), `workers-python` (`resume-parser-worker`, `embedding-worker`; future LLM worker behind feature flag) | Batch outcomes, “ready for review” digests |
| **Alerts**                                   | Saved search + email/push prefs                                                                                                       | —                                                                 | Rate limits                            | Scheduled query / watcher (new batch)                                             | Alert subscription entities in Postgres                                                                                                                  | Outbound templates                         |
| **Employer acquisition**                     | —                                                                                                                                     | Post job, plans, job performance                                  | Tenant billing flags                   | Sponsored slots in index (e.g. `boost_score`)                                     | `job-service` + admin                                                                                                                                    | —                                          |
| **Resume database**                          | Consent UX, visibility                                                                                                                | Search candidates, tags, shortlist                                | Compliance exports                     | Candidate index (separate alias, strict tenant filter)                            | Consent events, audit log                                                                                                                                | —                                          |
| **Trust & safety**                           | Report job, block company                                                                                                             | Fraud flags                                                       | Moderation queue                       | Remove/hide from index                                                            | Account state, appeals                                                                                                                                   | —                                          |

---

## Phased delivery (recommended)

### Phase A — Search & discovery parity (foundation)

**Goal:** SERP and job detail feel like a real marketplace (Naukri/TimesJobs-style browse + filter).

- **Schema & index:** Align OpenSearch mappings in `services-go/search-gateway` with `packages/shared-contracts/schemas/job-index-document.schema.json` (location, salary range, experience band, skills, company name, `indexed_at`, facets object).
- **API:** Extend `packages/shared-contracts/openapi/recruiter-search-gateway.yaml` with documented `filters` keys (e.g. `location`, `salary_min_cents`, `employment_type`, `remote_policy`) and response `facets` shape.
- **Projection:** Ensure `search-orchestrator-service` Kafka listener emits full documents for every published field change.
- **Frontend:** `job-portal-web` — routes: `/jobs` (SERP), `/jobs/[id]` (detail), shared filter components; call search gateway via `packages/api-sdk` (add client if missing).

### Phase B — Candidate identity, applications, alerts

**Goal:** ZipRecruiter-style “apply + hear back” loop; Naukri-style alerts.

- **Backend:** `candidate-service` + `application-service` — apply with resume reference, application status timeline; idempotency for duplicate applies per job.
- **Alerts:** Postgres `saved_search` + `notification-service` + digest workers (or reuse Kafka for “new jobs matching X”).
- **Frontend:** Application history dashboard (extends current marketing home with authenticated shell).

### Phase B+ — AIApply-class job seeker copilot (combined with seeker experience)

**Goal:** Same product surface as Phase B for the candidate, extended with **AI-assisted** apply and prep—aligned with README’s “human review for quality” positioning and with marketplace trust.

| Theme                   | What to build                                                                                                                    | Jobocate mapping                                                                                                       |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **Match & queue**       | Ranked matches from profile + search; optional **apply queue** with daily/tenant caps, pause, and explicit “submit” after review | `job-portal-web` queue UI → `application-service` + search gateway; Kafka for async generation jobs                    |
| **Resume variants**     | Base resume in S3; **per-job or per-role** tailored PDF/DOCX variants; ATS keyword / structure hints from `resume-parser-worker` | New artifact type + version chain; **no auto-submit** until user confirms unless policy allows                         |
| **Cover letters**       | Short letter from JD + resume facts; editable; stored with application                                                           | `application-service` attachment metadata; LLM worker (new module or extend `workers-python`) with PII redaction rules |
| **Auto-apply (strict)** | If offered: only for hosts/APIs you own or partners with ToS; log every action; kill switch per user                             | Prefer **“draft batch + human approve”** over unsupervised third-party form bots to reduce fraud and account bans      |
| **Interview prep**      | Mock Q&A, company/JD-grounded questions, optional voice practice                                                                 | `job-portal-web` prep flows; stateless or session store; optional integration with `notification-service` reminders    |

**Cross-cutting:** `packages/shared-contracts` — extend events/schemas for `application.draft_ai`, `artifact.resume_variant`, consent booleans; `admin-console-web` — quotas, model routing, and abuse dashboards.

### Phase C — Recruiter ATS depth

**Goal:** Pipeline comparable to ATS-heavy portals.

- **Backend:** Stages, notes, disposition reasons, team mentions; events for analytics.
- **Frontend:** `ats-recruiter-web` — kanban/list, candidate packet view (S3-derived summaries), bulk actions.

### Phase D — Differentiation (“Be Seen First” class)

**Goal:** Optional paid or policy-driven candidate visibility (see ZipRecruiter’s “Be Seen First” positioning on [ziprecruiter.com](https://www.ziprecruiter.com/)).

- **Model:** `application.cover_note`, `application.priority_tier`, employer-configurable rules.
- **Search/ranking:** Safe ranking boosts (never bypass tenant isolation); audit trail in `admin-service`.

### Phase E — Resume database & enterprise

**Goal:** Naukri-class recruiter search over opted-in profiles.

- **Separate index** and **strict consent** flags on candidate documents; recruiter UI search hits only allowed tenants.
- **Enterprise:** SSO hooks in `tenant-auth-service`, bulk APIs, read replicas for reporting (document in infra/terraform when ready).

---

## Non-functional requirements (all phases)

- **Tenant isolation:** Every search query and index write carries `tenant_id` (JWT + OpenSearch filters) — already a stated principle in the root README.
- **Observability:** Trace search → orchestrator → Kafka → index path; SLOs on search latency and alert delivery.
- **Compliance:** Privacy policy, consent logs, regional retention (admin + legal copy; California-style notices if US-focused).

---

## Immediate next steps (suggested sprint scope)

1. **Contract first:** Finalize filter/facet keys in OpenAPI + JSON Schema; version bump in `shared-contracts`.
2. **Index + gateway:** Implement facet aggregations and filter parsing in `search-gateway` `handleSearchJobs`.
3. **UI:** Add `/jobs` SERP in `job-portal-web` wired to the gateway (feature-flagged env for gateway URL).
4. **Seed data:** Expand Flyway seed jobs with varied locations/salaries for realistic demos.
5. **AI seeker (after B):** Spike “tailored resume + cover draft” pipeline: S3 read → worker → draft stored → **review UI** in `job-portal-web` → submit via existing `application-service` path; document consent and retention in `docs/` or privacy appendix.

---

## Out of scope for “parity” (separate products)

- Full marketing CMS, native mobile apps, third-party job board syndication networks — track as later programs once core loop is live.
- **Unsupervised auto-apply** to arbitrary external career sites (high legal/ToS/account-risk); prefer partner APIs or human-approved batches for AIApply-style scale without platform liability.

---

## Engineering execution

- **Sequencing, milestones, local checklist:** [`implementation-plan.md`](implementation-plan.md)
- **UI patterns and code style (TS / Java / Go / Python):** [`ui-coding-standards.md`](../16-devops/ui-coding-standards.md)
