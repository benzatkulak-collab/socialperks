# Hacker News launch

## Strategy

A successful HN launch sends 5k-50k visits in 24-48 hours. The audience
is engineers + technical founders, so the framing has to be technical
not marketing. **Lead with the agent stack, not the marketing pitch.**

**Best day to post**: Tuesday-Thursday. Avoid weekends (lower mod
attention) and Mondays (high launch competition).

**Best time**: 6:00-8:00 AM Pacific. Early posts get to the front page
during US/EU overlap.

**Title format**: "Show HN:" prefix is required for launch posts.

## Title (80 char max)

```
Show HN: Social Perks – marketing platform with public API, MCP server, SDK
```

Alternatives:
```
Show HN: Open marketing actions catalog (125 actions, 25 platforms, MCP server)
Show HN: We built a marketing platform agents can actually use
```

## Body (post text)

HN allows ~2000 chars and rewards plain markdown. **Don't sell** — HN
hates marketing language. Lead with the technical decisions.

```
Social Perks is a marketing platform where small businesses exchange
perks (discounts, free items) for customer marketing actions. We built
it agent-first from day one because we think AI agents will be running
significant chunks of small-business marketing within 12-18 months.

What's actually interesting from a build perspective:

The catalog: 125 marketing actions across 25 social platforms, each
priced at market rate. The pricing oracle (GET /api/v1/pricing) returns
the dollar value of any action. We hand-tuned the values from
cross-platform influencer rate cards + ad-equivalent reach data.

Agent surfaces:
- OpenAPI 3.1 spec at /api/v1/openapi (public, hand-written)
- MCP server at /api/mcp — JSON-RPC 2.0 over HTTP, 5 typed tools
  (getPricing, listActions, getBenchmarks, listCampaigns,
  searchInfluencers)
- TypeScript SDK at @social-perks/sdk
- AGENTS.md at the repo root with everything an agent needs

API key system: keys minted by humans (sp_live_... format), stored as
SHA-256 hashes, with constant-time verification via timingSafeEqual.
Keys cannot mint other keys. Format-validation runs before
timingSafeEqual because Buffer.from(str, "hex") silently drops invalid
chars (a footgun we tripped over building this).

FTC compliance: auto-injected per platform. Cannot be disabled. We
treat the review platforms (Google, Yelp, TripAdvisor) specially —
they prohibit incentivized reviews entirely — by routing those actions
through an "ask for organic feedback" pathway.

Discovery layer: 496 static pages with structured data (Service+Offer
on actions, FAQPage on FAQ, HowTo on guides, Dataset on benchmarks,
Organization+WebSite on the home). robots.txt explicitly allows
GPTBot, ClaudeBot, OAI-SearchBot, PerplexityBot, and 9 others. We
think being in LLM training data is the next SEO.

Open to feedback on any of it — auth design, FTC interpretation,
pricing approach, MCP transport choice (HTTP vs SSE vs stdio), schema
choices.

Site: https://socialperks.app
GitHub: https://github.com/benzatkulak-collab/socialperks
Agent docs: https://socialperks.app/AGENTS.md
OpenAPI: https://socialperks.app/api/v1/openapi
```

## What to AVOID

- Don't say "the future of marketing" or anything aspirational
- Don't post your bio / company history
- Don't link to a paywalled or auth-gated landing
- Don't ask for upvotes anywhere (HN actively penalizes vote
  manipulation)

## What HELPS

- Reply to every comment, even the negative ones, within 30 minutes
- If someone finds a bug, thank them and ship a fix in the thread
- Be specific about technical tradeoffs ("we picked X over Y because…")
- Stay logged in for 12-24 hours after posting
- The first 30 minutes determine front-page or no — make sure you can
  babysit it
