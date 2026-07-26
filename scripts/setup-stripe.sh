#!/usr/bin/env bash
#
# DEPRECATED — do not use. Kept only so old links and runbooks fail loudly
# instead of silently creating wrong prices.
#
# WHAT WAS WRONG WITH IT
#   This script created Starter at $29/mo and "Pro" at $79/mo. Those amounts
#   matched nothing: src/lib/billing/store.ts had $10/$25 at the time, the
#   sibling script setup-stripe-billing.sh had $29/$49, and the site now lists
#   $49/$99. Running it would have created live Stripe prices that disagree
#   with the advertised price on a real payment flow.
#
#   It also created a product literally named "Social Perks Pro" while the
#   canonical script creates "Social Perks Professional", so running both
#   produced two products for one tier.
#
# USE THIS INSTEAD
#   export STRIPE_SECRET_KEY=sk_test_...
#   bash scripts/setup-stripe-billing.sh
#
#   The canonical script keeps its amounts pinned to PLANS in
#   src/lib/billing/store.ts, aborts on any Stripe error instead of emitting an
#   empty price id, and refuses to push a non-price value to Vercel.
set -euo pipefail

cat >&2 <<'EOF'

  ✖  scripts/setup-stripe.sh is deprecated and will not run.

     It created Starter $29/mo and Pro $79/mo — amounts that match neither
     src/lib/billing/store.ts nor the published pricing page, and it created a
     duplicate "Social Perks Pro" product.

     Use the canonical script:

       export STRIPE_SECRET_KEY=sk_test_...      # rehearse in test mode first
       bash scripts/setup-stripe-billing.sh

EOF
exit 1
