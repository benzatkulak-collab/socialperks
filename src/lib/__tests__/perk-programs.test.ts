import { describe, it, expect, beforeEach } from "vitest";
import {
  PerkProgramManager,
  calculateCycleDates,
  type CreateProgramConfig,
  type RewardTier,
  type ActionSubmission,
} from "../perk-programs";

// ═══════════════ Helpers ═══════════════

function makeTiers(): RewardTier[] {
  return [
    {
      id: "bronze",
      name: "Bronze",
      requiredActions: 3,
      reward: { type: "percentage", value: 10, description: "10% off next visit" },
      color: "#CD7F32",
    },
    {
      id: "silver",
      name: "Silver",
      requiredActions: 5,
      reward: { type: "percentage", value: 20, description: "20% off next visit" },
      color: "#C0C0C0",
    },
    {
      id: "gold",
      name: "Gold",
      requiredActions: 8,
      reward: { type: "dollar", value: 25, description: "$25 store credit" },
      color: "#FFD700",
    },
  ];
}

function makeConfig(overrides?: Partial<CreateProgramConfig>): CreateProgramConfig {
  return {
    name: "Monthly Social Perk",
    description: "Earn rewards by posting about us!",
    rules: {
      allowedPlatforms: ["ig", "tt", "go"],
      allowedActionTypes: ["content", "review", "engage", "share"],
      allowedActions: [],
      minActionsPerCycle: 1,
      maxActionsPerCycle: 10,
      requireUniquePlatforms: false,
      requireUniqueActionTypes: false,
    },
    tiers: makeTiers(),
    cycle: "monthly",
    cycleStartDay: 1,
    carryOverPartial: false,
    gracePeriodDays: 0,
    maxMembers: null,
    ...overrides,
  };
}

function submitIgActions(
  manager: PerkProgramManager,
  programId: string,
  memberId: string,
  count: number
): void {
  // Use different IG actions to avoid issues
  const igActions = [
    "ig_st", "ig_sl", "ig_sp", "ig_fp", "ig_fc",
    "ig_rl", "ig_cb", "ig_lv", "ig_gd", "ig_hl",
  ];
  for (let i = 0; i < count; i++) {
    manager.submitAction(programId, memberId, {
      actionId: igActions[i % igActions.length],
      platformId: "ig",
      proofUrl: `https://example.com/proof-${i}`,
      proofType: "url",
    });
  }
}

// ═══════════════ Tests ═══════════════

