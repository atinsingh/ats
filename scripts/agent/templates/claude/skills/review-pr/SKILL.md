---
name: review-pr
description: Independently review a pull request in this repository against its Jira acceptance criteria, the agent delivery framework and the full-SDLC gates, posting severity-tagged findings. Use when asked to review a PR or branch that this session did not write.
---

# Independent PR review

Follow [`docs/16-devops/agent-prompts/review-pr.md`](../../../docs/16-devops/agent-prompts/review-pr.md).

- Refuse to review a PR this session authored. Independence is the point.
- Gather context with `gh pr view`, `gh pr diff` and `gh pr checks`, and the linked Jira issue
  (through the Atlassian MCP if connected).
- Do not push commits or approve on behalf of a code owner. Post comments and a recommendation only.
