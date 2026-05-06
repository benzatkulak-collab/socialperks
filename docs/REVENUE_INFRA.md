# Revenue infrastructure setup

To turn the lights on for revenue + customer email + verification,
add these environment variables in Vercel. Each section is independent
— set them in any order.

## 1. Stripe (subscriptions + webhooks)

The integration code is in place at `src/lib/stripe.ts`,
`src/app/api/v1/billing/route.ts`, `src/app/api/v1/billing/webhook/route.ts`,
`src/app/api/v1/payouts/webhook/route.ts`.

```bash
STRIPE_SECRET_KEY=sk_live_...          # Stripe Dashboard → Developers → API keys
STRIPE_WEBHOOK_SECRET=whsec_...        # Stripe Dashboard → Webhooks → endpoint secret
STRIPE_CONNECT_WEBHOOK_SECRET=whsec_... # Same, for the Connect endpoint
STRIPE_PRICE_STARTER_MONTHLY=price_...  # Stripe Dashboard → Products → Starter monthly price
STRIPE_PRICE_STARTER_ANNUAL=price_...
STRIPE_PRICE_PROFESSIONAL_MONTHLY=price_...
STRIPE_PRICE_PROFESSIONAL_ANNUAL=price_...
STRIPE_PRICE_ENTERPRISE_MONTHLY=price_...  # Optional
STRIPE_PRICE_ENTERPRISE_ANNUAL=price_...   # Optional
```

**Webhook endpoints to register in Stripe Dashboard:**
- `https://<your-host>/api/v1/billing/webhook` — events:
  `checkout.session.completed`, `customer.subscription.updated`,
  `customer.subscription.deleted`, `invoice.payment_failed`
- `https://<your-host>/api/v1/payouts/webhook` (Connect) — events:
  `account.updated`, `transfer.created`, `transfer.paid`, `transfer.failed`

After setting, hit `POST /api/v1/billing { action: "create_checkout", ... }`
once to confirm a real `https://checkout.stripe.com/...` URL is returned
(not a mock URL).

## 2. Resend (transactional email)

```bash
RESEND_API_KEY=re_...                  # Resend Dashboard → API Keys
EMAIL_FROM="Social Perks <noreply@yourdomain.com>"  # Optional; defaults exist
```

**DNS records to set on the from-domain (or its subdomain):**
- SPF: `v=spf1 include:_spf.resend.com ~all`
- DKIM: 3 CNAME records that Resend supplies after domain verification
- DMARC: `v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com`

Without proper DNS, deliverability tanks (Gmail/Outlook send to spam or
reject outright). Resend's domain-verification UI walks you through it.

The integration falls back to `ConsoleEmailProvider` (logs to stdout)
when `RESEND_API_KEY` is unset, so dev/CI keep working.

## 3. OAuth (per-platform verification)

Each platform requires a Developer App registration. Configured via
`OAUTH_<PLATFORM>_CLIENT_ID` and `OAUTH_<PLATFORM>_CLIENT_SECRET`. Per
the existing pattern in `src/lib/oauth/env.ts`, legacy long-form names
(`INSTAGRAM_CLIENT_ID`, etc.) are also accepted.

```bash
# Instagram (Meta for Developers)
OAUTH_IG_CLIENT_ID=...
OAUTH_IG_CLIENT_SECRET=...

# Facebook (same Meta app, separate creds usually)
OAUTH_FB_CLIENT_ID=...
OAUTH_FB_CLIENT_SECRET=...

# TikTok for Business
OAUTH_TT_CLIENT_ID=...
OAUTH_TT_CLIENT_SECRET=...

# X (Twitter) Developer Portal
OAUTH_XW_CLIENT_ID=...
OAUTH_XW_CLIENT_SECRET=...

# YouTube → Google Cloud Console (OAuth 2.0 Client)
OAUTH_YT_CLIENT_ID=...
OAUTH_YT_CLIENT_SECRET=...

# LinkedIn Developer Portal
OAUTH_LI_CLIENT_ID=...
OAUTH_LI_CLIENT_SECRET=...

# Pinterest, Threads, Snapchat, Twitch, Reddit follow the same pattern.
```

**Redirect URI to register at each provider:**
`https://<your-host>/api/v1/oauth/<platform>` where `<platform>` is the
two-letter platform ID from the catalog (`ig`, `fb`, `tt`, `xw`, etc.).

Without OAuth credentials, the verification engine falls back to
"demo mode" — connections succeed but no real platform validation runs.
The dashboard surfaces a "demo mode" notice so you know.

## 4. SMS (post-purchase + first-scan notifications)

If you want SMS via Twilio (used by `src/lib/sms/post-purchase.ts`):

```bash
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_FROM_NUMBER=+15555550100
```

Without these the SMS engine no-ops with a console log.

## What's NOT documented here (because it's already in `docs/FINISH_LINE.md`)

The 8 application secrets (AUTH_SECRET, CSRF_SECRET, CRON_SECRET,
READINESS_TOKEN, WAITLIST_ADMIN_TOKEN, WEBHOOK_SECRET,
WEBHOOK_VERIFY_TOKEN, NEXT_PUBLIC_SITE_URL) plus DATABASE_URL — those
are documented in `docs/FINISH_LINE.md` and are already set on the
production deployment.

## Verification

After setting any of these, run `npm run verify:deploy` against the
deployed URL. Specific endpoints to spot-check:

- Stripe: `POST /api/v1/billing { action: "create_checkout" }` should
  return a `https://checkout.stripe.com/c/...` URL (not a mock)
- Resend: trigger a password reset, watch Resend Dashboard logs for the
  send
- OAuth: hit `POST /api/v1/oauth/connect` with each platformId; the
  returned `mode` field should be `"live"` (not `"demo"`) once
  credentials are set
