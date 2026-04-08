import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  campaignManager,
  type CampaignState,
  type LaunchConfig,
  type CampaignLifecycle,
} from "../campaign-state-machine";
import { eventStore } from "../events";

// ═══════════════ Helpers ═══════════════

function defaultConfig(overrides?: Partial<LaunchConfig>): LaunchConfig {
  return {
    name: "Test Campaign",
    budgetAllocated: 500,
    budgetType: "dol",
    maxCompletions: 10,
    expiresInDays: 30,
    ...overrides,
  };
}

let campaignCounter = 0;

function uniqueId(prefix = "camp"): string {
  campaignCounter += 1;
  return `${prefix}-${campaignCounter}-${Date.now()}`;
}

function launchCampaign(
  overrides?: Partial<LaunchConfig>,
  campaignId?: string,
  businessId?: string
): CampaignLifecycle {
  return campaignManager.launch(
    campaignId ?? uniqueId(),
    businessId ?? "biz-test",
    defaultConfig(overrides)
  );
}

// ═══════════════ Setup ═══════════════

beforeEach(() => {
  campaignManager._reset();
  eventStore._reset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ═══════════════ Tests ═══════════════

describe("CampaignStateMachine", () => {
  // ─── Launch ────────────────────────────────────────────────────────────────

  describe("launch()", () => {
    it("creates a campaign and transitions to active state", () => {
      const lc = launchCampaign();

      expect(lc.state).toBe("active");
      expect(lc.budget.allocated).toBe(500);
      expect(lc.budget.spent).toBe(0);
      expect(lc.budget.type).toBe("dol");
      expect(lc.completions.current).toBe(0);
      expect(lc.completions.max).toBe(10);
    });

    it("records draft -> active transition in history", () => {
      const lc = launchCampaign();

      expect(lc.transitions).toHaveLength(1);
      expect(lc.transitions[0].from).toBe("draft");
      expect(lc.transitions[0].to).toBe("active");
      expect(lc.transitions[0].reason).toBe("Campaign launched");
    });

    it("sets correct expiry dates", () => {
      const before = Date.now();
      const lc = launchCampaign({ expiresInDays: 7 });
      const after = Date.now();

      const launchedAt = new Date(lc.expiry.launchedAt).getTime();
      const expiresAt = new Date(lc.expiry.expiresAt).getTime();

      expect(launchedAt).toBeGreaterThanOrEqual(before);
      expect(launchedAt).toBeLessThanOrEqual(after);

      const expectedDiff = 7 * 24 * 60 * 60 * 1000;
      const actualDiff = expiresAt - launchedAt;
      // Allow a small tolerance for date arithmetic differences
      expect(actualDiff).toBeGreaterThanOrEqual(expectedDiff - 1000);
      expect(actualDiff).toBeLessThanOrEqual(expectedDiff + 1000);
    });

    it("supports unlimited completions (null)", () => {
      const lc = launchCampaign({ maxCompletions: null });
      expect(lc.completions.max).toBeNull();
    });

    it("supports percentage budget type", () => {
      const lc = launchCampaign({ budgetType: "pct", budgetAllocated: 15 });
      expect(lc.budget.type).toBe("pct");
      expect(lc.budget.allocated).toBe(15);
    });

    it("emits campaign.created and campaign.launched events", () => {
      const id = uniqueId();
      launchCampaign({}, id, "biz-1");

      const events = eventStore.getEntityHistory(id);
      const types = events.map((e) => e.type);

      expect(types).toContain("campaign.created");
      expect(types).toContain("campaign.launched");
    });

    it("throws when campaign ID already exists", () => {
      const id = uniqueId();
      launchCampaign({}, id);

      expect(() => launchCampaign({}, id)).toThrow("already exists");
    });

    it("throws when campaignId is empty", () => {
      expect(() =>
        campaignManager.launch("", "biz-1", defaultConfig())
      ).toThrow("campaignId is required");
    });

    it("throws when businessId is empty", () => {
      expect(() =>
        campaignManager.launch(uniqueId(), "", defaultConfig())
      ).toThrow("businessId is required");
    });

    it("throws when expiresInDays is less than 1", () => {
      expect(() => launchCampaign({ expiresInDays: 0 })).toThrow(
        "expiresInDays must be at least 1"
      );
      expect(() => launchCampaign({ expiresInDays: -5 })).toThrow(
        "expiresInDays must be at least 1"
      );
    });

    it("throws when budgetAllocated is negative", () => {
      expect(() => launchCampaign({ budgetAllocated: -10 })).toThrow(
        "budgetAllocated cannot be negative"
      );
    });

    it("allows zero budgetAllocated (unlimited budget)", () => {
      const lc = launchCampaign({ budgetAllocated: 0 });
      expect(lc.budget.allocated).toBe(0);
    });

    it("stores the campaign for later retrieval", () => {
      const id = uniqueId();
      launchCampaign({}, id);

      const stored = campaignManager.getState(id);
      expect(stored).toBeDefined();
      expect(stored!.id).toBe(id);
      expect(stored!.state).toBe("active");
    });
  });

  // ─── Pause ────────────────────────────────────────────────────────────────

  describe("pause()", () => {
    it("transitions an active campaign to paused", () => {
      const id = uniqueId();
      launchCampaign({}, id);

      const lc = campaignManager.pause(id, "biz-1", "Taking a break");
      expect(lc.state).toBe("paused");
    });

    it("records the transition with correct reason", () => {
      const id = uniqueId();
      launchCampaign({}, id);

      const lc = campaignManager.pause(id, "biz-1", "Budget review");

      const lastTransition = lc.transitions[lc.transitions.length - 1];
      expect(lastTransition.from).toBe("active");
      expect(lastTransition.to).toBe("paused");
      expect(lastTransition.reason).toBe("Budget review");
      expect(lastTransition.triggeredBy).toBe("biz-1");
    });

    it("uses default reason when none provided", () => {
      const id = uniqueId();
      launchCampaign({}, id);

      const lc = campaignManager.pause(id, "biz-1");

      const lastTransition = lc.transitions[lc.transitions.length - 1];
      expect(lastTransition.reason).toBe("Manually paused");
    });

    it("emits campaign.paused event", () => {
      const id = uniqueId();
      launchCampaign({}, id);
      campaignManager.pause(id, "biz-1");

      const events = eventStore.getEntityHistory(id);
      expect(events.some((e) => e.type === "campaign.paused")).toBe(true);
    });

    it("throws when pausing a draft campaign", () => {
      // We cannot directly create a draft without launching,
      // but we can test that pausing a non-existent campaign throws
      expect(() => campaignManager.pause("nonexistent", "biz-1")).toThrow(
        "not found"
      );
    });

    it("throws when pausing an already paused campaign", () => {
      const id = uniqueId();
      launchCampaign({}, id);
      campaignManager.pause(id, "biz-1");

      expect(() => campaignManager.pause(id, "biz-1")).toThrow(
        "Invalid transition"
      );
    });

    it("throws when pausing an ended campaign", () => {
      const id = uniqueId();
      launchCampaign({}, id);
      campaignManager.end(id, "biz-1");

      expect(() => campaignManager.pause(id, "biz-1")).toThrow(
        "Invalid transition"
      );
    });
  });

  // ─── Resume ───────────────────────────────────────────────────────────────

  describe("resume()", () => {
    it("transitions a paused campaign back to active", () => {
      const id = uniqueId();
      launchCampaign({}, id);
      campaignManager.pause(id, "biz-1");

      const lc = campaignManager.resume(id, "biz-1");
      expect(lc.state).toBe("active");
    });

    it("records the transition with correct data", () => {
      const id = uniqueId();
      launchCampaign({}, id);
      campaignManager.pause(id, "biz-1");

      const lc = campaignManager.resume(id, "biz-1");

      const lastTransition = lc.transitions[lc.transitions.length - 1];
      expect(lastTransition.from).toBe("paused");
      expect(lastTransition.to).toBe("active");
      expect(lastTransition.reason).toBe("Campaign resumed");
    });

    it("emits campaign.resumed event", () => {
      const id = uniqueId();
      launchCampaign({}, id);
      campaignManager.pause(id, "biz-1");
      campaignManager.resume(id, "biz-1");

      const events = eventStore.getEntityHistory(id);
      expect(events.some((e) => e.type === "campaign.resumed")).toBe(true);
    });

    it("throws when resuming an active campaign", () => {
      const id = uniqueId();
      launchCampaign({}, id);

      expect(() => campaignManager.resume(id, "biz-1")).toThrow(
        "Invalid transition"
      );
    });

    it("throws when resuming an ended campaign", () => {
      const id = uniqueId();
      launchCampaign({}, id);
      campaignManager.end(id, "biz-1");

      expect(() => campaignManager.resume(id, "biz-1")).toThrow(
        "Invalid transition"
      );
    });

    it("throws when resuming a non-existent campaign", () => {
      expect(() => campaignManager.resume("ghost", "biz-1")).toThrow(
        "not found"
      );
    });
  });

  // ─── End ──────────────────────────────────────────────────────────────────

  describe("end()", () => {
    it("transitions an active campaign to ended", () => {
      const id = uniqueId();
      launchCampaign({}, id);

      const lc = campaignManager.end(id, "biz-1", "Campaign complete");
      expect(lc.state).toBe("ended");
    });

    it("transitions a paused campaign to ended", () => {
      const id = uniqueId();
      launchCampaign({}, id);
      campaignManager.pause(id, "biz-1");

      const lc = campaignManager.end(id, "biz-1");
      expect(lc.state).toBe("ended");
    });

    it("uses default reason when none provided", () => {
      const id = uniqueId();
      launchCampaign({}, id);

      const lc = campaignManager.end(id, "biz-1");
      const lastTransition = lc.transitions[lc.transitions.length - 1];
      expect(lastTransition.reason).toBe("Manually ended");
    });

    it("emits campaign.ended event with totals", () => {
      const id = uniqueId();
      launchCampaign({}, id);
      campaignManager.recordCompletion(id);
      campaignManager.recordSpend(id, 25);
      campaignManager.end(id, "biz-1", "Done");

      const events = eventStore.getEntityHistory(id);
      const endEvent = events.find((e) => e.type === "campaign.ended");

      expect(endEvent).toBeDefined();
      expect(endEvent!.data.reason).toBe("Done");
      expect(endEvent!.data.totalCompletions).toBe(1);
      expect(endEvent!.data.totalSpent).toBe(25);
    });

    it("is a terminal state — cannot transition out of ended", () => {
      const id = uniqueId();
      launchCampaign({}, id);
      campaignManager.end(id, "biz-1");

      expect(() => campaignManager.resume(id, "biz-1")).toThrow(
        "Invalid transition"
      );
      expect(() => campaignManager.pause(id, "biz-1")).toThrow(
        "Invalid transition"
      );
      expect(() => campaignManager.end(id, "biz-1")).toThrow(
        "Invalid transition"
      );
    });

    it("throws when ending a non-existent campaign", () => {
      expect(() => campaignManager.end("ghost", "biz-1")).toThrow("not found");
    });
  });

  // ─── Valid State Transitions (comprehensive) ──────────────────────────────

  describe("state transition rules", () => {
    it("allows draft -> active (via launch)", () => {
      const lc = launchCampaign();
      expect(lc.transitions[0]).toMatchObject({
        from: "draft",
        to: "active",
      });
    });

    it("allows active -> paused", () => {
      const id = uniqueId();
      launchCampaign({}, id);
      const lc = campaignManager.pause(id, "biz-1");
      expect(lc.state).toBe("paused");
    });

    it("allows active -> ended", () => {
      const id = uniqueId();
      launchCampaign({}, id);
      const lc = campaignManager.end(id, "biz-1");
      expect(lc.state).toBe("ended");
    });

    it("allows paused -> active (resume)", () => {
      const id = uniqueId();
      launchCampaign({}, id);
      campaignManager.pause(id, "biz-1");
      const lc = campaignManager.resume(id, "biz-1");
      expect(lc.state).toBe("active");
    });

    it("allows paused -> ended", () => {
      const id = uniqueId();
      launchCampaign({}, id);
      campaignManager.pause(id, "biz-1");
      const lc = campaignManager.end(id, "biz-1");
      expect(lc.state).toBe("ended");
    });

    it("ended is terminal — no outbound transitions", () => {
      const id = uniqueId();
      launchCampaign({}, id);
      campaignManager.end(id, "biz-1");

      expect(campaignManager.canTransition(id, "active")).toBe(false);
      expect(campaignManager.canTransition(id, "paused")).toBe(false);
      expect(campaignManager.canTransition(id, "draft")).toBe(false);
      expect(campaignManager.canTransition(id, "expired")).toBe(false);
    });

    it("expired is terminal — no outbound transitions", () => {
      const id = uniqueId();
      // Launch with expiry in the past to trigger expiration
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      launchCampaign({ expiresInDays: 1 }, id);
      // Manually set the expiry to the past for testing
      const lc = campaignManager.getState(id)!;
      lc.expiry = {
        launchedAt: new Date(Date.now() - 86_400_000 * 2).toISOString(),
        expiresAt: new Date(Date.now() - 86_400_000).toISOString(),
      };

      campaignManager.checkExpiry(id);

      expect(campaignManager.canTransition(id, "active")).toBe(false);
      expect(campaignManager.canTransition(id, "paused")).toBe(false);
      expect(campaignManager.canTransition(id, "ended")).toBe(false);
    });
  });

  // ─── Record Completion ────────────────────────────────────────────────────

  describe("recordCompletion()", () => {
    it("increments the completion count", () => {
      const id = uniqueId();
      launchCampaign({ maxCompletions: 10 }, id);

      const { lifecycle } = campaignManager.recordCompletion(id);
      expect(lifecycle.completions.current).toBe(1);
    });

    it("does not auto-end before max completions", () => {
      const id = uniqueId();
      launchCampaign({ maxCompletions: 5 }, id);

      for (let i = 0; i < 4; i++) {
        const { autoEnded } = campaignManager.recordCompletion(id);
        expect(autoEnded).toBe(false);
      }

      expect(campaignManager.getState(id)!.state).toBe("active");
      expect(campaignManager.getState(id)!.completions.current).toBe(4);
    });

    it("auto-ends when max completions is reached", () => {
      const id = uniqueId();
      launchCampaign({ maxCompletions: 3 }, id);

      campaignManager.recordCompletion(id);
      campaignManager.recordCompletion(id);
      const { lifecycle, autoEnded } = campaignManager.recordCompletion(id);

      expect(autoEnded).toBe(true);
      expect(lifecycle.state).toBe("ended");
      expect(lifecycle.completions.current).toBe(3);
    });

    it("emits campaign.ended event when auto-ending", () => {
      const id = uniqueId();
      launchCampaign({ maxCompletions: 1 }, id);

      campaignManager.recordCompletion(id);

      const events = eventStore.getEntityHistory(id);
      const endEvent = events.find((e) => e.type === "campaign.ended");
      expect(endEvent).toBeDefined();
      expect(endEvent!.data.reason).toBe("max_completions_reached");
    });

    it("does not auto-end with unlimited completions (null)", () => {
      const id = uniqueId();
      launchCampaign({ maxCompletions: null }, id);

      for (let i = 0; i < 100; i++) {
        const { autoEnded } = campaignManager.recordCompletion(id);
        expect(autoEnded).toBe(false);
      }

      expect(campaignManager.getState(id)!.state).toBe("active");
      expect(campaignManager.getState(id)!.completions.current).toBe(100);
    });

    it("throws when campaign is not active", () => {
      const id = uniqueId();
      launchCampaign({}, id);
      campaignManager.pause(id, "biz-1");

      expect(() => campaignManager.recordCompletion(id)).toThrow(
        'not "active"'
      );
    });

    it("throws when campaign is ended", () => {
      const id = uniqueId();
      launchCampaign({}, id);
      campaignManager.end(id, "biz-1");

      expect(() => campaignManager.recordCompletion(id)).toThrow(
        'not "active"'
      );
    });

    it("throws for non-existent campaign", () => {
      expect(() => campaignManager.recordCompletion("ghost")).toThrow(
        "not found"
      );
    });
  });

  // ─── Check Expiry ─────────────────────────────────────────────────────────

  describe("checkExpiry()", () => {
    it("returns expired=false when campaign has not expired", () => {
      const id = uniqueId();
      launchCampaign({ expiresInDays: 30 }, id);

      const { expired } = campaignManager.checkExpiry(id);
      expect(expired).toBe(false);
    });

    it("expires an active campaign that has passed its expiry date", () => {
      const id = uniqueId();
      launchCampaign({ expiresInDays: 1 }, id);

      // Set expiry to the past
      const lc = campaignManager.getState(id)!;
      lc.expiry = {
        launchedAt: new Date(Date.now() - 86_400_000 * 2).toISOString(),
        expiresAt: new Date(Date.now() - 1000).toISOString(),
      };

      const { lifecycle, expired } = campaignManager.checkExpiry(id);
      expect(expired).toBe(true);
      expect(lifecycle.state).toBe("expired");
    });

    it("ends (not expires) a paused campaign that has passed its expiry date", () => {
      const id = uniqueId();
      launchCampaign({ expiresInDays: 1 }, id);
      campaignManager.pause(id, "biz-1");

      // Set expiry to the past
      const lc = campaignManager.getState(id)!;
      lc.expiry = {
        launchedAt: new Date(Date.now() - 86_400_000 * 2).toISOString(),
        expiresAt: new Date(Date.now() - 1000).toISOString(),
      };

      const { lifecycle, expired } = campaignManager.checkExpiry(id);
      expect(expired).toBe(true);
      expect(lifecycle.state).toBe("ended");
    });

    it("emits campaign.expired event for active campaigns", () => {
      const id = uniqueId();
      launchCampaign({ expiresInDays: 1 }, id);

      const lc = campaignManager.getState(id)!;
      lc.expiry = {
        launchedAt: new Date(Date.now() - 86_400_000 * 2).toISOString(),
        expiresAt: new Date(Date.now() - 1000).toISOString(),
      };

      campaignManager.checkExpiry(id);

      const events = eventStore.getEntityHistory(id);
      expect(events.some((e) => e.type === "campaign.expired")).toBe(true);
    });

    it("emits campaign.ended event for paused campaigns that expire", () => {
      const id = uniqueId();
      launchCampaign({ expiresInDays: 1 }, id);
      campaignManager.pause(id, "biz-1");

      const lc = campaignManager.getState(id)!;
      lc.expiry = {
        launchedAt: new Date(Date.now() - 86_400_000 * 2).toISOString(),
        expiresAt: new Date(Date.now() - 1000).toISOString(),
      };

      campaignManager.checkExpiry(id);

      const events = eventStore.getEntityHistory(id);
      const endEvent = events.find((e) => e.type === "campaign.ended");
      expect(endEvent).toBeDefined();
      expect(endEvent!.data.reason).toBe("expired_while_paused");
    });

    it("is a no-op for already ended campaigns", () => {
      const id = uniqueId();
      launchCampaign({}, id);
      campaignManager.end(id, "biz-1");

      const { lifecycle, expired } = campaignManager.checkExpiry(id);
      expect(expired).toBe(false);
      expect(lifecycle.state).toBe("ended");
    });

    it("is a no-op for already expired campaigns", () => {
      const id = uniqueId();
      launchCampaign({ expiresInDays: 1 }, id);

      const lc = campaignManager.getState(id)!;
      lc.expiry = {
        launchedAt: new Date(Date.now() - 86_400_000 * 2).toISOString(),
        expiresAt: new Date(Date.now() - 1000).toISOString(),
      };

      campaignManager.checkExpiry(id);
      const eventCountBefore = eventStore.size;

      // Second call should be a no-op
      const { expired } = campaignManager.checkExpiry(id);
      expect(expired).toBe(true);
      expect(eventStore.size).toBe(eventCountBefore);
    });

    it("throws for non-existent campaign", () => {
      expect(() => campaignManager.checkExpiry("ghost")).toThrow("not found");
    });
  });

  // ─── Check Budget ─────────────────────────────────────────────────────────

  describe("checkBudget()", () => {
    it("returns withinBudget=true when budget is sufficient", () => {
      const id = uniqueId();
      launchCampaign({ budgetAllocated: 100 }, id);

      const { withinBudget, autoPaused } = campaignManager.checkBudget(id, 25);
      expect(withinBudget).toBe(true);
      expect(autoPaused).toBe(false);
    });

    it("returns withinBudget=false and auto-pauses when budget would be exceeded", () => {
      const id = uniqueId();
      launchCampaign({ budgetAllocated: 100 }, id);
      campaignManager.recordSpend(id, 90);

      const { withinBudget, autoPaused, lifecycle } =
        campaignManager.checkBudget(id, 20);

      expect(withinBudget).toBe(false);
      expect(autoPaused).toBe(true);
      expect(lifecycle.state).toBe("paused");
    });

    it("emits campaign.paused event when auto-pausing for budget", () => {
      const id = uniqueId();
      launchCampaign({ budgetAllocated: 50 }, id);
      campaignManager.recordSpend(id, 45);

      campaignManager.checkBudget(id, 10);

      const events = eventStore.getEntityHistory(id);
      const pauseEvent = events.find(
        (e) =>
          e.type === "campaign.paused" && e.data.reason === "budget_exceeded"
      );
      expect(pauseEvent).toBeDefined();
    });

    it("allows spending exactly up to the budget (equal)", () => {
      const id = uniqueId();
      launchCampaign({ budgetAllocated: 100 }, id);
      campaignManager.recordSpend(id, 80);

      const { withinBudget } = campaignManager.checkBudget(id, 20);
      expect(withinBudget).toBe(true);
    });

    it("returns withinBudget=true for unlimited budget (allocated=0)", () => {
      const id = uniqueId();
      launchCampaign({ budgetAllocated: 0 }, id);

      const { withinBudget, autoPaused } = campaignManager.checkBudget(
        id,
        1_000_000
      );
      expect(withinBudget).toBe(true);
      expect(autoPaused).toBe(false);
    });

    it("returns withinBudget=false for non-active campaigns", () => {
      const id = uniqueId();
      launchCampaign({ budgetAllocated: 1000 }, id);
      campaignManager.pause(id, "biz-1");

      const { withinBudget, autoPaused } = campaignManager.checkBudget(id, 10);
      expect(withinBudget).toBe(false);
      expect(autoPaused).toBe(false);
    });

    it("throws for non-existent campaign", () => {
      expect(() => campaignManager.checkBudget("ghost", 10)).toThrow(
        "not found"
      );
    });
  });

  // ─── Record Spend ─────────────────────────────────────────────────────────

  describe("recordSpend()", () => {
    it("increases spent amount", () => {
      const id = uniqueId();
      launchCampaign({}, id);

      campaignManager.recordSpend(id, 25);
      expect(campaignManager.getState(id)!.budget.spent).toBe(25);

      campaignManager.recordSpend(id, 15.5);
      expect(campaignManager.getState(id)!.budget.spent).toBe(40.5);
    });

    it("allows zero spend", () => {
      const id = uniqueId();
      launchCampaign({}, id);

      campaignManager.recordSpend(id, 0);
      expect(campaignManager.getState(id)!.budget.spent).toBe(0);
    });

    it("throws for negative spend", () => {
      const id = uniqueId();
      launchCampaign({}, id);

      expect(() => campaignManager.recordSpend(id, -10)).toThrow(
        "non-negative"
      );
    });

    it("throws for NaN spend", () => {
      const id = uniqueId();
      launchCampaign({}, id);

      expect(() => campaignManager.recordSpend(id, NaN)).toThrow(
        "finite non-negative"
      );
    });

    it("throws for Infinity spend", () => {
      const id = uniqueId();
      launchCampaign({}, id);

      expect(() => campaignManager.recordSpend(id, Infinity)).toThrow(
        "finite non-negative"
      );
    });

    it("throws for non-existent campaign", () => {
      expect(() => campaignManager.recordSpend("ghost", 10)).toThrow(
        "not found"
      );
    });
  });

  // ─── Check And Spend Budget (atomic) ──────────────────────────────────────

  describe("checkAndSpendBudget()", () => {
    it("atomically checks and records spend when within budget", async () => {
      const id = uniqueId();
      launchCampaign({ budgetAllocated: 100 }, id);

      const { withinBudget, autoPaused } =
        await campaignManager.checkAndSpendBudget(id, 30);

      expect(withinBudget).toBe(true);
      expect(autoPaused).toBe(false);
      expect(campaignManager.getState(id)!.budget.spent).toBe(30);
    });

    it("does not record spend when budget would be exceeded", async () => {
      const id = uniqueId();
      launchCampaign({ budgetAllocated: 50 }, id);
      campaignManager.recordSpend(id, 45);

      const { withinBudget } = await campaignManager.checkAndSpendBudget(
        id,
        10
      );

      expect(withinBudget).toBe(false);
      // Spend should not have increased
      expect(campaignManager.getState(id)!.budget.spent).toBe(45);
    });

    it("handles concurrent requests without overspend", async () => {
      const id = uniqueId();
      launchCampaign({ budgetAllocated: 100 }, id);

      // Fire 10 concurrent requests for $15 each (total $150 > $100 budget)
      const results = await Promise.all(
        Array.from({ length: 10 }, () =>
          campaignManager.checkAndSpendBudget(id, 15)
        )
      );

      const approved = results.filter((r) => r.withinBudget).length;
      const totalSpent = campaignManager.getState(id)!.budget.spent;

      // At most 6 should be approved ($15 * 6 = $90, 7th = $105 > $100)
      expect(approved).toBeLessThanOrEqual(6);
      expect(totalSpent).toBeLessThanOrEqual(100);
    });
  });

  // ─── Queries ──────────────────────────────────────────────────────────────

  describe("query methods", () => {
    describe("getState()", () => {
      it("returns the lifecycle for an existing campaign", () => {
        const id = uniqueId();
        launchCampaign({}, id);

        const lc = campaignManager.getState(id);
        expect(lc).toBeDefined();
        expect(lc!.id).toBe(id);
      });

      it("returns undefined for non-existent campaign", () => {
        expect(campaignManager.getState("nonexistent")).toBeUndefined();
      });
    });

    describe("getHistory()", () => {
      it("returns transition history for a campaign", () => {
        const id = uniqueId();
        launchCampaign({}, id);
        campaignManager.pause(id, "biz-1");
        campaignManager.resume(id, "biz-1");

        const history = campaignManager.getHistory(id);
        expect(history).toHaveLength(3); // draft->active, active->paused, paused->active
        expect(history[0]).toMatchObject({ from: "draft", to: "active" });
        expect(history[1]).toMatchObject({ from: "active", to: "paused" });
        expect(history[2]).toMatchObject({ from: "paused", to: "active" });
      });

      it("returns empty array for non-existent campaign", () => {
        expect(campaignManager.getHistory("nonexistent")).toEqual([]);
      });

      it("returns a copy, not the original array", () => {
        const id = uniqueId();
        launchCampaign({}, id);

        const history1 = campaignManager.getHistory(id);
        const history2 = campaignManager.getHistory(id);
        expect(history1).not.toBe(history2);
        expect(history1).toEqual(history2);
      });
    });

    describe("canTransition()", () => {
      it("returns true for valid transitions", () => {
        const id = uniqueId();
        launchCampaign({}, id); // state: active

        expect(campaignManager.canTransition(id, "paused")).toBe(true);
        expect(campaignManager.canTransition(id, "ended")).toBe(true);
        expect(campaignManager.canTransition(id, "expired")).toBe(true);
      });

      it("returns false for invalid transitions", () => {
        const id = uniqueId();
        launchCampaign({}, id); // state: active

        expect(campaignManager.canTransition(id, "draft")).toBe(false);
        expect(campaignManager.canTransition(id, "active")).toBe(false);
      });

      it("returns false for non-existent campaign", () => {
        expect(campaignManager.canTransition("nonexistent", "active")).toBe(
          false
        );
      });

      it("returns false for all transitions from terminal states", () => {
        const id = uniqueId();
        launchCampaign({}, id);
        campaignManager.end(id, "biz-1");

        const allStates: CampaignState[] = [
          "draft",
          "active",
          "paused",
          "ended",
          "expired",
        ];
        for (const state of allStates) {
          expect(campaignManager.canTransition(id, state)).toBe(false);
        }
      });
    });

    describe("listByState()", () => {
      it("returns campaigns in the specified state", () => {
        const id1 = uniqueId();
        const id2 = uniqueId();
        const id3 = uniqueId();

        launchCampaign({}, id1);
        launchCampaign({}, id2);
        launchCampaign({}, id3);
        campaignManager.pause(id2, "biz-1");

        const active = campaignManager.listByState("active");
        expect(active).toHaveLength(2);
        expect(active.map((lc) => lc.id)).toContain(id1);
        expect(active.map((lc) => lc.id)).toContain(id3);

        const paused = campaignManager.listByState("paused");
        expect(paused).toHaveLength(1);
        expect(paused[0].id).toBe(id2);
      });

      it("returns empty array when no campaigns match", () => {
        expect(campaignManager.listByState("paused")).toEqual([]);
      });
    });

    describe("listAll()", () => {
      it("returns all tracked campaigns", () => {
        launchCampaign({}, uniqueId());
        launchCampaign({}, uniqueId());
        launchCampaign({}, uniqueId());

        expect(campaignManager.listAll()).toHaveLength(3);
      });

      it("returns empty array when no campaigns exist", () => {
        expect(campaignManager.listAll()).toEqual([]);
      });
    });

    describe("listByBusiness()", () => {
      it("returns campaigns for a specific business", () => {
        const id1 = uniqueId();
        const id2 = uniqueId();
        const id3 = uniqueId();

        launchCampaign({}, id1, "biz-A");
        launchCampaign({}, id2, "biz-A");
        launchCampaign({}, id3, "biz-B");

        const bizA = campaignManager.listByBusiness("biz-A");
        expect(bizA).toHaveLength(2);
        expect(bizA.every((lc) => lc.businessId === "biz-A")).toBe(true);

        const bizB = campaignManager.listByBusiness("biz-B");
        expect(bizB).toHaveLength(1);
        expect(bizB[0].id).toBe(id3);
      });

      it("returns empty array for unknown business", () => {
        expect(campaignManager.listByBusiness("unknown")).toEqual([]);
      });
    });
  });

  // ─── Check All Expiries ───────────────────────────────────────────────────

  describe("checkAllExpiries()", () => {
    it("expires active campaigns past their expiry date", () => {
      const id1 = uniqueId();
      const id2 = uniqueId();

      launchCampaign({ expiresInDays: 1 }, id1);
      launchCampaign({ expiresInDays: 30 }, id2);

      // Set id1 expiry to the past
      const lc1 = campaignManager.getState(id1)!;
      lc1.expiry = {
        launchedAt: new Date(Date.now() - 86_400_000 * 2).toISOString(),
        expiresAt: new Date(Date.now() - 1000).toISOString(),
      };

      const result = campaignManager.checkAllExpiries();

      expect(result.expired).toContain(id1);
      expect(result.expired).not.toContain(id2);
      expect(campaignManager.getState(id1)!.state).toBe("expired");
      expect(campaignManager.getState(id2)!.state).toBe("active");
    });

    it("ends paused campaigns past their expiry date", () => {
      const id = uniqueId();
      launchCampaign({ expiresInDays: 1 }, id);
      campaignManager.pause(id, "biz-1");

      const lc = campaignManager.getState(id)!;
      lc.expiry = {
        launchedAt: new Date(Date.now() - 86_400_000 * 2).toISOString(),
        expiresAt: new Date(Date.now() - 1000).toISOString(),
      };

      const result = campaignManager.checkAllExpiries();
      expect(result.ended).toContain(id);
      expect(campaignManager.getState(id)!.state).toBe("ended");
    });

    it("skips already terminated campaigns", () => {
      const id1 = uniqueId();
      const id2 = uniqueId();

      launchCampaign({}, id1);
      launchCampaign({}, id2);

      campaignManager.end(id1, "biz-1");

      const result = campaignManager.checkAllExpiries();
      // id1 is already ended, should not appear in results
      expect(result.expired).not.toContain(id1);
      expect(result.ended).not.toContain(id1);
    });

    it("returns empty arrays when nothing has expired", () => {
      launchCampaign({ expiresInDays: 30 }, uniqueId());
      launchCampaign({ expiresInDays: 30 }, uniqueId());

      const result = campaignManager.checkAllExpiries();
      expect(result.expired).toEqual([]);
      expect(result.ended).toEqual([]);
    });
  });

  // ─── Diagnostics ──────────────────────────────────────────────────────────

  describe("diagnostics", () => {
    describe("size", () => {
      it("returns the number of tracked campaigns", () => {
        expect(campaignManager.size).toBe(0);

        launchCampaign({}, uniqueId());
        expect(campaignManager.size).toBe(1);

        launchCampaign({}, uniqueId());
        expect(campaignManager.size).toBe(2);
      });
    });

    describe("_reset()", () => {
      it("clears all campaign state", () => {
        launchCampaign({}, uniqueId());
        launchCampaign({}, uniqueId());

        expect(campaignManager.size).toBe(2);

        campaignManager._reset();

        expect(campaignManager.size).toBe(0);
        expect(campaignManager.listAll()).toEqual([]);
      });
    });
  });

  // ─── Rehydrate from Events ────────────────────────────────────────────────

  describe("rehydrate()", () => {
    it("rebuilds a launched campaign from events", () => {
      const id = uniqueId();
      launchCampaign({ budgetAllocated: 200, maxCompletions: 5 }, id, "biz-r");

      // Clear in-memory state but keep events
      campaignManager._reset();

      const lc = campaignManager.rehydrate(id);
      expect(lc).not.toBeNull();
      expect(lc!.id).toBe(id);
      expect(lc!.state).toBe("active");
      expect(lc!.businessId).toBe("biz-r");
      expect(lc!.budget.allocated).toBe(200);
      expect(lc!.completions.max).toBe(5);
      expect(lc!.transitions).toHaveLength(1); // draft -> active
    });

    it("rebuilds a paused campaign from events", () => {
      const id = uniqueId();
      launchCampaign({}, id, "biz-r");
      campaignManager.pause(id, "biz-r", "Testing pause");

      campaignManager._reset();

      const lc = campaignManager.rehydrate(id);
      expect(lc).not.toBeNull();
      expect(lc!.state).toBe("paused");
      expect(lc!.transitions).toHaveLength(2); // draft->active, active->paused
    });

    it("rebuilds a resumed campaign from events", () => {
      const id = uniqueId();
      launchCampaign({}, id, "biz-r");
      campaignManager.pause(id, "biz-r");
      campaignManager.resume(id, "biz-r");

      campaignManager._reset();

      const lc = campaignManager.rehydrate(id);
      expect(lc).not.toBeNull();
      expect(lc!.state).toBe("active");
      expect(lc!.transitions).toHaveLength(3);
    });

    it("rebuilds an ended campaign from events", () => {
      const id = uniqueId();
      launchCampaign({}, id, "biz-r");
      campaignManager.end(id, "biz-r", "All done");

      campaignManager._reset();

      const lc = campaignManager.rehydrate(id);
      expect(lc).not.toBeNull();
      expect(lc!.state).toBe("ended");
    });

    it("rebuilds an expired campaign from events", () => {
      const id = uniqueId();
      launchCampaign({ expiresInDays: 1 }, id, "biz-r");

      // Set expiry to the past and trigger expiration
      const lc = campaignManager.getState(id)!;
      lc.expiry = {
        launchedAt: new Date(Date.now() - 86_400_000 * 2).toISOString(),
        expiresAt: new Date(Date.now() - 1000).toISOString(),
      };
      campaignManager.checkExpiry(id);

      campaignManager._reset();

      const rehydrated = campaignManager.rehydrate(id);
      expect(rehydrated).not.toBeNull();
      expect(rehydrated!.state).toBe("expired");
    });

    it("returns null when no events exist for the campaign", () => {
      const lc = campaignManager.rehydrate("nonexistent");
      expect(lc).toBeNull();
    });

    it("stores the rehydrated campaign for subsequent queries", () => {
      const id = uniqueId();
      launchCampaign({}, id, "biz-r");
      campaignManager._reset();

      expect(campaignManager.getState(id)).toBeUndefined();

      campaignManager.rehydrate(id);
      expect(campaignManager.getState(id)).toBeDefined();
      expect(campaignManager.getState(id)!.state).toBe("active");
    });
  });

  // ─── Complex Lifecycle Scenarios ──────────────────────────────────────────

  describe("complex lifecycle scenarios", () => {
    it("launch -> pause -> resume -> pause -> end", () => {
      const id = uniqueId();
      launchCampaign({}, id);

      expect(campaignManager.getState(id)!.state).toBe("active");

      campaignManager.pause(id, "biz-1");
      expect(campaignManager.getState(id)!.state).toBe("paused");

      campaignManager.resume(id, "biz-1");
      expect(campaignManager.getState(id)!.state).toBe("active");

      campaignManager.pause(id, "biz-1");
      expect(campaignManager.getState(id)!.state).toBe("paused");

      campaignManager.end(id, "biz-1");
      expect(campaignManager.getState(id)!.state).toBe("ended");

      const history = campaignManager.getHistory(id);
      expect(history).toHaveLength(5);
    });

    it("auto-end from completions during active use", () => {
      const id = uniqueId();
      launchCampaign({ maxCompletions: 3, budgetAllocated: 1000 }, id);

      campaignManager.recordSpend(id, 100);
      campaignManager.recordCompletion(id);
      campaignManager.recordSpend(id, 100);
      campaignManager.recordCompletion(id);
      campaignManager.recordSpend(id, 100);

      const { autoEnded } = campaignManager.recordCompletion(id);
      expect(autoEnded).toBe(true);

      const lc = campaignManager.getState(id)!;
      expect(lc.state).toBe("ended");
      expect(lc.budget.spent).toBe(300);
      expect(lc.completions.current).toBe(3);
    });

    it("budget auto-pause then manual end", () => {
      const id = uniqueId();
      launchCampaign({ budgetAllocated: 100 }, id);

      campaignManager.recordSpend(id, 95);
      const { autoPaused } = campaignManager.checkBudget(id, 10);
      expect(autoPaused).toBe(true);
      expect(campaignManager.getState(id)!.state).toBe("paused");

      // Business decides to end rather than increase budget
      const lc = campaignManager.end(id, "biz-1", "Over budget, ending");
      expect(lc.state).toBe("ended");
    });

    it("multiple businesses tracked independently", () => {
      const biz1Camp = uniqueId();
      const biz2Camp = uniqueId();

      launchCampaign({ budgetAllocated: 100 }, biz1Camp, "biz-1");
      launchCampaign({ budgetAllocated: 200 }, biz2Camp, "biz-2");

      campaignManager.pause(biz1Camp, "biz-1");

      expect(campaignManager.getState(biz1Camp)!.state).toBe("paused");
      expect(campaignManager.getState(biz2Camp)!.state).toBe("active");

      expect(campaignManager.listByBusiness("biz-1")).toHaveLength(1);
      expect(campaignManager.listByBusiness("biz-2")).toHaveLength(1);
    });

    it("each transition records a timestamp", () => {
      const id = uniqueId();
      launchCampaign({}, id);
      campaignManager.pause(id, "biz-1");
      campaignManager.resume(id, "biz-1");

      const history = campaignManager.getHistory(id);
      for (const transition of history) {
        expect(transition.timestamp).toBeDefined();
        // Should be a valid ISO timestamp
        expect(new Date(transition.timestamp).getTime()).not.toBeNaN();
      }

      // Timestamps should be in chronological order
      for (let i = 1; i < history.length; i++) {
        const prev = new Date(history[i - 1].timestamp).getTime();
        const curr = new Date(history[i].timestamp).getTime();
        expect(curr).toBeGreaterThanOrEqual(prev);
      }
    });
  });
});
