import { describe, it, expect, beforeEach } from "vitest";
import {
  createExperiment,
  getExperiment,
  startExperiment,
  pauseExperiment,
  endExperiment,
  assignVariant,
  getAssignment,
  recordConversion,
  getExperimentResults,
  autoSelectWinner,
  listExperiments,
  consistentHash,
  calculateChiSquared,
  chiSquaredPValue,
  _resetStore,
} from "@/lib/experiments";

beforeEach(() => {
  _resetStore();
});

// ─── Experiment Lifecycle ───────────────────────────────────────────────────

describe("Experiment lifecycle", () => {
  it("creates an experiment in draft status", () => {
    const exp = createExperiment({
      name: "Button Color Test",
      description: "Test if red button converts better",
      variants: [
        { name: "control", weight: 50 },
        { name: "variant_a", weight: 50 },
      ],
    });

    expect(exp.id).toMatch(/^exp_/);
    expect(exp.name).toBe("Button Color Test");
    expect(exp.status).toBe("draft");
    expect(exp.variants).toHaveLength(2);
    expect(exp.startedAt).toBeNull();
    expect(exp.endedAt).toBeNull();
    expect(exp.winnerVariant).toBeNull();
    expect(exp.createdAt).toBeDefined();
  });

  it("transitions draft -> running -> paused -> running -> completed", () => {
    const exp = createExperiment({
      name: "Lifecycle Test",
      variants: [
        { name: "control", weight: 50 },
        { name: "variant_a", weight: 50 },
      ],
    });

    // Draft -> Running
    const running = startExperiment(exp.id);
    expect(running.status).toBe("running");
    expect(running.startedAt).not.toBeNull();

    // Running -> Paused
    const paused = pauseExperiment(exp.id);
    expect(paused.status).toBe("paused");

    // Paused -> Running (resume)
    const resumed = startExperiment(exp.id);
    expect(resumed.status).toBe("running");

    // Running -> Completed
    const completed = endExperiment(exp.id);
    expect(completed.status).toBe("completed");
    expect(completed.endedAt).not.toBeNull();
  });

  it("cannot start a completed experiment", () => {
    const exp = createExperiment({
      name: "Test",
      variants: [
        { name: "control", weight: 50 },
        { name: "variant_a", weight: 50 },
      ],
    });

    startExperiment(exp.id);
    endExperiment(exp.id);

    expect(() => startExperiment(exp.id)).toThrow(
      'Cannot start experiment in "completed" status'
    );
  });

  it("cannot pause a draft experiment", () => {
    const exp = createExperiment({
      name: "Test",
      variants: [
        { name: "control", weight: 50 },
        { name: "variant_a", weight: 50 },
      ],
    });

    expect(() => pauseExperiment(exp.id)).toThrow(
      'Cannot pause experiment in "draft" status'
    );
  });

  it("cannot complete an already completed experiment", () => {
    const exp = createExperiment({
      name: "Test",
      variants: [
        { name: "control", weight: 50 },
        { name: "variant_a", weight: 50 },
      ],
    });

    startExperiment(exp.id);
    endExperiment(exp.id);

    expect(() => endExperiment(exp.id)).toThrow(
      "Experiment is already completed"
    );
  });
});

// ─── Experiment Validation ──────────────────────────────────────────────────

describe("Experiment validation", () => {
  it("rejects if weights do not sum to 100", () => {
    expect(() =>
      createExperiment({
        name: "Bad Weights",
        variants: [
          { name: "a", weight: 50 },
          { name: "b", weight: 40 },
        ],
      })
    ).toThrow("Variant weights must sum to 100, got 90");
  });

  it("rejects fewer than 2 variants", () => {
    expect(() =>
      createExperiment({
        name: "Too Few",
        variants: [{ name: "only_one", weight: 100 }],
      })
    ).toThrow("Experiment must have at least 2 variants");
  });
});

// ─── Consistent Assignment ──────────────────────────────────────────────────

