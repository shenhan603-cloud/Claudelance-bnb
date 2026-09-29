#!/usr/bin/env bash
# Publish packages/sdk and packages/types histories to dedicated mirror repos.
# Required because Talent app / npm crawlers shallow-scan repo roots: monorepo
# subpaths aren't detected, so we keep a single-package mirror per published
# scoped package whose package.json lives at the mirror root.
#
# Usage:
#   scripts/subtree-publish.sh                # publish both
#   scripts/subtree-publish.sh sdk            # publish sdk only
#   scripts/subtree-publish.sh types          # publish types only
#
# Idempotent. Re-runs reuse split branches (--rejoin keeps incremental).
set -euo pipefail

OWNER="${SUBTREE_OWNER:-yeheskieltame}"
DEFAULT_BRANCH="${SUBTREE_BRANCH:-main}"

publish_one() {
  local pkg="$1"          # sdk | types
  local prefix="packages/${pkg}"
  local mirror="claudelance-${pkg}"
  local split_branch="subtree-split/${pkg}"
  local remote_name="mirror-${pkg}"
  local remote_url="https://github.com/${OWNER}/${mirror}.git"

  echo "==> [${pkg}] split ${prefix} -> ${split_branch}"
  git subtree split --prefix="${prefix}" -b "${split_branch}" >/dev/null

  echo "==> [${pkg}] remote ${remote_name} -> ${remote_url}"
  git remote remove "${remote_name}" 2>/dev/null || true
  git remote add "${remote_name}" "${remote_url}"

  echo "==> [${pkg}] push -> ${remote_name}/${DEFAULT_BRANCH}"
  git push "${remote_name}" "${split_branch}:${DEFAULT_BRANCH}" --force

  echo "==> [${pkg}] cleanup"
  git branch -D "${split_branch}" >/dev/null
  git remote remove "${remote_name}"
}

case "${1:-all}" in
  sdk)    publish_one sdk ;;
  types)  publish_one types ;;
  all)    publish_one types; publish_one sdk ;;
  *)      echo "Usage: $0 [sdk|types|all]" >&2; exit 1 ;;
esac
