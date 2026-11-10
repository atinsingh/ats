# Full software delivery lifecycle

This playbook defines the engineering quality gates for Insyght AI. The story, branch, commit, pull
request, review and merge workflow that wraps these gates is defined in
[`agent-delivery-framework.md`](./agent-delivery-framework.md); both are mandatory.

This playbook is the canonical delivery workflow for Insyght AI. It applies to humans and coding
agents working across the Next.js applications, Java services, Go services, Python workers,
contracts, data stores, and infrastructure.

The workflow is evidence-driven. Use the smallest process that is proportionate to the change, but
do not skip a gate that protects tenant isolation, authorization, personal data, migrations, public
contracts, or AI-assisted employment decisions.

## Operating principles

1. **Verify repository truth first.** Read the current implementation and relevant source files
   before relying on target-state documentation.
2. **Plan before broad changes.** Define scope, acceptance criteria, dependencies, risks, and
   rollback before implementation.
3. **Change contracts deliberately.** Update OpenAPI, JSON Schema, Kafka, and migration contracts
   before or with their consumers.
4. **Develop through tests.** Add a failing test for changed behavior, implement the minimum change,
   then refactor while keeping the suite green.
5. **Protect every tenant boundary.** Tenant identity comes from the trusted security context and is
   enforced in persistence, search, storage, events, caches, logs, and analytics.
6. **Keep accountable humans in control.** AI output must be versioned, evaluated, explainable where
   used for matching, and reviewed before consequential action.
7. **Ship observable and reversible changes.** Define telemetry, rollout, rollback, and recovery as
   part of implementation rather than after it.

## Change classes

Classify the work during intake. Increase review depth when more than one class applies.

| Class       | Examples                                                      | Minimum review                                                 |
| ----------- | ------------------------------------------------------------- | -------------------------------------------------------------- |
| Routine     | Copy, styling, isolated refactor, non-sensitive documentation | Focused tests and owner review                                 |
| Product     | New screen, workflow, API behavior, integration, notification | Product acceptance, tests, accessibility, observability        |
| Contract    | OpenAPI, event, JSON Schema, SDK, integration mapping         | Producer and consumer review, compatibility evidence           |
| Data        | Flyway migration, index mapping, retention, import, deletion  | Data owner, backup, rollback or forward-fix plan               |
| Security    | Authentication, RBAC, tenant context, credentials, uploads    | Threat review, negative authorization tests, security review   |
| AI          | Prompt, model, retrieval, ranking, agent tool, evaluation     | Responsible AI review, evaluation gate, human-control evidence |
| Operational | Deployment, queue, retry, alert, SLO, backup                  | Runbook, capacity, failure drill, rollback evidence            |

## Lifecycle and gates

### Gate 0: Intake and repository truth

**Actions**

- Restate the requested outcome and identify the affected user, tenant, service, and data.
- Read `docs/02-architecture/audit-as-is.md` and only the domain documents relevant to the change.
- Inspect existing code, tests, contracts, migrations, configuration, and recent local changes.
- Classify the change using the table above.
- Identify whether external systems, credentials, production data, or destructive operations are in
  scope. Obtain explicit authorization before those actions.

**Evidence to leave**

- Concise problem statement.
- In-scope and out-of-scope list.
- Relevant source-of-truth files.
- Change classes and required reviewers.

**Exit condition**

The intended outcome and current implementation are understood well enough to plan without guessing.

### Gate 1: Discovery and acceptance criteria

**Actions**

- Trace the current user or event flow end to end.
- Identify upstream producers, downstream consumers, and failure paths.
- Write observable acceptance criteria, including loading, empty, error, permission, retry, and
  accessibility behavior where relevant.
- Add non-functional criteria for security, tenancy, latency, availability, privacy, and AI quality.

**Evidence to leave**

- Acceptance criteria tied to user or system outcomes.
- Dependency and impact map.
- Open questions with an owner and decision deadline.

**Exit condition**

Success and failure can be tested without relying on subjective interpretation.

### Gate 2: Design and delivery plan

**Actions**

- Break the work into independently verifiable increments.
- Select the owning service or package for each behavior.
- Define data flow, authorization, idempotency, error handling, observability, and rollback.
- Record a short architecture decision when the change introduces a new pattern, vendor, trust
  boundary, data store, or irreversible trade-off.
- Plan feature flags, compatibility windows, and staged rollout for risky changes.

**Evidence to leave**

