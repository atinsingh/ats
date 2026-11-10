# 04 — Workflows

Cross-service workflows and state machines. Each workflow doc names the actor, the trigger, the validation rules, the persistence side-effect, the Kafka events emitted, and the notifications sent — so backend, frontend, search, notification, and analytics owners can implement and test against the same spec.

## Files (current and planned)

| File | Purpose | Status |
|------|---------|--------|
| [`application-state-machine.md`](./application-state-machine.md) | Candidate application lifecycle: states, transitions, allowed actors, side-effects, events. | Authoritative |
| `job-lifecycle.md` | Job DRAFT → PUBLISHED → CLOSED including republish, clone, archive. | Planned |
| `interview-pipeline.md` | Schedule, reschedule, cancel, feedback, scorecard, decision. | Planned |
| `offer-flow.md` | Draft → internal approval → sent → accepted/declined → onboarding handoff. | Planned |
| `resume-pipeline.md` | Upload → S3 → ingestion event → parser worker → enriched profile → optional embedding. | Planned |
| `consent-and-visibility.md` | Candidate consent grants/revokes, recruiter visibility windows, cross-tenant visibility rules. | Planned |

## Conventions

- Each transition lists: **From state**, **To state**, **Allowed actors (roles)**, **Pre-conditions**, **Validation**, **Persistence side-effects**, **Kafka events emitted (topic + payload type)**, **Notifications**, **Audit event**.
- **Invalid transitions** must always be enumerated with the expected HTTP error (`409 CONFLICT` for state-machine violations, `403 FORBIDDEN` for role violations).
- Use Mermaid `stateDiagram-v2` for the canonical diagram in each workflow doc.