describe("PerkProgramManager", () => {
  let manager: PerkProgramManager;

  beforeEach(() => {
    manager = new PerkProgramManager();
  });

  // ── Program CRUD ──────────────────────────────────────────────────────

  describe("createProgram", () => {
    it("creates a program with valid config", () => {
      const program = manager.createProgram("biz_1", makeConfig());

      expect(program.id).toMatch(/^prg_/);
      expect(program.businessId).toBe("biz_1");
      expect(program.name).toBe("Monthly Social Perk");
      expect(program.status).toBe("active");
      expect(program.tiers).toHaveLength(3);
      expect(program.currentMembers).toBe(0);
    });

    it("rejects program with no platforms", () => {
      expect(() =>
        manager.createProgram("biz_1", makeConfig({
          rules: {
            allowedPlatforms: [],
            allowedActionTypes: ["content"],
            allowedActions: [],
            minActionsPerCycle: 1,
            maxActionsPerCycle: 10,
            requireUniquePlatforms: false,
            requireUniqueActionTypes: false,
          },
        }))
      ).toThrow("At least one allowed platform is required");
    });

    it("rejects program with no tiers", () => {
      expect(() =>
        manager.createProgram("biz_1", makeConfig({ tiers: [] }))
      ).toThrow("At least one reward tier is required");
    });

    it("rejects program when minActions > first tier requiredActions", () => {
      expect(() =>
        manager.createProgram("biz_1", makeConfig({
          rules: {
            allowedPlatforms: ["ig"],
            allowedActionTypes: ["content"],
            allowedActions: [],
            minActionsPerCycle: 5,
            maxActionsPerCycle: 10,
            requireUniquePlatforms: false,
            requireUniqueActionTypes: false,
          },
        }))
      ).toThrow("minActionsPerCycle cannot exceed the first tier's requiredActions");
    });

    it("rejects program when maxActions < minActions", () => {
      expect(() =>
        manager.createProgram("biz_1", makeConfig({
          rules: {
            allowedPlatforms: ["ig"],
            allowedActionTypes: ["content"],
            allowedActions: [],
            minActionsPerCycle: 5,
            maxActionsPerCycle: 2,
            requireUniquePlatforms: false,
            requireUniqueActionTypes: false,
          },
          tiers: [
            {
              id: "t1",
              name: "Tier 1",
              requiredActions: 5,
              reward: { type: "percentage", value: 10, description: "10% off" },
              color: "#000",
            },
          ],
        }))
      ).toThrow("maxActionsPerCycle must be >= minActionsPerCycle");
    });

    it("rejects program with invalid action type", () => {
      expect(() =>
        manager.createProgram("biz_1", makeConfig({
          rules: {
            allowedPlatforms: ["ig"],
            allowedActionTypes: ["invalid_type"],
            allowedActions: [],
            minActionsPerCycle: 1,
            maxActionsPerCycle: 10,
            requireUniquePlatforms: false,
            requireUniqueActionTypes: false,
          },
        }))
      ).toThrow("Invalid action type: invalid_type");
    });

    it("sorts tiers by requiredActions ascending", () => {
      const reversedTiers: RewardTier[] = [
        {
          id: "gold",
          name: "Gold",
          requiredActions: 8,
          reward: { type: "dollar", value: 25, description: "$25" },
          color: "#FFD700",
        },
        {
          id: "bronze",
          name: "Bronze",
          requiredActions: 3,
          reward: { type: "percentage", value: 10, description: "10%" },
          color: "#CD7F32",
        },
      ];

      const program = manager.createProgram("biz_1", makeConfig({ tiers: reversedTiers }));
      expect(program.tiers[0].id).toBe("bronze");
      expect(program.tiers[1].id).toBe("gold");
    });
  });

  describe("getProgram / listPrograms", () => {
    it("gets program by ID", () => {
      const created = manager.createProgram("biz_1", makeConfig());
      const fetched = manager.getProgram(created.id);
      expect(fetched).not.toBeNull();
      expect(fetched!.id).toBe(created.id);
    });

    it("returns null for non-existent program", () => {
      expect(manager.getProgram("prg_nonexistent")).toBeNull();
    });

    it("lists programs by business", () => {
      manager.createProgram("biz_1", makeConfig());
      manager.createProgram("biz_1", makeConfig({ name: "Second Program" }));
      manager.createProgram("biz_2", makeConfig());

      expect(manager.listPrograms("biz_1")).toHaveLength(2);
      expect(manager.listPrograms("biz_2")).toHaveLength(1);
      expect(manager.listPrograms("biz_3")).toHaveLength(0);
    });
  });

  describe("updateProgram", () => {
    it("updates program fields", () => {
      const program = manager.createProgram("biz_1", makeConfig());
      const updated = manager.updateProgram(program.id, {
        name: "Updated Name",
        description: "Updated description",
      });

      expect(updated.name).toBe("Updated Name");
      expect(updated.description).toBe("Updated description");
    });

    it("rejects update on ended program", () => {
      const program = manager.createProgram("biz_1", makeConfig());
      manager.endProgram(program.id);

      expect(() =>
        manager.updateProgram(program.id, { name: "New Name" })
      ).toThrow("Cannot update an ended program");
    });

    it("rejects update with empty tiers", () => {
      const program = manager.createProgram("biz_1", makeConfig());

      expect(() =>
        manager.updateProgram(program.id, { tiers: [] })
      ).toThrow("At least one reward tier is required");
    });
  });

  describe("pause / resume / end", () => {
    it("pauses an active program", () => {
      const program = manager.createProgram("biz_1", makeConfig());
      const paused = manager.pauseProgram(program.id);
      expect(paused.status).toBe("paused");
    });

    it("resumes a paused program", () => {
      const program = manager.createProgram("biz_1", makeConfig());
      manager.pauseProgram(program.id);
      const resumed = manager.resumeProgram(program.id);
      expect(resumed.status).toBe("active");
    });

    it("cannot pause an ended program", () => {
      const program = manager.createProgram("biz_1", makeConfig());
      manager.endProgram(program.id);
      expect(() => manager.pauseProgram(program.id)).toThrow("Cannot pause an ended program");
    });

    it("cannot resume a non-paused program", () => {
      const program = manager.createProgram("biz_1", makeConfig());
      expect(() => manager.resumeProgram(program.id)).toThrow("Can only resume a paused program");
    });

    it("ends a program", () => {
      const program = manager.createProgram("biz_1", makeConfig());
      const ended = manager.endProgram(program.id);
      expect(ended.status).toBe("ended");
    });
  });

  // ── Member Management ─────────────────────────────────────────────────

  describe("enrollMember", () => {
    it("enrolls a member into a program", () => {
      const program = manager.createProgram("biz_1", makeConfig());
      const progress = manager.enrollMember(program.id, "user_1", "Jane Doe", "jane@example.com");

      expect(progress.memberId).toBe("user_1");
      expect(progress.memberName).toBe("Jane Doe");
      expect(progress.currentCycle.completedActions).toHaveLength(0);
      expect(progress.currentCycle.progress).toBe(0);
      expect(progress.currentStreak).toBe(0);

      const updatedProgram = manager.getProgram(program.id);
      expect(updatedProgram!.currentMembers).toBe(1);
    });

    it("rejects enrollment in non-active program", () => {
      const program = manager.createProgram("biz_1", makeConfig());
      manager.pauseProgram(program.id);

      expect(() =>
        manager.enrollMember(program.id, "user_1", "Jane", "jane@example.com")
      ).toThrow("Program is not active");
    });

    it("rejects duplicate enrollment", () => {
      const program = manager.createProgram("biz_1", makeConfig());
      manager.enrollMember(program.id, "user_1", "Jane", "jane@example.com");

      expect(() =>
        manager.enrollMember(program.id, "user_1", "Jane", "jane@example.com")
      ).toThrow("Member is already enrolled in this program");
    });

    it("rejects enrollment when at max capacity", () => {
      const program = manager.createProgram("biz_1", makeConfig({ maxMembers: 1 }));
      manager.enrollMember(program.id, "user_1", "Jane", "jane@example.com");

      expect(() =>
        manager.enrollMember(program.id, "user_2", "John", "john@example.com")
      ).toThrow("Program has reached maximum member capacity");
    });
  });

  describe("unenrollMember", () => {
    it("unenrolls a member", () => {
      const program = manager.createProgram("biz_1", makeConfig());
      manager.enrollMember(program.id, "user_1", "Jane", "jane@example.com");
      manager.unenrollMember(program.id, "user_1");

      expect(manager.getMemberProgress(program.id, "user_1")).toBeNull();
      expect(manager.getProgram(program.id)!.currentMembers).toBe(0);
    });

    it("throws for non-existent member", () => {
      const program = manager.createProgram("biz_1", makeConfig());
      expect(() => manager.unenrollMember(program.id, "user_nonexistent"))
        .toThrow("Member not found in this program");
    });
  });

  describe("getMemberDashboard", () => {
    it("returns all programs for a member", () => {
      const p1 = manager.createProgram("biz_1", makeConfig());
      const p2 = manager.createProgram("biz_2", makeConfig({ name: "Program 2" }));
      manager.enrollMember(p1.id, "user_1", "Jane", "jane@example.com");
      manager.enrollMember(p2.id, "user_1", "Jane", "jane@example.com");

      const dashboard = manager.getMemberDashboard("user_1");
      expect(dashboard).toHaveLength(2);
    });
  });

  // ── Action Submission ─────────────────────────────────────────────────

  describe("submitAction", () => {
    it("submits an action and updates progress", () => {
      const program = manager.createProgram("biz_1", makeConfig());
      manager.enrollMember(program.id, "user_1", "Jane", "jane@example.com");

      const progress = manager.submitAction(program.id, "user_1", {
        actionId: "ig_st",
        platformId: "ig",
        proofUrl: "https://example.com/proof",
        proofType: "url",
      });

      expect(progress.currentCycle.completedActions).toHaveLength(1);
      expect(progress.currentCycle.completedActions[0].status).toBe("pending");
      expect(progress.totalActionsAllTime).toBe(1);
    });

    it("rejects action on disallowed platform", () => {
      const program = manager.createProgram("biz_1", makeConfig({
        rules: {
          allowedPlatforms: ["ig"],
          allowedActionTypes: ["content"],
          allowedActions: [],
          minActionsPerCycle: 1,
          maxActionsPerCycle: 10,
          requireUniquePlatforms: false,
          requireUniqueActionTypes: false,
        },
      }));
      manager.enrollMember(program.id, "user_1", "Jane", "jane@example.com");

      expect(() =>
        manager.submitAction(program.id, "user_1", {
          actionId: "tt_vd",
          platformId: "tt",
          proofUrl: "https://example.com/proof",
          proofType: "url",
        })
      ).toThrow("Platform 'tt' is not allowed in this program");
    });

    it("rejects action with disallowed action type", () => {
      const program = manager.createProgram("biz_1", makeConfig({
        rules: {
          allowedPlatforms: ["ig"],
          allowedActionTypes: ["review"],
          allowedActions: [],
          minActionsPerCycle: 1,
          maxActionsPerCycle: 10,
          requireUniquePlatforms: false,
          requireUniqueActionTypes: false,
        },
      }));
      manager.enrollMember(program.id, "user_1", "Jane", "jane@example.com");

      expect(() =>
        manager.submitAction(program.id, "user_1", {
          actionId: "ig_st",
          platformId: "ig",
          proofUrl: "https://example.com/proof",
          proofType: "url",
        })
      ).toThrow("Action type 'content' is not allowed in this program");
    });

    it("enforces max actions per cycle", () => {
      const program = manager.createProgram("biz_1", makeConfig({
        rules: {
          allowedPlatforms: ["ig"],
          allowedActionTypes: ["content", "engage", "share"],
          allowedActions: [],
          minActionsPerCycle: 1,
          maxActionsPerCycle: 2,
          requireUniquePlatforms: false,
          requireUniqueActionTypes: false,
        },
        tiers: [
          {
            id: "t1",
            name: "Tier 1",
            requiredActions: 1,
            reward: { type: "percentage", value: 10, description: "10%" },
            color: "#000",
          },
        ],
      }));
      manager.enrollMember(program.id, "user_1", "Jane", "jane@example.com");

      manager.submitAction(program.id, "user_1", {
        actionId: "ig_st",
        platformId: "ig",
        proofUrl: "https://example.com/1",
        proofType: "url",
      });
      manager.submitAction(program.id, "user_1", {
        actionId: "ig_sl",
        platformId: "ig",
        proofUrl: "https://example.com/2",
        proofType: "url",
      });

      expect(() =>
        manager.submitAction(program.id, "user_1", {
          actionId: "ig_sp",
          platformId: "ig",
          proofUrl: "https://example.com/3",
          proofType: "url",
        })
      ).toThrow("Maximum actions per cycle reached");
    });

    it("enforces unique platform requirement", () => {
      const program = manager.createProgram("biz_1", makeConfig({
        rules: {
          allowedPlatforms: ["ig", "tt"],
          allowedActionTypes: ["content"],
          allowedActions: [],
          minActionsPerCycle: 1,
          maxActionsPerCycle: 10,
          requireUniquePlatforms: true,
          requireUniqueActionTypes: false,
        },
      }));
      manager.enrollMember(program.id, "user_1", "Jane", "jane@example.com");

      // First IG action should work
      manager.submitAction(program.id, "user_1", {
        actionId: "ig_st",
        platformId: "ig",
        proofUrl: "https://example.com/1",
        proofType: "url",
      });

      // Second IG action should fail because TikTok hasn't been used yet
      expect(() =>
        manager.submitAction(program.id, "user_1", {
          actionId: "ig_sl",
          platformId: "ig",
          proofUrl: "https://example.com/2",
          proofType: "url",
        })
      ).toThrow("Unique platform requirement");
    });

    it("allows same platform when all platforms are used (unique requirement)", () => {
      const program = manager.createProgram("biz_1", makeConfig({
        rules: {
          allowedPlatforms: ["ig", "tt"],
          allowedActionTypes: ["content"],
          allowedActions: [],
          minActionsPerCycle: 1,
          maxActionsPerCycle: 10,
          requireUniquePlatforms: true,
          requireUniqueActionTypes: false,
        },
      }));
      manager.enrollMember(program.id, "user_1", "Jane", "jane@example.com");

      manager.submitAction(program.id, "user_1", {
        actionId: "ig_st",
        platformId: "ig",
        proofUrl: "https://example.com/1",
        proofType: "url",
      });
      manager.submitAction(program.id, "user_1", {
        actionId: "tt_vd",
        platformId: "tt",
        proofUrl: "https://example.com/2",
        proofType: "url",
      });

      // Now all platforms are used, so repeat should be allowed
      expect(() =>
        manager.submitAction(program.id, "user_1", {
          actionId: "ig_sl",
          platformId: "ig",
          proofUrl: "https://example.com/3",
          proofType: "url",
        })
      ).not.toThrow();
    });

    it("enforces unique action type requirement", () => {
      const program = manager.createProgram("biz_1", makeConfig({
        rules: {
          allowedPlatforms: ["ig"],
          allowedActionTypes: ["content", "engage"],
          allowedActions: [],
          minActionsPerCycle: 1,
          maxActionsPerCycle: 10,
          requireUniquePlatforms: false,
          requireUniqueActionTypes: true,
        },
      }));
      manager.enrollMember(program.id, "user_1", "Jane", "jane@example.com");

      // Submit a "content" action
      manager.submitAction(program.id, "user_1", {
        actionId: "ig_st",
        platformId: "ig",
        proofUrl: "https://example.com/1",
        proofType: "url",
      });

      // Another "content" action should fail because "engage" hasn't been used
      expect(() =>
        manager.submitAction(program.id, "user_1", {
          actionId: "ig_sl",
          platformId: "ig",
          proofUrl: "https://example.com/2",
          proofType: "url",
        })
      ).toThrow("Unique action type requirement");
    });

    it("rejects action on non-active program", () => {
      const program = manager.createProgram("biz_1", makeConfig());
      manager.enrollMember(program.id, "user_1", "Jane", "jane@example.com");
      manager.pauseProgram(program.id);

      expect(() =>
        manager.submitAction(program.id, "user_1", {
          actionId: "ig_st",
          platformId: "ig",
          proofUrl: "https://example.com/proof",
          proofType: "url",
        })
      ).toThrow("Program is not active");
    });

    it("rejects action for non-enrolled member", () => {
      const program = manager.createProgram("biz_1", makeConfig());

      expect(() =>
        manager.submitAction(program.id, "user_1", {
          actionId: "ig_st",
          platformId: "ig",
          proofUrl: "https://example.com/proof",
          proofType: "url",
        })
      ).toThrow("Member not found in this program");
    });

    it("rejects action with mismatched platform/action", () => {
      const program = manager.createProgram("biz_1", makeConfig());
      manager.enrollMember(program.id, "user_1", "Jane", "jane@example.com");

      expect(() =>
        manager.submitAction(program.id, "user_1", {
          actionId: "ig_st",  // IG action
          platformId: "tt",    // claiming it's TikTok
          proofUrl: "https://example.com/proof",
          proofType: "url",
        })
      ).toThrow("does not belong to platform");
    });
  });

  // ── Tier Progression ──────────────────────────────────────────────────

  describe("tier progression", () => {
    it("unlocks bronze tier at 3 actions", () => {
      const program = manager.createProgram("biz_1", makeConfig());
      manager.enrollMember(program.id, "user_1", "Jane", "jane@example.com");

      submitIgActions(manager, program.id, "user_1", 3);

      const progress = manager.getMemberProgress(program.id, "user_1")!;
      expect(progress.currentCycle.currentTier).not.toBeNull();
      expect(progress.currentCycle.currentTier!.id).toBe("bronze");
      expect(progress.currentCycle.nextTier!.id).toBe("silver");
      expect(progress.currentCycle.actionsToNextTier).toBe(2);
    });

    it("unlocks silver tier at 5 actions", () => {
      const program = manager.createProgram("biz_1", makeConfig());
      manager.enrollMember(program.id, "user_1", "Jane", "jane@example.com");

      submitIgActions(manager, program.id, "user_1", 5);

      const progress = manager.getMemberProgress(program.id, "user_1")!;
      expect(progress.currentCycle.currentTier!.id).toBe("silver");
    });

    it("unlocks gold tier at 8 actions", () => {
      const program = manager.createProgram("biz_1", makeConfig());
      manager.enrollMember(program.id, "user_1", "Jane", "jane@example.com");

      submitIgActions(manager, program.id, "user_1", 8);

      const progress = manager.getMemberProgress(program.id, "user_1")!;
      expect(progress.currentCycle.currentTier!.id).toBe("gold");
      expect(progress.currentCycle.nextTier).toBeNull();
      expect(progress.currentCycle.actionsToNextTier).toBe(0);
      expect(progress.currentCycle.progress).toBe(100);
    });

    it("progress percentage is correct at partial completion", () => {
      const program = manager.createProgram("biz_1", makeConfig());
      manager.enrollMember(program.id, "user_1", "Jane", "jane@example.com");

      submitIgActions(manager, program.id, "user_1", 4);

      const progress = manager.getMemberProgress(program.id, "user_1")!;
      // 4 / 8 (gold required) = 50%
      expect(progress.currentCycle.progress).toBe(50);
    });
  });

  // ── Verify / Reject Actions ───────────────────────────────────────────

  describe("verifyAction / rejectAction", () => {
    it("verifies a pending action", () => {
      const program = manager.createProgram("biz_1", makeConfig());
      manager.enrollMember(program.id, "user_1", "Jane", "jane@example.com");

      const progress = manager.submitAction(program.id, "user_1", {
        actionId: "ig_st",
        platformId: "ig",
        proofUrl: "https://example.com/proof",
        proofType: "url",
      });

      const actionId = progress.currentCycle.completedActions[0].id;
      const verified = manager.verifyAction(actionId);
      expect(verified.status).toBe("verified");
      expect(verified.verifiedAt).not.toBeNull();
    });

    it("rejects a pending action", () => {
      const program = manager.createProgram("biz_1", makeConfig());
      manager.enrollMember(program.id, "user_1", "Jane", "jane@example.com");

      const progress = manager.submitAction(program.id, "user_1", {
        actionId: "ig_st",
        platformId: "ig",
        proofUrl: "https://example.com/proof",
        proofType: "url",
      });

      const actionId = progress.currentCycle.completedActions[0].id;
      const rejected = manager.rejectAction(actionId);
      expect(rejected.status).toBe("rejected");
    });

    it("rejected action does not count toward tier progress", () => {
      const program = manager.createProgram("biz_1", makeConfig());
      manager.enrollMember(program.id, "user_1", "Jane", "jane@example.com");

      // Submit 3 actions (normally = Bronze)
      submitIgActions(manager, program.id, "user_1", 3);

      // Reject one
      const progress = manager.getMemberProgress(program.id, "user_1")!;
      const actionId = progress.currentCycle.completedActions[0].id;
      manager.rejectAction(actionId);

      // Now only 2 valid actions — should not be bronze
      const updated = manager.getMemberProgress(program.id, "user_1")!;
      expect(updated.currentCycle.currentTier).toBeNull();
    });
  });

  // ── Cycle Management ──────────────────────────────────────────────────

  describe("cycle management", () => {
    it("resetCycle clears member progress and records history", () => {
      const program = manager.createProgram("biz_1", makeConfig());
      manager.enrollMember(program.id, "user_1", "Jane", "jane@example.com");

      submitIgActions(manager, program.id, "user_1", 3);

      manager.resetCycle(program.id);

      const progress = manager.getMemberProgress(program.id, "user_1")!;
      expect(progress.currentCycle.completedActions).toHaveLength(0);
      expect(progress.history).toHaveLength(1);
      expect(progress.history[0].actionsCompleted).toBe(3);
      expect(progress.history[0].tierReached).toBe("bronze");
    });

    it("streak increments when minimum is met", () => {
      const program = manager.createProgram("biz_1", makeConfig());
      manager.enrollMember(program.id, "user_1", "Jane", "jane@example.com");

      // Complete 1 action (meets min of 1) and reset
      submitIgActions(manager, program.id, "user_1", 1);
      manager.resetCycle(program.id);

      const progress = manager.getMemberProgress(program.id, "user_1")!;
      expect(progress.currentStreak).toBe(1);
      expect(progress.totalCyclesCompleted).toBe(1);
    });

    it("streak resets when minimum is not met", () => {
      const program = manager.createProgram("biz_1", makeConfig({
        rules: {
          allowedPlatforms: ["ig"],
          allowedActionTypes: ["content", "engage", "share"],
          allowedActions: [],
          minActionsPerCycle: 2,
          maxActionsPerCycle: 10,
          requireUniquePlatforms: false,
          requireUniqueActionTypes: false,
        },
        tiers: [
          {
            id: "t1",
            name: "Tier 1",
            requiredActions: 2,
            reward: { type: "percentage", value: 10, description: "10%" },
            color: "#000",
          },
        ],
      }));
      manager.enrollMember(program.id, "user_1", "Jane", "jane@example.com");

      // First cycle: meet min
      submitIgActions(manager, program.id, "user_1", 2);
      manager.resetCycle(program.id);

      // Second cycle: don't meet min
      submitIgActions(manager, program.id, "user_1", 1);
      manager.resetCycle(program.id);

      const progress = manager.getMemberProgress(program.id, "user_1")!;
      expect(progress.currentStreak).toBe(0);
      expect(progress.longestStreak).toBe(1);
    });

    it("carry over partial preserves actions when minimum not met", () => {
      const program = manager.createProgram("biz_1", makeConfig({
        carryOverPartial: true,
        rules: {
          allowedPlatforms: ["ig"],
          allowedActionTypes: ["content", "engage", "share"],
          allowedActions: [],
          minActionsPerCycle: 3,
          maxActionsPerCycle: 10,
          requireUniquePlatforms: false,
          requireUniqueActionTypes: false,
        },
      }));
      manager.enrollMember(program.id, "user_1", "Jane", "jane@example.com");

      // Submit 2 actions (below min of 3)
      submitIgActions(manager, program.id, "user_1", 2);

      manager.resetCycle(program.id);

      const progress = manager.getMemberProgress(program.id, "user_1")!;
      // Actions should carry over since minimum was not met
      expect(progress.currentCycle.completedActions).toHaveLength(2);
    });

    it("carry over does NOT apply when minimum is met", () => {
      const program = manager.createProgram("biz_1", makeConfig({
        carryOverPartial: true,
      }));
      manager.enrollMember(program.id, "user_1", "Jane", "jane@example.com");

      // Submit 3 actions (meets min of 1)
      submitIgActions(manager, program.id, "user_1", 3);

      manager.resetCycle(program.id);

      const progress = manager.getMemberProgress(program.id, "user_1")!;
      // Actions should NOT carry over since minimum was met
      expect(progress.currentCycle.completedActions).toHaveLength(0);
    });
  });

  // ── Grace Period ──────────────────────────────────────────────────────

  describe("grace period", () => {
    it("checkGracePeriod returns true within grace window", () => {
      const program = manager.createProgram("biz_1", makeConfig({
        gracePeriodDays: 3,
      }));
      manager.enrollMember(program.id, "user_1", "Jane", "jane@example.com");

      // Grace period should be active since we're within the current cycle
      const inGrace = manager.checkGracePeriod(program.id, "user_1");
      expect(inGrace).toBe(true);
    });

    it("checkGracePeriod returns false when no grace configured", () => {
      const program = manager.createProgram("biz_1", makeConfig({
        gracePeriodDays: 0,
      }));
      manager.enrollMember(program.id, "user_1", "Jane", "jane@example.com");

      const inGrace = manager.checkGracePeriod(program.id, "user_1");
      expect(inGrace).toBe(false);
    });
  });

  // ── Tier Calculation ──────────────────────────────────────────────────

  describe("calculateTier", () => {
    it("returns null for 0 actions", () => {
      const tier = manager.calculateTier(0, makeTiers());
      expect(tier).toBeNull();
    });

    it("returns bronze for exactly 3 actions", () => {
      const tier = manager.calculateTier(3, makeTiers());
      expect(tier!.id).toBe("bronze");
    });

    it("returns silver for 5 actions", () => {
      const tier = manager.calculateTier(5, makeTiers());
      expect(tier!.id).toBe("silver");
    });

    it("returns gold for 8+ actions", () => {
      const tier = manager.calculateTier(10, makeTiers());
      expect(tier!.id).toBe("gold");
    });

    it("returns highest qualifying tier (not exact match)", () => {
      const tier = manager.calculateTier(6, makeTiers());
      expect(tier!.id).toBe("silver");
    });
  });

  // ── getRewardForMember ────────────────────────────────────────────────

  describe("getRewardForMember", () => {
    it("returns null for member with no actions", () => {
      const program = manager.createProgram("biz_1", makeConfig());
      manager.enrollMember(program.id, "user_1", "Jane", "jane@example.com");

      const reward = manager.getRewardForMember(program.id, "user_1");
      expect(reward).toBeNull();
    });

    it("returns current tier as reward", () => {
      const program = manager.createProgram("biz_1", makeConfig());
      manager.enrollMember(program.id, "user_1", "Jane", "jane@example.com");

      submitIgActions(manager, program.id, "user_1", 5);

      const reward = manager.getRewardForMember(program.id, "user_1");
      expect(reward).not.toBeNull();
      expect(reward!.id).toBe("silver");
    });
  });

  // ── Analytics ─────────────────────────────────────────────────────────

  describe("getProgramStats", () => {
    it("returns correct stats for a program", () => {
      const program = manager.createProgram("biz_1", makeConfig());
      manager.enrollMember(program.id, "user_1", "Jane", "jane@example.com");
      manager.enrollMember(program.id, "user_2", "John", "john@example.com");

      submitIgActions(manager, program.id, "user_1", 3);

      const stats = manager.getProgramStats(program.id);
      expect(stats.totalMembers).toBe(2);
      expect(stats.activeMembers).toBe(1);
      expect(stats.totalActionsSubmitted).toBeGreaterThan(0);
      expect(stats.mostPopularPlatforms).toHaveLength(1);
      expect(stats.mostPopularPlatforms[0].platformId).toBe("ig");
    });
  });

  describe("getBusinessStats", () => {
    it("returns aggregate stats across programs", () => {
      const p1 = manager.createProgram("biz_1", makeConfig());
      const p2 = manager.createProgram("biz_1", makeConfig({ name: "Program 2" }));

      manager.enrollMember(p1.id, "user_1", "Jane", "jane@example.com");
      manager.enrollMember(p2.id, "user_2", "John", "john@example.com");

      submitIgActions(manager, p1.id, "user_1", 2);

      const stats = manager.getBusinessStats("biz_1");
      expect(stats.totalPrograms).toBe(2);
      expect(stats.activePrograms).toBe(2);
      expect(stats.totalMembers).toBe(2);
      expect(stats.totalActionsAllTime).toBeGreaterThan(0);
    });
  });

  // ── calculateCycleDates ───────────────────────────────────────────────

  describe("calculateCycleDates", () => {
    it("calculates weekly cycle dates", () => {
      // Use a known Wednesday
      const ref = new Date("2026-03-18T12:00:00Z"); // Wednesday
      const { startDate, endDate } = calculateCycleDates("weekly", 1, ref); // Start on Monday

      const start = new Date(startDate);
      const end = new Date(endDate);
      expect(start.getDay()).toBe(1); // Monday
      expect(end.getTime() - start.getTime()).toBeCloseTo(7 * 24 * 60 * 60 * 1000 - 1, -2);
    });

    it("calculates monthly cycle dates", () => {
      const ref = new Date("2026-03-15T12:00:00Z");
      const { startDate, endDate } = calculateCycleDates("monthly", 1, ref);

      const start = new Date(startDate);
      expect(start.getDate()).toBe(1);
      expect(start.getMonth()).toBe(2); // March
    });
  });

  // ── _reset ────────────────────────────────────────────────────────────

  describe("_reset", () => {
    it("clears all data", () => {
      const program = manager.createProgram("biz_1", makeConfig());
      manager.enrollMember(program.id, "user_1", "Jane", "jane@example.com");

      manager._reset();

      expect(manager.listPrograms("biz_1")).toHaveLength(0);
    });
  });
});
