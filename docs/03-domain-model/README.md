# 03 — Domain model

The canonical domain — entities, relationships, aggregates, lifecycle states, ID strategy, and the Postgres schema design that backs them. All persistence decisions for the platform live here.

## Files (current and planned)

| File | Purpose | Status |
|------|---------|--------|
| [`domain-model.md`](./domain-model.md) | Bounded contexts, aggregates, entities, relationships, tenant scope, lifecycle states, audit and indexing requirements. | Authoritative |
| [`database-design.md`](./database-design.md) | PostgreSQL physical design: tables, columns, PKs, FKs, indexes, constraints, soft-delete strategy, Flyway migration strategy. Does not include SQL bodies (those live in each service's `db/migration` and are governed by [`16-devops/coding-standards.md`](../16-devops/coding-standards.md)). | Authoritative |
| `er-diagram.md` | Mermaid ER diagram(s) per bounded context. | Planned |

## Conventions

- **IDs:** UUID v4 across the board. Generated server-side; never inferred from client input.
- **Tenant scope:** every business entity carries `tenant_id UUID NOT NULL` with an index on it. Tables that are platform-global (e.g. `tenants`, `subscription_plans`) are explicitly noted.
- **Timestamps:** `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`, `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`, `created_by UUID`, `updated_by UUID`. Keep timezone-aware.
- **Soft delete:** `deleted_at TIMESTAMPTZ NULL` on entities where retention requires it; queries must filter `deleted_at IS NULL` by default. Disposition codes are separate from soft-delete.
- **Optimistic locking:** `version BIGINT NOT NULL DEFAULT 0` mapped to JPA `@Version`.
- **Status enums:** stored as `VARCHAR(64)`, never as Postgres `enum` types (avoids schema-rewrite migrations).
- **Money:** integer cents (`BIGINT`) plus `currency_code CHAR(3)`. No floats.
