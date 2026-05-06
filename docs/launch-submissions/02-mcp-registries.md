# MCP server registry submissions

The Social Perks MCP server (at `/api/mcp`) needs to be listed in the
public MCP directories so Claude Desktop / Cursor / Cline users discover
it. There are three primary registries.

## Prerequisites

- [ ] Site deployed publicly
- [ ] `https://socialperks.io/api/mcp` returns the server manifest on GET
- [ ] `POST /api/mcp` with `{"jsonrpc":"2.0","method":"tools/list","id":1}` returns the 5 tools

## Registry 1: smithery.ai

Largest MCP server registry. Browsable from Claude Desktop directly.

**Submission**: https://smithery.ai/new

**Required fields**:

```yaml
name: social-perks
display_name: Social Perks
description: |
  Marketing platform where small businesses exchange perks (discounts,
  free items, cash back) for customer marketing actions across 25 social
  platforms. Use this MCP server to query market-rate pricing for any
  social media action, browse the full action catalog, get industry
  benchmarks, list your active campaigns, and search the influencer
  marketplace.
home_page: https://socialperks.io
repository: https://github.com/benzatkulak-collab/socialperks
license: Proprietary
transport: http
url: https://socialperks.io/api/mcp
tags:
  - marketing
  - small-business
  - social-media
  - influencer
  - reviews
  - ftc-compliance
  - perks
auth_required: optional
authentication_url: https://socialperks.io/dashboard/api-keys
tools:
  - getPricing
  - listActions
  - getBenchmarks
  - listCampaigns
  - searchInfluencers
example_prompts:
  - What's an Instagram Reel worth in marketing terms?
  - List all marketing actions on TikTok and their values.
  - What's the average ROI for restaurant marketing campaigns?
  - Find me micro-influencers on Instagram with 5,000+ followers.
```

## Registry 2: mcp.so

Second-largest MCP directory. Submission via PR to their public repo.

**Submission**: https://github.com/chatmcp/mcp-directory

**PR template**:

```markdown
Add Social Perks MCP server

Marketing platform MCP server with 5 tools for incentivized social media
marketing campaigns:
- getPricing — market-rate USD value of any marketing action
- listActions — catalog of 125 actions across 25 platforms
- getBenchmarks — industry benchmarks (completion rate, ROI)
- listCampaigns — caller's active campaigns (auth required)
- searchInfluencers — marketplace search

Endpoint: https://socialperks.io/api/mcp
Manifest: https://socialperks.io/api/mcp (GET)
Docs: https://socialperks.io/AGENTS.md
```

## Registry 3: Glama (modelcontextprotocol-servers)

Up-and-coming registry, more curated.

**Submission**: https://glama.ai/mcp/servers (form-based)

Provide:
- Name: Social Perks
- URL: https://socialperks.io/api/mcp
- Category: Business / Marketing
- Description: (paste smithery description above)

## Registry 4: PulseMCP

**Submission**: https://www.pulsemcp.com/submit

Same metadata as smithery.

## After submissions land

- Claude Desktop users searching "marketing" or "social" find the server
- Cursor users can install via the marketplace
- Server analytics start surfacing real agent traffic
- Each registry typically takes 1-7 days to review and publish
