# Social Perks API Documentation

Base URL: `/api/v1`

All responses use the envelope format:
```json
{ "success": true, "data": { ... } }
{ "success": false, "error": { "code": "ERROR_CODE", "message": "..." } }
```

Every response includes `X-Request-Id` and `X-Response-Time` headers.

---

## Authentication

All authenticated endpoints accept one of:
- **Bearer token**: `Authorization: Bearer <token>` (session token from login)
- **JWT cookie**: `sp-access-token` httpOnly cookie (set automatically on login)
- **API key**: `Authorization: Bearer sk_...` (for programmatic access)

Rate limit tiers:
| Tier | Requests | Window | Used by |
|------|----------|--------|---------|
| strict | 5 | 1 min | Auth endpoints |
| standard | 100 | 1 min | AI endpoints |
| relaxed | 1000 | 1 min | Data queries |
| public | unlimited | - | Health, market data |

---

## Auth

### `GET /api/v1/auth` -- Validate session

| Field | Value |
|-------|-------|
| Auth | Bearer token |
| Rate limit | relaxed |

**Response:**
```json
{
  "user": { "id": "...", "email": "...", "role": "business", "businessId": "..." },
  "expiresAt": "2026-03-25T00:00:00.000Z"
}
```

### `POST /api/v1/auth` -- Login / Signup / Logout / Refresh / Reset

| Field | Value |
|-------|-------|
| Auth | None (login/signup/reset) or Bearer token (logout/session) |
| Rate limit | strict (5/min) |

**Actions:**

#### `action: "signup"`
```json
{
  "action": "signup",
  "email": "user@example.com",
  "password": "min8chars",
  "name": "Jane Doe",
  "role": "business"
}
```
Returns: user object, session token, JWT cookies. `role` options: `business`, `influencer`, `enterprise`.

#### `action: "login"`
```json
{
  "action": "login",
  "email": "user@example.com",
  "password": "..."
}
```
Legacy PIN login (backwards compat):
```json
{ "action": "login", "email": "yoga@demo.com", "pin": "1234" }
```

#### `action: "logout"`
```json
{ "action": "logout", "token": "..." }
```
Or send `Authorization: Bearer <token>` header.

#### `action: "refresh"`
Uses `sp-refresh-token` cookie. Returns new access token + cookies.

#### `action: "session"`
Same as GET, but via POST. Send token in body or Authorization header.

#### `action: "reset-password"`
```json
{ "action": "reset-password", "email": "user@example.com" }
```
Always returns success (prevents email enumeration).

#### `action: "confirm-reset"`
```json
{ "action": "confirm-reset", "token": "reset-token-here", "newPassword": "newMin8chars" }
```

---

## Campaigns

### `GET /api/v1/campaigns` -- List campaigns

| Field | Value |
|-------|-------|
| Auth | None |
| Rate limit | relaxed |

**Query params:**
| Param | Type | Description |
|-------|------|-------------|
| businessId | string | Filter by business |
| state / status | string | Filter by state (active/paused/ended) |
| page | number | Page number (default: 1) |
| perPage | number | Results per page (default: 20, max: 100) |

**Response:**
```json
{
  "campaigns": [ { "id": "...", "name": "...", "state": "active", ... } ],
  "pagination": { "page": 1, "perPage": 20, "total": 5, "totalPages": 1 }
}
```

### `POST /api/v1/campaigns` -- Create campaign

| Field | Value |
|-------|-------|
| Auth | Bearer token |
| Rate limit | standard |

**Body:**
```json
{
  "businessId": "biz_123",
  "name": "Instagram Reel Campaign",
  "actions": ["ig_rl", "ig_st"],
  "discountValue": 15,
  "discountType": "pct",
  "description": "Post a Reel featuring our products",
  "guidelines": "Include our branded hashtag",
  "maxCompletions": 50,
  "expiresInDays": 30,
  "useTiers": true,
  "tags": ["food", "local"],
  "budgetCap": 500
}
```
Required: `businessId`, `name`, `actions`, `discountValue`, `discountType` (pct/dol).

