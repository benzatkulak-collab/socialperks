/**
 * Magic-link auth — request endpoint.
 *
 * POST /api/v1/auth/magic-link
 *   body: { email: string, businessName?: string }
 *   → { ok: true, message: "Check your email" }
 *
 * Generates a single-use 32-byte hex token (15-min expiry), stores it
 * in an in-memory Map, and emails the user a link to /auth/verify.
 *
 * If RESEND_API_KEY is unset (dev mode), the link is logged to the
 * console as well so localhost flows work without email config.
 *
 * Token store is shared (via module-level export) with the /verify
 * route below it.
 */

import type { NextRequest } from "next/server";
import { ok, err, rateLimit, parseBody, withTiming } from "../../_shared";
import { emailProvider } from "@/lib/email";
import { magicLinkEmail } from "@/lib/email/templates/magic-link";
import { storeMagicLink, pruneExpired, TOKEN_TTL_MS } from "@/lib/auth/magic-link-store";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function generateToken(): string {
  // 32 bytes = 256 bits, hex-encoded → 64 chars
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ─── POST ────────────────────────────────────────────────────────────────────

export const POST = withTiming(async (req: NextRequest) => {
  const limited = rateLimit(req, "strict");
  if (limited) return limited;

  const body = await parseBody<{ email?: string; businessName?: string }>(req);
  if (body instanceof Response) return body;

  const rawEmail = typeof body.email === "string" ? body.email : "";
  const email = rawEmail.slice(0, 254).toLowerCase().trim();
  if (!email || !EMAIL_REGEX.test(email)) {
    return err("INVALID_EMAIL", "Please provide a valid email address");
  }

  const businessName =
    typeof body.businessName === "string" && body.businessName.trim().length > 0
      ? body.businessName.slice(0, 200).trim()
      : undefined;

  // Best-effort prune. Don't await on the response path; the store
  // returns a Promise but a slow DB shouldn't block sign-in.
  void pruneExpired();

  const token = generateToken();
  await storeMagicLink(token, {
    email,
    businessName,
    expiresAt: Date.now() + TOKEN_TTL_MS,
    used: false,
  });

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "https://socialperks.io");
  const link = `${siteUrl}/auth/verify?token=${token}`;

  // In dev (no Resend key), surface the link so localhost flows work
  // without email config. In prod, only log success/failure.
  if (!process.env.RESEND_API_KEY) {
    console.log(`[magic-link] dev mode — sign-in link for ${email}: ${link}`);
  }

  const template = magicLinkEmail({ to: email, link, businessName });
  emailProvider
    .send({ to: email, ...template })
    .catch((e: unknown) =>
      console.error(
        "[magic-link] email send failed:",
        e instanceof Error ? e.message : e
      )
    );

  // Always return 200 — don't leak whether the email is registered.
  return ok({ ok: true, message: "Check your email" });
});
