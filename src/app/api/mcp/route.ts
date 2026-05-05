/**
 * GET/POST /api/mcp
 *
 * Stub MCP (Model Context Protocol) server. The full MCP transport
 * lives at `mcp.socialperks.io` (planned subdomain) backed by the
 * @modelcontextprotocol/sdk; this endpoint is a discovery shim that:
 *
 *   1. Returns the tool catalog (so a Cursor / Claude / smithery
 *      registry can preview what we expose without a transport).
 *   2. Accepts JSON-RPC 2.0 method calls for `tools/list` and
 *      `tools/call` so a curious agent can sanity-test the surface
 *      before wiring the proper MCP transport.
 *
 * Why this exists right now: the MCP registry submissions (smithery,
 * mcp.so, awesome-mcp) need a public URL where reviewers can see the
 * tool catalog. This route satisfies that without standing up the
 * full SDK transport. We swap to the SDK once we ship a separate
 * `mcp-server/` package.
 */
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

const TOOLS = [
  {
    name: "list_action_ideas",
    description:
      "List the 107 marketing-action primitives. Filter by business type, platform, or budget. Returns ranked ideas an AI marketing agent can pick from.",
    inputSchema: {
      type: "object",
      properties: {
        businessType: { type: "string", description: "e.g. coffee_shop, salon, gym, restaurant" },
        platform: { type: "string", description: "instagram, tiktok, facebook, x, etc." },
        budget: { type: "number", description: "Per-action perk budget in USD" },
      },
    },
  },
  {
    name: "create_perk_campaign",
    description:
      "Create a perk campaign — a (platform, action, reward) tuple. Returns the campaign ID and the printable poster URL. Use list_action_ideas first if you don't know what action to pick.",
    inputSchema: {
      type: "object",
      required: ["businessId", "platformId", "actionId", "rewardType", "rewardValue"],
      properties: {
        businessId: { type: "string" },
        platformId: { type: "string" },
        actionId: { type: "string" },
        rewardType: { type: "string", enum: ["pct", "dol", "free"] },
        rewardValue: { type: "string" },
        name: { type: "string" },
      },
    },
  },
  {
    name: "print_qr_poster",
    description:
      "Get the URL of the 8.5×11 SVG poster for an existing campaign. The shop owner prints this and tapes it to the counter.",
    inputSchema: {
      type: "object",
      required: ["campaignId"],
      properties: {
        campaignId: { type: "string" },
        businessName: { type: "string" },
      },
    },
  },
  {
    name: "get_campaign_stats",
    description:
      "Read campaign performance: completions, perks redeemed, estimated reach, marketing-equivalent-value. Use this to decide whether to scale a campaign or end it.",
    inputSchema: {
      type: "object",
      required: ["campaignId"],
      properties: { campaignId: { type: "string" } },
    },
  },
  {
    name: "enqueue_post_purchase_sms",
    description:
      "Schedule a post-purchase SMS to a customer's phone. Sent 2 hours after purchase by default. Includes the perk's claim URL.",
    inputSchema: {
      type: "object",
      required: ["businessId", "campaignId", "customerPhone"],
      properties: {
        businessId: { type: "string" },
        campaignId: { type: "string" },
        customerPhone: { type: "string", description: "E.164 format, e.g. +14155551234" },
        delayMinutes: { type: "number", default: 120 },
      },
    },
  },
];

const SERVER_INFO = {
  name: "social-perks",
  version: "0.1.0",
  description:
    "QR-code-driven customer-marketing primitives for local businesses. AI marketing agents can use these tools to plan, launch, and measure perk campaigns on behalf of small shops.",
  vendor: "Social Perks",
  homepage: "https://socialperks.io",
  documentation: "https://socialperks.io/api/v1/openapi",
};

export async function GET(_req: NextRequest) {
  // Discovery payload — what a registry / catalog reads to preview us.
  return new Response(
    JSON.stringify(
      {
        mcp: { version: "2024-11-05" },
        server: SERVER_INFO,
        tools: TOOLS,
        transport: {
          // The real MCP transport will live at mcp.socialperks.io
          // once we ship the SDK-backed server. Until then, callers
          // can use the JSON-RPC POST below for a basic preview.
          jsonRpcUrl: "/api/mcp",
          stdio: false,
          sse: false,
        },
      },
      null,
      2,
    ),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, max-age=300, s-maxage=3600",
        "Access-Control-Allow-Origin": "*",
      },
    },
  );
}

interface JsonRpcRequest {
  jsonrpc?: string;
  id?: number | string | null;
  method?: string;
  params?: Record<string, unknown>;
}

export async function POST(req: NextRequest) {
  let body: JsonRpcRequest = {};
  try {
    body = (await req.json()) as JsonRpcRequest;
  } catch {
    return Response.json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }, { status: 400 });
  }

  const id = body.id ?? null;

  if (body.method === "initialize") {
    return Response.json({
      jsonrpc: "2.0",
      id,
      result: {
        protocolVersion: "2024-11-05",
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
      },
    });
  }

  if (body.method === "tools/list") {
    return Response.json({ jsonrpc: "2.0", id, result: { tools: TOOLS } });
  }

  if (body.method === "tools/call") {
    // Stub responder — real call routing arrives with the SDK
    // transport. For now, document that callers should hit the
    // /api/v1/* REST routes directly until the transport lands.
    return Response.json({
      jsonrpc: "2.0",
      id,
      result: {
        content: [
          {
            type: "text",
            text: "MCP transport stub — call the corresponding /api/v1/* REST route directly. See /api/v1/openapi for the spec.",
          },
        ],
        isError: false,
      },
    });
  }

  return Response.json({ jsonrpc: "2.0", id, error: { code: -32601, message: "Method not found" } }, { status: 404 });
}
