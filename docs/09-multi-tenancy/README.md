# 09 — Multi-tenancy

How tenant isolation is enforced everywhere on the platform: database, search, cache, Kafka events, S3 prefixes, logs, analytics, and admin tooling.

## Files (current and planned)

| File | Purpose | Status |
|------|---------|--------|
| `tenancy-strategy.md` | End-to-end tenant resolution and isolation strategy: JWT claim → `TenantContext` → repository filters → search filters → S3 prefixes → Kafka headers → logs. Includes the "wrong tenant cannot read" test contract. | Done |
| `cross-tenant-test-plan.md` | Standardized integration test cases that every tenant-scoped service must include. | Done |
| `tenant-onboarding.md` | Tenant create/configure/suspend/delete flow including data migrations. | Planned |

## Non-negotiables

- **Tenant ID never comes from the request body.** It must come from the JWT (`tenant_id` claim) — or, in dev only, from the `X-Jobocate-Tenant-Id` header gated by `JOBOCATE_ALLOW_HEADER_TENANT`.
- **Every tenant-scoped table has `tenant_id UUID NOT NULL` indexed** and every JPA repository call must include it in the WHERE clause.
- **Search queries always include a tenant filter clause** added by the gateway, not by the caller.
- **Kafka events carry `tenant_id`** in their payload; consumers route per tenant.
- **S3 keys are prefixed `tenants/{tenant_id}/...`**; pre-signed URLs are scoped to the tenant.
- **Logs include `tenant_id` as a structured field** (mask PII; never include raw email/phone).
- **Wrong-tenant access tests** are mandatory in CI for every read and write API: same user, different tenant in claim → 401/403/empty result.
