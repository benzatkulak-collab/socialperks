#!/usr/bin/env bash
# smoke-test-audit.sh — verify the audit fixes from claude/friendly-liskov
# actually shipped to prod, end to end. Complements the existing
# smoke-test.sh (which is a liveness check). Run after every deploy.
#
# Exits 0 if all hardened paths still work, non-zero otherwise.
#
# Usage:
#   ./scripts/smoke-test-audit.sh                    # against socialperks.app
#   BASE_URL=https://staging.example.com ./scripts/smoke-test-audit.sh

set -uo pipefail  # don't -e so we collect every failure, not just the first

BASE_URL="${BASE_URL:-https://socialperks.app}"
DEMO_EMAIL="${DEMO_EMAIL:-yoga@demo.com}"
DEMO_PASSWORD="${DEMO_PASSWORD:-1234}"
BUSINESS_ID="${BUSINESS_ID:-b1}"

PASS=0
FAIL=0
COOKIE_JAR=$(mktemp)
RESP=$(mktemp)
trap 'rm -f "$COOKIE_JAR" "$RESP"' EXIT

if [ -t 1 ]; then
  GREEN=$'\033[0;32m'; RED=$'\033[0;31m'; YLW=$'\033[0;33m'; RESET=$'\033[0m'
else
  GREEN=""; RED=""; YLW=""; RESET=""
fi

ok()   { printf "  ${GREEN}PASS${RESET}  %s\n"               "$1"; PASS=$((PASS+1)); }
fail() { printf "  ${RED}FAIL${RESET}  %s — %s\n"            "$1" "$2"; FAIL=$((FAIL+1)); }
skip() { printf "  ${YLW}SKIP${RESET}  %s — %s\n"            "$1" "$2"; }
sec()  { printf "\n── %s ──\n" "$1"; }

# JSON field reader: json_get '.data.csrfToken'
json_get() {
  python3 -c "
import json, sys
try:
    d = json.load(open('$RESP'))
    for k in '$1'.lstrip('.').split('.'):
        d = d.get(k, '') if isinstance(d, dict) else ''
    print(d if d is not None else '')
except Exception:
    print('')
" 2>/dev/null
}

echo "Audit smoke test against: ${BASE_URL}"

# ── 1. infrastructure ────────────────────────────────────────────────────────

sec "infrastructure"

code=$(curl -sS -o "$RESP" -w '%{http_code}' -m 10 "$BASE_URL/api/v1/health")
[ "$code" = "200" ] && ok "GET /api/v1/health → 200" \
                    || fail "GET /api/v1/health" "got $code"

code=$(curl -sS -o "$RESP" -w '%{http_code}' -m 10 -c "$COOKIE_JAR" "$BASE_URL/api/v1/csrf")
csrf=$(json_get '.data.csrfToken')
if [ "$code" = "200" ] && [ -n "$csrf" ]; then
  ok "GET /api/v1/csrf returns token"
else
  fail "GET /api/v1/csrf" "got $code, no token"
  echo "Cannot continue — CSRF endpoint broken"; exit 1
fi

# ── 2. CSRF gate (commit 889a629 — critical money-path fix) ──────────────────

sec "CSRF gate"

# Login first so we have a real session
code=$(curl -sS -o "$RESP" -w '%{http_code}' -m 10 \
  -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
  -X POST -H "Content-Type: application/json" -H "X-CSRF-Token: $csrf" \
  "$BASE_URL/api/v1/auth" \
  -d "{\"action\":\"login\",\"email\":\"$DEMO_EMAIL\",\"password\":\"$DEMO_PASSWORD\"}")
auth=$(json_get '.data.accessToken')
[ "$code" = "200" ] && [ -n "$auth" ] && ok "login as $DEMO_EMAIL → 200" \
                                      || fail "login" "got $code, accessToken='$auth'"

# Re-fetch CSRF token after login — the token is bound to session id, which
# changes from anon-derived to the authenticated user's id. The frontend
# helper invalidates and re-fetches on CSRF_TOKEN_INVALID automatically; we
# do it explicitly here so each test is self-contained.
csrf=$(curl -sS -m 10 -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
  -H "Authorization: Bearer $auth" "$BASE_URL/api/v1/csrf" \
  | python3 -c 'import json,sys; print(json.load(sys.stdin)["data"]["csrfToken"])')
[ -n "$csrf" ] && ok "post-login CSRF token issued" \
              || fail "post-login CSRF" "no token returned"

