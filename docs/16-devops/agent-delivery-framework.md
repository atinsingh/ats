# Agent delivery framework

How coding agents (Claude Code, Cursor, Codex) and humans take a Jira story from backlog to
production in this repository. It is strict on purpose: agents write most of the code, so the
process, not individual judgment, is what keeps `main` releasable.

This document defines the **workflow and governance** (story → branch → commits → pull request →
review → merge → done). The **engineering quality gates** inside that workflow (contracts, TDD,
tenancy, security, Responsible AI, rollout) are defined in [`full-sdlc.md`](./full-sdlc.md). Both
are mandatory. When they conflict, the stricter rule wins.

> Rule 0: **No story, no code.** Every change to this repository traces to exactly one Jira issue in
> project `IATS`, one branch and one pull request.

## 1. Roles

| Role | Who | Owns | May not |
|---|---|---|---|
| Product owner | Human | Story intent, acceptance criteria, priority, final acceptance | Skip DoR for urgent work (use the hotfix lane instead) |
| Tech lead / code owner | Human | Design approval, review, **merge**, release | Merge their own PR without a second approver on Security, Data or AI changes |
| Implementing agent | Claude Code, Cursor or Codex | Plan, branch, tests, code, evidence, draft PR, review responses | Merge, deploy, push to `main`, touch production, change CI/branch protection, approve its own PR |
| Reviewer agent | A **different** agent or a fresh session with no implementation context | Independent review against acceptance criteria and this framework | Push commits to the branch it reviews |
| CI | GitHub Actions | Required checks (section 9) | Be bypassed, skipped or weakened by an agent |

One story has exactly one implementing agent at a time. The Jira label (`agent-claude`,
`agent-cursor`, `agent-codex`) shows who holds it.

## 2. Non-negotiable rules for agents

1. **Work only on a story branch.** Never commit to `main`, never push to someone else's branch.
2. **One story = one branch = one PR.** Unrelated fixes become new Jira issues, not extra commits.
3. **Never merge, deploy or release.** Merging is a human action after required approvals and green CI.
4. **Never weaken the safety net.** Do not delete, skip, `@Disabled`, `xit`, `t.Skip` or loosen
   tests, lint rules, coverage thresholds, CI jobs, CODEOWNERS or branch protection to get green.
   If a check is wrong, open a separate issue and say so in the PR.
5. **Never rewrite shared history.** No force-push after a reviewer has commented. Before that,
   `--force-with-lease` on your own branch only.
6. **Evidence or it did not happen.** Report only commands you actually ran, with their real
   result. A missing tool or placeholder script is `SKIPPED (reason)`, never `PASSED`.
7. **No secrets, no PII.** Never commit credentials, `.env` files, real resumes, real candidate data,
   prompts containing PII, or production dumps. Use synthetic fixtures.
8. **Stay in scope.** Touch only files needed for the acceptance criteria. Formatting-only changes
   to untouched files go in a separate `chore` PR.
9. **New dependencies need justification.** State why, the licence, and the alternatives in the PR.
   No copyleft licences (GPL/AGPL) without tech-lead approval.
