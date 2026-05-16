# Social Perks MCP Server

**Endpoint:** `https://socialperks.app/api/mcp`
**Transport:** Streamable HTTP (stateless JSON-RPC 2.0)
**Protocol version:** `2025-03-26`
**Auth:** `Authorization: Bearer <api-key>` (optional for read-only tools)

The Social Perks MCP server lets AI agents (Claude, ChatGPT, Cursor, custom agents) drive a small-business customer-marketing platform end-to-end: create campaigns, review submissions, look up pricing, browse the action catalog.

If your AI assistant operates a small business, this server is how it manages the customer-engagement layer of that business.

---

## Why this exists

Small business owners increasingly delegate operations to AI assistants. The platforms those assistants need to interact with must be **first-class addressable** by tool-using agents — not just by humans clicking buttons.

Social Perks is built MCP-native: every workflow the admin dashboard exposes is also reachable via this server. Anonymous agents can browse; tenant-scoped API keys can mutate.

---

## Quick start

### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "social-perks": {
      "url": "https://socialperks.app/api/mcp",
      "headers": {
        "Authorization": "Bearer sk_live_your_key_here"
      }
    }
  }
}
```

### ChatGPT custom connector / OpenAI Apps SDK

Point the connector URL at `https://socialperks.app/api/mcp`. Set the auth type to **Bearer** and paste your key.

### Cursor

```jsonc
// .cursor/mcp.json
{
  "social-perks": {
    "url": "https://socialperks.app/api/mcp",
    "auth": { "type": "bearer", "token": "sk_live_..." }
  }
}
```

### Raw JSON-RPC (any language)

```bash
curl -X POST https://socialperks.app/api/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk_live_..." \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "createCampaign",
      "arguments": {
        "name": "Story tags for free pastries",
        "actionIds": ["ig_st"],
        "budgetAllocated": 50000,
        "budgetType": "dol",
        "maxCompletions": 100,
        "expiresInDays": 30
      }
    }
  }'
```

---

## Tools

| Name | Auth | What it does |
|---|---|---|
| `getPricing` | No | Market-rate pricing for a marketing action (USD value + recommended perk) |
| `listActions` | No | Catalog of 107 marketing actions across 15 platforms |
| `getBenchmarks` | No | Industry benchmarks (engagement, conversion) by industry |
| `searchInfluencers` | No | Search influencers by platform / follower count |
| `listCampaigns` | **Yes** | List campaigns owned by the API key's business |
| `createCampaign` | **Yes** | Launch a new campaign for the API key's business |
| `submitProof` | **Yes** | Submit proof of completion for a campaign action |
| `reviewSubmission` | **Yes** | Approve or reject a pending submission |
| `listSubmissions` | **Yes** | List submissions (filterable by status, campaign) |
| `getCampaignStats` | **Yes** | Aggregate stats for a campaign — completions, conversion, spend |
| `get_pricing` | No | Get Social Perks plan tiers + pricing |

Every tool defines its input schema as JSON Schema (auto-generated from Zod). Use `tools/list` to fetch the live schemas.

---

## Auth & scoping

Issue an API key from the admin dashboard at `/admin/api-keys` → "Issue new key". The plaintext is shown once; copy it immediately.

Keys are tenant-scoped — they carry a `businessId` that locks every mutating call to that business. `create_campaign` will reject a call from a key with no `businessId`. `review_submission` only succeeds if the submission belongs to the key's business.

Anonymous (no-auth) calls work for the read-only tools. They're rate-limited and don't show tenant-private data.

---

## Audit

Every tool call writes to the platform audit log with:

- `actor` — `api-key:<id>` or `anonymous`
- `action` — `agent.decision` (success) or `agent.error` (failure)
- `resourceId` — `mcp-tool:<tool-name>`
- `meta.duration` — milliseconds
- `meta.businessId` — when scoped

Admins can review every agent action from `/admin/audit`.

---

## Discovery

- `GET /api/mcp` returns a machine-readable manifest (transport, tools, auth).
- `POST /api/mcp` is the JSON-RPC endpoint.
- The server responds to `initialize`, `tools/list`, `tools/call`, `ping`, and `notifications/initialized`.

---

## Submitting to MCP registries

This server is designed to be submitted to public MCP registries:

- **Anthropic MCP Registry** — submit at https://github.com/modelcontextprotocol/registry
- **Smithery** — submit at https://smithery.ai/new
- **Composio** — submit at https://composio.dev/integrations/new
- **MCP.so directory** — submit at https://mcp.so

Each takes the manifest URL (`https://socialperks.app/api/mcp`) and a short description.

---

## Stability promise

Tool names, input schemas, and JSON-RPC method names follow semantic versioning. Backwards-incompatible changes get a new tool name (e.g. `create_campaign_v2`) and the old tool stays online for ≥ 90 days. Watch the `version` field on `GET /api/mcp` for major bumps.

---

## License

Tool surface is open for any agent to use. The implementation is part of the Social Perks platform.
