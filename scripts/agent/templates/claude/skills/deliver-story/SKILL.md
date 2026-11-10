---
name: deliver-story
description: Deliver one Jira story (for example IATS-98) end to end under the repository's agent delivery framework — Definition of Ready check, branch, TDD commits, draft PR, preflight, self-review and handoff for review. Use whenever the user names a Jira key to implement, fix or build.
---

# Deliver a Jira story

Follow [`docs/16-devops/agent-prompts/deliver-story.md`](../../../docs/16-devops/agent-prompts/deliver-story.md)
step by step. It is the canonical procedure shared with Cursor and Codex. Also apply the
`full-sdlc` skill's quality gates.

Claude Code notes:

- Use the Atlassian MCP to read and transition the issue and to comment the plan, PR link and
  evidence when it is available.
- Start the branch with `scripts/agent/start-story.sh <KEY> <type> <slug> --worktree` when other
  agents may be active.
- Run `scripts/agent/preflight.sh` before marking anything ready. Report its real output.
- Before handing over, run an independent self-review through a subagent that receives only the
  diff, the acceptance criteria and `docs/16-devops/agent-prompts/review-pr.md`, not this
  conversation.
- Stop at a draft PR unless the issue carries the `autonomy-l2` label. Never merge.
