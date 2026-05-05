/**
 * Transport-agnostic MCP request handler for Social Perks.
 *
 * MCP (Model Context Protocol) is JSON-RPC 2.0 with a fixed schema.
 * The full SDK at @modelcontextprotocol/sdk handles stdio + WebSocket
 * + SSE transports — but for HTTP delivery (the web case) the
 * transport is just a POST handler. This module *is* that handler:
 * pure-function `handle(request) → response`. The transport runners
 * (./server.ts for stdio, the Next.js /api/mcp route for HTTP) just
 * pipe bytes in and out.
 *
 * Why hand-rolled instead of @modelcontextprotocol/sdk:
 *   - Zero deps means we run anywhere (Workers, Lambda, Vercel edge).
 *   - The wire format is small enough to maintain in 200 lines.
 *   - When the SDK stabilizes for non-stdio HTTP, we swap.
 */

import { SocialPerks, SocialPerksError } from "@socialperks/sdk";

// ─── Tool catalog ─────────────────────────────────────────────────────────

interface Tool {
  name: string;
  description: string;
  inputSchema: object;
  handler: (args: Record<string, unknown>, sp: SocialPerks) => Promise<unknown>;
}

const TOOLS: Tool[] = [
  {
    name: "list_action_ideas",
    description:
      "List the 107 marketing-action primitives. Filter by business type, platform, or budget. Returns ranked ideas an AI marketing agent can pick from.",
    inputSchema: {
      type: "object",
      properties: {
        businessType: { type: "string", description: "e.g. coffee_shop, salon, gym, restaurant" },
        platform: { type: "string", description: "instagram, tiktok, facebook, x" },
        tier: { type: "string", enum: ["essential", "high_impact", "growth", "premium", "starter"] },
      },
    },
    handler: (args, sp) =>
      sp.actions.list({
        businessType: args.businessType as string | undefined,
        platform: args.platform as string | undefined,
        tier: args.tier as never,
      }),
  },
  {
    name: "create_perk_campaign",
    description:
      "Create a perk campaign — a (platform, action, reward) tuple. Returns the campaign ID and the printable poster URL.",
    inputSchema: {
      type: "object",
      required: ["platformId", "actionId", "rewardType", "rewardValue"],
      properties: {
        platformId: { type: "string" },
        actionId: { type: "string" },
        rewardType: { type: "string", enum: ["pct", "dol", "free"] },
        rewardValue: { type: "string" },
        name: { type: "string" },
      },
    },
    handler: async (args, sp) => {
      const created = await sp.campaigns.create({
        platformId: String(args.platformId),
        actionId: String(args.actionId),
        rewardType: args.rewardType as "pct" | "dol" | "free",
        rewardValue: String(args.rewardValue),
        name: args.name as string | undefined,
      });
      return {
        campaign: created,
        posterUrl: sp.poster.url({ campaignId: created.id }),
      };
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
        perk: { type: "string" },
      },
    },
    handler: async (args, sp) => ({
      url: sp.poster.url({
        campaignId: String(args.campaignId),
        businessName: args.businessName as string | undefined,
        perk: args.perk as string | undefined,
      }),
    }),
  },
  {
    name: "list_campaigns",
    description: "List a business's campaigns. Use to read state before deciding to scale or end one.",
    inputSchema: {
      type: "object",
      properties: { status: { type: "string", enum: ["draft", "active", "paused", "ended"] } },
    },
    handler: (args, sp) => sp.campaigns.list({ status: args.status as string | undefined }),
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
    handler: (args, sp) =>
      sp.sms.enqueuePostPurchase({
        businessId: String(args.businessId),
        campaignId: String(args.campaignId),
        customerPhone: String(args.customerPhone),
        delayMinutes: args.delayMinutes as number | undefined,
      }),
  },
  {
    name: "ai_quick_start",
    description:
      "Get the single best campaign to launch first for a given business type. Use when the agent has just been told to 'help this shop' and needs a concrete first action.",
    inputSchema: {
      type: "object",
      required: ["businessType"],
      properties: {
        businessType: { type: "string", description: "coffee_shop, salon, gym, restaurant, etc." },
        budget: { type: "number" },
      },
    },
    handler: (args, sp) =>
      sp.ai.quickStart({
        businessType: String(args.businessType),
        budget: args.budget as number | undefined,
      }),
  },
];

// ─── JSON-RPC envelope ────────────────────────────────────────────────────

interface JsonRpcRequest {
  jsonrpc?: string;
  id?: number | string | null;
  method?: string;
  params?: Record<string, unknown>;
}

interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: number | string | null;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

const SERVER_INFO = {
  name: "social-perks",
  version: "0.1.0",
  description: "Customer-rewards primitives for local businesses.",
  vendor: "Social Perks",
  homepage: "https://socialperks.io",
};

const PROTOCOL_VERSION = "2024-11-05";

export interface HandlerOptions {
  /** API key used by the embedded SDK client. */
  apiKey: string;
  /** Override base URL. */
  baseUrl?: string;
  /** Optional fetch override (useful for tests). */
  fetch?: typeof fetch;
}

/**
 * Stateless request → response. Pass to the transport of your choice.
 */
export async function handle(req: JsonRpcRequest, opts: HandlerOptions): Promise<JsonRpcResponse> {
  const id = req.id ?? null;

  if (req.jsonrpc !== undefined && req.jsonrpc !== "2.0") {
    return { jsonrpc: "2.0", id, error: { code: -32600, message: "Invalid Request — jsonrpc must be 2.0" } };
  }

  if (req.method === "initialize") {
    return {
      jsonrpc: "2.0",
      id,
      result: {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
      },
    };
  }

  if (req.method === "tools/list") {
    return {
      jsonrpc: "2.0",
      id,
      result: {
        tools: TOOLS.map((t) => ({ name: t.name, description: t.description, inputSchema: t.inputSchema })),
      },
    };
  }

  if (req.method === "tools/call") {
    const name = (req.params?.name as string | undefined) ?? "";
    const args = (req.params?.arguments as Record<string, unknown> | undefined) ?? {};
    const tool = TOOLS.find((t) => t.name === name);
    if (!tool) {
      return { jsonrpc: "2.0", id, error: { code: -32602, message: `Unknown tool: ${name}` } };
    }
    const sp = new SocialPerks({ apiKey: opts.apiKey, baseUrl: opts.baseUrl, fetch: opts.fetch });
    try {
      const data = await tool.handler(args, sp);
      return {
        jsonrpc: "2.0",
        id,
        result: {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
          isError: false,
          structuredContent: data,
        },
      };
    } catch (e) {
      const msg = e instanceof SocialPerksError ? `${e.code}: ${e.message}` : e instanceof Error ? e.message : "unknown error";
      return {
        jsonrpc: "2.0",
        id,
        result: {
          content: [{ type: "text", text: msg }],
          isError: true,
        },
      };
    }
  }

  if (req.method === "ping") {
    return { jsonrpc: "2.0", id, result: {} };
  }

  return { jsonrpc: "2.0", id, error: { code: -32601, message: `Method not found: ${req.method}` } };
}

/** Static catalog for use in the discovery JSON (e.g. Next.js /api/mcp GET). */
export function catalog(): {
  mcp: { version: string };
  server: typeof SERVER_INFO;
  tools: { name: string; description: string; inputSchema: object }[];
} {
  return {
    mcp: { version: PROTOCOL_VERSION },
    server: SERVER_INFO,
    tools: TOOLS.map((t) => ({ name: t.name, description: t.description, inputSchema: t.inputSchema })),
  };
}
