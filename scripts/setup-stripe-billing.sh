#!/usr/bin/env bash
#
# setup-stripe-billing.sh — one-shot Stripe + Vercel billing setup
# ─────────────────────────────────────────────────────────────────────────────
# Fills the prod billing gap the code cannot fill itself: creates the Stripe
# products/prices that checkout requires and (optionally) wires their IDs into
# Vercel as the STRIPE_PRICE_* env vars the app reads (src/lib/billing/store.ts).
#
# THIS IS THE CANONICAL STRIPE SETUP SCRIPT. scripts/setup-stripe.sh is a
# deprecated shim that refuses to run and points here. Do not resurrect it.
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
#   (Stripe prices are immutable on amount; this is the supported way to
#   "reprice" one.) Each product is looked up exactly once per run and both of
#   its prices are created against that same product id — do not re-search
#   between the monthly and annual call, because Stripe's Search API is
#   eventually consistent and would not yet see a just-created product.
#
# ─── PRICES — SINGLE SOURCE OF TRUTH ─────────────────────────────────────────
#   These amounts MUST equal PLANS[*].monthlyPrice / annualPrice in
#   src/lib/billing/store.ts. If you change one, change the other in the SAME
#   commit. A mismatch means the site advertises one number and Stripe charges
#   another, on a live payment flow.
#
#     Starter        $49/mo    $490/yr      (store.ts: monthlyPrice 49,  annualPrice 490)
#     Professional   $99/mo    $990/yr      (store.ts: monthlyPrice 99,  annualPrice 990)
#     Enterprise     $249/mo   $2490/yr     (store.ts: monthlyPrice 249, annualPrice 2490)
#
#   History: these were $29/$49 in this script and $10/$25 in store.ts — i.e.
#   the script and the app disagreed with each other AND with the site. Fixed
#   in the same change that repriced store.ts. Verify before every live run:
#     grep -A2 'monthlyPrice' src/lib/billing/store.ts
#
# REPRICING AN ACCOUNT THAT ALREADY HAS SUBSCRIBERS
#   Stripe does NOT move existing subscriptions to the new price. Re-running
#   this changes what NEW checkouts pay; current subscribers stay on the old
#   amount until you migrate them deliberately. That is usually what you want.
#
# USAGE
#   export STRIPE_SECRET_KEY=sk_test_...    # test mode — always rehearse here first
#   bash scripts/setup-stripe-billing.sh                 # create prices, print env vars
#   bash scripts/setup-stripe-billing.sh --set-vercel    # also push to Vercel (needs `npx vercel login`)
#   bash scripts/setup-stripe-billing.sh --yes           # skip the live-mode confirmation
#
# AFTER RUNNING (to actually take money in prod):
#   1. Set on Vercel (Production): STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET,
#      and the six STRIPE_PRICE_* values this script prints. Redeploy — env
#      changes do not apply to already-built deployments.
#   2. Apply the DB schema via the app migrator. In production the route needs
#      BOTH an opt-in flag and a bearer secret (src/app/api/v1/migrate/route.ts):
#        - set ALLOW_MIGRATIONS=true AND MIGRATION_SECRET=<random> on Vercel
#          (Production), redeploy, then:
#            curl -X POST https://socialperks.app/api/v1/migrate \
#              -H "Authorization: Bearer $MIGRATION_SECRET"
#        - Without ALLOW_MIGRATIONS=true the route returns **404 Not Found**,
#          not 401. A 404 here means the flag is missing, not the URL.
#        - GET the same URL returns status without a secret.
#        - Turn ALLOW_MIGRATIONS back off when you are done.
#   3. Point Stripe's webhook (Dashboard → Developers → Webhooks) at
#      https://socialperks.app/api/v1/billing/webhook and copy its signing
#      secret into STRIPE_WEBHOOK_SECRET. Subscribe to: checkout.session.completed,
#      checkout.session.expired, customer.subscription.updated/deleted,
#      invoice.payment_failed.
#   4. Confirm: curl -s https://socialperks.app/api/v1/health/readiness
#      should report stripe_prices ok.
set -euo pipefail

