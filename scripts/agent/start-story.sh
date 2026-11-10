#!/usr/bin/env bash
# Start work on a Jira story: validate inputs, sync main, create the story branch
# (optionally in a dedicated git worktree for parallel agents).
#
#   scripts/agent/start-story.sh IATS-98 feat board-dialect-emitters [--worktree]
#
# See docs/16-devops/agent-delivery-framework.md §5.
set -euo pipefail

usage() {
  echo "usage: $0 <IATS-KEY> <type> <slug> [--worktree]" >&2
  echo "  type: feat|fix|refactor|perf|test|docs|chore|spike|hotfix" >&2
  exit 2
}

[[ $# -lt 3 ]] && usage
key="$1"; type="$2"; slug="$3"; worktree="${4:-}"

[[ "$key" =~ ^IATS-[0-9]+$ ]] || { echo "error: key must look like IATS-123 (got '$key')" >&2; exit 2; }
[[ "$type" =~ ^(feat|fix|refactor|perf|test|docs|chore|spike|hotfix)$ ]] || { echo "error: invalid type '$type'" >&2; usage; }
slug="$(echo "$slug" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9]+/-/g; s/^-+|-+$//g')"
[[ -n "$slug" ]] || { echo "error: empty slug" >&2; exit 2; }

branch="${type}/${key}-${slug}"
if (( ${#branch} > 60 )); then
  echo "error: branch name '${branch}' is ${#branch} chars (max 60); shorten the slug" >&2
  exit 2
fi

git rev-parse --is-inside-work-tree >/dev/null 2>&1 || { echo "error: not inside a git repository" >&2; exit 1; }
root="$(git rev-parse --show-toplevel)"
cd "$root"

if [[ "$(git config core.hooksPath || true)" != ".githooks" ]]; then
  git config core.hooksPath .githooks
  echo "info: enabled repository git hooks (core.hooksPath=.githooks)"
fi

if git show-ref --verify --quiet "refs/heads/${branch}"; then
  echo "error: local branch ${branch} already exists" >&2; exit 1
fi
if git ls-remote --exit-code --heads origin "${branch}" >/dev/null 2>&1; then
  echo "error: remote branch ${branch} already exists — another agent may hold ${key}" >&2; exit 1
fi
existing="$(git ls-remote --heads origin "*${key}-*" 2>/dev/null | awk '{print $2}' | sed 's#refs/heads/##' || true)"
if [[ -n "$existing" ]]; then
  echo "error: ${key} already has a remote branch: ${existing}" >&2; exit 1
fi

git fetch origin main --quiet
base="origin/main"

if [[ "$worktree" == "--worktree" ]]; then
  wt_root="$(dirname "$root")/$(basename "$root")-worktrees"
  wt="${wt_root}/${key}"
  mkdir -p "$wt_root"
  git worktree add --no-track -b "$branch" "$wt" "$base"
  echo "created worktree: $wt"
  echo "next: cd \"$wt\""
else
  if [[ -n "$(git status --porcelain)" ]]; then
    echo "error: working tree has uncommitted changes; commit/stash them or use --worktree" >&2; exit 1
  fi
  git switch --no-track -c "$branch" "$base"
fi

cat <<EOF

branch ready: ${branch} (from ${base})
next steps:
  1. Move ${key} to In Progress, add your agent-* label, comment your plan.
  2. TDD commits:  <type>(<scope>): <summary>   +  footers  Jira: ${key} / Agent: <tool>
  3. git push -u origin ${branch} && gh pr create --draft --title "${key} ${type}(<scope>): <summary>"
  4. scripts/agent/preflight.sh before requesting review.
EOF
