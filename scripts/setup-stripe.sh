#!/usr/bin/env bash
# Idempotent Stripe products + prices setup for Social Perks.
#
# Run once after `stripe login`. Outputs the price IDs you need to set
# on Vercel.
#
# Plans match src/lib/billing/store.ts PLANS:
#   starter      — $29/mo, $290/yr  — 5 active campaigns
#   professional — $79/mo, $790/yr  — 25 active campaigns + analytics + API
#   enterprise   — $249/mo, $2490/yr — unlimited + multi-loc + dedicated CSM

set -euo pipefail

if ! command -v stripe >/dev/null 2>&1; then
  echo "❌ stripe CLI not found. Install: brew install stripe/stripe-cli/stripe"
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "❌ jq not found. Install: brew install jq"
  exit 1
fi

echo "Using Stripe account: $(stripe config --list 2>/dev/null | grep account_id || echo 'run stripe login')"
echo ""

create_product() {
  local name="$1"
  local description="$2"
  # Try to find an existing product with the same name first.
  local existing
  existing="$(stripe products list --limit 100 --format json 2>/dev/null | jq -r --arg n "$name" '.data[] | select(.name == $n) | .id' | head -1 || true)"
  if [ -n "$existing" ]; then
    echo "$existing"
    return
  fi
  stripe products create \
    -d "name=$name" \
    -d "description=$description" \
    --format json | jq -r .id
}

create_price() {
  local product="$1"
  local amount_cents="$2"
  local interval="$3"  # month or year
  local nickname="$4"
  # Reuse if same product + amount + interval + active.
  local existing
  existing="$(stripe prices list --product "$product" --limit 100 --format json 2>/dev/null \
    | jq -r --argjson a "$amount_cents" --arg i "$interval" \
        '.data[] | select(.unit_amount == $a and .recurring.interval == $i and .active == true) | .id' | head -1 || true)"
  if [ -n "$existing" ]; then
    echo "$existing"
    return
  fi
  stripe prices create \
    -d "product=$product" \
    -d "unit_amount=$amount_cents" \
    -d "currency=usd" \
    -d "recurring[interval]=$interval" \
    -d "nickname=$nickname" \
    --format json | jq -r .id
}

echo "▸ Starter"
STARTER=$(create_product "Social Perks Starter" "5 active campaigns")
STARTER_M=$(create_price "$STARTER" 2900 month "Starter Monthly")
STARTER_A=$(create_price "$STARTER" 29000 year "Starter Annual")
echo "  product:  $STARTER"
echo "  monthly:  $STARTER_M"
echo "  annual:   $STARTER_A"
echo ""

echo "▸ Professional (Pro tier — primary CTA target)"
PRO=$(create_product "Social Perks Pro" "25 active campaigns + analytics + API")
PRO_M=$(create_price "$PRO" 7900 month "Pro Monthly")
PRO_A=$(create_price "$PRO" 79000 year "Pro Annual")
echo "  product:  $PRO"
echo "  monthly:  $PRO_M"
echo "  annual:   $PRO_A"
echo ""

echo "▸ Enterprise"
ENT=$(create_product "Social Perks Enterprise" "Unlimited + multi-location + dedicated CSM")
ENT_M=$(create_price "$ENT" 24900 month "Enterprise Monthly")
ENT_A=$(create_price "$ENT" 249000 year "Enterprise Annual")
echo "  product:  $ENT"
echo "  monthly:  $ENT_M"
echo "  annual:   $ENT_A"
echo ""

echo "═══════════════════════════════════════════════════════"
echo " Set these on Vercel (production env):"
echo "═══════════════════════════════════════════════════════"
cat <<EOF
vercel env add STRIPE_PRICE_STARTER_MONTHLY production <<< "$STARTER_M"
vercel env add STRIPE_PRICE_STARTER_ANNUAL production <<< "$STARTER_A"
vercel env add STRIPE_PRICE_PROFESSIONAL_MONTHLY production <<< "$PRO_M"
vercel env add STRIPE_PRICE_PROFESSIONAL_ANNUAL production <<< "$PRO_A"
vercel env add STRIPE_PRICE_ENTERPRISE_MONTHLY production <<< "$ENT_M"
vercel env add STRIPE_PRICE_ENTERPRISE_ANNUAL production <<< "$ENT_A"
EOF
echo ""
echo "Then create the webhook endpoint:"
echo "  https://dashboard.stripe.com/webhooks → Add endpoint"
echo "  URL: \$YOUR_HOST/api/v1/billing/webhook"
echo "  Events: checkout.session.completed, customer.subscription.updated,"
echo "          customer.subscription.deleted, invoice.payment_failed"
echo "  Then: vercel env add STRIPE_WEBHOOK_SECRET production <<< 'whsec_…'"