if [[ -z "${STRIPE_SECRET_KEY:-}" ]]; then
  echo "ERROR: STRIPE_SECRET_KEY is not set. export it first (sk_live_… or sk_test_…)." >&2
  exit 1
fi

SET_VERCEL=false
ASSUME_YES=false
for arg in "$@"; do
  case "$arg" in
    --set-vercel) SET_VERCEL=true ;;
    --yes|-y)     ASSUME_YES=true ;;
    *) echo "ERROR: unknown argument '$arg' (expected --set-vercel and/or --yes)." >&2; exit 1 ;;
  esac
done

API="https://api.stripe.com/v1"

# ─── Amounts, in cents. Must match src/lib/billing/store.ts (see header). ─────
STARTER_MONTHLY_CENTS=4900
STARTER_ANNUAL_CENTS=49000
PRO_MONTHLY_CENTS=9900
PRO_ANNUAL_CENTS=99000
ENT_MONTHLY_CENTS=24900
ENT_ANNUAL_CENTS=249000

# ─── Live-mode gate ──────────────────────────────────────────────────────────
# Creating live prices moves real money the next time someone checks out. Show
# the amounts and make the operator confirm them, unless --yes was passed.
if [[ "$STRIPE_SECRET_KEY" == sk_live_* ]] && ! $ASSUME_YES; then
  cat >&2 <<EOF

  ⚠  LIVE MODE. About to create real Stripe prices:

       Starter        \$$((STARTER_MONTHLY_CENTS / 100))/mo    \$$((STARTER_ANNUAL_CENTS / 100))/yr
       Professional   \$$((PRO_MONTHLY_CENTS / 100))/mo    \$$((PRO_ANNUAL_CENTS / 100))/yr
       Enterprise     \$$((ENT_MONTHLY_CENTS / 100))/mo   \$$((ENT_ANNUAL_CENTS / 100))/yr

  These must match PLANS in src/lib/billing/store.ts, or the site will
  advertise one number and charge another.

EOF
  if [[ ! -t 0 ]]; then
    echo "ERROR: live mode, non-interactive. Re-run with --yes if the amounts above are correct." >&2
    exit 1
  fi
  read -r -p "  Type 'yes' to continue: " confirm
  if [[ "$confirm" != "yes" ]]; then
    echo "Aborted. Nothing was created." >&2
    exit 1
  fi
fi

# ─── Error propagation: why this file never relies on `set -e` alone ─────────
# Measured on bash 5.2.21: a shell function invoked inside a command
# substitution runs with errexit SUPPRESSED inside its body. Concretely,
#     f() { local o; o=$(false_cmd); echo "still here"; }
#     X=$(f)
# prints "still here" and the script exits 0 with X empty. This is true whether
# or not the inner assignment is a pipeline — the pipeline is a red herring.
#
# On a script whose whole job is to mint live payment credentials, that failure
# mode is silent-empty-env-var, which is the worst possible one. So:
#   * helpers `return 1`; they never depend on errexit to stop their caller
#   * every call site carries an explicit `|| exit 1`
#   * the HTTP body is captured FIRST and parsed second, so a transport/HTTP
#     failure is distinguishable from "the call succeeded but matched nothing"
# Do not "simplify" these back into one-liner pipelines inside $( ).

# stripe_api <path> [curl args…] → echoes response body; returns 1 on any non-2xx
stripe_api() {
  local path="$1"; shift
  local raw code body
  if ! raw=$(curl -sS -w $'\n%{http_code}' "$API/$path" -u "$STRIPE_SECRET_KEY:" "$@"); then
    echo "ERROR: could not reach Stripe at $API/$path (curl failed)." >&2
    return 1
  fi
  code=$(printf '%s' "$raw" | tail -n1)
  body=$(printf '%s' "$raw" | sed '$d')
  if [[ "$code" != 2* ]]; then
    echo "ERROR: Stripe $path returned HTTP $code:" >&2
    printf '%s\n' "$body" >&2
    return 1
  fi
  printf '%s' "$body"
}

# first_id <prefix> — reads a JSON body on stdin, echoes the first "<prefix>_…" id
first_id() { sed -n "s/.*\"id\": *\"\($1_[^\"]*\)\".*/\1/p" | head -1; }

