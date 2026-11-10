# Testing strategy

The complete testing playbook for the Jobocate Recruitment Portal +
ATS platform. Covers Java services, Go services, Python workers, the
Next.js apps, contracts, and the cross-cutting concerns
(multi-tenancy, search relevance, AI output quality, security,
performance). Every CI quality gate the platform enforces is named
here.

## 1. Test pyramid (per service)

```
                   ┌──────────────────────┐
                   │ E2E / smoke (few)    │  ← run on release branches + nightly
                   ├──────────────────────┤
                   │ Contract tests       │  ← run on every PR
                   ├──────────────────────┤
                   │ Integration tests    │  ← Testcontainers (DB / Kafka / OS)
                   ├──────────────────────┤
                   │ Slice tests          │  ← @WebMvcTest, @DataJpaTest, httptest
                   ├──────────────────────┤
                   │ Unit tests (most)    │  ← pure functions, no Spring/Postgres
                   └──────────────────────┘
```

Aim for the **broad base**: most coverage from fast unit tests; a
healthy band of integration tests that prove wiring; a small set of
contract + e2e tests that guard external behavior.

## 2. Java (Spring Boot 4.x, Java 21)

### 2.1 Tooling

| Concern | Tool |
|---|---|
| Test framework | JUnit Jupiter 5 |
| Assertions | AssertJ |
| Mocking | Mockito + Mockito-inline |
| Spring slices | `@WebMvcTest`, `@DataJpaTest`, `@JsonTest` |
| Integration | `@SpringBootTest` with Testcontainers `postgres:16-alpine` |
| Kafka | Spring Kafka test (`spring-kafka-test`) or Testcontainers Redpanda |
| HTTP client | `MockMvc` (servlet) and `WebTestClient` (reactive) |
| Security | `spring-security-test` (`SecurityMockMvcRequestPostProcessors`) |
| Coverage | JaCoCo (target ≥ 80% line on changed packages) |
| Static analysis | Spotless + Checkstyle (formatting), SpotBugs / ErrorProne (semantics) |
| Mutation (optional) | Pitest on hot domain packages |

### 2.2 Layered approach

| Layer | Approach | Example |
|---|---|---|
| Domain (records, value objects, pure logic) | Pure JUnit, no Spring context | `ApplicationStateMachineTest` |
| Application services | `@SpringBootTest` + Testcontainers; injects real `JpaRepository`s | `ApplicationServiceTest`, `AiArtifactServiceTest` |
| Persistence (`JpaRepository`) | `@DataJpaTest` + Testcontainers | per-repo `*RepositoryTest` |
| REST controllers | `@WebMvcTest` + `MockMvc` + `spring-security-test` for auth | `ApplicationControllerTest`, `JobControllerTest` |
| Filters / security | Servlet mocks (`MockHttpServletRequest`) | `TenantIdentityFilterTest`, `InternalTokenFilterTest`, `RequestLoggingFilterTest` |
| Kafka listeners | Embedded Kafka or `KafkaTestUtils` | `JobSearchProjectionListenerTest` |
| JSON contracts | `@JsonTest` against shared schemas | per-DTO contract test |
| Outbox | Integration test inserts row, asserts Kafka publish | per-service outbox publisher test |

### 2.3 Test base patterns

- `IntegrationTestBase` (one per service) bootstraps Testcontainers
  Postgres, configures Flyway, and provides `TenantContext`
  initialization via `@BeforeEach` so tests don't have to remember.
- `WebMvcTestBase` (where useful) wires `spring-security-test` and a
  default `JobocateAuthentication` so tests can override per-case.
- Cross-tenant tests are mandatory and live in `*CrossTenant*` named
  classes (see `docs/09-multi-tenancy/cross-tenant-test-plan.md`).

### 2.4 Minimum bar per Java service

- ≥ 1 domain unit test class per aggregate.
- ≥ 1 service-level integration test per public command path.
- ≥ 1 controller test asserting the canonical error envelope.
- ≥ 1 cross-tenant test (R1 from the cross-tenant test plan).
- All Flyway migrations apply cleanly on a fresh Testcontainers
  Postgres (covered by every `@SpringBootTest`).

## 3. Go (`search-gateway`)

### 3.1 Tooling

