/**
 * Social Perks — Perk Programs Store
 *
 * Shared types + durable stores for perk programs. The Maps below are a
 * per-process write-through cache; rows persist to Postgres (migration 010) and
 * the cache is rehydrated on cold start via hydratePrograms(). Routes mutate a
 * Map then await the matching persist*, and hydrate on entry. Mirrors
 * perk-wallet / payouts / referrals. (The 43KB perk-programs.ts engine is a
 * separate, unwired class — intentionally untouched.)
 */

import { db, getInMemoryStore } from "@/lib/db/connection";
import { captureError } from "@/lib/monitoring";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ProgramTier {
  name: string;
  requiredActions: number;
  perkValue: number;
  perkType: "pct" | "dol";
}

export interface ProgramRule {
  actionId: string;
  platformId: string;
  pointsPerAction: number;
  maxPerCycle: number;
}

export interface PerkProgram {
  id: string;
  businessId: string;
  name: string;
  description: string;
  status: "active" | "paused" | "ended";
  rules: ProgramRule[];
  tiers: ProgramTier[];
  cycle: "weekly" | "monthly" | "quarterly";
  cycleStartDay: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProgramMember {
  id: string;
  programId: string;
  memberId: string;
  name: string;
  email: string;
  enrolledAt: string;
  totalPoints: number;
  currentTier: string | null;
}

export interface ProgramSubmission {
  id: string;
  programId: string;
  memberId: string;
  actionId: string;
  platformId: string;
  proofUrl: string;
  proofType: string;
  points: number;
  status: "pending" | "approved" | "rejected";
  submittedAt: string;
  reviewedAt: string | null;
}

export interface Payout {
  id: string;
  programId: string;
  memberId: string;
  amount: number;
  currency: string;
  status: "pending" | "approved" | "paid" | "rejected";
  requestedAt: string;
  processedAt: string | null;
  note: string | null;
}

// ─── In-Memory Stores ───────────────────────────────────────────────────────

export const programs = new Map<string, PerkProgram>();
export const programMembers = new Map<string, ProgramMember>();
export const programSubmissions = new Map<string, ProgramSubmission>();
export const payouts = new Map<string, Payout>();

// ─── Durable persistence (write-through + cold-start hydration) ───────────────

const PROGRAMS_TABLE = "perk_programs";
const MEMBERS_TABLE = "program_members";
const SUBMISSIONS_TABLE = "program_submissions";
const PAYOUTS_TABLE = "program_payouts";

function piso(v: unknown): string {
  return v instanceof Date ? v.toISOString() : String(v);
}
function pisoOrNull(v: unknown): string | null {
  return v == null ? null : piso(v);
}
function pnum(v: unknown): number {
  return typeof v === "string" ? parseFloat(v) : Number(v);
}
function pjson<T>(v: unknown, fallback: T): T {
  if (Array.isArray(v) || (v !== null && typeof v === "object")) return v as T;
  if (typeof v === "string") {
    try {
      return JSON.parse(v) as T;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

interface ProgramRow {
  id: string; business_id: string; name: string; description: string; status: string;
  rules: unknown; tiers: unknown; cycle: string; cycle_start_day: number | string;
  created_at: unknown; updated_at: unknown;
}
interface MemberRow {
  id: string; program_id: string; member_id: string; name: string; email: string;
  enrolled_at: unknown; total_points: number | string; current_tier: string | null;
}
interface SubmissionRow {
  id: string; program_id: string; member_id: string; action_id: string; platform_id: string;
  proof_url: string; proof_type: string; points: number | string; status: string;
  submitted_at: unknown; reviewed_at: unknown;
}
interface PayoutRow {
  id: string; program_id: string; member_id: string; amount: number | string; currency: string;
  status: string; requested_at: unknown; processed_at: unknown; note: string | null;
}

function programToRow(p: PerkProgram): Record<string, unknown> {
  return {
    id: p.id, business_id: p.businessId, name: p.name, description: p.description, status: p.status,
    rules: JSON.stringify(p.rules), tiers: JSON.stringify(p.tiers), cycle: p.cycle,
    cycle_start_day: p.cycleStartDay, created_at: p.createdAt, updated_at: p.updatedAt,
  };
}
function rowToProgram(r: ProgramRow): PerkProgram {
  return {
    id: r.id, businessId: r.business_id, name: r.name, description: r.description,
    status: r.status as PerkProgram["status"], rules: pjson<ProgramRule[]>(r.rules, []),
    tiers: pjson<ProgramTier[]>(r.tiers, []), cycle: r.cycle as PerkProgram["cycle"],
    cycleStartDay: Number(r.cycle_start_day), createdAt: piso(r.created_at), updatedAt: piso(r.updated_at),
  };
}
function memberToRow(m: ProgramMember): Record<string, unknown> {
  return {
    id: m.id, program_id: m.programId, member_id: m.memberId, name: m.name, email: m.email,
    enrolled_at: m.enrolledAt, total_points: m.totalPoints, current_tier: m.currentTier,
  };
}
function rowToMember(r: MemberRow): ProgramMember {
  return {
    id: r.id, programId: r.program_id, memberId: r.member_id, name: r.name, email: r.email,
    enrolledAt: piso(r.enrolled_at), totalPoints: Number(r.total_points), currentTier: r.current_tier ?? null,
  };
}
function submissionToRow(s: ProgramSubmission): Record<string, unknown> {
  return {
    id: s.id, program_id: s.programId, member_id: s.memberId, action_id: s.actionId, platform_id: s.platformId,
    proof_url: s.proofUrl, proof_type: s.proofType, points: s.points, status: s.status,
    submitted_at: s.submittedAt, reviewed_at: s.reviewedAt,
  };
}
function rowToSubmission(r: SubmissionRow): ProgramSubmission {
  return {
    id: r.id, programId: r.program_id, memberId: r.member_id, actionId: r.action_id, platformId: r.platform_id,
    proofUrl: r.proof_url, proofType: r.proof_type, points: Number(r.points), status: r.status as ProgramSubmission["status"],
    submittedAt: piso(r.submitted_at), reviewedAt: pisoOrNull(r.reviewed_at),
  };
}
function payoutToRow(p: Payout): Record<string, unknown> {
  return {
    id: p.id, program_id: p.programId, member_id: p.memberId, amount: p.amount, currency: p.currency,
    status: p.status, requested_at: p.requestedAt, processed_at: p.processedAt, note: p.note,
  };
}
function rowToPayout(r: PayoutRow): Payout {
  return {
    id: r.id, programId: r.program_id, memberId: r.member_id, amount: pnum(r.amount), currency: r.currency,
    status: r.status as Payout["status"], requestedAt: piso(r.requested_at), processedAt: pisoOrNull(r.processed_at), note: r.note ?? null,
  };
}

async function upsert(
  table: string,
  id: string,
  row: Record<string, unknown>,
  sql: () => Promise<void>,
  source: string,
): Promise<void> {
  const store = getInMemoryStore();
  if (store) {
    if (store.selectById(table, id)) store.update(table, id, row);
    else store.insert(table, row);
    return;
  }
  try {
    await sql();
  } catch (e) {
    captureError(e, { source, id });
  }
}

/** Write-through persist for a perk program. Best-effort; never throws. */
export async function persistProgram(p: PerkProgram): Promise<void> {
  await upsert(PROGRAMS_TABLE, p.id, programToRow(p), async () => {
    await db.query(
      `INSERT INTO perk_programs
         (id, business_id, name, description, status, rules, tiers, cycle, cycle_start_day, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name, description = EXCLUDED.description, status = EXCLUDED.status,
         rules = EXCLUDED.rules, tiers = EXCLUDED.tiers, cycle = EXCLUDED.cycle,
         cycle_start_day = EXCLUDED.cycle_start_day, updated_at = EXCLUDED.updated_at`,
      [p.id, p.businessId, p.name, p.description, p.status, JSON.stringify(p.rules), JSON.stringify(p.tiers), p.cycle, p.cycleStartDay, p.createdAt, p.updatedAt],
    );
  }, "programs.persistProgram");
}

/** Write-through persist for a program member. */
export async function persistMember(m: ProgramMember): Promise<void> {
  await upsert(MEMBERS_TABLE, m.id, memberToRow(m), async () => {
    await db.query(
      `INSERT INTO program_members
         (id, program_id, member_id, name, email, enrolled_at, total_points, current_tier)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name, email = EXCLUDED.email,
         total_points = EXCLUDED.total_points, current_tier = EXCLUDED.current_tier`,
      [m.id, m.programId, m.memberId, m.name, m.email, m.enrolledAt, m.totalPoints, m.currentTier],
    );
  }, "programs.persistMember");
}

/** Write-through persist for a program action submission. */
export async function persistSubmission(s: ProgramSubmission): Promise<void> {
  await upsert(SUBMISSIONS_TABLE, s.id, submissionToRow(s), async () => {
    await db.query(
      `INSERT INTO program_submissions
         (id, program_id, member_id, action_id, platform_id, proof_url, proof_type, points, status, submitted_at, reviewed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (id) DO UPDATE SET
         status = EXCLUDED.status, points = EXCLUDED.points, reviewed_at = EXCLUDED.reviewed_at`,
      [s.id, s.programId, s.memberId, s.actionId, s.platformId, s.proofUrl, s.proofType, s.points, s.status, s.submittedAt, s.reviewedAt],
    );
  }, "programs.persistSubmission");
}

/** Write-through persist for a cash-back payout. */
export async function persistPayout(p: Payout): Promise<void> {
  await upsert(PAYOUTS_TABLE, p.id, payoutToRow(p), async () => {
    await db.query(
      `INSERT INTO program_payouts
         (id, program_id, member_id, amount, currency, status, requested_at, processed_at, note)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (id) DO UPDATE SET
         status = EXCLUDED.status, processed_at = EXCLUDED.processed_at, note = EXCLUDED.note`,
      [p.id, p.programId, p.memberId, p.amount, p.currency, p.status, p.requestedAt, p.processedAt, p.note],
    );
  }, "programs.persistPayout");
}

let _hydrationPromise: Promise<void> | null = null;

/**
 * Load all persisted program data into the caches once per process. Best-effort;
 * never throws. Routes await this on entry so a cold instance doesn't see empty
 * programs/members/submissions/payouts.
 */
export function hydratePrograms(): Promise<void> {
  if (_hydrationPromise) return _hydrationPromise;
  _hydrationPromise = (async () => {
    try {
      const store = getInMemoryStore();
      const load = async <R>(table: string, sql: string): Promise<R[]> =>
        store
          ? (store.selectMany(table, {}, { perPage: 1_000_000 }).rows as unknown as R[])
          : (await db.query<R>(sql)).rows;

      for (const r of await load<ProgramRow>(PROGRAMS_TABLE, `SELECT * FROM perk_programs`)) {
        const p = rowToProgram(r);
        if (!programs.has(p.id)) programs.set(p.id, p);
      }
      for (const r of await load<MemberRow>(MEMBERS_TABLE, `SELECT * FROM program_members`)) {
        const m = rowToMember(r);
        if (!programMembers.has(m.id)) programMembers.set(m.id, m);
      }
      for (const r of await load<SubmissionRow>(SUBMISSIONS_TABLE, `SELECT * FROM program_submissions`)) {
        const s = rowToSubmission(r);
        if (!programSubmissions.has(s.id)) programSubmissions.set(s.id, s);
      }
      for (const r of await load<PayoutRow>(PAYOUTS_TABLE, `SELECT * FROM program_payouts`)) {
        const p = rowToPayout(r);
        if (!payouts.has(p.id)) payouts.set(p.id, p);
      }
    } catch (e) {
      captureError(e, { source: "programs.hydrate" });
      _hydrationPromise = null;
    }
  })();
  return _hydrationPromise;
}

// Warm the cache as soon as this module loads on a fresh instance.
void hydratePrograms();

/** Test-only: clear caches AND durable rows + reset hydration. */
export function _resetProgramsForTests(): void {
  programs.clear();
  programMembers.clear();
  programSubmissions.clear();
  payouts.clear();
  const store = getInMemoryStore();
  if (store) {
    for (const t of [PROGRAMS_TABLE, MEMBERS_TABLE, SUBMISSIONS_TABLE, PAYOUTS_TABLE]) {
      for (const row of store.selectMany(t, {}, { perPage: 1_000_000 }).rows) {
        store.delete(t, row.id as string);
      }
    }
  }
  _hydrationPromise = null;
}

/** Test-only: simulate a cold start — drop caches, keep durable rows. */
export function __resetProgramCacheForTests(): void {
  programs.clear();
  programMembers.clear();
  programSubmissions.clear();
  payouts.clear();
  _hydrationPromise = null;
}
