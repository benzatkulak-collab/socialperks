/**
 * GET/POST /api/mcp — HTTP transport for the Social Perks MCP server.
 *
 *   GET  → discovery JSON (catalog of tools)
 *   POST → JSON-RPC 2.0 request handler
 *
 * Auth: a bearer Social Perks API key (sk_live_...) is required for
 * `tools/call`. `initialize` and `tools/list` are public so a registry
 * (smithery, mcp.so, Cursor catalog) can preview the surface without
 * provisioning a key first.
 *
 * The handler itself lives in @socialperks/mcp-server so the same
 * code powers both the stdio binary (`socialperks-mcp`) and this
 * HTTP transport. One implementation, two shells.
 */

import type { NextRequest } from "next/server";
import { handle, catalog } from "@socialperks/mcp-server/handler";

export const runtime = "nodejs";

export async function GET() {
  return Response.json(
    {
      ...catalog(),
      transport: {
        jsonRpcUrl: "/api/mcp",
        stdio: "npx -y @socialperks/mcp-server",
      },
      auth: {
        type: "bearer",
        getKey: "POST /api/v1/dev/init { email } — or run `npx @socialperks/cli init`",
      },
    },
    {
      headers: {
        "Cache-Control": "public, max-age=300, s-maxage=3600",
        "Access-Control-Allow-Origin": "*",
      },
    },
  );
}

function readApiKey(req: NextRequest): string | null {
  const auth = req.headers.get("authorization");
  if (auth && auth.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim();
  return req.headers.get("x-api-key");
}

interface JsonRpcLike {
  jsonrpc?: string;
  id?: number | string | null;
  method?: string;
  params?: Record<string, unknown>;
}

export async function POST(req: NextRequest) {
  let body: JsonRpcLike;
  try {
    body = (await req.json()) as JsonRpcLike;
  } catch {
    return Response.json(
      { jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } },
      { status: 400 },
    );
  }

  // Public methods don't need a key — registries preview them.
  const isPublic = body.method === "initialize" || body.method === "tools/list" || body.method === "ping";
  const apiKey = readApiKey(req);

  if (!isPublic && !apiKey) {
    return Response.json(
      {
        jsonrpc: "2.0",
        id: body.id ?? null,
        error: {
          code: -32001,
          message:
            "Missing API key. Pass `Authorization: Bearer sk_live_...`. Get a key with `npx @socialperks/cli init`.",
        },
      },
      { status: 401 },
    );
  }

  const result = await handle(body, {
    apiKey: apiKey ?? "preview",
    baseUrl:
      process.env.NEXT_PUBLIC_SITE_URL ??
      (process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : undefined),
  });
  return Response.json(result, {
    headers: { "Access-Control-Allow-Origin": "*" },
  });
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key",
      "Access-Control-Max-Age": "86400",
    },
  });
}
