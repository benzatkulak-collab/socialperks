# Verification Engine — Real API Integration Plan

## The honest baseline

`src/lib/verification-engine.ts` is 1,776 lines of well-structured
verification orchestration. It scores submissions, detects fraud,
applies FTC checks, manages timing and budgets. **What it doesn't
do** is talk to Instagram, TikTok, Facebook, X, or YouTube. Zero
real-API calls. Today it accepts a `proofUrl`, runs heuristics on
the URL itself, and returns "verified" without ever asking the
platform whether the post exists.

That's fine for demo. It's a hard blocker for the first paying
customer. A coffee shop can't trust a redemption code that was
issued because we made up a verification result.

This doc is the bridge: **what API integrations we need, in what
order, with what trade-offs explicitly named, and what the
incremental code shape looks like.**

## What "verified" actually has to mean

For a redemption to be defensible:

1. **The post exists.** The URL the customer submitted resolves to
   real content on the platform.
2. **The post is by the customer.** The IG/TikTok handle on the post
   matches the handle attached to their wallet. (Not just "anyone
   posted something with our hashtag"; the *customer who claimed
   the perk* posted.)
3. **The post mentions the business.** Either by tag, mention,
   geotag, or matching hashtag — the business has to actually
   appear.
4. **The disclosure is present.** FTC requires `#ad` or equivalent
   on incentivized posts. We auto-inject in our suggested copy, but
   we have to verify the user actually used it.
5. **The post wasn't deleted before the perk was redeemed.** A
   common abuse pattern: post, claim, delete the post, redeem the
   perk. We need to re-check at redemption time.

Today we do (1) heuristically (HEAD request to the URL); (2-5) we
don't do at all.

## Platform-by-platform integration plan

### Instagram (highest priority)

