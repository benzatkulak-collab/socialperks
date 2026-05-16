/**
 * Social Perks — Full Agent Flow (no Anthropic SDK required)
 *
 * Demonstrates the end-to-end agent loop:
 *
 *   1. Direct the user to /agent/authorize with the agent's identity +
 *      requested scopes (the OAuth-style consent screen).
 *   2. Catch the redirect callback on a tiny local HTTP server.
 *   3. Exchange the authorization code for a scoped API key.
 *   4. List the tools exposed by the MCP server (with per-tool cost
 *      models in `_meta.cost`).
 *   5. Create a campaign via the MCP `createCampaign` write tool.
 *   6. Read the `_meta` block on the response to inspect what the call
 *      cost (rate-limit remaining, duration, downstream status).
 *
 * Zero external dependencies. Stdlib `http` for the callback server,
 * stdlib `fetch` for all API calls.
 *
 * Run:
 *   npx tsx full-flow.ts
 *
 * Env vars (all optional):
 *   SP_BASE_URL              Default: https://socialperks.app
 *   SP_AGENT_NAME            Default: "Example Agent (full-flow.ts)"
 *   SP_BUSINESS_ID           If you already know the user's businessId,
 *                            pass it to skip the introspection step.
 */

import http from "node:http";
import { URL } from "node:url";

// ─── Config ─────────────────────────────────────────────────────────────────

const BASE_URL = process.env.SP_BASE_URL ?? "https://socialperks.app";
const AGENT_NAME = process.env.SP_AGENT_NAME ?? "Example Agent (full-flow.ts)";
const CALLBACK_PORT = 4567;
const CALLBACK_URL = `http://localhost:${CALLBACK_PORT}/callback`;
const REQUESTED_SCOPES = [
  "read.campaigns",
  "write.campaigns",
  "read.submissions",
] as const;

// ─── Step 1+2: capture the authorization code via local callback ───────────

interface AuthorizationResult {
  code: string;
  state: string;
}

function waitForCallback(expectedState: string): Promise<AuthorizationResult> {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url ?? "/", `http://localhost:${CALLBACK_PORT}`);
      if (url.pathname !== "/callback") {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("Not found");
        return;
      }

      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");
      const error = url.searchParams.get("error");

      if (error) {
        res.writeHead(400, { "Content-Type": "text/html" });
        res.end(
          `<h1>Authorization denied</h1><p>${url.searchParams.get("error_description") ?? error}</p>` +
            `<p>You can close this window.</p>`
        );
        server.close();
        reject(new Error(`Authorization denied: ${error}`));
        return;
      }

      if (!code || !state) {
        res.writeHead(400, { "Content-Type": "text/plain" });
        res.end("Missing code or state");
        return;
      }

      if (state !== expectedState) {
        res.writeHead(400, { "Content-Type": "text/plain" });
        res.end(
          "State parameter doesn't match — possible CSRF attempt. Authorization rejected."
        );
        server.close();
        reject(new Error("State mismatch"));
        return;
      }

      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(
        `<!DOCTYPE html><html><body style="font-family:system-ui;padding:40px;max-width:480px;margin:auto;">` +
          `<h1 style="color:#22D3EE">✓ Authorized</h1>` +
          `<p>You can close this window and return to your terminal.</p>` +
          `</body></html>`
      );

      server.close();
      resolve({ code, state });
    });

    server.listen(CALLBACK_PORT);
    server.on("error", reject);
  });
}

function randomState(): string {
  return Array.from({ length: 16 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join("");
}

function buildConsentUrl(state: string): string {
  const params = new URLSearchParams({
    agent_name: AGENT_NAME,
    scope: REQUESTED_SCOPES.join(","),
    redirect_uri: CALLBACK_URL,
    state,
  });
  return `${BASE_URL}/agent/authorize?${params.toString()}`;
}

// ─── Step 3: exchange code for API key ─────────────────────────────────────

interface TokenResponse {
  access_token: string;
  token_type: "bearer";
  scope: string;
  business_id: string;
  agent_name: string;
}

async function exchangeCode(code: string): Promise<TokenResponse> {
  const res = await fetch(`${BASE_URL}/api/v1/agent-auth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, grant_type: "authorization_code" }),
  });
  const body = (await res.json()) as { success: boolean; data?: TokenResponse; error?: { message: string } };
  if (!res.ok || !body.success || !body.data) {
    throw new Error(`Token exchange failed: ${body.error?.message ?? res.status}`);
  }
  return body.data;
}

// ─── Steps 4–6: drive the MCP server ───────────────────────────────────────

interface McpResult {
  content: Array<{ type: string; text: string }>;
  isError: boolean;
  _meta?: {
    durationMs: number;
    cost: { type: "free" } | { type: "plan"; resource: string; consumedPerCall: number } | { type: "cash"; minCents: number; maxCents: number; description: string };
    rateLimit: { limit: number | null; remaining: number | null; resetAt: string | null } | null;
    downstreamStatus: number | null;
  };
}

async function mcpCall(
  apiKey: string,
  method: string,
  params: Record<string, unknown>
): Promise<unknown> {
  const res = await fetch(`${BASE_URL}/api/mcp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: Math.floor(Math.random() * 1_000_000),
      method,
      params,
    }),
  });
  const body = (await res.json()) as { result?: unknown; error?: { code: number; message: string } };
  if (body.error) {
    throw new Error(`MCP ${method} failed: ${body.error.message}`);
  }
  return body.result;
}

