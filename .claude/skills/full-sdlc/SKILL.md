---
name: full-sdlc
description: Deliver Insyght AI features, fixes, refactors, contracts, migrations, and releases through the repository's complete software delivery lifecycle. Use when work spans planning, implementation, verification, security, rollout, or handoff.
---

# Full SDLC

Use this skill to take a change from intake to production-ready handoff without losing evidence between
stages.

## Start here

Read [`docs/16-devops/full-sdlc.md`](../../../docs/16-devops/full-sdlc.md) completely. Then read only
the domain documents and source files relevant to the request.

Treat `docs/02-architecture/audit-as-is.md`, the running code, applied migrations, and code-adjacent
contracts as repository truth. Target-state documents do not prove that a capability exists.

## Working loop

1. Restate the outcome, scope, affected users, data, services, and change classes.
2. Discover the current end-to-end flow and define observable acceptance criteria.
3. Plan bounded increments, dependencies, risks, telemetry, rollout, and rollback.
4. Update OpenAPI, JSON Schema, Kafka, Flyway, or SDK contracts before or with consumers.
5. Work red, green, refactor. Keep regression and cross-tenant tests for changed behavior.
6. Verify incrementally with the narrowest real commands, then run the applicable quality matrix.
7. Review security, privacy, tenant isolation, accessibility, and Responsible AI controls.
8. Update current-state docs and operational guidance.
9. Hand off the change with commands and real results, limitations, rollout, and rollback.

Scale the ceremony to risk. A small isolated change can use a compact plan and focused checks. A
security, data, contract, integration, or AI change requires every applicable gate in the playbook.

## Non-negotiable gates

- Never trust a tenant ID from a browser request body. Resolve tenant context from authenticated,
  server-side identity and enforce it in every persistence and retrieval path.
- Never modify an applied Flyway migration. Add a forward migration and define recovery.
- Never hardcode, log, expose, or commit credentials, tokens, resumes, prompts, model output, or
  candidate PII.
- Never silently introduce a breaking contract. Identify consumers, version the change, and maintain a
  compatibility window.
- Never allow AI output alone to reject, advance, contact, or make a final employment decision about a
  candidate.
- Do not declare checks successful when a command is absent, a script is a placeholder, or the required
  environment was unavailable.
- Stop on unresolved critical or high security findings, failed tenant-isolation tests, failed mandatory
  AI evaluations, or destructive changes without recovery evidence.

## Claude Code behavior

- Use a planner for broad or cross-stack work before editing.
- Prefer focused agents for independent architecture, testing, security, or review tasks when available.
- Preserve existing user changes and avoid destructive version-control commands.
- Request authorization immediately before external writes, production changes, credential changes, or
  destructive operations when that authorization is not already explicit.
- Finish with a concise evidence-based handoff, not a list of intended future checks.

## Expected artifacts

Create only the artifacts the change needs:

- Acceptance criteria and implementation plan.
- Contract or architecture decision when behavior crosses a boundary.
- Failing test, minimal implementation, and regression coverage.
- Security, tenant, privacy, and AI review evidence.
- Updated operational and current-state documentation.
- Rollout, rollback, and final verification record.

Do not duplicate repository guidance in new top-level files. Update the existing documentation structure.
