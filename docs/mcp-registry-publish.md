# Publishing the Social Perks MCP server to the official registry

This is the founder step for **Move #2** (get *actually listed* where agents pick
tools). It takes ~2 minutes. The committed [`server.json`](../server.json) makes
it reproducible.

## Important: you do NOT need DNS for the registry

The declared namespace is `io.github.benzatkulak-collab/socialperks` — a
**GitHub-verified** reverse-DNS namespace. Ownership is proven by a GitHub OAuth
login (it checks you control the `benzatkulak-collab` GitHub account), **not** a
DNS TXT record. So the "DNS access" blocker does not apply to the registry step.

> DNS verification is only needed if you later want the prettier
> `com.socialperks/*` namespace. The GitHub namespace works today and is equally
> trusted.

## Steps

```bash
# 1. Install the registry publisher CLI
brew install mcp-publisher        # macOS
# or download from https://github.com/modelcontextprotocol/registry/releases

# 2. Log in under the GitHub namespace (opens a browser for GitHub OAuth)
mcp-publisher login github

# 3. Publish — validates ./server.json against the live registry schema
mcp-publisher publish
```

After publishing, the server is discoverable at
`https://registry.modelcontextprotocol.io` and by every MCP client that queries
it. Then fan out to the secondary catalogs (each just takes the endpoint
`https://socialperks.app/api/mcp` + a short description):

- Smithery — https://smithery.ai/new
- Glama — https://glama.ai/mcp/servers
- mcp.so — https://mcp.so
- PulseMCP — https://www.pulsemcp.com
- `wong2/awesome-mcp-servers` (PR)

## What still genuinely needs you (identity, not code)

- **ChatGPT App Directory** and **Claude Connectors Directory** require
  **business/identity verification** for "Social Perks" — a legal-identity step
  I can't (and shouldn't) submit on your behalf. Do this once; then submit the
  same `/api/mcp` server to both. The code side already satisfies their gates
  (OAuth consent flow, separate read/write tools, typed errors, cost meter).
- **`sameAs` / entity resolution**: create the live external profiles
  (X `@socialperksapp`, LinkedIn, a Wikidata item) and add their URLs to the
  `sameAs` array in `src/app/layout.tsx`. Only add URLs that resolve — a 404 in
  `sameAs` hurts more than an absent one.
