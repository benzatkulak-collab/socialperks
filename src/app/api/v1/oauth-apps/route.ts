/**
 * POST /api/v1/oauth-apps — register a new agent app (one-time).
 *
 * The developer (whoever's building "marketing agent for coffee
 * shops") calls this once and gets back { client_id, client_secret }.
 * They store these. From then on, the agent uses the standard OAuth
 * flow (/oauth/authorize → user consent → code → /oauth/token → access)
 * to get per-business tokens.
 *
 * Auth: requires a Bearer admin token in MVP. Once we have a dev
 * portal, this becomes self-service through the dashboard.
 *
 * Why admin-gate at first: registering an agent app gives an
 * abstract identity that shop owners will see by name on the consent
 * screen. We want a human in the loop on the first 50 apps to keep
 * scammy "Update your perks now!!" agent names off the platform.
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { ok, err, rateLimit, parseBody } from "../_shared";
import { registerApp } from "@/lib/oauth/agent-apps";

export const runtime = "nodejs";

interface RegisterBody {
  name?: unknown;
  description?: unknown;
  homepageUrl?: unknown;
  redirectUris?: unknown;
  defaultScopes?: unknown;
  ownerEmail?: unknown;
  ownerBusinessId?: unknown;
}

const HTTPS_RE = /^https:\/\/[^\s]+$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest): Promise<NextResponse> {
  const limited = rateLimit(req, "strict");
  if (limited) return limited;

  // Admin gate: WAITLIST_ADMIN_TOKEN until we ship a dev portal.
  const adminToken = process.env.WAITLIST_ADMIN_TOKEN;
  const auth = req.headers.get("authorization") ?? "";
  const provided = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!adminToken || provided !== adminToken) {
    return err(
      "UNAUTHORIZED",
      "Admin token required to register an agent app",
      401,
    );
  }

  const body = await parseBody<RegisterBody>(req);
  if (body instanceof NextResponse) return body;

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (name.length < 2 || name.length > 200) {
    return err("INVALID_NAME", "name must be between 2 and 200 characters", 400);
  }

  const ownerEmail = typeof body.ownerEmail === "string" ? body.ownerEmail.trim().toLowerCase() : "";
  if (!EMAIL_RE.test(ownerEmail)) {
    return err("INVALID_EMAIL", "ownerEmail must be a valid email address", 400);
  }

  const redirectUris =
    Array.isArray(body.redirectUris) &&
    body.redirectUris.every((u): u is string => typeof u === "string" && HTTPS_RE.test(u))
      ? body.redirectUris
      : null;
  if (!redirectUris || redirectUris.length === 0) {
    return err(
      "INVALID_REDIRECT_URIS",
      "redirectUris must be a non-empty array of https:// URLs",
      400,
    );
  }

  const allowedScopes = ["read", "write", "webhooks:write", "sms:enqueue"];
  const defaultScopes = Array.isArray(body.defaultScopes)
    ? body.defaultScopes
        .filter((s): s is string => typeof s === "string")
        .filter((s) => allowedScopes.includes(s))
    : ["read"];
  if (defaultScopes.length === 0) {
    return err("INVALID_SCOPES", `defaultScopes must include at least one of: ${allowedScopes.join(", ")}`, 400);
  }

  const description = typeof body.description === "string" ? body.description.slice(0, 500).trim() : undefined;
  const homepageUrl = typeof body.homepageUrl === "string" && HTTPS_RE.test(body.homepageUrl) ? body.homepageUrl : undefined;
  const ownerBusinessId = typeof body.ownerBusinessId === "string" ? body.ownerBusinessId : undefined;

  const app = await registerApp({
    name,
    description,
    homepageUrl,
    redirectUris,
    defaultScopes,
    ownerEmail,
    ownerBusinessId,
  });

  return ok(
    {
      app: {
        id: app.id,
        clientId: app.clientId,
        clientSecret: app.clientSecret, // ONLY shown here. Tell them to store it.
        name: app.name,
        redirectUris: app.redirectUris,
        defaultScopes: app.defaultScopes,
        createdAt: app.createdAt,
      },
      help: {
        authorize: `https://socialperks.io/oauth/authorize?client_id=${app.clientId}&redirect_uri=${encodeURIComponent(app.redirectUris[0]!)}&scope=${defaultScopes.join("+")}&state=<random>`,
        token: "POST https://socialperks.io/api/v1/oauth/token (Basic auth: client_id:client_secret)",
        secretWarning:
          "The clientSecret is only shown here. Store it now — you cannot retrieve it later.",
      },
    },
    201,
  );
}
