/**
 * Social Perks — Perk Programs Store
 *
 * Shared types and in-memory stores for perk programs.
 * Used by all /api/v1/programs/* route handlers.
 */

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
