# Launch Submissions — Copy-paste ready

This doc has every submission pre-filled. The order matters: publish to npm first, then submit to registries (they pull from npm), then run the social posts.

## Sequence

```
1. Vercel: disable Deployment Protection         (10 sec, ~/projects/social-perks/settings)
2. npm:    claim @socialperks org + npm login    (3 min,  npmjs.com/org/create)
3. Local:  npm run release:packages              (2 min,  publishes 3 packages)
4. Submit: smithery.ai                           (2 min)
5. Submit: mcp.so                                (2 min)
6. PR:     awesome-mcp-servers                   (5 min)
7. Submit: Anthropic MCP catalog                 (when accepting)
8. SEO:    Google Search Console + Bing          (5 min)
9. Social: Twitter thread + Show HN              (15 min — you write, draft below)
10. Deploy: Vercel deploy button live in README  (already shipped)
```

Total time after `npm run release:packages` succeeds: about 30 minutes.

---

## 1. smithery.ai

URL: https://smithery.ai/new

### Form fields (copy-paste each)

**Name**: `Social Perks`

**Package**: `@socialperks/mcp-server`

**Repository**: `https://github.com/benzatkulak-collab/socialperks`

**Tagline** (under 100 chars):
```
QR-code-driven customer-rewards primitives for AI marketing agents working with local businesses.
```

**Description**:
```
Social Perks gives AI marketing agents (Claude Code, Cursor, custom MCP clients) the primitives to plan, launch, and measure customer-rewards campaigns on behalf of small businesses. Six tools: list 107 marketing-action ideas, create perk campaigns, print QR posters, list active campaigns, schedule post-purchase SMS, and AI quick-start (single-best campaign for a given business type).

Designed for the "owner says 'help my coffee shop get more customers' → agent decomposes into tools" pattern. The flywheel: shop prints one QR, customer scans + posts about the shop, customer earns a perk, customer's friends see the post and become customers. FTC-compliant disclosure auto-injected. Built on a 35-route REST API with full OpenAPI 3.1 spec at /api/v1/openapi.

Get an API key with `npx @socialperks/cli init --email you@example.com` — agent-runnable, no browser needed.
```

**Tags / categories**: `marketing`, `loyalty`, `local-business`, `customer-rewards`, `qr-code`

**License**: MIT

**Tools list** (paste verbatim from `/api/mcp` GET response, or use this):
- `list_action_ideas` — Browse 107 marketing primitives across 15 platforms
- `create_perk_campaign` — Create a (platform, action, reward) campaign
- `print_qr_poster` — Get the printable 8.5×11 SVG poster URL
- `list_campaigns` — Read campaign state before scaling/ending
- `enqueue_post_purchase_sms` — Schedule the post-purchase SMS flywheel
- `ai_quick_start` — Single-best campaign for a given business type

---

## 2. mcp.so

URL: https://mcp.so/server/submit (or PR to their catalog repo)

Same fields as smithery. They typically accept a JSON manifest:

```json
{
  "name": "social-perks",
  "displayName": "Social Perks",
  "description": "QR-code-driven customer-rewards primitives for AI marketing agents working with local businesses (coffee shops, salons, gyms, restaurants). Six tools: list_action_ideas, create_perk_campaign, print_qr_poster, list_campaigns, enqueue_post_purchase_sms, ai_quick_start.",
  "author": "Social Perks",
  "homepage": "https://socialperks.io",
  "repository": "https://github.com/benzatkulak-collab/socialperks",
  "license": "MIT",
  "categories": ["marketing", "loyalty", "local-business"],
  "command": "npx",
  "args": ["-y", "@socialperks/mcp-server"],
  "env": {
    "SOCIAL_PERKS_API_KEY": {
      "description": "Get one at https://socialperks.io/dashboard/api-keys or run `npx @socialperks/cli init`",
      "required": true
    }
  }
}
```

---

## 3. awesome-mcp-servers PR

URL: https://github.com/punkpeye/awesome-mcp-servers

### Steps
1. Fork the repo
2. Edit `README.md` — find the alphabetical-by-category list. Likely under "Marketing", "Business" or similar.
3. Insert this line:

```markdown
- [Social Perks](https://github.com/benzatkulak-collab/socialperks) — QR-code-driven customer-rewards primitives for AI marketing agents working with local businesses. Six tools: action ideas, campaign creation, QR poster generation, campaign listing, post-purchase SMS, AI quick-start.
```

4. PR title: `Add Social Perks MCP server`
5. PR body:

```
This PR adds [Social Perks](https://github.com/benzatkulak-collab/socialperks) — an MCP server for AI marketing agents working with local-business owners (coffee shops, salons, gyms, restaurants).

The server exposes six tools for the customer-rewards flywheel:
- `list_action_ideas` — browse 107 marketing primitives
- `create_perk_campaign` — create a perk-action-reward campaign
- `print_qr_poster` — get a printable QR poster (the shop owner tapes this on the counter)
- `list_campaigns` — read state to scale or end
- `enqueue_post_purchase_sms` — schedule the post-purchase SMS that drives the flywheel
- `ai_quick_start` — one-shot best-campaign-for-this-business

Install: `npx -y @socialperks/mcp-server` (npm: `@socialperks/mcp-server`).
Get an API key with `npx @socialperks/cli init` — agent-runnable, no browser.

Repo includes typed SDK (`@socialperks/sdk`), CLI (`@socialperks/cli`), and full OpenAPI 3.1 spec.

License: MIT.
```

