#!/usr/bin/env bash
#
# Smoke test for Social Perks deployments. Hits a handful of critical paths
# and prints a one-line PASS/FAIL summary per check. Exits non-zero if any
# required check fails.
#
# Usage:
#   BASE_URL=https://socialperks.onrender.com ./scripts/smoke-test.sh
#   ./scripts/smoke-test.sh                  # defaults to http://localhost:3000
#
# Designed to be run from GitHub Actions on a schedule. Curl uses short
# timeouts so a hung server can't keep the workflow alive forever.

set -uo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
FAIL=0
PASS=0
TOTAL=0

# colors when stdout is a TTY
if [ -t 1 ]; then
  GREEN=$'\033[0;32m'
  RED=$'\033[0;31m'
  YELLOW=$'\033[0;33m'
  RESET=$'\033[0m'
else
  GREEN="" RED="" YELLOW="" RESET=""
fi

echo "Smoke test against: ${BASE_URL}"
echo "---"

# Run a check.
#   $1 — label, $2 — method, $3 — path, $4 — expected status (comma-sep ok),
#   $5 — optional body, $6 — optional grep pattern for response.
check() {
  local label="$1" method="$2" path="$3" want_status="$4" body="${5:-}" body_grep="${6:-}"
  TOTAL=$((TOTAL + 1))

  local tmp; tmp="$(mktemp)"
  local args=(-sS -o "$tmp" -w "%{http_code}" -m 15 -X "$method" "${BASE_URL}${path}")
  if [ -n "$body" ]; then
    args+=(-H "Content-Type: application/json" --data "$body")
  fi

  local status
  status="$(curl "${args[@]}" || echo "000")"

  local matched=0
  IFS=',' read -ra wants <<< "$want_status"
  for w in "${wants[@]}"; do
    if [ "$status" = "$w" ]; then matched=1; break; fi
  done

  local body_ok=1
  if [ -n "$body_grep" ]; then
    if ! grep -q "$body_grep" "$tmp"; then body_ok=0; fi
  fi

  if [ "$matched" = "1" ] && [ "$body_ok" = "1" ]; then
    printf "  %sPASS%s  %-40s %s\n" "$GREEN" "$RESET" "$label" "$status"
    PASS=$((PASS + 1))
  else
    printf "  %sFAIL%s  %-40s got=%s want=%s\n" "$RED" "$RESET" "$label" "$status" "$want_status"
    if [ -s "$tmp" ]; then
      head -c 500 "$tmp" | sed 's/^/        /'
      echo
    fi
    FAIL=$((FAIL + 1))
  fi
  rm -f "$tmp"
}

# Public pages — should render (200)
check "homepage"                   GET  "/"                       200
check "upgrade page"               GET  "/upgrade"                200
check "auth page"                  GET  "/auth"                   200

# Health endpoint
check "health"                     GET  "/api/v1/health"          200 "" '"success":true'

# Auth signup — accept 200/201 OR 409 (duplicate from previous runs) OR 429
# (rate-limited). Anything else means the route is broken.
SIGNUP_BODY=$(cat <<JSON
{"action":"signup","email":"smoke-$(date +%s)@example.com","password":"SmokeTest123!","name":"Smoke"}
JSON
)
check "auth signup"                POST "/api/v1/auth"            200,201,409,429 "$SIGNUP_BODY"

# Billing checkout should refuse unauthenticated requests
check "billing checkout (no auth)" POST "/api/v1/billing/checkout" 401 '{"plan":"pro"}'

# Cron requires the secret key — without it we expect 401 (configured) or 503
check "cron (no key)"              GET  "/api/v1/cron?task=cleanup-expired" 401,503

echo "---"
if [ "$FAIL" -gt 0 ]; then
  printf "%s%d/%d checks failed%s\n" "$RED" "$FAIL" "$TOTAL" "$RESET"
  exit 1
fi
printf "%s%d/%d checks passed%s\n" "$GREEN" "$PASS" "$TOTAL" "$RESET"
