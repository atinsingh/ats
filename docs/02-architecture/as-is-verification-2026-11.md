# As-is verification — November 2026

> **Document type:** Code-verified current-state assessment. Supersedes the factual content of
> [`audit-as-is.md`](./audit-as-is.md), which describes an earlier snapshot.
> **Method:** Every statement here was read from code, migrations and contracts on 2026-11-10, not
> from READMEs or design docs. Nothing was executed: no build, test run or service start.
> **Jira:** IATS-132.

## 1. Summary

The workflow core is real. Jobs, applications, resumes and the AI-artifact lifecycle are implemented
in Java with state machines, idempotency and transactional outboxes. Job search over OpenSearch
works end to end.

Three things are not real yet:

- **Everything AI is a stub.** There is no model call, no real embedding, no matching and no scoring
  anywhere in the repository.
- **Authentication is effectively open** in the default configuration.
- **Job-board distribution does not exist.** There is no connector, feed or contract.

So the four product pillars (matching engine, resume scoring, resume fixing, job boards) all start
from zero, on top of a workflow core that is roughly half built.

## 2. Capability status

| Capability | Status | Evidence |
|---|---|---|
| Job lifecycle (draft, publish, unpublish, close, clone) with outbox | Real; job skills are never persisted | `services-java/job-service/.../JobCommandService.java`, `JpaJobRepositoryAdapter.java:41` |
| Application submit, state machine, idempotency, timeline, outbox | Real | `services-java/application-service/.../ApplicationService.java`, `ApplicationStatusTransitions.java` |
| Pipelines, notes, tags, ratings | Schema only, no endpoints | `application-service/src/main/resources/db/migration/V2`–`V8` |
| Interviews, offers | Absent | — |
| Resume upload with S3 presigned URLs, parsed-field review | Real; identity comes from a client header | `services-java/candidate-service/.../ResumeService.java`, `MeResumeController.java` |
| Resume parsing | Naive: pypdf/python-docx text, regex, a 44-word skill list | `workers-python/resume-parser-worker/src/resume_parser_worker/normalize.py` |
| AI artifact lifecycle (8 kinds, review gate, callbacks) | Real on the Java side | `application-service/.../AiArtifactService.java` |
| AI generation | Stub: f-string templates, any provider value falls back to the stub | `workers-python/ai-artifact-worker/src/ai_artifact_worker/__main__.py:27-35`, `renderer.py` |
| Embeddings | Fake: SHA-256-seeded 128-dimension vector, model `pseudo-dev` | `workers-python/embedding-worker/src/embedding_worker/__main__.py:22` |
| Job search (lexical, filters, facets, optional kNN) | Real; tenant is taken from a header | `services-go/search-gateway/internal/httpserver/` |
| Candidate search and index | Schema only | `packages/shared-contracts/schemas/candidate-index-document.schema.json` |
| Match scoring, resume scoring | Absent | — |
| Resume tailoring / fixing | A `resume_variants` table and a stub template | `candidate-service/.../db/migration/V5__resume_variants.sql` |
| Job-board distribution, feeds, apply ingestion | Absent; only a `JOB_BOARD` value in the application source enum | — |
| Login, signup, refresh, SSO | Absent; tables exist, only a demo-token endpoint | `services-java/tenant-auth-service/.../DemoTokenController.java` |
| Notifications | Inbox and preferences endpoints exist; no notification ever fires (see §3) | `services-java/notification-service/.../DomainEventListeners.java` |
| Admin, feature flags, AI quotas, prompt registry | Tables only; one migration is invalid | `services-java/admin-service/.../V2__feature_flags_and_quotas.sql` |
| Autocomplete, index-builder, reindex tool | Stubs | `services-go/*/cmd/*/main.go` |
| Recruiter and candidate web apps | Pages exist and call the SDK; several calls target endpoints that do not exist | `apps/*/src/app`, `packages/api-sdk` |
| Shared UI library | One component (`Button`) | `packages/ui` |
| PII redaction, prompt-injection defence, bias logging | Absent | — |
| CI | Templates only; `.github/` is not installed | `scripts/agent/templates/github/` |
| Terraform | Modules with no resources | `infra/terraform/modules/` |

