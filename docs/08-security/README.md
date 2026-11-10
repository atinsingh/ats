# 08 — Security

Security baseline, identity, authorization, threat modeling, and operational security for the platform.

## Files (current and planned)

| File | Purpose | Status |
|------|---------|--------|
| [`security-baseline.md`](./security-baseline.md) | JWT authentication, RBAC, CORS, CSRF, password hashing, token expiry/refresh, PII masking, file upload security, rate limiting, audit logging, secrets management. Includes Spring Security wiring guidance. | Authoritative |
| [`rbac-permissions-matrix.md`](./rbac-permissions-matrix.md) | Permission matrix per role × resource; API authorization mapping; frontend visibility rules. | Authoritative |
| `threat-model.md` | STRIDE-style threat model per surface (public marketplace, recruiter ATS, admin console, AI workers, search gateway). | Planned |
| `secrets-management.md` | How secrets are sourced (env, AWS SM/SSM, K8s secrets), rotation, never-commit rules. | Planned |
| `data-classification.md` | What is PII, what is sensitive, what is public, retention defaults per class. | Planned |

## Non-negotiables

- All inbound API requests go through tenant resolution (JWT + `TenantIdentityFilter`) **before** any role check.
- Role information must be a JWT claim (`roles: ["RECRUITER"]`); never inferred from request body or path.
- Method-level authorization via `@PreAuthorize` (or equivalent) must be present on every controller method that mutates data.
- The dev-only `X-Jobocate-Tenant-Id` header **must** be off (`JOBOCATE_ALLOW_HEADER_TENANT=false`) outside local dev.
- File uploads are validated on **content type AND file signature**, size-capped, antivirus-scanned (post-MVP), and stored under tenant-scoped S3 prefixes.
- All authentication, authorization, role assignment, and admin actions are written to the audit log.
