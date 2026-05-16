# Social Perks — Agent Examples

This directory contains runnable examples that demonstrate the
**agent-native primitives** Social Perks exposes:

- **OAuth-style key issuance** so an agent can obtain a scoped API key
  via human consent (no copy-paste).
- **MCP write tools** so an agent can create campaigns, submit proofs,
  and review submissions on behalf of a user.
- **Per-request cost meter** so an agent can budget before invoking
  and verify spend after.
- **Activity dashboard** so the user can see what the agent has done.

If you're building an AI agent that needs to operate on a small
business's marketing stack, these examples are the shortest path from
zero to a working end-to-end loop.

## Files

| File | What it shows |
|---|---|
| `full-flow.ts` | The whole OAuth + MCP loop in one ~200-line TypeScript script. Demonstrates: authorize, token exchange, listTools, createCampaign, submitProof, getCampaignStats. Reads costs from `_meta` on every response. No external dependencies — just `fetch`. |
| `claude-agent.ts` | A Claude agent (via the Anthropic SDK) wired to the Social Perks MCP server. The model drives the workflow — picks the campaign action, decides the perk, monitors submissions. Shows what "the user types a request, the agent does the work" looks like in practice. |
| `curl-flow.sh` | Same flow as `full-flow.ts` but in raw `curl` commands. Useful for debugging or for porting to languages without a TypeScript runtime handy. |

## Prerequisites

- Node 22+ (for `full-flow.ts` and `claude-agent.ts`)
- A Social Perks business account (free tier is fine)
- For `claude-agent.ts`: an Anthropic API key

## Running

### `full-flow.ts` — no Anthropic SDK required

```bash
cd examples
npm install
npx tsx full-flow.ts
```

The script will:

1. Print the consent URL — open it in a browser, sign in, click Approve
2. Wait for the OAuth callback (it spins up a local HTTP server on
   port `4567` to catch the redirect)
3. Exchange the authorization code for an API key
4. Call `tools/list` to enumerate available tools and their cost models
5. Create a sample campaign via `createCampaign`
6. Print the rate-limit + duration meta from `_meta` so you can see
   the cost meter in action
7. Print the dashboard URL where the user can see what just happened

### `claude-agent.ts` — full Claude-driven workflow

```bash
ANTHROPIC_API_KEY=sk-ant-... npx tsx claude-agent.ts
```

Same OAuth handshake as above, then hands control to Claude with the
Social Perks MCP server attached. The model will receive a user
prompt like "Set up an Instagram story-tag campaign for my coffee
shop with a 15% discount perk" and execute the full toolchain.

### `curl-flow.sh` — for porting to other languages

```bash
bash curl-flow.sh
```

Same flow, written as bash + curl. Read it; port it; adapt it.

## Trust model

Every key minted via the OAuth flow is **scoped** (read.* / write.* /
review.*), **bound to a single business**, and **revocable from the
user's dashboard** at `/dashboard/api-keys`. The user can see every
action the agent has taken at `/dashboard/agents`.

If you're building an agent that uses Social Perks, link both pages
in your agent's UI so the user can audit and revoke at any time.

## Questions

Anything not covered here: open an issue or read [AGENTS.md](../AGENTS.md)
at the repo root.