| Concern | Tool |
|---|---|
| Framework | Standard `testing` + `httptest` |
| Assertions | `testify/require` (selectively) |
| Coverage | `go test -cover` (target ≥ 80% on `internal/`) |
| Linting | `golangci-lint` (errcheck, govet, staticcheck, ineffassign, gocritic) |
| Integration | Build-tagged `//go:build integration` against OpenSearch container |

### 3.2 Categories

- **Unit** — table-driven tests for `buildSearchBody`, query parsers,
  validators, and the redaction helpers. Lives next to source.
- **HTTP slice** — `httptest.NewServer` wrapping the chi mux; assert
  status codes, response shapes, tenant filter enforcement, and
  request-id propagation.
- **OpenSearch integration** — opt-in via build tag. Brings up
  `opensearchproject/opensearch:2.17.1` via `dockertest`, indexes a
  fixture, hits `/v1/search/jobs`, asserts hits + facets.

### 3.3 Minimum bar

- All filter validators have table tests covering valid + invalid +
  edge inputs.
- The `tenantHeader` middleware path returns 401 when missing.
- The query body always contains `term: { tenant_id: <header> }`.
- Bulk-index endpoints reject documents without `tenant_id`.

## 4. Python workers

### 4.1 Tooling

| Concern | Tool |
|---|---|
| Framework | `pytest` |
| Lint | `ruff` |
| Type-check | `mypy --strict` on `src/` |
| Coverage | `pytest-cov` (target ≥ 80%) |
| Fixtures | `tests/fixtures/` golden files |
| HTTP mocks | `respx` / `httpx.MockTransport` |

### 4.2 Categories

- **Unit** — pure functions in `normalize.py`, `renderer.py`, etc.
  No Kafka, no S3.
- **Worker pipeline** — `tests/test_kafka_worker.py` style tests that
  exercise the parse/produce loop with stubbed Kafka clients (lazy
  `kafka` import keeps tests independent of the runtime).
- **Provider stubs** — for `ai-artifact-worker`, `StubProvider`
  asserts deterministic output per `kind` so contract regressions
  surface immediately.

### 4.3 Minimum bar

- `resume-parser-worker`: golden tests for at least one PDF and one
  DOCX fixture; regex-driven extraction tests for email, phone, name,
  years-of-experience, and skills.
- `ai-artifact-worker`: a `StubProvider` test for every supported
  `AiArtifactKind`.
- All workers: a serialize/deserialize round-trip test for the
  request and result Kafka payloads.

## 5. Next.js / TypeScript

### 5.1 Tooling

| Concern | Tool |
|---|---|
| Type-check | `tsc --noEmit` (CI gate per app) |
| Linting | ESLint (`@jobocate/eslint-config`) |
| Unit / component | Vitest + Testing Library |
| Browser e2e | Playwright (smoke set, run on release branches) |
| Visual regression | Optional — Chromatic / Playwright snapshot |
| Accessibility | `axe-playwright` on the smoke flow |

### 5.2 Categories

- **Type** — `pnpm tsc --noEmit` on every app and package; CI gate
  for `apps/job-portal-web`, `apps/ats-recruiter-web`,
  `packages/api-sdk`, `packages/ui`, `packages/shared-contracts`.
- **Component / hook** — Vitest on hooks (`useApply`, `useJobsList`,
  …) and small components (form validators, status badges).
- **Page render** — App-router page tests via Vitest with mocked
  fetch; assert empty / loading / error states.
- **E2E smoke** — Playwright covers:
  - candidate signup → resume upload → apply to job
  - recruiter login → create job → review applicant
  - cross-tenant guardrail: log in as tenant B, paste tenant A URL,
    expect 404

### 5.3 Minimum bar

- Every page must render without runtime error in a Vitest "render
  smoke" test (mocked SDK).
- Every form has a Vitest validator test for the unhappy path.
- The two e2e flows above must be green on `main`.

## 6. Contract tests (`packages/shared-contracts`)

| Surface | Test |
|---|---|
| OpenAPI YAMLs | Spectral lint (zero errors); `oasdiff` for breaking-change detection between PR and `main`; `swagger-cli validate` |
| JSON Schemas | `ajv` validation of fixtures under `packages/shared-contracts/fixtures/` |
| Kafka topics | YAML schema check + `kafka-schema-registry` round-trip (planned) |
| Generated SDK | `pnpm --filter @jobocate/api-sdk build` must succeed; `tsc --noEmit` must pass downstream |

