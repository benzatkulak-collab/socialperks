# Moving Social Perks off Vercel

Ben's Vercel Hobby account is over its free limits (Fluid Active CPU 4h 52m
of 4h, Functions Storage 10.3 of 10 GB). Social Perks moves to a free
host. The code changes are on this branch. Everything below the
"Steps only Ben can do" heading needs Ben's accounts and his go-ahead.

## Which host, and why

**Chosen: Northflank's free Developer Sandbox, running the existing
`Dockerfile` as one always-on container.**

| Option | What I found | Verdict |
|---|---|---|
| Cloudflare Workers Free (OpenNext adapter) | I built it. OpenNext 1.20 needs Next ≥ 15.5.29 (we run 15.5.15). The bundle is 18.5 MiB, under the 64 MiB cap (Cloudflare dropped the old 3 MB gzip cap in Sept 2026). But in a local Workers preview, warm page views took **30–60 ms** and API calls 10–20 ms, against a **10 ms CPU cap per request** on the free plan. Cloudflare's own Vercel-migration guide says SSR apps "usually need the Workers Paid plan". Second problem: the app keeps one global Postgres pool, and Workers forbids sharing a connection across requests. In the preview, 9 of 10 concurrent DB requests failed. | Doesn't fit for free. It would work on Workers Paid ($5/mo) after a per-request DB-client change. |
| Netlify Free | Next.js runs with zero config. The free plan is 300 credits a month: 15 per production deploy, 10 per GB-hour of compute, 2 per 10k requests. **When the credits run out, the whole site pauses until next month.** Functions run on Lambda, so they cold-start. | Works, but the hard pause and the cold starts are worse than the container option. |
| Free container, Northflank Sandbox | 2 services, 2 jobs, 1 database, up to $20/mo of resources. **"Always on, no sleeping."** It builds Dockerfiles from GitHub and allows custom domains. | **Picked.** The app code doesn't change, there are no cold starts, and the Docker image already builds green on `main` in `deploy.yml`. |
| Render / Koyeb free | Render's free tier sleeps after 15 min idle. Koyeb's free service now scales to zero. | Rejected: the first visitor after a quiet spell gets a cold start. |

Caveats on Northflank:
- Its docs say the free tier "should not be used for production
  applications". Social Perks is still pre-launch, so that's acceptable for
  now.
- The pricing page says "no card needed", but the billing docs say you need
  a payment method to create resources. Expect a card check at signup.
- If the free terms change, the same image runs unchanged on any paid
  container host (Cloud Run, Render, Fly, Koyeb).

What I verified locally (Nov 22, 2026):
- `npm run build` passes.
- The standalone server started with the container's `CMD`
  (`node server.js`) against a scratch Postgres:
  - Boot migrations created 37 tables.
  - `/api/v1/health` returned `durable:true`, and 20 of 20 concurrent DB
    requests returned 200.
  - Pages answered in 6–20 ms and OG images rendered.
  - 4 of 5 cron routes ran. The 5th, `onboarding-drip`, has a key mismatch
    that was already there before this change (see the end of this doc).
  - Memory was about 200 MB after 200 requests.
- `npx tsc --noEmit`, `npm run lint` and `npm run test` (2118 tests) all
  pass.
- I couldn't run `docker build` here because Docker isn't installed. The new
  **CI "Docker image"** job builds the image, boots it against Postgres and
  smoke-tests it on every PR.

## Vercel-specific pieces and what replaces them

| Vercel piece | Replacement on this branch |
|---|---|
| `vercel.json` `crons` (5 jobs, UTC) | `.github/workflows/cron.yml`, same five schedules, same `Bearer $CRON_SECRET` call. It does nothing until `CRON_BASE_URL` is set. |
| `vercel.json` `github.silent` | Not needed off Vercel. `vercel.json` is deleted. |
| `@vercel/analytics` (`<Analytics />` in `layout.tsx`) | Removed, along with its CSP entries (`va.vercel-scripts.com`, `vitals.vercel-insights.com`). PostHog, GA and the Meta Pixel are unchanged. |
| Edge runtime / `maxDuration` | None used. 6 routes set `runtime = "nodejs"`, which is the container's default. |
| Image optimization | `next/image` isn't used. `/api/og/*` (`next/og`) runs in Node as before. |
| `VERCEL_PROJECT_PRODUCTION_URL` (about 80 reads) | No code change. Every read prefers `NEXT_PUBLIC_SITE_URL` and falls back to `https://socialperks.app`. |
| `VERCEL_GIT_COMMIT_SHA` (Sentry release) | `GIT_COMMIT_SHA`, an optional Docker build arg. The Vercel name still works as a fallback. |
| `x-vercel-forwarded-for` client IP | `cf-connecting-ip` comes first, set by the Cloudflare proxy. Without it, every visitor would share Cloudflare's edge IP in the rate limiter. |
| `NEXT_PUBLIC_*` available at build | These are now Docker **build args**. Empty ones are unset so the `socialperks.app` fallback still applies. |
| Prisma | Not in use: `prisma/schema.prisma` exists, but `src/lib/db/prisma.ts` exports `null`. The app talks to **Supabase Postgres** through `postgres.js` (`DATABASE_URL`, Supavisor transaction pooler). Nothing to change. |
| Production branch | `main` deploys to production. The host should keep deploying from `main`. |

