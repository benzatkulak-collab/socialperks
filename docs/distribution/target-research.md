# Target Research — Who to Contact (and How)

Curated list of specific channels, communities, and content surfaces
where Social Perks belongs. **No DMs, no posts** from this file by me
— this is the research output. The clicking and the human voice are
yours.

Updated: 2026-05-17

---

## Tier 1: highest-leverage, lowest-friction

These are channels where Social Perks is a perfect topical match AND
the audience is small enough that a single post gets real visibility.

### 1. PulseMCP — weekly MCP newsletter + directory
- **URL:** <https://www.pulsemcp.com> · [API](https://www.pulsemcp.com/api)
- **What it is:** Community hub and weekly newsletter for discovering
  MCP servers, clients, articles, and news. Maintained by Tadas
  Antanavicius (also a maintainer of the MCP Registry).
- **Action:** Submit Social Perks to their directory. They crawl the
  official MCP Registry already, but a direct submission ensures the
  description is right and gets prioritized in the next weekly
  newsletter.
- **Submission path:** They aggregate from `registry.modelcontextprotocol.io`
  — you're already there. Optionally email Tadas directly (he's
  @tadasant on GitHub, easy to find via the registry repo's
  maintainer list).
- **Realistic outcome:** Mention in the weekly newsletter → 50-200
  curious developers click through.

### 2. MCP Contributor Discord (#mcp channel)
- **URL:** <https://modelcontextprotocol.io/community/communication>
- **What it is:** Real-time contributor discussion. The right place
  for "I built X, here's the OAuth/cost-meter design — feedback
  welcome" posts.
- **Action:** Post the Discord draft from `announcement-posts.md`
  exactly as written. Stay active in replies for the first hour to
  reply to questions.
- **Realistic outcome:** 5-15 messages of reaction; 1-3 developers
  who actually try it; some of them have audiences themselves.

### 3. r/mcp — Reddit
- **URL:** <https://www.reddit.com/r/mcp>
- **What it is:** Reddit community dedicated to MCP. Smaller than
  r/ClaudeAI but more topically focused.
- **Action:** Self-post titled "Built an OAuth-style key issuance
  flow for an MCP server — feedback welcome" with the dev.to draft
  body trimmed for Reddit's "show me a thing" tone.
- **Realistic outcome:** 50-200 upvotes if it lands; 10-30 comments
  with technical feedback worth engaging with.

