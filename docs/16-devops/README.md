# 16 — DevOps & engineering

Local development, build, CI/CD, environment configuration, coding standards, and testing strategy.

## Files (current and planned)

| File                                                     | Purpose                                                                                                                                                                                                  | Status                                                              |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| [`full-sdlc.md`](./full-sdlc.md)                         | Canonical intake-to-release workflow for humans, Claude Code, and Cursor. Covers planning, contract-first design, TDD, security, tenancy, Responsible AI, quality gates, rollout, hotfixes, and handoff. | Authoritative                                                       |
| [`testing-strategy.md`](./testing-strategy.md)           | Unit, integration, contract, API, UI, E2E, security, performance, search relevance, AI evaluation, multi-tenant isolation, regression. Tools per stack. CI quality gates.                                | Authoritative (Prompt 27)                                           |
| [`coding-standards.md`](./coding-standards.md)           | Java Spring Boot, Go, Python, Next.js TS, SQL/Flyway, OpenAPI, JSON Schema, Kafka events, testing, logging, error handling, security.                                                                    | Authoritative (Prompt 30)                                           |
| [`ui-coding-standards.md`](./ui-coding-standards.md)     | UI patterns and conventions for Next.js apps and shared UI. Originally at `/docs/ui-coding-standards.md`.                                                                                                | Authoritative (legacy; merged into `coding-standards.md` over time) |
| [`environment-variables.md`](./environment-variables.md) | Env var catalog and conventions. Originally at `/docs/environment-variables.md`.                                                                                                                         | Authoritative                                                       |
| `local-dev.md`                                           | Local dev setup, common make targets, troubleshooting.                                                                                                                                                   | Planned                                                             |
| `ci-cd.md`                                               | CI pipeline definition, quality gates, deployment topology.                                                                                                                                              | Planned                                                             |
| [`agent-delivery-framework.md`](./agent-delivery-framework.md) | Strict story → branch → commit → PR → review → merge workflow for humans and coding agents (Claude Code, Cursor, Codex): roles, Definition of Ready/Done, branching, Conventional Commits, PR rules, independent AI review, CI required checks, autonomy levels, parallel agents, releases. Replaces the planned `branching-and-release.md`. | Authoritative |
| [`agent-prompts/`](./agent-prompts/)                     | Canonical `deliver-story` and `review-pr` prompts shared by all agent adapters (`AGENTS.md`, `CLAUDE.md`, `.claude/skills`, `.cursor`).                                                                    | Authoritative |

## Conventions

- All commands must work from repo root.
- All build/test/lint commands must work in CI without manual setup beyond `pnpm install`, `gradle wrapper`, `go mod download`, `pip install -e .`.
- Every PR runs lint + unit test for the touched area; every merge to `main` runs the full suite.