## Steps only Ben can do

Placeholder names below (`social-perks`, `web`) are only suggestions.

### 1. Create the account
Sign up at northflank.com yourself and pick the free **Developer Sandbox**.
Expect a card check, which isn't charged.

### 2. Create the service
New project `social-perks`, region **US East**, the closest to the Supabase
pooler. Then add a **combined service** (it builds and deploys) named
`web`:

- Repository: `benzatkulak-collab/socialperks`. To test first, build from
  branch `claude/move-off-vercel-5109d0`, then switch the branch to `main`
  after merging.
- Build type: Dockerfile, path `/Dockerfile`, context `/`.
- Port 3000, HTTP, public.
- Health check: HTTP `GET /api/v1/health` on port 3000.
- Instances: **1**. The crons and in-memory rate limits assume a single
  instance.
- Compute: the largest plan the free allowance covers, for example 0.5 vCPU
  / 1 GB. The app uses about 200 MB.

### 3. Set build arguments (names only; values come from Vercel)
These are inlined at build time, so they go under **build arguments**, not
runtime env:
`NEXT_PUBLIC_SITE_URL` (set it to `https://socialperks.app`),
`NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`, `NEXT_PUBLIC_SENTRY_DSN`,
`NEXT_PUBLIC_GTAG_ID`, `NEXT_PUBLIC_META_PIXEL_ID`, and optionally
`GIT_COMMIT_SHA`. Only set the ones that have a value on Vercel today.

### 4. Set runtime secrets (names only)
To list what's on Vercel now, run
`vercel env ls production --scope team_z3Rvn5xOHQdOo7QakeRAOAKn` inside the
linked project, then copy each one into the service's runtime variables.
Keep the **same values**:

- Required for boot: `AUTH_SECRET`, `DATABASE_URL`.
- Must match the old values, or existing data breaks: `AUTH_SECRET`
  (sessions), `ENCRYPTION_MASTER_KEY` (encrypted tokens), `PERK_LINK_SECRET`
  (issued perk links), `CSRF_SECRET`.
- Crons: `CRON_SECRET`, and `DRIP_API_KEY` or `INTERNAL_API_KEY` if Vercel
  has one (see the onboarding-drip note below).
- Payments: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
  `STRIPE_PRICE_STARTER_MONTHLY`, `STRIPE_PRICE_STARTER_ANNUAL`,
  `STRIPE_PRICE_PROFESSIONAL_MONTHLY`, `STRIPE_PRICE_PROFESSIONAL_ANNUAL`,
  plus any other `STRIPE_*`.
- Email: `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_POSTAL_ADDRESS`,
  `FOUNDER_EMAIL`, `SUPPORT_EMAIL`, `WAITLIST_NOTIFY_EMAIL`.
- Ops: `SENTRY_DSN`, `DATABASE_SSL_CA`, `MIGRATION_SECRET`,
  `ALLOW_MIGRATIONS`, `ADMIN_PASSWORD`, `READINESS_TOKEN`,
  `WAITLIST_ADMIN_TOKEN`.
- Anything else in the list: the OAuth `*_CLIENT_ID` / `*_CLIENT_SECRET`
  pairs, `TWILIO_*`, `REDIS_URL`, and so on.
- Skip: `VERCEL_*` (only Vercel sets these) and `NODE_ENV`, `PORT`,
  `HOSTNAME` (the Dockerfile sets these).

### 5. Check it on the Northflank URL (before touching DNS)
On the service's `*.code.run` URL:
- `/api/v1/health` should show `"durable":true,"mode":"postgres"`.
- `/api/v1/health/readiness` should show `ready:true`, or list exactly what
  is missing.
- Click through `/`, `/pricing`, signup and login.
- The logs should show `[startup] Schema migrations ok` and
  `Production config validated`.

