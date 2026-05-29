# Finish Line — Copy/Paste Setup

Everything you need to take Social Perks from **deployed** to **taking
real money** lives in this doc. Each section is one task. Skip whatever
you don't want yet — but the **CRITICAL** sections must all be done
before you drive any traffic.

## ⚠️ KEEP THESE SECRETS PRIVATE

The values below are real and were generated for your production
environment. Treat them like passwords. If you ever see them committed
to git or shared in chat outside this doc, rotate them.

---

## Section 0 — TL;DR (3 min if you have CLI tools)

```bash
# from the project root
vercel link                                    # one-time
./scripts/setup-vercel-env.sh                  # all env vars at once (script is below in Section 1.5)
vercel --prod                                  # redeploy
curl https://your-prod-host/api/v1/health      # smoke test
```

If you don't have the Vercel CLI, jump to **Section 1.A** for dashboard paste-in.

---

## Section 1 — VERCEL ENV VARS (CRITICAL)

These are the secrets for production. Without them, auth routes 500.

### 1.A — Dashboard paste-in

Go to: `https://vercel.com/benzatkulak-4901s-projects/social-perks/settings/environment-variables`

Paste each row below. **Environment:** Production (also tick Preview if you want preview deploys to work).

| Name | Value |
|---|---|
| `AUTH_SECRET` | `REDACTED_ROTATED` |
| `CSRF_SECRET` | `REDACTED_ROTATED` |
| `CRON_SECRET` | `REDACTED_ROTATED` |
| `READINESS_TOKEN` | `REDACTED_ROTATED` |
| `WAITLIST_ADMIN_TOKEN` | `REDACTED_ROTATED` |
| `WEBHOOK_SECRET` | `REDACTED_ROTATED` |
| `WEBHOOK_VERIFY_TOKEN` | `REDACTED_ROTATED` |
| `NEXT_PUBLIC_SITE_URL` | `https://social-perks-benzatkulak-4901s-projects.vercel.app` |

After saving each one, hit "Save". Vercel won't deploy automatically — see Section 7 to trigger redeploy.

### 1.B — CLI bulk-set

```bash
vercel env add AUTH_SECRET production <<< "REDACTED_ROTATED"
vercel env add CSRF_SECRET production <<< "REDACTED_ROTATED"
vercel env add CRON_SECRET production <<< "REDACTED_ROTATED"
vercel env add READINESS_TOKEN production <<< "REDACTED_ROTATED"
vercel env add WAITLIST_ADMIN_TOKEN production <<< "REDACTED_ROTATED"
vercel env add WEBHOOK_SECRET production <<< "REDACTED_ROTATED"
vercel env add WEBHOOK_VERIFY_TOKEN production <<< "REDACTED_ROTATED"
vercel env add NEXT_PUBLIC_SITE_URL production <<< "https://social-perks-benzatkulak-4901s-projects.vercel.app"
```

(Replace `NEXT_PUBLIC_SITE_URL` with your custom domain once you point one at Vercel.)

### 1.5 — Setup script (idempotent)

If you'd rather run a single script (auto-skips already-set vars):

```bash
# scripts/setup-vercel-env.sh — included in this commit
./scripts/setup-vercel-env.sh production
```

---

## Section 2 — VERCEL SSO DEPLOYMENT PROTECTION (CRITICAL)

The site is currently 401 to anonymous prospects. Turn this off before driving traffic.

1. Go to: `https://vercel.com/benzatkulak-4901s-projects/social-perks/settings/deployment-protection`
2. Set **Vercel Authentication** to **Disabled** (or leave on for previews only — your call)
3. Click Save

Smoke test: `curl https://your-prod-host/` → should return 200, not 401.

---

## Section 3 — DATABASE (CRITICAL for persistence)

The app falls back to in-memory when `DATABASE_URL` is unset, but every redeploy wipes data — including paying customers. Fix:

### 3.A — Provision Postgres

Pick one (in order of "I'll do this in 3 min"):

| Provider | URL | Free tier |
|---|---|---|
| **Neon** | https://neon.tech | 3GB, 1 project |
| **Supabase** | https://supabase.com | 500MB, 2 projects |
| **Vercel Postgres** | https://vercel.com/dashboard/stores | Bundled |

After provisioning, copy the **connection string** (looks like `postgresql://user:pass@host:5432/dbname?sslmode=require`).

### 3.B — Set env var

