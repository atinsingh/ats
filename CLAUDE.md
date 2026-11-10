# CLAUDE.md

@AGENTS.md

## Claude Code specifics

- Skills in this repo: `deliver-story` (give it a Jira key), `review-pr` (independent review of a PR
  you did not write), and `full-sdlc` (quality gates for any change).
- Use plan mode, or post a written plan on the Jira issue, before editing for anything beyond a
  Routine change.
- Use a subagent for the independent self-review pass and for broad codebase searches, so the main
  session keeps the story context.
- Use the Atlassian MCP for Jira when it is connected: read the issue, transition it, and comment
  the plan, PR link and evidence. If it isn't connected, ask the human to paste the story.
- Use `gh` for pull requests: `gh pr create --draft --fill-first --template .github/pull_request_template.md`.
- Add the `Agent: claude-code` footer to every commit.