Tests: about 87 test methods in total. `candidate-service`, `ats-core-service`, `admin-service`,
`tenant-auth-service`, `embedding-worker` and all three web apps have none.

## 3. Defects that block the pillars

These are ordered by how much they block the AI and job-board work.

### 3.1 Security and tenancy

1. **Dev tenant header is on by default.** Every service sets
   `allow-dev-tenant-header: ${JOBOCATE_ALLOW_HEADER_TENANT:true}`. With it on, the
   `X-Jobocate-Tenant-Id` header alone authenticates a caller, and a request with no roles header
   receives every role (`TenantIdentityFilter.java:95-106`). The default must be `false`.
2. **The demo-token endpoint is unauthenticated** and issues a token for any tenant and subject
   (`DemoTokenController.java`).
3. **Actor and candidate identity come from client headers** (`X-Jobocate-User-Id`,
   `X-Jobocate-Candidate-Id`). Any caller can act as any candidate or reviewer.
4. **No role checks on application or AI-artifact routes.** Any authenticated caller can change an
   application status or approve an artifact, and a caller can set `reviewRequired=false` to skip
   the human-review gate. This directly contradicts the "AI never decides" rule.
5. **`search-gateway` does not validate a JWT.** The tenant filter uses the header value, and
   `include_unpublished=true` is open to any caller.
6. **`GET /api/v1/tenants/{slug}`** does not check the slug belongs to the caller's tenant.

### 3.2 Broken contracts between components

1. **Notifications never fire.** The listener expects `APPLICATION_SUBMITTED`-style event types and
   `candidate_user_id` / `owner_user_id` fields; `application-service` emits `application.submitted`
   style types without those fields.
2. **AI worker callback drops version fields.** The worker posts `model_version` /
   `prompt_version`; the Java side expects camelCase. Model and prompt versions are therefore never
   recorded, which breaks the audit requirement for every AI output.
3. **AI requested events carry no inputs**, so the worker can only produce placeholder text.
4. **`jobocate.ai.artifact.events` is missing from `kafka/topics.yaml`** although code uses it.
5. **`resume-ingestion-service` emits events with no `resume_id`**, so parse results are dropped.
6. **Resume parser generates a new `event_id` per parse**, defeating replay idempotency.
7. **Front-end / back-end drift:** the apply form omits the required `candidateProfileId`; recruiter
   status changes send `{status}` where the API expects `{to}`; several SDK paths have no backend.

### 3.3 Data

1. **Job skills are dropped on write and read.** Matching needs them.
2. **`admin-service` V2 migration puts `COALESCE(...)` inside a `PRIMARY KEY`**, which PostgreSQL
   rejects, so the service cannot start on a fresh database. The file is already committed, so the
   fix is a forward migration plus a decision on the existing file (migrations are append-only).
3. **Vector dimension is 128 everywhere**; any real embedding model needs a new index version.

## 4. What this means for sequencing

1. **Close the trust gaps first** (§3.1). Matching and scoring handle candidate data and influence
   hiring decisions; they cannot ship on header-based identity. Backlog: IATS-16, IATS-21.
2. **Fix the event and callback contracts** (§3.2). The AI-artifact pipeline is the right backbone
   for scoring and fixing, but today it loses its inputs and its version stamps.
3. **Persist job skills and build the candidate index** before any matching work. Backlog: IATS-29,
   IATS-106.
4. **Stand up the AI gateway** with a real provider, redaction and logging. Backlog: IATS-104,
   IATS-105.
5. **Job-board work is independent** of items 2–4 and can start in parallel once item 1 is done.

## 5. Naming note

Code, packages and topics use `jobocate`; Jira, the worktree path and newer documents use
`Insyght` / `InsyghtATS`. A rename decision should be made before new services are created, because
topic names, package names and header names are contract surface.