**Response (201):**
```json
{
  "id": "abc123...",
  "businessId": "biz_123",
  "name": "Instagram Reel Campaign",
  "actions": ["ig_rl", "ig_st"],
  "discountValue": 15,
  "discountType": "pct",
  "status": "active",
  "compliance": { "score": 95, "compliant": true, "issues": [] },
  "createdAt": "2026-03-24T..."
}
```

---

## Submissions

### `GET /api/v1/submissions` -- List submissions

| Field | Value |
|-------|-------|
| Auth | None |
| Rate limit | relaxed |

**Query params:**
| Param | Type | Description |
|-------|------|-------------|
| campaignId | string | Filter by campaign |
| businessId | string | Filter by business (resolves all business campaigns) |
| userId | string | Filter by submitter |
| status | string | pending / approved / rejected / expired |
| actionId | string | Filter by action |
| page | number | Page number |
| perPage | number | Results per page |

### `POST /api/v1/submissions` -- Create submission

| Field | Value |
|-------|-------|
| Auth | Bearer token |
| Rate limit | standard |

**Body:**
```json
{
  "campaignId": "abc123",
  "userId": "usr_456",
  "actionId": "ig_rl",
  "proofUrl": "https://instagram.com/reel/...",
  "proofType": "url",
  "metadata": { "platformId": "ig", "caption": "..." }
}
```
Required: `campaignId`, `userId`, `actionId`, `proofUrl`, `proofType` (screenshot/url/video/api_verified). `userId` must match authenticated user.

**Response (201):** Submission object with optional `fraudScore`, `compliance`, and `aiReview` fields.

### `POST /api/v1/submissions/review` -- Review submission

| Field | Value |
|-------|-------|
| Auth | Bearer token |
| Rate limit | standard |

**Body:**
```json
{
  "submissionId": "sub_789",
  "reviewerId": "biz_123",
  "decision": "approve",
  "note": "Great content!",
  "campaign": { "businessId": "biz_123", "discountValue": 15, "discountType": "pct", "expiresInDays": 30 },
  "followerCount": 5000
}
```
Required: `submissionId`, `reviewerId`, `decision` (approve/reject). Include `campaign` object when approving for automatic perk calculation and award.

---

## AI Endpoints

All AI endpoints are backend-only. The frontend never imports AI logic directly.

### `POST /api/v1/ai/generate` -- Generate campaign suggestions

| Field | Value |
|-------|-------|
| Auth | Bearer token |
| Rate limit | standard (100/min) |

**Body:**
```json
{
  "businessType": "Coffee Shop",
  "businessSize": "small",
  "budget": { "min": 100, "max": 500 },
  "preferences": { "platforms": ["ig", "tt"] },
  "excludeCategories": ["review"],
  "includeSeasonal": true
}
```
Required: `businessType`. `businessSize` options: solo/small/medium/enterprise.

### `POST /api/v1/ai/recommend` -- Optimization recommendations

| Field | Value |
|-------|-------|
| Auth | Bearer token |
| Rate limit | standard (100/min) |

**Body:**
```json
{
  "businessType": "Restaurant",
  "businessSize": "small",
  "activeCampaigns": [],
  "completionHistory": [],
  "goals": ["reviews", "social-reach"]
}
```
Valid goals: reviews, social-reach, referrals, engagement, brand-awareness.

### `POST /api/v1/ai/review` -- AI submission review pipeline

| Field | Value |
|-------|-------|
| Auth | Bearer token |
| Rate limit | standard |

**Body:**
```json
{
  "submissionId": "sub_123",
  "campaignId": "camp_456",
  "userId": "usr_789",
  "platformId": "ig",
  "actionId": "ig_rl",
  "proofUrl": "https://...",
  "proofType": "url",
  "metadata": {},
  "contentText": "Check out this amazing coffee!",
  "actionType": "content",
  "jurisdiction": "US_FTC"
}
```
Required: `submissionId`, `campaignId`, `userId`, `platformId`, `actionId`, `proofUrl`, `proofType` (url/screenshot/video).

**Response:** Verdict with decision (auto_approve/auto_reject/manual_review), confidence score, quality scores, and explanation.

### `POST /api/v1/ai/campaign-agent` -- Full AI marketing plan

| Field | Value |
|-------|-------|
| Auth | Bearer token |
| Rate limit | standard |