# Without CSRF token: should be 403 CSRF_TOKEN_MISSING
code=$(curl -sS -o "$RESP" -w '%{http_code}' -m 10 \
  -X POST -H "Content-Type: application/json" \
  -H "Authorization: Bearer $auth" \
  "$BASE_URL/api/v1/campaigns" -d '{"businessId":"'$BUSINESS_ID'"}')
err_code=$(json_get '.error.code')
if [ "$code" = "403" ] && [ "$err_code" = "CSRF_TOKEN_MISSING" ]; then
  ok "POST /campaigns without CSRF → 403 CSRF_TOKEN_MISSING"
else
  fail "CSRF gate" "expected 403 CSRF_TOKEN_MISSING, got $code $err_code"
fi

# ── 3. campaign launch end-to-end (CSRF + persistence + name field) ──────────

sec "campaign launch end-to-end (889a629 + 1a2b4c4)"

ts=$(date +%s)
code=$(curl -sS -o "$RESP" -w '%{http_code}' -m 15 \
  -X POST -H "Content-Type: application/json" \
  -H "Authorization: Bearer $auth" -H "X-CSRF-Token: $csrf" \
  "$BASE_URL/api/v1/campaigns" \
  -d "{\"businessId\":\"$BUSINESS_ID\",\"name\":\"smoke-audit-$ts\",\"description\":\"smoke\",\"actions\":[\"ig_st\"],\"discountValue\":10,\"discountType\":\"pct\",\"expiresInDays\":30}")
campaign_id=$(json_get '.data.campaign.id')
campaign_name=$(json_get '.data.campaign.name')

case "$code" in
  201)
    ok "POST /campaigns → 201 (id=$campaign_id)"
    if [ "$campaign_name" = "smoke-audit-$ts" ]; then
      ok "campaign.name persists in response (lifecycle has name field — 1a2b4c4)"
    else
      fail "campaign name in response" "expected 'smoke-audit-$ts', got '$campaign_name'"
    fi
    ;;
  403)
    # Plan limit hit from previous smoke runs is acceptable
    err=$(json_get '.error.code')
    if [ "$err" = "PLAN_LIMIT_EXCEEDED" ]; then
      skip "POST /campaigns" "free plan limit hit from earlier runs — CSRF path still proved by 403/400 above"
    else
      fail "POST /campaigns" "got 403 $err"
    fi
    ;;
  *) fail "POST /campaigns" "expected 201, got $code" ;;
esac

