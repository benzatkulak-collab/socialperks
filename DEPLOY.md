# Launch / Deploy Runbook

Single source of truth for shipping Social Perks to production and turning on
revenue. Production is the `Dockerfile` image on an always-on container host
(Northflank), auto-deployed from `main`; scheduled jobs run from
`.github/workflows/cron.yml`. Database is Postgres (Supabase). Moving off
Vercel: see `docs/hosting-move.md`. Everything code-side is in the repo; the only remaining
work is **external configuration** (account-owned secrets) — see the table at
the bottom.

---

## 0. One-time external configuration (the only launch blocker)

These cannot be done in code — they require account access. The app boots and
serves the marketing/SEO/waitlist site without them, but **cannot take money**
until the Stripe vars are set. `src/instrumentation.ts` fails the boot loudly if
the **non-negotiable** vars (`AUTH_SECRET`, `DATABASE_URL`) are missing/invalid.

| Env var | Where to get it | Tier |
|---|---|---|
| `AUTH_SECRET` | `openssl rand -base64 32` | **non-negotiable** |
| `DATABASE_URL` | Supabase → Connection string (pooler) | **non-negotiable** |
| `STRIPE_SECRET_KEY` | Stripe → Developers → API keys (`sk_live_…`) | payments |
| `STRIPE_WEBHOOK_SECRET` | Stripe → Webhooks → add endpoint `…/api/v1/billing/webhook` → `whsec_…` | payments |
| `STRIPE_PRICE_STARTER_MONTHLY` / `_ANNUAL` | Stripe → Products → price IDs | payments |
| `STRIPE_PRICE_PROFESSIONAL_MONTHLY` / `_ANNUAL` | Stripe → Products → price IDs | payments |
| `RESEND_API_KEY` | Resend → API keys (`re_…`) | email |
| `SENTRY_DSN` + `NEXT_PUBLIC_SENTRY_DSN` | Sentry → project → DSN | observability |
| `NEXT_PUBLIC_POSTHOG_KEY` / GA / META_PIXEL | PostHog/GA/Meta | analytics |

Helper: `scripts/setup-stripe.sh`. Set runtime vars as secrets on the container
service, and `NEXT_PUBLIC_*` vars as **build arguments** (they are inlined at
build time), then redeploy. `CRON_SECRET` also goes in GitHub Actions secrets.

---

## 1. Release checklist

```
□ Merge the branch to main (the host rebuilds the Docker image and deploys).
□ Pre-merge gates (CI / local):
    npx tsc --noEmit          # types
    npm run lint              # warnings-only is OK
    npm run test              # full suite must pass
    npm run build             # must exit 0 (needs a real node_modules)
□ After deploy, run migrations (idempotent, schema-auto from schema.ts):
    # CLI (recommended): point at prod and run
    DATABASE_URL=<prod-url> npm run db:migrate
    # OR the gated API (prod): requires ALLOW_MIGRATIONS=true + MIGRATION_SECRET
    curl -X POST https://socialperks.app/api/v1/migrate -H "Authorization: Bearer $MIGRATION_SECRET"
□ Set/confirm the env vars above for the production environment.
□ Run post-deploy verification (section 2).
□ Smoke-test a real $1 purchase end-to-end (section 2.3).
```

> NOTE: there is exactly ONE migration system — `src/lib/db/migrate.ts`
> (schema-auto, generated from `schema.ts`). The old versioned registry in
> `src/lib/db/migrations.ts` is **deprecated and unused**. Declare new tables in
> `schema.ts` only.

---

## 2. Post-deploy verification

### 2.1 Automated
```
npm run verify:deploy            # checks discovery/catalog/APIs/MCP/schema + prints money-path readiness
```

### 2.2 Health + readiness
```
curl https://socialperks.app/api/v1/health        # expect database.durable:true, mode:postgres
curl https://socialperks.app/api/v1/health/readiness   # expect ready:true once Stripe/Resend are set
```
`ready:false` lists exactly which checks are `missing` (stripe, stripe_webhook_secret,
stripe_prices, resend, …). Every table with a write path is asserted, so a
missing table fails the probe instead of silently swallowing writes.

### 2.3 Money-path smoke test (do once after Stripe config)
```
1. Visit /pricing → click a paid plan → it routes through signup → create_checkout.
2. Pay with a live card (or a test card in test mode).
3. Confirm: the account is upgraded (getBusinessPlan → the paid plan), a
   business_subscriptions row exists, and the Stripe webhook logged
   "Created subscription …".
4. In the Stripe dashboard, cancel the subscription → confirm the account drops
   to free (lifecycle handlers are DB-authoritative, cold-start safe).
```

---

## 3. Rollback

Production is a container build from `main`, and all schema changes are additive
(`CREATE TABLE IF NOT EXISTS`), so rollback is code-only:

```
# Fastest: host dashboard → the service's deployments → redeploy the previous good build.
# Or via git:
git revert <bad-commit>      # then push to main → auto-deploy
```

- Migrations are **forward-only and idempotent**; you do not roll them back
  (the new tables are harmless to older code). Never DROP a table to roll back.
- Secrets/env changes roll back independently in the host dashboard.

---

## 4. What's intentionally degraded-but-OK before payments are configured

- Checkout returns a clean `503 BILLING_UNAVAILABLE` (never a fake success).
- The webhook refuses to process unsigned events in production (no mock-mode).
- Welcome/perk/drip emails are skipped (no `RESEND_API_KEY`) but never block.
- Error events don't reach Sentry until `SENTRY_DSN` is set; the readiness probe
  is the fallback signal.

The site (landing, SEO, /answers, waitlist, agent surfaces) is fully functional
in this state — only monetization is gated on the external config above.
