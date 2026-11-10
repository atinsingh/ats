<!--
Title format:  IATS-123 <type>(<scope>): <summary>
Rules: docs/16-devops/agent-delivery-framework.md. Replace every _TODO_ before marking the PR
ready for review; the pr-hygiene check fails while any remain.
-->

## Jira

IATS-_TODO_ — <link>

## Change classes

<!-- Tick all that apply and add the matching class:* labels. -->
- [ ] Routine  - [ ] Product  - [ ] Contract  - [ ] Data  - [ ] Security  - [ ] AI  - [ ] Operational

## What and why

_TODO_ — two to five sentences: the problem, the approach, and the alternatives you rejected.

## Acceptance criteria → evidence

| Acceptance criterion (from Jira) | Met? | Evidence (test name, file, screenshot) |
|---|---|---|
| _TODO_ | ✅ / ⚠️ / ❌ | |

## Verification (real results only)

<!-- Paste the table printed by scripts/agent/preflight.sh, plus any extra checks.
     SKIPPED is not PASSED; give the reason. -->

_TODO_

## Risk, rollout and rollback

- Tenancy, security and PII: _TODO_
- Contracts, migrations and compatibility: _TODO_ (or "none")
- Feature flag / rollout: _TODO_ (or "none")
- Rollback: _TODO_

## Author self-review

- [ ] I read the full diff as a reviewer would.
- [ ] Every change is needed for this story's acceptance criteria (no scope creep).
- [ ] Tests fail without the change. Cross-tenant and authorization negatives are covered where relevant.
- [ ] No tests, lint rules, coverage thresholds or CI were skipped or weakened.
- [ ] No secrets, `.env` files, real resumes or candidate PII were added.
- [ ] New dependencies (if any) are justified below with their licence.
- [ ] Docs, contracts and env-var catalog are updated where relevant.

## Follow-ups / out of scope

<!-- New Jira issues for anything noticed but not done. Write "none" if empty. -->

none

## Author

- [ ] Human  - [ ] Claude Code  - [ ] Cursor  - [ ] Codex   (independent reviewer: _TODO_)
