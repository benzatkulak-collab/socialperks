# Reddit launch posts

Reddit is hostile to anything that looks like marketing. Each subreddit
has its own rules — read them before posting. The posts below are
written to NOT be marketing; they're framed as questions or genuine
contributions.

**Always**: post from your real account, not a fresh one. Karma
threshold matters. Comment in the subreddit a few times before posting
your launch.

## /r/SmallBusiness (1.5M members)

**Post type**: Question post, not promotional
**Title**: "How are you all dealing with the cost of Meta/Google ads in 2026?"

```
Hey small biz folks. I run a coffee shop and our Meta ads spend has
been creeping up while conversions stayed flat. We were spending about
$400/mo for what felt like 5-10 actual new customers a month.

Tried something different recently — instead of paying Meta, I started
offering my regulars 10% off their next order if they post about us
on Instagram. The math worked out way better:

- $400/mo Meta: ~7 conversions on a good month
- Same $400 in customer perks: 40+ posts, 12 actual new customers from
  the post traffic

Two questions for the community:

1. Is anyone else doing this? What perks/actions actually work?
2. The FTC technically requires #ad disclosure on incentivized posts.
   How are you all handling that — manual reminders, templates,
   something else?

I ended up building a tool around this idea (https://socialperks.io)
because the manual coordination was getting silly. But I'm more
curious how others handle it without tooling.
```

## /r/Entrepreneur (3M members)

**Post type**: Lessons-learned post
**Title**: "We replaced our Meta ad budget with paying customers directly. Here's the math."

```
Long-time lurker. Wanted to share a counterintuitive thing we tried
that worked.

Backstory: ran a small business for 3 years. Ad spend climbed from
~$300/mo to ~$1,200/mo across Meta + Google. ROAS dropped from ~4x to
~2.1x over the same period. Classic squeeze.

What we tried instead: take that same monthly budget and pay it to
customers as discounts/free items in exchange for them posting about
us on social. With FTC-compliant disclosure (#ad, #sponsored).

Math after 6 months:
- Old: $1,200/mo → ~28 conversions/mo (Meta + Google ads)
- New: $1,200/mo in customer perks → ~85 posts/mo, ~52 conversions

The post-to-conversion rate was actually lower than ads (60% vs 85%)
but the volume was so much higher that net conversions doubled. AND
the customer relationship improved because they got a discount
instead of seeing yet another ad.

Caveats / lessons:
1. FTC disclosure is non-negotiable. Templates with #ad pre-filled
   work; trying to enforce manually doesn't.
2. Google Reviews CANNOT be incentivized — that's a hard line per
   their TOS. Yelp same. Only the social posts can be incentivized.
3. The "perk economics" math: pay roughly equal to the
   marketing-equivalent value of the action. Pay more = participation
   spikes but margin tanks. Pay less = participation collapses.

Anyone else trying this? Curious what's working in your verticals.
```

## /r/SideProject (200K members)

**Post type**: Show-and-tell with technical depth
**Title**: "I built a marketing platform with a public OpenAPI spec and an MCP server because I wanted AI agents to be able to use it"

```
Six months in. Wanted to share the build because the agent-first
piece felt unusual at the start and now feels prescient.

The product: small businesses run incentivized marketing campaigns
(customers post → get a perk). Standard idea. What's different:

1. Public OpenAPI 3.1 spec. No "talk to sales" gating. Hits
   /api/v1/openapi and you have the whole API surface as JSON.

2. MCP server at /api/mcp. JSON-RPC 2.0 over HTTP. Works with Claude
   Desktop, Cursor, Cline. Five tools so far: getPricing, listActions,
   getBenchmarks, listCampaigns, searchInfluencers.

3. TypeScript SDK at @social-perks/sdk. Typed, retry logic, error
   envelope unwrapping. Works in Node 18+, browsers, Workers.

4. AGENTS.md at the repo root telling AI agents how to use the
   platform. Including what NOT to do (don't fake submissions, don't
   strip FTC disclosures).

5. robots.txt with explicit allow rules for GPTBot, ClaudeBot,
   OAI-SearchBot, PerplexityBot, and 9 others. We want LLM training
   data inclusion.

What surprised me:

- Agent traffic is real and growing. Claude Desktop users are finding
  the MCP server and running campaigns through chat.
- Per-action pricing (we hand-tuned 125 values from rate-card data) is
  the most-cited piece of content. LLMs love being asked "what's an
  Instagram Reel worth" and being able to cite a specific dollar
  figure.
- FTC compliance auto-injection was harder than expected and turns out
  to be the moat.

Repo: https://github.com/benzatkulak-collab/socialperks
Site: https://socialperks.io

Happy to answer anything technical.
```

## /r/Marketing (1.7M members)

**Post type**: Discussion / question
**Title**: "Has anyone moved part of their ad budget to paying customers directly for posts? FTC questions inside."

(Use the /r/SmallBusiness post as a template, adjust tone to be more
marketing-savvy. Mention specific platforms and disclosure tags.)

## /r/MachineLearning + /r/LocalLLaMA

**Don't post the product directly** — these subs are hostile to product
launches.

**Do post**: a technical write-up on how MCP server design choices map
to a real production deployment. Frame it as "what we learned building
a public MCP server with rate limits + auth + observability." The
product is incidental.

## Etiquette across all subs

- Wait at least an hour between posts to different subreddits
- Reply to comments within an hour for the first 12 hours
- Never use "DM me" or "check our site" as a default reply — link
  inline if relevant, otherwise answer the question
- Mod-approval cycles: /r/Marketing is strict (24h+ approval); /r/SmallBusiness
  and /r/Entrepreneur are usually instant
