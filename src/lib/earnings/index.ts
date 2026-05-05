/**
 * Influencer earnings ledger (Phase 17).
 *
 * Writes a row per approved submission. Read paths power:
 *   - /i/[slug] real-earnings replacement for the placeholder estimate
 *   - /leaderboard
 *   - /api/v1/influencers/me/earnings dashboard widget
 *
 * In-memory fallback when DATABASE_URL unset.
 */

import crypto from "crypto";
import { db, InMemoryConnection } from "@/lib/db/connection";

export interface EarningRow {
  id: string;
  influencerId: string;
  campaignId: string;
  businessId: string;
  submissionId: string;
  amountCents: number;
  currency: string;
  payoutId: string | null;
  payoutAt: string | null;
  awardedAt: string;
}

const usingDb = !(db instanceof InMemoryConnection);
const memory: EarningRow[] = [];

export async function recordEarning(args: Omit<EarningRow, "id" | "awardedAt"> & { awardedAt?: string }): Promise<EarningRow> {
  const row: EarningRow = {
    id: crypto.randomUUID(),
    awardedAt: args.awardedAt ?? new Date().toISOString(),
    ...args,
  };
  if (usingDb) {
    try {
      await db.query(
        `INSERT INTO influencer_earnings
           (id, influencer_id, campaign_id, business_id, submission_id,
            amount_cents, currency, payout_id, payout_at, awarded_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         ON CONFLICT (submission_id) DO NOTHING`,
        [
          row.id,
          row.influencerId,
          row.campaignId,
          row.businessId,
          row.submissionId,
          row.amountCents,
          row.currency,
          row.payoutId,
          row.payoutAt,
          row.awardedAt,
        ],
      );
    } catch (e) {
      console.error("[earnings] persist failed:", e instanceof Error ? e.message : e);
    }
    return row;
  }
  memory.push(row);
  return row;
}

export async function totalEarnedCents(influencerId: string, sinceDays?: number): Promise<number> {
  if (usingDb) {
    try {
      const since = sinceDays ? `AND awarded_at >= NOW() - INTERVAL '${Math.floor(sinceDays)} days'` : "";
      const result = await db.query<{ total: string | null }>(
        `SELECT SUM(amount_cents)::text AS total
         FROM influencer_earnings
         WHERE influencer_id = $1 ${since}`,
        [influencerId],
      );
      return parseInt(result.rows[0]?.total ?? "0", 10);
    } catch {
      return 0;
    }
  }
  const cutoff = sinceDays ? Date.now() - sinceDays * 86400 * 1000 : 0;
  return memory
    .filter((r) => r.influencerId === influencerId && new Date(r.awardedAt).getTime() >= cutoff)
    .reduce((sum, r) => sum + r.amountCents, 0);
}

export async function recentEarnings(influencerId: string, limit = 10): Promise<EarningRow[]> {
  if (usingDb) {
    try {
      const result = await db.query<{
        id: string;
        influencer_id: string;
        campaign_id: string;
        business_id: string;
        submission_id: string;
        amount_cents: number;
        currency: string;
        payout_id: string | null;
        payout_at: string | null;
        awarded_at: string;
      }>(
        `SELECT * FROM influencer_earnings
         WHERE influencer_id = $1
         ORDER BY awarded_at DESC
         LIMIT $2`,
        [influencerId, limit],
      );
      return result.rows.map((r) => ({
        id: r.id,
        influencerId: r.influencer_id,
        campaignId: r.campaign_id,
        businessId: r.business_id,
        submissionId: r.submission_id,
        amountCents: r.amount_cents,
        currency: r.currency,
        payoutId: r.payout_id,
        payoutAt: r.payout_at,
        awardedAt: r.awarded_at,
      }));
    } catch {
      return [];
    }
  }
  return memory
    .filter((r) => r.influencerId === influencerId)
    .sort((a, b) => new Date(b.awardedAt).getTime() - new Date(a.awardedAt).getTime())
    .slice(0, limit);
}

export async function leaderboardTopByEarnings(days = 30, limit = 10): Promise<Array<{ influencerId: string; cents: number }>> {
  if (usingDb) {
    try {
      const result = await db.query<{ influencer_id: string; cents: string }>(
        `SELECT influencer_id, SUM(amount_cents)::text AS cents
         FROM influencer_earnings
         WHERE awarded_at >= NOW() - INTERVAL '${Math.floor(days)} days'
         GROUP BY influencer_id
         ORDER BY SUM(amount_cents) DESC
         LIMIT $1`,
        [limit],
      );
      return result.rows.map((r) => ({ influencerId: r.influencer_id, cents: parseInt(r.cents, 10) }));
    } catch {
      return [];
    }
  }
  const cutoff = Date.now() - days * 86400 * 1000;
  const totals = new Map<string, number>();
  for (const r of memory) {
    if (new Date(r.awardedAt).getTime() < cutoff) continue;
    totals.set(r.influencerId, (totals.get(r.influencerId) ?? 0) + r.amountCents);
  }
  return Array.from(totals.entries())
    .map(([influencerId, cents]) => ({ influencerId, cents }))
    .sort((a, b) => b.cents - a.cents)
    .slice(0, limit);
}