CI fails on any breaking OpenAPI change unless the PR is labeled
`breaking-change` and has owner approval.

## 7. Multi-tenant isolation tests

See `docs/09-multi-tenancy/cross-tenant-test-plan.md` for the full
case set (R1, R2, W1, W2, W3, S1, E1). Summary:

- Every tenant-scoped service must include at least one
  `*CrossTenant*` test class.
- The CI quality gate asserts the test report contains a class
  matching `.*CrossTenant.*` for `application-service`, `job-service`,
  `candidate-service`, `notification-service`, and (Go-side)
  `search-gateway`.
- The `RequestLoggingFilterTest` proves MDC carries `tenantId` so
  every log line is tenant-attributed.

## 8. Security tests

| Test | Where | Checks |
|---|---|---|
| Auth filter rejects missing token | `TenantIdentityFilterTest` | 401 when bearer absent in non-dev |
| Internal token enforcement | `InternalTokenFilterTest` | `/internal/v1/**` requires `Authorization: Bearer <internal>` |
| Role gating | `@WebMvcTest` + `with(jwt().authorities(...))` | `RECRUITER`-only endpoints reject `CANDIDATE` |
| Method security | Service unit tests using `@WithMockUser` | `@PreAuthorize` enforced |
| File upload limits | Resume upload integration test | 413 / 415 on bad mime / too large |
| CORS | `MockMvc` request from disallowed origin | preflight rejected |
| OWASP dependency scan | `gradle dependencyCheck` (Java), `pnpm audit` (JS), `pip-audit` (Python) | high-severity CVE → fail PR |
| Secret scanning | `gitleaks` on every PR | leaked tokens fail |
| SAST | Semgrep ruleset (Java + JS + Go) | nightly + PR delta |

## 9. Performance tests

| Surface | Tool | Workload | Frequency |
|---|---|---|---|
| `search-gateway` `/v1/search/jobs` | `k6` | 50 RPS sustained, 200 RPS burst, mixed query shape | per release |
| `application-service` POST /applications | `k6` | 25 RPS sustained, idempotency-key churn | per release |
| Kafka pipeline (job → searchable) | `k6` orchestrator that publishes synthetic `job.published` events | 10 events/sec for 10 min, assert P95 freshness < SLO | nightly |
| Resume parser end-to-end | scripted upload of 100 fixture resumes | parsing P95 < SLO | nightly |
| Worker callback throughput | direct Kafka producer + assert HTTP callbacks at scale | 50 events/sec for 5 min | per release |

Results are fed into Grafana panels listed in
`docs/15-observability/observability-plan.md` §8.

## 10. Search relevance tests

Search quality is product-critical (PRD §11), so it gets its own
test type beyond functional correctness.

- **Golden dataset** — a curated set of jobs + queries lives in
  `packages/shared-contracts/fixtures/search/`. Each query has an
  expected ranked list of `job_id`s within a tolerance.
- **Relevance harness** — Go test that boots OpenSearch with the
  golden corpus, runs each query through `search-gateway`, scores
  results with NDCG@10, and fails if NDCG drops > 5% versus the
  baseline checked into the repo.
- **Boost regression** — explicit tests for the boost rules
  (`featured`, `sponsored`, recency, tenant scoping) using a fixture
  pair that flips only the boost field.
- **Autocomplete** — table tests over (prefix → top-3 expected).

## 11. AI output evaluation

The platform's AI artifacts must remain human-reviewed before
submission (PRD §3.12). Tests must enforce that:

| Concern | Test |
|---|---|
| Lifecycle invariants | `AiArtifactServiceTest`: `READY_FOR_REVIEW` is required before approve; failure path emits `ai.artifact.failed`. |
| Idempotency | `idempotencyKey` collision returns the existing artifact, not a new one. |
| Stub provider determinism | `test_renderer.py`: every `AiArtifactKind` produces a non-empty, deterministic output for a fixed input. |
| Quality regression (post-MVP) | Golden prompts + reference outputs scored with a deterministic similarity (BLEU/ROUGE for cover letters; structural checks for summaries). Threshold is environmental — fail PR only if regression exceeds tolerance. |
| Safety filters | Test that disallowed prompt categories are rejected before reaching the LLM (post-MVP). |
| Cost ceilings | Worker test asserts a per-artifact cost cap, simulated via stubbed token counts. |

