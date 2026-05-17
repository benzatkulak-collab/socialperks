#!/usr/bin/env bash
# scripts/distribution/watch-pr.sh
#
# Watch one or more GitHub PRs and notify when they merge, close, or
# get a new review comment. Designed for the open distribution PRs:
#   - punkpeye/awesome-mcp-servers#6463 (Social Perks marketing entry)
#   - any future submissions to MCP-adjacent repos
#
# Reads `gh` CLI authentication (`gh auth status` must succeed). No
# extra credentials.
#
# Usage:
#   bash scripts/distribution/watch-pr.sh
#
# Cron-friendly: prints a one-line status per PR, suitable for piping
# into a notification service or a daily digest email. Example cron
# entry (every 4 hours during business hours):
#   0 9,13,17 * * * cd /path/to/repo && bash scripts/distribution/watch-pr.sh
#
# To add a PR to watch, append a "{owner}/{repo}#{num}" line to the
# PRS array below.

set -euo pipefail

# PRs to watch — add new ones here as we submit them.
PRS=(
  "punkpeye/awesome-mcp-servers#6463"
)

STATE_DIR="${SP_PR_WATCH_STATE_DIR:-/tmp/sp-pr-watch}"
mkdir -p "$STATE_DIR"

if ! command -v gh >/dev/null 2>&1; then
  echo "error: gh CLI required (https://cli.github.com)" >&2
  exit 1
fi
if ! gh auth status >/dev/null 2>&1; then
  echo "error: gh CLI not authenticated. Run 'gh auth login' first." >&2
  exit 1
fi

for entry in "${PRS[@]}"; do
  # Split "owner/repo#num" into pieces.
  repo="${entry%#*}"
  num="${entry##*#}"

  # Snapshot the PR's current state.
  current=$(gh pr view "$num" --repo "$repo" --json state,reviewDecision,mergedAt,comments \
    --jq '{state, reviewDecision, mergedAt, comments: (.comments | length)}' 2>/dev/null || echo "{}")

  if [[ "$current" == "{}" ]]; then
    echo "[$(date -u +%FT%TZ)] $entry  ERROR  could not fetch PR (deleted? renamed?)"
    continue
  fi

  state=$(printf '%s' "$current" | jq -r '.state // "UNKNOWN"')
  review=$(printf '%s' "$current" | jq -r '.reviewDecision // "none"')
  merged=$(printf '%s' "$current" | jq -r '.mergedAt // ""')
  comments=$(printf '%s' "$current" | jq -r '.comments // 0')

  # Compare to last-seen snapshot. We use a hashed filename so PR
  # identifiers with slashes don't break the path.
  state_file="$STATE_DIR/$(printf '%s' "$entry" | shasum | awk '{print $1}').json"
  if [[ -f "$state_file" ]]; then
    prev=$(cat "$state_file")
    prev_state=$(printf '%s' "$prev" | jq -r '.state // "UNKNOWN"')
    prev_comments=$(printf '%s' "$prev" | jq -r '.comments // 0')
  else
    prev_state="(first run)"
    prev_comments=0
  fi

  # Emit a single line per PR.
  status_str="state=$state review=$review comments=$comments"
  if [[ -n "$merged" ]]; then
    status_str="$status_str merged=$merged"
  fi

  # Highlight transitions so a daily digest only shows interesting
  # entries when piped through `grep -v 'no-change'`.
  if [[ "$prev_state" != "$state" ]]; then
    transition="STATE_CHANGE($prev_state → $state)"
  elif (( comments > prev_comments )); then
    transition="NEW_COMMENTS(+$(( comments - prev_comments )))"
  else
    transition="no-change"
  fi

  echo "[$(date -u +%FT%TZ)] $entry  $transition  $status_str"

  # Save current state for next run.
  printf '%s' "$current" > "$state_file"
done
