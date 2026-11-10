# Deliver a Jira story (canonical agent prompt)

Used by Claude Code (`.claude/skills/deliver-story`), Cursor (`/deliver-story`) and Codex (via
`AGENTS.md`). Input: one Jira key, for example `IATS-98`.

Follow [`../agent-delivery-framework.md`](../agent-delivery-framework.md) (workflow) and
[`../full-sdlc.md`](../full-sdlc.md) (quality gates). If anything below conflicts with them, they win.

## Step 1 — Read the story and check Definition of Ready

- Fetch the issue (Jira tool/MCP if available, otherwise ask the human to paste it): summary,
  description, acceptance criteria, epic, links, labels, comments.
- Check the Definition of Ready (framework §3). If any item fails, **stop**: comment on the issue
  listing exactly what is missing, and report back. Do not write code.
- Identify the change classes and the code owners you will need.

## Step 2 — Claim it

- Check that no other agent holds it (`agent-*` label, open PR or branch with this key). If one
  does, stop.
- Assign the issue, add your agent label, move it to In Progress, and comment a short plan: approach,
  files/modules expected, tests to add, risks, and how you will verify.

## Step 3 — Branch

```bash
git config core.hooksPath .githooks          # once per clone
scripts/agent/start-story.sh <KEY> <type> <slug> [--worktree]
```

Work only inside that branch (and worktree, if created).

## Step 4 — Implement with TDD

- Read repository truth first: `docs/02-architecture/audit-as-is.md`, the code you will change and
  its tests.
- Contracts first (OpenAPI, JSON Schema, Kafka, Flyway, SDK) when shapes change.
- Red → green → refactor. Include negative cross-tenant and authorization tests for tenant-scoped
  behaviour. Include a regression test for every bug fix.
- Commit small Conventional Commits with the `Jira:` and `Agent:` footers. Push regularly.
- After the first meaningful commit, open a **draft** PR using the template. Title:
  `<KEY> <type>(<scope>): <summary>`.
- Stay in scope. Anything else you notice: note it under "Follow-ups" in the PR and create or
  propose a Jira issue.

## Step 5 — Verify

```bash
scripts/agent/preflight.sh
```

Then run any extra checks the change classes require (full-sdlc Gate 8). Record each command and
its **real** result. Missing tools are `SKIPPED (reason)`.

## Step 6 — Self-review

Read your own full diff (`git diff origin/main...HEAD`) as a skeptical reviewer would. Tick the
self-review checklist in the PR template honestly. Fix what you find.

## Step 7 — Hand over for review

- Autonomy L1 (default): leave the PR as a draft, fill in every template section, comment the PR
  link on Jira, add the `in-review` label, and tell the human it is ready for review.
- Autonomy L2: you may also mark it ready for review and request the code owners.
- Request an independent AI review (a different tool, or a fresh session using
  [`review-pr.md`](./review-pr.md)).

## Step 8 — Respond to review

Reply to every comment with `Fixed in <sha>` or a reasoned disagreement. Push new commits (no
force-push), re-run preflight, and update the evidence section.

## Never

Merge. Push to `main`. Force-push after review starts. Skip or weaken tests, lint, CI or coverage.
Commit secrets or real candidate data. Touch production. Approve your own PR.

## Final report (to the human, and as a Jira comment)

- PR link and current state.
- Acceptance criteria → evidence (test names, screenshots).
- Commands run with real results. Skipped checks with reasons.
- Security, tenancy, privacy and AI notes.
- Rollout, rollback and follow-ups.