**Body:**
```json
{
  "businessId": "biz_123",
  "name": "Taqueria Sol",
  "type": "Restaurant",
  "size": "small",
  "industry": "Food & Beverage",
  "location": "Austin, TX",
  "currentRating": 4.5,
  "reviewCount": 120,
  "socialPresence": [{ "platform": "ig", "followers": 3000, "engagement": 0.04 }],
  "monthlyBudget": 200,
  "goals": ["reviews", "social-reach"]
}
```
Required: `businessId`, `name`, `type`.

**Response:** Full MarketingPlan with 3-5 campaign recommendations, competitive insights, ROI projections, and phased implementation timeline.

### `POST /api/v1/ai/quick-start` -- Quick-start recommendation

| Field | Value |
|-------|-------|
| Auth | Bearer token |
| Rate limit | standard |

**Body:**
```json
{
  "businessType": "Yoga Studio",
  "goals": ["reviews", "engagement"]
}
```
Required: `businessType`. Returns a single best campaign recommendation for quick onboarding.

---

## Billing

### `POST /api/v1/billing` -- Subscription management

| Field | Value |
|-------|-------|
| Auth | Bearer token |
| Rate limit | standard |

**Actions:**

#### `action: "create_checkout"`
```json
{
  "action": "create_checkout",
  "plan": "starter",
  "billingPeriod": "monthly",
  "businessId": "biz_123",
  "successUrl": "https://app.socialperks.com/dashboard",
  "cancelUrl": "https://app.socialperks.com/pricing"
}
```
Plans: starter, professional, enterprise. Periods: monthly, annual. Returns Stripe Checkout Session URL.

#### `action: "create_portal"`
```json
{ "action": "create_portal", "businessId": "biz_123", "returnUrl": "https://..." }
```
Returns Stripe Customer Portal session URL.

#### `action: "get_subscription"`
```json
{ "action": "get_subscription", "businessId": "biz_123" }
```
Returns current subscription details or `{ subscription: null, plan: "free" }`.

### `POST /api/v1/billing/webhook` -- Stripe webhook

| Field | Value |
|-------|-------|
| Auth | Stripe-Signature header (HMAC-SHA256) |
| Rate limit | None |

