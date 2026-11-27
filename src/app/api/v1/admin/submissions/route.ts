/**
 * Admin read-one submission — GET /api/v1/admin/submissions?id=<id>
 *
 * Lets the founder console open a submission that is outside the page's first
 * 100 rows (a partner's "open it" link). One query by id; it deliberately does
 * not import the submissions store (that loads the whole table at module load).
 * It answers only the fields the console drawer shows.
 */

import type { NextRequest } from "next/server";
import { ok, err, requireAuth, rateLimit, getQuery, withTiming } from "../../_shared";
import { validateId } from "@/lib/security/validate";
import { db } from "@/lib/db/connection";

interface Row {
  id: string;
  campaign_id: string;
  user_id: string;
  action_id: string;
  status: string;
  proof_url: string | null;
  submitted_at: Date | string;
  reviewed_at: Date | string | null;
}

const iso = (v: Date | string): string => (v instanceof Date ? v : new Date(v)).toISOString();

export const GET = withTiming(async (req: NextRequest) => {
  const limited = rateLimit(req, "strict");
  if (limited) return limited;

  const user = requireAuth(req);
  if (user instanceof Response) return user;
  if (user.role !== "admin") return err("FORBIDDEN", "Admin role required", 403);

  const id = validateId(getQuery(req).get("id"));
  if (!id.success) return err("INVALID_ID", id.error);

  const res = await db.query<Row>(
    `select id, campaign_id, user_id, action_id, status, proof_url, submitted_at, reviewed_at
       from campaign_submissions_v2 where id = $1`,
    [id.data],
  );
  const r = res.rows[0];
  if (!r) return err("SUBMISSION_NOT_FOUND", "Submission not found", 404);

  return ok({
    submission: {
      id: r.id,
      campaignId: r.campaign_id,
      userId: r.user_id,
      actionId: r.action_id,
      status: r.status,
      proofUrl: r.proof_url ?? "",
      submittedAt: iso(r.submitted_at),
      reviewedAt: r.reviewed_at ? iso(r.reviewed_at) : null,
    },
  });
});
