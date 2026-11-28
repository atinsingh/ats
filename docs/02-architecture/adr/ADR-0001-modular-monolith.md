# ADR-0001: Run the Java backend as one modular monolith

- **Status:** Proposed
- **Date:** 2026-11-21
- **Deciders:** tech lead, product owner
- **Jira:** IATS-134 (epic IATS-133, E21 Modular monolith consolidation)
- **Supersedes:** the "one JVM per module" deployment in
  [`backend-modular-architecture.md`](../backend-modular-architecture.md) §1

## Context

The repository runs 18 deployables for an MVP that has no production users yet:

- 8 Spring Boot services plus the `platform-starter` library (`services-java/`).
- 6 Go binaries (`services-go/`). Only `search-gateway` does real work: `index-builder-service`
  is a no-op consumer, `reindex-tool` only parses flags, `autocomplete-service` has no writer for
  its Redis keys, and `resume-ingestion-service` duplicates the resume upload path that
  `candidate-service` already owns.
- 3 Python workers (`workers-python/`), all on stub providers.
- 3 Next.js apps.

The Java services are separate processes but not separate systems:

- All of them connect to the same database (`jdbc:postgresql://localhost:5432/jobocate`) and the
  same `public` schema. Only the Flyway history tables are split. Any service can read or write
  any table, so the process boundary gives no data isolation.
- Calls between modules go over HTTP or Kafka, so a single use case (for example, applying to a
  job) cannot run in one transaction and has to handle retries and partial failure.
- The transactional outbox is copied three times (job, application, candidate). The copies query
  due rows with plain JPQL and no `FOR UPDATE SKIP LOCKED`, so running two replicas of a service
  would publish events twice.
- Every service needs its own build, image, config, health checks and, later, CI job and alerts.

[`backend-modular-architecture.md`](../backend-modular-architecture.md) §1 already says module
boundaries matter more than process boundaries and that modules "could collapse into a single JVM
later if operational simplicity wins". At this stage it does.

## Decision

1. **One Spring Boot application, `insyght-core`**, built with
   [Spring Modulith](https://spring.io/projects/spring-modulith) (Apache 2.0). The current
   services become top-level module packages and keep their hexagonal layout:

   | Module | From |
   |---|---|
   | `identity` | `tenant-auth-service` |
   | `tenancy` | `ats-core-service` |
   | `candidate` | `candidate-service` |
   | `job` | `job-service` |
   | `application` | `application-service` (incl. AI artifacts, pipelines, interviews, offers) |
   | `notification` | `notification-service` |
   | `admin` | `admin-service` (feature flags, quotas, prompt registry, audit query) |
   | `searchprojection` | `search-orchestrator-service` |

   `platform-starter` stays a shared library (tenant context, security defaults, error envelope,
   audit writer).

2. **Module boundaries are enforced by a test**, not by code review: `ApplicationModules.verify()`
   runs in the build and fails when one module reaches into another module's internals. This
   replaces the planned ArchUnit rules (§3 of the module doc).

3. **Modules talk in process.** Synchronous calls go through a module's published interface (for
   example `JobLookup`), not HTTP. Asynchronous reactions inside the backend use Spring Modulith
   application events.

4. **One outbox.** The Spring Modulith event publication registry replaces the three hand-written
   outboxes. Only events that other processes need (search gateway, AI worker, analytics) are
   externalized to Kafka. Topic names stay as in `packages/shared-contracts/kafka/topics.yaml`.

5. **One database, one schema per module, Row Level Security on tenant tables** (IATS-144,
   IATS-145). Modules write only their own schema.

6. **What stays separate, and why:**

   | Deployable | Reason |
   |---|---|
   | `search-gateway` (Go) | Most complete service; different scaling and latency profile; owns the OpenSearch mapping. Absorbs autocomplete and reindex (IATS-153). |
   | AI worker (Python) | ML and LLM tooling lives in Python; model calls are slow and bursty and should not share the API's thread pools. The three workers merge into one (IATS-151). |
   | Next.js apps | Separate frontends with their own route handlers acting as the BFF (IATS-148). |
   | Identity provider | Sign-in uses an OIDC provider, Keycloak locally (decided 2026-11-21, IATS-70, IATS-147). |

   Target: about 4 deployables plus infrastructure, down from 18.

## Consequences

**Better**

- One build, one image and one runtime config for the backend; CI has one Java job.
- Use cases that touch several modules run in one database transaction.
- Module boundaries become a failing test instead of a convention.
- Events are published once even with several replicas.
- Phase 0 work in the build plan (login, roles, SDK route gaps) is built once, in one place.

**Worse, and how we contain it**

- All modules share one deploy and one failure domain. A bad release of one module ships all of
  them. Contained by: CI gates per module, feature flags, and rolling deploys.
- One JVM's memory and thread pools are shared. Contained by: keeping slow work (model calls,
  indexing) in the AI worker and the search gateway, not in core.
- Splitting a module out later needs work. Contained by: enforced boundaries and published module
  interfaces, so extraction is a mechanical change when measurement justifies it.
- During migration (IATS-135 to IATS-142) both the old service and the moved module exist for a
  short time. Each move keeps the old service buildable until IATS-142 retires it.

## Options considered

1. **Keep the current services and fix them in place** (shared outbox library, per-service
   databases, CI per service). Rejected: highest operating cost for a pre-launch product, and
   real data isolation would need 7 databases and cross-service sagas for every multi-module use
   case.
2. **Merge into one app without Spring Modulith**, relying on package conventions or ArchUnit.
   Rejected: Modulith gives boundary checks, in-process events and a transactional event registry
   in one dependency; rebuilding those by hand is the same duplication we are removing.
3. **Modular monolith with Spring Modulith** (chosen).

## Follow-up stories

IATS-135 to IATS-146 and IATS-153 to IATS-156 under epic IATS-133; IATS-147 to IATS-150 under
E02; IATS-151 and IATS-152 under E17. Acceptance criteria live on each Jira issue.
