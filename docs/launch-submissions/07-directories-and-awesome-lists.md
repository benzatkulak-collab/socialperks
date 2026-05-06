# Directories + Awesome lists

Lower-effort submissions that compound. Each one is a backlink + a
distribution surface. Most accept submissions via PR or a short form.

## Awesome lists (PRs to GitHub repos)

### awesome-mcp-servers

Where: https://github.com/punkpeye/awesome-mcp-servers

Add an entry under the most-relevant category (likely "Marketing"
or "Business" — they may need to add the section).

```markdown
- [Social Perks](https://socialperks.io/api/mcp) — Marketing platform
  MCP server with 5 tools (getPricing, listActions, getBenchmarks,
  listCampaigns, searchInfluencers) for incentivized social media
  campaigns across 25 platforms.
```

### awesome-openapi3

Where: https://github.com/Mermade/awesome-openapi3

```markdown
- [Social Perks](https://socialperks.io/api/v1/openapi) — Marketing
  platform with public OpenAPI 3.1 spec covering pricing, actions,
  campaigns, AI generation, exchange marketplace.
```

### awesome-rest

Where: https://github.com/marmelab/awesome-rest

Same entry as awesome-openapi3.

### awesome-marketing

Where: https://github.com/marketingtoolslist/awesome-marketing-tools (or
similar — there are several)

Add under a "Customer Marketing" or "Incentivized Marketing" category.

## API directories (form submissions)

### apis.io

Where: https://apis.io/submit
Free directory of public APIs. Quick form.

### Public APIs (public-apis on GitHub)

Where: https://github.com/public-apis/public-apis

```markdown
| API | Description | Auth | HTTPS | CORS |
|---|---|---|---|---|
| [Social Perks](https://socialperks.io/api/v1/openapi) | Marketing platform — pricing oracle, action catalog, benchmarks | apiKey | Yes | Yes |
```

Goes under the "Business" or "Open Data" section.

### RapidAPI Hub

Where: https://rapidapi.com/hub
Larger commercial API marketplace. Sign-up required, but listings get
real traffic. Manual ops — handle when you have time.

## SaaS / startup directories

### Tiny Startups

Where: https://tinystartups.com/submit

### betalist

Where: https://betalist.com/submit
Beta-stage product directory.

### Indie Hackers

Where: https://indiehackers.com (post in the "Self-Promotion" thread,
not as a top-level post)

### saashub.com

Where: https://saashub.com/products/new

### Capterra / G2

These need real reviews to be useful — wait until you have happy
customers.

## SEO-relevant submissions

### Google Search Console

Where: https://search.google.com/search-console
**Required step.** Submit `/sitemap.xml` after deployment. Verify
ownership via DNS or HTML file.

### Bing Webmaster Tools

Where: https://www.bing.com/webmasters
Same idea, lower-volume than Google but free + zero-cost.

### IndexNow

Where: https://www.indexnow.org/
Open protocol pinged by Bing/Yandex/Naver to index new content fast.
Add it to the deploy hook.

## GitHub repo discoverability

### Topic tags

On the repo settings: add topics
- `social-media-marketing`
- `marketing`
- `mcp-server`
- `openapi`
- `nextjs`
- `incentivized-marketing`
- `qr-code-marketing`
- `ai-agents`
- `claude-mcp`
- `typescript-sdk`

### Repo description

```
Marketing platform with public OpenAPI 3.1, MCP server, and TypeScript SDK.
Customers post, businesses pay them with perks. AI agents included.
```

### Repo README badges

Add to top of README:

```markdown
[![OpenAPI](https://img.shields.io/badge/OpenAPI-3.1-brightgreen)](https://socialperks.io/api/v1/openapi)
[![MCP Server](https://img.shields.io/badge/MCP-server-blue)](https://socialperks.io/api/mcp)
[![SDK](https://img.shields.io/npm/v/@social-perks/sdk)](https://www.npmjs.com/package/@social-perks/sdk)
[![License](https://img.shields.io/badge/License-Proprietary-yellow)](#)
```

## Order of operations

1. (Day 0 — deploy) Submit `/sitemap.xml` to Google Search Console
2. (Day 0) Submit to Bing Webmaster Tools
3. (Day 1) PR to apis.guru (see 01-apis-guru.md)
4. (Day 1-3) MCP registries — smithery, mcp.so, glama, pulsemcp (see 02)
5. (Day 3-7) Awesome list PRs — awesome-mcp-servers, awesome-openapi3
6. (Day 7) Product Hunt launch (see 03)
7. (Day 7+1) Hacker News Show HN (see 04) — separate day from PH so
   they don't compete for your attention
8. (Day 7+2) Reddit posts (see 05) — staggered across subs
9. (Day 7+3) X + LinkedIn threads (see 06)

Total elapsed: ~10 days for the first wave. Repeat the social rounds
monthly as you ship updates.