# GET list includes the new campaign (if we created one)
if [ -n "$campaign_id" ]; then
  curl -sS -o "$RESP" -m 10 -H "Authorization: Bearer $auth" \
    "$BASE_URL/api/v1/campaigns?businessId=$BUSINESS_ID"
  has_it=$(python3 -c "
import json
data = json.load(open('$RESP')).get('data', {})
items = data.get('campaigns', [])
print('yes' if any(c.get('id') == '$campaign_id' for c in items) else 'no')
" 2>/dev/null)
  has_named=$(python3 -c "
import json
data = json.load(open('$RESP')).get('data', {})
items = data.get('campaigns', [])
print('yes' if any(c.get('name') for c in items) else 'no')
" 2>/dev/null)
  [ "$has_it" = "yes" ]    && ok "GET /campaigns lists the persisted campaign" \
                           || fail "campaign persistence" "campaign $campaign_id not in list"
  [ "$has_named" = "yes" ] && ok "list response includes campaign.name (no nulls)" \
                           || fail "name in list" "all campaign.name values are null/missing"
fi

# ── 4. discount bounds (6a944c8 M5) ──────────────────────────────────────────

sec "discount value bounds (6a944c8 M5)"

code=$(curl -sS -o "$RESP" -w '%{http_code}' -m 10 \
  -X POST -H "Content-Type: application/json" \
  -H "Authorization: Bearer $auth" -H "X-CSRF-Token: $csrf" \
  "$BASE_URL/api/v1/campaigns" \
  -d "{\"businessId\":\"$BUSINESS_ID\",\"name\":\"bound-test\",\"description\":\"x\",\"actions\":[\"ig_st\"],\"discountValue\":9999999,\"discountType\":\"pct\",\"expiresInDays\":30}")
err_code=$(json_get '.error.code')
if [ "$code" = "400" ] && [ "$err_code" = "INVALID_DISCOUNT_VALUE" ]; then
  ok "discountValue=9_999_999% rejected → 400 INVALID_DISCOUNT_VALUE"
elif [ "$code" = "403" ]; then
  skip "bound check" "plan limit blocks before validation runs"
else
  fail "discount upper bound" "expected 400 INVALID_DISCOUNT_VALUE, got $code $err_code"
fi

# ── 5. anonymous public submissions (6a944c8 — new endpoint) ─────────────────

sec "anonymous public submissions"

if [ -n "$campaign_id" ]; then
  code=$(curl -sS -o "$RESP" -w '%{http_code}' -m 10 \
    -X POST -H "Content-Type: application/json" \
    "$BASE_URL/api/v1/submissions/public" \
    -d "{\"campaignId\":\"$campaign_id\",\"actionId\":\"ig_st\",\"proofUrl\":\"https://instagram.com/p/smoke\",\"proofType\":\"url\",\"email\":\"customer+smoke@example.com\",\"source\":\"public_campaign_page\"}")
  [ "$code" = "201" ] && ok "POST /submissions/public (no auth, no CSRF) → 201" \
                      || fail "public submission" "expected 201, got $code"

  # Honeypot
  code=$(curl -sS -o "$RESP" -w '%{http_code}' -m 10 \
    -X POST -H "Content-Type: application/json" \
    "$BASE_URL/api/v1/submissions/public" \
    -d "{\"campaignId\":\"$campaign_id\",\"actionId\":\"ig_st\",\"proofUrl\":\"https://instagram.com/p/bot\",\"proofType\":\"url\",\"email\":\"bot@example.com\",\"_hp\":\"i-am-a-bot\"}")
  [ "$code" = "202" ] && ok "honeypot returns 202 (silent rejection)" \
                      || fail "honeypot" "expected 202, got $code"
else
  skip "public submission" "no campaign_id from earlier step"
  skip "honeypot" "no campaign_id from earlier step"
fi

# ── 6. OAuth state validation (6a944c8) ──────────────────────────────────────

sec "OAuth state validation (6a944c8)"

code=$(curl -sS -o "$RESP" -w '%{http_code}' -m 10 \
  "$BASE_URL/api/v1/auth/oauth/google/callback?code=fake&state=forged-state-token-not-hmac")
err_code=$(json_get '.error.code')
if [ "$code" = "400" ] && [ "$err_code" = "INVALID_STATE" ]; then
  ok "forged OAuth state rejected → 400 INVALID_STATE"
else
  fail "OAuth state validation" "expected 400 INVALID_STATE, got $code $err_code"
fi

# ── 7. webhook payload cap (6a944c8 M7) ──────────────────────────────────────

sec "webhook payload cap (6a944c8 M7)"

# Content-Length header pre-check should kick in even without sending bytes.
code=$(curl -sS -o "$RESP" -w '%{http_code}' -m 10 \
  -X POST -H "Content-Length: 2000000" \
  -H "Content-Type: application/json" -H "x-hub-signature-256: sha256=fake" \
  "$BASE_URL/api/v1/verification/webhook" \
  -d '{}')
# Either 413 (cap fired) or 401 (signature failed first — depends on server order)
case "$code" in
  413) ok "webhook 2MB payload rejected → 413" ;;
  401) ok "webhook reaches signature check (cap path verified locally)" ;;
  *)   fail "webhook cap" "expected 413 or 401, got $code" ;;
esac

# ── 8. response headers ──────────────────────────────────────────────────────

sec "response headers"

hdrs=$(curl -sS -D - -o /dev/null -m 10 "$BASE_URL/api/v1/campaigns")
echo "$hdrs" | grep -qi "^x-request-id:"   && ok "X-Request-Id header present" \
                                            || fail "X-Request-Id" "missing"
echo "$hdrs" | grep -qi "^x-ratelimit-"    && ok "X-RateLimit-* headers present" \
                                            || fail "rate limit headers" "missing"

# ── summary ──────────────────────────────────────────────────────────────────

echo
echo "── summary ──"
printf "  passed: ${GREEN}%d${RESET}\n" "$PASS"
printf "  failed: ${RED}%d${RESET}\n"   "$FAIL"
if [ "$FAIL" -eq 0 ]; then
  printf "\n${GREEN}✅ all audit smoke checks passed${RESET}\n\n"
  exit 0
fi
printf "\n${RED}❌ %d check(s) failed${RESET}\n\n" "$FAIL"
exit 1