describe("Consistent assignment", () => {
  it("same user always gets the same variant", () => {
    const exp = createExperiment({
      name: "Consistency Test",
      variants: [
        { name: "control", weight: 50 },
        { name: "variant_a", weight: 50 },
      ],
    });
    startExperiment(exp.id);

    const a1 = assignVariant(exp.id, "user-123");
    const a2 = assignVariant(exp.id, "user-123");

    expect(a1.variantId).toBe(a2.variantId);
    expect(a1.assignedAt).toBe(a2.assignedAt); // Same object returned
  });

  it("consistent hash is deterministic", () => {
    const h1 = consistentHash("exp1", "user1");
    const h2 = consistentHash("exp1", "user1");
    expect(h1).toBe(h2);
    expect(h1).toBeGreaterThanOrEqual(0);
    expect(h1).toBeLessThan(100);
  });

  it("different users may get different variants", () => {
    const exp = createExperiment({
      name: "Multi-User Test",
      variants: [
        { name: "control", weight: 50 },
        { name: "variant_a", weight: 50 },
      ],
    });
    startExperiment(exp.id);

    const variants = new Set<string>();
    for (let i = 0; i < 100; i++) {
      const a = assignVariant(exp.id, `user-${i}`);
      variants.add(a.variantId);
    }

    // With 100 users and 50/50 split, both variants should appear
    expect(variants.size).toBe(2);
  });

  it("only running experiments accept assignments", () => {
    const exp = createExperiment({
      name: "Draft Test",
      variants: [
        { name: "control", weight: 50 },
        { name: "variant_a", weight: 50 },
      ],
    });

    expect(() => assignVariant(exp.id, "user-1")).toThrow(
      'Cannot assign variants for experiment in "draft" status'
    );
  });

  it("getAssignment returns null for unknown user", () => {
    const exp = createExperiment({
      name: "Lookup Test",
      variants: [
        { name: "control", weight: 50 },
        { name: "variant_a", weight: 50 },
      ],
    });
    startExperiment(exp.id);

    expect(getAssignment(exp.id, "unknown-user")).toBeNull();
  });

  it("getAssignment returns existing assignment", () => {
    const exp = createExperiment({
      name: "Lookup Test",
      variants: [
        { name: "control", weight: 50 },
        { name: "variant_a", weight: 50 },
      ],
    });
    startExperiment(exp.id);

    const a = assignVariant(exp.id, "user-42");
    const lookup = getAssignment(exp.id, "user-42");

    expect(lookup).not.toBeNull();
    expect(lookup!.variantId).toBe(a.variantId);
  });
});

// ─── Weight Distribution ────────────────────────────────────────────────────

describe("Weight distribution", () => {
  it("1000 assignments roughly match 70/30 weights", () => {
    const exp = createExperiment({
      name: "Weight Distribution",
      variants: [
        { name: "control", weight: 70 },
        { name: "variant_a", weight: 30 },
      ],
    });
    startExperiment(exp.id);

    const counts: Record<string, number> = {};
    for (let i = 0; i < 1000; i++) {
      const a = assignVariant(exp.id, `dist-user-${i}`);
      counts[a.variantId] = (counts[a.variantId] || 0) + 1;
    }

    const controlId = exp.variants[0].id;
    const variantId = exp.variants[1].id;

    // Allow generous tolerance (15% margin) since hash distribution is not perfect uniform
    expect(counts[controlId]).toBeGreaterThan(550); // 70% of 1000 = 700, lower bound ~550
    expect(counts[controlId]).toBeLessThan(850); // upper bound ~850
    expect(counts[variantId]).toBeGreaterThan(150); // 30% of 1000 = 300, lower bound ~150
    expect(counts[variantId]).toBeLessThan(450); // upper bound ~450
  });

  it("1000 assignments roughly match 50/25/25 three-way split", () => {
    const exp = createExperiment({
      name: "Three-Way Split",
      variants: [
        { name: "control", weight: 50 },
        { name: "variant_a", weight: 25 },
        { name: "variant_b", weight: 25 },
      ],
    });
    startExperiment(exp.id);

    const counts: Record<string, number> = {};
    for (let i = 0; i < 1000; i++) {
      const a = assignVariant(exp.id, `three-user-${i}`);
      counts[a.variantId] = (counts[a.variantId] || 0) + 1;
    }

    const controlCount = counts[exp.variants[0].id] || 0;
    const varACount = counts[exp.variants[1].id] || 0;
    const varBCount = counts[exp.variants[2].id] || 0;

    // Control should be around 500 (50%), with tolerance
    expect(controlCount).toBeGreaterThan(350);
    expect(controlCount).toBeLessThan(650);

    // Each smaller variant around 250 (25%), with tolerance
    expect(varACount).toBeGreaterThan(100);
    expect(varACount).toBeLessThan(400);
    expect(varBCount).toBeGreaterThan(100);
    expect(varBCount).toBeLessThan(400);
  });
});

// ─── Conversion Recording ───────────────────────────────────────────────────

