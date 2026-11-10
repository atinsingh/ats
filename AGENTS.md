# AGENTS.md

Instructions for every coding agent working in this repository (Codex, Cursor, Claude Code and
others). Humans follow the same rules.

## Read first

1. [`docs/16-devops/agent-delivery-framework.md`](docs/16-devops/agent-delivery-framework.md) —
   story → branch → PR → review → merge workflow. **Mandatory.**
2. [`docs/16-devops/full-sdlc.md`](docs/16-devops/full-sdlc.md) — quality gates (contracts, TDD,
   tenancy, security, Responsible AI, rollout). **Mandatory.**
3. [`docs/02-architecture/audit-as-is.md`](docs/02-architecture/audit-as-is.md) — what actually
   exists. Target-state docs do not prove a capability exists.
4. Coding standards: [`docs/16-devops/coding-standards.md`](docs/16-devops/coding-standards.md),
   [`ui-coding-standards.md`](docs/16-devops/ui-coding-standards.md),
   [`testing-strategy.md`](docs/16-devops/testing-strategy.md).

## Tasks

- **"Deliver IATS-123"** (or any Jira key): follow
  [`docs/16-devops/agent-prompts/deliver-story.md`](docs/16-devops/agent-prompts/deliver-story.md).
- **"Review PR #45"**: follow
  [`docs/16-devops/agent-prompts/review-pr.md`](docs/16-devops/agent-prompts/review-pr.md). Only
  review a PR you did not write.

## Hard rules

- No story, no code: every change traces to one Jira `IATS` issue, one branch and one PR.
- Branch `<type>/<IATS-KEY>-<slug>` from up-to-date `main`, created with
  `scripts/agent/start-story.sh`. Never commit to `main`.
- Conventional Commits with `Jira: IATS-…` and `Agent: <tool>` footers. Run
  `git config core.hooksPath .githooks` once per clone.
- Open a draft PR using `.github/pull_request_template.md`. Run `scripts/agent/preflight.sh`
  before asking for review.
- **Never** merge, deploy, release, force-push after review starts, or edit CI, CODEOWNERS or
  branch protection.
- **Never** skip, delete or weaken tests, lint or coverage to get green.
- **Never** commit secrets, `.env` files, real resumes or real candidate data.
- Tenant identity comes only from trusted server-side auth, and every query, search, cache key,
  event and storage path is tenant-scoped.
- AI output never rejects, advances, contacts or decides about a candidate on its own.
- Report only commands you actually ran, with real results. Missing tools are `SKIPPED`, not `PASSED`.
- When in doubt, stop and ask on the Jira issue and the PR.

## Repository map

| Path | Stack | Verify with |
|---|---|---|
| `apps/*`, `packages/*` | Next.js 15 / TypeScript, pnpm + Turbo | `pnpm -r exec tsc --noEmit`, `pnpm lint`, `pnpm test`, `pnpm build` |
| `services-java/*` | Java 21, Spring Boot 4, Gradle | `./gradlew build` |
| `services-go/*` | Go 1.23 | `go vet ./... && go test ./...` in the module |
| `workers-python/*` | Python 3.12 | `ruff check . && PYTHONPATH=src pytest` in the worker |
| `packages/shared-contracts` | OpenAPI, JSON Schema, Kafka | Contract lint in CI |
| `infra/` | Docker Compose, Terraform | `docker compose config`, `terraform validate` |

`scripts/agent/preflight.sh` runs the right subset for your changed files.
