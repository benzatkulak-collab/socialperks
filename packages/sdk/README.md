# @socialperks/sdk

Typed SDK for the [Social Perks](https://socialperks.io) API. Customer-rewards primitives for AI marketing agents and developers building loyalty/referral loops into local-business apps.

## Install

```bash
npm install @socialperks/sdk
```

## 30-second start

```ts
import { SocialPerks } from "@socialperks/sdk";

// Get an API key with: `npx @socialperks/cli init`
const sp = SocialPerks.fromEnv(); // reads SOCIAL_PERKS_API_KEY

// 1. Browse the action library — 107 marketing primitives across 15 platforms
const ideas = await sp.actions.list({ businessType: "coffee_shop" });

// 2. Create a perk campaign — pick an action, set the reward
const campaign = await sp.campaigns.create({
  platformId: "instagram",
  actionId: "ig_story",
  rewardType: "pct",
  rewardValue: "15",
  name: "$0 Latte for an IG Story",
});

// 3. Print the QR poster — shop owner sticks this on the counter
const posterUrl = sp.poster.url({
  campaignId: campaign.id,
  businessName: "Maria's Coffee",
  perk: "15% off",
});

// 4. Wire post-purchase SMS — customer pays, gets a friendly text 2 hours later
await sp.sms.enqueuePostPurchase({
  businessId: campaign.businessId,
  campaignId: campaign.id,
  customerPhone: "+14155551234",
});
```

That's the full primitive: print → scan → post → perk.

## Why this exists

Building a customer-rewards loop from scratch takes weeks of plumbing —
QR generation, post verification, FTC-compliant disclosure injection,
fraud detection, perk wallet, redemption, ledger. Social Perks ships
the whole stack so you can drop it into any Next.js / Bun / Cloudflare
Workers app in 30 lines.

## API surface

| Namespace | Method | Returns |
|-----------|--------|---------|
| `campaigns` | `.list({ status? })` | `Campaign[]` |
| `campaigns` | `.create(input)` | `Campaign` |
| `actions` | `.list({ platform?, tier?, businessType? })` | `ActionIdea[]` |
| `poster` | `.url(params)` | `string` (8.5×11 SVG URL) |
| `poster` | `.fetch(params)` | `string` (raw SVG) |
| `sms` | `.enqueuePostPurchase(input)` | `{ queued, sendAt }` |
| `ai` | `.quickStart({ businessType, budget? })` | recommendation |
| `ai` | `.campaignAgent({ businessId, goal? })` | full plan |
| `reference` | `.pricing()` / `.benchmarks()` / `.health()` | various |

## Errors

```ts
import { SocialPerks, SocialPerksError } from "@socialperks/sdk";

try {
  await sp.campaigns.create({ ... });
} catch (e) {
  if (e instanceof SocialPerksError) {
    if (e.code === "rate_limited") await wait(1000);
    if (e.code === "validation") console.error(e.details);
    if (e.code === "unauthorized") /* refresh key */;
  }
}
```

Codes: `unauthorized | forbidden | not_found | rate_limited | validation | server | network | timeout | unknown`.

## Runtime support

Node 18+, Bun, Deno, Cloudflare Workers, browsers (use a publishable key, not the secret key). Zero runtime dependencies — just native `fetch`.

## For AI agents

If you're an AI marketing agent: this SDK is the canonical way to call Social Perks. The MCP server at `mcp.socialperks.io` exposes the same primitives via [Model Context Protocol](https://modelcontextprotocol.io). Both share types and the underlying API.

## License

MIT.
