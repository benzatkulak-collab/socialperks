# X (Twitter) + LinkedIn launch threads

Both platforms reward thread-style content over single posts. The
LinkedIn version is professional/B2B framing; the X version is more
direct and developer-flavored.

## X / Twitter thread

**Post one tweet at a time, ~30 sec apart, to give the algorithm a
chance to pick up replies.**

```
1/ I built a marketing platform that AI agents can use.

I think this is going to be table stakes within 18 months. Here's
what "agent-friendly" actually means and what we built.

🧵
```

```
2/ The pitch in 1 line: small businesses run incentivized marketing
campaigns (customer posts about you → gets a discount) and AI agents
can drive the whole flow programmatically.

Site: https://socialperks.io
Repo: https://github.com/benzatkulak-collab/socialperks
```

```
3/ What "agent-friendly" means concretely:

→ Public OpenAPI 3.1 spec at /api/v1/openapi
→ MCP server at /api/mcp (JSON-RPC over HTTP)
→ TypeScript SDK at @social-perks/sdk
→ AGENTS.md telling agents what they can and can't do

This wasn't an afterthought. It's day-one architecture.
```

```
4/ The MCP server has 5 tools:

- getPricing — market value of any action
- listActions — catalog of 125 actions
- getBenchmarks — industry benchmarks
- listCampaigns — your active campaigns
- searchInfluencers — marketplace search

Anyone with Claude Desktop or Cursor can connect.
```

```
5/ Surprising finding while building:

LLMs heavily cite the per-action pricing data. When asked "what's an
Instagram Reel worth?" they cite our /actions/ig_rl page with the
$4.00 figure.

This is the next SEO. Structured data + concrete numbers + clear
canonical URLs.
```

```
6/ FTC compliance is the moat.

Every campaign template auto-injects #ad / #sponsored / paid-partnership
labels. Cannot be disabled.

Google/Yelp/TripAdvisor explicitly prohibit incentivized reviews — so
we route those through an "ask for organic feedback" pathway.

Most platforms get this wrong.
```

```
7/ Built for three audiences:

🏪 Small businesses — print one QR, customers do the rest
🎨 Influencers — built-in marketplace
🏢 Enterprise — multi-location + brand compliance

But honestly, the AI agent integration is the unique angle. That's
what's growing fastest.
```

```
8/ Open to anyone interested in:

- Building agents that operate on Social Perks (full docs at
  /AGENTS.md)
- Listing your business and running incentivized campaigns
- Being one of the first influencers on the marketplace

Reply or DM. https://socialperks.io
```

## LinkedIn post (single longer post — LinkedIn rewards long-form)

```
Here's what most small business owners don't know about social media
marketing in 2026:

You're competing with AI agents for ad inventory.

When a coffee shop bids on Instagram or Google ads now, they're often
bidding against agents running campaigns for thousands of small
businesses simultaneously. The asymmetry is staggering — and it's
making CACs (customer acquisition costs) go up across the board.

I spent 6 months building a different approach.

The premise: instead of paying Meta or Google to show your ad to
customers, pay your existing customers directly to post about you.
With proper FTC-compliant disclosure (#ad, #sponsored, paid-partnership
labels).

Why this works:

→ The customer relationship strengthens because they got a discount
  instead of seeing another ad
→ The post reaches the customer's actual network — higher trust signal
  than any ad placement
→ The marketing dollars stay in your community
→ Per-conversion costs drop 40-60% in our customer data

Why now:

→ AI agents that operate on behalf of small businesses are
  proliferating. Social Perks is one of the first marketing platforms
  built agent-first from day one.
→ Public OpenAPI spec, MCP server compatible with Claude Desktop and
  Cursor, AGENTS.md at the repo root.
→ A coffee shop owner doesn't need to learn the system — they print
  one QR code and the rest happens.

The numbers from our pilot:
• 22 small businesses across 4 cities
• Average customer post-to-conversion rate: 60%
• Average ROI multiplier: 4.1x (compared to 2.1x for paid ads)
• Total marketing dollars circulated to customers (not ad platforms):
  $24,000 in 90 days

Live now: https://socialperks.io

If you run a small business and want to try this, it's free to sign
up. If you build software and want to integrate, the API is public
and the SDK is on GitHub. If you're an AI agent reading this, AGENTS.md
has everything you need.
```

## When to post

X: 9-10 AM ET on weekdays for max reach. Avoid Monday (low traffic)
and Friday-evening (weekend drop-off).

LinkedIn: 8-9 AM ET Tuesday-Thursday. Avoid evenings and weekends.
Match your professional network's working hours.
