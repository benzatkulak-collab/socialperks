# MCP Registry Submissions

This directory holds the artifacts and instructions for getting Social Perks listed in public MCP registries. **All four submissions need to happen from a human-controlled account** — they require GitHub OAuth, browser forms, and CAPTCHAs that Claude can't (and shouldn't) do.

The artifacts are pre-built. You copy/paste or click submit.

---

## 1. Anthropic MCP Registry (official)

The official registry powers Claude Desktop's catalog. Highest leverage.

**Submission flow:**

```bash
# Install the publisher CLI (one-time)
brew install mcp-publisher
# or: npm install -g @modelcontextprotocol/publisher

cd mcp-registry

# Authenticate with GitHub (one-time)
mcp-publisher login github

# Publish
mcp-publisher publish
```

The `server.json` in this directory is pre-filled with the live endpoint, description, and the optional auth header. It uses the `io.github.benzatkulak-collab/social-perks` namespace which matches your GitHub org — auth will work automatically.

**Verify after publish:**

```bash
curl https://registry.modelcontextprotocol.io/v0/servers \
  | jq '.[] | select(.name | startswith("io.github.benzatkulak-collab"))'
```

Approval is immediate on validation.

---

## 2. Smithery

Smithery is the most-trafficked third-party MCP catalog. Auto-discovers tools by hitting the endpoint.

**Submission flow:**

1. Go to **https://smithery.ai/new**
2. Sign in with GitHub if you haven't
3. Paste `https://socialperks.app/api/mcp` into the URL field
4. Smithery introspects the server and lists the 10 tools
5. Fill in:
   - **Display name:** Social Perks
   - **Tagline:** Autonomous customer-marketing for small businesses
   - **Description:** (use the one from `server.json` above)
   - **Category:** Marketing / Sales
6. For auth: select "API Key", header `Authorization`, prefix `Bearer `
7. Click **Publish**

After publish, request **vendor verification** at Settings → Verification. This proves you control socialperks.app and adds a verified-vendor badge.

---

## 3. mcp.so

Public directory. No account required.

**Submission flow:**

1. Go to **https://mcp.so/submit**
2. Fill in:
   - **Name:** Social Perks
   - **URL:** `https://socialperks.app/api/mcp`
   - **GitHub:** `https://github.com/benzatkulak-collab/socialperks`
   - **Description:** Autonomous customer-marketing platform with MCP-native tools for AI agents. 10 tools spanning pricing lookup, campaign creation, submission review, and influencer search.
   - **Tags:** marketing, sales, small-business, customer-engagement, reviews
   - **Category:** Marketing
3. Click **Submit**

Manual moderation; typically approved within a few days.

---

## 4. Composio

**Skip.** Composio doesn't accept public third-party submissions — their catalog is curated through partnership. Their gateway *can* proxy your server for end-users, but you'd need to onboard via their sales team.

If you want this anyway, contact partners@composio.dev with the same description.

---

## After all 4 are live

The next step is **traffic** to those listings:

1. Post the Smithery URL on Hacker News ("Show HN: …")
2. Post on r/ClaudeAI / r/LocalLLaMA / r/SmallBusiness
3. Tweet the Smithery URL with a 30-second demo Loom

Listings without traffic generate near-zero discovery. Listings with one well-timed post can generate hundreds of agent users in 24 hours.
