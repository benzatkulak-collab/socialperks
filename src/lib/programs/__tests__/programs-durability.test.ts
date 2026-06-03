/**
 * Perk programs durability — proves programs, members, action submissions and
 * cash-back payouts survive a serverless cold start (they were four in-memory
 * Maps with no schema before migration 010).
 *
 * Mirrors how the routes use the store: mutate the Map, await persist*, and
 * hydratePrograms() on entry. __resetProgramCacheForTests simulates a cold
 * start (drops caches, keeps durable rows).
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  programs,
  programMembers,
  programSubmissions,
  payouts,
  persistProgram,
  persistMember,
  persistSubmission,
  persistPayout,
  hydratePrograms,
  _resetProgramsForTests,
  __resetProgramCacheForTests,
  type PerkProgram,
  type ProgramMember,
  type ProgramSubmission,
  type Payout,
} from "../store";

function mkProgram(id = "prog_1"): PerkProgram {
  const now = new Date().toISOString();
  return {
    id,
    businessId: "biz_1",
    name: "Loyalty",
    description: "desc",
    status: "active",
    rules: [{ actionId: "a1", platformId: "ig", pointsPerAction: 5, maxPerCycle: 3 }],
    tiers: [{ name: "Gold", requiredActions: 10, perkValue: 20, perkType: "pct" }],
    cycle: "monthly",
    cycleStartDay: 1,
    createdAt: now,
    updatedAt: now,
  };
}

describe("Perk programs durability (survives cold start)", () => {
  beforeEach(() => _resetProgramsForTests());

  it("rehydrates a program with its rules + tiers (JSON round-trip)", async () => {
    const p = mkProgram();
    programs.set(p.id, p);
    await persistProgram(p);

    __resetProgramCacheForTests(); // cold start
    expect(programs.size).toBe(0);
    await hydratePrograms();

    const got = programs.get(p.id);
    expect(got).toBeDefined();
    expect(got!.name).toBe("Loyalty");
    expect(got!.status).toBe("active");
    expect(got!.rules).toHaveLength(1);
    expect(got!.rules[0].pointsPerAction).toBe(5);
    expect(got!.tiers[0].name).toBe("Gold");
    expect(got!.cycleStartDay).toBe(1);
  });

  it("rehydrates members, submissions and cash-back payouts", async () => {
    const now = new Date().toISOString();
    const member: ProgramMember = { id: "m1", programId: "prog_1", memberId: "u1", name: "Ada", email: "a@x.com", enrolledAt: now, totalPoints: 5, currentTier: null };
    const sub: ProgramSubmission = { id: "s1", programId: "prog_1", memberId: "u1", actionId: "a1", platformId: "ig", proofUrl: "https://x/y", proofType: "link", points: 5, status: "pending", submittedAt: now, reviewedAt: null };
    const payout: Payout = { id: "po1", programId: "prog_1", memberId: "u1", amount: 12.5, currency: "USD", status: "pending", requestedAt: now, processedAt: null, note: null };

    programMembers.set(member.id, member);
    await persistMember(member);
    programSubmissions.set(sub.id, sub);
    await persistSubmission(sub);
    payouts.set(payout.id, payout);
    await persistPayout(payout);

    __resetProgramCacheForTests();
    await hydratePrograms();

    expect(programMembers.get("m1")?.totalPoints).toBe(5);
    expect(programSubmissions.get("s1")?.status).toBe("pending");
    expect(payouts.get("po1")?.amount).toBe(12.5);
  });

  it("persists a payout status transition across a cold start", async () => {
    const now = new Date().toISOString();
    const payout: Payout = { id: "po2", programId: "prog_1", memberId: "u1", amount: 20, currency: "USD", status: "pending", requestedAt: now, processedAt: null, note: null };
    payouts.set(payout.id, payout);
    await persistPayout(payout);

    const approved: Payout = { ...payout, status: "approved", processedAt: new Date().toISOString() };
    payouts.set(approved.id, approved);
    await persistPayout(approved);

    __resetProgramCacheForTests();
    await hydratePrograms();

    expect(payouts.get("po2")?.status).toBe("approved");
  });
});
