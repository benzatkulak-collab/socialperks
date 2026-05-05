/**
 * Persistence write-through for the submission engine.
 *
 * Submission engine in src/lib/submissions.ts holds an in-memory Map.
 * When DATABASE_URL is set, mirror writes to `campaign_submissions`
 * so we don't lose user-generated proof on redeploy.
 */

import { db, InMemoryConnection } from "@/lib/db/connection";

const usingDb = !(db instanceof InMemoryConnection);

export interface SubmissionRow {
  id: string;
  campaignId: string;
  userId: string;
  actionId: string;
  proofUrl: string;
  proofType: string;
  status: string;
  submittedAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  reviewNote: string | null;
  perkAwarded: boolean;
  metadata: Record<string, unknown>;
}

export async function persistSubmission(s: SubmissionRow): Promise<void> {
  if (!usingDb) return;
  try {
    await db.query(
      `INSERT INTO campaign_submissions
         (id, campaign_id, user_id, action_id, proof_url, proof_type, status,
          submitted_at, reviewed_at, reviewed_by, review_note, perk_awarded, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       ON CONFLICT (id) DO UPDATE SET
         status = EXCLUDED.status,
         reviewed_at = EXCLUDED.reviewed_at,
         reviewed_by = EXCLUDED.reviewed_by,
         review_note = EXCLUDED.review_note,
         perk_awarded = EXCLUDED.perk_awarded,
         metadata = EXCLUDED.metadata`,
      [
        s.id,
        s.campaignId,
        s.userId,
        s.actionId,
        s.proofUrl,
        s.proofType,
        s.status,
        s.submittedAt,
        s.reviewedAt,
        s.reviewedBy,
        s.reviewNote,
        s.perkAwarded,
        JSON.stringify(s.metadata),
      ],
    );
  } catch (e) {
    console.error("[submission-persist] failed:", e instanceof Error ? e.message : e);
  }
}
