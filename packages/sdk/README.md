# @social-perks/sdk

TypeScript client for the Social Perks API. Wraps `/api/v1/*` with typed methods,
auth header handling, timeouts, and error envelope unwrapping.

## Install

```bash
npm install @social-perks/sdk
```

## Usage

```ts
import { SocialPerks } from "@social-perks/sdk";

const sp = new SocialPerks({
  baseUrl: "https://social-perks.example.com",
  apiKey: process.env.SOCIAL_PERKS_API_KEY,
});

// Public endpoints — no auth needed
const pricing = await sp.pricing.estimate({ actionId: "ig_post" });
const actions = await sp.actions.list({ platformId: "instagram", maxEffort: 3 });

// Authenticated
const campaigns = await sp.campaigns.list({ status: "active" });
const created = await sp.campaigns.create({
  actionId: "google_review",
  platformId: "google",
  rewardType: "pct",
  rewardValue: 10,
});
```

## Configuration

```ts
new SocialPerks({
  baseUrl: "https://...",      // required
  apiKey: "sp_live_...",        // optional — alternative to bearerToken
  bearerToken: "...",           // optional — JWT
  fetch: customFetch,           // optional — defaults to globalThis.fetch
  timeoutMs: 30_000,            // optional — request timeout
});
```

## Errors

All methods throw `SocialPerksError` on API failure, with `.code`, `.message`,
`.status`, and `.requestId` populated. Use this for retries and observability.

```ts
import { SocialPerks, SocialPerksError } from "@social-perks/sdk";

try {
  await sp.campaigns.list();
} catch (e) {
  if (e instanceof SocialPerksError) {
    console.error(`[${e.code}] ${e.message} (request: ${e.requestId})`);
  }
}
```

## What's covered

- **Public reference**: `pricing`, `actions`, `benchmarks`, `exchange`
- **Auth required**: `campaigns`, `submissions`, `ai.*`
- **Infrastructure**: `health()`

For the full API surface, see [`/api/v1/openapi`](./../../src/app/api/v1/openapi/route.ts)
or fetch from a deployed instance.
