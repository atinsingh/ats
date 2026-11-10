# 01 — Product

Documents in this folder describe **what** the platform should do, **for whom**, and **at what acceptance bar**, independent of how it is implemented. Everything here is implementation-ready: each requirement should be testable and traceable to either a workflow doc, an API endpoint, or a UI surface.

## Files (current and planned)

| File | Purpose | Status |
|------|---------|--------|
| `prd.md` | Top-level product requirements: vision, personas, scope, success metrics, non-goals. | Planned |
| [`functional-requirements.md`](./functional-requirements.md) | The full functional requirements document, organized by module, with acceptance criteria and MVP / post-MVP classification. | Authoritative |
| `glossary.md` | Canonical product terms (Application vs Submission, Job vs Requisition, Recruiter vs Tenant Admin, etc.). | Planned |

## Conventions

- Every requirement statement uses **shall** / **must** / **should** with the same meaning as RFC 2119.
- Each module section ends with **Acceptance Criteria** as testable bullets. Traceability tags (e.g. `[FR-3.6.1]`) may be added as the spec hardens.
- MVP / Post-MVP labels match the [`18-roadmap/mvp-implementation-plan.md`](../18-roadmap/mvp-implementation-plan.md) milestones.

## Out of scope here

- Detailed UX flows → see [`10-recruiter-ux/`](../10-recruiter-ux/) and [`11-candidate-ux/`](../11-candidate-ux/).
- API endpoints → see [`05-api-contracts/`](../05-api-contracts/).
- Data shapes → see [`03-domain-model/`](../03-domain-model/).
