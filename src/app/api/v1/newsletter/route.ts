/**
 * Newsletter API — /api/v1/newsletter
 *
 * POST { email, source? } — public, rate-limited; adds email to store.
 * GET                     — admin-only; returns count, breakdown, last 100.
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  ok,
  err,
  rateLimit,
  parseBody,
  withTiming,
  requireAuth,
  type AuthUser,
} from "../_shared";
import { validateEmail, validateString } from "@/lib/security/validate";
import {
  subscribe,
  getAll,
  getCount,
  getSourceBreakdown,
} from "@/lib/newsletter";
import { sendNewsletterConfirmation } from "@/lib/email/templates/newsletter-confirmation";

interface SubscribeBody {
  email: string;
  source?: string;
}

export const POST = withTiming(async (req: NextRequest) => {
  // Public tier — anyone can subscribe. Rate limit keeps it from being abused.
  const limited = rateLimit(req, "public");
  if (limited) return limited;

  const body = await parseBody<SubscribeBody>(req);
  if (body instanceof Response) return body;

  const emailResult = validateEmail(body.email);
  if (!emailResult.success) {
    return err("INVALID_EMAIL", emailResult.error, 400);
  }

  let source = "unknown";
  if (body.source !== undefined) {
    const srcResult = validateString(body.source, "Source", { min: 1, max: 64 });
    if (!srcResult.success) {
      return err("INVALID_SOURCE", srcResult.error, 400);
    }
    source = srcResult.data;
  }

  const { subscriber, duplicate } = subscribe(emailResult.data, source);

  // Fire-and-forget welcome email for new subscribers (no-op if RESEND_API_KEY missing).
  // Log failures so silent delivery problems are visible in logs.
  if (!duplicate) {
    void sendNewsletterConfirmation(emailResult.data).catch((e) => {
      console.error(
        JSON.stringify({
          level: "error",
          msg: "Newsletter welcome email failed",
          email: emailResult.data,
          error: e instanceof Error ? e.message : String(e),
        })
      );
    });
  }

  return ok(
    {
      subscribed: true,
      duplicate,
      subscriber: {
        id: subscriber.id,
        email: subscriber.email,
        source: subscriber.source,
        subscribedAt: subscriber.subscribedAt,
      },
    },
    duplicate ? 200 : 201
  );
});

export const GET = withTiming(async (req: NextRequest) => {
  // Admin-only listing.
  const authResult = requireAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  const user = authResult as AuthUser;

  if (user.role !== "admin") {
    return err("FORBIDDEN", "Admin access required", 403);
  }

  const all = getAll();
  return ok({
    count: getCount(),
    breakdown: getSourceBreakdown(),
    subscribers: all.slice(0, 100),
  });
});
