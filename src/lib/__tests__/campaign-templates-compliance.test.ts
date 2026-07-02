import { describe, it, expect } from "vitest";
import { CAMPAIGN_TEMPLATES, getAllCompliantTemplates } from "../campaign-templates";
import { isActionIncentivizable } from "../legal-compliance";

/**
 * Regression lock for the FTC compliance kill-switch.
 *
 * The template library intentionally still contains incentivized-review
 * campaigns (Google/Yelp/TripAdvisor reviews) as data, but NONE of them may
 * ever reach a consumer surface — the public /api/v1/templates route and the
 * in-portal picker both source from getAllCompliantTemplates() /
 * getTemplatesByIndustry(), which filter on action.incentivizable. If someone
 * adds a review template to a "popular"/"all" path, or removes the filter,
 * these tests fail before a single business can launch a campaign that the
 * launch route would 422 anyway — closing the dead-path + compliance-claim
 * contradiction at the layer that actually surfaces templates.
 */
describe("campaign-template compliance kill-switch", () => {
  it("the raw library DOES contain prohibited (non-incentivizable) templates — so the filter has real work to do", () => {
    const prohibited = CAMPAIGN_TEMPLATES.filter(
      (t) => !isActionIncentivizable(t.actionId),
    );
    expect(prohibited.length).toBeGreaterThan(0);
  });

  it("never surfaces a template whose action is non-incentivizable", () => {
    const surfaced = getAllCompliantTemplates();
    const leaked = surfaced.filter((t) => !isActionIncentivizable(t.actionId));
    expect(leaked).toEqual([]);
  });
});
