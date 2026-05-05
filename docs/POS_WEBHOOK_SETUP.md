# POS Webhook Setup

Three POS providers funnel `payment` / `order_paid` events into the
post-purchase SMS pipeline (`src/lib/sms/post-purchase.ts`). Each
provider has its own onboarding path; **Square is the fastest** to
ship for the first 10 coffee shops.

## Square (recommended for v1)

**Register webhook URL:** Square Developer Dashboard → your app →
Webhooks → Add Endpoint.

- URL: `https://YOUR_DOMAIN/api/v1/pos/square/webhook`
- Events: `payment.created` (we only need this one for SMS).
- API version: latest stable.

**Env vars:**
```
SQUARE_WEBHOOK_SIGNATURE_KEY=<from the endpoint settings page>
SQUARE_WEBHOOK_NOTIFICATION_URL=https://YOUR_DOMAIN/api/v1/pos/square/webhook
SQUARE_MERCHANT_TO_BUSINESS_MAP={"ML123ABC":"biz_yoga","ML999XYZ":"biz_sol"}
```

**Note:** `buyer_phone` is only present on Square Online / Invoices.
In-person card-present payments don't include phone — those will be
dropped with a log warning. We may add a "tap-to-text" QR flow later
for in-person.

**Test locally:**
```bash
curl -X POST http://localhost:3000/api/v1/pos/square/webhook \
  -H "content-type: application/json" \
  -H "x-square-hmacsha256-signature: dev" \
  -d '{
    "merchant_id":"ML123ABC",
    "type":"payment.created",
    "data":{"object":{"payment":{"id":"pay_1","amount_money":{"amount":450},"buyer_phone":"+15551234567"}}}
  }'
```
With `SQUARE_WEBHOOK_SIGNATURE_KEY` unset, signature check is bypassed
in dev mode (logs a warning).

## Toast

**Register webhook URL:** Toast partner portal → Webhooks (requires
approved partner status — onboarding takes ~5–10 business days).

- URL: `https://YOUR_DOMAIN/api/v1/pos/toast/webhook`
- Events: `ORDER_PAID`.

**Env vars:**
```
TOAST_WEBHOOK_SIGNING_SECRET=<from Toast partner config>
TOAST_RESTAURANT_TO_BUSINESS_MAP={"guid-abc":"biz_iron","guid-xyz":"biz_baked"}
```

**Test locally:**
```bash
curl -X POST http://localhost:3000/api/v1/pos/toast/webhook \
  -H "content-type: application/json" \
  -H "toast-signing-secret: dev" \
  -d '{
    "eventType":"ORDER_PAID",
    "restaurantGuid":"guid-abc",
    "customer":{"phone":"+15551234567"},
    "totals":{"total":12.5}
  }'
```

## Clover

**Register webhook URL:** Clover developer dashboard → your app →
Webhooks (also requires app approval; onboarding ~5–10 business days).

- URL: `https://YOUR_DOMAIN/api/v1/pos/clover/webhook`
- Events: payments.

**Env vars:**
```
CLOVER_WEBHOOK_AUTH_TOKEN=<from Clover app config>
```

**Important:** Clover webhooks do NOT carry customer phone. The route
currently increments a per-merchant counter and logs a TODO. To
deliver SMS we need a follow-up Clover Customer API call (planned).

**Test locally:**
```bash
curl -X POST http://localhost:3000/api/v1/pos/clover/webhook \
  -H "content-type: application/json" \
  -H "x-clover-auth: dev" \
  -d '{
    "merchants":{"merch-abc":{"payments":{"pay-1":{"operation":"CREATE","ts":1714521600000}}}}
  }'
```

## Verifying SMS end-to-end

Once Twilio is configured (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`,
`TWILIO_FROM_NUMBER`), use the admin test route to fire an immediate
SMS without going through a POS:

```bash
curl -X POST http://localhost:3000/api/v1/sms/test \
  -H "authorization: Bearer $WAITLIST_ADMIN_TOKEN" \
  -H "content-type: application/json" \
  -d '{
    "to":"+15551234567",
    "businessName":"Test Cafe",
    "perkText":"next latte",
    "campaignId":"camp_demo"
  }'
```

Inbound STOP handling (Twilio webhook):

- Configure your Twilio number's "A Message Comes In" webhook to
  `POST https://YOUR_DOMAIN/api/v1/sms/inbound`.
- Replying STOP to any sent SMS adds the number to the in-memory
  opt-out set; subsequent enqueues are short-circuited.

## Onboarding cadence

- **Day 1**: ship Square + Twilio for the first coffee shop.
- **Week 2+**: pursue Toast/Clover partner approval in parallel.
