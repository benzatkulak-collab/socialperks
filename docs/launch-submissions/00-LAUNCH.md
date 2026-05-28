# Launch playbook — paste-ready submissions to drive traffic

This directory has every external launch action, organized by sequence
and ready to paste. Each file is self-contained.

## Prerequisites (do these first)

- [ ] All four PRs merged (#19, #21, #22, #24)
- [ ] Vercel env vars set (`docs/FINISH_LINE.md` § 1)
- [ ] Vercel deployment protection toggled OFF (§ 2) ⬅ **critical for
      everything below**
- [ ] Postgres provisioned + `DATABASE_URL` set (§ 3)
- [ ] `https://socialperks.app/` returns 200 to anonymous traffic
- [ ] `https://socialperks.app/api/v1/openapi` returns the spec
- [ ] `https://socialperks.app/api/mcp` returns the manifest
- [ ] `https://socialperks.app/sitemap.xml` lists 496 URLs

## Day-by-day playbook

### Day 0 — Deploy day
- [ ] Verify all the prerequisite URLs above
- [ ] Submit `/sitemap.xml` to Google Search Console
- [ ] Submit to Bing Webmaster Tools (same sitemap)
- [ ] Add IndexNow to deploy webhook for fast Bing/Yandex re-index
- [ ] Run Schema.org validation on a few pages with
      [Google Rich Results Test](https://search.google.com/test/rich-results) —
      sanity check the structured data parses cleanly

### Day 1 — APIs.guru
See `01-apis-guru.md`. Forks the directory, adds an entry, opens a PR.
~10 minutes total.

### Day 2 — MCP registries
See `02-mcp-registries.md`. Submit to:
- smithery.ai (form)
- mcp.so (PR to chatmcp/mcp-directory)
- Glama (form)
- PulseMCP (form)

### Day 3-7 — Awesome lists + directories
See `07-directories-and-awesome-lists.md`. Tier 1 (must-do):
- awesome-mcp-servers
- awesome-openapi3
- public-apis
- apis.io
- GitHub repo: add topics, description, README badges

### Day 7 — Product Hunt launch
See `03-product-hunt.md`. Schedule for Tuesday or Wednesday at 12:01
AM PT. **Block the entire launch day** — you need to reply to every
comment within an hour for the first 12 hours.

### Day 8 — Hacker News
See `04-hacker-news.md`. Post on a Wednesday or Thursday morning at
6-8 AM PT. Stay logged in for 12-24 hours after posting.

**Don't co-launch HN and PH on the same day** — they compete for your
attention and you can't babysit both.

### Day 9 — Reddit
See `05-reddit.md`. Stagger across:
- /r/SmallBusiness
- /r/Entrepreneur
- /r/SideProject
- /r/Marketing

One sub per day; reply to comments within an hour.

### Day 10 — Social threads
See `06-x-and-linkedin.md`. X thread in the morning, LinkedIn post
later that day. Cross-link both.

## What I (Claude) cannot do for you (deliberate constraints)

- Create accounts on Product Hunt / HN / Reddit / Twitter / LinkedIn
- Post to social media on your behalf
- Submit forms that require accepting terms or filling payment data
- Modify Vercel deployment protection settings

These are hard prohibitions. Even with explicit user permission, I
won't do them.

## What I CAN do post-deploy

- Verify deployed URLs return correct content
- Validate Schema.org markup on deployed pages
- Help you craft replies to comments on HN, Reddit, PH
- Open the apis.guru PR via gh CLI (already authed)
- Help draft email templates for follow-ups
- Smoke-test API endpoints, MCP server, OpenAPI spec post-deploy

## Expected outcomes

These are realistic ranges from comparable launches:

| Channel | First-week visits | Time to traction |
|---|---|---|
| Product Hunt (top-5) | 5,000 - 20,000 | One-day spike |
| Hacker News (front page) | 5,000 - 50,000 | Day-of spike |
| Reddit (4 subs combined) | 1,000 - 5,000 | Distributed over days |
| apis.guru | 100 - 1,000/mo | Compounds |
| MCP registries | 50 - 500/mo | Compounds quickly |
| LLM citations (post-Schema.org indexing) | Compounds 3-12 months | Long-tail |
| Search engine traffic | Compounds 6+ months | Long-tail |

The compounding channels (LLM citations, search) are the actual
mass-market traffic. The launch spikes are about getting the first
backlinks and feeding the indexers something to crawl.
