# 12 — Admin console

Platform-level (Super Admin) and tenant-level (Tenant Admin) administration.

## Files (current and planned)

| File | Purpose | Status |
|------|---------|--------|
| `screens.md` | Catalog: tenants, users, subscriptions, feature flags, AI quotas, prompt versions, abuse reports, audit logs, billing flags. | Planned |
| `super-admin-vs-tenant-admin.md` | Capability boundaries, escalation paths, audit expectations. | Planned |
| `moderation-queue.md` | Reported jobs/users workflow, decision audit, appeals. | Planned |

## Non-negotiables

- Super Admin actions cross tenants and are **always** audited.
- Tenant Admin actions are tenant-scoped; cross-tenant reads are forbidden even for tenant admins.
- Feature flags and AI quotas are configurable without redeploys (config-as-data table or LaunchDarkly-style provider).
