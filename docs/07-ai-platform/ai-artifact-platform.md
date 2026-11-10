# AI artifact platform

End-to-end spec for AI-generated content on the platform. Implementation
landed under `services-java/application-service` (artifacts, REST + outbox)
and `workers-python/ai-artifact-worker` (consumer + provider plug-in).

## Kinds

| Kind | Owner | Default `review_required` | Use |
|------|-------|---------------------------|-----|
| `RESUME_VARIANT` | Candidate | `true` | Tailored resume per job. |
| `COVER_LETTER` | Candidate | `true` | Cover letter draft per job. |
| `INTERVIEW_QA` | Candidate | `true` | Interview prep Q&A pack. |
| `CANDIDATE_SUMMARY` | Recruiter | `false` (advisory) | Condensed summary for recruiter UI. |
| `MATCH_EXPLANATION` | Recruiter | `false` | Why a candidate matches a job. |
| `SCREENING_QUESTIONS` | Recruiter | `false` | Suggested screening questions. |
| `SHORTLIST_RECOMMENDATION` | Recruiter | `false` | Shortlist suggestion. |
| `REJECTION_EMAIL` | Recruiter | `true` | Rejection email draft (must be reviewed before send). |

`review_required=false` doesn't auto-act on the candidate or job — it just
means the recruiter can copy the output without an explicit "approve" step
in the UI. The artifact still records every model output for audit.

## Lifecycle

```
                         ┌─────────────┐
   POST /api/v1/         │             │
   ai-artifacts ────▶   DRAFT          │
                         │             │
                         └──────┬──────┘
   ai.artifact.requested ──▶ worker
                         ┌──────▼──────┐    review_required=false
                         │             │ ─────────────────────┐
                         │ READY_FOR_  │                       ▼
                         │   REVIEW    │   ┌──────────────┐   ┌──────────┐
                         │             │──▶│   APPROVED   │──▶│ ARCHIVED │
                         └──────┬──────┘   └──────────────┘   └──────────┘
                                │
                                ├─▶ REJECTED ─▶ ARCHIVED
                                │
                                └─▶ FAILED  (re-request creates a new row)
```

`FAILED` is reachable only via the worker callback; the user can either
reject (terminal) or request a fresh artifact (new row, new id).

## REST API

### Public (tenant) — `application-service`

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `POST /api/v1/ai-artifacts` | tenant JWT (or dev tenant header) + `X-Jobocate-User-Id` | Request a generation. Idempotent on `Idempotency-Key`. |
| `GET  /api/v1/ai-artifacts/{id}` | tenant | Read one. |
| `GET  /api/v1/ai-artifacts?subject_type=...&subject_id=...` | tenant | Filter by subject (preferred). Also supports `kind` and `mine_for_user`. |
| `POST /api/v1/ai-artifacts/{id}/approve` | tenant | Approve a `READY_FOR_REVIEW` artifact. |
| `POST /api/v1/ai-artifacts/{id}/reject`  | tenant | Reject. Body: `{reason}`. |
| `POST /api/v1/ai-artifacts/{id}/archive` | tenant | Archive any non-archived state. |

### Internal (worker) — `application-service`

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `POST /internal/v1/ai-artifacts/{id}/result`  | bearer = `jobocate.internal-token` + `X-Jobocate-Tenant-Id` | Worker callback for success. Idempotent — re-delivery of the same result for an already-`READY_FOR_REVIEW` or `APPROVED` artifact is a no-op. |
| `POST /internal/v1/ai-artifacts/{id}/failure` | same | Worker callback for failure. Body: `{reason}`. |

## Kafka topic

`jobocate.ai.artifact.events` — emitted via the `application-service`
transactional outbox.

| Event type | When |
|---|---|
| `ai.artifact.requested` | New `DRAFT` is persisted. Workers consume this. |
| `ai.artifact.ready_for_review` | Worker callback succeeded and `review_required=true`. |
| `ai.artifact.approved` | Worker callback succeeded with auto-approve **or** user clicked Approve. |
| `ai.artifact.rejected` | User clicked Reject. |
| `ai.artifact.failed` | Worker callback reported failure. |
| `ai.artifact.archived` | User archived. |

Every event payload includes `event_id` (UUID), `artifact_id`, `tenant_id`,
`kind`, `status`, `subject_entity_type`, `subject_entity_id`,
`prompt_version`, `model_version`, `review_required`, plus optional
`related_application_id`, `related_job_id`, `related_resume_id`,
`requested_by_user_id`. Use `event_id` for downstream idempotency.

## Worker

`workers-python/ai-artifact-worker` consumes
`jobocate.ai.artifact.events`, picks an `AiProvider` based on the
`AI_ARTIFACT_PROVIDER` env (`stub` by default — deterministic, offline, no
keys required), and POSTs back to `application-service`. The worker uses
the event's `event_id` as `idempotencyKey` so Kafka redelivery is safe.

Provider integrations are intentionally optional extras
(`pip install ai-artifact-worker[openai]`) so deployments can pick a
provider without forcing the dependency on every environment.

## Storage

* Small text outputs (cover letters, summaries, match explanations) are
  inlined in `output_text`.
* Large or binary outputs (rendered PDFs of resume variants) go to S3 and
  the artifact stores the `output_s3_key`. Retrieval uses pre-signed URLs
  generated by the candidate-service / job-service S3 abstraction.

## Audit + observability

Each transition writes an outbox row, which becomes the canonical audit
trail (immutable from the application path). Operational metrics (planned
for Prompt 26):

* `ai_artifact.requested.total{kind}`
* `ai_artifact.ready.total{kind}`
* `ai_artifact.failed.total{kind, reason_class}`
* `ai_artifact.review_latency_seconds{kind}` (`ready_at` → `approved_at` /
  `rejected_at`)

## Non-negotiables (from PRD §3.12 + §3.13)

* **Candidates must explicitly approve** any AI-drafted content before it
  is attached to a job application — enforced by the
  `READY_FOR_REVIEW → APPROVED` transition gating use of `output_text`.
* **Recruiter outputs are advisory** — they're labelled "AI-generated" in
  the UI and never auto-act on application state.
* **Every artifact records** prompt version, model version, input
  references, `created_by`, `requested_by`, status, and reviewers.
* **PII redaction**: deferred to the worker's provider plug-in. The stub
  passes inputs through unchanged; production providers must scrub or
  tokenise PII before sending to third-party LLM APIs (tracked in
  `quotas-and-cost-controls.md`).