10. **Stop and ask** on any condition in [`full-sdlc.md` → Stop and escalate](./full-sdlc.md#stop-and-escalate-conditions),
    when acceptance criteria are ambiguous, or when the change needs more than the story's estimate.
    Post the question as a Jira comment and in the PR, then wait.

## 3. Definition of Ready (before an agent may start)

An agent must refuse to start, and comment on the issue instead, unless all of these hold:

- [ ] Issue is a Story, Bug, Task or Spike in `IATS`, linked to an epic.
- [ ] Acceptance criteria are written, observable and testable (including error, permission and
      empty states where relevant).
- [ ] Change classes are identified (Routine, Product, Contract, Data, Security, AI, Operational —
      see `full-sdlc.md`).
- [ ] Dependencies are done or explicitly stubbed. Blocking issues are linked.
- [ ] It fits in one PR: about **3 days or less** of work and about **400 changed lines or fewer**
      (excluding generated files and lockfiles). If not, split it before starting.
- [ ] Any design decision it relies on (ADR, Confluence architecture page) is linked.

## 4. Jira workflow

Target workflow (to be configured by a Jira admin, see IATS epic E20):

```
Backlog → Ready → In Progress → In Review → Done
                       ↘ Blocked ↙
```

Until those statuses exist, use the current three and the `in-review` / `blocked` labels:

| Step | Target status | Current Jira equivalent |
|---|---|---|
| DoR met | Ready | To Do + label `ready` |
| Agent starts | In Progress | In Progress |
| PR opened for review | In Review | In Progress + label `in-review` |
| Waiting on a decision | Blocked | In Progress + label `blocked` + comment |
| Merged and verified | Done | Done |

The agent updates Jira at each step with a short comment: plan at start, PR link at review,
evidence summary at done. Smart-commit text (`IATS-123`) in branch, commits and PR title links
GitHub activity to the issue once the Jira–GitHub integration is installed.

## 5. Branching

**Model:** trunk-based development. `main` is always releasable and protected. Branches are
short-lived (merge within 3 working days or split the story).

**Branch name:** `<type>/<JIRA-KEY>-<short-slug>`, lowercase, hyphenated, max 60 characters.

| Type | Use for |
|---|---|
| `feat` | New user-visible capability |
| `fix` | Bug fix |
| `refactor` | Behaviour-preserving restructure |
| `perf` | Performance improvement |
| `test` | Tests only |
| `docs` | Documentation only |
| `chore` | Build, tooling, dependencies, CI |
| `spike` | Time-boxed exploration. **Never merged**; findings go to Confluence/Jira |
| `hotfix` | Production incident fix (see section 12) |

Examples: `feat/IATS-98-board-dialect-emitters`, `fix/IATS-131-dice-token-refresh`.

**Start a story** with the helper, which validates the key, syncs `main` and creates the branch
(optionally in its own git worktree so several agents can work in parallel):

```bash
scripts/agent/start-story.sh IATS-98 feat board-dialect-emitters --worktree
```

**Keep current:** rebase on `origin/main` at least daily and before requesting review
(`git fetch origin && git rebase origin/main`). Once review has started, prefer
`git merge origin/main` to avoid force-pushing.

## 6. Commits

[Conventional Commits](https://www.conventionalcommits.org/) with a scope and a Jira key. The
`commit-msg` hook in `.githooks/` enforces this. Enable it once per clone:
`git config core.hooksPath .githooks`.

```
<type>(<scope>): <imperative summary, ≤ 72 chars>

<why this change, what it does, anything surprising>

Jira: IATS-98
Agent: claude-code            # or cursor / codex / human
Co-Authored-By: <agent identity if the tool adds one>
```

- **Scope** is the package, service or app: `search-gateway`, `job-service`, `ats-recruiter-web`,
  `shared-contracts`, `ai-gateway`, `infra`, `docs`.
- Small, atomic, buildable commits. Tests go in the same commit as the behaviour they cover (or a
  preceding `test:` commit when demonstrating red → green).
- Breaking change: `feat(shared-contracts)!: …` plus a `BREAKING CHANGE:` footer. This requires the
  Contract class review.
- Never commit generated build output, `node_modules`, `.env`, coverage reports or IDE files.

## 7. Pull requests

**Title:** `IATS-98 feat(search-string): add Dice and Resdex dialect emitters`

**Open as draft early.** Open the PR as a **draft** as soon as the first meaningful commit exists,
so CI runs and humans can see direction. Mark it **ready for review** only when:

- `scripts/agent/preflight.sh` passes locally (or reports only justified skips),
- every section of the PR template is filled in with real content,
- the agent has completed the self-review checklist in the template.

**Size:** aim for 400 changed lines or fewer. Over 800 (excluding generated files and lockfiles)
fails the hygiene check unless the `large-pr-approved` label is added by a tech lead.

**Labels:** one or more change classes (`class:routine`, `class:product`, `class:contract`,
`class:data`, `class:security`, `class:ai`, `class:operational`) and the agent label.

**Contracts first:** when a story changes OpenAPI, JSON Schema, Kafka topics or a Flyway migration
**and** its consumers, land the contract change in its own small PR first (or as the first commit
reviewed by the contract owner).

## 8. Review

### 8.1 Required approvals by change class

| Class | Independent AI review | Human approvals | Extra evidence |
|---|---|---|---|
| Routine | Recommended | 1 code owner | Focused tests |
| Product | Required | 1 code owner (+ product owner acceptance on Jira) | Screenshots/recording for UI, accessibility scan |
| Contract | Required | Producer and consumer code owners | Compatibility notes, contract lint |
| Data | Required | Data code owner | Migration tested on fresh and seeded DB, rollback/forward-fix |
| Security | Required | Security code owner + 1 other | Negative authz and cross-tenant tests |
| AI | Required | AI code owner + 1 other | Evaluation results versus thresholds, human-control evidence |
| Operational | Required | Platform code owner | Runbook, alert and rollback steps |

### 8.2 Independent AI review

The reviewer must be **independent of the author**: a different tool (for example, Codex reviews
Claude Code's PR) or a fresh session with no access to the implementation conversation. It uses
the shared prompt in [`agent-prompts/review-pr.md`](./agent-prompts/review-pr.md) and reviews:

1. Each acceptance criterion: met, partly met or not met, with the file/test that proves it.
2. Correctness, edge cases, error handling, concurrency and idempotency.
3. Tenant isolation, authorization, PII handling and secrets.
4. Tests: do they fail without the change? Is anything skipped or weakened?
5. Scope creep, dead code, needless dependencies, contract compatibility.
6. Evidence honesty: do the reported commands and results match CI?

Comments use severity prefixes: **[blocker]**, **[major]**, **[minor]**, **[nit]**. Blockers and
majors must be resolved before human approval.

### 8.3 Author responsibilities during review

- Reply to **every** comment: `Fixed in <sha>` or a reasoned disagreement. Never resolve a
  reviewer's thread silently.
- Push fixes as new commits (no force-push), re-run preflight and update the PR's evidence section.
- If review reveals a missing requirement, update the Jira acceptance criteria (with product owner
  agreement) rather than silently expanding scope.

### 8.4 Human reviewer focus

Humans spend their attention where agents are weakest: whether the change is the **right thing**
(intent, product fit, architecture), whether evidence is **real** (cross-check CI), security and
tenancy, and anything irreversible.

## 9. CI required checks

All of these must be green to merge. They are path-filtered so only affected stacks run.

| Check | What it enforces |
|---|---|
| `pr-hygiene` | Branch name, Jira key in title, PR template completed, change-class label, size limit |
| `secrets-scan` | gitleaks on the diff |
| `web` | `pnpm` install, typecheck, lint, test, build for changed TS packages |
| `java` | `./gradlew build` (compile + tests) |
| `go` | `go vet` + `go test ./...` per changed module |
| `python` | `ruff` + `pytest` per changed worker |
| `contracts` | OpenAPI validation for `packages/shared-contracts/openapi` |
| `migrations` | Existing Flyway migrations are never modified, only added |
| `dependency-review` | No new high/critical vulnerable or GPL/AGPL dependencies (needs GitHub Advanced Security on private repositories; advisory until enabled) |
| `ci-required` | Aggregate gate: fails if any job above failed, passes when path filters skipped a job. **Mark `ci-required`, `pr-hygiene` and `secrets-scan` as required in branch protection.** |

Workflows: [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) and
[`.github/workflows/pr-hygiene.yml`](../../.github/workflows/pr-hygiene.yml). Agents run the same
checks locally with `scripts/agent/preflight.sh`.

Coverage gating (80% on changed lines) is added once each stack has a test baseline. Until then,
coverage is reported but not enforced.

## 10. Merge

- **Who:** a human code owner. Never the implementing agent.
- **How:** **squash merge** only. The squash commit title equals the PR title, and the body keeps
  the `Jira:` footer. Linear history on `main`.
- **When:** all required checks are green, required approvals are present, no unresolved
  conversations, and the branch is up to date with `main`.
- **After:** the branch is auto-deleted. The agent (or human) moves Jira to Done with an evidence
  comment (PR link, checks, rollout notes) and files follow-ups as new issues.

## 11. Definition of Done

- [ ] All acceptance criteria met and demonstrated (tests, screenshots or recordings as relevant).
- [ ] Applicable `full-sdlc.md` gates passed, with evidence in the PR.
- [ ] Required reviews approved. All blocker and major comments resolved.
- [ ] CI green on the merged commit.
- [ ] Docs updated: current-state audit, contracts, env-var catalog, runbooks as applicable.
- [ ] Feature flag, rollout and rollback noted for risky changes.
- [ ] Jira updated to Done with the evidence comment. Follow-ups filed.

## 12. Hotfix lane

For an active production incident only: branch `hotfix/IATS-<key>-<slug>` from `main`, add a
regression test, keep the fix minimal, and get one code-owner approval (two for Security). The PR
may be marked ready immediately. Every other rule still applies. The full `full-sdlc.md` hotfix
lane applies for root cause and follow-up.

## 13. Agent autonomy levels

| Level | Agent may | Default for |
|---|---|---|
| L0 Advise | Read code, propose a plan or diff in chat | Security-critical design, production incidents |
| L1 Implement | Create the branch, commit, push, open a **draft** PR, update Jira | **All stories (default)** |
| L2 Review-ready | Also mark the PR ready, request reviewers, respond to review | Routine, Product and Contract stories after the tech lead sets the `autonomy-l2` label |
| L3 | Merge, deploy, release, edit CI or protection, touch production | **Never granted to agents** |

## 14. Parallel agents

- Each agent works in its **own git worktree** (`start-story.sh --worktree` creates
  `../insyght-ai-worktrees/<KEY>`), so they never share an index or uncommitted files.
- Before starting, check open PRs for overlapping files. If two stories touch the same module,
  sequence them (Jira "blocks" link) instead of racing.
- Work-in-progress limit: **two open PRs per agent identity**.
- Shared contracts and migrations are serialised: one open PR per contract file or migration
  directory at a time.

## 15. Releases

- Every merge to `main` builds artefacts and deploys to **staging** automatically (once
  environments exist).
- Production releases are **tagged** (`vMAJOR.MINOR.PATCH`, semantic versioning), created by a
  human, with a changelog generated from Conventional Commit messages.
- Risky behaviour ships dark behind a feature flag, with tenant cohort rollout as described in
  `full-sdlc.md` Gate 9.

## 16. Metrics (reviewed monthly, per agent label)

Lead time (Ready → Done), PR size, review rounds per PR, time to first review, CI first-pass rate,
change-failure rate, escaped defects, and the share of PRs needing major rework. Use these to tune
which change classes each agent is trusted with.

## 17. Where agents find these rules

| Tool | Entry point | Notes |
|---|---|---|
| Codex | [`AGENTS.md`](../../AGENTS.md) | Read automatically |
| Cursor | `AGENTS.md` + `.cursor/rules/agent-workflow.mdc` (always applied) + `.cursor/commands/deliver-story.md`, `review-pr.md` | `/deliver-story IATS-98` |
| Claude Code | [`CLAUDE.md`](../../CLAUDE.md) (imports `AGENTS.md`) + `.claude/skills/deliver-story`, `review-pr`, `full-sdlc` | "Deliver IATS-98" |
| All | [`agent-prompts/deliver-story.md`](./agent-prompts/deliver-story.md), [`agent-prompts/review-pr.md`](./agent-prompts/review-pr.md) | Canonical prompt bodies; adapters only point here |

## 18. One-time repository setup (owner: tech lead)

1. Initialise git and push to the GitHub organisation (the working folder is not yet a git
   repository).
2. Enable branch protection on `main` (see table below) and turn on auto-delete of head branches.
3. Replace the placeholder team handles in `.github/CODEOWNERS` with real GitHub teams/users.
4. Install the Jira Cloud for GitHub app so branches, commits and PRs show on IATS issues.
5. Add the `ready`, `in-review`, `blocked` and `agent-*` labels in Jira, and the class labels in
   GitHub.
6. Ask a Jira admin to add the Ready, In Review and Blocked statuses (section 4).
7. Every developer and agent environment runs `git config core.hooksPath .githooks`.

**`main` branch protection:**

| Setting | Value |
|---|---|
| Require a pull request before merging | On, at least 1 approval, dismiss stale approvals on new commits |
| Require review from Code Owners | On |
| Require status checks to pass | On, branch must be up to date. Required: all section 9 checks |
| Require conversation resolution | On |
| Require linear history | On (squash merge only) |
| Allow force pushes / deletions | Off |
| Do not allow bypassing the above | On (applies to admins) |
| Restrict who can push | Humans with the maintainer role only. Agent tokens get write access to branches, not `main` |
