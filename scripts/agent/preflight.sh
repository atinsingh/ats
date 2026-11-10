#!/usr/bin/env bash
# Run the checks relevant to files changed on this branch versus origin/main, and
# print an honest evidence table (PASS / FAIL / SKIPPED with reason).
#
#   scripts/agent/preflight.sh            # changed stacks only
#   scripts/agent/preflight.sh --all      # every stack
#
# Exit code is non-zero if any check FAILS. SKIPPED never counts as passed.
set -uo pipefail

root="$(git rev-parse --show-toplevel 2>/dev/null)" || { echo "error: not in a git repo" >&2; exit 1; }
cd "$root" || exit 1

all=false; [[ "${1:-}" == "--all" ]] && all=true
results=()
failed=0

record() { results+=("$1|$2|$3"); [[ "$2" == "FAIL" ]] && failed=1; }
have() { command -v "$1" >/dev/null 2>&1; }
run() { # name, command...
  local name="$1"; shift
  echo "▶ $name: $*"
  if "$@"; then record "$name" PASS "$*"; else record "$name" FAIL "$*"; fi
}

# ---- branch & commit hygiene -------------------------------------------------
branch="$(git rev-parse --abbrev-ref HEAD)"
if [[ "$branch" =~ ^(feat|fix|refactor|perf|test|docs|chore|spike|hotfix)/IATS-[0-9]+-[a-z0-9-]+$ ]] && (( ${#branch} <= 60 )); then
  record "branch-name" PASS "$branch"
else
  record "branch-name" FAIL "'$branch' must be <type>/IATS-<n>-<slug> (≤60 chars)"
fi

git fetch origin main --quiet 2>/dev/null || true
base="$(git merge-base HEAD origin/main 2>/dev/null || echo "")"
if [[ -z "$base" ]]; then
  record "diff-base" FAIL "cannot find merge-base with origin/main"
  changed=""
else
  changed="$(git diff --name-only "$base"...HEAD; git diff --name-only; git diff --name-only --cached)"
  changed="$(echo "$changed" | sort -u | sed '/^$/d')"
  behind="$(git rev-list --count HEAD..origin/main)"
  if (( behind > 0 )); then record "up-to-date" FAIL "$behind commits behind origin/main — rebase/merge"; else record "up-to-date" PASS "even with origin/main"; fi

  key="$(echo "$branch" | grep -oE 'IATS-[0-9]+' || true)"
  bad=""
  for c in $(git rev-list "$base"..HEAD); do
    git log -1 --format=%B "$c" | grep -q "$key" || bad+="$(git rev-parse --short "$c") "
  done
  if [[ -z "$key" ]]; then record "commit-jira-key" FAIL "branch has no IATS key"
  elif [[ -n "$bad" ]]; then record "commit-jira-key" FAIL "commits missing $key: $bad"
  else record "commit-jira-key" PASS "all commits reference $key"; fi

  size=$(git diff --numstat "$base"...HEAD -- . ':(exclude)pnpm-lock.yaml' ':(exclude)**/go.sum' ':(exclude)**/*.lock' | awk '{a+=$1; d+=$2} END {print a+d+0}')
  if (( size > 800 )); then record "pr-size" FAIL "$size changed lines (>800: split or get large-pr-approved)";
  elif (( size > 400 )); then record "pr-size" PASS "$size changed lines (over the 400 target — justify in PR)";
  else record "pr-size" PASS "$size changed lines"; fi
fi

touched() { $all && return 0; echo "$changed" | grep -qE "$1"; }

# ---- secrets -------------------------------------------------------------------
if have gitleaks; then
  run "secrets-scan" gitleaks detect --source . --log-opts="${base:-HEAD~1}..HEAD" --redact --no-banner
else
  record "secrets-scan" SKIPPED "gitleaks not installed (CI still enforces it)"
fi
if echo "$changed" | grep -E '(^|/)\.env($|\.)' | grep -vq '\.env\.example$'; then
  record "no-env-files" FAIL ".env file in diff"
else
  record "no-env-files" PASS "no .env files"
fi

# ---- migrations are append-only -----------------------------------------------
if [[ -n "$base" ]]; then
  edited=$(git diff --name-status "$base"...HEAD | awk '$1 ~ /^(M|D|R)/ && $NF ~ /db\/migration\/V[0-9]+__.*\.sql$/ {print $NF}')
  if [[ -n "$edited" ]]; then record "migrations-append-only" FAIL "modified existing migration(s): $edited"; else record "migrations-append-only" PASS "no existing migration edited"; fi
fi

# ---- TypeScript ---------------------------------------------------------------
if touched '^(apps|packages)/|^package\.json|^pnpm-lock\.yaml|^turbo\.json|^tsconfig'; then
  if have pnpm; then
    run "ts-typecheck" pnpm -r --if-present exec tsc --noEmit
    run "ts-lint" pnpm lint
    run "ts-test" pnpm test
    run "ts-build" pnpm build
  else record "typescript" SKIPPED "pnpm not installed"; fi
fi

# ---- Java ---------------------------------------------------------------------
if touched '^services-java/|^build\.gradle\.kts|^settings\.gradle\.kts|^gradle/'; then
  if [[ -x ./gradlew ]] && have java; then run "java-build" ./gradlew build --no-daemon -q
  else record "java" SKIPPED "gradlew or java not available"; fi
fi

# ---- Go -----------------------------------------------------------------------
for mod in services-go/*/; do
  mod="${mod%/}"
  [[ -f "$mod/go.mod" ]] || continue
  touched "^$mod/" || continue
  if have go; then
    run "go-vet:$(basename "$mod")" bash -c "cd '$mod' && go vet ./..."
    run "go-test:$(basename "$mod")" bash -c "cd '$mod' && go test ./..."
  else record "go:$(basename "$mod")" SKIPPED "go not installed"; fi
done

# ---- Python -------------------------------------------------------------------
for w in workers-python/*/; do
  w="${w%/}"
  touched "^$w/" || continue
  name="$(basename "$w")"
  if have ruff; then run "py-ruff:$name" bash -c "cd '$w' && ruff check ."; else record "py-ruff:$name" SKIPPED "ruff not installed"; fi
  if have pytest || [[ -x "$w/.venv/bin/pytest" ]]; then
    pt="pytest"; [[ -x "$w/.venv/bin/pytest" ]] && pt="$PWD/$w/.venv/bin/pytest"
    if ls "$w"/tests >/dev/null 2>&1; then run "py-test:$name" bash -c "cd '$w' && PYTHONPATH=src '$pt' -q"
    else record "py-test:$name" SKIPPED "no tests/ directory yet"; fi
  else record "py-test:$name" SKIPPED "pytest not installed"; fi
done

# ---- Contracts ----------------------------------------------------------------
if touched '^packages/shared-contracts/'; then
  if have npx; then run "openapi-lint" bash -c 'for f in packages/shared-contracts/openapi/*.yaml; do npx --yes @redocly/cli@1.25.11 lint --format=stylish "$f" || exit 1; done'
  else record "openapi-lint" SKIPPED "npx not available"; fi
fi

# ---- report -------------------------------------------------------------------
echo
echo "## Preflight evidence ($(git rev-parse --short HEAD) on $branch)"
echo
echo "| Check | Result | Detail |"
echo "|---|---|---|"
for r in "${results[@]}"; do IFS='|' read -r n s d <<<"$r"; echo "| $n | $s | $d |"; done
echo
if (( failed )); then echo "RESULT: FAIL — fix the failing checks before requesting review."; exit 1; fi
echo "RESULT: PASS (SKIPPED items are not passes — list them in the PR)."