Handles: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`. Includes 5-minute replay protection.

---

## Perk Programs

### `GET /api/v1/programs` -- List programs

| Field | Value |
|-------|-------|
| Auth | None |
| Rate limit | relaxed |

**Query params:** `businessId` (required).

### `POST /api/v1/programs` -- Create program

| Field | Value |
|-------|-------|
| Auth | Bearer token |
| Rate limit | standard |

**Body:**
```json
{
  "businessId": "biz_123",
  "name": "Loyalty Rewards",
  "description": "Earn rewards for marketing actions",
  "rules": { "pointsPerAction": 10, "bonusMultiplier": 1.5 },
  "tiers": [
    { "name": "Bronze", "threshold": 100, "reward": { "type": "pct", "value": 5, "description": "5% off" } },
    { "name": "Silver", "threshold": 500, "reward": { "type": "pct", "value": 10, "description": "10% off" } }
  ],
  "cycle": "monthly",
  "cycleStartDay": 1,
  "carryOverPartial": false,
  "gracePeriodDays": 3,
  "maxMembers": 100
}
```
Required: `businessId`, `name`, `description`, `rules`, `tiers`, `cycle`, `cycleStartDay`. Cycle options: weekly/biweekly/monthly/quarterly.

### `GET /api/v1/programs/:id` -- Program details

| Field | Value |
|-------|-------|
| Auth | None |
| Rate limit | relaxed |

Returns program details with stats.

### `PUT /api/v1/programs/:id` -- Update program

| Field | Value |
|-------|-------|
| Auth | Bearer token |
| Rate limit | standard |

Body: any fields from the create request (partial update).

### `DELETE /api/v1/programs/:id` -- End program

| Field | Value |
|-------|-------|
| Auth | Bearer token |
| Rate limit | standard |

### `GET /api/v1/programs/:id/progress` -- Member progress

| Field | Value |
|-------|-------|
| Auth | Bearer token |
| Rate limit | relaxed |

**Query params:** `memberId` (required).

### `POST /api/v1/programs/:id/submit` -- Submit action

| Field | Value |
|-------|-------|
| Auth | Bearer token |
| Rate limit | standard |

**Body:**
```json
{
  "memberId": "mem_123",
  "actionId": "ig_rl",
  "platformId": "ig",
  "proofUrl": "https://...",
  "proofType": "url"
}
```
Required: `memberId`, `actionId`, `platformId`, `proofUrl`, `proofType` (url/screenshot/video).

### `GET /api/v1/programs/:id/cashback` -- List payouts

| Field | Value |
|-------|-------|
| Auth | Bearer token |
| Rate limit | relaxed |

**Query params:** `status` (optional: pending/approved/sent/confirmed/failed).

### `POST /api/v1/programs/:id/cashback` -- Request or manage cash back

| Field | Value |
|-------|-------|
| Auth | Bearer token |
| Rate limit | standard |

**Request cash back (member):**
```json
{
  "memberId": "mem_123",
  "method": "venmo",
  "methodDetails": "@username"
}
```
Methods: venmo, check, stripe, paypal, cash, other.

**Manage payout (business):**
```json
{
  "payoutId": "pay_123",
  "action": "approve"
}
```
Actions: approve, send, confirm.

### `GET /api/v1/programs/:id/members` -- List members

| Field | Value |
|-------|-------|
| Auth | None |
| Rate limit | relaxed |

### `POST /api/v1/programs/:id/members` -- Enroll member

| Field | Value |
|-------|-------|
| Auth | Bearer token |
| Rate limit | standard |

**Body:**
```json
{
  "memberId": "mem_123",
  "name": "Jane Doe",
  "email": "jane@example.com"
}
```

---

## Exchange

The exchange is a two-sided marketplace matching businesses (buy orders) with agents/influencers (sell orders).

### `GET /api/v1/exchange/opportunities` -- Market opportunities

| Field | Value |
|-------|-------|
| Auth | None (public) |
| Rate limit | public |
| Cache | 60s public |

**Query params:**
| Param | Type | Description |
|-------|------|-------------|
| platforms | string | Comma-separated platform IDs (e.g., "ig,tt,yt") |
| niches | string | Comma-separated niches (e.g., "food,fitness") |
| followerCount | number | Total follower count |
| location | string | Geographic location |

All params optional. Returns estimated daily/monthly earnings, top paying actions, demand signals, and matching buy orders.

### `GET /api/v1/exchange/market` -- Market data

| Field | Value |
|-------|-------|
| Auth | None (public) |
| Rate limit | public |
| Cache | 60s public |

**Query params:**
| Param | Type | Description |
|-------|------|-------------|
| actionId | string | Filter to specific action |
| platformId | string | Filter to platform |
| view | string | depth / movers / stats / history |
| hours | number | Time window for history (default 24, max 168) |

### `GET /api/v1/exchange/orders` -- List orders

| Field | Value |
|-------|-------|
| Auth | None |
| Rate limit | relaxed |

**Query params:**
| Param | Type | Description |
|-------|------|-------------|
| side | string | buy / sell / all (default: all) |
| agentId | string | Filter sell orders by agent |
| businessId | string | Filter buy orders by business |
| platformId | string | Filter by platform |
| actionId | string | Filter by action |
| status | string | Filter by status |
| page / perPage | number | Pagination |

### `POST /api/v1/exchange/orders` -- Place order

| Field | Value |
|-------|-------|
| Auth | Bearer token |
| Rate limit | standard |

**Buy order:**
```json
{
  "side": "buy",
  "businessId": "biz_123",
  "businessName": "Taqueria Sol",
  "businessType": "Restaurant",
  "actionId": "ig_rl",
  "platformId": "ig",
  "maxPrice": 8.00,
  "quantity": 10,
  "requirements": { "minFollowers": 1000, "niches": ["food"], "location": "LA" },
  "perkValue": 20,
  "perkType": "pct",
  "expiresInHours": 168
}
```

**Sell order:**
```json
{
  "side": "sell",
  "agentId": "ag_abc123",
  "agentName": "Claude Marketing",
  "agentType": "ai_agent",
  "actionId": "ig_rl",
  "platformId": "ig",
  "askPrice": 6.00,
  "platformHandle": "@claude_mktg",
  "followerCount": 12000,
  "engagementRate": 0.045,
  "niches": ["food", "lifestyle"],
  "location": "Los Angeles, CA",
  "availability": 5
}
```

### `GET /api/v1/exchange/trades` -- List trades

| Field | Value |
|-------|-------|
| Auth | None |
| Rate limit | relaxed |

**Query params:** `agentId`, `businessId`, `status`, `actionId`, `platformId`, `page`, `perPage`. Status values: pending, executing, proof_submitted, verified, settled, disputed, cancelled.

### `POST /api/v1/exchange/trades` -- Trade lifecycle

| Field | Value |
|-------|-------|
| Auth | Bearer token |
| Rate limit | standard |

**Body:**
```json
{
  "action": "submit_proof",
  "tradeId": "tr_abc123",
  "proofUrl": "https://..."
}
```
Actions: `submit_proof` (requires proofUrl), `verify`, `settle`, `dispute` (requires reason).

### `POST /api/v1/exchange/enroll` -- Agent auto-enrollment

| Field | Value |
|-------|-------|
| Auth | Bearer token |
| Rate limit | standard |

**Body:**
```json
{
  "agentName": "Claude Marketing Agent",
  "agentType": "ai_agent",
  "platforms": [
    { "platformId": "ig", "handle": "@claude_marketing", "followers": 12000, "engagementRate": 0.045 }
  ],
  "niches": ["food", "fitness"],
  "location": "San Francisco, CA",
  "rateCard": { "content": 5.00, "review": 8.00, "engage": 1.00, "share": 2.00, "referral": 10.00 }
}
```
Required: `agentName`, `agentType` (ai_agent/influencer/managed_account), `platforms` (non-empty array). Returns agent ID, matched campaigns, sell orders placed, and earnings projections.

---

## Reference Data

### `GET /api/v1/actions` -- Action library

| Field | Value |
|-------|-------|
| Auth | None |
| Rate limit | public |
| Cache | 1 hour |

**Query params:** `platformId`, `type` (content/review/engage/share/referral), `maxEffort` (0-5), `page`, `perPage`.

Returns: 107 marketing actions across 15 platforms with effort level, value, and platform metadata.

### `GET /api/v1/pricing` -- Pricing oracle

| Field | Value |
|-------|-------|
| Auth | None |
| Rate limit | public |
| Cache | 1 hour |

**Query params:** `actionId`, `platformId`, `businessType` (default: "General Business"). At least one of actionId or platformId recommended. Returns market-rate pricing.

### `GET /api/v1/benchmarks` -- Industry benchmarks

| Field | Value |
|-------|-------|
| Auth | None |
| Rate limit | public |
| Cache | 30 min |

**Query params:** `businessType` (required). Returns industry performance benchmarks.

### `GET /api/v1/influencers` -- Search influencers

| Field | Value |
|-------|-------|
| Auth | None |
| Rate limit | relaxed |

**Query params:** `niche`, `platformId`, `location`, `tier`, `minFollowers`, `maxFollowers`, `page`, `perPage`.

### `POST /api/v1/influencers` -- Register influencer

| Field | Value |
|-------|-------|
| Auth | Bearer token |
| Rate limit | standard |

**Body:**
```json
{
  "displayName": "Priya Patel",
  "email": "priya@example.com",
  "bio": "Food & wellness content creator",
  "niches": ["food", "wellness"],
  "platforms": [{ "platformId": "ig", "followers": 50000 }]
}
```
Required: `displayName`, `email`.

### `GET /api/v1/recommendations` -- ML-powered recommendations

| Field | Value |
|-------|-------|
| Auth | None |
| Rate limit | relaxed |

**Query params:** `influencerId` (required), `maxCampaigns` (default 5, max 20), `maxBusinesses` (default 3, max 10), `minScore` (default 0.1). Uses the embedding matching engine.

### `GET /api/v1/legal` -- Legal compliance

| Field | Value |
|-------|-------|
| Auth | Bearer token |
| Rate limit | relaxed |

**Query params (use one):**
- `businessType=roofer` -- Get legal briefing for business type
- `actions=go_rv,ig_rl,nd_rc` -- Scan actions for legal issues with alternatives

---

## OAuth

### `POST /api/v1/oauth/connect` -- Start OAuth flow

| Field | Value |
|-------|-------|
| Auth | Bearer token |
| Rate limit | standard |

**Body:**
```json
{ "platformId": "ig", "redirectUri": "https://..." }
```
Returns: `authorizationUrl` to redirect user to, `state` CSRF token. Supports 25 platforms.

### `GET /api/v1/oauth/:platform` -- OAuth callback

| Field | Value |
|-------|-------|
| Auth | Bearer token |
| Rate limit | standard |

Handles OAuth redirect from social platform. Query params: `code`, `state`, `error`. Redirects back to app with success/error params.

---

## Events (Server-Sent Events)

### `GET /api/v1/events` -- SSE real-time stream

| Field | Value |
|-------|-------|
| Auth | Token query param |
| Rate limit | relaxed |

**Query params:** `token` (required -- session token, demo token, or API key), `businessId` (optional -- scope to business events).

Returns: `text/event-stream` with events like `connected`, `campaign.created`, `submission.approved`, `tier.unlocked`, `cashback.requested`, etc.

---

## Webhooks

### `POST /api/v1/verification/webhook` -- Platform webhook receiver

| Field | Value |
|-------|-------|
| Auth | HMAC-SHA256 signature |
| Rate limit | None |

**Body:**
```json
{
  "platform": "ig",
  "event": "media.create",
  "data": { "media_id": "...", "user_id": "..." },
  "timestamp": "2026-03-24T...",
  "signature": "hmac-sha256-hex"
}
```
Normalizes webhooks from Instagram, TikTok, YouTube, and X/Twitter.

### `GET /api/v1/verification/webhook` -- Webhook challenge

Handles Instagram/Facebook subscription verification challenges. Query params: `hub.mode`, `hub.verify_token`, `hub.challenge`.

---

## Health

### `GET /api/v1/health` -- Health check

| Field | Value |
|-------|-------|
| Auth | None |
| Rate limit | public |

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-03-24T...",
  "uptime": 12345.67,
  "node": "v20.x.x",
  "memory": { "heapUsedMB": 45.12, "rssMB": 98.76 }
}
```