**API:** [Instagram Graph API](https://developers.facebook.com/docs/instagram-api).
The API the user-facing IG embed uses (`oembed`) is rate-limited
and unauthenticated; the Graph API requires app review.

**Required scopes:**
- `instagram_basic` — read user profile + media
- `instagram_manage_insights` — for engagement metrics (later)
- `pages_show_list` + `pages_read_engagement` — required for the
  business-account verification flow

**Approval path:** Submit app for review with a recorded screencast
showing the use case ("verifying customer-generated marketing
posts"). 7-14 day review cycle. The API key is per-Meta-app; we
get one set of tokens for the whole platform.

**Verification flow:**
```
1. Customer connects their IG account via OAuth (already scaffolded
   in src/lib/verification/oauth-manager.ts; just needs real client
   ID/secret)
2. We store their IG user_id + access_token in `platform_connections`
3. When they submit a proof URL, we:
   a. Parse the media id from the URL (regex)
   b. GET https://graph.instagram.com/{media-id}?fields=id,caption,media_type,owner,timestamp,permalink
   c. Check owner.id matches their connected user_id (gate #2)
   d. Check caption contains the business name OR a mention
      we configured (gate #3)
   e. Check caption contains #ad / #sponsored / "in exchange"
      (gate #4)
   f. Re-check at redemption time — same call, just before
      issuing the redemption code (gate #5)
```

**Failure modes to design for:**
- Token expired (refresh flow)
- User deauthorized our app between submission and redemption
- Post made private after submission (returns 404 instead of media)
- Story posts (24-hour expiry; we have to verify within the window)
  — separate flow; treat Story differently from Feed/Reel

**File layout:**
```
src/lib/verification/platforms/instagram.ts   ← Real Graph client
src/lib/verification/platforms/instagram-mock.ts  ← Used when
                                                    OAUTH_IG_CLIENT_ID
                                                    is unset
```

The verification-engine routing layer picks one based on env. Tests
use the mock; production with real credentials uses the real client.

### TikTok (second priority)

**API:** [TikTok Display API](https://developers.tiktok.com/doc/display-api-overview).
This is the public read API. The Content Posting API requires
LIVE/Marketing approval (months of review); we don't need it.

**Approval path:** Display API approval is comparatively fast
(~3 days). But the rate limit is ungenerous — 1,000 calls per
day per app for the free tier. We'll hit this at modest scale.

**Verification flow:** Identical shape to Instagram —
parse-media-id → fetch → owner-match → caption-match → disclosure
check → re-check at redemption.

**Specific gotcha:** TikTok caption text on some videos is
returned as a separate `desc` field. The disclosure detector has
to read both `caption` and `desc`.

### Facebook (third priority — only for restaurants/services)

**Why third:** most coffee shops + salons + gyms don't have FB
audiences that justify the integration cost. We add FB once the
"shops that benefit from FB" segment is meaningful. Restaurants
and home services are the obvious users.

**Same Meta Graph API as Instagram** — single OAuth app covers
both, so the marginal cost is small once IG is live.

### X (formerly Twitter) — speculative

**Why speculative:** the X API v2 free tier is essentially
unusable now (read-only at 1 req/sec; no write). Paid tiers are
$200-$5,000/month. The ROI of integrating X depends entirely on
how many of our customers' customers post on X — empirically that's
near zero for local-business reach.

**Plan:** defer X integration until at least one of our paying
customers asks. Then re-evaluate against the cost.

### YouTube (also speculative)

**Why speculative:** video reviews are high-value but rare. A coffee
shop won't get YouTube reviews; a restaurant or service business
might get a few per year. The integration cost (Google Cloud +
YouTube Data API + per-video manual review) doesn't pay back at
SMB scale.

**Plan:** YouTube verification stays manual (an admin reviews
flagged YouTube submissions in a queue) until volume justifies
automation.

## File-level shape

### Adapter pattern

```
src/lib/verification/
  ├── verification-engine.ts          ← Orchestrator (existing)
  ├── platforms/
  │   ├── types.ts                    ← Shared interface
  │   ├── instagram.ts                ← Real Graph API client
  │   ├── instagram-mock.ts           ← Demo / no-creds fallback
  │   ├── tiktok.ts                   ← Real Display API client
  │   ├── tiktok-mock.ts              ← Demo / no-creds fallback
  │   ├── facebook.ts                 ← Same OAuth app as IG
  │   └── facebook-mock.ts
  ├── platform-router.ts              ← Picks real-vs-mock by env
  └── oauth-manager.ts                ← Existing — handles the
                                         OAuth dance per platform
```

Each platform adapter implements the same `PlatformVerifier`
interface:

```ts
export interface PlatformVerifier {
  /** Required to be in the user's connected platforms before submission. */
  requiresOAuth: true;

  /** Parse a URL → platform-specific id. Returns null on bad URL. */
  parseMediaId(url: string): string | null;

  /** Fetch the post; null if it doesn't exist or we can't see it. */
  fetchPost(id: string, accessToken: string): Promise<PlatformPost | null>;

  /** Check #ad / #sponsored / equivalent. */
  hasFtcDisclosure(post: PlatformPost): boolean;

  /** Does the post mention/tag the business? */
  mentionsBusiness(post: PlatformPost, business: { name: string; handles: string[] }): boolean;

  /** Convert platform-specific timestamps + counts to our shape. */
  toEvidence(post: PlatformPost): VerificationEvidence;
}
```

The router picks `instagram` vs `instagram-mock` at module load
based on whether `OAUTH_IG_CLIENT_ID && OAUTH_IG_CLIENT_SECRET`
are set. The verification engine never knows which it's using.

### Caching

Platform GET requests are 50-200ms per call and rate-limited. We
cache responses in `platform_post_cache` with a 5-minute TTL — long
enough that re-checking at redemption time doesn't blow our quota,
short enough that a deleted post is detected promptly.

```sql
CREATE TABLE platform_post_cache (
  cache_key      TEXT PRIMARY KEY,  -- "{platform}:{media_id}"
  platform       TEXT NOT NULL,
  media_id       TEXT NOT NULL,
  data           JSONB NOT NULL,
  fetched_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at     TIMESTAMPTZ NOT NULL
);
CREATE INDEX idx_platform_post_cache_expires ON platform_post_cache(expires_at);
```

A cron tick prunes expired rows nightly.

## Webhook ingestion (faster + cheaper than polling)

For Instagram, the Graph API supports **subscriptions** — Meta
POSTs us when content is published. We already have the webhook
receiver (`/api/v1/verification/webhook`); we just need to subscribe
the IG fields:

```
field=mentions  → triggers when a user @mentions the business handle
field=hashtag   → triggers when a user uses a configured hashtag
field=story_insights → for IG Stories
```

When a webhook fires, we look up the corresponding submission and
auto-verify in the background. This is **strictly better** than
polling: lower latency, no quota burn, real-time UX for the customer.

## Anti-fraud signals

Once we're talking to real APIs, the existing fraud-detection
engine gets real signals to score on:

| Signal | Source | Weight |
|---|---|---|
| Account age < 7 days | Graph API user fields | high — burner account |
| Follower count = 0 | Graph API user fields | medium |
| Post deleted between submission and redemption | Re-check on redemption | high — fraud pattern |
| Image perceptual hash matches a previously-submitted post | Internal hash store | high — recycled content |
| Geotag in another country than the business | post metadata | medium — bot or location-spoofing |
| Caption is 100% emoji or 100% non-English when business audience is English | NLP heuristic | low |
| Same IG account submitted to >5 unrelated businesses in 24h | Cross-business query | high — claim farm |

The fraud engine already has hooks for all of these; right now they
all return "no signal" because we don't have data. Wiring real APIs
is what makes the existing fraud detection actually fire.

## Sequencing

**Week 1:** OAuth wiring (use real OAUTH_IG_CLIENT_ID + SECRET in
the existing `oauth-manager.ts`). Customer-side connect flow goes
live. We can read real IG accounts even before verification fully
works.

**Week 2:** `platforms/instagram.ts` adapter — parseMediaId,
fetchPost, hasFtcDisclosure, mentionsBusiness. Behind a feature
flag (`ENABLE_REAL_VERIFICATION=instagram`) so we can validate
against test posts before flipping for all submissions.

**Week 3:** Cache table + nightly prune cron. Re-check at redemption
hooked in. Mock vs. real router is the one-line env-driven branch
in `platform-router.ts`.

**Week 4:** TikTok adapter. Same shape, same router slot, different
client.

**Week 5:** IG webhook subscription registered with Meta. We start
getting push events for new posts.

**Week 6:** Facebook (free with the existing IG OAuth app).

After week 6, three of the four highest-volume platforms are real.
X stays speculative; YouTube stays manual.

## What we accept by NOT building this immediately

- **Demo mode is dishonest.** When a customer's perk gets verified
  in demo mode, we marked them verified without checking. If they
  catch on, our credibility is gone. Mitigation: the demo
  environment makes this obvious (banner: "demo mode — verifications
  are simulated") and production must require either real IG creds
  or admin manual approval.
- **First customer onboarding is partially manual.** Until week 2
  ships, every submission has to be reviewed by us through the
  admin queue. That's fine for the first 3-5 customers; it's
  unsustainable at 50.
- **Fraud detection has no real signals.** Same root cause —
  detection requires real platform data. Until then, the best
  defense is small per-shop daily caps + manual reviews.

## What we don't accept

- We do NOT ship a redemption-code-issuance pipeline that depends
  on fake verifications. Any production deployment must either
  have real IG credentials OR route all verifications through
  manual admin review. The verification engine has a
  `manualReviewRequired` flag specifically for this; the env-var
  check in `platform-router.ts` flips it on automatically when
  no real credentials are configured.

## Concrete next steps when credentials arrive

1. Set `OAUTH_IG_CLIENT_ID` + `OAUTH_IG_CLIENT_SECRET` on Vercel
2. Run `npm run db:migrate` to apply the cache table migration
   (when we add it)
3. Have a test customer connect their IG account via the existing
   `/dashboard/connections` flow (already scaffolded in
   `oauth-manager.ts`)
4. Submit a test post URL via `/c/[campaignId]`
5. Watch the verification logs to see which platform code path
   ran (real vs. mock)

Then we know the integration works end-to-end before any real
shop owner depends on it.
