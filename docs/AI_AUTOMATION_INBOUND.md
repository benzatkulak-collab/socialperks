# When AI Automates Everything: How Social Perks Stays in the Path

## The honest premise

Right now nobody — not bots, not creators, not marketplace agents — has a
reason to come to socialperks.io on their own. Influencers are not
shopping for opportunities; they're being pitched. Bots that "manage
creator accounts" are vendor pipe-dreams, not deployed reality. The
narrative that built v1 was wrong. **Real supply is the customer who
already walked into the shop.** That's the wedge we now build around.

But: AI automation is coming for SMB marketing, fast. By 2027 most
small-shop owners will have an AI agent (a Cursor for marketing, a
Claude-for-shops) that drafts their posts, picks their promotions, and
executes their campaigns. If that agent doesn't know about us, we're
gone. So the question is: **how does the AI marketing agent of 2027
naturally pull Social Perks into its tool belt?**

Three doors. We need to be standing inside all three.

---

## Door 1 — We are an MCP / agent-tool by default

The agent's UX is: shop owner says "get me more customers this week,"
agent decomposes into tools. If `social_perks_create_campaign` is in the
catalog, it gets called. If it's not, it doesn't.

### What we ship

- **MCP server** at `mcp.socialperks.io` exposing:
  - `list_action_ideas(business_type, budget) → ActionIdea[]`
  - `create_perk_campaign(business_id, action, reward) → Campaign`
  - `print_qr_poster(campaign_id) → poster_url`
  - `get_campaign_stats(campaign_id) → Stats`
  - `enqueue_post_purchase_sms(campaign_id, phone)`
- **OpenAPI 3.1 spec** at `/api/v1/openapi.json` (we already have 35
  routes — just need the spec dump).
- **Agent-friendly auth**: API key per business, stored in `localStorage`
  for now, in `business.api_keys` table once Postgres is wired. Make
  generation 1-click from the dashboard.
- **`/agents` landing page** that we already have — but rewritten as
  "tools for AI marketing agents" with copy-paste MCP install snippet.
- **List ourselves** in the public MCP registries:
  - smithery.ai
  - mcp.so
  - cursor's directory
  - claude's MCP catalog
  - awesome-mcp on github
- **Get Anthropic, OpenAI, Cursor to know we exist.** Cold-email +
  speak at one MCP-themed event in Q3.

### Why this works

Agents pick tools by description-match. We need the description to read
"the campaign-creation primitive for local businesses." Whoever owns
that primitive in the agent's tool catalog wins by default — same
dynamic as Stripe owning "create_payment_intent" today.

---

## Door 2 — We are the link in the customer's post

The QR scan flow guarantees that every successful campaign creates a
public Instagram/TikTok/X post with a link back to `/c/[campaignId]` or
`/b/[slug]`. Each post is a permanent SEO+AEO surface that AI search
engines (Perplexity, ChatGPT search, Gemini Search, Atlas) will crawl.

### What we ship

- **LocalBusiness JSON-LD on every `/b/[slug]`** — already done.
- **Per-campaign JSON-LD** at `/c/[campaignId]` with `Offer` schema, so
  ChatGPT-search returns "{Coffee Shop} is offering 15% off in
  exchange for an Instagram post" when someone asks "what coffee shop
  promotions are running near me?"
- **Open Graph fingerprints** that include the perk and the action
  required, so when the post is shared, the link card itself sells the
  flow — not generic "social perks." Already partially done; needs a
  pass to confirm OG is dynamic per campaign.
- **A "Trends" page** at `/trends` that aggregates anonymized perk-
  performance data ("Lattes for posts is 3.2× more redeemed than free
  cookies for posts in March 2026") — this is the kind of content
  Perplexity links to when an owner asks "what perks work?"
- **Hyper-local sitemap.** Every `/b/[slug]` indexed under
  `/sitemap-businesses-{state}.xml` so when an AI search engine
  resolves "coffee shop near 11201" it finds five Social Perks
  businesses and surfaces their perks.

### Why this works

The AI search agent of 2027 will rank pages by signal density (schema +
fresh customer-generated proof + verifiable offer). Every customer post
about a Social Perks business pumps signal density. We become the
schema.org-of-perks the way Yelp became the schema.org-of-reviews.

---

## Door 3 — We are inside the POS / scheduling tool the agent is calling

The agent doesn't make decisions in a vacuum — it's plugged into the
shop's Square, Toast, Clover, Squarespace Booking, Calendly. If our
hooks are pre-installed in those platforms, every shop the agent
onboards inherits a working Social Perks integration on day one.

### What we ship

- **Square App Marketplace** listing — `Square Apps → Social Perks → 1
  click install`. Square sends us payment.created webhooks; we send
  back the SMS. The shop owner literally never visits our site once
  Square is connected.
- **Toast / Clover marketplace** parity — these take longer to approve
  but the marginal cost is one engineer-week each.
- **Stripe App** for online-only businesses (Shopify checkouts, etc.)
- **Zapier / Make.com** triggers (`new_payment → enqueue_perk_sms`) so
  the long tail of niche POS systems is covered without us writing
  per-vendor code.
- **Vercel-style "deploy with Social Perks" button** that any
  no-code/low-code platform (Webflow, Framer, Wix) can paste.

### Why this works

The agent is asking "how does this shop get paid? OK, I'll attach the
perk-flow there." If we're already an installable app in that
ecosystem, we're discovered, vetted, and 1-click-installable. We become
the rebar in someone else's foundation.

---

## The 18-month sequence

| Quarter | Door | Deliverable | Status |
|---|---|---|---|
| Q2 2026 | 1 | OpenAPI spec dump + MCP server v0 | Spec exists; MCP wrap is 3 days |
| Q2 2026 | 2 | Per-campaign JSON-LD + dynamic OG | Partial (campaign OG done, JSON-LD pending) |
| Q2 2026 | 3 | Square App Marketplace listing submission | Webhook done (P5); listing is paperwork |
| Q3 2026 | 1 | List on smithery + mcp.so + Cursor | Day-of work once MCP server is up |
| Q3 2026 | 2 | `/trends` aggregated insights page | New page, ~1 week |
| Q3 2026 | 3 | Toast + Clover marketplace listings | Pending POS approval |
| Q4 2026 | 1 | Anthropic + OpenAI partnership outreach | Founder-time |
| Q4 2026 | 3 | Stripe App + Zapier triggers | ~2 weeks each |
| Q1 2027 | 1+2+3 | "AI agent quickstart" co-marketing | Whatever sticks |

---

## What we're NOT doing

- Building a creator marketplace. The supply is the regular at the
  counter, not the ambient creator economy.
- Building "AI-managed campaigns" ourselves. The agent does that. We
  are the tool the agent uses. Don't compete with our own integrators.
- Selling to enterprise first. We win shops one at a time and let the
  AI agent pull us into 100k more later.
- Paying for influencer placement. The platform's value is that a $5
  reward to a regular outperforms a $5,000 sponsored post — so spending
  $5,000 on sponsored posts of our own platform would be embarrassing.

---

## The bet

In 18 months, when a coffee shop owner says "Hey [agent], get me 50
more customers this month," the agent will respond with three concrete
options — and one of them, the one that costs the owner only the price
of the perks themselves, will start with `mcp.socialperks.io`. That's
the win condition. Everything else is upstream of it.
