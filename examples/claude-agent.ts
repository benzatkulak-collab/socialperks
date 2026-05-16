/**
 * Social Perks — Claude Agent Demo
 *
 * A Claude (Anthropic) agent driving the Social Perks MCP server. The
 * model receives a natural-language prompt from the user, plans the
 * work, and calls the MCP tools (createCampaign, submitProof, etc.) to
 * execute. This is the "user types a goal, the agent does the job"
 * shape that the agent-native primitives were designed for.
 *
 * Flow:
 *   1. Run the OAuth handshake (same as full-flow.ts) to obtain an
 *      API key bound to the user's business.
 *   2. Wire the Social Perks MCP server into the Anthropic SDK's
 *      `mcp_servers` parameter on `messages.create`.
 *   3. Send a single user prompt. The model decides which tools to
 *      call and in what order; the SDK handles the round-trips.
 *
 * Run:
 *   ANTHROPIC_API_KEY=sk-ant-...  npx tsx claude-agent.ts
 *
 * Env vars:
 *   ANTHROPIC_API_KEY   required
 *   SP_BASE_URL         default: https://socialperks.app
 *   SP_AGENT_NAME       default: "Claude Agent Demo"
 *   SP_USER_PROMPT      default: a coffee-shop Instagram campaign request
 */

import http from "node:http";
import { URL } from "node:url";
import Anthropic from "@anthropic-ai/sdk";

// ─── Config ─────────────────────────────────────────────────────────────────

const BASE_URL = process.env.SP_BASE_URL ?? "https://socialperks.app";
const AGENT_NAME = process.env.SP_AGENT_NAME ?? "Claude Agent Demo";
const CALLBACK_PORT = 4567;
const CALLBACK_URL = `http://localhost:${CALLBACK_PORT}/callback`;
const REQUESTED_SCOPES = [
  "read.campaigns",
  "write.campaigns",
  "read.submissions",
  "review.submissions",
];

const DEFAULT_USER_PROMPT =
  "Set up an Instagram story-tag campaign for my coffee shop. " +
  "Offer 15% off the next visit. Then check on it and tell me how many submissions we've received.";

// ─── OAuth handshake (same as full-flow.ts; see comments there) ────────────

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

function waitForCallback(expectedState: string): Promise<string> {
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
        res.end(`<h1>Denied</h1><p>${url.searchParams.get("error_description") ?? error}</p>`);
        server.close();
        reject(new Error(`Authorization denied: ${error}`));
        return;
      }
      if (!code || state !== expectedState) {
        res.writeHead(400, { "Content-Type": "text/plain" });
        res.end("Bad request");
        return;
      }
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(
        `<!DOCTYPE html><html><body style="font-family:system-ui;padding:40px;max-width:480px;margin:auto;">` +
          `<h1 style="color:#22D3EE">✓ Authorized</h1>` +
          `<p>Return to your terminal.</p>` +
          `</body></html>`
      );
      server.close();
      resolve(code);
    });
    server.listen(CALLBACK_PORT);
    server.on("error", reject);
  });
}

async function exchangeCode(
  code: string
): Promise<{ access_token: string; business_id: string }> {
  const res = await fetch(`${BASE_URL}/api/v1/agent-auth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, grant_type: "authorization_code" }),
  });
  const body = (await res.json()) as {
    success: boolean;
    data?: { access_token: string; business_id: string };
    error?: { message: string };
  };
  if (!res.ok || !body.success || !body.data) {
    throw new Error(`Token exchange failed: ${body.error?.message ?? res.status}`);
  }
  return body.data;
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error(
      "ANTHROPIC_API_KEY is required. Set it in your shell or .env file."
    );
    process.exit(1);
  }
  const userPrompt = process.env.SP_USER_PROMPT ?? DEFAULT_USER_PROMPT;

  console.log("Social Perks — Claude Agent Demo");
  console.log("=================================\n");

  // 1. OAuth handshake.
  const state = randomState();
  const consentUrl = buildConsentUrl(state);
  console.log("Open this URL to authorize:\n");
  console.log(`  ${consentUrl}\n`);
  const code = await waitForCallback(state);
  const token = await exchangeCode(code);
  console.log(`✓ Authorized for businessId=${token.business_id}\n`);

  // 2. Hand control to Claude with the Social Perks MCP server attached.
  console.log("Sending prompt to Claude:");
  console.log(`  "${userPrompt}"\n`);
  console.log("─".repeat(60));

  const client = new Anthropic({ apiKey });

  // The Anthropic SDK supports passing MCP servers directly to
  // messages.create via the `mcp_servers` parameter. Each server is
  // identified by URL + (optionally) headers/auth.
  //
  // NOTE: as of writing, MCP server support in the SDK is a beta
  // capability. Check the latest docs at
  // https://docs.anthropic.com/en/api/agents-and-tools for the
  // current invocation shape — the shape below works as of v0.40.
  const stream = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 4096,
    messages: [{ role: "user", content: userPrompt }],
    mcp_servers: [
      {
        type: "url",
        url: `${BASE_URL}/api/mcp`,
        name: "social-perks",
        authorization_token: token.access_token,
      },
    ],
    // Let the model loop through MCP calls without us managing the
    // turn-by-turn round-trip ourselves.
    betas: ["mcp-client-2025-04-04"],
  } as Parameters<typeof client.messages.create>[0]);

  // Print everything Claude produced. In a real agent you'd render
  // tool calls + results inline in your UI; this just dumps the raw
  // message content for visibility.
  if ("content" in stream) {
    for (const block of stream.content) {
      if (block.type === "text") {
        console.log(block.text);
      } else if (block.type === "tool_use") {
        console.log(`\n[tool_use] ${block.name}`);
        console.log(JSON.stringify(block.input, null, 2));
      } else {
        console.log(`\n[${block.type}]`, block);
      }
    }
  }

  console.log("\n" + "─".repeat(60));
  console.log("\nDone. Audit what the agent did at:");
  console.log(`  ${BASE_URL}/dashboard/agents`);
}

main().catch((e: unknown) => {
  console.error("\nFailed:", e instanceof Error ? e.message : e);
  process.exit(1);
});
