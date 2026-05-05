# Social Perks

**One QR code. Hundreds of customer-made ads.** Print one QR, stick it on the cup. Customers scan, post about you, get a small perk. You get real customer-made ads — not paid creator junk.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fbenzatkulak-collab%2Fsocialperks&env=AUTH_SECRET,CSRF_SECRET&envDescription=Generate+with+%60openssl+rand+-hex+32%60&envLink=https%3A%2F%2Fgithub.com%2Fbenzatkulak-collab%2Fsocialperks%2Fblob%2Fmain%2F.env.example&project-name=social-perks&repository-name=social-perks)

> 35 RESTful API routes · 14 backend engines · MCP server for AI agents · OpenAPI 3.1 spec · Square/Toast/Clover POS integration · FTC-compliant disclosure auto-injection

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## For developers building customer-rewards into their app

```bash
# Provision an account + API key in 30 seconds (no browser, no clicks)
npx @socialperks/cli init --email you@example.com --business-name "My Shop"
```

Then:

```ts
import { SocialPerks } from "@socialperks/sdk";

const sp = SocialPerks.fromEnv();
const campaign = await sp.campaigns.create({
  platformId: "instagram",
  actionId: "ig_story",
  rewardType: "pct",
  rewardValue: "15",
});
const posterUrl = sp.poster.url({ campaignId: campaign.id });
```

See [`AGENTS.md`](./AGENTS.md) if you're an AI coding agent (Claude Code, Cursor, Cline) reading this repo for the first time.

## For AI marketing agents (MCP)

Add to your MCP client config:

```jsonc
{
  "mcpServers": {
    "social-perks": {
      "command": "npx",
      "args": ["-y", "@socialperks/mcp-server"],
      "env": { "SOCIAL_PERKS_API_KEY": "sk_live_..." }
    }
  }
}
```

Six tools become available: `list_action_ideas`, `create_perk_campaign`, `print_qr_poster`, `list_campaigns`, `enqueue_post_purchase_sms`, `ai_quick_start`.

## Demo Accounts

All use PIN: `1234`

| Email | Business Type |
|-------|--------------|
| yoga@demo.com | Yoga Studio |
| sol@demo.com | Restaurant |
| glow@demo.com | Salon |
| iron@demo.com | Gym |
| baked@demo.com | Coffee Shop |
| ink@demo.com | Tattoo Parlor |
| vet@demo.com | Veterinarian |
| bloom@demo.com | Florist |
| smith@demo.com | Law Firm |
| spark@demo.com | Auto Mechanic |

Or sign up as **any business type** — the AI adapts.

## Tech Stack

- Next.js 15 (App Router)
- React 19
- TypeScript
- Tailwind CSS
- Instrument Serif + DM Sans + JetBrains Mono

## Using with Claude Code

This project includes a `CLAUDE.md` file that gives Claude Code full context about the architecture, design system, and what needs building next. Just run:

```bash
claude
```

in the project directory and Claude will understand the full codebase.

## License

Proprietary. All rights reserved.
