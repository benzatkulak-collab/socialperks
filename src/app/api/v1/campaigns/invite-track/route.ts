/**
 * POST /api/v1/campaigns/invite-track
 *
 * Server-side counter for the invite-unlock viral loop (Phase 14).
 * Replaces the localStorage-only counter from Phase 5 with a real
 * tracked count tied to the visitor's IP + cookie identity.
 *
 * Each unique invite-source-cookie that lands on a campaign with an
 * `?invitedBy=<sharerId>` param counts as one invite for the sharer.
 * Threshold reached → response includes `unlockEarned: true` and a
 * signed unlock token the client can present at submission time.
 */

import type { NextRequest } from "next/server";
import crypto from "crypto";
import { ok, err, rateLimit, parseBody } from "../../_shared";
import { db, InMemoryConnection } from "@/lib/db/connection";

const usingDb = !(db instanceof InMemoryConnection);
const memoryCounts = new Map<string, Set<string>>();

interface InviteBody {
  campaignId?: unknown;
  sharerId?: unknown;
  visitorId?: unknown;
  threshold?: unknown;
}

function inviteKey(campaignId: string, sharerId: string): string {
  return `${campaignId}:${sharerId}`;
}

function signUnlockToken(args: { campaignId: string; sharerId: string }): string {
  // SECURITY: AUTH_SECRET is required in production. Previously fell back
  // to a hardcoded string, letting attackers who read the source forge
  // unlock tokens for any campaign.
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("AUTH_SECRET must be set in production");
    }
    // Dev fallback only — never used when NODE_ENV=production.
    const devSecret = "dev-only-unsafe-secret";
    const payload = `${args.campaignId}.${args.sharerId}.${Date.now()}`;
    const sig = crypto.createHmac("sha256", devSecret).update(payload).digest("base64url");
    return `${Buffer.from(payload).toString("base64url")}.${sig}`;
  }
  const payload = `${args.campaignId}.${args.sharerId}.${Date.now()}`;
  const sig = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
  return `${Buffer.from(payload).toString("base64url")}.${sig}`;
}

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, "public");
  if (limited) return limited;

  const body = await parseBody<InviteBody>(req);
  if (body instanceof Response) return body;

  const campaignId = typeof body.campaignId === "string" ? body.campaignId.slice(0, 100) : null;
  const sharerId = typeof body.sharerId === "string" ? body.sharerId.slice(0, 100) : null;
  const visitorId = typeof body.visitorId === "string" ? body.visitorId.slice(0, 100) : null;
  const threshold = typeof body.threshold === "number" && body.threshold > 0 ? Math.min(body.threshold, 10) : 3;

  if (!campaignId || !sharerId || !visitorId) {
    return err("MISSING_FIELDS", "campaignId, sharerId, visitorId required", 400);
  }
  if (visitorId === sharerId) {
    // Same person — don't count.
    return ok({ counted: false, reason: "self_invite" });
  }

  const key = inviteKey(campaignId, sharerId);
  let unique = 0;

  if (usingDb) {
    try {
      // Idempotent insert — same visitor same sharer same campaign = no-op.
      await db.query(
        `INSERT INTO referral_attributions (code, attributed_email)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [`INV-${key}`, `visitor:${visitorId}`],
      );
      const result = await db.query<{ count: string }>(
        `SELECT COUNT(DISTINCT attributed_email)::text AS count
         FROM referral_attributions
         WHERE code = $1`,
        [`INV-${key}`],
      );
      unique = parseInt(result.rows[0]?.count ?? "0", 10);
    } catch {
      // Fall through to memory.
    }
  }

  if (unique === 0) {
    let set = memoryCounts.get(key);
    if (!set) {
      set = new Set();
      memoryCounts.set(key, set);
    }
    set.add(visitorId);
    unique = set.size;
  }

  const unlockEarned = unique >= threshold;
  return ok({
    counted: true,
    unique,
    threshold,
    unlockEarned,
    unlockToken: unlockEarned ? signUnlockToken({ campaignId, sharerId }) : null,
  });
}
