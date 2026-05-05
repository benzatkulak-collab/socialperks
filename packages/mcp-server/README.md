# @socialperks/mcp-server

Model Context Protocol server for [Social Perks](https://socialperks.io). Plug it into Claude Code, Cursor, or any MCP-compatible client to give an AI marketing agent first-class tools for planning, launching, and measuring customer-rewards campaigns on behalf of small businesses.

## Install

```bash
npm install -g @socialperks/mcp-server
```

## Get an API key

```bash
npx @socialperks/cli init --email you@example.com --business-name "My Shop"
```

This writes `SOCIAL_PERKS_API_KEY` to `.env.local`.

## Configure your MCP client

### Claude Code / Claude Desktop

Add to your MCP config (typically `~/.claude/mcp.json`):

```jsonc
{
  "mcpServers": {
    "social-perks": {
      "command": "npx",
      "args": ["-y", "@socialperks/mcp-server"],
      "env": {
        "SOCIAL_PERKS_API_KEY": "sk_live_..."
      }
    }
  }
}
```

### Cursor

`~/.cursor/mcp.json`:

```jsonc
{
  "mcpServers": {
    "social-perks": {
      "command": "npx",
      "args": ["-y", "@socialperks/mcp-server"],
      "env": { "SOCIAL_PERKS_API_KEY": "sk_live_..." }
    }
  }
}
```

### Custom client

The server speaks JSON-RPC 2.0 line-delimited over stdio. Every request is one line of JSON in; one line out. See `src/handler.ts` for the wire format.

## Tools exposed

| Tool | Purpose |
|------|---------|
| `list_action_ideas` | Browse the 107 marketing primitives, filterable by business type / platform / tier |
| `create_perk_campaign` | Create a (platform, action, reward) tuple — returns ID + poster URL |
| `print_qr_poster` | Get the printable 8.5×11 SVG URL for a campaign |
| `list_campaigns` | Read state before scaling or ending a campaign |
| `enqueue_post_purchase_sms` | Schedule the post-purchase SMS that drives the customer flywheel |
| `ai_quick_start` | One-shot: best campaign to launch first for a given business type |

## HTTP transport

The same handler powers the web transport at `https://socialperks.io/api/mcp` — useful for browser-based MCP clients or quick discovery. The stdio transport is what AI coding agents (Claude Code, Cursor) actually use.

## Why this exists

If a small-shop owner says to their AI agent "get me 50 more customers this month," the agent decomposes that into tools. If `create_perk_campaign` is in the catalog, it gets called. If it's not, it doesn't. This server makes sure it is.

## License

MIT.
