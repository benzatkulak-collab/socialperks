#!/usr/bin/env bash
#
# setup-stripe-billing.sh — one-shot Stripe + Vercel billing setup
# ─────────────────────────────────────────────────────────────────────────────
# Fills the prod billing gap the code cannot fill itself: creates the Stripe
# products/prices that checkout requires and (optionally) wires their IDs into
# Vercel as the STRIPE_PRICE_* env vars the app reads (src/lib/billing/store.ts).
#
# WHY THIS EXISTS
#   The app maps each plan/period to a Stripe Price ID via env vars. With those
#   unset, the checkout route returns 503 BILLING_NOT_CONFIGURED (by design —
#   better than handing Stripe a bogus id and 502-ing the customer). This script
#   creates the prices and sets the env vars so real checkout works.
#
# IDEMPOTENT
#   Each price is created with a stable lookup_key and transfer_lookup_key=true,
#   so re-running moves the key to the latest price instead of duplicating.
#   (Stripe prices are immutable; this is the supported way to "update" one.)
#
# PRICES (must match src/lib/billing/store.ts)
#   Starter        $29/mo   $290/yr
#   Professional   $49/mo   $490/yr
#   Enterprise     $249/mo  $2490/yr   (sales-led; checkout only needs Starter+Pro)
#
# USAGE
#   export STRIPE_SECRET_KEY=sk_live_...        # or sk_test_... to dry-run in test mode
#   bash scripts/setup-stripe-billing.sh                 # create prices, print env vars
#   bash scripts/setup-stripe-billing.sh --set-vercel    # also push to Vercel (needs `npx vercel login`)
#
# AFTER RUNNING (to actually take money in prod):
#   1. Set on Vercel (Production): STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET,
#      and the six STRIPE_PRICE_* values this script prints.
#   2. Apply the base DB schema via the app migrator (the v5 billing tables are
#      already present; the migrator is needed for launched_campaigns et al.):
#        - set ALLOW_MIGRATIONS=true and MIGRATION_TOKEN=<random> on Vercel
#        - redeploy, then:  curl -X POST https://socialperks.app/api/v1/migrate \
#                              -H "Authorization: Bearer $MIGRATION_TOKEN"
#   3. Point Stripe's webhook (Dashboard → Developers → Webhooks) at
#      https://socialperks.app/api/v1/billing/webhook and copy its signing
#      secret into STRIPE_WEBHOOK_SECRET. Subscribe to: checkout.session.completed,
#      checkout.session.expired, customer.subscription.updated/deleted,
#      invoice.payment_failed.
set -euo pipefail

if [[ -z "${STRIPE_SECRET_KEY:-}" ]]; then
  echo "ERROR: STRIPE_SECRET_KEY is not set. export it first (sk_live_… or sk_test_…)." >&2
  exit 1
fi

SET_VERCEL=false
[[ "${1:-}" == "--set-vercel" ]] && SET_VERCEL=true

API="https://api.stripe.com/v1"

# create_price <product_name> <lookup_key> <unit_amount_cents> <interval:month|year>
# Echoes the resulting price id (price_…). Reuses the product by name; moves the
# lookup_key onto the new price on re-run.
create_price() {
  local name="$1" lookup="$2" amount="$3" interval="$4" product_id

  product_id=$(curl -s -G "$API/products/search" -u "$STRIPE_SECRET_KEY:" \
    --data-urlencode "query=name:'${name}' AND active:'true'" \
    | sed -n 's/.*"id": *"\(prod_[^"]*\)".*/\1/p' | head -1)

  if [[ -z "$product_id" ]]; then
    product_id=$(curl -s "$API/products" -u "$STRIPE_SECRET_KEY:" \
      -d "name=${name}" | sed -n 's/.*"id": *"\(prod_[^"]*\)".*/\1/p' | head -1)
  fi

  curl -s "$API/prices" -u "$STRIPE_SECRET_KEY:" \
    -d "product=${product_id}" \
    -d "unit_amount=${amount}" \
    -d "currency=usd" \
    -d "recurring[interval]=${interval}" \
    -d "lookup_key=${lookup}" \
    -d "transfer_lookup_key=true" \
    | sed -n 's/.*"id": *"\(price_[^"]*\)".*/\1/p' | head -1
}

echo "Creating Stripe prices (mode: ${STRIPE_SECRET_KEY:0:7}…)…" >&2

STARTER_M=$(create_price "Social Perks Starter"      "sp_starter_monthly"      2900   month)
STARTER_A=$(create_price "Social Perks Starter"      "sp_starter_annual"       29000  year)
PRO_M=$(create_price     "Social Perks Professional" "sp_professional_monthly" 4900   month)
PRO_A=$(create_price     "Social Perks Professional" "sp_professional_annual"  49000  year)
ENT_M=$(create_price     "Social Perks Enterprise"   "sp_enterprise_monthly"   24900  month)
ENT_A=$(create_price     "Social Perks Enterprise"   "sp_enterprise_annual"    249000 year)

cat <<EOF

# ─── Stripe price IDs created — set these in Vercel (Production) ───────────────
STRIPE_PRICE_STARTER_MONTHLY=$STARTER_M
STRIPE_PRICE_STARTER_ANNUAL=$STARTER_A
STRIPE_PRICE_PROFESSIONAL_MONTHLY=$PRO_M
STRIPE_PRICE_PROFESSIONAL_ANNUAL=$PRO_A
STRIPE_PRICE_ENTERPRISE_MONTHLY=$ENT_M
STRIPE_PRICE_ENTERPRISE_ANNUAL=$ENT_A
EOF

if $SET_VERCEL; then
  echo "" >&2
  echo "Pushing to Vercel (production)…" >&2
  push() { printf '%s' "$2" | npx --yes vercel env add "$1" production --force >/dev/null 2>&1 && echo "  set $1" >&2; }
  push STRIPE_PRICE_STARTER_MONTHLY      "$STARTER_M"
  push STRIPE_PRICE_STARTER_ANNUAL       "$STARTER_A"
  push STRIPE_PRICE_PROFESSIONAL_MONTHLY "$PRO_M"
  push STRIPE_PRICE_PROFESSIONAL_ANNUAL  "$PRO_A"
  push STRIPE_PRICE_ENTERPRISE_MONTHLY   "$ENT_M"
  push STRIPE_PRICE_ENTERPRISE_ANNUAL    "$ENT_A"
  echo "Done. Redeploy for the new env vars to take effect." >&2
fi
