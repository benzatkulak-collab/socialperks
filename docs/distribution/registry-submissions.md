# MCP Registry Submissions — Drafts Ready to Paste

This file contains pre-written submission text for the three biggest
MCP discovery surfaces. Each section tells you:

- The target repo / form
- The exact text or JSON to submit
- What the PR / submission needs to look like

Copy → paste → submit under your GitHub identity. No code changes here —
this is the distribution work.

> **Before submitting anywhere:** the Social Perks MCP server lives at
> `https://socialperks.app/api/mcp` and the manifest is at the same
> URL via `GET` (returns the tool catalog + cost models). Make sure
> production is reachable at this URL before submitting — registries
> often crawl the manifest for verification.

---

## 1. modelcontextprotocol/servers (the official MCP server index)

**Target:** <https://github.com/modelcontextprotocol/servers>

This is the canonical list. Most agent developers look here first.

### How to submit

1. Fork <https://github.com/modelcontextprotocol/servers>
2. Open `README.md` in the fork
3. Find the section titled **"🌎 Community Servers"** (or the most
   recent equivalent — the section has been renamed once or twice;
   skim the README's table of contents)
4. Append the entry below in alphabetical order
5. Commit, push, open PR with the title:
   `Add Social Perks community server`

### Entry to paste

```markdown
- **[Social Perks](https://github.com/benzatkulak-collab/socialperks)** - Agent-native marketing platform for small businesses. Tools for creating campaigns, submitting customer-content proofs, reviewing submissions, and reading per-call cost meta. OAuth-style API key issuance via human consent screen at `/agent/authorize`. Read-only catalog tools work without auth.
```

### PR description text

```markdown
## Summary

Adds Social Perks to the Community Servers list.

Social Perks is an agent-native marketing platform for small
businesses. The MCP server exposes:

**Read tools (no auth):**
- `getPricing` — market-rate pricing for marketing actions
- `listActions` — 107 marketing actions across 25 platforms
- `getBenchmarks` — industry benchmarks
- `searchInfluencers` — influencer search by platform / follower count

**Write tools (API key required):**
- `createCampaign` — launch a campaign in one call
- `submitProof` — submit content proof on behalf of a customer
- `reviewSubmission` — approve / reject submissions
- `listSubmissions` — paginate the review queue
- `getCampaignStats` — outcome reporting

Auth via OAuth-style consent flow at `/agent/authorize` — agents
direct users there, users approve scopes, agents receive scoped API
keys. Standard OAuth 2.0 authorization-code shape; any RFC 6749
client library works.

Each tool response includes `_meta.cost` (free / plan-counted / cash-
moving) and `_meta.rateLimit` so agents can budget calls.

Endpoint: https://socialperks.app/api/mcp
Manifest: GET the same URL.
Docs: https://github.com/benzatkulak-collab/socialperks/blob/main/AGENTS.md
```

---

## 2. punkpeye/awesome-mcp-servers

**Target:** <https://github.com/punkpeye/awesome-mcp-servers>

The most popular "awesome list" for MCP. Wider net than the official
repo, more tolerant of newer entries.

### How to submit

1. Fork <https://github.com/punkpeye/awesome-mcp-servers>
2. Open `README.md` in the fork
3. Find the **"Community Servers"** section
4. Add an alphabetized entry (keep the README's format — usually
   `category` prefix + `name` + description)
5. Open PR titled: `Add Social Perks (marketing automation)`

### Entry to paste

```markdown
- 🎁 [Social Perks](https://github.com/benzatkulak-collab/socialperks) - Agent-native marketing platform: create campaigns, submit content proofs, manage perks for small businesses. OAuth-style key issuance, per-call cost meter. Read tools open; write tools require scoped API key.
```

The 🎁 emoji prefix follows the repo's convention for gifts/rewards
category — adjust to match whatever category the README uses at the
time of submission (could be 🛍️ for commerce, 📈 for marketing, etc.).

---

## 3. mcp.so directory

**Target:** <https://mcp.so/submit>

A web-form submission rather than a PR. Saves you the GitHub fork
step but no version-controlled paper trail.

### Form values to enter

| Field | Value |
|---|---|
| Server name | `Social Perks` |
| URL | `https://socialperks.app/api/mcp` |
| Description (short) | Agent-native marketing platform. Create campaigns, submit content proofs, and manage perks. |
| Description (long) | See below |
| Category | Marketing / Commerce |
| Repo URL | `https://github.com/benzatkulak-collab/socialperks` |
| Docs URL | `https://github.com/benzatkulak-collab/socialperks/blob/main/AGENTS.md` |
| Auth type | OAuth 2.0 (authorization code) + API key |
| License | (whatever the repo's LICENSE file says) |

#### Long description

```
Social Perks is an agent-native marketing platform for small
businesses. Agents can launch perk-for-post campaigns, submit
customer content as proof of completion, and read aggregated
campaign stats — all via 9 MCP tools backed by a fully versioned
REST API.

Auth bootstrap is OAuth-style: an agent directs the user to a
consent screen at /agent/authorize, the user approves the
requested scopes (read.campaigns, write.campaigns, etc.), and the
agent exchanges the resulting authorization code for a scoped API
key. The flow matches RFC 6749 closely enough that any OAuth
client library can drive it.

Every tools/call response carries a _meta block with the call's
cost model (free / plan-counted / cash-moving), rate-limit
remaining, and duration — so agents can budget before invoking and
verify after.

Read-only catalog tools (pricing, action library, benchmarks,
influencer search) work without authentication. Write tools
(createCampaign, submitProof, reviewSubmission, listSubmissions,
getCampaignStats) require an API key bound to a specific business.

Tenant isolation is enforced at every boundary. Users see a full
audit trail of every action an agent has taken on their behalf at
/dashboard/agents.
```

---

## 4. Anthropic's documentation discovery

Anthropic doesn't curate a public MCP registry, but they do
periodically reference example community servers. Two places worth
the time:

### a. Anthropic Discord — #mcp channel

Post a short message:

```
Hey — I built an MCP server for Social Perks, an agent-native
marketing platform for small businesses. Read tools work without
auth (pricing, action catalog, benchmarks). Write tools (create
campaign, submit proof, review submissions) use an OAuth-style
consent flow at /agent/authorize.

Endpoint: https://socialperks.app/api/mcp
Repo: https://github.com/benzatkulak-collab/socialperks
Docs: https://github.com/benzatkulak-collab/socialperks/blob/main/AGENTS.md

Each tool response includes _meta.cost + _meta.rateLimit so agents
can budget and verify spend. Happy to take feedback on the OAuth
shape — I tried to match RFC 6749 closely enough that off-the-shelf
clients work, but the agent-key issuance pattern is a slight
deviation from standard access-token flows.
```

### b. r/ClaudeAI (Reddit)

Same content, posted as a self-text post titled:

```
Built an MCP server with OAuth-style key issuance — feedback welcome
```

The Reddit audience is more about "show me a working demo" than
spec compliance, so include a short loom-style screencast or GIF
of the consent flow if you have one. Without a video, the post will
still land but engagement will be lower.

---

## What to do AFTER submitting

1. **Save the PR / form URLs** — paste them in a tracking doc so you
   can follow up if reviewers ask questions
2. **Reply within 24h** to any reviewer comments — registry
   maintainers are volunteers and threads go cold quickly
3. **Update the manifest** (`GET /api/mcp`) if your tool list or cost
   model changes — registries periodically re-crawl
4. **Don't auto-promote** the listing on socials yet — wait for the
   PR to merge or the form submission to be approved, then announce
   via the post drafts in `docs/distribution/announcement-posts.md`

## What I as an AI can't do

- Submit PRs under your GitHub identity (account creation / login)
- Post to Discord or Reddit under your account
- Accept any ToS or community-guidelines agreement on your behalf

These are by design — you own the relationship with each community
and need to manage it yourself. The drafts above mean the writing
work is done; the clicking remains yours.
