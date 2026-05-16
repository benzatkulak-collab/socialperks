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

/**
 * Cost model for a tool. Agents read this to reason about spend BEFORE
 * invoking. Three categories:
 *
 *   - "free":    no plan-tier or cash impact (catalog / reference reads)
 *   - "plan":    consumes a unit of plan capacity (campaigns, AI gens, etc.)
 *   - "cash":    moves real money (cashback payouts, premium boosts)
 *
 * The shape is intentionally small so it can be inlined in tool
 * descriptions and the GET manifest without bloating responses.
 */
type ToolCost =
  | { type: "free" }
  | {
      type: "plan";
      /** Which usage bucket the call consumes. Matches getUsageSummary keys. */
      resource: "campaigns" | "submissions" | "ai_generations" | "completions";
      /** Units consumed per successful call. Almost always 1. */
      consumedPerCall: number;
    }
  | {
      type: "cash";
      /** Min/max cents moved. Specific amount comes from the call args. */
      minCents: number;
      maxCents: number;
      /** Human-readable cost description for agent reasoning. */
      description: string;
    };

/**
 * Tool execution context. The optional _captureMeta hook lets the
 * MCP layer collect downstream REST metadata for the cost envelope
 * without each tool having to know it exists.
 */
interface ToolCtx {
  baseUrl: string;
  authHeader: string | null;
  _captureMeta?: (meta: RestCallMeta) => void;
}

interface Tool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  /** Whether this tool requires authentication. */
  requiresAuth: boolean;
  /** Cost model — agents read this to reason about spend before invoking. */
  cost: ToolCost;
  /** Maps to a relative API path under /api/v1. Built lazily so we can pass query/body. */
  invoke: (args: Record<string, unknown>, ctx: ToolCtx) => Promise<unknown>;
}

/**
 * Captured response metadata from a downstream REST call. We extract
 * rate-limit headers + duration here so the MCP layer can surface them
 * to the agent in the tool response envelope.
 */
interface RestCallMeta {
  status: number;
  durationMs: number;
  rateLimit: {
    limit: number | null;
    remaining: number | null;
    /** ISO timestamp when the window resets. */
    resetAt: string | null;
  };
}

/**
 * Wraps the downstream REST call and captures both the parsed body
 * AND the response metadata. Older single-return callRestApi remains
 * usable by tools that don't need the meta.
 */
async function callRestApiWithMeta(
  baseUrl: string,
  path: string,
  init: RequestInit & { authHeader?: string | null } = {}
): Promise<{ body: unknown; meta: RestCallMeta }> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((init.headers as Record<string, string>) ?? {}),
  };
  if (init.authHeader) headers["Authorization"] = init.authHeader;

  const started = Date.now();
  const res = await fetch(`${baseUrl}${path}`, { ...init, headers });
  const durationMs = Date.now() - started;

  // Standard rate-limit headers emitted by lib/security/rate-limiter.
  // Parse defensively — anything missing/non-numeric collapses to null
  // so the agent sees an explicit absence, not a garbage number.
  const parseNumHeader = (h: string): number | null => {
    const v = res.headers.get(h);
    if (v === null) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  const resetEpochSeconds = parseNumHeader("X-RateLimit-Reset");
  const rateLimit: RestCallMeta["rateLimit"] = {
    limit: parseNumHeader("X-RateLimit-Limit"),
    remaining: parseNumHeader("X-RateLimit-Remaining"),
    resetAt:
      resetEpochSeconds !== null
        ? new Date(resetEpochSeconds * 1000).toISOString()
        : null,
  };

  let body: unknown;
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    body = await res.json();
  } else {
    body = { status: res.status, body: await res.text() };
  }

  return { body, meta: { status: res.status, durationMs, rateLimit } };
}

/**
 * Tools call this. It auto-captures RestCallMeta into the surrounding
 * tool/call context (if a _captureMeta hook is present) so the outer
 * handler can attach rate-limit + duration info to the response
 * envelope. Tools don't need to know any of this — they just call
 * callRestApi the same way as before.
 *
 * The ctx parameter is optional so existing tool signatures (the
 * ones from before the cost meter landed) keep working unchanged.
 */
