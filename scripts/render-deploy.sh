#!/usr/bin/env bash
# render-deploy.sh — trigger a Render deploy from the CLI.
#
# Two auth modes (whichever you set takes precedence):
#   1. RENDER_API_KEY  — full API access. Auto-discovers SERVICE_ID if missing.
#   2. RENDER_DEPLOY_HOOK_URL — service-scoped webhook URL. Simpler, no scopes.
#
# Add either to .env.local (gitignored) — the script sources it automatically.
#
# Usage:
#   ./scripts/render-deploy.sh               # deploy latest commit on configured branch
#   ./scripts/render-deploy.sh --wait        # also poll until the deploy finishes
#   ./scripts/render-deploy.sh --clear-cache # purge build cache then deploy

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

# Pick up env from .env.local if present (gitignored).
if [[ -f .env.local ]]; then
  # shellcheck disable=SC1091
  set -a; source .env.local; set +a
fi

WAIT=0
CLEAR_CACHE=0
for arg in "$@"; do
  case "$arg" in
    --wait) WAIT=1 ;;
    --clear-cache) CLEAR_CACHE=1 ;;
    *) echo "unknown flag: $arg" >&2; exit 2 ;;
  esac
done

# ── Mode 2: deploy hook (simpler) ─────────────────────────────────────────────
if [[ -n "${RENDER_DEPLOY_HOOK_URL:-}" ]]; then
  echo "→ triggering deploy via webhook…"
  curl -fsS "$RENDER_DEPLOY_HOOK_URL" -o /dev/null -w "HTTP %{http_code}\n"
  echo "✅ deploy enqueued. Watch progress in the Render dashboard."
  exit 0
fi

# ── Mode 1: API key ──────────────────────────────────────────────────────────
if [[ -z "${RENDER_API_KEY:-}" ]]; then
  cat >&2 <<EOF
ERROR: neither RENDER_API_KEY nor RENDER_DEPLOY_HOOK_URL is set.

To use the deploy hook (simpler, recommended):
  1. https://dashboard.render.com → socialperks service → Settings → Deploy Hook
  2. Copy the URL and add to .env.local:
       RENDER_DEPLOY_HOOK_URL=https://api.render.com/deploy/srv-xxxx?key=yyyy

To use the API key (more powerful, can poll status):
  1. https://dashboard.render.com/u/settings → API Keys → Create
  2. Add to .env.local:
       RENDER_API_KEY=rnd_xxxx
EOF
  exit 1
fi

AUTH_HEADER="Authorization: Bearer $RENDER_API_KEY"
API="https://api.render.com/v1"

# Resolve SERVICE_ID — either from env or by listing services for the account.
SERVICE_ID="${RENDER_SERVICE_ID:-}"
if [[ -z "$SERVICE_ID" ]]; then
  echo "→ discovering service id for 'socialperks'…"
  SERVICE_ID=$(curl -fsS -H "$AUTH_HEADER" "$API/services?limit=50" \
    | python3 -c '
import json, sys
data = json.load(sys.stdin)
for item in data:
    svc = item.get("service") or item
    if svc.get("name") == "socialperks":
        print(svc["id"]); break
')
  if [[ -z "$SERVICE_ID" ]]; then
    echo "ERROR: no service named 'socialperks' found on this account." >&2
    exit 1
  fi
  echo "  found: $SERVICE_ID  (cache as RENDER_SERVICE_ID=$SERVICE_ID in .env.local to skip discovery)"
fi

# Trigger deploy
CACHE_PAYLOAD='{"clearCache":"do_not_clear"}'
[[ $CLEAR_CACHE -eq 1 ]] && CACHE_PAYLOAD='{"clearCache":"clear"}'

echo "→ triggering deploy for $SERVICE_ID…"
DEPLOY_JSON=$(curl -fsS -X POST -H "$AUTH_HEADER" -H "Content-Type: application/json" \
  -d "$CACHE_PAYLOAD" "$API/services/$SERVICE_ID/deploys")
DEPLOY_ID=$(echo "$DEPLOY_JSON" | python3 -c 'import json,sys; print(json.load(sys.stdin)["id"])')
echo "  deploy id: $DEPLOY_ID"

if [[ $WAIT -eq 0 ]]; then
  echo "✅ enqueued. Pass --wait to poll until complete."
  exit 0
fi

echo "→ polling status (Ctrl-C to detach; deploy continues)…"
while true; do
  STATUS=$(curl -fsS -H "$AUTH_HEADER" "$API/services/$SERVICE_ID/deploys/$DEPLOY_ID" \
    | python3 -c 'import json,sys; print(json.load(sys.stdin)["status"])')
  TS=$(date "+%H:%M:%S")
  echo "  [$TS] $STATUS"
  case "$STATUS" in
    live)        echo "✅ deploy live"; exit 0 ;;
    build_failed|update_failed|canceled|deactivated)
                 echo "❌ deploy ended in state: $STATUS" >&2; exit 1 ;;
    *)           sleep 15 ;;
  esac
done
