# RBAC permissions matrix

> **Document type:** Authoritative permission matrix.
> **Audience:** Backend, frontend, security review, QA.
> **Pairs with:** [`security-baseline.md`](./security-baseline.md) (Spring Security wiring), [`04-workflows/application-state-machine.md`](../04-workflows/application-state-machine.md), [`05-api-contracts/api-contract-plan.md`](../05-api-contracts/api-contract-plan.md).
> **Authorization model:** RBAC. Roles are JWT claims (`roles`). Tenant scope is the JWT `tenant_id` claim resolved by `platform-starter`'s `TenantIdentityFilter` (existing). Method-level enforcement uses `@PreAuthorize` (Spring Security).

## 1. Roles (canonical)

| Code | Audience | Tenant scope | Holders typically |
|------|----------|--------------|-------------------|
| `SUPER_ADMIN` | Platform staff | Cross-tenant (assumes a tenant when acting) | Jobocate platform team |
| `TENANT_ADMIN` | Customer admin | Single tenant | Customer ops lead |
| `RECRUITER` | Customer | Single tenant | Recruiter |
| `HIRING_MANAGER` | Customer | Single tenant | Hiring manager |
| `INTERVIEWER` | Customer | Single tenant | Interviewer |
| `CANDIDATE` | Marketplace user | None (or per applied tenant) | Job seeker |
| `FINANCE_ADMIN` | Customer or platform | Single tenant or platform | Finance |
| `COMPLIANCE_ADMIN` | Customer or platform | Single tenant or platform | Compliance officer |

**A user may hold multiple roles** within a tenant (e.g., `RECRUITER` + `HIRING_MANAGER`). All roles are merged for permission evaluation; the union is permissive.

## 2. Verbs

- **C** = Create
- **R** = Read
- **U** = Update
- **D** = Delete (or terminate / revoke)
- **L** = List (separate from R because L often returns redacted views)
- **A** = Approve / Decision
- **X** = Execute (run / send / publish)

`✓` = permitted; `—` = not permitted; `O` = own only (e.g., own application, own profile); `T` = tenant-scoped (any item in their tenant); `H` = hiring-team-scoped (only items where they are on the team); `*` = cross-tenant (Super Admin).

When multiple notations apply, the lowest scope that satisfies wins (e.g., `H` for a recruiter even though they are also tenant-scoped).

## 3. Matrix

### 3.1 Tenant management

| Action | SUPER_ADMIN | TENANT_ADMIN | RECRUITER | HIRING_MANAGER | INTERVIEWER | CANDIDATE | FINANCE_ADMIN | COMPLIANCE_ADMIN |
|--------|------------|--------------|-----------|----------------|-------------|-----------|---------------|------------------|
| Create tenant | ✓ | — | — | — | — | — | — | — |
| Read tenant detail | ✓ * | ✓ T (own) | ✓ T (own, redacted) | ✓ T (own, redacted) | ✓ T (own, redacted) | — | ✓ T (own) | ✓ T (own) |
| Update tenant profile/branding | ✓ * | ✓ T | — | — | — | — | — | — |
| Suspend / resume tenant | ✓ * | — | — | — | — | — | — | — |
| Delete tenant | ✓ * | — | — | — | — | — | — | — |
| Configure tenant entitlements | ✓ * | (read-only) | — | — | — | — | ✓ T (billing-related) | — |

### 3.2 User management

| Action | SUPER_ADMIN | TENANT_ADMIN | RECRUITER | HIRING_MANAGER | INTERVIEWER | CANDIDATE | FINANCE_ADMIN | COMPLIANCE_ADMIN |
|--------|------------|--------------|-----------|----------------|-------------|-----------|---------------|------------------|
| Invite tenant user | ✓ * | ✓ T | — | — | — | — | — | — |
| Read user list (within tenant) | ✓ * | ✓ T | ✓ T | ✓ T | — | — | ✓ T | ✓ T |
| Read user detail | ✓ * | ✓ T | ✓ T (basic) | ✓ T (basic) | — | ✓ O | ✓ T (basic) | ✓ T |
| Update user (name, prefs) | ✓ * | ✓ T | — | — | — | ✓ O | — | — |
| Reset user password (by admin) | ✓ * | ✓ T | — | — | — | ✓ O | — | — |
| Grant/revoke role | ✓ * | ✓ T | — | — | — | — | — | — |
| Suspend / delete user | ✓ * | ✓ T | — | — | — | ✓ O (delete via DSAR) | — | ✓ T (compliance-driven) |
| Impersonate user | ✓ * (audited) | — | — | — | — | — | — | — |

