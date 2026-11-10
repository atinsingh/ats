# Resume upload + parsing flow

End-to-end spec for the candidate resume pipeline (PRD §3.9).

```
Browser ──(1)──▶ candidate-service POST /api/v1/me/resumes/upload-url
   │              ↳ creates `resumes` row (status=PENDING)
   │              ↳ returns pre-signed S3 PUT URL + s3_key + resume_id
   │
Browser ──(2)──▶ S3 / MinIO  PUT  <pre-signed URL>
   │              (binary upload — never proxied through candidate-service)
   │
Browser ──(3)──▶ candidate-service POST /api/v1/me/resumes/{id}/finalize
                  ↳ validates ownership + tenant
                  ↳ marks resume IN_PROGRESS
                  ↳ writes `resume.uploaded` event into candidate_event_outbox
                  ↳ returns Resume DTO
                                            │
candidate-service OutboxPublisher ──(4)──▶ Kafka jobocate.resume.raw
                                            │
                            resume-parser-worker  (Python)
                              ↳ optional: download object from S3
                              ↳ extract email/phone/skills/etc.
                              ↳ emit RESUME_PARSED to jobocate.resume.parsed
                                            │
candidate-service ResumeParsedListener ──(5)──▶ resume_parsed_fields (review_status=PROPOSED)
                              ↳ idempotent by event_id (resume_processed_events)
                              ↳ marks resumes.parser_status = PARSED|FAILED
                                            │
Browser polls  ──(6)──▶ GET /api/v1/me/resumes/{id}/parsed-fields
                              ↳ shows extracted fields, candidate accepts/dismisses
                              ↳ POST .../parsed-fields/apply  (writes to candidate_profiles)
                              ↳ POST .../parsed-fields/reject (just marks REJECTED)
```

## Validation rules

| What | Where | Rule |
|---|---|---|
| MIME type | candidate-service `ResumeService.validate` + DB `chk_resume_mime_type` | PDF / DOC / DOCX only |
| Size | service + DB `chk_resume_size_max` | ≤ 10 MiB |
| Tenant ownership | `ownedResume()` | All operations scoped to JWT/header tenant |
| Idempotency | `resume_processed_events.event_id` | Replayed parser events are dropped |
| Default | `ux_resumes_default_per_candidate` | Only one default resume per candidate |

## Failure modes

* **Upload to S3 fails.** Browser surfaces a 5xx; the orphan `resumes` row stays in `PENDING` and is swept by a future janitor (TODO: `JOBOCATE_RESUME_JANITOR_TTL`). Candidate can retry by uploading again.
* **Parser crashes.** Worker emits a failure envelope (`failed: true, error: ...`); listener records `parser_status=FAILED` so the candidate sees a remediation message.
* **Kafka outage.** `OutboxPublisher` retries with exponential backoff. The candidate sees `IN_PROGRESS` for longer; finalize stays idempotent so they can re-finalize.
* **Cross-tenant access.** All controllers reject with 404 (not 403) to avoid existence leak (PRD §3.1).

## Audit

* `RESUME_UPLOADED` — written via outbox payload (`resume.uploaded`).
* `RESUME_PARSED` / `RESUME_PARSE_FAILED` — written by `ResumeParsedListener` after persisting fields.
* `RESUME_PARSED_APPLIED` / `_REJECTED` — written when candidate reviews extracted fields.

## Configuration

| Property | Default | Notes |
|---|---|---|
| `jobocate.s3.enabled` | `true` | Set to `false` for tests / when no MinIO is running |
| `jobocate.s3.bucket` | `jobocate-resumes` | Use `S3_BUCKET_RESUMES` env |
| `jobocate.s3.upload-ttl` | `PT15M` | Pre-signed PUT duration |
| `jobocate.s3.download-ttl` | `PT5M` | Recruiter / candidate signed GET TTL |
| `jobocate.kafka.resume-raw-topic` | `jobocate.resume.raw` | Outbox target |
| `jobocate.kafka.resume-parsed-topic` | `jobocate.resume.parsed` | Listener subscribes here |
| `jobocate.internal-token` | empty | Required to call `/internal/v1/resumes/{id}/parsed` from outside the cluster |
