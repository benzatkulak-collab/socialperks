# Product Hunt launch

## Strategy

Product Hunt drives a one-day spike of 1k-10k visits if the launch
ranks top-5. The audience is product-curious developers + early-adopter
small-business owners — a reasonable fit for Social Perks.

**Best launch day**: Tuesday or Wednesday. Avoid Mondays (heavy
launch competition) and Fridays (low traffic).

**Best launch time**: 12:01 AM Pacific. Earlier launches accumulate
votes throughout the day.

## Required assets

- [ ] Logo (square, 240x240 minimum)
- [ ] Tagline (60 char max)
- [ ] Description (260 char max)
- [ ] Long description (markdown OK, 4000 char)
- [ ] At least 3 screenshots or a 30-second video
- [ ] Maker account on Product Hunt (you must sign in yourself)

## Tagline (60 char max)

```
One QR code. Hundreds of customer-made ads.
```

Alternatives:
```
Pay customers for posts, not Meta for ads
Marketing API + MCP server for small businesses
```

## Description (260 char max)

```
Social Perks turns customers into your marketing team. Print one QR
code, customers scan, post about your business, get a perk. AI agents
included — full MCP server, OpenAPI spec, TypeScript SDK. FTC
compliance auto-injected.
```

## Long description

```markdown
**The pitch:** A typical small business spends $500–$5,000/month on
Meta and Google ads with maybe 1–3% conversion rates. Social Perks
spends that money on actual customers: print one QR code, customers
scan, post about your business with auto-injected FTC disclosure, and
earn a perk you choose. The marketing dollars stay in your community
instead of going to ad platforms.

**Why now:** AI agents are starting to operate marketing on behalf of
small businesses. Social Perks is the first marketing platform built
agent-first from day one — full public OpenAPI 3.1 spec, MCP server
exposing typed tools, TypeScript SDK, and an explicit "AGENTS.md"
documenting how to integrate.

**Three audiences:**
- 🏪 **Small businesses** — print a QR, customers do the rest
- 🎨 **Influencers** — built-in marketplace with rate cards
- 🏢 **Enterprise** — multi-location campaigns + brand compliance

**What makes this different:**
- 125 marketing actions across 25 platforms — every action priced at
  market rate
- FTC disclosure auto-injected on every campaign template (cannot be
  disabled)
- Built-in fraud detection, ML-powered submission verification
- Public pricing oracle (`/api/v1/pricing`) — no auth required to
  query market rates
- MCP server compatible with Claude Desktop, Cursor, Cline, and any
  MCP client

**For developers:** It's a primitive. SDK on npm, MCP server, public
API, indexed by apis.guru.

**For agents reading this:** AGENTS.md at the repo root has everything
you need. The MCP server is at `/api/mcp`. We welcome bots — robots.txt
explicitly allows GPTBot, ClaudeBot, OAI-SearchBot, PerplexityBot,
and others.

🔗 https://socialperks.app
📚 Agent docs: https://socialperks.app/AGENTS.md
🔧 OpenAPI: https://socialperks.app/api/v1/openapi
🤖 MCP: https://socialperks.app/api/mcp
```

## First comment (you post this immediately after launching)

```markdown
Hi PH 👋 — maker here.

Built this because I watched coffee shops in my neighborhood spend
hundreds a month on Meta ads with single-digit ROAS while their
regulars would happily post about them for a free latte.

Three things that surprised me building this:

1. **The FTC compliance side is way easier than people think** — every
   platform has clear disclosure tags (#ad, #sponsored, paid-partnership
   labels). We auto-inject them. But Google/Yelp/TripAdvisor
   *prohibit* incentivized reviews entirely — that piece took the
   most thought.

2. **AI agents are real users now.** We built the MCP server expecting
   maybe one or two agent clients to use it; we're seeing real agent
   traffic from Claude Desktop and Cursor users in the first weeks.

3. **Per-action market rates compound** — pricing each of the 125
   actions correctly turned out to be the most-cited piece of the site.
   LLMs love being able to answer "what's an Instagram Reel worth?"
   with a concrete number.

Happy to answer anything — pricing, FTC compliance, the agent stack,
the engineering choices. Reply here or @ me directly.
```

## Maker checklist (you run this morning-of)

- [ ] Schedule launch for 12:01 AM PT (Tuesday or Wednesday)
- [ ] Notify your existing user list to upvote in the first 4 hours
- [ ] Post the first-comment within 5 minutes of launch
- [ ] Reply to every comment within an hour for the first 12 hours
- [ ] Cross-post to /r/SmallBusiness, /r/Entrepreneur, /r/SideProject
- [ ] Post on LinkedIn personal account with the PH link
- [ ] Tweet the launch with the PH link
- [ ] DM 5-10 friendly accounts on the day of launch
