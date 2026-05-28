/**
 * Referral codes — viral share-link loop.
 *
 * Distinct from the per-event referral ledger in ./index.ts. This is the
 * "share this link, earn credit when anyone signs up through it" surface
 * that powers public profiles, dashboard share widgets, and OG cards.
 *
 * Each business + each influencer gets ONE code on first request,
 * generated on demand. The code lives in URLs (`/?ref=ABC123`), gets
 * captured at signup, and writes an attribution row when used.
 *
 * Persistence: DB-backed when DATABASE_URL is set, in-memory otherwise.
 */

import crypto from "crypto";
import { db, InMemoryConnection } from "@/lib/db/connection";

export interface ReferralCode {
  id: string;
  ownerType: "business" | "influencer";
  ownerId: string;
  code: string;
  usesCount: number;
  conversionsCount: number;
  rewardUnlocked: boolean;
  createdAt: string;
}

const usingDb = !(db instanceof InMemoryConnection);

const memoryByOwner = new Map<string, ReferralCode>();
const memoryByCode = new Map<string, ReferralCode>();

function ownerKey(ownerType: "business" | "influencer", ownerId: string): string {
  return `${ownerType}:${ownerId}`;
}

function generateCode(): string {
  // Avoid lookalikes (0/O, 1/I/L). 31^6 ≈ 887M keyspace.
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let out = "";
  const bytes = crypto.randomBytes(6);
  for (let i = 0; i < 6; i++) {
    out += alphabet[bytes[i] % alphabet.length];
  }
  return out;
}

export async function getOrCreateCode(
  ownerType: "business" | "influencer",
  ownerId: string,
): Promise<ReferralCode> {
  if (usingDb) {
    const colName = ownerType === "business" ? "business_id" : "influencer_id";
    const existing = await db.query<{
      id: string;
      code: string;
      uses_count: number;
      conversions_count: number;
      reward_unlocked: boolean;
      created_at: string;
    }>(
      `SELECT id, code, uses_count, conversions_count, reward_unlocked, created_at
       FROM referral_codes
       WHERE ${colName} = $1
       LIMIT 1`,
      [ownerId],
    );
    if (existing.rows.length > 0) {
      const r = existing.rows[0];
      return {
        id: r.id,
        ownerType,
        ownerId,
        code: r.code,
        usesCount: r.uses_count,
        conversionsCount: r.conversions_count,
        rewardUnlocked: r.reward_unlocked,
        createdAt: r.created_at,
      };
    }
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = generateCode();
      try {
        const inserted = await db.query<{ id: string; created_at: string }>(
          `INSERT INTO referral_codes (${colName}, code) VALUES ($1, $2) RETURNING id, created_at`,
          [ownerId, code],
        );
        if (inserted.rows.length > 0) {
          return {
            id: inserted.rows[0].id,
            ownerType,
            ownerId,
            code,
            usesCount: 0,
            conversionsCount: 0,
            rewardUnlocked: false,
            createdAt: inserted.rows[0].created_at,
          };
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (!msg.includes("duplicate") && !msg.includes("unique")) throw e;
      }
    }
    throw new Error("Could not generate unique referral code after 5 attempts");
  }

  const key = ownerKey(ownerType, ownerId);
  const existing = memoryByOwner.get(key);
  if (existing) return existing;
  let code = generateCode();
  while (memoryByCode.has(code)) code = generateCode();
  const created: ReferralCode = {
    id: crypto.randomUUID(),
    ownerType,
    ownerId,
    code,
    usesCount: 0,
    conversionsCount: 0,
    rewardUnlocked: false,
    createdAt: new Date().toISOString(),
  };
  memoryByOwner.set(key, created);
  memoryByCode.set(code, created);
  return created;
}

export async function findByCode(code: string): Promise<ReferralCode | null> {
  const upper = code.toUpperCase().trim();
  if (usingDb) {
    const result = await db.query<{
      id: string;
      business_id: string | null;
      influencer_id: string | null;
      code: string;
      uses_count: number;
      conversions_count: number;
      reward_unlocked: boolean;
      created_at: string;
    }>(
      `SELECT id, business_id, influencer_id, code, uses_count, conversions_count, reward_unlocked, created_at
       FROM referral_codes
       WHERE code = $1
       LIMIT 1`,
      [upper],
    );
    if (result.rows.length === 0) return null;
    const r = result.rows[0];
    return {
      id: r.id,
      ownerType: r.business_id ? "business" : "influencer",
      ownerId: (r.business_id ?? r.influencer_id) as string,
      code: r.code,
      usesCount: r.uses_count,
      conversionsCount: r.conversions_count,
      rewardUnlocked: r.reward_unlocked,
      createdAt: r.created_at,
    };
  }
  return memoryByCode.get(upper) ?? null;
}

export async function recordClick(code: string): Promise<void> {
  const upper = code.toUpperCase().trim();
  if (usingDb) {
    await db.query(
      `UPDATE referral_codes SET uses_count = uses_count + 1 WHERE code = $1`,
      [upper],
    ).catch(() => { /* non-blocking */ });
    return;
  }
  const entry = memoryByCode.get(upper);
  if (entry) entry.usesCount += 1;
}

export async function recordConversion(args: {
  code: string;
  attributedType: "business" | "influencer";
  attributedId?: string;
  attributedEmail?: string;
}): Promise<void> {
  const upper = args.code.toUpperCase().trim();
  if (usingDb) {
    await db.query(
      `UPDATE referral_codes SET conversions_count = conversions_count + 1 WHERE code = $1`,
      [upper],
    ).catch(() => { /* non-blocking */ });
    const businessId = args.attributedType === "business" ? args.attributedId : null;
    const influencerId = args.attributedType === "influencer" ? args.attributedId : null;
    await db.query(
      `INSERT INTO referral_attributions (code, attributed_business_id, attributed_influencer_id, attributed_email)
       VALUES ($1, $2, $3, $4)`,
      [upper, businessId ?? null, influencerId ?? null, args.attributedEmail ?? null],
    ).catch(() => { /* non-blocking */ });
    return;
  }
  const entry = memoryByCode.get(upper);
  if (entry) entry.conversionsCount += 1;
}

export function buildShareUrl(code: string, baseUrl?: string): string {
  const base =
    baseUrl ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "https://socialperks.app");
  return `${base}/?ref=${code}`;
}