### 4. The Pragmatic Engineer newsletter — guest writeup or mention
- **URL:** <https://newsletter.pragmaticengineer.com>
- **What it is:** Gergely Orosz's high-signal engineering newsletter
  (>1M readers). He published a deep dive on MCP recently —
  ["Building MCP servers in the real world"](https://newsletter.pragmaticengineer.com/p/mcp-deepdive).
- **Action:** Reply to that post in the comments with a focused
  technical observation (NOT a Social Perks ad). E.g., a comment on
  the OAuth/cost-meter pattern that subtly references your
  implementation. If it gets engagement, follow up via DM with a
  pitch for a guest writeup.
- **Realistic outcome:** Long-shot but high-leverage. A guest mention
  in Gergely's newsletter is worth hundreds of HN posts.

---

## Tier 2: specific people worth targeting individually

These are public figures actively building or writing about MCP.
**Don't blast — pick one, send a 2-sentence DM mentioning a specific
detail of their work.**

### Philipp Schmid (@_philschmid)
- **Why:** Posts regularly about MCP best practices. Recent thread:
  ["MCP best practices — design tools around outcomes, not individual
  endpoints"](https://x.com/_philschmid/status/2014016583706829054).
  His "Design tools around outcomes" thesis exactly matches the
  Social Perks tool design (createCampaign vs. raw CRUD).
- **DM hook:** "Your point about designing MCP tools around outcomes
  vs. endpoints — built an MCP server that follows exactly that
  pattern (createCampaign / submitProof / reviewSubmission rather
  than the raw REST CRUD). Curious if you'd take 60s on the
  sandbox: socialperks.app/agent/test"

### Christian (@curious_vii)
- **Why:** Pinned thread on
  ["MCP servers are apps for agents"](https://x.com/curious_vii/status/1897983210929188888).
  Has built MCP servers himself; appreciates engineering detail
  over hype.
- **DM hook:** "Your 'MCP servers are apps for agents' framing
  resonated. Built one for SMB marketing — the bit I'm most curious
  about feedback on is the cost-meter envelope on tools/call. Live
  at socialperks.app/agent/test."

### Greg Isenberg (@gregisenberg)
- **Why:** Distribution-focused content with a 2026 MCP playbook
  thesis. The
  [dev.to post about his playbook](https://dev.to/toolstem/i-built-the-mcp-server-greg-isenberg-recommends-in-his-2026-distribution-playbook-heres-day-7-3c33)
  is exactly the audience pattern.
- **DM hook:** Risky — Greg's a high-volume creator, may not reply.
  Better: reply to one of his MCP-distribution tweets with a single
  sentence that demonstrates familiarity, no link drop.

---

## Tier 3: aggregators and directories to keep registering with

Lower per-channel leverage, but cumulative discoverability matters.

| Directory | URL | Submission |
|---|---|---|
| Official MCP Registry | <https://registry.modelcontextprotocol.io> | ✅ Already listed |
| punkpeye/awesome-mcp-servers | <https://github.com/punkpeye/awesome-mcp-servers> | ✅ PR #6463 open |
| appcypher/awesome-mcp-servers | <https://github.com/appcypher/awesome-mcp-servers> | PR with same entry shape — quick to do once #6463 lands |
| wong2/awesome-mcp-servers (also <https://mcpservers.org>) | <https://github.com/wong2/awesome-mcp-servers> | Same — quick PR |
| mcp.so | <https://mcp.so/submit> | Web form, ~5 min |
| mkinf | <https://www.mkinf.io> | Open-source hosted-MCP registry; submission via PR |
| Glama.ai MCP servers | <https://glama.ai/mcp/servers> | Crawls awesome-list; should appear automatically once #6463 merges |
| AiMCP | <https://www.aimcp.info> | Similar — crawls from awesome-lists |

The pattern: submit once to awesome-lists, then sit back while
aggregators crawl them.

---

## Tier 4: industry verticals (small business / coffee shop / local)

A separate, complementary audience: the actual end users (not
developers). Lower-tech but higher conversion to paying customer.

### Specialty Coffee Association of America
- **URL:** <https://sca.coffee>
- **Channel:** Their forum + member newsletter
- **Angle:** Skip the "agent" framing entirely. Lead with "the
  cheapest way to get more Instagram posts from your regulars."
- **Action:** Submit a guest article or sponsored content. Their
  audience is exactly your ICP.

### r/smallbusiness, r/Entrepreneur on Reddit
- **What:** Cross-posts ABOUT the platform (not by you — by a happy
  customer once you have one). Wait until you have a real
  customer story before posting here.

### Local-business newsletters (Yelp for Business, Square, Toast)
- **What:** Many run "marketing tips for restaurants/cafes"
  newsletters and accept pitched articles.
- **Action:** Pitch a guest piece titled something like "The
  legal way to get customers to post about your coffee shop on
  Instagram" — Social Perks gets mentioned in passing as a tool,
  not the whole article.

---

## Anti-targets — places NOT to post

Spending time here is wasted:

- **r/MachineLearning** — Research focus, hostile to "shipped a
  thing" posts.
- **HN /show without a working demo** — Will get downvoted. Post
  HN only after the screencast exists.
- **LinkedIn** — Wrong audience for MCP devs. Right audience for
  small-business owners but you should be on the SCA forum instead.
- **Twitter without specific replies** — Generic posts drown. Only
  the targeted DM replies above are worth doing on X.

---

## Sequencing recommendation

| Day | Channel | Why |
|---|---|---|
| Day 1 (Mon) | Record screencast | Unblocks everything else |
| Day 2 (Tue) | Anthropic MCP Discord post | Gets early feedback |
| Day 3 (Wed AM) | HN Show HN post | Use the morning traffic window |
| Day 3 (Wed PM) | dev.to long-form | Different audience, different time of day |
| Day 4 (Thu) | r/mcp Reddit post | Pull from HN/dev.to learnings |
| Day 4 (Thu PM) | X thread + Tier 2 DMs | Use the screencast as the visual hook |
| Day 5 (Fri) | Tier 3 aggregator PRs | Cleanup pass while waiting for #6463 to merge |
| Week 2+ | PulseMCP submission, Pragmatic Engineer comment | Slower-burn opportunities |

---

## What I can't do (recap)

- I can't DM these people under your identity
- I can't post in Discord / Reddit / X as you
- I can't submit to mcp.so's web form for you
- I can't reply in real time to the responses your posts get

This document is the research; the human voice is yours.
