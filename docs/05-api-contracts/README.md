# 05 — API contracts

The plan and conventions for every REST API exposed by the platform. **Authoritative machine-readable contracts live in [`packages/shared-contracts/openapi/`](../../packages/shared-contracts/openapi/).** This folder describes how those contracts are organized, the shared error model, pagination, idempotency, versioning, and which service owns which endpoint group.

## Files (current and planned)

| File | Purpose | Status |
|------|---------|--------|
| [`api-contract-plan.md`](./api-contract-plan.md) | Endpoint inventory grouped by service/module, with HTTP method, request/response summary, authorization role, tenant behavior, idempotency, error responses. | Authoritative |
| `error-model.md` | Canonical error response schema, error codes, validation error envelope, retry semantics. | Planned |
| `pagination.md` | Cursor vs offset pagination, page size limits, `next_cursor`/`prev_cursor` rules. | Planned |
| `idempotency.md` | `Idempotency-Key` header rules: which endpoints require it, server-side dedupe window, error responses on key reuse with different payloads. | Planned |

## Source of truth

- **OpenAPI 3.1 YAMLs:** [`packages/shared-contracts/openapi/`](../../packages/shared-contracts/openapi/)
- **Generated TS types** (target): consumed by `packages/api-sdk` once codegen lands.
- **Existing files:** `recruiter-search-gateway.yaml` (v0.2.0). The prompt 8 work in this doc set creates `auth-api.yaml`, `tenant-api.yaml`, `candidate-api.yaml`, `resume-api.yaml`, `job-api.yaml`, `application-api.yaml`, `notification-api.yaml`, `admin-api.yaml`.

## Conventions

- All endpoints under `/api/v1/...` for service APIs; gateway lives under `/v1/...` (no `/api` prefix) per the existing `search-gateway` convention.
- Bearer JWT (`Authorization: Bearer <token>`) is the default security scheme. The token's `tenant_id` claim is mandatory for tenant-scoped endpoints.
- Tenant header (`X-Jobocate-Tenant-Id`) is **dev-only** and must be disabled in production via `JOBOCATE_ALLOW_HEADER_TENANT=false`.
- All responses use `application/json`. All 4xx/5xx responses follow the canonical error envelope.
- Mutating endpoints that can be safely retried by clients accept an `Idempotency-Key` header; application submission **must** require it.
- Pagination defaults: `limit=25`, `max=100`. Prefer cursor pagination for tenant-scoped lists that are append-mostly.