async function callRestApi(
  baseUrl: string,
  path: string,
  init: RequestInit & { authHeader?: string | null } = {},
  ctx?: { _captureMeta?: (meta: RestCallMeta) => void }
): Promise<unknown> {
  const { body, meta } = await callRestApiWithMeta(baseUrl, path, init);
  ctx?._captureMeta?.(meta);
  return body;
}

// ─── Cost-meta builder ───────────────────────────────────────────────────────

interface CostMeta {
  /** Total time the MCP server spent on the tool/call, including the
   * downstream REST round-trip. */
  durationMs: number;
  /** The tool's declared cost model (echoed from the registry so an
   * agent can verify what category this call belonged to). */
  cost: ToolCost;
  /** Rate-limit budget AFTER this call, from the downstream REST
   * response. Null when the tool didn't make a metered REST call
   * (cached / catalog tools). */
  rateLimit: {
    limit: number | null;
    remaining: number | null;
    resetAt: string | null;
  } | null;
  /** Downstream HTTP status (if any) — lets agents distinguish a
   * tool that "succeeded" from MCP's POV but returned a 4xx body. */
  downstreamStatus: number | null;
}

function buildCostMeta(args: {
  tool: Tool;
  totalDurationMs: number;
  downstream: RestCallMeta | null;
}): CostMeta {
  return {
    durationMs: args.totalDurationMs,
    cost: args.tool.cost,
    rateLimit: args.downstream?.rateLimit ?? null,
    downstreamStatus: args.downstream?.status ?? null,
  };
}