## 12. Regression suite

- **Per PR** — units, slices, contract checks, type-checks, lint,
  cross-tenant tests, security scans, search-gateway integration
  (against ephemeral OpenSearch).
- **Nightly** — Java integration with Testcontainers (full),
  Playwright e2e on `main`, performance baselines, search relevance,
  worker pipelines.
- **Release branch** — full e2e + performance + AI quality + soak
  test (1h sustained load) before tag.

The release-branch suite must be green for two consecutive runs
before a release is cut.

## 13. CI quality gates

The repository CI must enforce the following or block merge:

| Gate | Tooling | Failure mode |
|---|---|---|
| Java compile | `./gradlew compileJava compileTestJava` | hard fail |
| Java tests | `./gradlew test` (Testcontainers up) | hard fail |
| Java coverage | JaCoCo; `≥ 80%` on changed packages | hard fail |
| Java format | Spotless | hard fail (auto-fix on local) |
| Java SAST | SpotBugs / ErrorProne | hard fail on HIGH |
| Go build | `go build ./...` | hard fail |
| Go test | `go test ./...` | hard fail |
| Go coverage | `≥ 80%` on `internal/` | hard fail |
| Go lint | `golangci-lint run` | hard fail |
| Python tests | `pytest` per worker | hard fail |
| Python lint | `ruff check` | hard fail |
| Python type-check | `mypy --strict src/` | hard fail |
| TS type-check | `pnpm -r tsc --noEmit` | hard fail |
| TS lint | `pnpm -r lint` | hard fail |
| OpenAPI lint | `spectral lint` | hard fail |
| OpenAPI breaking change | `oasdiff` | warn → require label |
| JSON Schema validation | `ajv` over fixtures | hard fail |
| Cross-tenant tests present | regex on test reports | hard fail |
| Secret scan | `gitleaks` | hard fail |
| Dependency scan | gradle / pnpm / pip-audit | hard fail on HIGH |
| Migration apply (greenfield) | Testcontainers Postgres + `infra/sql/greenfield/V1__initial_ats_schema.sql` | hard fail |

The CI definition lives in `.github/workflows/ci.yml` (planned). Each
gate maps to one job; gates run in parallel where practical.

## 14. Local developer workflow

```bash
# Java: per service
./gradlew :services-java:application-service:test

# Java: full
./gradlew test

# Go gateway
cd services-go/search-gateway && go test ./...

# Python worker
cd workers-python/resume-parser-worker && PYTHONPATH=src pytest

# TypeScript
pnpm -r tsc --noEmit
pnpm -r lint
pnpm --filter @jobocate/api-sdk build

# Contract lint
pnpm spectral lint packages/shared-contracts/openapi/*.yaml

# Cross-tenant fast loop (Java)
./gradlew test --tests "*CrossTenant*"
```

The local `compose-dev` profile must be running for any test that
hits Kafka / OpenSearch / Postgres outside Testcontainers (rare —
prefer Testcontainers).

## 15. Coverage targets

| Layer | Target | Notes |
|---|---|---|
| Domain / pure logic | ≥ 90% | These tests are cheap; aim high. |
| Application services | ≥ 80% | Service-level integration covers most paths. |
| Repositories | Behavioral, not line-based | One happy-path test per query is enough. |
| Controllers | ≥ 80% | Plus the canonical error envelope assertion. |
| Filters / security | 100% | Small surface; cover all branches. |
| Kafka listeners | ≥ 80% | Plus a "DLT receives bad payload" test. |
| Workers | ≥ 80% on parse/render | Stub providers / renderers must be 100%. |
| Generated DTOs / boilerplate | low priority | exclude from JaCoCo. |
| UI components / hooks | ≥ 70% | Smoke + form validators. |

## 16. Test data management

- `infra/sql/greenfield/V1__initial_ats_schema.sql` is the canonical
  starting point for any test that needs a Postgres schema.
- Per-test fixtures live under `src/test/resources/fixtures/`
  (Java), `tests/fixtures/` (Python, Go).
- Tenants used in tests: `TENANT_A = 11111111-0000-0000-0000-00000000000a`,
  `TENANT_B = 11111111-0000-0000-0000-00000000000b`. These constants
  appear across services and must not be reused for production
  tenants.
- AI artifact fixtures use the `StubProvider` outputs so tests are
  deterministic offline.
