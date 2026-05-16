#!/usr/bin/env bash
# Social Perks — Full Agent Flow in raw curl
#
# Same flow as full-flow.ts, written as a shell script so it's easy to
# read, debug, and port to any language with an HTTP client.
#
# Steps:
#   1. Print the consent URL (open it in a browser).
#   2. Paste the `code=...` from the redirect URL back into the prompt.
#   3. Script exchanges the code for an API key.
#   4. Calls tools/list to enumerate available MCP tools.
#   5. Creates a sample campaign.
#
# Requirements: bash, curl, jq.
#
# Usage:
#   bash curl-flow.sh

set -euo pipefail

BASE_URL="${SP_BASE_URL:-https://socialperks.app}"
AGENT_NAME="${SP_AGENT_NAME:-Example Agent (curl-flow.sh)}"
# For shell flow we don't run a callback server — the user copies the
# code from the redirected URL manually. Using example.com/callback
# means the redirect just shows a placeholder page in their browser.
REDIRECT_URI="${SP_REDIRECT_URI:-https://example.com/callback}"
SCOPES="read.campaigns,write.campaigns,read.submissions"
STATE="curl-demo-$(date +%s)"

# ─── Step 1: print consent URL ──────────────────────────────────────────────

# URL-encode the agent name (most other params are already URL-safe).
encoded_name=$(printf '%s' "$AGENT_NAME" | jq -Rr @uri)
encoded_redirect=$(printf '%s' "$REDIRECT_URI" | jq -Rr @uri)

consent_url="${BASE_URL}/agent/authorize?agent_name=${encoded_name}&scope=${SCOPES}&redirect_uri=${encoded_redirect}&state=${STATE}"

echo "Social Perks — Agent Flow (curl)"
echo "================================="
echo
echo "Step 1: open this URL in a browser and click Approve:"
echo
echo "  $consent_url"
echo
echo "After approval, you'll be redirected to something like:"
echo "  ${REDIRECT_URI}?code=AUTHCODEHERE&state=${STATE}"
echo
read -rp "Paste the code value here: " CODE
echo

# ─── Step 2: exchange code for API key ──────────────────────────────────────

echo "Step 2: exchanging code for API key..."
token_response=$(curl -sS -X POST "${BASE_URL}/api/v1/agent-auth/token" \
  -H "Content-Type: application/json" \
  -d "$(jq -n --arg code "$CODE" '{code: $code, grant_type: "authorization_code"}')")

API_KEY=$(printf '%s' "$token_response" | jq -r '.data.access_token // empty')
BUSINESS_ID=$(printf '%s' "$token_response" | jq -r '.data.business_id // empty')

if [[ -z "$API_KEY" ]]; then
  echo "Token exchange failed:"
  printf '%s\n' "$token_response" | jq .
  exit 1
fi

echo "  ✓ API key minted for businessId=${BUSINESS_ID}"
echo

# ─── Step 3: tools/list (shows cost models) ─────────────────────────────────

echo "Step 3: enumerate available tools (with cost models):"
curl -sS -X POST "${BASE_URL}/api/mcp" \
  -H "Content-Type: application/json" \
  -H "x-api-key: ${API_KEY}" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' \
  | jq '.result.tools[] | {name, cost: ._meta.cost}'
echo

# ─── Step 4: create a campaign ──────────────────────────────────────────────

echo "Step 4: createCampaign..."
create_response=$(curl -sS -X POST "${BASE_URL}/api/mcp" \
  -H "Content-Type: application/json" \
  -H "x-api-key: ${API_KEY}" \
  -d "$(jq -n \
    --arg bizId "$BUSINESS_ID" \
    '{
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: {
        name: "createCampaign",
        arguments: {
          businessId: $bizId,
          name: "Example Agent Demo (curl) — Instagram Story Tag",
          actions: ["ig_st"],
          discountValue: 15,
          discountType: "pct",
          expiresInDays: 30
        }
      }
    }')")

# The MCP content array contains a single JSON-stringified body. The
# _meta block sits alongside isError on the result.
printf '%s\n' "$create_response" | jq '{
  isError: .result.isError,
  body: (.result.content[0].text | fromjson),
  cost: .result._meta
}'

echo
echo "Done. Audit at: ${BASE_URL}/dashboard/agents"
