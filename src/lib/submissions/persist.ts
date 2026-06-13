/**
 * Persistence write-through + cold-start hydration for the submission engine.
 *
 * The submission engine (src/lib/submissions.ts) holds an in-memory Map as a
 * synchronous-read cache. The durable source of truth that survives a serverless
 * cold start is the `campaign_submissions_v2` table — a flat, TEXT-keyed, FK-free
 * table. The v1 `campaign_submissions` is UUID-keyed with FKs to
 * launched_campaigns/users and rejects the engine's `sub_`/`cust_`/`camp_` TEXT
 * ids, so every write to it silently failed and nothing ever read it back. This
 * mirrors the perk-wallet vertical: a dual path that routes through
 * getInMemoryStore() (so durability is exercised under tests, not masked by the
 * no-op InMemoryConnection.query) and Postgres in prod, best-effort, never throws.
 */

import { db, getInMemoryStore } from "@/lib/db/connection";
import { captureError } from "@/lib/monitoring";

const SUBMISSION_TABLE = "campaign_submissions_v2";

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

/** Snake_case shape as stored in the DB / in-memory store. */
interface DbRow {
  id: string;
  campaign_id: string;
  user_id: string;
  action_id: string;
  proof_url: string;
  proof_type: string;
  status: string;
  submitted_at: string | Date;
  reviewed_at: string | Date | null;
  reviewed_by: string | null;
  review_note: string | null;
  perk_awarded: boolean | string;
  metadata: string | Record<string, unknown> | null;
}

function toIso(v: string | Date): string {
  return v instanceof Date ? v.toISOString() : String(v);
}

function rowToDb(s: SubmissionRow): Record<string, unknown> {
  return {
    id: s.id,
    campaign_id: s.campaignId,
    user_id: s.userId,
    action_id: s.actionId,
    proof_url: s.proofUrl,
    proof_type: s.proofType,
    status: s.status,
    submitted_at: s.submittedAt,
    reviewed_at: s.reviewedAt,
    reviewed_by: s.reviewedBy,
    review_note: s.reviewNote,
    perk_awarded: s.perkAwarded,
    metadata: JSON.stringify(s.metadata ?? {}),
  };
}

function dbToRow(r: DbRow): SubmissionRow {
  let metadata: Record<string, unknown> = {};
  if (r.metadata != null) {
    if (typeof r.metadata === "string") {
      try { metadata = JSON.parse(r.metadata) as Record<string, unknown>; } catch { metadata = {}; }
    } else {
      metadata = r.metadata;
    }
  }
  return {
    id: r.id,
    campaignId: r.campaign_id,
    userId: r.user_id,
    actionId: r.action_id,
    proofUrl: r.proof_url,
    proofType: r.proof_type,
    status: r.status,
    submittedAt: toIso(r.submitted_at),
    reviewedAt: r.reviewed_at == null ? null : toIso(r.reviewed_at),
    reviewedBy: r.reviewed_by,
    reviewNote: r.review_note,
    perkAwarded: r.perk_awarded === true || r.perk_awarded === "true" || r.perk_awarded === "t",
    metadata,
  };
}

/**
 * Durably persist a submission (insert on create, upsert on review/expire).
 * Best-effort: the in-memory cache write already succeeded, so a DB error is
 * captured but never thrown — the request must not fail because persistence
 * hiccuped.
 */
export async function persistSubmission(s: SubmissionRow): Promise<void> {
  const store = getInMemoryStore();
  if (store) {
    const row = rowToDb(s);
    if (store.selectById(SUBMISSION_TABLE, s.id)) {
      store.update(SUBMISSION_TABLE, s.id, row);
    } else {
      store.insert(SUBMISSION_TABLE, row);
    }
    return;
  }
  try {
    await db.query(
      `INSERT INTO campaign_submissions_v2
         (id, campaign_id, user_id, action_id, proof_url, proof_type, status,
          submitted_at, reviewed_at, reviewed_by, review_note, perk_awarded,
          metadata, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13, NOW(), NOW())
       ON CONFLICT (id) DO UPDATE SET
         status = EXCLUDED.status,
         reviewed_at = EXCLUDED.reviewed_at,
         reviewed_by = EXCLUDED.reviewed_by,
         review_note = EXCLUDED.review_note,
         perk_awarded = EXCLUDED.perk_awarded,
         metadata = EXCLUDED.metadata,
         updated_at = NOW()`,
      [
        s.id, s.campaignId, s.userId, s.actionId, s.proofUrl, s.proofType,
        s.status, s.submittedAt, s.reviewedAt, s.reviewedBy, s.reviewNote,
        s.perkAwarded, JSON.stringify(s.metadata ?? {}),
      ],
    );
  } catch (e) {
    captureError(e, { source: "submissions.persistSubmission" });
  }
}

/** Load every persisted submission row (for cold-start hydration). Best-effort. */
export async function loadAllSubmissionRows(): Promise<SubmissionRow[]> {
  const store = getInMemoryStore();
  if (store) {
    return (store.selectMany(SUBMISSION_TABLE, {}, { perPage: 1_000_000 }).rows as unknown as DbRow[]).map(dbToRow);
  }
  try {
    const res = await db.query<DbRow>(
      `SELECT id, campaign_id, user_id, action_id, proof_url, proof_type, status,
              submitted_at, reviewed_at, reviewed_by, review_note, perk_awarded, metadata
         FROM campaign_submissions_v2`,
    );
    return res.rows.map(dbToRow);
  } catch (e) {
    captureError(e, { source: "submissions.loadAll" });
    return [];
  }
}

/** Test helper: drop the durable backing rows (no-op against real Postgres). */
export function clearSubmissionStore(): void {
  const store = getInMemoryStore();
  if (!store) return;
  for (const r of store.selectMany(SUBMISSION_TABLE, {}, { perPage: 1_000_000 }).rows) {
    store.delete(SUBMISSION_TABLE, r.id as string);
  }
}
