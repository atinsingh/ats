# 17 — Compliance

Privacy, consent, retention, audit immutability, regional considerations, and data-subject access requests.

## Files (current and planned)

| File | Purpose | Status |
|------|---------|--------|
| `privacy-policy-engineering.md` | What candidate/recruiter data we collect, why, where it's stored, retention defaults, deletion path. | Planned |
| `consent-records.md` | Consent record schema, who grants/revokes what (recruiter visibility, AI usage, marketing), audit trail. | Planned |
| `retention-and-deletion.md` | Retention policy per data class; deletion automation; legal-hold exceptions. | Planned |
| `dsar-export-and-delete.md` | Data subject access request workflow (export and delete), SLAs, evidence. | Planned |
| `audit-immutability.md` | Append-only audit table design, integrity hashing, export workflow, who can read. | Planned |
| `regional-considerations.md` | GDPR / CCPA / India DPDP / PIPL notes, data residency posture. | Planned |

## Non-negotiables

- Audit logs are append-only; no UPDATE or DELETE except via documented retention purges run by Compliance Admins.
- Candidate consent revocations propagate to the search index within the consent SLO and remove the candidate from recruiter searches.
- DSAR export packages are tenant-scoped and delivered via signed URL with expiry.
- Every DSAR request has an audit entry containing the requester, scope, fulfillment time, and operator.