- Ordered implementation plan with dependencies.
- Test plan and verification commands.
- Risk register with mitigations.
- Rollback or forward-fix strategy.

**Exit condition**

The plan can be reviewed before implementation and can be delivered in bounded increments.

### Gate 3: Contract-first design

Use this gate when a public or cross-service shape changes.

**Actions**

- REST: update `packages/shared-contracts/openapi/` and the canonical error model.
- Search documents: update JSON Schema and index mapping compatibility notes.
- Events: update the Kafka payload and topic contract, preserving stable event identity.
- Database: add a new Flyway migration. Never edit a migration that may have run in a shared
  environment.
- SDK: regenerate or update the typed client and compile all consumers.
- Document the compatibility window, migration sequence, and rollback constraints.

**Required rules**

- Prefer additive changes.
- Breaking changes require explicit approval, versioning, and a consumer migration plan.
- Every tenant-scoped shape requires `tenant_id` internally, but browser clients must not choose an
  authoritative tenant identifier.
- Webhooks must be signed, replay-protected, idempotent, and observable.

**Exit condition**

Contracts are reviewable, validation succeeds, and affected producers and consumers are identified.

### Gate 4: Test-driven implementation

**Red**

- Add the smallest test that demonstrates the missing or incorrect behavior.
- Confirm the test fails for the expected reason.
- For tenant-scoped work, include a negative cross-tenant case.
- For defects, keep a regression test that reproduces the original failure.

**Green**

- Implement the minimum behavior needed to pass.
- Validate untrusted input at the boundary.
- Enforce authorization and tenant filtering server-side.
- Add idempotency and bounded retry behavior for critical writes and asynchronous work.

**Refactor**

- Remove duplication and clarify ownership without widening scope.
- Prefer immutable DTOs, commands, configuration, and transformation results.
- Keep functions focused and make failure states explicit.
- Re-run focused tests after every meaningful refactor.

**Coverage target**

Changed production packages should maintain at least 80 percent line coverage, with branch coverage on
authorization, validation, state transitions, retry decisions, and AI policy decisions.

### Gate 5: Stack-specific implementation rules

#### Next.js and TypeScript

- Use Server Components by default and isolate browser behavior in small client components.
- Use `@jobocate/api-sdk` for platform APIs.
- Provide accessible labels, keyboard focus, responsive behavior, and actionable error states.
- Keep secrets and internal service tokens out of browser bundles.

#### Java and Spring Boot

- Keep controllers thin and transactions in application services.
- Resolve tenant identity through `TenantContext` and include it in every repository predicate.
- Write domain changes and outbox events in the same transaction.
- Use method security for fine-grained rules and return the canonical error envelope.

#### Go services

- Keep wiring in `cmd/` and business logic in `internal/` packages.
- Validate and allowlist query input before building OpenSearch DSL.
- Inject the tenant filter into every tenant-scoped search request.
- Propagate context cancellation and use structured `slog` fields.

#### Python workers

- Validate messages and callbacks with Pydantic models.
- Process events idempotently and use bounded retries with visible dead-letter handling.
- Keep provider integrations behind testable interfaces with deterministic stubs.
- Do not log full resumes, prompts, model responses, or credentials.

#### Infrastructure and data

- Apply least privilege to networks, identities, storage, and secrets.
- Test migrations on fresh and representative databases.
- Define backup, restore, rollout, rollback, and regional data handling before production changes.
- Keep Terraform plans reviewable and never place secrets in state inputs committed to the repository.

### Gate 6: Incremental verification

Run the narrowest relevant checks throughout implementation. Do not wait until the end to discover
cross-stack failures.

```bash
# TypeScript workspace
pnpm -r tsc --noEmit
pnpm -r lint
pnpm -r build

# Java services
./gradlew test
./gradlew test --tests '*CrossTenant*'

# Run inside each changed Go module
go test ./...

# Run inside each changed Python worker after installing dev dependencies
PYTHONPATH=src pytest
ruff check .
```

Contract linting and breaking-change detection are required when those tools are installed in the
workspace. Do not report a check as passed when the configured command is missing or only a placeholder.

### Gate 7: Security, privacy, tenancy, and AI review

Review the diff and test evidence for the following:

