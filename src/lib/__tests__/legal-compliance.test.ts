import { describe, it, expect, beforeEach } from "vitest";
import {
  LegalComplianceGuard,
  legalGuard,
  isActionIncentivizable,
  getNonIncentivizableActionIds,
} from "../legal-compliance";
import { findAction, ALL_ACTIONS, PLATFORMS } from "../platforms";
import { PerkProgramManager, type CreateProgramConfig, type RewardTier } from "../perk-programs";

// ═══════════════ Helpers ═══════════════

function makeTiers(): RewardTier[] {
  return [
    {
      id: "bronze",
      name: "Bronze",
      requiredActions: 3,
      reward: { type: "percentage", value: 10, description: "10% off" },
      color: "#CD7F32",
    },
    {
      id: "silver",
      name: "Silver",
      requiredActions: 5,
      reward: { type: "percentage", value: 20, description: "20% off" },
      color: "#C0C0C0",
    },
  ];
}

function makeConfig(overrides?: Partial<CreateProgramConfig>): CreateProgramConfig {
  return {
    name: "Test Program",
    description: "Test description",
    rules: {
      allowedPlatforms: ["ig", "fb"],
      allowedActionTypes: ["content", "engage", "share"],
      allowedActions: [],
      minActionsPerCycle: 1,
      maxActionsPerCycle: 10,
      requireUniquePlatforms: false,
      requireUniqueActionTypes: false,
    },
    tiers: makeTiers(),
    cycle: "monthly",
    cycleStartDay: 1,
    ...overrides,
  };
}

// ═══════════════ Tests ═══════════════

