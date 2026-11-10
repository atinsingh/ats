# Cross-tenant test plan

Every tenant-scoped service must ship the test contract below. The
goal is to make it impossible to land a regression where tenant A
data leaks to tenant B.

## Required test cases

For every tenant-scoped REST resource (`X` = `applications`, `jobs`,
`candidates`, `resumes`, `notifications`, `ai-artifacts`, …):

### R1 — Read isolation

```text
Given a row owned by tenantA
When tenantB issues GET /api/v1/X/{id}
Then the response is HTTP 404 with body.error.code = X_NOT_FOUND
```

A 404 (not 403) is required to avoid leaking the existence of
another tenant's resources.

### R2 — List isolation

```text
Given rows owned by tenantA
When tenantB issues GET /api/v1/X (with no filters)
Then the result page does not contain any tenantA rows
```

### W1 — Update isolation

```text
Given a row owned by tenantA
When tenantB issues PATCH /api/v1/X/{id}
Then the response is HTTP 404
And the row in the database is unchanged
```

### W2 — Delete isolation

```text
Given a row owned by tenantA
When tenantB issues DELETE /api/v1/X/{id}
Then the response is HTTP 404
And the row in the database still exists
```

### W3 — Idempotency-key isolation

For endpoints that honor `Idempotency-Key`:

```text
Given tenantA POSTed /api/v1/X with Idempotency-Key = K and got back resource A_1
When tenantB POSTs /api/v1/X with Idempotency-Key = K
Then a new resource is created (B_1) for tenantB
And tenantB's response does NOT echo tenantA's resource id
```

### S1 — Search isolation (search-gateway only)

```text
Given tenantA documents and tenantB documents in OpenSearch
When tenantB issues GET /v1/search/jobs
Then no tenantA hits are returned, regardless of caller filter list
```

### E1 — Event isolation (Kafka consumers)

```text
Given a Kafka message with payload.tenant_id = tenantA
When the consumer is invoked while TenantContext is empty
Then the consumer establishes its own TenantContext from the payload
And subsequent DB reads/writes use payload.tenant_id, not request thread state
```

## Implemented coverage

| Service | Test class / method | Cases covered |
|---|---|---|
| `application-service` | `ApplicationServiceTest.crossTenantReadIsBlocked` | R1 (service-level) |
| `application-service` | `ApplicationControllerTest.getReturns404ForOtherTenant` | R1 (HTTP) |
| `application-service` | `AiArtifactServiceTest.crossTenantLookupReturnsNotFound` | R1 (AI artifacts) |
| `job-service` | `JobControllerTest.getReturns404ForOtherTenant` | R1 (HTTP) |
| `platform-starter` | `TenantIdentityFilterTest.rejectsRequestWithoutTokenWhenDevHeaderDisabled` | Tenant resolution preconditions |
| `platform-starter` | `TenantIdentityFilterTest.parsesJwtTenantClaim` | JWT-based resolution |
| `platform-starter` | `InternalTokenFilterTest.rejectsRequestWithMissingToken` | Internal endpoint isolation |

## Required additions (tracked)

| Service | Missing case | Tracking |
|---|---|---|
| `candidate-service` | R1, R2, W1, W2 for `/api/v1/candidates` and `/api/v1/me/resumes` | issue: `cand-svc/cross-tenant` |
| `notification-service` | R1, R2 for `/api/v1/me/notifications` | issue: `notif-svc/cross-tenant` |
| Go `search-gateway` | S1 in the gateway integration tests | issue: `search-gw/tenant-filter-test` |
| All Kafka consumers | E1 — make sure consumers always read tenant from payload | issue: `kafka/tenant-from-payload` |

## CI gate

The Gradle build for every Java service must include at least one
`*CrossTenantTest` (or an equivalent named test class) in
`src/test/java`. The CI pipeline asserts the test report contains a
test class matching the regex `.*CrossTenant.*` for tenant-scoped
services. See `docs/16-devops/testing-strategy.md` for the full
quality-gate set.