### 6. Merge the PR
Vercel then redeploys `main` without `vercel.json`, which stops the Vercel
crons. Switch the Northflank service's branch to `main`.

### 7. Turn on the crons
In GitHub → Settings → Secrets and variables → Actions:
1. Add the **secret** `CRON_SECRET` (same value as on the host).
2. Add the **variable** `CRON_BASE_URL` = `https://socialperks.app`.
3. Actions → Cron → Run workflow → `campaign-sweeps` to confirm a 200.

Set `CRON_BASE_URL` only after step 6, so the Vercel and GitHub crons never
both send drip emails on the same day.

### 8. Point the domain (Cloudflare DNS)
1. In Northflank, add the custom domains `socialperks.app` and
   `www.socialperks.app` to `web`. It shows a verification record and a
   CNAME target.
2. In Cloudflare DNS, replace the Vercel records with the Northflank ones:
   `A 76.76.21.21` or `CNAME cname.vercel-dns.com` becomes a CNAME to the
   Northflank target. Cloudflare flattens a CNAME on the apex.
3. Keep the records **DNS-only (grey cloud)** until Northflank shows the TLS
   certificate as issued. Then switch to **Proxied (orange)** with SSL/TLS
   mode **Full (strict)**. Proxied is what makes `cf-connecting-ip` (the
   rate-limit IP) correct.
4. The Stripe webhook URL and the OAuth redirect URIs don't change, because
   the domain stays the same.

### 9. Check the live site
- `curl -sI https://socialperks.app` should show the response coming from
  Northflank, with no `x-vercel-id` header.
- Run `npm run verify:deploy`.
- Check `/api/v1/health` and `/api/v1/health/readiness`.
- Do one Stripe test-mode checkout (DEPLOY.md §2.3).
- The next morning, confirm the Cron runs in GitHub Actions are green.

### 10. Pause, then delete, the Vercel projects
Team `benzatkulak-4901s-projects`:
1. **social-perks** (`prj_inr31YgRmlLKJ3qAKtl2c74V9ODp`):
   - Remove its domains.
   - Settings → Git → **Disconnect** the repo, so pushes and PRs stop
     building there.
   - Keep it about a week as a rollback, then delete it.
2. **socialperks**, **socialperks-1qnx** and **socialperks-veuy** are old
   duplicates. Check that none has a domain attached, then delete them.
   Deleting projects also frees their deployments, which count toward
   Functions Storage.
3. If no other project uses the Vercel GitHub app on this repo, uninstall it.
4. Locally, `rm -rf .vercel`. `scripts/setup-vercel-env.sh` is now unused.

Rollback until step 10 is done: point the DNS records back to Vercel.

## What behaves differently

- **No cold starts.** One process stays up. In-memory state (rate-limit
  counters, caches) now lasts between requests instead of resetting on
  every cold start. Boot migrations run once per deploy or restart.
- **One instance, one region.** Nothing scales out automatically. Load is
  light: about 50 min of CPU a month on Vercel.
- **Brief downtime on each deploy** while the container restarts, unless
  Northflank's rolling deploy keeps the old one up until the health check
  passes.
- **No per-PR preview URLs.** The CI "Docker image" job covers build
  safety. A second free service could serve previews if you want them.
- **Crons run on GitHub Actions.** Runs can start a few minutes late. On a
  public repo, **GitHub turns schedules off after 60 days with no commits**
  (`main`'s last commit was Aug 26). GitHub emails a warning first; re-enable
  from the Actions tab.
- **Vercel Analytics stops.** Use PostHog for traffic.
- **Logs** are in Northflank's log viewer, as the same JSON lines on stdout.
- **Long-lived connections** like the `/api/v1/events` SSE stream are no
  longer capped by a function timeout.
- **Rate-limit IP spoofing.** `cf-connecting-ip` can be spoofed if someone
  calls the `*.code.run` origin directly, bypassing Cloudflare. The old
  `x-real-ip` had the same weakness.

## Known issue found along the way (already there before this change)

`/api/v1/cron/onboarding-drip` sends `x-api-key: DRIP_API_KEY ||
INTERNAL_API_KEY || CRON_SECRET` to `/api/v1/drip`. But `/api/v1/drip` only
accepts `DRIP_API_KEY || INTERNAL_API_KEY`. With neither set, the cron gets
a 401 (`DRIP_FAILED`). This happens on Vercel too. Workaround: set
`DRIP_API_KEY`. The code fix is a separate follow-up.