Dashboard or CLI:

```bash
vercel env add DATABASE_URL production
# paste the connection string when prompted
```

### 3.C — Run migrations

After the next deploy completes (or locally with the same DATABASE_URL):

```bash
DATABASE_URL="postgresql://..." npm run db:migrate
```

This creates: `users`, `businesses`, `influencers`, `campaigns`, `launched_campaigns`, `campaign_submissions`, `perk_wallets`, `earned_perks`, `api_keys`, `webhooks`, `analytics_events`, `notifications`, `agent_sessions`, `agent_queries`, `platform_connections`, `waitlist`, `referral_codes`, `referral_attributions`, `business_subscriptions`, `influencer_earnings` — 20 tables total.

Verify:

```bash
DATABASE_URL="..." npm run db:migrate:status
```

---

## Section 4 — STRIPE (CRITICAL for revenue)

### 4.A — Get keys

1. https://dashboard.stripe.com/apikeys
2. Copy **Secret key** — `sk_test_...` for testing, `sk_live_...` for go-live
3. Set on Vercel:

```bash
vercel env add STRIPE_SECRET_KEY production
# paste sk_test_... or sk_live_...
```

### 4.B — Create products + prices

Run this once against your Stripe account using the Stripe CLI (`brew install stripe/stripe-cli/stripe; stripe login`):

```bash
# Starter plan ($29/mo, $290/yr)
STARTER=$(stripe products create -d name="Social Perks Starter" -d description="5 active campaigns" --format json | jq -r .id)
stripe prices create -d product="$STARTER" -d unit_amount=2900 -d currency=usd -d "recurring[interval]=month" -d nickname="Starter Monthly" --format json
stripe prices create -d product="$STARTER" -d unit_amount=29000 -d currency=usd -d "recurring[interval]=year" -d nickname="Starter Annual" --format json

# Professional plan ($79/mo, $790/yr) — PRIMARY tier
PRO=$(stripe products create -d name="Social Perks Pro" -d description="25 active campaigns + analytics" --format json | jq -r .id)
stripe prices create -d product="$PRO" -d unit_amount=7900 -d currency=usd -d "recurring[interval]=month" -d nickname="Pro Monthly" --format json
stripe prices create -d product="$PRO" -d unit_amount=79000 -d currency=usd -d "recurring[interval]=year" -d nickname="Pro Annual" --format json

# Enterprise plan ($249/mo, $2490/yr)
ENT=$(stripe products create -d name="Social Perks Enterprise" -d description="Unlimited + multi-location + dedicated CSM" --format json | jq -r .id)
stripe prices create -d product="$ENT" -d unit_amount=24900 -d currency=usd -d "recurring[interval]=month" -d nickname="Enterprise Monthly" --format json
stripe prices create -d product="$ENT" -d unit_amount=249000 -d currency=usd -d "recurring[interval]=year" -d nickname="Enterprise Annual" --format json
```

Copy each `price_xxx` ID and set on Vercel:

```bash
vercel env add STRIPE_PRICE_STARTER_MONTHLY production
vercel env add STRIPE_PRICE_STARTER_ANNUAL production
vercel env add STRIPE_PRICE_PROFESSIONAL_MONTHLY production
vercel env add STRIPE_PRICE_PROFESSIONAL_ANNUAL production
vercel env add STRIPE_PRICE_ENTERPRISE_MONTHLY production
vercel env add STRIPE_PRICE_ENTERPRISE_ANNUAL production
```

### 4.C — Webhook endpoint

1. https://dashboard.stripe.com/webhooks → **+ Add endpoint**
2. URL: `https://your-prod-host/api/v1/billing/webhook`
3. Events to send (minimum):
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
4. Copy the signing secret (`whsec_...`) and:

```bash
vercel env add STRIPE_WEBHOOK_SECRET production
```

5. (Recommended) Stripe Tax: Settings → Tax → enable. The checkout route already requests `automatic_tax: true` when configured.

---

## Section 5 — RESEND (CRITICAL for email)

Without Resend, waitlist confirmations silently fail and password resets 503.

### 5.A — Sign up + get key

1. https://resend.com/signup
2. https://resend.com/api-keys → create key
3. ```bash
   vercel env add RESEND_API_KEY production
   ```

### 5.B — Verify your sending domain

In Resend → **Domains** → **Add Domain** → enter the domain you want to send `from` (e.g. `socialperks.app`).