describe("Conversion recording", () => {
  it("records a conversion and marks assignment", () => {
    const exp = createExperiment({
      name: "Conversion Test",
      variants: [
        { name: "control", weight: 50 },
        { name: "variant_a", weight: 50 },
      ],
    });
    startExperiment(exp.id);

    assignVariant(exp.id, "user-conv-1");
    const converted = recordConversion(exp.id, "user-conv-1");

    expect(converted.converted).toBe(true);
    expect(converted.convertedAt).not.toBeNull();
  });

  it("conversion is idempotent", () => {
    const exp = createExperiment({
      name: "Idempotent Test",
      variants: [
        { name: "control", weight: 50 },
        { name: "variant_a", weight: 50 },
      ],
    });
    startExperiment(exp.id);

    assignVariant(exp.id, "user-idem");
    const c1 = recordConversion(exp.id, "user-idem");
    const c2 = recordConversion(exp.id, "user-idem");

    expect(c1.convertedAt).toBe(c2.convertedAt);

    // Verify conversions count is only 1
    const assignment = getAssignment(exp.id, "user-idem")!;
    const variant = getExperiment(exp.id)!.variants.find(
      (v) => v.id === assignment.variantId
    )!;
    expect(variant.conversions).toBe(1);
  });

  it("throws for unassigned user conversion", () => {
    const exp = createExperiment({
      name: "No Assignment",
      variants: [
        { name: "control", weight: 50 },
        { name: "variant_a", weight: 50 },
      ],
    });
    startExperiment(exp.id);

    expect(() => recordConversion(exp.id, "ghost-user")).toThrow(
      "No assignment found"
    );
  });

  it("increments variant-level conversion count", () => {
    const exp = createExperiment({
      name: "Count Test",
      variants: [
        { name: "control", weight: 50 },
        { name: "variant_a", weight: 50 },
      ],
    });
    startExperiment(exp.id);

    // Assign and convert several users
    for (let i = 0; i < 20; i++) {
      assignVariant(exp.id, `count-user-${i}`);
      if (i % 2 === 0) {
        recordConversion(exp.id, `count-user-${i}`);
      }
    }

    const totalConversions = exp.variants.reduce(
      (s, v) => s + v.conversions,
      0
    );
    expect(totalConversions).toBe(10); // Every other user converted
  });
});

// ─── Statistical Significance ───────────────────────────────────────────────

describe("Statistical significance", () => {
  it("calculates chi-squared for clearly different rates", () => {
    // Variant A: 100 impressions, 80 conversions (80%)
    // Variant B: 100 impressions, 20 conversions (20%)
    // Should be very significant
    const chiSq = calculateChiSquared([
      { impressions: 100, conversions: 80 },
      { impressions: 100, conversions: 20 },
    ]);

    expect(chiSq).toBeGreaterThan(50); // Very high chi-squared
  });

  it("returns 0 for zero impressions", () => {
    const chiSq = calculateChiSquared([
      { impressions: 0, conversions: 0 },
      { impressions: 0, conversions: 0 },
    ]);
    expect(chiSq).toBe(0);
  });

  it("returns 0 when all conversions are zero", () => {
    const chiSq = calculateChiSquared([
      { impressions: 100, conversions: 0 },
      { impressions: 100, conversions: 0 },
    ]);
    expect(chiSq).toBe(0);
  });

  it("returns small chi-squared for similar rates", () => {
    const chiSq = calculateChiSquared([
      { impressions: 100, conversions: 50 },
      { impressions: 100, conversions: 48 },
    ]);

    // Very similar rates should produce small chi-squared
    expect(chiSq).toBeLessThan(1);
  });

  it("chi-squared p-value correctness for known values", () => {
    // For df=1, chi-squared = 3.841 should give p ~ 0.05
    const p1 = chiSquaredPValue(3.841, 1);
    expect(p1).toBeCloseTo(0.05, 1);

    // chi-squared = 6.635 with df=1 should give p ~ 0.01
    const p2 = chiSquaredPValue(6.635, 1);
    expect(p2).toBeCloseTo(0.01, 1);

    // chi-squared = 0 should give p = 1
    const p3 = chiSquaredPValue(0, 1);
    expect(p3).toBe(1);
  });

  it("p-value for df=2 at known critical value", () => {
    // For df=2, chi-squared = 5.991 should give p ~ 0.05
    const p = chiSquaredPValue(5.991, 2);
    expect(p).toBeCloseTo(0.05, 1);
  });
});

