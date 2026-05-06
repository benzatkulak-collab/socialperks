/**
 * POST /api/v1/waitlist
 *
 * Capture early-access signups from the marketing site. Public endpoint
 * with strict rate limiting (5 attempts/min/IP).
 *
 * Persistence: in-memory Map for now. Restart drops entries. When
 * DATABASE_URL is set in Phase 3 of the rollout, switch to a `waitlist`
 * table — see TODO at bottom.
 *
 * Side effects (best-effort, never block the response):
 *   1. Append to in-memory store
 *   2. Email the configured admin (RESEND_API_KEY + WAITLIST_NOTIFY_EMAIL)
 *   3. Email the signup-er a confirmation
 */

import type { NextRequest } from "next/server";
import { ok, err, rateLimit, parseBody } from "../_shared";
import { ResendEmailProvider, ConsoleEmailProvider, type EmailProvider } from "@/lib/email";
import { validateEmail } from "@/lib/security/validate";
import { logger } from "@/lib/logging";
import { db, InMemoryConnection } from "@/lib/db/connection";
import { constantTimeEqual } from "@/lib/security/order-by";

const usingDb = !(db instanceof InMemoryConnection);

interface WaitlistEntry {
  email: string;
  businessName?: string;
  city?: string;
  vertical: "coffee_shops" | "other";
  referrer?: string;
  createdAt: string;
  ip: string;
}

// In-memory store. NOT durable. See TODO at bottom for migration.
const waitlist = new Map<string, WaitlistEntry>();

function getEmailProvider(): EmailProvider {
  if (process.env.RESEND_API_KEY) return new ResendEmailProvider();
  return new ConsoleEmailProvider();
}

function ip(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

interface WaitlistBody {
  email?: unknown;
  businessName?: unknown;
  city?: unknown;
  vertical?: unknown;
  referrer?: unknown;
}

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, "strict");
  if (limited) return limited;

  const body = await parseBody<WaitlistBody>(req);
  if (body instanceof Response) return body;

  // Validate email
  const emailValidation = validateEmail(body.email);
  if (!emailValidation.success) {
    return err("INVALID_EMAIL", emailValidation.error, 400);
  }
  const email = emailValidation.data;

  // Optional fields with hard caps
  const businessName =
    typeof body.businessName === "string" ? body.businessName.slice(0, 200) : undefined;
  const city = typeof body.city === "string" ? body.city.slice(0, 100) : undefined;
  const vertical = body.vertical === "coffee_shops" ? "coffee_shops" : "other";
  const referrer =
    typeof body.referrer === "string" ? body.referrer.slice(0, 500) : undefined;

  const entry: WaitlistEntry = {
    email,
    businessName,
    city,
    vertical,
    referrer,
    createdAt: new Date().toISOString(),
    ip: ip(req),
  };

  // Durable path: if DATABASE_URL is configured, write to the
  // `waitlist` table. ON CONFLICT keeps the original signup so we
  // don't reset drip-tracking timestamps.
  if (usingDb) {
    try {
      const inserted = await db.query<{ id: string }>(
        `INSERT INTO waitlist (email, business_name, city, vertical, referrer, ip, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (email) DO NOTHING
         RETURNING id`,
        [email, businessName ?? null, city ?? null, vertical, referrer ?? null, entry.ip, entry.createdAt],
      );
      const isNewSignup = inserted.rows.length > 0;
      if (!isNewSignup) {
        return ok({ alreadyOnList: true, email });
      }
      // fall through to email side effects below
    } catch (e) {
      // DB write failed — log and fall back to in-memory so the user
      // still gets a confirmation email rather than a 500.
      logger.warn("waitlist DB write failed, falling back to memory", {
        error: e instanceof Error ? e.message : String(e),
      });
      if (waitlist.has(email)) return ok({ alreadyOnList: true, email });
      waitlist.set(email, entry);
    }
  } else {
    // In-memory path
    if (waitlist.has(email)) return ok({ alreadyOnList: true, email });
    waitlist.set(email, entry);
  }

  // Best-effort emails — don't block the response
  const provider = getEmailProvider();
  const adminTo = process.env.WAITLIST_NOTIFY_EMAIL;

  if (adminTo) {
    void provider
      .send({
        to: adminTo,
        subject: `[waitlist] ${email}${businessName ? ` — ${businessName}` : ""}`,
        text: `New waitlist signup\n\nEmail: ${email}\nBusiness: ${businessName ?? "—"}\nCity: ${city ?? "—"}\nVertical: ${vertical}\nReferrer: ${referrer ?? "—"}\nIP: ${entry.ip}\nAt: ${entry.createdAt}`,
        html: `<p><strong>New waitlist signup</strong></p><ul><li>Email: <code>${email}</code></li><li>Business: ${businessName ?? "—"}</li><li>City: ${city ?? "—"}</li><li>Vertical: ${vertical}</li><li>Referrer: ${referrer ?? "—"}</li><li>IP: ${entry.ip}</li><li>At: ${entry.createdAt}</li></ul>`,
      })
      .catch((e) => logger.warn("waitlist admin notify failed", { error: String(e) }));
  }

  void provider
    .send({
      to: email,
      subject: "You're on the Social Perks early-access list",
      text: `Thanks for joining the early-access list.\n\nWe're starting with independent coffee shops${city ? ` in ${city}` : ""}. We'll reach out as soon as we have a slot for you.\n\n— Social Perks`,
      html: `<p>Thanks for joining the early-access list.</p><p>We're starting with independent coffee shops${city ? ` in <strong>${city}</strong>` : ""}. We'll reach out as soon as we have a slot for you.</p><p>— Social Perks</p>`,
    })
    .catch((e) => logger.warn("waitlist confirm email failed", { error: String(e) }));

  logger.info("waitlist signup", { email, vertical, city });
  return ok({ added: true, email }, 201);
}

export async function GET(req: NextRequest) {
  // Admin-only: peek at the list size. No PII returned.
  const adminToken = process.env.WAITLIST_ADMIN_TOKEN;
  const provided = req.headers.get("x-admin-token") ?? "";
  // SECURITY: constant-time compare to avoid timing oracle.
  if (!adminToken || !constantTimeEqual(provided, adminToken)) {
    return err("UNAUTHORIZED", "Admin token required", 401);
  }
  if (usingDb) {
    try {
      const result = await db.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM waitlist`,
      );
      const count = result.rows[0]?.count ?? "0";
      return ok({ count: parseInt(count, 10), source: "db" });
    } catch (e) {
      logger.warn("waitlist count from DB failed", {
        error: e instanceof Error ? e.message : String(e),
      });
      // Fall through to in-memory tally
    }
  }
  return ok({ count: waitlist.size, source: "memory" });
}

// Note: the in-memory `waitlist` Map remains as a fallback for when
// DATABASE_URL is unset (local dev) or the DB write transiently fails.
// On production with DATABASE_URL set, the DB is the source of truth
// and the Map is only touched on the fallback path.
//
// Cohort retrieval for the drip scheduler lives in src/lib/email/waitlist-drip.ts.
