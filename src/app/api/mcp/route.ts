/**
 * POST /api/mcp
 *
 * Model Context Protocol (MCP) server endpoint.
 * Implements JSON-RPC 2.0 over HTTP per the MCP spec.
 *
 * Supported methods:
 *   - initialize
 *   - tools/list
 *   - tools/call
 *   - ping
 *
 * Tools exposed:
 *   - getPricing      → wraps GET /api/v1/pricing
 *   - listActions     → wraps GET /api/v1/actions
 *   - getBenchmarks   → wraps GET /api/v1/benchmarks
 *   - listCampaigns   → wraps GET /api/v1/campaigns
 *   - searchInfluencers → wraps GET /api/v1/influencers
 *
 * Auth: optional. Public tools work without auth; campaign and submission
 * tools require x-api-key or Authorization: Bearer.
 *
 * Reference: https://modelcontextprotocol.io/specification
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const PROTOCOL_VERSION = "2025-03-26";
const SERVER_NAME = "social-perks";
const SERVER_VERSION = "1.0.0";

interface JsonRpcRequest {
  jsonrpc: "2.0";
  id?: string | number | null;
  method: string;
  params?: Record<string, unknown>;
}

interface JsonRpcSuccess {
  jsonrpc: "2.0";
  id: string | number | null;
  result: unknown;
}

interface JsonRpcError {
  jsonrpc: "2.0";
  id: string | number | null;
  error: { code: number; message: string; data?: unknown };
}

type JsonRpcResponse = JsonRpcSuccess | JsonRpcError;

// ─── Tool registry ───────────────────────────────────────────────────────────

interface Tool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  /** Whether this tool requires authentication. */
  requiresAuth: boolean;
  /** Maps to a relative API path under /api/v1. Built lazily so we can pass query/body. */
  invoke: (args: Record<string, unknown>, ctx: { baseUrl: string; authHeader: string | null }) => Promise<unknown>;
}

async function callRestApi(
  baseUrl: string,
  path: string,
  init: RequestInit & { authHeader?: string | null } = {}
): Promise<unknown> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((init.headers as Record<string, string>) ?? {}),
  };
  if (init.authHeader) headers["Authorization"] = init.authHeader;
  const res = await fetch(`${baseUrl}${path}`, { ...init, headers });
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) return res.json();
  return { status: res.status, body: await res.text() };
}

const TOOLS: Tool[] = [
  {
    name: "getPricing",
    description:
      "Get the market-rate pricing for a marketing action. Returns USD value and recommended perk type/value.",
    requiresAuth: false,
    inputSchema: {
      type: "object",
      properties: {
        actionId: { type: "string", description: "Action ID (e.g. ig_post, google_review)" },
        platformId: { type: "string", description: "Platform ID (e.g. instagram, google)" },
        businessType: { type: "string", description: "Business type modifier (default: general)" },
      },
    },
    invoke: async (args, ctx) => {
      const params = new URLSearchParams();
      if (args.actionId) params.set("actionId", String(args.actionId));
      if (args.platformId) params.set("platformId", String(args.platformId));
      if (args.businessType) params.set("businessType", String(args.businessType));
      const qs = params.toString();
      return callRestApi(ctx.baseUrl, `/api/v1/pricing${qs ? `?${qs}` : ""}`);
    },
  },
  {
    name: "listActions",
    description:
      "List the 107 marketing actions available on Social Perks. Filterable by platform, type, and effort.",
    requiresAuth: false,
    inputSchema: {
      type: "object",
      properties: {
        platformId: { type: "string" },
        type: { type: "string", enum: ["content", "review", "engage", "share", "referral"] },
        maxEffort: { type: "integer", minimum: 0, maximum: 5 },
        page: { type: "integer", default: 1 },
        perPage: { type: "integer", default: 50 },
      },
    },
    invoke: async (args, ctx) => {
      const params = new URLSearchParams();
      for (const k of ["platformId", "type", "maxEffort", "page", "perPage"]) {
        if (args[k] !== undefined && args[k] !== null) params.set(k, String(args[k]));
      }
      const qs = params.toString();
      return callRestApi(ctx.baseUrl, `/api/v1/actions${qs ? `?${qs}` : ""}`);
    },
  },
  {
    name: "getBenchmarks",
    description: "Get industry benchmarks (engagement rate, conversion rate, etc.).",
    requiresAuth: false,
    inputSchema: {
      type: "object",
      properties: {
        industry: { type: "string" },
      },
    },
    invoke: async (args, ctx) => {
      const params = new URLSearchParams();
      if (args.industry) params.set("industry", String(args.industry));
      const qs = params.toString();
      return callRestApi(ctx.baseUrl, `/api/v1/benchmarks${qs ? `?${qs}` : ""}`);
    },
  },
  {
    name: "listCampaigns",
    description: "List campaigns. Requires auth — returns the caller's campaigns.",
    requiresAuth: true,
    inputSchema: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["draft", "active", "paused", "completed"] },
      },
    },
    invoke: async (args, ctx) => {
      const params = new URLSearchParams();
      if (args.status) params.set("status", String(args.status));
      const qs = params.toString();
      return callRestApi(ctx.baseUrl, `/api/v1/campaigns${qs ? `?${qs}` : ""}`, {
        authHeader: ctx.authHeader,
      });
    },
  },
  {
    name: "searchInfluencers",
    description: "Search influencers by platform and follower count.",
    requiresAuth: false,
    inputSchema: {
      type: "object",
      properties: {
        platform: { type: "string" },
        minFollowers: { type: "integer" },
      },
    },
    invoke: async (args, ctx) => {
      const params = new URLSearchParams();
      if (args.platform) params.set("platform", String(args.platform));
      if (args.minFollowers !== undefined) params.set("minFollowers", String(args.minFollowers));
      const qs = params.toString();
      return callRestApi(ctx.baseUrl, `/api/v1/influencers${qs ? `?${qs}` : ""}`);
    },
  },
];

