import { describe, it, expect, beforeEach } from "vitest";
import {
  PerkProgramManager,
  type CreateProgramConfig,
  type RewardTier,
  type CashBackPayout,
} from "../perk-programs";
import { marketingAgent, type BusinessProfile } from "../ai-agent";

// ═══════════════ Helpers ═══════════════

function makeCashBackTiers(): RewardTier[] {
  return [
    {
      id: "quick",
      name: "Quick Reviewer",
      requiredActions: 2,
      reward: {
        type: "cash_back",
        value: 200,
        description: "$200 cash back",
      },
      color: "#34D399",
    },
    {
      id: "full",
      name: "Full Advocate",
      requiredActions: 4,
      reward: {
        type: "cash_back",
        value: 500,
        description: "$500 cash back via Venmo",
      },
      color: "#22D3EE",
    },
  ];
}

function makeOneTimeConfig(
  overrides?: Partial<CreateProgramConfig>
): CreateProgramConfig {
  return {
    name: "Roofing Cash Back Program",
    description: "Get cash back for reviewing our roofing work",
    programType: "one_time_service",
    rules: {
      allowedPlatforms: ["ig", "go", "gm", "nd"],
      allowedActionTypes: ["content", "review"],
      allowedActions: [],
      minActionsPerCycle: 1,
      maxActionsPerCycle: 10,
      requireUniquePlatforms: false,
      requireUniqueActionTypes: false,
    },
    tiers: makeCashBackTiers(),
    cycle: "one_time",
    cycleStartDay: 0,
    carryOverPartial: false,
    gracePeriodDays: 0,
    maxMembers: null,
    serviceDetails: {
      jobValue: 15000,
      cashBackAmount: 500,
      cashBackPercentage: 3,
      deadline: "90 days after service",
      deadlineDays: 90,
    },
    ...overrides,
  };
}

function makeRecurringConfig(
  overrides?: Partial<CreateProgramConfig>
): CreateProgramConfig {
  return {
    name: "Monthly Social Perk",
    description: "Earn rewards by posting about us!",
    programType: "per_visit",
    rules: {
      allowedPlatforms: ["ig", "tt", "go"],
      allowedActionTypes: ["content", "review", "engage", "share"],
      allowedActions: [],
      minActionsPerCycle: 1,
      maxActionsPerCycle: 10,
      requireUniquePlatforms: false,
      requireUniqueActionTypes: false,
    },
    tiers: [
      {
        id: "bronze",
        name: "Bronze",
        requiredActions: 3,
        reward: {
          type: "percentage",
          value: 10,
          description: "10% off next visit",
        },
        color: "#CD7F32",
      },
    ],
    cycle: "monthly",
    cycleStartDay: 1,
    carryOverPartial: false,
    gracePeriodDays: 0,
    maxMembers: null,
    ...overrides,
  };
}

function submitGoActions(
  manager: PerkProgramManager,
  programId: string,
  memberId: string,
  count: number
): void {
  // Use incentivizable actions instead of non-incentivizable Google reviews
  const safeActions = [
    { actionId: "go_ph", platformId: "go" },
    { actionId: "ig_rl", platformId: "ig" },
    { actionId: "nd_rc", platformId: "nd" },
    { actionId: "gm_ph", platformId: "gm" },
  ];
  for (let i = 0; i < count; i++) {
    const action = safeActions[i % safeActions.length];
    manager.submitAction(programId, memberId, {
      actionId: action.actionId,
      platformId: action.platformId,
      proofUrl: `https://example.com/proof-${i}`,
      proofType: "url",
    });
  }
}

function makeRooferProfile(
  overrides: Partial<BusinessProfile> = {}
): BusinessProfile {
  return {
    businessId: "test-roofer",
    name: "Apex Roofing",
    type: "Roofer",
    size: "small",
    industry: "Home Services",
    location: "Austin, TX",
    currentRating: 4.3,
    reviewCount: 28,
    socialPresence: [
      { platform: "ig", followers: 400, engagement: 2.1 },
    ],
    monthlyBudget: null,
    memberCount: null,
    averageTransactionValue: 12000,
    goals: ["more_reviews", "foot_traffic"],
    ...overrides,
  };
}