# ensure_product <product_name> → echoes prod_…
# Looked up once per product; both prices reuse the returned id. A FAILED search
# aborts — it must not fall through to create, or a transient Stripe 5xx would
# mint a duplicate product for a tier that already has one.
ensure_product() {
  local name="$1" body product_id
  body=$(stripe_api "products/search" -G \
    --data-urlencode "query=name:'${name}' AND active:'true'") || return 1
  product_id=$(printf '%s' "$body" | first_id prod)

  if [[ -z "$product_id" ]]; then
    body=$(stripe_api "products" -d "name=${name}") || return 1
    product_id=$(printf '%s' "$body" | first_id prod)
  fi

  if [[ -z "$product_id" ]]; then
    echo "ERROR: Stripe accepted the request for product '${name}' but returned no product id." >&2
    return 1
  fi
  printf '%s' "$product_id"
}

# create_price <product_id> <lookup_key> <unit_amount_cents> <interval:month|year>
create_price() {
  local product_id="$1" lookup="$2" amount="$3" interval="$4" body price_id
  body=$(stripe_api "prices" \
    -d "product=${product_id}" \
    -d "unit_amount=${amount}" \
    -d "currency=usd" \
    -d "recurring[interval]=${interval}" \
    -d "lookup_key=${lookup}" \
    -d "transfer_lookup_key=true") || return 1
  price_id=$(printf '%s' "$body" | first_id price)

  if [[ -z "$price_id" ]]; then
    echo "ERROR: Stripe accepted the request for '${lookup}' but returned no price id." >&2
    return 1
  fi
  printf '%s' "$price_id"
}

echo "Creating Stripe prices (mode: ${STRIPE_SECRET_KEY:0:8}…)…" >&2

STARTER_PROD=$(ensure_product "Social Perks Starter")      || exit 1
PRO_PROD=$(ensure_product     "Social Perks Professional") || exit 1
ENT_PROD=$(ensure_product     "Social Perks Enterprise")   || exit 1

STARTER_M=$(create_price "$STARTER_PROD" "sp_starter_monthly"      "$STARTER_MONTHLY_CENTS" month) || exit 1
STARTER_A=$(create_price "$STARTER_PROD" "sp_starter_annual"       "$STARTER_ANNUAL_CENTS"  year)  || exit 1
PRO_M=$(create_price     "$PRO_PROD"     "sp_professional_monthly" "$PRO_MONTHLY_CENTS"     month) || exit 1
PRO_A=$(create_price     "$PRO_PROD"     "sp_professional_annual"  "$PRO_ANNUAL_CENTS"      year)  || exit 1
ENT_M=$(create_price     "$ENT_PROD"     "sp_enterprise_monthly"   "$ENT_MONTHLY_CENTS"     month) || exit 1
ENT_A=$(create_price     "$ENT_PROD"     "sp_enterprise_annual"    "$ENT_ANNUAL_CENTS"      year)  || exit 1

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
  push() {
    if [[ -z "$2" || "$2" != price_* ]]; then
      echo "ERROR: refusing to set $1 to '$2' — not a Stripe price id." >&2
      exit 1
    fi
    if printf '%s' "$2" | npx --yes vercel env add "$1" production --force >/dev/null 2>&1; then
      echo "  set $1" >&2
    else
      echo "ERROR: failed to set $1 on Vercel. Set it by hand from the block above." >&2
      exit 1
    fi
  }
  push STRIPE_PRICE_STARTER_MONTHLY      "$STARTER_M"
  push STRIPE_PRICE_STARTER_ANNUAL       "$STARTER_A"
  push STRIPE_PRICE_PROFESSIONAL_MONTHLY "$PRO_M"
  push STRIPE_PRICE_PROFESSIONAL_ANNUAL  "$PRO_A"
  push STRIPE_PRICE_ENTERPRISE_MONTHLY   "$ENT_M"
  push STRIPE_PRICE_ENTERPRISE_ANNUAL    "$ENT_A"
  echo "Done. Redeploy for the new env vars to take effect." >&2
fi