// ─── Experiment Results ─────────────────────────────────────────────────────

describe("getExperimentResults", () => {
  it("returns full results with conversion rates and CI", () => {
    const exp = createExperiment({
      name: "Results Test",
      variants: [
        { name: "control", weight: 50 },
        { name: "variant_a", weight: 50 },
      ],
    });
    startExperiment(exp.id);

    // Simulate assignments and conversions
    for (let i = 0; i < 100; i++) {
      assignVariant(exp.id, `res-user-${i}`);
    }

    // Convert all users in one variant (whichever got user-0)
    const firstAssignment = getAssignment(exp.id, "res-user-0")!;
    for (let i = 0; i < 100; i++) {
      const a = getAssignment(exp.id, `res-user-${i}`);
      if (a && a.variantId === firstAssignment.variantId) {
        recordConversion(exp.id, `res-user-${i}`);
      }
    }

    const results = getExperimentResults(exp.id);

    expect(results.experimentId).toBe(exp.id);
    expect(results.variants).toHaveLength(2);
    expect(results.chiSquared).toBeGreaterThan(0);
    expect(results.pValue).toBeGreaterThanOrEqual(0);
    expect(results.pValue).toBeLessThanOrEqual(1);
    expect(typeof results.significant).toBe("boolean");

    // Verify confidence intervals exist and are valid
    for (const v of results.variants) {
      expect(v.confidenceInterval.lower).toBeLessThanOrEqual(
        v.confidenceInterval.upper
      );
      expect(v.confidenceInterval.lower).toBeGreaterThanOrEqual(0);
      expect(v.confidenceInterval.upper).toBeLessThanOrEqual(1);
      expect(v.conversionRate).toBeGreaterThanOrEqual(0);
      expect(v.conversionRate).toBeLessThanOrEqual(1);
    }
  });

  it("marks significant results and recommends winner", () => {
    const exp = createExperiment({
      name: "Significant Test",
      variants: [
        { name: "control", weight: 50 },
        { name: "variant_a", weight: 50 },
      ],
    });
    startExperiment(exp.id);

    // Create a strongly significant result:
    // Control: 200 impressions, 20 conversions (10%)
    // Variant: 200 impressions, 80 conversions (40%)
    for (let i = 0; i < 400; i++) {
      assignVariant(exp.id, `sig-user-${i}`);
    }

    // Identify which variant each user got, then selectively convert
    const controlId = exp.variants[0].id;
    let controlConverted = 0;
    let variantConverted = 0;

    for (let i = 0; i < 400; i++) {
      const a = getAssignment(exp.id, `sig-user-${i}`)!;
      if (a.variantId === controlId) {
        // Convert 10% of control
        if (controlConverted < 20 && a.variantId === controlId) {
          recordConversion(exp.id, `sig-user-${i}`);
          controlConverted++;
        }
      } else {
        // Convert 40% of variant
        if (variantConverted < 80) {
          recordConversion(exp.id, `sig-user-${i}`);
          variantConverted++;
        }
      }
    }

    const results = getExperimentResults(exp.id);

    expect(results.significant).toBe(true);
    expect(results.pValue).toBeLessThan(0.05);
    expect(results.recommendedWinner).not.toBeNull();
  });

  it("does not recommend winner when not significant", () => {
    const exp = createExperiment({
      name: "Not Significant",
      variants: [
        { name: "control", weight: 50 },
        { name: "variant_a", weight: 50 },
      ],
    });
    startExperiment(exp.id);

    // Very few assignments — not enough data
    for (let i = 0; i < 6; i++) {
      assignVariant(exp.id, `ns-user-${i}`);
    }

    const results = getExperimentResults(exp.id);
    expect(results.recommendedWinner).toBeNull();
  });
});

// ─── Auto-Winner Selection ──────────────────────────────────────────────────