- Authentication and authorization are enforced at the server boundary.
- Cross-tenant reads, writes, search, object access, cache keys, events, and exports are rejected.
- Inputs are validated and output is safely encoded.
- Secrets, tokens, resumes, prompts, model output, and candidate PII are absent from logs and fixtures.
- File handling checks size, type, malware status, storage scope, and download authorization.
- Rate limits protect authentication, search, uploads, messaging, exports, and expensive AI operations.
- AI purpose, provider, model/configuration version, inputs, limitations, and evaluation status are
  recorded.
- AI output is labeled and cannot silently reject, advance, contact, or make final decisions about a
  candidate.
- Human override and appeal paths are auditable.

**Release blocker**

Do not proceed with an unresolved critical or high security issue, a failed tenant-isolation test, an
unapproved breaking contract, or a failed mandatory AI evaluation.

### Gate 8: Full quality matrix

Select all rows affected by the change.

| Quality area  | Required evidence                                                             |
| ------------- | ----------------------------------------------------------------------------- |
| Unit          | Domain and validation behavior, including unhappy paths                       |
| Integration   | Database, Kafka, OpenSearch, S3, provider, and transaction wiring             |
| Contract      | Schema validation and producer-consumer compatibility                         |
| End to end    | Critical user journey and permission boundary                                 |
| Accessibility | Keyboard, focus, semantics, labels, contrast, and automated scan              |
| Security      | Negative authorization, input abuse, secret scan, dependency review           |
| Performance   | Query plan, load result, latency budget, queue or worker capacity             |
| Reliability   | Retry, idempotency, dead-letter, backup, restore, and failure recovery        |
| AI evaluation | Quality, groundedness, bias or subgroup checks, drift, and rollback threshold |
| Observability | Logs, metrics, traces, alerts, dashboards, and correlation identifiers        |

Record commands, environment, result, and any skipped check with a reason.

### Gate 9: Documentation, rollout, and operations

**Update when applicable**

- Current implementation audit and architecture decisions.
- OpenAPI, event, schema, SDK, and migration documentation.
- Environment variable catalog and example values without secrets.
- Runbooks, dashboards, alerts, SLOs, recovery, and support guidance.
- User or administrator help for changed workflows.

**Rollout plan**

- Deployment order and compatibility window.
- Feature flag or tenant cohort strategy.
- Health signals and abort thresholds.
- Data migration and reconciliation checks.
- Rollback command or forward-fix procedure.
- Named owner during the observation window.

### Gate 10: Review and handoff

The final handoff must state:

- What changed and why.
- Files, services, contracts, migrations, and user journeys affected.
- Tests and quality checks run with real results.
- Security, privacy, tenant, and AI considerations.
- Rollout and rollback instructions.
- Known limitations, deferred work, and owners.

Keep pull requests focused and follow [`agent-delivery-framework.md`](./agent-delivery-framework.md)
for branch naming, Conventional Commits with the Jira key, the PR template, independent review and
merge rules. Never hide unrelated changes or overwrite work you did not create.

## Hotfix lane

Use the hotfix lane only for an active production incident or material security exposure.

1. Define the unsafe behavior and the smallest safe containment.
2. Add a regression test before or immediately with the fix.
3. Implement the smallest reversible change.
4. Run focused security, tenant, and integration checks.
5. Deploy with explicit owner, monitoring, and rollback.
6. Complete the normal documentation, root-cause review, and missing test coverage immediately after
   containment.

A hotfix shortens planning. It does not waive authorization, tenant isolation, secret handling, audit,
or human control over consequential AI actions.

## Stop and escalate conditions

Stop implementation and request a decision when:

- The requested behavior conflicts with tenant isolation, candidate rights, or an approved security
  control.
- A destructive or irreversible migration lacks backup, validation, and recovery evidence.
- Required credentials, production access, legal interpretation, or third-party approval are missing.
- The product owner has not defined who may approve an AI action with candidate impact.
- A breaking contract has unidentified consumers or no compatibility plan.
- Tests expose unrelated critical security or data-integrity failures.

Document the blocker, evidence collected, safe options, and the exact decision needed.

## Source documents

- [`coding-standards.md`](./coding-standards.md)
- [`ui-coding-standards.md`](./ui-coding-standards.md)
- [`testing-strategy.md`](./testing-strategy.md)
- [`environment-variables.md`](./environment-variables.md)
- [`../08-security/security-baseline.md`](../08-security/security-baseline.md)
- [`../09-multi-tenancy/tenancy-strategy.md`](../09-multi-tenancy/tenancy-strategy.md)
- [`../07-ai-platform/ai-artifact-platform.md`](../07-ai-platform/ai-artifact-platform.md)
