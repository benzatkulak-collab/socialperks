/**
 * POST /api/v1/dev/init
 *
 * Agent-runnable account provisioning. The whole reason this endpoint
 * exists: every standard signup flow assumes a human-with-browser to
 * click "verify email" and "create API key." AI agents can't do that.
 * This route trades convenience-of-the-flow for ability-to-be-called-
 * by-an-agent: one POST in, an API key out.
 *
 * Trade-offs we accept:
 *   - No email verification at this endpoint. Email is recorded for
 *     comms but not gated. The auto-issued key has read-only scope by
 *     default; write access requires upgrading via the dashboard.
 *   - Idempotent on email: re-calling with the same email returns the
 *     existing business + a fresh key (the old key is rotated). This
 *     is what makes the flow safe for `npx @socialperks/cli init`
 *     re-runs and CI pipelines.
 *
 * Rate-limit: standard tier (the rate-limiter is keyed on IP, so a
 * single CI machine that re-runs init in tests will eventually be
 * limited — pass --api-key directly for high-frequency cases).
 */

import type { NextRequest } from "next/server";
import { autoIssueOnSignup } from "@/lib/api-keys/auto-issue";
import { checkRateLimit, rateLimitHeaders } from "@/lib/security/rate-limiter";
import { db, InMemoryConnection } from "@/lib/db/connection";

const usingDb = !(db instanceof InMemoryConnection);

interface InitRequest {
  email?: string;
  businessName?: string;
  source?: string;
}

interface InitResponse {
  apiKey: string;
  businessId: string;
  baseUrl: string;
  message: string;
}

// In-memory cache + (when DATABASE_URL is set) write-through Postgres.
// Both layers are consulted for idempotency: re-init with the same
// email returns the same business_id even across redeploys.
const emailToBusinessId = new Map<string, string>();

async function lookupBusinessId(email: string): Promise<string | null> {
  const cached = emailToBusinessId.get(email);
  if (cached) return cached;
  if (!usingDb) return null;
  try {
    const result = await db.query<{ business_id: string }>(
      `SELECT business_id FROM dev_init_emails WHERE email = $1 LIMIT 1`,
      [email],
    );
    const row = result.rows[0];
    if (!row) return null;
    emailToBusinessId.set(email, row.business_id);
    return row.business_id;
  } catch (e) {
    console.error("[dev/init] db lookup failed:", e);
    return null;
  }
}

async function recordInit(args: {
  email: string;
  businessId: string;
  businessName: string;
  source: string | undefined;
}): Promise<void> {
  emailToBusinessId.set(args.email, args.businessId);
  if (!usingDb) return;
  try {
    await db.query(
      `INSERT INTO dev_init_emails (email, business_id, business_name, source, last_init_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (email) DO UPDATE
         SET business_name = EXCLUDED.business_name,
             source = COALESCE(EXCLUDED.source, dev_init_emails.source),
             last_init_at = NOW()`,
      [args.email, args.businessId, args.businessName, args.source ?? null],
    );
  } catch (e) {
    console.error("[dev/init] db write failed:", e);
  }
}

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "https://socialperks.io");

function isValidEmail(s: string): boolean {
  // Permissive RFC-5322-ish — we only block obvious garbage; the real
  // verification is whether the email later receives the welcome.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) && s.length <= 254;
}

function safeBusinessName(s: string | undefined, fallback: string): string {
  const trimmed = (s ?? "").trim().slice(0, 80);
  return trimmed || fallback;
}

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  // Rate-limit (IP-based, standard tier). Falls back to a static key
  // if the platform doesn't expose the client IP — that's fine for a
  // signup endpoint where the per-IP attack surface is also low.
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";
  const rl = checkRateLimit(ip, "/api/v1/dev/init", "standard");
  const rlHeaders = rateLimitHeaders(rl);
  if (!rl.allowed) {
    return Response.json(
      { error: "rate_limited", message: "Too many requests, slow down." },
      { status: 429, headers: rlHeaders },
    );
  }

  let body: InitRequest;
  try {
    body = (await req.json()) as InitRequest;
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  const email = (body.email ?? "").trim().toLowerCase();
  if (!email || !isValidEmail(email)) {
    return Response.json(
      { error: "invalid_email", message: "Pass a valid `email` in the request body." },
      { status: 400 },
    );
  }

  const businessName = safeBusinessName(body.businessName, email.split("@")[0] ?? "Auto");

  // Look up or create the business — idempotent on email so the CLI
  // can retry safely. Persists across redeploys when DATABASE_URL is
  // set; otherwise lives in process memory for the dev session.
  let businessId = await lookupBusinessId(email);
  if (!businessId) {
    businessId = `biz_cli_${crypto.randomUUID().slice(0, 12)}`;
  }
  await recordInit({ email, businessId, businessName, source: body.source });

  const issued = await autoIssueOnSignup({ ownerType: "business", ownerId: businessId });

  const response: InitResponse = {
    apiKey: issued.secret,
    businessId,
    baseUrl: SITE_URL,
    message: `Account provisioned for ${businessName} (${email}). Save the apiKey — it's only shown once.`,
  };

  return Response.json(response, {
    status: 200,
    headers: {
      ...rlHeaders,
      "Cache-Control": "no-store",
    },
  });
}

export async function GET() {
  // Discovery: tell agents how to call this endpoint.
  return Response.json({
    endpoint: "POST /api/v1/dev/init",
    purpose: "Agent-runnable account provisioning. Returns a Social Perks API key.",
    body: {
      email: "string (required, valid email)",
      businessName: "string (optional)",
      source: "string (optional, e.g. 'cli', 'mcp', 'vercel-template')",
    },
    response: {
      apiKey: "string — store this in SOCIAL_PERKS_API_KEY",
      businessId: "string",
      baseUrl: "string",
    },
    cli: "npx @socialperks/cli init --email you@example.com",
    docs: `${SITE_URL}/agents`,
  });
}