const TOOLS: Tool[] = [
  {
    name: "getPricing",
    description:
      "Get the market-rate pricing for a marketing action. Returns USD value and recommended perk type/value.",
    requiresAuth: false,
    cost: { type: "free" },
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
      return callRestApi(ctx.baseUrl, `/api/v1/pricing${qs ? `?${qs}` : ""}`, {}, ctx);
    },
  },
  {
    name: "listActions",
    description:
      "List the 107 marketing actions available on Social Perks. Filterable by platform, type, and effort.",
    requiresAuth: false,
    cost: { type: "free" },
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
      return callRestApi(ctx.baseUrl, `/api/v1/actions${qs ? `?${qs}` : ""}`, {}, ctx);
    },
  },
  {
    name: "getBenchmarks",
    description: "Get industry benchmarks (engagement rate, conversion rate, etc.).",
    requiresAuth: false,
    cost: { type: "free" },
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
      return callRestApi(ctx.baseUrl, `/api/v1/benchmarks${qs ? `?${qs}` : ""}`, {}, ctx);
    },
  },
  {
    name: "listCampaigns",
    description: "List campaigns. Requires auth — returns the caller's campaigns.",
    requiresAuth: true,
    cost: { type: "free" },
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
      return callRestApi(
        ctx.baseUrl,
        `/api/v1/campaigns${qs ? `?${qs}` : ""}`,
        { authHeader: ctx.authHeader },
        ctx
      );
    },
  },
  {
    name: "searchInfluencers",
    description: "Search influencers by platform and follower count.",
    requiresAuth: false,
    cost: { type: "free" },
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
      return callRestApi(ctx.baseUrl, `/api/v1/influencers${qs ? `?${qs}` : ""}`, {}, ctx);
    },
  },

  // ─── Write tools (agent-native primitives) ────────────────────────────────
  // These complete the read-only catalog above into a transactional API.
  // Each requires an API key bound to the calling business — the api-keys
  // module verifies, _shared.ts/getUser synthesizes an AuthUser, and the
  // underlying REST route enforces tenant isolation on the businessId
  // resolved from that key. Agents cannot operate cross-tenant.
  //
  // CSRF is intentionally bypassed for API-key callers (see
  // _shared.ts:requireCsrf comment for the threat-model rationale).

  {
    name: "createCampaign",
    description:
      "Create and launch a new campaign for the calling business. Returns the campaign id, name, and dashboard URL. The campaign goes live immediately — no separate publish step.",
    requiresAuth: true,
    inputSchema: {
      type: "object",
      required: ["businessId", "name", "actions", "discountValue", "discountType"],
      properties: {
        businessId: { type: "string", description: "The business owning this campaign. Must match the API key's business." },
        name: { type: "string", description: "Customer-facing campaign name", maxLength: 200 },
        description: { type: "string", description: "Optional internal description" },
        actions: {
          type: "array",
          items: { type: "string" },
          minItems: 1,
          description: "Action IDs the campaign accepts (e.g. ['ig_st'] for an Instagram Story Tag).",
        },
        discountValue: {
          type: "number",
          minimum: 0.01,
          description: "Discount amount. Capped at 100 for pct, 10000 for dol.",
        },
        discountType: {
          type: "string",
          enum: ["pct", "dol"],
          description: "Discount denomination: 'pct' for percentage, 'dol' for dollars off.",
        },
        maxCompletions: {
          type: ["integer", "null"],
          description: "Optional cap on total completions. Null = no cap.",
        },
        expiresInDays: {
          type: "integer",
          minimum: 1,
          maximum: 365,
          description: "Days until the campaign auto-expires. Default 60.",
        },
      },
    },
    invoke: async (args, ctx) => {
      return callRestApi(ctx.baseUrl, `/api/v1/campaigns`, {
        method: "POST",
        body: JSON.stringify(args),
        authHeader: ctx.authHeader,
      });
    },
  },
  {
    name: "submitProof",
    description:
      "Submit proof of completion for a campaign action — a public URL to a post, a screenshot, a video, or platform-verified data. The submission enters a review queue (or auto-approves depending on the campaign's verification mode).",
    requiresAuth: true,
    inputSchema: {
      type: "object",
      required: ["campaignId", "actionId", "proofUrl", "proofType"],
      properties: {
        campaignId: { type: "string", description: "Campaign the submission applies to." },
        actionId: { type: "string", description: "Specific action being completed (must be allowed by the campaign)." },
        proofUrl: {
          type: "string",
          description: "Public URL of the proof. For url-type submissions, the platform verifier will fetch this.",
          maxLength: 2048,
        },
        proofType: {
          type: "string",
          enum: ["screenshot", "url", "video", "api_verified"],
          description: "How the proof was captured. 'url' triggers automated verification.",
        },
        metadata: {
          type: "object",
          description: "Optional bag of context (poster handle, post timestamp, etc.).",
          additionalProperties: true,
        },
      },
    },
    invoke: async (args, ctx) => {
      return callRestApi(ctx.baseUrl, `/api/v1/submissions`, {
        method: "POST",
        body: JSON.stringify(args),
        authHeader: ctx.authHeader,
      });
    },
  },
  {
    name: "reviewSubmission",
    description:
      "Approve or reject a submission. Approving releases the perk; rejecting requires a reason. Use this when the business chooses manual review over auto-verification.",
    requiresAuth: true,
    inputSchema: {
      type: "object",
      required: ["submissionId", "decision"],
      properties: {
        submissionId: { type: "string", description: "Submission id from a prior submitProof call." },
        decision: {
          type: "string",
          enum: ["approve", "reject"],
          description: "Approve releases the perk. Reject explains why the proof was insufficient.",
        },
        reason: {
          type: "string",
          description: "Required when decision='reject'. 1-500 chars.",
          maxLength: 500,
        },
      },
    },
    invoke: async (args, ctx) => {
      return callRestApi(ctx.baseUrl, `/api/v1/submissions/review`, {
        method: "POST",
        body: JSON.stringify(args),
        authHeader: ctx.authHeader,
      });
    },
  },
  {
    name: "listSubmissions",
    description:
      "List submissions for a business or campaign, filterable by state (pending/approved/rejected). Returns paginated results.",
    requiresAuth: true,
    inputSchema: {
      type: "object",
      properties: {
        businessId: { type: "string" },
        campaignId: { type: "string" },
        state: { type: "string", enum: ["pending", "approved", "rejected"] },
        page: { type: "integer", minimum: 1, default: 1 },
        perPage: { type: "integer", minimum: 1, maximum: 100, default: 25 },
      },
    },
    invoke: async (args, ctx) => {
      const params = new URLSearchParams();
      for (const k of ["businessId", "campaignId", "state", "page", "perPage"]) {
        if (args[k] !== undefined && args[k] !== null) params.set(k, String(args[k]));
      }
      const qs = params.toString();
      return callRestApi(ctx.baseUrl, `/api/v1/submissions${qs ? `?${qs}` : ""}`, {
        authHeader: ctx.authHeader,
      });
    },
  },
  {
    name: "getCampaignStats",
    description:
      "Get summary stats for a single campaign — total submissions, approved count, conversion rate, perks issued, and time-to-first-submission. Useful for an agent reporting back to its user.",
    requiresAuth: true,
    inputSchema: {
      type: "object",
      required: ["campaignId"],
      properties: {
        campaignId: { type: "string", description: "Campaign to fetch stats for." },
      },
    },
    invoke: async (args, ctx) => {
      // /api/v1/campaigns supports ?id= for single-campaign fetch with
      // a stats block. Falls back to listing if the precise endpoint
      // shape differs at runtime.
      const id = String(args.campaignId);
      return callRestApi(
        ctx.baseUrl,
        `/api/v1/campaigns?id=${encodeURIComponent(id)}&includeStats=true`,
        { authHeader: ctx.authHeader }
      );
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
          // Non-standard but spec-allowed extension. Agents that
          // understand `_meta.cost` use it for pre-call planning;
          // older clients ignore it.
          _meta: { cost: t.cost },
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

      // Capture timing + downstream rate-limit state so the cost meter
      // can surface them on the response envelope. The metering ctx
      // forwards every callRestApi(With|out)Meta call's RestCallMeta
      // into this slot so the OUTER handler can read it after the
      // tool's invoke() returns.
      const meteringCtx: { lastMeta: RestCallMeta | null } = { lastMeta: null };
      const wrappedCtx = {
        ...ctx,
        // Tools that use the shared callRestApi helper don't need to
        // change; we intercept by swapping the function on the invoke
        // path. The wrap is per-call so concurrent tool/call requests
        // don't bleed state into each other.
        _captureMeta: (meta: RestCallMeta) => {
          meteringCtx.lastMeta = meta;
        },
      };

      const startedAt = Date.now();
      try {
        // Invoke with the wrapped context. Tools that want to surface
        // their own RestCallMeta can call ctx._captureMeta if they
        // route through callRestApiWithMeta directly. For tools that
        // use plain callRestApi we still record total tool duration so
        // the agent has at least one cost signal.
        const result = await tool.invoke(args, wrappedCtx);
        const totalDurationMs = Date.now() - startedAt;

        const costMeta = buildCostMeta({
          tool,
          totalDurationMs,
          downstream: meteringCtx.lastMeta,
        });

        return rpcResult(id, {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          isError: false,
          // _meta is the MCP-spec-permitted free-form field on tool
          // results. Agents read it (or ignore it) without breaking
          // protocol conformance.
          _meta: costMeta,
        });
      } catch (e) {
        const totalDurationMs = Date.now() - startedAt;
        return rpcResult(id, {
          content: [{ type: "text", text: String(e instanceof Error ? e.message : e) }],
          isError: true,
          _meta: buildCostMeta({
            tool,
            totalDurationMs,
            downstream: meteringCtx.lastMeta,
          }),
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
      // Cost model surfaced in the manifest so an agent can decide
      // whether to call a tool BEFORE invoking it. Mirrors what
      // appears in the _meta block on every tool/call response.
      cost: t.cost,
      inputSchema: t.inputSchema,
    })),
    documentation:
      "https://modelcontextprotocol.io/specification — see AGENTS.md in this repo for usage.",
  });
}

export const dynamic = "force-dynamic";