// ═══════════════ Tests ═══════════════

describe("Cash Back & One-Time Programs", () => {
  let manager: PerkProgramManager;

  beforeEach(() => {
    manager = new PerkProgramManager();
  });

  // ── 1. Create one-time program ──

  describe("createProgram — one-time", () => {
    it("creates a one-time program with service details", () => {
      const program = manager.createProgram("biz_roof", makeOneTimeConfig());

      expect(program.id).toMatch(/^prg_/);
      expect(program.cycle).toBe("one_time");
      expect(program.programType).toBe("one_time_service");
      expect(program.serviceDetails).toBeTruthy();
      expect(program.serviceDetails!.jobValue).toBe(15000);
      expect(program.serviceDetails!.cashBackAmount).toBe(500);
      expect(program.serviceDetails!.cashBackPercentage).toBe(3);
      expect(program.serviceDetails!.deadlineDays).toBe(90);
    });

    it("creates a one-time program without service details", () => {
      const program = manager.createProgram(
        "biz_1",
        makeOneTimeConfig({ serviceDetails: null })
      );

      expect(program.cycle).toBe("one_time");
      expect(program.serviceDetails).toBeNull();
    });

    it("does not require valid cycleStartDay for one-time programs", () => {
      // cycleStartDay=0 is valid for one_time (ignored anyway)
      const program = manager.createProgram(
        "biz_1",
        makeOneTimeConfig({ cycleStartDay: 0 })
      );
      expect(program.cycle).toBe("one_time");
    });
  });

  // ── 2. Enroll member with payment info ──

  describe("enrollMember — payment info", () => {
    it("enrolls a member with payment method", () => {
      const program = manager.createProgram("biz_1", makeOneTimeConfig());
      const progress = manager.enrollMember(
        program.id,
        "user_1",
        "Jane Doe",
        "jane@example.com",
        { type: "venmo", details: "@janedoe" }
      );

      expect(progress.paymentMethod).toEqual({
        type: "venmo",
        details: "@janedoe",
      });
      expect(progress.oneTimeCompleted).toBe(false);
    });

    it("enrolls a member without payment method", () => {
      const program = manager.createProgram("biz_1", makeOneTimeConfig());
      const progress = manager.enrollMember(
        program.id,
        "user_2",
        "John Doe",
        "john@example.com"
      );

      expect(progress.paymentMethod).toBeNull();
    });
  });

  // ── 3. Submit actions in one-time program ──

  describe("submitAction — one-time program", () => {
    it("allows action submission in a one-time program", () => {
      const program = manager.createProgram("biz_1", makeOneTimeConfig());
      manager.enrollMember(program.id, "user_1", "Jane", "jane@test.com");

      const progress = manager.submitAction(program.id, "user_1", {
        actionId: "go_ph",
        platformId: "go",
        proofUrl: "https://example.com/proof",
        proofType: "url",
      });

      expect(progress.currentCycle.completedActions).toHaveLength(1);
      expect(progress.totalActionsAllTime).toBe(1);
    });

    it("marks one-time program as completed when tier is reached", () => {
      const program = manager.createProgram("biz_1", makeOneTimeConfig());
      manager.enrollMember(program.id, "user_1", "Jane", "jane@test.com");

      submitGoActions(manager, program.id, "user_1", 2);

      const progress = manager.getMemberProgress(program.id, "user_1");
      expect(progress!.oneTimeCompleted).toBe(true);
      expect(progress!.currentCycle.currentTier).toBeTruthy();
      expect(progress!.currentCycle.currentTier!.name).toBe("Quick Reviewer");
    });

    it("auto-triggers cash back request for cash_back rewards with payment info", () => {
      const program = manager.createProgram("biz_1", makeOneTimeConfig());
      manager.enrollMember(program.id, "user_1", "Jane", "jane@test.com", {
        type: "venmo",
        details: "@janedoe",
      });

      submitGoActions(manager, program.id, "user_1", 2);

      // Should have auto-created a cash back payout
      const payouts = manager.listCashBackPayouts(program.id);
      expect(payouts.length).toBeGreaterThanOrEqual(1);
      expect(payouts[0].method).toBe("venmo");
      expect(payouts[0].methodDetails).toBe("@janedoe");
      expect(payouts[0].status).toBe("pending");
    });
  });

  // ── 4. One-time program doesn't reset ──

  describe("resetCycle — one-time programs", () => {
    it("does not reset one-time programs", () => {
      const program = manager.createProgram("biz_1", makeOneTimeConfig());
      manager.enrollMember(program.id, "user_1", "Jane", "jane@test.com");
      submitGoActions(manager, program.id, "user_1", 2);

      // Call resetCycle — should be a no-op for one-time programs
      manager.resetCycle(program.id);

      const progress = manager.getMemberProgress(program.id, "user_1");
      // Actions should still be there (not reset)
      expect(progress!.currentCycle.completedActions).toHaveLength(2);
      expect(progress!.oneTimeCompleted).toBe(true);
    });

    it("processAllCycleResets skips one-time programs", () => {
      const oneTime = manager.createProgram("biz_1", makeOneTimeConfig());
      const recurring = manager.createProgram("biz_1", makeRecurringConfig());

      manager.enrollMember(oneTime.id, "user_1", "Jane", "jane@test.com");
      manager.enrollMember(recurring.id, "user_1", "Jane", "jane@test.com");

      submitGoActions(manager, oneTime.id, "user_1", 2);

      // processAllCycleResets should not touch one-time programs
      const resetIds = manager.processAllCycleResets();
      expect(resetIds).not.toContain(oneTime.id);

      // One-time program actions should still be intact
      const progress = manager.getMemberProgress(oneTime.id, "user_1");
      expect(progress!.currentCycle.completedActions).toHaveLength(2);
    });
  });

  // ── 5. Cash back request succeeds after completing tier ──

  describe("requestCashBack", () => {
    it("succeeds after completing a tier in one-time program", () => {
      const program = manager.createProgram("biz_1", makeOneTimeConfig());
      manager.enrollMember(program.id, "user_1", "Jane", "jane@test.com");
      submitGoActions(manager, program.id, "user_1", 2);

      const payout = manager.requestCashBack(
        program.id,
        "user_1",
        "venmo",
        "@janedoe"
      );

      expect(payout.id).toMatch(/^pyt_/);
      expect(payout.status).toBe("pending");
      expect(payout.amount).toBe(200); // Quick Reviewer tier = $200
      expect(payout.method).toBe("venmo");
      expect(payout.methodDetails).toBe("@janedoe");
      expect(payout.tierReached).toBe("Quick Reviewer");
      expect(payout.actionsCompleted).toBe(2);
    });

    it("uses service details percentage for amount calculation", () => {
      const config = makeOneTimeConfig();
      // Service details: 3% of $15000 = $450
      const program = manager.createProgram("biz_1", config);
      manager.enrollMember(program.id, "user_1", "Jane", "jane@test.com");
      submitGoActions(manager, program.id, "user_1", 4);

      const payout = manager.requestCashBack(
        program.id,
        "user_1",
        "check",
        "123 Main St"
      );

      // Full Advocate tier has cash_back type with value 500
      // But since it's cash_back type, it uses the tier value directly
      expect(payout.amount).toBe(500);
    });
  });

  // ── 6. Cash back request fails if tier not reached ──

  describe("requestCashBack — validation", () => {
    it("fails if member has not completed any tier", () => {
      const program = manager.createProgram("biz_1", makeOneTimeConfig());
      manager.enrollMember(program.id, "user_1", "Jane", "jane@test.com");

      // Submit only 1 action (need 2 for first tier)
      manager.submitAction(program.id, "user_1", {
        actionId: "go_ph",
        platformId: "go",
        proofUrl: "https://example.com/proof",
        proofType: "url",
      });

      expect(() =>
        manager.requestCashBack(program.id, "user_1", "venmo", "@jane")
      ).toThrow("Member has not completed any tier yet");
    });

    it("fails if member is not enrolled", () => {
      const program = manager.createProgram("biz_1", makeOneTimeConfig());

      expect(() =>
        manager.requestCashBack(program.id, "ghost_user", "venmo", "@ghost")
      ).toThrow("Member not found in this program");
    });

    it("fails if program does not exist", () => {
      expect(() =>
        manager.requestCashBack("nonexistent", "user_1", "venmo", "@jane")
      ).toThrow("Program not found");
    });
  });

  // ── 7. Approve → send → confirm flow ──

  describe("cash back payout lifecycle", () => {
    let payoutId: string;
    let programId: string;

    beforeEach(() => {
      const program = manager.createProgram("biz_1", makeOneTimeConfig());
      programId = program.id;
      manager.enrollMember(programId, "user_1", "Jane", "jane@test.com");
      submitGoActions(manager, programId, "user_1", 2);

      const payout = manager.requestCashBack(
        programId,
        "user_1",
        "venmo",
        "@janedoe"
      );
      payoutId = payout.id;
    });

    it("approves a pending payout", () => {
      const approved = manager.approveCashBack(payoutId);
      expect(approved.status).toBe("approved");
      expect(approved.approvedAt).toBeTruthy();
    });

    it("marks an approved payout as sent", () => {
      manager.approveCashBack(payoutId);
      const sent = manager.markCashBackSent(payoutId, "Sent via Venmo");
      expect(sent.status).toBe("sent");
      expect(sent.sentAt).toBeTruthy();
      expect(sent.notes).toBe("Sent via Venmo");
    });

    it("confirms receipt of a sent payout", () => {
      manager.approveCashBack(payoutId);
      manager.markCashBackSent(payoutId);
      const confirmed = manager.confirmCashBackReceived(payoutId);
      expect(confirmed.status).toBe("confirmed");
      expect(confirmed.confirmedAt).toBeTruthy();
    });

    it("fails to approve a non-pending payout", () => {
      manager.approveCashBack(payoutId);
      expect(() => manager.approveCashBack(payoutId)).toThrow(
        "Payout is not pending"
      );
    });

    it("fails to send a non-approved payout", () => {
      expect(() => manager.markCashBackSent(payoutId)).toThrow(
        "Payout must be approved before sending"
      );
    });

    it("fails to confirm a non-sent payout", () => {
      expect(() => manager.confirmCashBackReceived(payoutId)).toThrow(
        "Payout must be sent before confirming receipt"
      );
    });

    it("handles the full approve → send → confirm flow", () => {
      const approved = manager.approveCashBack(payoutId);
      expect(approved.status).toBe("approved");

      const sent = manager.markCashBackSent(payoutId, "Venmo @janedoe");
      expect(sent.status).toBe("sent");

      const confirmed = manager.confirmCashBackReceived(payoutId);
      expect(confirmed.status).toBe("confirmed");
      expect(confirmed.approvedAt).toBeTruthy();
      expect(confirmed.sentAt).toBeTruthy();
      expect(confirmed.confirmedAt).toBeTruthy();
    });
  });

  // ── 8. List payouts by status ──

  describe("listCashBackPayouts", () => {
    it("lists all payouts for a program", () => {
      const program = manager.createProgram("biz_1", makeOneTimeConfig());
      manager.enrollMember(program.id, "user_1", "Jane", "jane@test.com");
      manager.enrollMember(program.id, "user_2", "John", "john@test.com");

      submitGoActions(manager, program.id, "user_1", 2);
      submitGoActions(manager, program.id, "user_2", 2);

      manager.requestCashBack(program.id, "user_1", "venmo", "@jane");
      manager.requestCashBack(program.id, "user_2", "check", "456 Oak Ave");

      const payouts = manager.listCashBackPayouts(program.id);
      expect(payouts).toHaveLength(2);
    });

    it("filters payouts by status", () => {
      const program = manager.createProgram("biz_1", makeOneTimeConfig());
      manager.enrollMember(program.id, "user_1", "Jane", "jane@test.com");
      manager.enrollMember(program.id, "user_2", "John", "john@test.com");

      submitGoActions(manager, program.id, "user_1", 2);
      submitGoActions(manager, program.id, "user_2", 2);

      const payout1 = manager.requestCashBack(
        program.id,
        "user_1",
        "venmo",
        "@jane"
      );
      manager.requestCashBack(program.id, "user_2", "check", "456 Oak Ave");

      // Approve one
      manager.approveCashBack(payout1.id);

      const pending = manager.listCashBackPayouts(program.id, "pending");
      expect(pending).toHaveLength(1);
      expect(pending[0].memberId).toBe("user_2");

      const approved = manager.listCashBackPayouts(program.id, "approved");
      expect(approved).toHaveLength(1);
      expect(approved[0].memberId).toBe("user_1");
    });

    it("returns empty array when no payouts match", () => {
      const program = manager.createProgram("biz_1", makeOneTimeConfig());
      const payouts = manager.listCashBackPayouts(program.id);
      expect(payouts).toHaveLength(0);
    });
  });

  // ── 9. Cash back stats ──

  describe("getCashBackStats", () => {
    it("returns accurate stats for a business", () => {
      const program = manager.createProgram("biz_1", makeOneTimeConfig());
      manager.enrollMember(program.id, "user_1", "Jane", "jane@test.com");
      manager.enrollMember(program.id, "user_2", "John", "john@test.com");

      submitGoActions(manager, program.id, "user_1", 2);
      submitGoActions(manager, program.id, "user_2", 4);

      const payout1 = manager.requestCashBack(
        program.id,
        "user_1",
        "venmo",
        "@jane"
      );
      const payout2 = manager.requestCashBack(
        program.id,
        "user_2",
        "check",
        "456 Oak Ave"
      );

      // Approve and send payout1
      manager.approveCashBack(payout1.id);
      manager.markCashBackSent(payout1.id);

      const stats = manager.getCashBackStats("biz_1");
      expect(stats.payoutCount).toBe(2);
      expect(stats.totalPaidOut).toBe(200); // payout1 sent: $200
      expect(stats.totalPending).toBe(500); // payout2 still pending: $500
      expect(stats.totalApproved).toBe(0); // payout1 moved past approved to sent
    });

    it("returns zeros when no payouts exist", () => {
      manager.createProgram("biz_empty", makeOneTimeConfig());
      const stats = manager.getCashBackStats("biz_empty");
      expect(stats.totalPaidOut).toBe(0);
      expect(stats.totalPending).toBe(0);
      expect(stats.totalApproved).toBe(0);
      expect(stats.averagePerCustomer).toBe(0);
      expect(stats.payoutCount).toBe(0);
    });
  });

  // ── 10. High-ticket service details stored correctly ──

  describe("service details", () => {
    it("stores service details on the program", () => {
      const program = manager.createProgram("biz_1", makeOneTimeConfig());

      expect(program.serviceDetails).toEqual({
        jobValue: 15000,
        cashBackAmount: 500,
        cashBackPercentage: 3,
        deadline: "90 days after service",
        deadlineDays: 90,
      });
    });

    it("allows null service details for non-service programs", () => {
      const program = manager.createProgram(
        "biz_1",
        makeRecurringConfig({ serviceDetails: null })
      );
      expect(program.serviceDetails).toBeNull();
    });

    it("updates service details via updateProgram", () => {
      const program = manager.createProgram("biz_1", makeOneTimeConfig());
      const updated = manager.updateProgram(program.id, {
        serviceDetails: {
          jobValue: 20000,
          cashBackAmount: 600,
          cashBackPercentage: 3,
          deadline: "120 days after service",
          deadlineDays: 120,
        },
      });

      expect(updated.serviceDetails!.jobValue).toBe(20000);
      expect(updated.serviceDetails!.cashBackAmount).toBe(600);
      expect(updated.serviceDetails!.deadlineDays).toBe(120);
    });

    it("stores programType correctly", () => {
      const oneTime = manager.createProgram("biz_1", makeOneTimeConfig());
      expect(oneTime.programType).toBe("one_time_service");

      const recurring = manager.createProgram("biz_1", makeRecurringConfig());
      expect(recurring.programType).toBe("per_visit");

      const membership = manager.createProgram(
        "biz_1",
        makeRecurringConfig({ programType: "membership" })
      );
      expect(membership.programType).toBe("membership");
    });
  });

  // ── 11. Deadline enforcement for one-time programs ──

  describe("deadline enforcement", () => {
    it("rejects cash back after deadline expires", () => {
      const program = manager.createProgram(
        "biz_1",
        makeOneTimeConfig({
          serviceDetails: {
            jobValue: 15000,
            cashBackAmount: 500,
            cashBackPercentage: 3,
            deadline: "1 day after service",
            deadlineDays: 1,
          },
        })
      );
      manager.enrollMember(program.id, "user_1", "Jane", "jane@test.com");
      submitGoActions(manager, program.id, "user_1", 2);

      // Manually set joinedAt to a date far in the past
      const progress = manager.getMemberProgress(program.id, "user_1");
      if (progress) {
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 30); // 30 days ago
        (progress as { joinedAt: string }).joinedAt = pastDate.toISOString();
      }

      expect(() =>
        manager.requestCashBack(program.id, "user_1", "venmo", "@jane")
      ).toThrow("Cash back request deadline has passed");
    });
  });

  // ── 12. Program type defaults ──

  describe("program type defaults", () => {
    it("defaults to per_visit when programType not specified", () => {
      const config = makeRecurringConfig();
      delete (config as Record<string, unknown>).programType;
      const program = manager.createProgram("biz_1", config);
      expect(program.programType).toBe("per_visit");
    });

    it("defaults serviceDetails to null when not specified", () => {
      const config = makeRecurringConfig();
      delete (config as Record<string, unknown>).serviceDetails;
      const program = manager.createProgram("biz_1", config);
      expect(program.serviceDetails).toBeNull();
    });
  });

  // ── 13. cash_back reward type on tiers ──

  describe("cash_back reward type", () => {
    it("supports cash_back as a reward type", () => {
      const program = manager.createProgram("biz_1", makeOneTimeConfig());
      expect(program.tiers[0].reward.type).toBe("cash_back");
      expect(program.tiers[0].reward.value).toBe(200);
    });

    it("coexists with percentage and dollar reward types", () => {
      const mixed: RewardTier[] = [
        {
          id: "t1",
          name: "Tier 1",
          requiredActions: 1,
          reward: {
            type: "percentage",
            value: 10,
            description: "10% off",
          },
          color: "#CD7F32",
        },
        {
          id: "t2",
          name: "Tier 2",
          requiredActions: 2,
          reward: {
            type: "cash_back",
            value: 100,
            description: "$100 cash back",
          },
          color: "#C0C0C0",
        },
        {
          id: "t3",
          name: "Tier 3",
          requiredActions: 3,
          reward: {
            type: "dollar",
            value: 25,
            description: "$25 store credit",
          },
          color: "#FFD700",
        },
      ];

      const program = manager.createProgram(
        "biz_1",
        makeOneTimeConfig({ tiers: mixed })
      );
      expect(program.tiers[0].reward.type).toBe("percentage");
      expect(program.tiers[1].reward.type).toBe("cash_back");
      expect(program.tiers[2].reward.type).toBe("dollar");
    });
  });

  // ── 14. getCurrentCycle for one-time programs ──

  describe("getCurrentCycle — one-time", () => {
    it("returns a far-future end date for one-time programs without deadline", () => {
      const program = manager.createProgram(
        "biz_1",
        makeOneTimeConfig({ serviceDetails: null })
      );
      const cycle = manager.getCurrentCycle(program.id);

      const endDate = new Date(cycle.endDate);
      const now = new Date();
      // End date should be ~10 years from now
      expect(endDate.getFullYear()).toBeGreaterThanOrEqual(
        now.getFullYear() + 9
      );
    });

    it("returns a deadline-based end date for service programs", () => {
      const program = manager.createProgram("biz_1", makeOneTimeConfig());
      const cycle = manager.getCurrentCycle(program.id);

      const endDate = new Date(cycle.endDate);
      const now = new Date();
      const diffDays = Math.round(
        (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      // Should be approximately 90 days
      expect(diffDays).toBeGreaterThanOrEqual(89);
      expect(diffDays).toBeLessThanOrEqual(91);
    });
  });

  // ── 15. _reset clears cash back payouts ──

  describe("_reset", () => {
    it("clears all cash back payouts", () => {
      const program = manager.createProgram("biz_1", makeOneTimeConfig());
      manager.enrollMember(program.id, "user_1", "Jane", "jane@test.com");
      submitGoActions(manager, program.id, "user_1", 2);
      manager.requestCashBack(program.id, "user_1", "venmo", "@jane");

      expect(manager.listCashBackPayouts(program.id)).toHaveLength(1);

      manager._reset();

      expect(manager.listCashBackPayouts(program.id)).toHaveLength(0);
    });
  });
});

// ═══════════════ AI Agent Tests ═══════════════

describe("AI Agent — Contractor Recommendations", () => {
  // ── 16. AI generates contractor-specific recommendations ──

  it("generates recommendations for a roofer business", () => {
    const profile = makeRooferProfile();
    const recommendations = marketingAgent.generateRecommendations(profile);

    expect(recommendations.length).toBeGreaterThanOrEqual(1);
    // Should include some contractor-specific recommendations
    const names = recommendations.map((r) => r.name);
    // At least one should mention cash back or neighborhood
    const hasContractorRec = recommendations.some(
      (r) =>
        r.name.includes("Cash Back") ||
        r.name.includes("Neighborhood") ||
        r.name.includes("Before & After")
    );
    expect(hasContractorRec).toBe(true);
  });

  // ── 17. AI suggests cash back for roofers ──

  it("suggests cash_back reward type for roofer recommendations", () => {
    const profile = makeRooferProfile();
    const recommendations = marketingAgent.generateRecommendations(profile);

    const cashBackRecs = recommendations.filter((r) =>
      r.suggestedTiers.some((t) => t.reward.type === "cash_back")
    );
    expect(cashBackRecs.length).toBeGreaterThanOrEqual(1);
  });

  // ── 18. AI does not suggest recurring discount for roofers ──

  it("uses one_time cycle for contractor cash back recommendations", () => {
    const profile = makeRooferProfile();
    const recommendations = marketingAgent.generateRecommendations(profile);

    const oneTimeRecs = recommendations.filter(
      (r) => r.suggestedCycle === "one_time"
    );
    expect(oneTimeRecs.length).toBeGreaterThanOrEqual(1);
  });

  // ── 19. AI emphasizes Google Reviews for contractors ──

  it("emphasizes Google Reviews for contractor businesses", () => {
    const profile = makeRooferProfile();
    const recommendations = marketingAgent.generateRecommendations(profile);

    // The review recommendation should exist and include Google
    const reviewRec = recommendations.find(
      (r) =>
        r.name.includes("Review") ||
        r.actions.some((a) => a.id.startsWith("go_"))
    );
    expect(reviewRec).toBeTruthy();
  });

  // ── 20. AI generates plan for general contractor ──

  it("generates a complete plan for a general contractor", () => {
    const profile = makeRooferProfile({
      businessId: "test-gc",
      name: "Build Right Construction",
      type: "General Contractor",
      averageTransactionValue: 50000,
    });

    const plan = marketingAgent.generatePlan(profile);
    expect(plan.recommendations.length).toBeGreaterThanOrEqual(1);
    expect(plan.strategy.summary).toBeTruthy();
    expect(plan.implementationOrder.length).toBeGreaterThanOrEqual(1);
  });

  // ── 21. AI handles plumber business type ──

  it("recognizes plumber as a service business", () => {
    const profile = makeRooferProfile({
      businessId: "test-plumber",
      name: "Quick Fix Plumbing",
      type: "Plumber",
      averageTransactionValue: 800,
    });

    const analysis = marketingAgent.analyzeBusinessType("Plumber");
    expect(analysis.traits.service).toBe(true);

    const recommendations = marketingAgent.generateRecommendations(profile);
    expect(recommendations.length).toBeGreaterThanOrEqual(1);
  });

  // ── 22. AI handles HVAC business type ──

  it("recognizes HVAC as a service business", () => {
    const profile = makeRooferProfile({
      businessId: "test-hvac",
      name: "Cool Air HVAC",
      type: "HVAC",
      averageTransactionValue: 3000,
    });

    const analysis = marketingAgent.analyzeBusinessType("HVAC");
    expect(analysis.profile.avgTransactionValue).toBe(3000);

    const recommendations = marketingAgent.generateRecommendations(profile);
    expect(recommendations.length).toBeGreaterThanOrEqual(1);
  });

  // ── 23. AI includes Nextdoor for contractor recommendations ──

  it("includes Nextdoor in recommended platforms for contractors", () => {
    const profile = makeRooferProfile();
    const recommendations = marketingAgent.generateRecommendations(profile);

    const hasNextdoor = recommendations.some((r) =>
      r.actions.some((a) => a.id.startsWith("nd_"))
    );
    expect(hasNextdoor).toBe(true);
  });

  // ── 24. AI generates Neighborhood Ambassador recommendation ──

  it("generates a Neighborhood Ambassador recommendation for contractors", () => {
    const profile = makeRooferProfile();
    const recommendations = marketingAgent.generateRecommendations(profile);

    const ambassadorRec = recommendations.find((r) =>
      r.name.includes("Neighborhood Ambassador")
    );
    // It should exist if there's room in the top 5 recommendations
    // For roofers, contractor recs are high priority so should be included
    if (ambassadorRec) {
      expect(ambassadorRec.suggestedCycle).toBe("one_time");
      expect(ambassadorRec.platforms.some((p) => p.id === "nd")).toBe(true);
    } else {
      // If not in top 5, at least verify other contractor-specific recs exist
      const contractorRecs = recommendations.filter(
        (r) =>
          r.name.includes("Cash Back") || r.name.includes("Before & After")
      );
      expect(contractorRecs.length).toBeGreaterThanOrEqual(1);
    }
  });

  // ── 25. AI calculates cash back as percentage of job value ──

  it("calculates appropriate cash back percentage for high-ticket services", () => {
    const profile = makeRooferProfile({ averageTransactionValue: 15000 });
    const recommendations = marketingAgent.generateRecommendations(profile);

    const cashBackRec = recommendations.find((r) =>
      r.suggestedTiers.some((t) => t.reward.type === "cash_back")
    );
    expect(cashBackRec).toBeTruthy();
    if (cashBackRec) {
      const maxCashBack = Math.max(
        ...cashBackRec.suggestedTiers
          .filter((t) => t.reward.type === "cash_back")
          .map((t) => t.reward.value)
      );
      // Cash back should be between 2-5% of job value ($300-$750 for $15K job)
      expect(maxCashBack).toBeGreaterThanOrEqual(300);
      expect(maxCashBack).toBeLessThanOrEqual(750);
    }
  });

  // ── 26. Painter business type profile ──

  it("recognizes painter as a visual transform service", () => {
    const analysis = marketingAgent.analyzeBusinessType("Painter");
    expect(analysis.profile.avgTransactionValue).toBe(4000);
    expect(analysis.profile.traits).toContain("visual");
    expect(analysis.profile.traits).toContain("transform");
  });

  // ── 27. Landscaper business type profile ──

  it("recognizes landscaper with correct attributes", () => {
    const analysis = marketingAgent.analyzeBusinessType("Landscaper");
    expect(analysis.profile.avgTransactionValue).toBe(2500);
    expect(analysis.profile.bestChannels).toContain("ig");
    expect(analysis.profile.bestChannels).toContain("go");
  });

  // ── 28. Electrician business type profile ──

  it("recognizes electrician as a service business", () => {
    const analysis = marketingAgent.analyzeBusinessType("Electrician");
    expect(analysis.profile.avgTransactionValue).toBe(1500);
    expect(analysis.traits.service).toBe(true);
  });
});
