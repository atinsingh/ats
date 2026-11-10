#!/usr/bin/env bash
# Copy the staged GitHub and Claude Code files into place. Run this yourself from the repo root:
#
#   bash scripts/agent/install-protected-files.sh
#
# (Agents cannot write to .github/ or .claude/ remotely, by design.)
set -euo pipefail
cd "$(dirname "$0")/../.."
src="scripts/agent/templates"

copy() { # from to
  if [[ -e "$2" ]] && ! cmp -s "$1" "$2"; then
    echo "skip (exists and differs, review manually): $2"
  else
    mkdir -p "$(dirname "$2")"; cp "$1" "$2"; echo "installed: $2"
  fi
}

copy "$src/github/pull_request_template.md" .github/pull_request_template.md
copy "$src/github/CODEOWNERS"               .github/CODEOWNERS
copy "$src/github/dependabot.yml"           .github/dependabot.yml
copy "$src/github/workflows/ci.yml"         .github/workflows/ci.yml
copy "$src/github/workflows/pr-hygiene.yml" .github/workflows/pr-hygiene.yml
copy "$src/claude/skills/deliver-story/SKILL.md" .claude/skills/deliver-story/SKILL.md
copy "$src/claude/skills/review-pr/SKILL.md"     .claude/skills/review-pr/SKILL.md

chmod +x scripts/agent/*.sh .githooks/*
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  git config core.hooksPath .githooks && echo "enabled git hooks (core.hooksPath=.githooks)"
else
  echo "note: not a git repository yet — run 'git init' then 'git config core.hooksPath .githooks'"
fi
echo "done. Next: replace placeholder teams in .github/CODEOWNERS (agent-delivery-framework.md §18)."