Resend will show DNS records to add. They look like:

| Type | Name | Value |
|---|---|---|
| MX | send | `feedback-smtp.us-east-1.amazonses.com` (priority 10) |
| TXT | send | `v=spf1 include:amazonses.com ~all` |
| TXT | resend._domainkey | (long DKIM key — copy from Resend dashboard) |
| TXT | _dmarc | `v=DMARC1; p=none;` |

Add to your DNS provider. Wait 5-15 min for propagation, click **Verify** in Resend.

### 5.C — Set sender

```bash
vercel env add EMAIL_FROM production <<< "Social Perks <noreply@socialperks.app>"
vercel env add WAITLIST_NOTIFY_EMAIL production
# enter YOUR email so you get pinged on every signup
```

---

## Section 6 — OAUTH (for verification — can defer until first customer hits this flow)

Without these, the OAuth callback returns mock tokens. Real verification needs real apps.

### 6.A — Instagram (Meta)

1. https://developers.facebook.com/apps → **Create App** → "Business"
2. Add Product: **Instagram Basic Display**
3. Settings → Basic: copy **App ID** and **App Secret**
4. Instagram Basic Display → User Token Generator → add yourself as a tester
5. Valid OAuth Redirect URIs: `https://your-prod-host/api/v1/oauth/ig`

```bash
vercel env add OAUTH_IG_CLIENT_ID production
vercel env add OAUTH_IG_CLIENT_SECRET production
```

### 6.B — TikTok

1. https://developers.tiktok.com/apps → **Manage apps** → **Connect**
2. Add **Login Kit**
3. Redirect URI: `https://your-prod-host/api/v1/oauth/tt`
4. Copy **Client Key** and **Client Secret**

```bash
vercel env add OAUTH_TT_CLIENT_ID production    # client KEY
vercel env add OAUTH_TT_CLIENT_SECRET production
```

### 6.C — Facebook (often shares Instagram app)

If you set up Instagram via Meta, you already have an `App ID` + `App Secret`. Use the same:

```bash
vercel env add OAUTH_FB_CLIENT_ID production
vercel env add OAUTH_FB_CLIENT_SECRET production
```

Add `https://your-prod-host/api/v1/oauth/fb` as a redirect URI in the Meta app.

---

## Section 7 — DEPLOY + VERIFY

After ALL of the above:

```bash
# Trigger redeploy with new env
vercel --prod --force

# Wait ~3 min, then smoke test:
curl https://your-prod-host/                      # 200
curl https://your-prod-host/api/v1/health         # 200, status: ok
curl -H "Authorization: Bearer REDACTED_ROTATED" \
     https://your-prod-host/api/v1/health/readiness | jq .
```

The readiness endpoint will show you EXACTLY what's wired and what's missing:

```json
{
  "ready": true,
  "summary": { "total": 12, "ok": 12, "missing": 0, "warnings": 0 },
  "checks": {
    "auth_secret": { "status": "ok", "detail": "AUTH_SECRET present" },
    "csrf_secret": { ... },
    ...
  }
}
```

When `ready: true` comes back, you can drive traffic.

---

## Section 8 — POST-LAUNCH SMOKE TESTS

Run these before sending the first real customer to the site:

```bash
HOST=https://your-prod-host

# 1. Public pages all return 200
for path in / /pricing /for/coffee-shops /leaderboard /calculator /blog /status /contact; do
  echo "GET $path"
  curl -s -o /dev/null -w "  %{http_code}\n" "$HOST$path"
done

# 2. Robots + sitemap render
curl -s "$HOST/robots.txt"
curl -s "$HOST/sitemap.xml" | head -20

# 3. OG cards render
open "$HOST/api/og/business?name=Test%20Coffee&type=Coffee%20Shop"
open "$HOST/api/og/influencer?name=Test%20Creator&followers=5000&earnings=480&tier=Bronze"

# 4. Waitlist captures (use a real email you control)
curl -X POST "$HOST/api/v1/waitlist" \
  -H "Content-Type: application/json" \
  -d '{"email":"YOUR-EMAIL@example.com","businessName":"Test","city":"Washington, DC","vertical":"coffee_shops"}'
# → confirmation email lands within 30s

# 5. Stripe checkout creates a real session (test mode)
# (do this from the dashboard signup flow — easier than curl with auth)

# 6. Cron endpoints reject unauthenticated calls
curl -i "$HOST/api/v1/cron/waitlist-drip"        # → 401
curl -i "$HOST/api/v1/cron/campaign-sweeps"      # → 401

# 7. Cron endpoints accept the secret
curl -H "Authorization: Bearer REDACTED_ROTATED" \
     "$HOST/api/v1/cron/waitlist-drip"           # → 200, ran: true (or skipped reason)
```

