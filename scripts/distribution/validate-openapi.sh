#!/usr/bin/env bash
# scripts/distribution/validate-openapi.sh
#
# Validate the live OpenAPI spec against three checks:
#   1. Structural: parses as JSON, is valid OpenAPI 3.1.
#   2. Accuracy: every path returned in the spec is reachable on prod
#      (or returns a sensible auth/404 — see below).
#   3. Coverage: every /api/v1/* route file in the repo is documented
#      in the spec (no missing endpoints).
#
# Designed to catch drift between code reality and the published spec
# — the kind of mismatch that makes machine-readable docs worse than
# no docs.
#
# Usage:
#   bash scripts/distribution/validate-openapi.sh
#
# Exit code: 0 if all checks pass, 1 if any fail.

set -euo pipefail

BASE_URL="${SP_BASE_URL:-https://socialperks.app}"
SPEC_URL="${BASE_URL}/api/v1/openapi"
REPO_API_DIR="$(cd "$(dirname "$0")/../.." && pwd)/src/app/api/v1"

errors=0
warnings=0

# ─── 1. Structural ──────────────────────────────────────────────────────────

echo "== Fetching spec from $SPEC_URL"
spec_json=$(curl -sf "$SPEC_URL")
if [[ -z "$spec_json" ]]; then
  echo "FAIL: could not fetch spec (network or 5xx)"
  exit 1
fi

if ! printf '%s' "$spec_json" | jq empty 2>/dev/null; then
  echo "FAIL: spec is not valid JSON"
  exit 1
fi

# Spec lives under .data per the SuccessEnvelope convention.
spec=$(printf '%s' "$spec_json" | jq '.data')
openapi_version=$(printf '%s' "$spec" | jq -r '.openapi // "missing"')
info_version=$(printf '%s' "$spec" | jq -r '.info.version // "missing"')
servers_count=$(printf '%s' "$spec" | jq '.servers | length')
paths_count=$(printf '%s' "$spec" | jq '.paths | keys | length')

echo "  openapi=$openapi_version  info.version=$info_version  servers=$servers_count  paths=$paths_count"

if [[ "$openapi_version" != "3.1.0" && "$openapi_version" != "3.1.1" ]]; then
  echo "WARN: openapi version is '$openapi_version', expected 3.1.x"
  warnings=$((warnings+1))
fi

if [[ "$servers_count" -lt 1 ]]; then
  echo "FAIL: spec has no servers entry"
  errors=$((errors+1))
fi

# Check for the placeholder URL that production must never expose.
if printf '%s' "$spec" | jq -r '.servers[].url' | grep -q "example.com"; then
  echo "FAIL: spec exposes 'example.com' placeholder server URL"
  errors=$((errors+1))
fi

# ─── 2. Accuracy — every documented path is reachable ───────────────────────

echo ""
echo "== Probing each documented path"

spec_paths=()
while IFS= read -r line; do
  spec_paths+=("$line")
done < <(printf '%s' "$spec" | jq -r '.paths | keys[]')

for path in "${spec_paths[@]}"; do
  # Pick the first HTTP method documented for this path.
  method=$(printf '%s' "$spec" | jq -r --arg p "$path" '.paths[$p] | keys[0] | ascii_upcase')

  # Substitute path params with placeholders so we get a meaningful
  # response. Most {id}-style params yield 400 or 404 with a
  # placeholder, which still proves the route is registered.
  probe_path=$(printf '%s' "$path" | sed 's|{[^}]*}|test-id|g')
  url="${BASE_URL}/api/v1${probe_path}"

  # Use HEAD if available, fall back to method-specific request.
  if [[ "$method" == "GET" ]]; then
    http_status=$(curl -s -o /dev/null -w "%{http_code}" "$url" || echo "000")
  else
    # For POST/PUT/DELETE, send an empty body — we expect 4xx (auth or
    # validation error), but 404 means the route doesn't exist.
    http_status=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" \
      -H "Content-Type: application/json" -d '{}' "$url" || echo "000")
  fi

  # 404 means the documented endpoint doesn't exist. Anything else is OK.
  if [[ "$http_status" == "404" ]]; then
    echo "  FAIL  $method $path → 404 (route doesn't exist on prod)"
    errors=$((errors+1))
  elif [[ "$http_status" == "000" ]]; then
    echo "  WARN  $method $path → unreachable (network issue?)"
    warnings=$((warnings+1))
  else
    echo "  OK    $method $path → $http_status"
  fi
done

# ─── 3. Coverage — every route in the repo is in the spec ───────────────────

echo ""
echo "== Coverage: route files vs. spec paths"

if [[ ! -d "$REPO_API_DIR" ]]; then
  echo "WARN: REPO_API_DIR not found at $REPO_API_DIR (skipping coverage)"
  warnings=$((warnings+1))
else
  # Discover all route.ts files under src/app/api/v1 and reconstruct
  # their HTTP paths.
  repo_paths=()
  while IFS= read -r line; do
    repo_paths+=("$line")
  done < <(
    find "$REPO_API_DIR" -name "route.ts" -type f | while read -r f; do
      # Strip prefix and route.ts suffix, then replace [param] with {param}
      rel="${f#"$REPO_API_DIR"}"
      rel="${rel%/route.ts}"
      # Empty string means /api/v1 itself — skip (no root route)
      [[ -z "$rel" ]] && continue
      # Translate [foo] → {foo}
      rel=$(printf '%s' "$rel" | sed -E 's|\[([^]]+)\]|{\1}|g')
      printf '%s\n' "$rel"
    done | sort -u
  )

  # bash 3.2 (default macOS) doesn't support `declare -A`. Use a
  # newline-delimited string as a poor man's set.
  spec_set=""
  for p in "${spec_paths[@]}"; do
    spec_set="${spec_set}${p}\n"
  done

  # Skip internal / dev-only routes from the coverage requirement.
  skip_patterns=(
    "/seed"            # dev-only seed endpoint
    "/csp-report"      # browser-emitted, no agent need
    "/webhook"         # Stripe / verification webhooks
    "/cron/"           # internal cron triggers
    "/openapi"         # the spec endpoint itself
    "/mcp"             # MCP is documented separately
    "/csrf"            # CSRF token issuance
    "/oauth/"          # social-platform OAuth, not agent-facing
    "/verification/"   # webhooks
    "/billing/"        # internal subscription detail
  )

  uncovered=()
  for repo_path in "${repo_paths[@]}"; do
    skip=0
    for pat in "${skip_patterns[@]}"; do
      if [[ "$repo_path" == *"$pat"* ]]; then
        skip=1
        break
      fi
    done
    [[ $skip -eq 1 ]] && continue

    if ! printf "$spec_set" | grep -Fxq "$repo_path"; then
      uncovered+=("$repo_path")
    fi
  done

  if [[ ${#uncovered[@]} -gt 0 ]]; then
    echo "  ${#uncovered[@]} agent-facing route(s) in repo but NOT in spec:"
    for p in "${uncovered[@]}"; do
      echo "    - $p"
      warnings=$((warnings+1))
    done
    echo "  (These are warnings, not errors — add them to openapi/route.ts if agents should see them.)"
  else
    echo "  OK    every agent-facing route in the repo is documented in the spec"
  fi
fi

# ─── Summary ────────────────────────────────────────────────────────────────

echo ""
echo "== Summary"
echo "  errors=$errors  warnings=$warnings"

if [[ $errors -gt 0 ]]; then
  exit 1
fi
exit 0