function printCostMeta(label: string, meta: McpResult["_meta"]) {
  if (!meta) return;
  const parts: string[] = [`${meta.durationMs}ms`];
  if (meta.cost.type === "free") parts.push("free");
  else if (meta.cost.type === "plan") parts.push(`plan:${meta.cost.resource}×${meta.cost.consumedPerCall}`);
  else if (meta.cost.type === "cash") parts.push(`cash:${meta.cost.description}`);
  if (meta.rateLimit?.remaining !== null && meta.rateLimit?.limit !== null) {
    parts.push(`rate-limit:${meta.rateLimit?.remaining}/${meta.rateLimit?.limit}`);
  }
  if (meta.downstreamStatus !== null) parts.push(`status:${meta.downstreamStatus}`);
  console.log(`    ${label}: ${parts.join(" · ")}`);
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
  console.log("Social Perks — Full Agent Flow Demo");
  console.log("=====================================\n");

  // 1. Build consent URL and prompt the user to open it.
  const state = randomState();
  const consentUrl = buildConsentUrl(state);
  console.log("Step 1: open this URL in a browser and click Approve:\n");
  console.log(`  ${consentUrl}\n`);
  console.log(`Waiting for the redirect to ${CALLBACK_URL} ...\n`);

  // 2. Wait for the callback.
  const { code } = await waitForCallback(state);
  console.log("Step 2: authorization code received.\n");

  // 3. Exchange code → API key.
  const token = await exchangeCode(code);
  console.log(`Step 3: API key minted for businessId=${token.business_id}`);
  console.log(`        scope: ${token.scope}\n`);

  // 4. List tools to confirm what's available + see cost models.
  const toolsList = (await mcpCall(token.access_token, "tools/list", {})) as {
    tools: Array<{ name: string; _meta?: { cost: McpResult["_meta"] extends infer T ? (T extends { cost: infer C } ? C : never) : never } }>;
  };
  console.log("Step 4: tools available:");
  for (const t of toolsList.tools) {
    const costStr = t._meta?.cost ? JSON.stringify(t._meta.cost) : "?";
    console.log(`  • ${t.name}  ${costStr}`);
  }
  console.log("");

  // 5. Create a sample campaign.
  console.log("Step 5: creating a campaign via MCP createCampaign...");
  const createResult = (await mcpCall(token.access_token, "tools/call", {
    name: "createCampaign",
    arguments: {
      businessId: token.business_id,
      name: "Example Agent Demo — Instagram Story Tag",
      description: "Created by examples/full-flow.ts to demonstrate the agent flow.",
      actions: ["ig_st"],
      discountValue: 15,
      discountType: "pct",
      expiresInDays: 30,
    },
  })) as McpResult;

  if (createResult.isError) {
    console.error("    Campaign creation failed:");
    console.error(`    ${createResult.content[0]?.text}`);
  } else {
    console.log("    ✓ Campaign created.");
    const payload = JSON.parse(createResult.content[0]?.text ?? "{}") as {
      data?: { id?: string };
    };
    if (payload.data?.id) {
      console.log(`    campaignId: ${payload.data.id}`);
    }
  }
  printCostMeta("cost", createResult._meta);
  console.log("");

  // 6. Dashboard link.
  console.log("Step 6: your user can audit this activity at:");
  console.log(`  ${BASE_URL}/dashboard/agents\n`);

  console.log("Done. The API key (${token.access_token.slice(0, 12)}...) is now");
  console.log("usable for subsequent calls. Store it securely.");
}

main().catch((e: unknown) => {
  console.error("\nFailed:", e instanceof Error ? e.message : e);
  process.exit(1);
});