// ─── JSON-RPC handlers ───────────────────────────────────────────────────────

function rpcError(id: string | number | null, code: number, message: string): JsonRpcError {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

function rpcResult(id: string | number | null, result: unknown): JsonRpcSuccess {
  return { jsonrpc: "2.0", id, result };
}

async function handleRpc(
  msg: JsonRpcRequest,
  ctx: { baseUrl: string; authHeader: string | null }
): Promise<JsonRpcResponse | null> {
  const id = msg.id ?? null;

  switch (msg.method) {
    case "initialize":
      return rpcResult(id, {
        protocolVersion: PROTOCOL_VERSION,
        serverInfo: { name: SERVER_NAME, version: SERVER_VERSION },
        capabilities: {
          tools: { listChanged: false },
        },
      });

    case "ping":
      return rpcResult(id, {});

    case "tools/list":
      return rpcResult(id, {
        tools: TOOLS.map((t) => ({
          name: t.name,
          description: t.description,
          inputSchema: t.inputSchema,
        })),
      });

    case "tools/call": {
      const params = msg.params ?? {};
      const name = params.name as string | undefined;
      const args = (params.arguments as Record<string, unknown>) ?? {};
      const tool = TOOLS.find((t) => t.name === name);
      if (!tool) return rpcError(id, -32602, `Unknown tool: ${name}`);
      if (tool.requiresAuth && !ctx.authHeader) {
        return rpcError(id, -32001, `Tool '${name}' requires authentication. Set x-api-key or Authorization header.`);
      }
      try {
        const result = await tool.invoke(args, ctx);
        return rpcResult(id, {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          isError: false,
        });
      } catch (e) {
        return rpcResult(id, {
          content: [{ type: "text", text: String(e instanceof Error ? e.message : e) }],
          isError: true,
        });
      }
    }

    case "notifications/initialized":
      // Notification — no response.
      return null;

    default:
      return rpcError(id, -32601, `Method not found: ${msg.method}`);
  }
}

// ─── HTTP handlers ───────────────────────────────────────────────────────────

function buildBaseUrl(req: NextRequest): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const host = req.headers.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}

export async function POST(req: NextRequest): Promise<Response> {
  let body: JsonRpcRequest | JsonRpcRequest[];
  try {
    body = (await req.json()) as JsonRpcRequest | JsonRpcRequest[];
  } catch {
    return NextResponse.json(rpcError(null, -32700, "Parse error: invalid JSON"), {
      status: 400,
    });
  }

  const ctx = {
    baseUrl: buildBaseUrl(req),
    authHeader:
      req.headers.get("authorization") ??
      (req.headers.get("x-api-key") ? `Bearer ${req.headers.get("x-api-key")}` : null),
  };

  // Batch
  if (Array.isArray(body)) {
    const results = await Promise.all(body.map((m) => handleRpc(m, ctx)));
    const filtered = results.filter((r): r is JsonRpcResponse => r !== null);
    return NextResponse.json(filtered);
  }

  const result = await handleRpc(body, ctx);
  if (!result) return new NextResponse(null, { status: 204 });
  return NextResponse.json(result);
}

export async function GET(req: NextRequest): Promise<Response> {
  // Manifest endpoint — what is this server, what tools exist?
  return NextResponse.json({
    name: SERVER_NAME,
    version: SERVER_VERSION,
    protocolVersion: PROTOCOL_VERSION,
    transport: "http",
    endpoint: `${buildBaseUrl(req)}/api/mcp`,
    capabilities: { tools: { listChanged: false } },
    tools: TOOLS.map((t) => ({
      name: t.name,
      description: t.description,
      requiresAuth: t.requiresAuth,
      inputSchema: t.inputSchema,
    })),
    documentation:
      "https://modelcontextprotocol.io/specification — see AGENTS.md in this repo for usage.",
  });
}

export const dynamic = "force-dynamic";