### 3.3 Job management

| Action | SUPER_ADMIN | TENANT_ADMIN | RECRUITER | HIRING_MANAGER | INTERVIEWER | CANDIDATE | FINANCE_ADMIN | COMPLIANCE_ADMIN |
|--------|------------|--------------|-----------|----------------|-------------|-----------|---------------|------------------|
| Create job | ✓ * | ✓ T | ✓ T | ✓ T | — | — | — | — |
| Read job (recruiter side) | ✓ * | ✓ T | ✓ T | ✓ T | ✓ H | — | — | ✓ T |
| Read job (public, only PUBLISHED) | ✓ * | ✓ * | ✓ * | ✓ * | ✓ * | ✓ (PUBLISHED only) | ✓ * | ✓ * |
| Update job | ✓ * | ✓ T | ✓ T (created) or H | ✓ H | — | — | — | — |
| Publish job | ✓ * | ✓ T | ✓ H | ✓ H | — | — | — | — |
| Unpublish job | ✓ * | ✓ T | ✓ H | ✓ H | — | — | — | — |
| Close job | ✓ * | ✓ T | ✓ H | ✓ H | — | — | — | — |
| Clone job | ✓ * | ✓ T | ✓ T | ✓ T | — | — | — | — |
| Assign hiring team | ✓ * | ✓ T | ✓ H (Recruiter on team) | ✓ H | — | — | — | — |
| Sponsored boost | ✓ * | ✓ T | — | — | — | — | ✓ T | — |

### 3.4 Candidate profile management

| Action | SUPER_ADMIN | TENANT_ADMIN | RECRUITER | HIRING_MANAGER | INTERVIEWER | CANDIDATE | FINANCE_ADMIN | COMPLIANCE_ADMIN |
|--------|------------|--------------|-----------|----------------|-------------|-----------|---------------|------------------|
| Create profile (signup) | — | — | — | — | — | ✓ self | — | — |
| Read own profile | — | — | — | — | — | ✓ O | — | — |
| Update own profile | — | — | — | — | — | ✓ O | — | — |
| Read candidate profile (recruiter side, applied to my tenant) | ✓ * | ✓ T | ✓ T | ✓ T | ✓ H | — | — | ✓ T |
| Read candidate (resume DB, opted in) | ✓ * | ✓ T (if entitlement) | ✓ T (if entitlement) | ✓ T (if entitlement) | — | — | — | — |
| Delete own profile (DSAR) | ✓ * (operator) | — | — | — | — | ✓ O | — | ✓ T |
| Mask / redact profile (compliance) | ✓ * | — | — | — | — | — | — | ✓ T |

### 3.5 Application management

| Action | SUPER_ADMIN | TENANT_ADMIN | RECRUITER | HIRING_MANAGER | INTERVIEWER | CANDIDATE | FINANCE_ADMIN | COMPLIANCE_ADMIN |
|--------|------------|--------------|-----------|----------------|-------------|-----------|---------------|------------------|
| Submit application (own) | — | — | — | — | — | ✓ O | — | — |
| Withdraw own application | — | — | — | — | — | ✓ O | — | — |
| Read application (own) | — | — | — | — | — | ✓ O | — | — |
| Read application (recruiter side) | ✓ * | ✓ T | ✓ T | ✓ T | ✓ H (limited fields, no resume access unless granted) | — | — | ✓ T |
| Move stage / change status | ✓ * | ✓ T | ✓ T | ✓ T | — | — | — | — |
| Reject application | ✓ * | ✓ T | ✓ T | ✓ T | — | — | — | — |
| Bulk action | ✓ * | ✓ T | ✓ T (with per-row check) | ✓ T (with per-row check) | — | — | — | — |
| Add note / tag / rating | ✓ * | ✓ T | ✓ T | ✓ T | ✓ H (notes only) | — | — | ✓ T (read) |
| Delete note (own) | ✓ * | ✓ T | ✓ O | ✓ O | ✓ O | — | — | — |
| Read application timeline | ✓ * | ✓ T | ✓ T | ✓ T | ✓ H | ✓ O | — | ✓ T |

