# 06 — Search engine

OpenSearch-backed search subsystem: index strategy, document schemas, ranking, autocomplete, hybrid retrieval, indexing pipeline, and operational concerns.

## Files (current and planned)

| File | Purpose | Status |
|------|---------|--------|
| [`search-architecture.md`](./search-architecture.md) | Job and candidate search architecture, index aliases, ranking, sponsored slots, tenant filtering, consent filtering, indexing pipeline, latency SLOs, failure handling. | Authoritative |
| `opensearch-mappings.md` | Reference field mappings per index (job, candidate, optional application). | Planned |
| `ranking-and-relevance.md` | Boost rules, sponsored slot behavior, hybrid lexical+vector blending, A/B test hooks. | Planned |
| `reindex-runbook.md` | When and how to rebuild an index, blue/green alias swap, throttle, validation. | Planned |

## Source of truth

- **Index document schemas:** [`packages/shared-contracts/schemas/`](../../packages/shared-contracts/schemas/)
  - `job-index-document.schema.json` (existing, v0.x)
  - `candidate-index-document.schema.json` (added by Prompt 11)
- **Gateway contract:** [`packages/shared-contracts/openapi/recruiter-search-gateway.yaml`](../../packages/shared-contracts/openapi/recruiter-search-gateway.yaml)

## Non-negotiables

- **Tenant filter** is applied to every search query inside the gateway, never trusted from the client.
- **Consent filter** is applied to every candidate search query (`profile_visibility != 'PRIVATE'` and `consent_searchable == true` for the requesting tenant).
- **PostgreSQL is the source of truth.** OpenSearch is rebuildable from the source DB + Kafka history + reindex job.
- **Closed/unpublished jobs and revoked-consent candidates are removed** from search within an SLO of 60 seconds of the source change.
- **Sponsored ranking** is applied via document `boost_score` field plus a query-time function score; it never bypasses tenant or consent filters.