---

## Section 9 — WHAT'S READY OUT-OF-THE-BOX

These have zero env config and work today:

- ✅ Public marketing site, 80+ indexable city × industry pages
- ✅ Pricing page with FAQ schema, ROI calculator, leaderboard
- ✅ Public business + influencer profiles (`/b/[slug]`, `/i/[slug]`)
- ✅ Dynamic OG share cards
- ✅ Waitlist signup (works without DB; durable once DB is set)
- ✅ Compliance gate (refuses to launch incentivized review campaigns)
- ✅ FTC disclosure auto-injection at campaign launch
- ✅ Robots, sitemap, structured data everywhere

---

## Section 10 — KILL SWITCHES

If anything goes badly, here's how to roll back:

```bash
# Roll back to a known-good deploy
# Last green prod was 3b39c343 (commit on 2026-05-04, dpl_GRSnLeQomJfaGTrpH3SLqYKoSCdr)
vercel rollback dpl_GRSnLeQomJfaGTrpH3SLqYKoSCdr --yes

# Or revert via git:
git revert <bad-commit> && git push
```

---

## Section 11 — CRITICAL ENV REFERENCE (full list)

```ini
# Auth (BLOCKING — runtime throws without these)
AUTH_SECRET=REDACTED_ROTATED
CSRF_SECRET=REDACTED_ROTATED

# Cron (BLOCKING — drip and sweeps 503 without)
CRON_SECRET=REDACTED_ROTATED

# Readiness probe (BEARER token to view detailed checks)
READINESS_TOKEN=REDACTED_ROTATED

# Waitlist admin
WAITLIST_ADMIN_TOKEN=REDACTED_ROTATED
WAITLIST_NOTIFY_EMAIL=YOUR-EMAIL@example.com

# Public site URL (used by OG image URLs, password reset links, etc.)
NEXT_PUBLIC_SITE_URL=https://your-prod-host

# Database (REQUIRED for persistence)
DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require

# Stripe (REQUIRED for billing)
STRIPE_SECRET_KEY=sk_live_or_sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PRICE_STARTER_MONTHLY=price_xxx
STRIPE_PRICE_STARTER_ANNUAL=price_xxx
STRIPE_PRICE_PROFESSIONAL_MONTHLY=price_xxx
STRIPE_PRICE_PROFESSIONAL_ANNUAL=price_xxx
STRIPE_PRICE_ENTERPRISE_MONTHLY=price_xxx
STRIPE_PRICE_ENTERPRISE_ANNUAL=price_xxx

# Email (REQUIRED for transactional + waitlist)
RESEND_API_KEY=re_xxx
EMAIL_FROM=Social Perks <noreply@yourdomain.com>

# Webhooks (REQUIRED for platform → us)
WEBHOOK_SECRET=REDACTED_ROTATED
WEBHOOK_VERIFY_TOKEN=REDACTED_ROTATED

# OAuth (per-platform; defer until first verification needed)
OAUTH_IG_CLIENT_ID=
OAUTH_IG_CLIENT_SECRET=
OAUTH_TT_CLIENT_ID=
OAUTH_TT_CLIENT_SECRET=
OAUTH_FB_CLIENT_ID=
OAUTH_FB_CLIENT_SECRET=

# Tracking pixels (optional)
NEXT_PUBLIC_META_PIXEL_ID=
NEXT_PUBLIC_GTAG_ID=
```

---

## Section 12 — WHAT I CAN'T DO FOR YOU

These are the only things blocking launch that *require your hands*:

1. Logging into Vercel/Stripe/Resend/Meta dashboards (browser session + 2FA)
2. Verifying domain ownership in Resend (DNS records on your registrar)
3. Approving a Stripe Connect application (their compliance team)
4. Submitting your Meta app for App Review (their dev team, takes 1-2 weeks)
5. Hand-onboarding the first 10 coffee shops by phone/in-person

Everything else — every code path, every secret, every script, every doc, every test — is in this repo.
