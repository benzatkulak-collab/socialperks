# Announcement Posts — Drafts Ready to Publish

Three audiences, three tones. Each draft is meant to be pasted into
the target platform with minor edits — proper-noun checks, a screenshot
if you have one, a final tweak to match your voice.

The goal isn't to "go viral." It's to put the platform in front of
the ~500 people who would actually build with an agent-native marketing
API. HN/dev.to/Discord do that better than X for technical audiences.

---

## 1. Hacker News — Show HN draft

**Suggested submission title (must be ≤80 chars):**

```
Show HN: Social Perks – Agent-native marketing API with OAuth-style key issuance
```

**Submission URL:** `https://github.com/benzatkulak-collab/socialperks`
(or `https://socialperks.app/api/mcp` if you want the MCP endpoint
to be the click target)

**First comment** (post immediately after submitting — HN expects the
author's context as the top reply, not in the post body):

```
Author here. Quick context on what this is and why it might be
interesting:

Social Perks is a marketing platform for small businesses — independent
coffee shops, restaurants, salons. Customers post about the business
on Instagram / TikTok / Facebook in exchange for a perk (free latte,
15% off, etc.). The business gets word-of-mouth marketing instead of
paying for ads.

What I built that I think is worth sharing: it's fully agent-native.

* MCP server at /api/mcp with both read tools (pricing, action
  catalog, benchmarks) and write tools (createCampaign, submitProof,
  reviewSubmission, getCampaignStats).
* OAuth-style key issuance at /agent/authorize: agent directs user to
  a consent screen, user approves scopes (read.campaigns,
  write.campaigns, etc.), agent exchanges the resulting authorization
  code for a scoped API key. RFC 6749 close enough that off-the-shelf
  clients work.
* Every tools/call response carries a _meta block with cost model
  (free / plan-counted / cash-moving), rate-limit remaining, and
  duration. Agents can budget before invoking and verify after.
* Users see what each agent has done on their behalf at
  /dashboard/agents — full audit trail per API key.

The thing I had to figure out that wasn't obvious from the MCP spec:
CSRF is correct for cookie-bound browser sessions but actively
hostile to API-key callers (no browser, no cookies). The MCP server
sees Authorization: Bearer sp_... or x-api-key and bypasses CSRF
explicitly. Standard pattern in SaaS APIs but worth saying out loud
because the MCP examples I started from didn't address it.

Example agents (TypeScript + bash) are in /examples. The TypeScript
one is ~200 lines, no external deps, runs end-to-end against the
production endpoint.

Happy to take feedback on the OAuth shape, the cost-meter design, or
the trust model in general. The platform is live and I'm onboarding
the first batch of users by hand right now, so very interested in
how it lands with people who'd actually build with it.

Endpoint: https://socialperks.app/api/mcp
Manifest: GET the same URL
Repo: https://github.com/benzatkulak-collab/socialperks
Docs: https://github.com/benzatkulak-collab/socialperks/blob/main/AGENTS.md
```

**Timing:** HN traffic is highest 7-10am PT on weekdays. Submit
around 7:30am PT Tuesday-Thursday for the best chance of front page.

**Don't:**
- Don't ask for upvotes anywhere (Discord, X, etc.) — HN flags this
- Don't use exclamation marks or marketing language in the title
- Don't re-submit if the first attempt flames out — wait a week

---

## 2. dev.to — Long-form technical writeup

**Title:**

```
Building an OAuth-style key issuance flow for AI agents
```

**Tags:** `#ai` `#agents` `#typescript` `#oauth` `#mcp`

**Cover image suggestion:** A simple terminal screenshot of the
OAuth handshake (consent URL → "✓ Authorized" → API key minted).
Skip if you don't have one — dev.to renders fine without.

**Body:**

```markdown
AI agents that "do things" for users need a way to authenticate that
isn't "the user pastes an API key from a dashboard." That UX is fine
for developers; it's hostile for everyone else. If your agent's user
is a small-business owner, you've already lost them at "open the
developer settings page."

I just shipped a working version of the better pattern for
[Social Perks](https://socialperks.app), a marketing platform for
small businesses. The agent flow looks like this:

1. The agent navigates the user to a consent URL on the platform:
   `/agent/authorize?agent_name=...&scope=...&redirect_uri=...&state=...`
2. User signs in (if not already), sees plain-English scope
   descriptions, clicks Approve.
3. Server mints a scoped API key bound to the user's account,
   stashes a single-use 60-second authorization code mapped to the
   plaintext, redirects to the agent's `redirect_uri` with the code
   as a query param.
4. Agent exchanges the code for the API key via a standard token
   endpoint: `POST /api/v1/agent-auth/token { code, grant_type:
   "authorization_code" }` → `{ access_token, scope, business_id }`.

This is OAuth 2.0 Authorization Code, adapted to issue API keys
instead of access tokens. Standard enough that off-the-shelf
RFC 6749 client libraries can drive it.

## Why API keys instead of access tokens?

Three reasons.

**Existing key infrastructure.** The platform already had an API
key system with hashed storage, prefix-indexed lookup,
constant-time compare, and revocation. Reusing it was cleaner than
adding a parallel token type.

**Long-lived by default.** Agent delegations typically last weeks
or months, not 60 minutes. An API key with explicit revocation
matches that mental model better than a refresh-token dance.

**Existing CSRF policy works.** API keys arrive as
`Authorization: Bearer sp_...` or `x-api-key`. The CSRF
middleware sees those headers and bypasses the cookie-based CSRF
check — because the threat model (malicious origin auto-attaching
a session cookie) doesn't apply to out-of-band credentials.

## The cost-meter

The other thing I think is worth sharing: every MCP `tools/call`
response carries a `_meta` block:

```json
{
  "content": [...],
  "isError": false,
  "_meta": {
    "durationMs": 142,
    "cost": { "type": "free" },
    "rateLimit": { "limit": 100, "remaining": 94, "resetAt": "..." },
    "downstreamStatus": 200
  }
}
```

`_meta` is a spec-permitted extension on tool results. Agents that
understand it can:

- Budget a multi-step plan before executing (read the manifest's
  per-tool `cost` field)
- Verify after each call that the actual cost matched the estimate
- Stop early when `rateLimit.remaining` runs low

The agent's user gets a corresponding view at `/dashboard/agents`
showing exactly what each connected agent has done — totals per
action type, recent timeline, status pills for active/revoked/
expired keys. This is the trust loop that makes long-lived
delegation safe.

## Code

A runnable end-to-end example (no Anthropic SDK required, just
`fetch` and stdlib `http`) is at
[examples/full-flow.ts](https://github.com/benzatkulak-collab/socialperks/blob/main/examples/full-flow.ts)
in the repo. ~200 lines.

A Claude-driven version using the Anthropic SDK's `mcp_servers`
parameter is at
[examples/claude-agent.ts](https://github.com/benzatkulak-collab/socialperks/blob/main/examples/claude-agent.ts).

## Open questions

- The token response uses `business_id` instead of OAuth's standard
  `subject` claim. Should it match the OAuth convention even though
  it's API-key issuance? Open to feedback.
- I cap key expiry at 1 year. Some agents want indefinite
  delegation; some want short-lived. Should this be agent-requested
  via a `lifetime` scope, or a fixed-by-platform policy? Currently
  it's the latter.
- The cost-meter's `cash` category isn't used yet — it's reserved
  for cashback-payout tools that move real money. The shape might
  need to change once there's a real use case driving it.

If you're building agent integrations against SaaS APIs and have
opinions on any of the above, I'd like to hear them. The platform
is live and I'm iterating on this with feedback from the first
developers building against it.
```

**Timing:** dev.to traffic is best Wednesday-Friday mornings ET.
Posts get a dedicated reader window for ~3 days.

---

## 3. X / Twitter — Single thread (5 posts max)

A thread instead of a single post — gives the technical detail room
to breathe without burying the lede.

### Post 1 (the hook)

```
Built an OAuth-style key issuance flow for AI agents.

The agent points the user at a consent URL. The user approves
scopes in plain English. The agent receives a scoped API key
bound to that user's business.

No copy-pasting from a dashboard.

Live at socialperks.app/agent/authorize 🧵
```

### Post 2 (the why)

```
Why this matters:

Agents that "do things for users" need to authenticate without
asking a non-technical user to navigate a developer settings page.

The OAuth 2.0 Authorization Code flow is the standard answer for
access tokens. I adapted it to issue API keys directly — same
flow, longer-lived credentials, simpler client code.
```

### Post 3 (the technical wrinkle)

```
The wrinkle nobody warns you about:

CSRF protection is correct for cookie-bound browser sessions and
actively hostile to API-key callers (no browser, no cookies).

My middleware detects Authorization: Bearer sp_... or x-api-key
and bypasses the CSRF check explicitly. Standard SaaS pattern but
worth saying out loud.
```

### Post 4 (the cost meter)

```
Every MCP tool call returns a _meta block:

  durationMs: 142
  cost: { type: "free" }
  rateLimit: { remaining: 94, limit: 100, resetAt: ... }
  downstreamStatus: 200

Agents budget BEFORE invoking (from the manifest) and verify AFTER
(from _meta). Saved me a lot of "where did my rate limit go" debugging.
```

### Post 5 (the CTA)

```
Working examples (no Anthropic SDK required, just fetch + stdlib http):
github.com/benzatkulak-collab/socialperks/tree/main/examples

MCP endpoint: socialperks.app/api/mcp
Docs: github.com/benzatkulak-collab/socialperks/blob/main/AGENTS.md

If you're building agent integrations and have opinions on the OAuth
shape or cost-meter design, would love to hear them.
```

**Timing:** X technical posts perform best Tuesday-Thursday
12-3pm ET. Engagement window is ~24h, not 3-7 days like HN/dev.to.

**Hashtags:** Skip them on X. The platform deprioritizes posts that
look ad-y, and #AI / #MCP get a flood of low-quality content.

---

## 4. Anthropic Discord — #mcp channel

A single message, conversational tone. Discord audiences want to
see you engage in the replies, not drop-and-leave.

```
Hey y'all — I just shipped agent-native primitives for Social Perks
(small-business marketing platform). Sharing in case anyone wants
to look at the shapes / poke holes:

• MCP server at socialperks.app/api/mcp (9 tools, read + write)
• OAuth-style key issuance at /agent/authorize → token exchange
  at /api/v1/agent-auth/token (RFC 6749 close enough that
  off-the-shelf clients work)
• Every tools/call response includes _meta.cost + _meta.rateLimit
  so agents can budget calls
• User-facing audit trail at /dashboard/agents

Example agent (TypeScript, ~200 lines, no Anthropic SDK):
github.com/benzatkulak-collab/socialperks/blob/main/examples/full-flow.ts

Open to feedback on:
1. Should the token response use OAuth `subject` instead of my
   `business_id`?
2. Is 1-year default key expiry sensible or should it be agent-
   requested?
3. The cost-meter's `cash` category — reserved for future cashback
   tools but the shape might be wrong without a real use case

Happy to answer questions or take PRs.
```

**Channel:** `#mcp` is the right place. Don't cross-post to
`#general` — that's perceived as spam.

---

## 5. Reddit — r/ClaudeAI + r/MachineLearning

### r/ClaudeAI

**Title:**

```
Built agent-native primitives for a SaaS API — feedback welcome
```

**Body:** Use the dev.to draft above, lightly trimmed (Reddit
audiences are less patient with prose).

### r/MachineLearning

**Skip.** That subreddit is research-focused and gets prickly about
"shipped a thing" posts. Save the effort.

---

## Sequencing

Don't blast all five channels in one day. Stagger:

| Day | Channel |
|---|---|
| Mon | Anthropic Discord (#mcp) — gets you community feedback first |
| Tue 7:30am PT | Hacker News (Show HN) |
| Wed AM | dev.to long-form |
| Thu PM | X thread |
| Fri | r/ClaudeAI (only if the HN/dev.to posts didn't get traction — otherwise this is redundant) |

That cadence gives each post its own attention window and lets you
incorporate feedback from earlier posts into later ones.

## What I as an AI can't do

- Post under your account on any of these
- Take a screenshot or screencast of the working flow (you'll have
  to do that one yourself — it's the single most valuable visual
  asset for X / dev.to)
- Reply to comments in real time as they come in

The drafts above mean the writing is done. The clicking and replying
remain yours.