describe("LegalComplianceGuard", () => {
  // ── 1-3: Non-incentivizable review platforms ──

  describe("Google Review actions", () => {
    it("should flag go_rv as non-incentivizable", () => {
      expect(isActionIncentivizable("go_rv")).toBe(false);
    });

    it("should flag go_rd as non-incentivizable", () => {
      expect(isActionIncentivizable("go_rd")).toBe(false);
    });

    it("should flag go_rp as non-incentivizable", () => {
      expect(isActionIncentivizable("go_rp")).toBe(false);
    });
  });

  describe("Yelp Review actions", () => {
    it("should flag yp_rv as non-incentivizable", () => {
      expect(isActionIncentivizable("yp_rv")).toBe(false);
    });

    it("should flag yp_rp as non-incentivizable", () => {
      expect(isActionIncentivizable("yp_rp")).toBe(false);
    });
  });

  describe("TripAdvisor Review actions", () => {
    it("should flag ta_rv as non-incentivizable", () => {
      expect(isActionIncentivizable("ta_rv")).toBe(false);
    });

    it("should flag ta_rp as non-incentivizable", () => {
      expect(isActionIncentivizable("ta_rp")).toBe(false);
    });
  });

  describe("Google Maps Review actions", () => {
    it("should flag gm_rv as non-incentivizable", () => {
      expect(isActionIncentivizable("gm_rv")).toBe(false);
    });

    it("should flag gm_rp as non-incentivizable", () => {
      expect(isActionIncentivizable("gm_rp")).toBe(false);
    });
  });

  // ── 4: Google Photos actions are safe ──

  describe("Google Photos actions are safe", () => {
    it("should mark go_ph as incentivizable", () => {
      expect(isActionIncentivizable("go_ph")).toBe(true);
    });

    it("should mark gm_ph as incentivizable", () => {
      expect(isActionIncentivizable("gm_ph")).toBe(true);
    });

    it("should mark go_qa as incentivizable", () => {
      expect(isActionIncentivizable("go_qa")).toBe(true);
    });

    it("should mark gm_qa as incentivizable", () => {
      expect(isActionIncentivizable("gm_qa")).toBe(true);
    });

    it("should mark gm_li as incentivizable", () => {
      expect(isActionIncentivizable("gm_li")).toBe(true);
    });
  });

  // ── 5: Instagram actions are all safe ──

  describe("Instagram actions are all safe", () => {
    it("should mark all Instagram actions as incentivizable", () => {
      const igPlatform = PLATFORMS.find((p) => p.id === "ig");
      expect(igPlatform).toBeDefined();
      for (const action of igPlatform!.actions) {
        expect(action.incentivizable).toBe(true);
      }
    });
  });

  // ── 6: Yelp Photos and Check-in are safe ──

  describe("Yelp safe actions", () => {
    it("should mark yp_ph as incentivizable", () => {
      expect(isActionIncentivizable("yp_ph")).toBe(true);
    });

    it("should mark yp_ci as incentivizable", () => {
      expect(isActionIncentivizable("yp_ci")).toBe(true);
    });
  });

  // ── 7: Facebook Recommendation is safe ──

  describe("Facebook Recommendation is safe", () => {
    it("should mark fb_rc as incentivizable", () => {
      expect(isActionIncentivizable("fb_rc")).toBe(true);
    });
  });

  // ── 8-10: scanProgram ──

  describe("scanProgram", () => {
    it("should block programs with review incentives", () => {
      const result = legalGuard.scanProgram(["go_rv", "ig_rl", "fb_rc"]);
      expect(result.safe).toBe(false);
      expect(result.blockedActions).toContain("go_rv");
      expect(result.safeActions).toContain("ig_rl");
      expect(result.safeActions).toContain("fb_rc");
      expect(result.reviewActions).toContain("go_rv");
    });

    it("should allow programs with only safe actions", () => {
      const result = legalGuard.scanProgram(["ig_rl", "fb_rc", "go_ph", "tt_vd"]);
      expect(result.safe).toBe(true);
      expect(result.blockedActions).toHaveLength(0);
      expect(result.safeActions).toHaveLength(4);
    });

    it("should return alternatives for blocked actions", () => {
      const result = legalGuard.scanProgram(["go_rv", "yp_rv"]);
      expect(result.safe).toBe(false);
      expect(result.suggestion).toBeTruthy();
      expect(result.suggestion.length).toBeGreaterThan(0);
    });

    it("should identify multiple blocked actions from different platforms", () => {
      const result = legalGuard.scanProgram(["go_rv", "yp_rv", "ta_rv", "gm_rv"]);
      expect(result.safe).toBe(false);
      expect(result.blockedActions).toHaveLength(4);
      expect(result.reviewActions).toHaveLength(4);
    });
  });

  // ── 11: getAlternatives ──

  describe("getAlternatives", () => {
    it("should suggest Google Photos instead of Google Reviews", () => {
      const result = legalGuard.getAlternatives("go_rv");
      expect(result.alternatives.length).toBeGreaterThan(0);
      const actionIds = result.alternatives.map((a) => a.actionId);
      expect(actionIds).toContain("go_ph");
      expect(result.explanation).toBeTruthy();
    });

    it("should suggest Yelp Photos instead of Yelp Reviews", () => {
      const result = legalGuard.getAlternatives("yp_rv");
      const actionIds = result.alternatives.map((a) => a.actionId);
      expect(actionIds).toContain("yp_ph");
    });

    it("should suggest social content instead of TripAdvisor Reviews", () => {
      const result = legalGuard.getAlternatives("ta_rv");
      expect(result.alternatives.length).toBeGreaterThan(0);
      expect(result.explanation).toContain("TripAdvisor");
    });
  });

  // ── 12: generateDisclosure ──

  describe("generateDisclosure", () => {
    it("should produce platform-specific disclosure text for Instagram content", () => {
      const disclosure = legalGuard.generateDisclosure("ig", "content");
      expect(disclosure).toContain("#ad");
      expect(disclosure.length).toBeGreaterThan(10);
    });

    it("should produce platform-specific disclosure text for Facebook review", () => {
      const disclosure = legalGuard.generateDisclosure("fb", "review");
      expect(disclosure).toContain("Disclosure");
    });

    it("should fall back to default for unknown platforms", () => {
      const disclosure = legalGuard.generateDisclosure("unknown_platform", "content");
      expect(disclosure).toContain("#ad");
    });

    it("should produce disclosure for referral actions", () => {
      const disclosure = legalGuard.generateDisclosure("default", "referral");
      expect(disclosure).toContain("reward");
    });
  });

  // ── 13-14: getLegalBriefing ──

  describe("getLegalBriefing", () => {
    it("should include correct lists for roofer", () => {
      const briefing = legalGuard.getLegalBriefing("roofer");
      expect(briefing.incentivizableActions.length).toBeGreaterThan(0);
      expect(briefing.nonIncentivizableActions.length).toBeGreaterThan(0);
      expect(briefing.explanation).toContain("roofer");

      // Should include Google Photos as safe
      expect(briefing.incentivizableActions.some((a) => a.includes("Photos"))).toBe(true);

      // Should include Google Reviews as blocked
      expect(briefing.nonIncentivizableActions.some((a) => a.includes("Google") && a.includes("Review"))).toBe(true);

      // Should include review strategy
      expect(briefing.reviewStrategy.length).toBeGreaterThan(0);
      expect(briefing.reviewStrategy).toContain("separately");
    });

    it("should include correct lists for yoga studio", () => {
      const briefing = legalGuard.getLegalBriefing("yoga studio");
      expect(briefing.incentivizableActions.length).toBeGreaterThan(0);
      expect(briefing.nonIncentivizableActions.length).toBeGreaterThan(0);

      // Instagram actions should be safe
      expect(briefing.incentivizableActions.some((a) => a.includes("Instagram"))).toBe(true);

      // Yelp reviews should be blocked
      expect(briefing.nonIncentivizableActions.some((a) => a.includes("Yelp") && a.includes("Review"))).toBe(true);

      expect(briefing.explanation).toContain("yoga studio");
    });

    it("should include a full briefing string", () => {
      const briefing = legalGuard.getLegalBriefing("restaurant");
      expect(briefing.fullBriefing).toContain("YOU CAN offer");
      expect(briefing.fullBriefing).toContain("YOU CANNOT offer");
      expect(briefing.fullBriefing).toContain("HOW TO STILL GET REVIEWS");
    });
  });

  // ── 15: getWarningsForAction ──

  describe("getWarningsForAction", () => {
    it("should return warnings for non-incentivizable actions", () => {
      const warnings = legalGuard.getWarningsForAction("go_rv");
      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings[0].severity).toBe("blocked");
      expect(warnings[0].legalBasis).toContain("Google");
    });

    it("should return empty array for safe actions", () => {
      const warnings = legalGuard.getWarningsForAction("ig_rl");
      expect(warnings).toHaveLength(0);
    });
  });

  // ── 16: scanCampaign ──

  describe("scanCampaign", () => {
    it("should block campaigns with Yelp review incentives", () => {
      const result = legalGuard.scanCampaign(["yp_rv", "ig_st"]);
      expect(result.safe).toBe(false);
      expect(result.blockedActions).toContain("yp_rv");
      expect(result.warnings.some((w) => w.platform === "Yelp")).toBe(true);
    });

    it("should pass campaigns with only incentivizable actions", () => {
      const result = legalGuard.scanCampaign(["ig_rl", "tt_vd", "fb_rc", "go_ph"]);
      expect(result.safe).toBe(true);
      expect(result.blockedActions).toHaveLength(0);
    });
  });

  // ── 17: getNonIncentivizableActionIds ──

  describe("getNonIncentivizableActionIds", () => {
    it("should return all non-incentivizable action IDs", () => {
      const ids = getNonIncentivizableActionIds();
      expect(ids).toContain("go_rv");
      expect(ids).toContain("go_rd");
      expect(ids).toContain("go_rp");
      expect(ids).toContain("yp_rv");
      expect(ids).toContain("yp_rp");
      expect(ids).toContain("ta_rv");
      expect(ids).toContain("ta_rp");
      expect(ids).toContain("gm_rv");
      expect(ids).toContain("gm_rp");
      // Should NOT include safe actions
      expect(ids).not.toContain("ig_rl");
      expect(ids).not.toContain("fb_rc");
      expect(ids).not.toContain("go_ph");
    });
  });

  // ── 18: Every action in PLATFORMS has incentivizable field ──

  describe("All actions have incentivizable field", () => {
    it("should have incentivizable set on every action across all platforms", () => {
      for (const platform of PLATFORMS) {
        for (const action of platform.actions) {
          expect(typeof action.incentivizable).toBe("boolean");
        }
      }
    });

    it("should have exactly 9 non-incentivizable actions", () => {
      // go_rv, go_rd, go_rp, gm_rv, gm_rp, yp_rv, yp_rp, ta_rv, ta_rp
      const nonIncentivizable = ALL_ACTIONS.filter((a) => !a.incentivizable);
      expect(nonIncentivizable).toHaveLength(9);
    });
  });

  // ── 19-20: Perk program creation rejects blocked actions ──

  describe("Perk program creation with legal compliance", () => {
    let manager: PerkProgramManager;

    beforeEach(() => {
      manager = new PerkProgramManager();
    });

    it("should reject programs with non-incentivizable actions", () => {
      const config = makeConfig({
        rules: {
          allowedPlatforms: ["go", "ig"],
          allowedActionTypes: ["review", "content"],
          allowedActions: ["go_rv", "ig_rl"],
          minActionsPerCycle: 1,
          maxActionsPerCycle: 5,
          requireUniquePlatforms: false,
          requireUniqueActionTypes: false,
        },
      });

      expect(() => manager.createProgram("biz_1", config)).toThrow(
        /non-incentivizable/i
      );
    });

    it("should allow programs with only safe actions in allowedActions", () => {
      const config = makeConfig({
        rules: {
          allowedPlatforms: ["ig", "fb"],
          allowedActionTypes: ["content", "engage"],
          allowedActions: ["ig_rl", "fb_rc", "ig_st"],
          minActionsPerCycle: 1,
          maxActionsPerCycle: 5,
          requireUniquePlatforms: false,
          requireUniqueActionTypes: false,
        },
      });

      const program = manager.createProgram("biz_1", config);
      expect(program).toBeDefined();
      expect(program.id).toBeTruthy();
    });

    it("should allow programs with empty allowedActions (platform-level check skipped)", () => {
      const config = makeConfig();
      // Empty allowedActions => no specific action check
      const program = manager.createProgram("biz_1", config);
      expect(program).toBeDefined();
    });
  });

  // ── 21-22: Perk program submitAction rejects non-incentivizable ──

  describe("Perk program submitAction with legal compliance", () => {
    let manager: PerkProgramManager;
    let programId: string;

    beforeEach(() => {
      manager = new PerkProgramManager();
      const config = makeConfig({
        rules: {
          allowedPlatforms: ["ig", "go"],
          allowedActionTypes: ["content", "review", "engage"],
          allowedActions: [],
          minActionsPerCycle: 1,
          maxActionsPerCycle: 10,
          requireUniquePlatforms: false,
          requireUniqueActionTypes: false,
        },
      });
      const program = manager.createProgram("biz_1", config);
      programId = program.id;
      manager.enrollMember(programId, "user_1", "Test User", "test@test.com");
    });

    it("should reject submission for non-incentivizable action", () => {
      expect(() =>
        manager.submitAction(programId, "user_1", {
          actionId: "go_rv",
          platformId: "go",
          proofUrl: "https://google.com/review/123",
          proofType: "url",
        })
      ).toThrow(/cannot be incentivized/i);
    });

    it("should accept submission for incentivizable action", () => {
      const result = manager.submitAction(programId, "user_1", {
        actionId: "ig_rl",
        platformId: "ig",
        proofUrl: "https://instagram.com/reel/123",
        proofType: "url",
      });
      expect(result).toBeDefined();
      expect(result.currentCycle.completedActions.length).toBe(1);
    });
  });

  // ── 23: AI agent never recommends incentivized reviews ──

  describe("AI agent legal compliance", () => {
    it("should not include non-incentivizable actions in action data", () => {
      // Verify from the data: all non-incentivizable actions are properly marked
      const nonIncentivizable = getNonIncentivizableActionIds();
      for (const actionId of nonIncentivizable) {
        const action = findAction(actionId);
        expect(action).toBeDefined();
        expect(action!.incentivizable).toBe(false);
        expect(action!.type).toBe("review");
      }
    });
  });

  // ── 24: Nextdoor and Telegram reviews are incentivizable ──

  describe("Other platform reviews are incentivizable", () => {
    it("should mark Nextdoor Recommendation as incentivizable", () => {
      expect(isActionIncentivizable("nd_rc")).toBe(true);
    });

    it("should mark Telegram Bot Review as incentivizable", () => {
      expect(isActionIncentivizable("tg_rv")).toBe(true);
    });

    it("should mark Discord Channel Review as incentivizable", () => {
      expect(isActionIncentivizable("dc_rv")).toBe(true);
    });

    it("should mark Lemon8 Review Post as incentivizable", () => {
      expect(isActionIncentivizable("l8_rv")).toBe(true);
    });
  });

  // ── 25: All referral and share actions are incentivizable ──

  describe("All referral and share actions are incentivizable", () => {
    it("should mark all referral actions as incentivizable", () => {
      const referralActions = ALL_ACTIONS.filter((a) => a.type === "referral");
      for (const action of referralActions) {
        expect(action.incentivizable).toBe(true);
      }
    });

    it("should mark all share actions as incentivizable", () => {
      const shareActions = ALL_ACTIONS.filter((a) => a.type === "share");
      for (const action of shareActions) {
        expect(action.incentivizable).toBe(true);
      }
    });

    it("should mark all engage actions as incentivizable", () => {
      const engageActions = ALL_ACTIONS.filter((a) => a.type === "engage");
      for (const action of engageActions) {
        expect(action.incentivizable).toBe(true);
      }
    });
  });

  // ── 26: Comprehensive non-incentivizable list correctness ──

  describe("Non-incentivizable list is precisely correct", () => {
    it("should have exactly these non-incentivizable actions", () => {
      const expected = new Set([
        "go_rv", "go_rd", "go_rp",
        "gm_rv", "gm_rp",
        "yp_rv", "yp_rp",
        "ta_rv", "ta_rp",
      ]);
      const actual = new Set(getNonIncentivizableActionIds());
      expect(actual).toEqual(expected);
    });
  });

  // ── 27: scanProgram includes suggestion text ──

  describe("Scan results include actionable suggestions", () => {
    it("should include suggestion text when blocked actions are found", () => {
      const result = legalGuard.scanProgram(["go_rv", "yp_rv"]);
      expect(result.suggestion).toContain("Remove");
      expect(result.suggestion).toContain("separately");
    });

    it("should have empty suggestion when all actions are safe", () => {
      const result = legalGuard.scanProgram(["ig_rl", "fb_rc"]);
      expect(result.suggestion).toBe("");
    });
  });
});
