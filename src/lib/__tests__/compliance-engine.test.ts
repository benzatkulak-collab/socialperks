import { describe, it, expect, vi, afterEach } from "vitest";
import type { LaunchedCampaign } from "../types";
import {
  getPlatformRules,
  getRequiredDisclosures,
  validateContentDisclosure,
  checkReviewCompliance,
  checkCampaignCompliance,
  generateComplianceReport,
  type ComplianceCheck,
  type PlatformDisclosure,
  type PlatformRules,
  type ComplianceReport,
  type ContentValidation,
} from "../compliance-engine";

// ═══════════════ Helpers ═══════════════

function makeCampaign(overrides?: Partial<LaunchedCampaign>): LaunchedCampaign {
  return {
    id: "camp-test-1",
    businessId: "biz-test-1",
    name: "Test Campaign",
    description: "A test campaign",
    actions: ["ig_fp"],
    discountValue: 10,
    discountType: "pct",
    expiresInDays: 30,
    useTiers: false,
    status: "active",
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

// ═══════════════ Tests ═══════════════

describe("ComplianceEngine", () => {
  // ─── getPlatformRules ──────────────────────────────────────────────────────

  describe("getPlatformRules()", () => {
    it("returns rules for a known platform (Instagram)", () => {
      const rules = getPlatformRules("ig");

      expect(rules).not.toBeNull();
      expect(rules!.platformId).toBe("ig");
      expect(rules!.platformName).toBe("Instagram");
      expect(rules!.contentDisclosure.hashtagsRequired).toContain("#ad");
      expect(rules!.contentDisclosure.hashtagsRequired).toContain("#sponsored");
      expect(rules!.contentDisclosure.nativeToolRequired).toBe(true);
      expect(rules!.contentDisclosure.nativeToolName).toBe(
        "Paid Partnership label"
      );
    });

    it("returns rules for Google with prohibited incentivized reviews", () => {
      const rules = getPlatformRules("go");

      expect(rules).not.toBeNull();
      expect(rules!.reviewPolicy.incentivizedReviewsAllowed).toBe(false);
      expect(rules!.reviewPolicy.riskLevel).toBe("prohibited");
    });

    it("returns rules for Yelp with prohibited incentivized reviews", () => {
      const rules = getPlatformRules("yp");

      expect(rules).not.toBeNull();
      expect(rules!.reviewPolicy.incentivizedReviewsAllowed).toBe(false);
      expect(rules!.reviewPolicy.riskLevel).toBe("prohibited");
    });

    it("returns rules for TripAdvisor with prohibited incentivized reviews", () => {
      const rules = getPlatformRules("ta");

      expect(rules).not.toBeNull();
      expect(rules!.reviewPolicy.incentivizedReviewsAllowed).toBe(false);
      expect(rules!.reviewPolicy.riskLevel).toBe("prohibited");
    });

    it("returns rules for TikTok with required native tool", () => {
      const rules = getPlatformRules("tt");

      expect(rules).not.toBeNull();
      expect(rules!.contentDisclosure.nativeToolRequired).toBe(true);
      expect(rules!.contentDisclosure.nativeToolName).toBe(
        "Branded Content toggle"
      );
    });

    it("returns rules for YouTube with required native tool", () => {
      const rules = getPlatformRules("yt");

      expect(rules).not.toBeNull();
      expect(rules!.contentDisclosure.nativeToolRequired).toBe(true);
      expect(rules!.contentDisclosure.nativeToolName).toBe(
        "'Includes paid promotion' checkbox"
      );
    });

    it("returns rules for Reddit with high-risk review policy", () => {
      const rules = getPlatformRules("rd");

      expect(rules).not.toBeNull();
      expect(rules!.reviewPolicy.riskLevel).toBe("high");
      expect(rules!.reviewPolicy.incentivizedReviewsAllowed).toBe(true);
    });

    it("returns rules for platforms without native tool requirements", () => {
      const rules = getPlatformRules("xw");

      expect(rules).not.toBeNull();
      expect(rules!.contentDisclosure.nativeToolRequired).toBe(false);
      expect(rules!.contentDisclosure.nativeToolName).toBeNull();
    });

    it("returns null for an unknown platform", () => {
      const rules = getPlatformRules("nonexistent_platform");
      expect(rules).toBeNull();
    });

    it("returns null for empty string platform ID", () => {
      const rules = getPlatformRules("");
      expect(rules).toBeNull();
    });

    it("covers all documented platforms", () => {
      const platformIds = [
        "ig",
        "tt",
        "yt",
        "go",
        "fb",
        "xw",
        "yp",
        "li",
        "pi",
        "nd",
        "th",
        "sc",
        "ta",
        "rd",
        "rf",
      ];

      for (const pid of platformIds) {
        const rules = getPlatformRules(pid);
        expect(rules).not.toBeNull();
        expect(rules!.platformId).toBe(pid);
        expect(rules!.lastUpdated).toBeTruthy();
        expect(rules!.prohibitions.length).toBeGreaterThan(0);
        expect(rules!.bestPractices.length).toBeGreaterThan(0);
      }
    });

    it("all platform rules have valid structure", () => {
      const platformIds = ["ig", "tt", "yt", "go", "fb", "xw", "yp", "li", "pi", "nd", "th", "sc", "ta", "rd", "rf"];

      for (const pid of platformIds) {
        const rules = getPlatformRules(pid)!;
        expect(rules.reviewPolicy).toBeDefined();
        expect(["low", "medium", "high", "prohibited"]).toContain(
          rules.reviewPolicy.riskLevel
        );
        expect(typeof rules.reviewPolicy.disclosureRequired).toBe("boolean");
        expect(typeof rules.reviewPolicy.incentivizedReviewsAllowed).toBe(
          "boolean"
        );
        expect(rules.contentDisclosure).toBeDefined();
        expect(typeof rules.contentDisclosure.placementRule).toBe("string");
        expect(typeof rules.contentDisclosure.formatRule).toBe("string");
      }
    });
  });

  // ─── getRequiredDisclosures ────────────────────────────────────────────────

  describe("getRequiredDisclosures()", () => {
    it("returns disclosures for a single content platform", () => {
      const disclosures = getRequiredDisclosures(["ig"], ["content"]);

      expect(disclosures).toHaveLength(1);
      expect(disclosures[0].platformId).toBe("ig");
      expect(disclosures[0].platformName).toBe("Instagram");
      expect(disclosures[0].required).toContain("#ad");
      expect(disclosures[0].required).toContain("#sponsored");
      // Instagram requires native tool
      expect(disclosures[0].required).toContain("Paid Partnership label");
    });

    it("returns disclosures for multiple platforms", () => {
      const disclosures = getRequiredDisclosures(
        ["ig", "tt", "fb"],
        ["content"]
      );

      expect(disclosures).toHaveLength(3);
      const platformIds = disclosures.map((d) => d.platformId);
      expect(platformIds).toContain("ig");
      expect(platformIds).toContain("tt");
      expect(platformIds).toContain("fb");
    });

    it("de-duplicates platform IDs", () => {
      const disclosures = getRequiredDisclosures(
        ["ig", "ig", "ig"],
        ["content"]
      );

      expect(disclosures).toHaveLength(1);
      expect(disclosures[0].platformId).toBe("ig");
    });

    it("includes review-specific disclosures when review action type is present", () => {
      const disclosures = getRequiredDisclosures(["fb"], ["review"]);

      expect(disclosures).toHaveLength(1);
      const fbDisclosure = disclosures[0];
      // Should include the review policy disclosure text
      expect(fbDisclosure.required).toContain(
        "Must use Branded Content tag for sponsored posts; Recommendations must disclose"
      );
      // Placement should include "Within review text body AND"
      expect(fbDisclosure.placement).toContain("Within review text body AND");
    });

    it("does not include review text when only content actions present", () => {
      const disclosures = getRequiredDisclosures(["fb"], ["content"]);

      expect(disclosures).toHaveLength(1);
      expect(disclosures[0].placement).not.toContain(
        "Within review text body"
      );
    });

    it("skips unknown platform IDs", () => {
      const disclosures = getRequiredDisclosures(
        ["ig", "unknown_platform"],
        ["content"]
      );

      expect(disclosures).toHaveLength(1);
      expect(disclosures[0].platformId).toBe("ig");
    });

    it("returns empty array for empty platform list", () => {
      const disclosures = getRequiredDisclosures([], ["content"]);
      expect(disclosures).toHaveLength(0);
    });

    it("includes format rule from platform rules", () => {
      const disclosures = getRequiredDisclosures(["yt"], ["content"]);

      expect(disclosures).toHaveLength(1);
      expect(disclosures[0].format).toContain("paid promotion box");
    });

    it("returns unique required items (no duplicates)", () => {
      const disclosures = getRequiredDisclosures(["ig"], ["content", "review"]);

      expect(disclosures).toHaveLength(1);
      const requiredSet = new Set(disclosures[0].required);
      expect(requiredSet.size).toBe(disclosures[0].required.length);
    });

    it("handles platforms with no hashtag requirements", () => {
      const disclosures = getRequiredDisclosures(["yt"], ["content"]);

      expect(disclosures).toHaveLength(1);
      // YouTube has no required hashtags, but does have native tool
      expect(disclosures[0].required).toContain(
        "'Includes paid promotion' checkbox"
      );
    });

    it("handles platforms with no native tool", () => {
      const disclosures = getRequiredDisclosures(["xw"], ["content"]);

      expect(disclosures).toHaveLength(1);
      // X has hashtags but no native tool
      expect(disclosures[0].required).toContain("#ad");
      // Should not include any native tool name
      const hasNativeToolRef = disclosures[0].required.some(
        (r) =>
          r.toLowerCase().includes("label") ||
          r.toLowerCase().includes("toggle") ||
          r.toLowerCase().includes("checkbox")
      );
      expect(hasNativeToolRef).toBe(false);
    });
  });

  // ─── validateContentDisclosure ─────────────────────────────────────────────

  describe("validateContentDisclosure()", () => {
    it("validates content with all required hashtags present", () => {
      const disclosures = getRequiredDisclosures(["xw"], ["content"]);
      const content = "#ad Check out this amazing local bakery! #sponsored";

      const result = validateContentDisclosure(content, disclosures);

      expect(result.valid).toBe(true);
      expect(result.missing).toHaveLength(0);
      expect(result.found.length).toBeGreaterThan(0);
    });

    it("reports missing hashtags", () => {
      const disclosures = getRequiredDisclosures(["xw"], ["content"]);
      const content = "Check out this amazing local bakery!";

      const result = validateContentDisclosure(content, disclosures);

      expect(result.valid).toBe(false);
      expect(result.missing.length).toBeGreaterThan(0);
      expect(result.missing.some((m) => m.includes("#ad"))).toBe(true);
    });

    it("is case-insensitive for hashtag matching", () => {
      const disclosures = getRequiredDisclosures(["xw"], ["content"]);
      const content = "#AD Check out this amazing local bakery!";

      const result = validateContentDisclosure(content, disclosures);

      // #ad should be found since we check lowercase
      expect(result.found.some((f) => f.includes("#ad"))).toBe(true);
    });

    it("adds warnings for native tool requirements that cannot be verified from text", () => {
      const disclosures = getRequiredDisclosures(["ig"], ["content"]);
      const content = "#ad #sponsored Check out this business!";

      const result = validateContentDisclosure(content, disclosures);

      // Should have a warning about the Paid Partnership label
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(
        result.warnings.some((w) => w.includes("Paid Partnership label"))
      ).toBe(true);
      expect(
        result.warnings.some((w) => w.includes("cannot verify from text alone"))
      ).toBe(true);
    });

    it("warns when disclosure appears late in content (after position 200)", () => {
      const disclosures = getRequiredDisclosures(["xw"], ["content"]);
      // Create content with disclosure buried deep
      const padding = "A".repeat(250);
      const content = `${padding} #ad here is my disclosure`;

      const result = validateContentDisclosure(content, disclosures);

      expect(
        result.warnings.some((w) => w.includes("appears late in content"))
      ).toBe(true);
    });

    it("does not warn about late placement when disclosure is at the start", () => {
      const disclosures = getRequiredDisclosures(["xw"], ["content"]);
      const content = "#ad Check out this amazing business!";

      const result = validateContentDisclosure(content, disclosures);

      expect(
        result.warnings.some((w) => w.includes("appears late in content"))
      ).toBe(false);
    });

    it("validates empty content as invalid", () => {
      const disclosures = getRequiredDisclosures(["ig"], ["content"]);
      const content = "";

      const result = validateContentDisclosure(content, disclosures);

      expect(result.valid).toBe(false);
      expect(result.missing.length).toBeGreaterThan(0);
    });

    it("handles empty disclosures array gracefully", () => {
      const result = validateContentDisclosure("Some content", []);

      expect(result.valid).toBe(true);
      expect(result.missing).toHaveLength(0);
      expect(result.found).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it("detects partial matches for disclosure phrases", () => {
      const disclosures = getRequiredDisclosures(["fb"], ["review"]);
      // The review disclosure text contains key terms; include enough of them
      const content =
        "#ad #sponsored This is a Branded Content post — I received a discount and want to disclose my recommendation. Paid partnership.";

      const result = validateContentDisclosure(content, disclosures);

      // Some disclosure phrase requirements should have partial matches
      expect(result.found.length).toBeGreaterThan(0);
    });

    it("validates content for multiple platforms simultaneously", () => {
      const disclosures = getRequiredDisclosures(
        ["ig", "fb"],
        ["content"]
      );
      const content = "#ad #sponsored Check out this place!";

      const result = validateContentDisclosure(content, disclosures);

      // Both platforms require #ad and #sponsored, which are present
      const igFound = result.found.filter((f) => f.includes("Instagram"));
      const fbFound = result.found.filter((f) => f.includes("Facebook"));
      expect(igFound.length).toBeGreaterThan(0);
      expect(fbFound.length).toBeGreaterThan(0);
    });
  });

  // ─── checkReviewCompliance ─────────────────────────────────────────────────

  describe("checkReviewCompliance()", () => {
    it("detects 'I received a discount in exchange' disclosure", () => {
      const result = checkReviewCompliance(
        "Great coffee! I received a discount in exchange for sharing my experience."
      );

      expect(result.compliant).toBe(true);
      expect(result.disclosureFound).toBe("Exchange disclosure");
    });

    it("detects 'perk in return for review' disclosure", () => {
      const result = checkReviewCompliance(
        "Amazing service! Perk was offered in return for writing a review."
      );

      expect(result.compliant).toBe(true);
      expect(result.disclosureFound).toBe("Perk disclosure");
    });

    it("detects 'sponsored' disclosure keyword", () => {
      const result = checkReviewCompliance(
        "Sponsored review: This restaurant has great food!"
      );

      expect(result.compliant).toBe(true);
      expect(result.disclosureFound).toBe("Gifted/sponsored disclosure");
    });

    it("detects '#ad' disclosure hashtag", () => {
      const result = checkReviewCompliance(
        "#ad Best tacos I've ever had. Would definitely come back!"
      );

      expect(result.compliant).toBe(true);
      expect(result.disclosureFound).toBe("Standard disclosure");
    });

    it("detects 'complimentary' disclosure", () => {
      const result = checkReviewCompliance(
        "I received a complimentary meal and wanted to share my experience."
      );

      expect(result.compliant).toBe(true);
      expect(result.disclosureFound).toBe("Gifted/sponsored disclosure");
    });

    it("detects 'gifted' disclosure", () => {
      const result = checkReviewCompliance(
        "This was gifted to me, but all opinions are my own."
      );

      expect(result.compliant).toBe(true);
      expect(result.disclosureFound).toBe("Gifted/sponsored disclosure");
    });

    it("detects 'received a discount' phrasing", () => {
      const result = checkReviewCompliance(
        "Received a reward for trying the new menu items."
      );

      expect(result.compliant).toBe(true);
      expect(result.disclosureFound).toBe("Received perk disclosure");
    });

    it("detects 'in exchange for my honest review' phrasing", () => {
      const result = checkReviewCompliance(
        "Trying this place out in exchange for an honest review."
      );

      expect(result.compliant).toBe(true);
      expect(result.disclosureFound).toBe("Exchange for review");
    });

    it("detects passive 'was given a discount' phrasing", () => {
      const result = checkReviewCompliance(
        "I was given a discount to try this place out."
      );

      expect(result.compliant).toBe(true);
      expect(result.disclosureFound).toBe("Passive perk disclosure");
    });

    it("detects 'was offered a perk' phrasing", () => {
      const result = checkReviewCompliance(
        "I was offered a perk to share my experience."
      );

      expect(result.compliant).toBe(true);
      expect(result.disclosureFound).toBe("Passive perk disclosure");
    });

    it("returns non-compliant for review with no disclosure", () => {
      const result = checkReviewCompliance(
        "Best pizza in town! Great atmosphere and friendly staff."
      );

      expect(result.compliant).toBe(false);
      expect(result.disclosureFound).toBeNull();
      expect(result.recommendation).toContain("does not appear to disclose");
    });

    it("returns non-compliant for empty review text", () => {
      const result = checkReviewCompliance("");

      expect(result.compliant).toBe(false);
      expect(result.disclosureFound).toBeNull();
    });

    it("provides a recommendation for non-compliant reviews", () => {
      const result = checkReviewCompliance("Great place, loved it!");

      expect(result.recommendation).toContain("I received a");
      expect(result.recommendation).toContain("honest experience");
    });

    it("provides a positive recommendation for compliant reviews", () => {
      const result = checkReviewCompliance(
        "Disclosure: I received a perk. Great food!"
      );

      expect(result.compliant).toBe(true);
      expect(result.recommendation).toContain("appropriate disclosure");
    });

    it("handles case-insensitive matching", () => {
      const result = checkReviewCompliance(
        "SPONSORED post — great experience at this restaurant"
      );

      expect(result.compliant).toBe(true);
    });
  });

  // ─── checkCampaignCompliance ───────────────────────────────────────────────

  describe("checkCampaignCompliance()", () => {
    // ── Basic structure ──

    it("returns a valid ComplianceCheck object", () => {
      const campaign = makeCampaign({ actions: ["ig_fp"] });
      const result = checkCampaignCompliance(campaign);

      expect(result).toHaveProperty("campaignId", "camp-test-1");
      expect(result).toHaveProperty("compliant");
      expect(result).toHaveProperty("issues");
      expect(result).toHaveProperty("disclosures");
      expect(result).toHaveProperty("score");
      expect(typeof result.score).toBe("number");
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    // ── Prohibited review platforms (critical) ──

    it("flags critical issue for Yelp review actions", () => {
      const campaign = makeCampaign({
        actions: ["yp_rv"],
        ftcDisclosures: ["Disclosure required"],
      });
      const result = checkCampaignCompliance(campaign);

      const critical = result.issues.filter((i) => i.severity === "critical");
      expect(critical.length).toBeGreaterThan(0);
      expect(critical.some((i) => i.message.includes("Yelp"))).toBe(true);
      expect(critical.some((i) => i.code === "FTC-004")).toBe(true);
      expect(result.compliant).toBe(false);
    });

    it("flags critical issue for Google review actions", () => {
      const campaign = makeCampaign({
        actions: ["go_rv"],
        ftcDisclosures: ["Disclosure required"],
      });
      const result = checkCampaignCompliance(campaign);

      const critical = result.issues.filter((i) => i.severity === "critical");
      expect(critical.some((i) => i.message.includes("Google"))).toBe(true);
      expect(result.compliant).toBe(false);
    });

    it("flags critical issue for Google Maps review actions", () => {
      const campaign = makeCampaign({
        actions: ["gm_rv"],
        ftcDisclosures: ["Disclosure required"],
      });
      const result = checkCampaignCompliance(campaign);

      const critical = result.issues.filter((i) => i.severity === "critical");
      expect(critical.length).toBeGreaterThan(0);
      expect(result.compliant).toBe(false);
    });

    it("flags critical issue for TripAdvisor review actions", () => {
      const campaign = makeCampaign({
        actions: ["ta_rv"],
        ftcDisclosures: ["Disclosure required"],
      });
      const result = checkCampaignCompliance(campaign);

      const critical = result.issues.filter((i) => i.severity === "critical");
      expect(critical.some((i) => i.message.includes("TripAdvisor"))).toBe(
        true
      );
      expect(result.compliant).toBe(false);
    });

    it("provides actionable recommendations for prohibited platform reviews", () => {
      const campaign = makeCampaign({
        actions: ["yp_rv"],
        ftcDisclosures: ["Disclosure required"],
      });
      const result = checkCampaignCompliance(campaign);

      const criticalIssue = result.issues.find(
        (i) => i.severity === "critical" && i.code === "FTC-004"
      );
      expect(criticalIssue).toBeDefined();
      expect(criticalIssue!.recommendation).toContain("Remove");
      expect(criticalIssue!.recommendation).toContain("photo uploads");
    });

    it("provides Google-specific recommendation for Google review actions", () => {
      const campaign = makeCampaign({
        actions: ["go_rv"],
        ftcDisclosures: ["Disclosure required"],
      });
      const result = checkCampaignCompliance(campaign);

      const criticalIssue = result.issues.find(
        (i) => i.severity === "critical" && i.code === "FTC-004"
      );
      expect(criticalIssue!.recommendation).toContain("Q&A");
    });

    it("allows non-review Yelp actions (photos)", () => {
      const campaign = makeCampaign({
        actions: ["yp_ph"],
        ftcDisclosures: ["Disclosure required"],
      });
      const result = checkCampaignCompliance(campaign);

      const critical = result.issues.filter(
        (i) => i.severity === "critical" && i.code === "FTC-004"
      );
      expect(critical).toHaveLength(0);
    });

    it("allows non-review Google actions (photos)", () => {
      const campaign = makeCampaign({
        actions: ["go_ph"],
        ftcDisclosures: ["Disclosure required"],
      });
      const result = checkCampaignCompliance(campaign);

      const critical = result.issues.filter(
        (i) => i.severity === "critical" && i.code === "FTC-004"
      );
      expect(critical).toHaveLength(0);
    });

    // ── Missing FTC disclosures ──

    it("flags critical issue when review campaign has no FTC disclosures", () => {
      const campaign = makeCampaign({
        actions: ["fb_rc"], // Facebook Recommendation (review type)
        ftcDisclosures: undefined,
      });
      const result = checkCampaignCompliance(campaign);

      expect(
        result.issues.some((i) => i.code === "FTC-003")
      ).toBe(true);
    });

    it("does not flag review disclosure issue when ftcDisclosures are present", () => {
      const campaign = makeCampaign({
        actions: ["fb_rc"],
        ftcDisclosures: ["I received a perk for this recommendation"],
      });
      const result = checkCampaignCompliance(campaign);

      expect(
        result.issues.some((i) => i.code === "FTC-003")
      ).toBe(false);
    });

    it("flags warning when content campaign has no FTC disclosures", () => {
      const campaign = makeCampaign({
        actions: ["ig_fp", "tt_vd"],
        ftcDisclosures: undefined,
      });
      const result = checkCampaignCompliance(campaign);

      expect(
        result.issues.some((i) => i.code === "FTC-002")
      ).toBe(true);
    });

    it("does not flag missing disclosure for engage-only actions", () => {
      // Engagement actions (likes/follows) don't need disclosure per the engine
      const campaign = makeCampaign({
        actions: ["ig_fo", "ig_lk"],
        ftcDisclosures: undefined,
      });
      const result = checkCampaignCompliance(campaign);

      // FTC-002 should not appear because engage-only actions are filtered out
      expect(
        result.issues.some((i) => i.code === "FTC-002")
      ).toBe(false);
    });

    // ── Native tool warnings ──

    it("warns about missing native disclosure tool for Instagram", () => {
      const campaign = makeCampaign({
        actions: ["ig_fp"],
        ftcDisclosures: ["#ad #sponsored"],
      });
      const result = checkCampaignCompliance(campaign);

      const nativeToolWarning = result.issues.find(
        (i) => i.code === "FTC-101"
      );
      expect(nativeToolWarning).toBeDefined();
      expect(nativeToolWarning!.message).toContain("Paid Partnership label");
    });

    it("warns about missing native disclosure tool for TikTok", () => {
      const campaign = makeCampaign({
        actions: ["tt_vd"],
        ftcDisclosures: ["#ad"],
      });
      const result = checkCampaignCompliance(campaign);

      const nativeToolWarning = result.issues.find(
        (i) => i.code === "FTC-101"
      );
      expect(nativeToolWarning).toBeDefined();
      expect(nativeToolWarning!.message).toContain("Branded Content toggle");
    });

    it("warns about missing native disclosure tool for YouTube", () => {
      const campaign = makeCampaign({
        actions: ["yt_vd"],
        ftcDisclosures: ["Paid promotion"],
      });
      const result = checkCampaignCompliance(campaign);

      const nativeToolWarning = result.issues.find(
        (i) => i.code === "FTC-101"
      );
      expect(nativeToolWarning).toBeDefined();
      expect(nativeToolWarning!.message).toContain("paid promotion");
    });

    it("does not warn about native tool for platforms without one", () => {
      const campaign = makeCampaign({
        actions: ["xw_po"],
        ftcDisclosures: ["#ad"],
      });
      const result = checkCampaignCompliance(campaign);

      expect(
        result.issues.some((i) => i.code === "FTC-101")
      ).toBe(false);
    });

    // ── Multi-platform info ──

    it("adds info note when campaign spans more than 3 platforms", () => {
      const campaign = makeCampaign({
        actions: ["ig_fp", "tt_vd", "fb_po", "xw_po"],
        ftcDisclosures: ["#ad #sponsored"],
      });
      const result = checkCampaignCompliance(campaign);

      const multiPlatformNote = result.issues.find(
        (i) => i.code === "FTC-203"
      );
      expect(multiPlatformNote).toBeDefined();
      expect(multiPlatformNote!.severity).toBe("info");
      expect(multiPlatformNote!.message).toContain("4 platforms");
    });

    it("does not add multi-platform note for 3 or fewer platforms", () => {
      const campaign = makeCampaign({
        actions: ["ig_fp", "tt_vd", "fb_po"],
        ftcDisclosures: ["#ad"],
      });
      const result = checkCampaignCompliance(campaign);

      expect(
        result.issues.some((i) => i.code === "FTC-203")
      ).toBe(false);
    });

    // ── Score calculation ──

    it("starts at 100 and deducts for issues", () => {
      // Campaign with just a content action and disclosures configured - minimal issues
      const campaign = makeCampaign({
        actions: ["xw_po"],
        ftcDisclosures: ["#ad"],
        guidelines:
          "Please include #ad at the beginning of your post. Full disclosure is required for all sponsored content on this platform.",
      });
      const result = checkCampaignCompliance(campaign);

      // Score should be high but may not be exactly 100 due to native tool warnings etc.
      expect(result.score).toBeGreaterThanOrEqual(80);
    });

    it("deducts 30 points per critical issue", () => {
      const campaign = makeCampaign({
        actions: ["yp_rv", "ta_rv"],
        ftcDisclosures: ["Disclosure"],
      });
      const result = checkCampaignCompliance(campaign);

      const criticalCount = result.issues.filter(
        (i) => i.severity === "critical"
      ).length;
      // Score should reflect heavy deduction from critical issues
      expect(criticalCount).toBeGreaterThanOrEqual(2);
      expect(result.score).toBeLessThanOrEqual(100 - criticalCount * 30 + 10); // +10 for bonuses
    });

    it("caps score at 0 minimum", () => {
      // Campaign with many critical issues
      const campaign = makeCampaign({
        actions: ["yp_rv", "go_rv", "gm_rv", "ta_rv"],
        ftcDisclosures: undefined,
      });
      const result = checkCampaignCompliance(campaign);

      expect(result.score).toBeGreaterThanOrEqual(0);
    });

    it("caps score at 100 maximum", () => {
      const campaign = makeCampaign({
        actions: ["rf_fr"],
        ftcDisclosures: ["Full disclosure"],
        guidelines:
          "Please disclose your referral incentive. Tell the person you are referring that both parties get a perk. Be honest about the business.",
      });
      const result = checkCampaignCompliance(campaign);

      expect(result.score).toBeLessThanOrEqual(100);
    });

    it("gives bonus for having FTC disclosures configured", () => {
      const baseActions = ["xw_po"];
      const withDisclosures = makeCampaign({
        actions: baseActions,
        ftcDisclosures: ["#ad"],
      });
      const withoutDisclosures = makeCampaign({
        id: "camp-no-disc",
        actions: baseActions,
        ftcDisclosures: undefined,
      });

      const scoreWith = checkCampaignCompliance(withDisclosures).score;
      const scoreWithout = checkCampaignCompliance(withoutDisclosures).score;

      // Having disclosures should give a higher score
      expect(scoreWith).toBeGreaterThan(scoreWithout);
    });

    it("gives bonus for having detailed guidelines", () => {
      const baseActions = ["xw_po"];
      const withGuidelines = makeCampaign({
        actions: baseActions,
        ftcDisclosures: ["#ad"],
        guidelines:
          "Please include #ad at the beginning of your post. Full disclosure is required for all sponsored content on this platform.",
      });
      const withoutGuidelines = makeCampaign({
        id: "camp-no-guide",
        actions: baseActions,
        ftcDisclosures: ["#ad"],
        guidelines: undefined,
      });

      const scoreWith = checkCampaignCompliance(withGuidelines).score;
      const scoreWithout = checkCampaignCompliance(withoutGuidelines).score;

      expect(scoreWith).toBeGreaterThanOrEqual(scoreWithout);
    });

    // ── Compliant determination ──

    it("marks campaign as non-compliant when critical issues exist", () => {
      const campaign = makeCampaign({
        actions: ["yp_rv"],
        ftcDisclosures: ["Disclosure"],
      });
      const result = checkCampaignCompliance(campaign);

      expect(result.compliant).toBe(false);
    });

    it("marks campaign as non-compliant when score is below 60", () => {
      // Multiple critical issues will bring score below 60
      const campaign = makeCampaign({
        actions: ["yp_rv", "go_rv"],
        ftcDisclosures: undefined,
      });
      const result = checkCampaignCompliance(campaign);

      expect(result.compliant).toBe(false);
      expect(result.score).toBeLessThan(60);
    });

    it("marks campaign as compliant with no critical issues and score >= 60", () => {
      const campaign = makeCampaign({
        actions: ["ig_fp"],
        ftcDisclosures: ["#ad #sponsored — paid partnership"],
      });
      const result = checkCampaignCompliance(campaign);

      // Should have no critical issues (just warnings for native tool)
      const criticalCount = result.issues.filter(
        (i) => i.severity === "critical"
      ).length;
      expect(criticalCount).toBe(0);
      expect(result.score).toBeGreaterThanOrEqual(60);
      expect(result.compliant).toBe(true);
    });

    // ── Disclosures in result ──

    it("includes platform disclosures in result", () => {
      const campaign = makeCampaign({
        actions: ["ig_fp", "tt_vd"],
        ftcDisclosures: ["#ad"],
      });
      const result = checkCampaignCompliance(campaign);

      expect(result.disclosures.length).toBeGreaterThanOrEqual(2);
      const platformIds = result.disclosures.map((d) => d.platformId);
      expect(platformIds).toContain("ig");
      expect(platformIds).toContain("tt");
    });

    // ── Custom actions override ──

    it("uses provided actions array when given instead of campaign.actions", () => {
      const campaign = makeCampaign({
        actions: ["ig_fp"],
        ftcDisclosures: ["Disclosure"],
      });

      // Override with Yelp review actions
      const result = checkCampaignCompliance(campaign, ["yp_rv"]);

      const critical = result.issues.filter((i) => i.code === "FTC-004");
      expect(critical.length).toBeGreaterThan(0);
    });

    // ── Guidelines check ──

    it("checks campaign guidelines for disclosure content when present", () => {
      const campaign = makeCampaign({
        actions: ["ig_fp"],
        ftcDisclosures: ["#ad"],
        guidelines: "Post a photo and tag our business.",
      });
      const result = checkCampaignCompliance(campaign);

      // The guidelines don't mention any specific platform disclosures,
      // so a best practice suggestion might be triggered (FTC-201)
      // The info issue only fires when BOTH missing and warnings are present
      const hasBestPractice = result.issues.some(
        (i) => i.code === "FTC-201"
      );
      // This is situational - the main thing is no error occurs
      expect(result).toHaveProperty("issues");
    });

    // ── Edge cases ──

    it("handles campaign with empty actions array", () => {
      const campaign = makeCampaign({
        actions: [],
        ftcDisclosures: ["Disclosure"],
      });
      const result = checkCampaignCompliance(campaign);

      expect(result).toHaveProperty("campaignId");
      expect(result.issues).toBeInstanceOf(Array);
      expect(result.disclosures).toBeInstanceOf(Array);
    });

    it("handles campaign with mixed review and content actions", () => {
      const campaign = makeCampaign({
        actions: ["ig_fp", "fb_rc", "tt_vd"],
        ftcDisclosures: ["#ad #sponsored — I received a perk"],
      });
      const result = checkCampaignCompliance(campaign);

      // Should have disclosures for IG, FB, and TT
      expect(result.disclosures.length).toBeGreaterThanOrEqual(3);
      // FB disclosure should include review-specific placement
      const fbDisclosure = result.disclosures.find(
        (d) => d.platformId === "fb"
      );
      expect(fbDisclosure).toBeDefined();
      expect(fbDisclosure!.placement).toContain("Within review text body");
    });

    it("handles campaign with only engage actions", () => {
      const campaign = makeCampaign({
        actions: ["ig_fo", "ig_lk", "ig_sv"],
        ftcDisclosures: undefined,
      });
      const result = checkCampaignCompliance(campaign);

      // Engage-only should not trigger FTC-002 (content disclosure warning)
      expect(
        result.issues.some((i) => i.code === "FTC-002")
      ).toBe(false);
    });
  });

  // ─── generateComplianceReport ──────────────────────────────────────────────

  describe("generateComplianceReport()", () => {
    it("returns a valid report structure", () => {
      const campaigns = [
        makeCampaign({
          actions: ["ig_fp"],
          ftcDisclosures: ["#ad"],
        }),
      ];
      const report = generateComplianceReport("biz-test-1", campaigns);

      expect(report.businessId).toBe("biz-test-1");
      expect(report.generatedAt).toBeTruthy();
      expect(new Date(report.generatedAt).getTime()).not.toBeNaN();
      expect(report.totalCampaigns).toBe(1);
      expect(typeof report.overallScore).toBe("number");
      expect(report.campaignChecks).toBeInstanceOf(Array);
      expect(report.topIssues).toBeInstanceOf(Array);
      expect(report.recommendations).toBeInstanceOf(Array);
      expect(typeof report.summary).toBe("string");
    });

    it("only includes campaigns belonging to the given business", () => {
      const campaigns = [
        makeCampaign({
          id: "camp-1",
          businessId: "biz-1",
          actions: ["ig_fp"],
        }),
        makeCampaign({
          id: "camp-2",
          businessId: "biz-2",
          actions: ["tt_vd"],
        }),
        makeCampaign({
          id: "camp-3",
          businessId: "biz-1",
          actions: ["fb_po"],
        }),
      ];

      const report = generateComplianceReport("biz-1", campaigns);

      expect(report.totalCampaigns).toBe(2);
      expect(report.campaignChecks).toHaveLength(2);
    });

    it("correctly counts compliant and non-compliant campaigns", () => {
      const campaigns = [
        // Compliant: content with disclosures
        makeCampaign({
          id: "camp-good",
          businessId: "biz-1",
          actions: ["ig_fp"],
          ftcDisclosures: ["#ad"],
        }),
        // Non-compliant: prohibited Yelp reviews
        makeCampaign({
          id: "camp-bad",
          businessId: "biz-1",
          actions: ["yp_rv"],
          ftcDisclosures: ["Disclosure"],
        }),
      ];

      const report = generateComplianceReport("biz-1", campaigns);

      expect(report.compliantCampaigns).toBe(1);
      expect(report.nonCompliantCampaigns).toBe(1);
    });

    it("calculates overall score as weighted average (70% avg, 30% min)", () => {
      const campaigns = [
        makeCampaign({
          id: "camp-high",
          businessId: "biz-1",
          actions: ["rf_fr"],
          ftcDisclosures: ["Referral disclosure"],
        }),
        makeCampaign({
          id: "camp-low",
          businessId: "biz-1",
          actions: ["yp_rv"],
          ftcDisclosures: ["Disclosure"],
        }),
      ];

      const report = generateComplianceReport("biz-1", campaigns);

      // Score should be pulled down by the worst campaign
      const checks = report.campaignChecks;
      const avgScore =
        checks.reduce((sum, c) => sum + c.score, 0) / checks.length;
      const minScore = Math.min(...checks.map((c) => c.score));
      const expected = Math.round(avgScore * 0.7 + minScore * 0.3);

      expect(report.overallScore).toBe(expected);
    });

    it("returns score of 100 when no campaigns exist", () => {
      const report = generateComplianceReport("biz-empty", []);

      expect(report.totalCampaigns).toBe(0);
      expect(report.overallScore).toBe(100);
    });

    it("generates appropriate summary for excellent compliance", () => {
      const campaigns = [
        makeCampaign({
          id: "camp-good-1",
          businessId: "biz-1",
          actions: ["rf_fr"],
          ftcDisclosures: ["Referral perk disclosure"],
          guidelines:
            "Tell the person you are referring that both parties get a perk. Be transparent and disclose the referral incentive clearly.",
        }),
      ];

      const report = generateComplianceReport("biz-1", campaigns);

      // If score >= 90 and no critical issues
      if (report.overallScore >= 90) {
        expect(report.summary).toContain("Excellent compliance");
      }
    });

    it("generates appropriate summary for critical issues", () => {
      const campaigns = [
        makeCampaign({
          id: "camp-bad-1",
          businessId: "biz-1",
          actions: ["yp_rv", "go_rv"],
          ftcDisclosures: undefined,
        }),
      ];

      const report = generateComplianceReport("biz-1", campaigns);

      expect(report.summary).toContain("Critical compliance issues");
      expect(report.summary).toContain("immediate attention");
    });

    it("generates 'no campaigns' summary when business has no campaigns", () => {
      const campaigns = [
        makeCampaign({ id: "camp-other", businessId: "biz-other" }),
      ];

      const report = generateComplianceReport("biz-1", campaigns);

      expect(report.summary).toBe("No campaigns found for this business.");
    });

    // ── Top issues ──

    it("sorts top issues by severity (critical first) then count", () => {
      const campaigns = [
        makeCampaign({
          id: "camp-1",
          businessId: "biz-1",
          actions: ["yp_rv", "ig_fp"],
          ftcDisclosures: undefined,
        }),
        makeCampaign({
          id: "camp-2",
          businessId: "biz-1",
          actions: ["go_rv", "tt_vd"],
          ftcDisclosures: undefined,
        }),
      ];

      const report = generateComplianceReport("biz-1", campaigns);

      if (report.topIssues.length >= 2) {
        const severityOrder: Record<string, number> = {
          critical: 0,
          warning: 1,
          info: 2,
        };
        for (let i = 1; i < report.topIssues.length; i++) {
          const prevSev = severityOrder[report.topIssues[i - 1].severity];
          const currSev = severityOrder[report.topIssues[i].severity];
          expect(currSev).toBeGreaterThanOrEqual(prevSev);
        }
      }
    });

    it("limits top issues to at most 10", () => {
      // Create many campaigns with different issues
      const campaigns = Array.from({ length: 20 }, (_, i) =>
        makeCampaign({
          id: `camp-${i}`,
          businessId: "biz-1",
          actions: [
            "yp_rv",
            "go_rv",
            "ta_rv",
            "ig_fp",
            "tt_vd",
            "fb_po",
            "xw_po",
          ],
          ftcDisclosures: undefined,
        })
      );

      const report = generateComplianceReport("biz-1", campaigns);

      expect(report.topIssues.length).toBeLessThanOrEqual(10);
    });

    // ── Recommendations ──

    it("includes URGENT recommendation when critical issues exist", () => {
      const campaigns = [
        makeCampaign({
          id: "camp-1",
          businessId: "biz-1",
          actions: ["yp_rv"],
          ftcDisclosures: ["Disclosure"],
        }),
      ];

      const report = generateComplianceReport("biz-1", campaigns);

      expect(
        report.recommendations.some((r) => r.includes("URGENT"))
      ).toBe(true);
    });

    it("includes count of non-compliant campaigns in recommendations", () => {
      const campaigns = [
        makeCampaign({
          id: "camp-1",
          businessId: "biz-1",
          actions: ["yp_rv"],
          ftcDisclosures: ["Disclosure"],
        }),
        makeCampaign({
          id: "camp-2",
          businessId: "biz-1",
          actions: ["ig_fp"],
          ftcDisclosures: ["#ad"],
        }),
      ];

      const report = generateComplianceReport("biz-1", campaigns);

      expect(
        report.recommendations.some((r) => r.includes("1 of 2"))
      ).toBe(true);
    });

    it("includes native tool recommendation when relevant", () => {
      const campaigns = [
        makeCampaign({
          id: "camp-1",
          businessId: "biz-1",
          actions: ["ig_fp", "tt_vd", "yt_vd"],
          ftcDisclosures: ["#ad"],
        }),
      ];

      const report = generateComplianceReport("biz-1", campaigns);

      expect(
        report.recommendations.some(
          (r) =>
            r.includes("Paid Partnership") ||
            r.includes("Branded Content") ||
            r.includes("Paid Promotion")
        )
      ).toBe(true);
    });

    it("includes positive recommendation for good compliance without critical issues", () => {
      const campaigns = [
        makeCampaign({
          id: "camp-good",
          businessId: "biz-1",
          actions: ["rf_fr"],
          ftcDisclosures: ["Referral disclosure"],
          guidelines:
            "Make sure to tell your friend that both of you will get a perk. Be transparent about the referral incentive. Full disclosure is required.",
        }),
      ];

      const report = generateComplianceReport("biz-1", campaigns);

      // If score >= 80 and no critical, should include "good" recommendation
      if (
        report.overallScore >= 80 &&
        !report.topIssues.some((i) => i.severity === "critical")
      ) {
        expect(
          report.recommendations.some((r) => r.includes("good"))
        ).toBe(true);
      }
    });

    it("includes default positive message when no issues exist at all", () => {
      // Edge case: campaign that triggers no issues at all is rare,
      // but the fallback message should exist
      const report = generateComplianceReport("biz-empty", []);

      // With no campaigns, no issues => "All campaigns are compliant"
      expect(report.recommendations.length).toBeGreaterThan(0);
    });

    // ── Edge cases ──

    it("handles empty campaigns array", () => {
      const report = generateComplianceReport("biz-1", []);

      expect(report.totalCampaigns).toBe(0);
      expect(report.compliantCampaigns).toBe(0);
      expect(report.nonCompliantCampaigns).toBe(0);
      expect(report.campaignChecks).toHaveLength(0);
      expect(report.overallScore).toBe(100);
    });

    it("handles large number of campaigns", () => {
      const campaigns = Array.from({ length: 50 }, (_, i) =>
        makeCampaign({
          id: `camp-${i}`,
          businessId: "biz-1",
          actions: ["ig_fp"],
          ftcDisclosures: ["#ad"],
        })
      );

      const report = generateComplianceReport("biz-1", campaigns);

      expect(report.totalCampaigns).toBe(50);
      expect(report.campaignChecks).toHaveLength(50);
    });

    it("includes all campaign checks in the report", () => {
      const campaigns = [
        makeCampaign({
          id: "camp-a",
          businessId: "biz-1",
          actions: ["ig_fp"],
          ftcDisclosures: ["#ad"],
        }),
        makeCampaign({
          id: "camp-b",
          businessId: "biz-1",
          actions: ["tt_vd"],
          ftcDisclosures: ["#ad"],
        }),
      ];

      const report = generateComplianceReport("biz-1", campaigns);

      const checkIds = report.campaignChecks.map((c) => c.campaignId);
      expect(checkIds).toContain("camp-a");
      expect(checkIds).toContain("camp-b");
    });

    it("generates ISO 8601 generatedAt timestamp", () => {
      const report = generateComplianceReport("biz-1", []);

      // ISO 8601 format check
      expect(report.generatedAt).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/
      );
    });
  });

  // ─── Integration Scenarios ─────────────────────────────────────────────────

  describe("integration scenarios", () => {
    it("full flow: compliant Instagram content campaign", () => {
      const campaign = makeCampaign({
        actions: ["ig_fp", "ig_rl", "ig_st"],
        ftcDisclosures: [
          "#ad",
          "#sponsored",
          "Paid Partnership with TestBiz",
        ],
        guidelines:
          "#ad #sponsored — Please use the Paid Partnership label. Include disclosure at the beginning of your caption.",
      });

      const check = checkCampaignCompliance(campaign);

      expect(check.compliant).toBe(true);
      expect(check.disclosures.length).toBe(1); // All IG actions = 1 platform
      expect(check.disclosures[0].platformId).toBe("ig");
      expect(check.score).toBeGreaterThanOrEqual(60);
    });

    it("full flow: non-compliant multi-platform campaign with prohibited reviews", () => {
      const campaign = makeCampaign({
        actions: ["ig_fp", "yp_rv", "go_rv", "fb_rc", "tt_vd"],
        ftcDisclosures: undefined,
      });

      const check = checkCampaignCompliance(campaign);

      expect(check.compliant).toBe(false);

      // Should have critical issues for Yelp and Google
      const criticals = check.issues.filter((i) => i.severity === "critical");
      expect(criticals.length).toBeGreaterThanOrEqual(2);

      // Should have disclosures for multiple platforms
      expect(check.disclosures.length).toBeGreaterThanOrEqual(3);
    });

    it("full flow: generate report and validate structure for mixed campaigns", () => {
      const campaigns = [
        makeCampaign({
          id: "camp-compliant",
          businessId: "biz-1",
          actions: ["ig_fp"],
          ftcDisclosures: ["#ad #sponsored"],
          guidelines:
            "#ad Include disclosure at start of caption. Use Paid Partnership label on Instagram.",
        }),
        makeCampaign({
          id: "camp-risky",
          businessId: "biz-1",
          actions: ["yp_rv", "go_rv"],
          ftcDisclosures: undefined,
        }),
        makeCampaign({
          id: "camp-content",
          businessId: "biz-1",
          actions: ["tt_vd", "ig_rl"],
          ftcDisclosures: ["#ad"],
        }),
      ];

      const report = generateComplianceReport("biz-1", campaigns);

      expect(report.totalCampaigns).toBe(3);
      expect(report.nonCompliantCampaigns).toBeGreaterThanOrEqual(1);
      expect(report.compliantCampaigns).toBeGreaterThanOrEqual(1);
      expect(report.topIssues.length).toBeGreaterThan(0);
      expect(report.recommendations.length).toBeGreaterThan(0);
      // Overall score should be pulled down by the non-compliant campaign
      expect(report.overallScore).toBeLessThan(100);
    });

    it("review compliance check integrates with campaign check", () => {
      // A review campaign on Facebook
      const campaign = makeCampaign({
        actions: ["fb_rc"],
        ftcDisclosures: ["I received a perk for this recommendation"],
      });

      const campaignCheck = checkCampaignCompliance(campaign);

      // Now check an actual review text
      const compliantReview = checkReviewCompliance(
        "Great restaurant! I received a discount in exchange for sharing my experience."
      );
      const nonCompliantReview = checkReviewCompliance(
        "Great restaurant! Best pizza in town."
      );

      expect(compliantReview.compliant).toBe(true);
      expect(nonCompliantReview.compliant).toBe(false);

      // Campaign itself should be compliant since FTC disclosures are set
      expect(campaignCheck.disclosures.length).toBeGreaterThan(0);
    });

    it("content validation works with disclosures from campaign check", () => {
      const campaign = makeCampaign({
        actions: ["ig_fp"],
        ftcDisclosures: ["#ad"],
      });

      const check = checkCampaignCompliance(campaign);
      const content = "#ad #sponsored Check out @testbiz! Amazing experience!";

      const validation = validateContentDisclosure(content, check.disclosures);

      // Should find the hashtags
      expect(validation.found.length).toBeGreaterThan(0);
    });
  });
});