### 3.6 Pipeline management

| Action | SUPER_ADMIN | TENANT_ADMIN | RECRUITER | HIRING_MANAGER | INTERVIEWER | CANDIDATE | FINANCE_ADMIN | COMPLIANCE_ADMIN |
|--------|------------|--------------|-----------|----------------|-------------|-----------|---------------|------------------|
| Read pipeline | ✓ * | ✓ T | ✓ T | ✓ T | ✓ H | — | — | — |
| Create / edit pipeline | ✓ * | ✓ T | — | — | — | — | — | — |
| Reorder / disable stages | ✓ * | ✓ T | — | — | — | — | — | — |
| Per-job pipeline override | ✓ * | ✓ T | ✓ H | ✓ H | — | — | — | — |

### 3.7 Interview management

| Action | SUPER_ADMIN | TENANT_ADMIN | RECRUITER | HIRING_MANAGER | INTERVIEWER | CANDIDATE | FINANCE_ADMIN | COMPLIANCE_ADMIN |
|--------|------------|--------------|-----------|----------------|-------------|-----------|---------------|------------------|
| Schedule interview | ✓ * | ✓ T | ✓ H | ✓ H | — | — | — | — |
| Reschedule / cancel | ✓ * | ✓ T | ✓ H | ✓ H | — | ✓ O (request only) | — | — |
| Submit feedback | — | — | ✓ H (own slot) | ✓ H (own slot) | ✓ H (own slot) | — | — | — |
| Read feedback (others') | ✓ * | ✓ T | ✓ H (after own submitted) | ✓ H (after own submitted) | ✓ H (after own submitted) | — | — | ✓ T |
| Read interview details | ✓ * | ✓ T | ✓ H | ✓ H | ✓ H (own) | ✓ O (own) | — | ✓ T |

### 3.8 Offer management

| Action | SUPER_ADMIN | TENANT_ADMIN | RECRUITER | HIRING_MANAGER | INTERVIEWER | CANDIDATE | FINANCE_ADMIN | COMPLIANCE_ADMIN |
|--------|------------|--------------|-----------|----------------|-------------|-----------|---------------|------------------|
| Draft offer | ✓ * | ✓ T | ✓ H | ✓ H | — | — | — | — |
| Approve offer | ✓ * | ✓ T | — | ✓ H (one of approvers) | — | — | ✓ T | — |
| Send offer | ✓ * | ✓ T | ✓ H | ✓ H | — | — | — | — |
| Accept / decline offer | — | — | — | — | — | ✓ O | — | — |
| Rescind offer | ✓ * | ✓ T | ✓ H | ✓ H | — | — | — | — |

### 3.9 Resume access

| Action | SUPER_ADMIN | TENANT_ADMIN | RECRUITER | HIRING_MANAGER | INTERVIEWER | CANDIDATE | FINANCE_ADMIN | COMPLIANCE_ADMIN |
|--------|------------|--------------|-----------|----------------|-------------|-----------|---------------|------------------|
| Upload resume (own) | — | — | — | — | — | ✓ O | — | — |
| Read own resume list | — | — | — | — | — | ✓ O | — | — |
| Read resume of an applied candidate (recruiter) | ✓ * | ✓ T | ✓ T | ✓ T | ✓ H | — | — | ✓ T |
| Download resume (audited) | ✓ * | ✓ T | ✓ T | ✓ T | ✓ H | ✓ O | — | ✓ T |
| Resume DB search (cross-application) | ✓ * | ✓ T (if entitlement) | ✓ T (if entitlement) | ✓ T (if entitlement) | — | — | — | — |

### 3.10 AI features

| Action | SUPER_ADMIN | TENANT_ADMIN | RECRUITER | HIRING_MANAGER | INTERVIEWER | CANDIDATE | FINANCE_ADMIN | COMPLIANCE_ADMIN |
|--------|------------|--------------|-----------|----------------|-------------|-----------|---------------|------------------|
| Use AI tools (candidate side) | — | — | — | — | — | ✓ O (per consent + quota) | — | — |
| Use AI tools (recruiter side) | ✓ * | ✓ T | ✓ T | ✓ T | — | — | — | — |
| Approve AI artifact (own) | — | — | — | — | — | ✓ O | — | — |
| Configure AI quotas (tenant) | ✓ * | ✓ T (within plan) | — | — | — | — | ✓ T (limits) | — |
| Disable AI for tenant | ✓ * | ✓ T | — | — | — | — | — | — |
| Manage prompts / models | ✓ * | — | — | — | — | — | — | — |

### 3.11 Billing

| Action | SUPER_ADMIN | TENANT_ADMIN | RECRUITER | HIRING_MANAGER | INTERVIEWER | CANDIDATE | FINANCE_ADMIN | COMPLIANCE_ADMIN |
|--------|------------|--------------|-----------|----------------|-------------|-----------|---------------|------------------|
| Read invoices | ✓ * | ✓ T | — | — | — | — | ✓ T | — |
| Pay invoice | ✓ * | ✓ T | — | — | — | — | ✓ T | — |
| Upgrade / downgrade plan | ✓ * | ✓ T | — | — | — | — | ✓ T | — |
| Buy sponsored placement | ✓ * | ✓ T | — | — | — | — | ✓ T | — |
| Read usage records | ✓ * | ✓ T | — | — | — | — | ✓ T | — |

### 3.12 Analytics

| Action | SUPER_ADMIN | TENANT_ADMIN | RECRUITER | HIRING_MANAGER | INTERVIEWER | CANDIDATE | FINANCE_ADMIN | COMPLIANCE_ADMIN |
|--------|------------|--------------|-----------|----------------|-------------|-----------|---------------|------------------|
| Tenant analytics | ✓ * | ✓ T | ✓ T (own jobs) | ✓ T (own jobs) | — | — | ✓ T (billing-related) | — |
| Platform analytics | ✓ * | — | — | — | — | — | — | — |
| Search analytics | ✓ * | ✓ T | ✓ T | ✓ T | — | — | — | — |

### 3.13 Audit logs

| Action | SUPER_ADMIN | TENANT_ADMIN | RECRUITER | HIRING_MANAGER | INTERVIEWER | CANDIDATE | FINANCE_ADMIN | COMPLIANCE_ADMIN |
|--------|------------|--------------|-----------|----------------|-------------|-----------|---------------|------------------|
| Read audit log (own actions) | ✓ * | ✓ T (own) | ✓ T (own) | ✓ T (own) | ✓ T (own) | ✓ O | ✓ T (own) | ✓ T |
| Read audit log (any user in tenant) | ✓ * | ✓ T | — | — | — | — | — | ✓ T |
| Read audit log (cross-tenant) | ✓ * | — | — | — | — | — | — | — |
| Export audit log | ✓ * | ✓ T (rate-limited) | — | — | — | — | — | ✓ T |

### 3.14 Compliance exports & DSAR

| Action | SUPER_ADMIN | TENANT_ADMIN | RECRUITER | HIRING_MANAGER | INTERVIEWER | CANDIDATE | FINANCE_ADMIN | COMPLIANCE_ADMIN |
|--------|------------|--------------|-----------|----------------|-------------|-----------|---------------|------------------|
| Request own data export (DSAR) | — | — | — | — | — | ✓ O | — | — |
| Process DSAR export (operator) | ✓ * | — | — | — | — | — | — | ✓ T |
| Request own deletion | — | — | — | — | — | ✓ O | — | — |
| Process DSAR deletion | ✓ * | — | — | — | — | — | — | ✓ T |
| Configure retention policy | ✓ * | (read) | — | — | — | — | — | ✓ T |
| Place / lift legal hold | ✓ * | — | — | — | — | — | — | ✓ T |

### 3.15 Admin moderation

| Action | SUPER_ADMIN | TENANT_ADMIN | RECRUITER | HIRING_MANAGER | INTERVIEWER | CANDIDATE | FINANCE_ADMIN | COMPLIANCE_ADMIN |
|--------|------------|--------------|-----------|----------------|-------------|-----------|---------------|------------------|
| Read moderation queue | ✓ * | ✓ T | — | — | — | — | — | ✓ T |
| Hide / remove a job | ✓ * | ✓ T | — | — | — | — | — | ✓ T |
| Ban a user | ✓ * | ✓ T (within tenant) | — | — | — | — | — | ✓ T |
| Manage feature flags | ✓ * | (read tenant flags) | — | — | — | — | — | — |

## 4. Frontend visibility rules

The frontend uses the same matrix to **show / hide** UI affordances. Server APIs remain the source of truth — frontend never trusts itself.

- **Auth-aware nav**: nav items only render when the user has at least one of the required roles. Use a small helper `<Can roles={['RECRUITER','HIRING_MANAGER']}>...</Can>` that reads roles from session.
- **Per-row permission checks**: lists render row actions only when the row's tenant id matches the user's active tenant AND the user has the required role for that action.
- **Optimistic action UX**: when an action will be checked server-side anyway, allow the click; show errors graciously rather than gating in JS only.

## 5. API authorization guidance

- Method-level enforcement uses Spring Security `@PreAuthorize` with SpEL expressions, e.g.:
  - `@PreAuthorize("hasAnyRole('TENANT_ADMIN','RECRUITER','HIRING_MANAGER')")`
  - `@PreAuthorize("@apps.canActOnApplication(#applicationId, principal, 'STAGE_CHANGE')")` for hiring-team-scoped checks.
- A **per-aggregate authorization service** (`AppAuthz`, `JobAuthz`, etc.) encapsulates the H/T/O semantics so controllers stay declarative and testable.
- Tenant resolution is upstream of role enforcement. The pipeline:
  1. `TenantIdentityFilter` (existing in `platform-starter`) sets `TenantContext`.
  2. A new `RoleGrantsFilter` (Prompt 24) extracts `roles` claim and seeds Spring Security `Authentication` with `SimpleGrantedAuthority("ROLE_X")`.
  3. Controller `@PreAuthorize` runs.
  4. Service computes any aggregate-level scope checks (H, O).
  5. Repository writes/reads with `tenant_id` from `TenantContext`.

## 6. Test plan

For each row in this matrix marked `✓` or scoped, the integration test suite SHALL include:
- A **positive** test: actor with the role can perform the action on the in-scope item.
- A **wrong-tenant** test: actor with the role but on a different tenant → 401/403/empty.
- An **out-of-scope** test: actor with the role but lacking the H/O scope → 403.
- A **role denial** test: actor without the role → 403.

Cases are mechanized via parameterized tests in `application-service`, `job-service`, `candidate-service`, `admin-service`. See [`16-devops/testing-strategy.md`](../16-devops/testing-strategy.md).

## 7. Open issues

| # | Issue | Resolution |
|---|---|---|
| 1 | Roles claim is not in JWT yet (only `tenant_id`, `subject`). | Prompt 24 adds `roles` claim and updates `tenant-auth-service` demo token. |
| 2 | `INTERVIEWER` resume access is debated (privacy vs effective interview). | Default: NO resume access for `INTERVIEWER`; show only candidate name + headline + the interview's structured questions. Tenant Admin may flip per-tenant. |
| 3 | Hiring team membership lookup is per-job; for high-frequency endpoints this may need caching. | Cache `(user, job) → roles_on_team` in Redis with short TTL (e.g., 30s) and invalidate on team changes. |
