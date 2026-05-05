#!/usr/bin/env bash
# Idempotent Vercel env-var setup for Social Perks.
#
# Usage:
#   ./scripts/setup-vercel-env.sh production       # set on production env
#   ./scripts/setup-vercel-env.sh preview          # set on preview env
#   ./scripts/setup-vercel-env.sh development      # set on dev env (overrides .env.local-style)
#
# Auto-skips vars already set on Vercel for the chosen env.
# Requires: vercel CLI, project linked (`vercel link`).

set -euo pipefail

ENV_TARGET="${1:-production}"

if ! command -v vercel >/dev/null 2>&1; then
  echo "❌ vercel CLI not found. Install: npm i -g vercel" >&2
  exit 1
fi

if [ ! -f ".vercel/project.json" ]; then
  echo "❌ Project not linked. Run: vercel link" >&2
  exit 1
fi

# Pull existing env to compute diff.
echo "🔍 Fetching existing env vars from Vercel ($ENV_TARGET)..."
existing="$(vercel env ls "$ENV_TARGET" 2>/dev/null | awk 'NR>3 {print $1}' | grep -v '^$' || true)"

set_env() {
  local name="$1"
  local value="$2"
  if echo "$existing" | grep -q "^${name}$"; then
    echo "✓  $name (already set, skipping)"
    return
  fi
  echo "+  $name"
  echo "$value" | vercel env add "$name" "$ENV_TARGET" >/dev/null
}

# Generated production secrets (rotate if leaked):
set_env AUTH_SECRET             "ea74fa61b75a13375097030b5ed1b99e5c5036230f788e4ee27dbcd76083e9e3"
set_env CSRF_SECRET             "f7315d5b1f3bca1dda16fb7fea1d48f0d3181253cb5b990a52c4e687600047e4"
set_env CRON_SECRET             "4be3d01821e526f1472f2b5e8343537169cdba6ff3c76189"
set_env READINESS_TOKEN         "ef04375f68424bdb544e8eb6cd094bc369ebe75341c1b204"
set_env WAITLIST_ADMIN_TOKEN    "90602476c7df0ce06992f5bf0325a8a3652fa02db80d7a8e"
set_env WEBHOOK_SECRET          "a759321c4ddd3074334a091783af07c16ad8474238dbb941f20d57325ad366d0"
set_env WEBHOOK_VERIFY_TOKEN    "d888a83acdc1a63b090df93bd978332e"

# Public site URL — set to your custom domain once you have one.
set_env NEXT_PUBLIC_SITE_URL    "https://social-perks-benzatkulak-4901s-projects.vercel.app"

echo ""
echo "✅ Done. Vars I CAN'T pre-fill (need real provider accounts):"
echo "   DATABASE_URL                — provision Postgres + paste connection string"
echo "   STRIPE_SECRET_KEY           — sk_test_… or sk_live_…"
echo "   STRIPE_WEBHOOK_SECRET       — whsec_… from dashboard.stripe.com/webhooks"
echo "   STRIPE_PRICE_STARTER_*      — price_… IDs from your Stripe products"
echo "   STRIPE_PRICE_PROFESSIONAL_* — same"
echo "   STRIPE_PRICE_ENTERPRISE_*   — same"
echo "   RESEND_API_KEY              — re_… from resend.com/api-keys"
echo "   EMAIL_FROM                  — Social Perks <noreply@yourdomain.com>"
echo "   WAITLIST_NOTIFY_EMAIL       — your inbox"
echo "   OAUTH_IG_CLIENT_ID/SECRET   — from developers.facebook.com (Instagram product)"
echo "   OAUTH_TT_CLIENT_ID/SECRET   — from developers.tiktok.com"
echo ""
echo "After setting them, redeploy:"
echo "   vercel --prod --force"
echo ""
echo "Then verify:"
echo "   curl -H 'Authorization: Bearer ef04375f68424bdb544e8eb6cd094bc369ebe75341c1b204' \\"
echo "        \"\$YOUR_HOST/api/v1/health/readiness\" | jq ."