describe("autoSelectWinner", () => {
  it("ends experiment and declares winner when significant", () => {
    const exp = createExperiment({
      name: "Auto Winner",
      variants: [
        { name: "control", weight: 50 },
        { name: "variant_a", weight: 50 },
      ],
    });
    startExperiment(exp.id);

    // Generate enough data with very different conversion rates
    for (let i = 0; i < 200; i++) {
      assignVariant(exp.id, `aw-user-${i}`);
    }

    const controlId = exp.variants[0].id;
    let controlConv = 0;
    let variantConv = 0;

    for (let i = 0; i < 200; i++) {
      const a = getAssignment(exp.id, `aw-user-${i}`)!;
      if (a.variantId === controlId) {
        if (controlConv < 5) {
          recordConversion(exp.id, `aw-user-${i}`);
          controlConv++;
        }
      } else {
        if (variantConv < 60) {
          recordConversion(exp.id, `aw-user-${i}`);
          variantConv++;
        }
      }
    }

    const completed = autoSelectWinner(exp.id, 30, 0.95);

    expect(completed.status).toBe("completed");
    expect(completed.winnerVariant).not.toBeNull();
    expect(completed.endedAt).not.toBeNull();
  });

  it("throws if min sample size not met", () => {
    const exp = createExperiment({
      name: "Too Small",
      variants: [
        { name: "control", weight: 50 },
        { name: "variant_a", weight: 50 },
      ],
    });
    startExperiment(exp.id);

    for (let i = 0; i < 10; i++) {
      assignVariant(exp.id, `small-user-${i}`);
    }

    expect(() => autoSelectWinner(exp.id, 100)).toThrow(
      "minimum sample size"
    );
  });

  it("throws if results are not significant", () => {
    const exp = createExperiment({
      name: "Not Significant",
      variants: [
        { name: "control", weight: 50 },
        { name: "variant_a", weight: 50 },
      ],
    });
    startExperiment(exp.id);

    // Equal conversion rates — not significant
    for (let i = 0; i < 100; i++) {
      assignVariant(exp.id, `eq-user-${i}`);
      recordConversion(exp.id, `eq-user-${i}`);
    }

    expect(() => autoSelectWinner(exp.id, 30, 0.95)).toThrow(
      "not statistically significant"
    );
  });
});

// ─── Listing ────────────────────────────────────────────────────────────────

describe("listExperiments", () => {
  it("lists all experiments", () => {
    createExperiment({
      name: "A",
      variants: [
        { name: "c", weight: 50 },
        { name: "v", weight: 50 },
      ],
    });
    createExperiment({
      name: "B",
      variants: [
        { name: "c", weight: 50 },
        { name: "v", weight: 50 },
      ],
    });

    expect(listExperiments()).toHaveLength(2);
  });

  it("filters by status", () => {
    const exp1 = createExperiment({
      name: "A",
      variants: [
        { name: "c", weight: 50 },
        { name: "v", weight: 50 },
      ],
    });
    createExperiment({
      name: "B",
      variants: [
        { name: "c", weight: 50 },
        { name: "v", weight: 50 },
      ],
    });

    startExperiment(exp1.id);

    expect(listExperiments("running")).toHaveLength(1);
    expect(listExperiments("draft")).toHaveLength(1);
    expect(listExperiments("completed")).toHaveLength(0);
  });
});

// ─── Edge Cases ─────────────────────────────────────────────────────────────

describe("Edge cases", () => {
  it("getExperiment returns null for unknown ID", () => {
    expect(getExperiment("exp_nonexistent")).toBeNull();
  });

  it("handles experiment with target audience", () => {
    const exp = createExperiment({
      name: "Targeted",
      variants: [
        { name: "c", weight: 50 },
        { name: "v", weight: 50 },
      ],
      targetAudience: {
        roles: ["business"],
        plans: ["pro"],
        percentage: 50,
      },
    });

    expect(exp.targetAudience?.roles).toEqual(["business"]);
    expect(exp.targetAudience?.plans).toEqual(["pro"]);
    expect(exp.targetAudience?.percentage).toBe(50);
  });

  it("endExperiment with explicit winner sets winnerVariant", () => {
    const exp = createExperiment({
      name: "Manual Winner",
      variants: [
        { name: "control", weight: 50 },
        { name: "variant_a", weight: 50 },
      ],
    });
    startExperiment(exp.id);

    const winnerId = exp.variants[1].id;
    const completed = endExperiment(exp.id, winnerId);

    expect(completed.winnerVariant).toBe(winnerId);
  });

  it("results for experiment with no assignments", () => {
    const exp = createExperiment({
      name: "Empty",
      variants: [
        { name: "control", weight: 50 },
        { name: "variant_a", weight: 50 },
      ],
    });

    const results = getExperimentResults(exp.id);

    expect(results.chiSquared).toBe(0);
    expect(results.pValue).toBe(1);
    expect(results.significant).toBe(false);
    expect(results.recommendedWinner).toBeNull();

    for (const v of results.variants) {
      expect(v.conversionRate).toBe(0);
      expect(v.impressions).toBe(0);
      expect(v.conversions).toBe(0);
    }
  });
});