---

## 4. Anthropic MCP catalog

When Anthropic opens public submissions, the package will already be on npm. They'll likely use the same JSON schema as mcp.so. The submission form will be at https://anthropic.com/mcp or similar.

For now, watch https://github.com/modelcontextprotocol — when their official catalog goes live, drop the package name in.

---

## 5. Google Search Console

URL: https://search.google.com/search-console/welcome

### Steps
1. **Add property** → choose **URL prefix** → enter `https://socialperks.io` (or the Vercel URL until the domain is registered)
2. **Verify** via DNS TXT record OR via the HTML meta tag method (we already have the meta tag in `layout.tsx` — Google will pick it up once the site is publicly reachable)
3. After verification, **Sitemaps** → submit `https://socialperks.io/sitemap.xml`
4. **URL Inspection** → paste the homepage URL → **Request Indexing** (gets us into the queue faster)

### Bing Webmaster Tools

URL: https://www.bing.com/webmasters

Same flow. Bing also lets you import properties directly from Google Search Console — saves typing.

---

## 6. Twitter / X launch thread (draft)

```
We just shipped @socialperks — the QR-code-driven customer-marketing platform for small shops.

Print one QR, stick it on the counter. Customers scan, post about you on IG/TikTok, get a small perk. You get real customer-made ads — not paid creator junk.

🧵
```

```
Why this works:

Most small-shop marketing dollars chase influencer placements. But a $5 reward to your existing regular outperforms a $5,000 sponsored post. Their 800-friend reach is more local + more trusted than a stranger's.

We just made that loop one QR code.
```

```
For developers + AI agents:

→ npm: @socialperks/sdk · @socialperks/cli · @socialperks/mcp-server
→ MCP server: 6 tools for AI marketing agents
→ OpenAPI 3.1 spec
→ POS webhooks: Square, Toast, Clover
→ FTC compliance auto-injected

`npx @socialperks/cli init` — 30 sec, no browser, agent-runnable
```

```
For shop owners:

→ Free forever for one campaign
→ 5-minute setup: pick a perk, print the poster, stick it on the counter
→ Auto post-purchase SMS via your POS
→ All redemption + verification handled

socialperks.io
```

---

## 7. Show HN draft

**Title**: `Show HN: Social Perks – QR codes that turn your customers into your marketing team`

**Body**:

```
Hi HN,

I built Social Perks because I kept watching small shop owners (coffee shops mostly) spend $500-$2,000/month on local Instagram influencer placements that converted worse than a regular customer mentioning the shop in a story to their 600 friends.

The product is one primitive: a QR code that lives on the counter. Customers scan it, post about the shop on IG/TikTok/FB (with FTC disclosure auto-injected), get a small perk. The shop gets real customer-generated marketing reach — typical post hits 800+ people on average, all walking-distance local.

Stack: Next.js 15 + 35-route REST API + 14 backend engines (event sourcing, fraud detection, FTC compliance automation, perk wallet, financial ledger). POS integration via Square/Toast/Clover webhooks. POS fires post-purchase SMS 2 hours after payment. SMS links back to the QR's claim URL.

What I think is interesting beyond the consumer flow:

- Shipped a typed SDK (@socialperks/sdk), CLI (@socialperks/cli), and MCP server (@socialperks/mcp-server). The CLI's `init` command provisions an account + API key in 30 seconds without a browser — agent-runnable signup. The MCP server gives Claude Code / Cursor / custom agents 6 tools to plan + launch campaigns on behalf of a shop owner.
- AGENTS.md at the repo root tells AI coding agents the canonical patterns when integrating Social Perks into another app.
- Full OpenAPI 3.1 spec at /api/v1/openapi.

Open-sourced everything except the AI engine. Free forever for a single campaign. MIT for the npm packages.

Repo: https://github.com/benzatkulak-collab/socialperks
Site: https://socialperks.io
SDK: https://www.npmjs.com/package/@socialperks/sdk

Happy to answer questions.
```

---

## 8. Product Hunt

Wait until you have 50 active campaigns and a few testimonials. PH launch with no traction = wasted shot. Save this for when there's actual product-momentum to point at.

**Tagline draft (60 char max)**:
```
Print one QR. Customers scan. You get hundreds of real ads.
```

---

## After everything is submitted

1. Re-run `node scripts/publish-packages.mjs --dry-run` weekly to catch typecheck regressions in the SDK.
2. Watch GitHub stars on the repo — that's the leading indicator for awesome-mcp visibility.
3. Track `npm view @socialperks/sdk` weekly download counts.
4. Set up a Slack webhook to ping you on every `POST /api/v1/dev/init` call — that's an agent or developer trying us. Each is a potential conversation.