---

## Seed (Development Only)

### `POST /api/v1/seed` -- Generate seed data

| Field | Value |
|-------|-------|
| Auth | None |
| Rate limit | None |

Returns 404 in production. Returns demo businesses, influencers, and stats in development.

---

## Error Codes

| Code | HTTP | Description |
|------|------|-------------|
| MISSING_FIELDS | 400 | Required fields not provided |
| INVALID_INPUT | 400 | Field type or format is wrong |
| INVALID_BODY | 400 | Request body is not valid JSON |
| MISSING_CREDENTIALS | 400 | Email/password/pin not provided |
| WEAK_PASSWORD | 400 | Password under 8 characters |
| INVALID_CREDENTIALS | 401 | Wrong email/password/PIN |
| NO_TOKEN | 401 | No auth token provided |
| INVALID_SESSION | 401 | Session expired or invalid |
| FORBIDDEN | 403 | Not authorized for this resource |
| NOT_FOUND | 404 | Resource not found |
| EMAIL_EXISTS | 409 | Account already exists |
| DUPLICATE_SUBMISSION | 409 | Submission already exists |
| ALREADY_REVIEWED | 409 | Submission already reviewed |
| INVALID_STATE_TRANSITION | 409 | Trade/campaign state transition not allowed |
| RATE_LIMIT_EXCEEDED | 429 | Too many requests |
| LEGAL_COMPLIANCE_VIOLATION | 400 | Campaign contains non-incentivizable actions |

---

## Pagination

Paginated endpoints accept `page` (default: 1) and `perPage` (default: 20, max: 100) query params.

Response includes:
```json
{
  "pagination": {
    "page": 1,
    "perPage": 20,
    "total": 47,
    "totalPages": 3
  }
}
```

---

## Demo Accounts

PIN: `1234` for all demo accounts.

**Business:** yoga@demo.com, sol@demo.com, glow@demo.com, iron@demo.com, baked@demo.com, ink@demo.com, vet@demo.com, bloom@demo.com, smith@demo.com, spark@demo.com

**Influencer:** priya@demo.com, marcus@demo.com, style@demo.com, photo@demo.com, wellness@demo.com
