import { describe, it, expect, beforeEach, vi } from "vitest";
import { generateDigestHtml, buildDigestData, type DigestData } from "../digest";

// =============================================================================
// Mock dependencies
// =============================================================================

// Mock campaign-state-machine
vi.mock("@/lib/campaign-state-machine", () => {
  const campaigns = new Map<string, { id: string; businessId: string; state: string }>();

  return {
    campaignManager: {
      listByBusiness: (businessId: string) => {
        const results: Array<{ id: string; businessId: string; state: string }> = [];
        for (const c of campaigns.values()) {
          if (c.businessId === businessId) results.push(c);
        }
        return results;
      },
      listByState: (state: string) => {
        const results: Array<{ id: string; businessId: string; state: string }> = [];
        for (const c of campaigns.values()) {
          if (c.state === state) results.push(c);
        }
        return results;
      },
      _campaigns: campaigns,
    },
  };
});

// Mock submissions
const mockSubmissions = new Map<string, Array<{
  id: string;
  campaignId: string;
  userId: string;
  status: string;
  submittedAt: string;
}>>();

vi.mock("@/lib/submissions", () => ({
  getSubmissionsForCampaign: (campaignId: string) => {
    const subs = mockSubmissions.get(campaignId) ?? [];
    return { submissions: subs, total: subs.length, page: 1, perPage: 50000, totalPages: 1 };
  },
}));

// Mock event store
const mockEvents: Array<{
  type: string;
  entityId: string;
  data: Record<string, unknown>;
}> = [];

vi.mock("@/lib/events", () => ({
  eventStore: {
    query: (filters: { type?: string; entityId?: string }) =>
      mockEvents.filter(
        (e) =>
          (!filters.type || e.type === filters.type) &&
          (!filters.entityId || e.entityId === filters.entityId)
      ),
  },
}));

// =============================================================================
// Helpers
// =============================================================================

function makeDigestData(overrides: Partial<DigestData> = {}): DigestData {
  return {
    businessId: "biz_001",
    businessName: "Test Coffee Shop",
    email: "test@example.com",
    period: { start: "2026-03-29", end: "2026-04-05" },
    submissions: { total: 15, approved: 10, rejected: 3, pending: 2 },
    completions: 10,
    marketingValue: 125,
    topCampaign: { name: "IG Story Campaign", completions: 7 },
    activeCampaigns: 3,
    weekOverWeekChange: 25,
    ...overrides,
  };
}

// =============================================================================
// generateDigestHtml
// =============================================================================

describe("generateDigestHtml", () => {
  describe("subject line", () => {
    it("generates correct subject with metrics", () => {
      const data = makeDigestData({ completions: 10, marketingValue: 125 });
      const { subject } = generateDigestHtml(data);
      expect(subject).toContain("10 completions");
      expect(subject).toContain("$125");
    });

    it("uses singular 'completion' for 1 completion", () => {
      const data = makeDigestData({ completions: 1, marketingValue: 12.5 });
      const { subject } = generateDigestHtml(data);
      expect(subject).toContain("1 completion,");
      expect(subject).not.toContain("1 completions");
    });

    it("handles zero completions gracefully", () => {
      const data = makeDigestData({
        completions: 0,
        marketingValue: 0,
        activeCampaigns: 0,
      });
      const { subject } = generateDigestHtml(data);
      expect(subject).toContain("campaigns are waiting");
    });

    it("shows metrics subject when completions > 0 even with 0 active campaigns", () => {
      const data = makeDigestData({
        completions: 5,
        marketingValue: 62.5,
        activeCampaigns: 0,
      });
      const { subject } = generateDigestHtml(data);
      expect(subject).toContain("5 completions");
    });
  });

  describe("HTML structure", () => {
    it("has proper HTML document structure", () => {
      const data = makeDigestData();
      const { html } = generateDigestHtml(data);
      expect(html).toContain("<!DOCTYPE html>");
      expect(html).toContain("<html");
      expect(html).toContain("<body");
      expect(html).toContain("style=");
    });

    it("matches the dark theme styling", () => {
      const data = makeDigestData();
      const { html } = generateDigestHtml(data);
      expect(html).toContain("#0C0F1A"); // Background
      expect(html).toContain("#1A1F36"); // Card background
      expect(html).toContain("#22D3EE"); // Primary/cyan
      expect(html).toContain("DM Sans"); // Body font
    });

    it("contains the business name", () => {
      const data = makeDigestData({ businessName: "Sunrise Yoga" });
      const { html } = generateDigestHtml(data);
      expect(html).toContain("Sunrise Yoga");
    });

    it("contains period dates", () => {
      const data = makeDigestData({
        period: { start: "2026-03-29", end: "2026-04-05" },
      });
      const { html } = generateDigestHtml(data);
      expect(html).toContain("2026-03-29");
      expect(html).toContain("2026-04-05");
    });

    it("contains all key metrics", () => {
      const data = makeDigestData({
        completions: 10,
        marketingValue: 125,
        submissions: { total: 15, approved: 10, rejected: 3, pending: 2 },
        activeCampaigns: 3,
      });
      const { html } = generateDigestHtml(data);
      expect(html).toContain("10"); // completions
      expect(html).toContain("$125"); // marketing value
      expect(html).toContain("15"); // total submissions
      expect(html).toContain("3"); // active campaigns or rejected
    });

    it("highlights top-performing campaign", () => {
      const data = makeDigestData({
        topCampaign: { name: "Summer Reel Contest", completions: 12 },
      });
      const { html } = generateDigestHtml(data);
      expect(html).toContain("Summer Reel Contest");
      expect(html).toContain("Top Campaign");
      expect(html).toContain("12");
    });

    it("omits top campaign section when null", () => {
      const data = makeDigestData({ topCampaign: null });
      const { html } = generateDigestHtml(data);
      expect(html).not.toContain("Top Campaign");
    });

    it("contains View Full Analytics CTA when metrics exist", () => {
      const data = makeDigestData();
      const { html } = generateDigestHtml(data);
      expect(html).toContain("View Full Analytics");
      expect(html).toContain("socialperks.app/dashboard");
    });

    it("contains Create Campaign CTA when zero state", () => {
      const data = makeDigestData({
        completions: 0,
        marketingValue: 0,
        activeCampaigns: 0,
      });
      const { html } = generateDigestHtml(data);
      expect(html).toContain("Create Your First Campaign");
      expect(html).toContain("campaigns/new");
    });

    it("escapes HTML in business name for XSS prevention", () => {
      const data = makeDigestData({
        businessName: '<script>alert("xss")</script>',
      });
      const { html } = generateDigestHtml(data);
      expect(html).not.toContain("<script>");
      expect(html).toContain("&lt;script&gt;");
    });
  });

  describe("week-over-week trend", () => {
    it("shows up arrow for positive change", () => {
      const data = makeDigestData({ weekOverWeekChange: 25 });
      const { html } = generateDigestHtml(data);
      expect(html).toContain("&#9650;"); // up triangle
      expect(html).toContain("25%");
      expect(html).toContain("#34D399"); // green
    });

    it("shows down arrow for negative change", () => {
      const data = makeDigestData({ weekOverWeekChange: -15 });
      const { html } = generateDigestHtml(data);
      expect(html).toContain("&#9660;"); // down triangle
      expect(html).toContain("15%");
      expect(html).toContain("#F87171"); // red
    });

    it("shows neutral indicator for zero change", () => {
      const data = makeDigestData({ weekOverWeekChange: 0 });
      const { html } = generateDigestHtml(data);
      expect(html).toContain("&#9644;"); // horizontal line
      expect(html).toContain("0%");
      expect(html).toContain("#94A3B8"); // neutral gray
    });
  });

  describe("plain text fallback", () => {
    it("includes all key metrics in plain text", () => {
      const data = makeDigestData({
        completions: 10,
        marketingValue: 125,
        topCampaign: { name: "Test Campaign", completions: 7 },
      });
      const { text } = generateDigestHtml(data);
      expect(text).toContain("10");
      expect(text).toContain("$125");
      expect(text).toContain("Test Campaign");
      expect(text).toContain("dashboard");
    });

    it("includes zero-state message in plain text", () => {
      const data = makeDigestData({
        completions: 0,
        marketingValue: 0,
        activeCampaigns: 0,
      });
      const { text } = generateDigestHtml(data);
      expect(text).toContain("campaigns are waiting");
    });
  });
});

// =============================================================================
// buildDigestData
// =============================================================================

describe("buildDigestData", () => {
  // Access mock internals
  let mockCampaigns: Map<string, { id: string; businessId: string; state: string }>;

  beforeEach(async () => {
    mockSubmissions.clear();
    mockEvents.length = 0;

    const mod = await import("@/lib/campaign-state-machine");
    mockCampaigns = (mod.campaignManager as unknown as {
      _campaigns: Map<string, { id: string; businessId: string; state: string }>;
    })._campaigns;
    mockCampaigns.clear();
  });

  it("returns zero metrics when no campaigns exist", () => {
    const data = buildDigestData("biz_empty", "Empty Biz", "empty@test.com");

    expect(data.businessId).toBe("biz_empty");
    expect(data.businessName).toBe("Empty Biz");
    expect(data.completions).toBe(0);
    expect(data.marketingValue).toBe(0);
    expect(data.submissions.total).toBe(0);
    expect(data.activeCampaigns).toBe(0);
    expect(data.topCampaign).toBeNull();
    expect(data.weekOverWeekChange).toBe(0);
  });

  it("counts active campaigns correctly", () => {
    mockCampaigns.set("camp_1", { id: "camp_1", businessId: "biz_a", state: "active" });
    mockCampaigns.set("camp_2", { id: "camp_2", businessId: "biz_a", state: "active" });
    mockCampaigns.set("camp_3", { id: "camp_3", businessId: "biz_a", state: "ended" });
    mockCampaigns.set("camp_4", { id: "camp_4", businessId: "biz_b", state: "active" });

    const data = buildDigestData("biz_a", "Biz A", "a@test.com");
    expect(data.activeCampaigns).toBe(2);
  });

  it("aggregates submissions from the past week", () => {
    const now = new Date();
    const threeDaysAgo = new Date(now);
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    mockCampaigns.set("camp_x", { id: "camp_x", businessId: "biz_x", state: "active" });

    mockSubmissions.set("camp_x", [
      { id: "s1", campaignId: "camp_x", userId: "u1", status: "approved", submittedAt: threeDaysAgo.toISOString() },
      { id: "s2", campaignId: "camp_x", userId: "u2", status: "rejected", submittedAt: threeDaysAgo.toISOString() },
      { id: "s3", campaignId: "camp_x", userId: "u3", status: "pending", submittedAt: threeDaysAgo.toISOString() },
    ]);

    const data = buildDigestData("biz_x", "Biz X", "x@test.com");

    expect(data.submissions.total).toBe(3);
    expect(data.submissions.approved).toBe(1);
    expect(data.submissions.rejected).toBe(1);
    expect(data.submissions.pending).toBe(1);
    expect(data.completions).toBe(1);
  });

  it("calculates marketing value from completions", () => {
    const now = new Date();
    const twoDaysAgo = new Date(now);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    mockCampaigns.set("camp_v", { id: "camp_v", businessId: "biz_v", state: "active" });

    mockSubmissions.set("camp_v", [
      { id: "s1", campaignId: "camp_v", userId: "u1", status: "approved", submittedAt: twoDaysAgo.toISOString() },
      { id: "s2", campaignId: "camp_v", userId: "u2", status: "approved", submittedAt: twoDaysAgo.toISOString() },
      { id: "s3", campaignId: "camp_v", userId: "u3", status: "approved", submittedAt: twoDaysAgo.toISOString() },
      { id: "s4", campaignId: "camp_v", userId: "u4", status: "approved", submittedAt: twoDaysAgo.toISOString() },
    ]);

    const data = buildDigestData("biz_v", "Biz V", "v@test.com");

    // 4 completions * $12.50 = $50
    expect(data.marketingValue).toBe(50);
  });

  it("selects top campaign with most completions", () => {
    const now = new Date();
    const twoDaysAgo = new Date(now);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    mockCampaigns.set("camp_a", { id: "camp_a", businessId: "biz_t", state: "active" });
    mockCampaigns.set("camp_b", { id: "camp_b", businessId: "biz_t", state: "active" });

    mockSubmissions.set("camp_a", [
      { id: "s1", campaignId: "camp_a", userId: "u1", status: "approved", submittedAt: twoDaysAgo.toISOString() },
    ]);

    mockSubmissions.set("camp_b", [
      { id: "s2", campaignId: "camp_b", userId: "u1", status: "approved", submittedAt: twoDaysAgo.toISOString() },
      { id: "s3", campaignId: "camp_b", userId: "u2", status: "approved", submittedAt: twoDaysAgo.toISOString() },
      { id: "s4", campaignId: "camp_b", userId: "u3", status: "approved", submittedAt: twoDaysAgo.toISOString() },
    ]);

    // Add campaign name events
    mockEvents.push({
      type: "campaign.created",
      entityId: "camp_a",
      data: { name: "Small Campaign" },
    });
    mockEvents.push({
      type: "campaign.created",
      entityId: "camp_b",
      data: { name: "Big Campaign" },
    });

    const data = buildDigestData("biz_t", "Biz T", "t@test.com");

    expect(data.topCampaign).not.toBeNull();
    expect(data.topCampaign!.name).toBe("Big Campaign");
    expect(data.topCampaign!.completions).toBe(3);
  });

  it("calculates positive week-over-week change", () => {
    const now = new Date();
    const threeDaysAgo = new Date(now);
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const tenDaysAgo = new Date(now);
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

    mockCampaigns.set("camp_w", { id: "camp_w", businessId: "biz_w", state: "active" });

    mockSubmissions.set("camp_w", [
      // This week: 3 approved
      { id: "s1", campaignId: "camp_w", userId: "u1", status: "approved", submittedAt: threeDaysAgo.toISOString() },
      { id: "s2", campaignId: "camp_w", userId: "u2", status: "approved", submittedAt: threeDaysAgo.toISOString() },
      { id: "s3", campaignId: "camp_w", userId: "u3", status: "approved", submittedAt: threeDaysAgo.toISOString() },
      // Last week: 2 approved
      { id: "s4", campaignId: "camp_w", userId: "u4", status: "approved", submittedAt: tenDaysAgo.toISOString() },
      { id: "s5", campaignId: "camp_w", userId: "u5", status: "approved", submittedAt: tenDaysAgo.toISOString() },
    ]);

    const data = buildDigestData("biz_w", "Biz W", "w@test.com");

    // (3 - 2) / 2 * 100 = 50%
    expect(data.weekOverWeekChange).toBe(50);
  });

  it("returns 100% week-over-week when last week was zero but this week has completions", () => {
    const now = new Date();
    const twoDaysAgo = new Date(now);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    mockCampaigns.set("camp_n", { id: "camp_n", businessId: "biz_n", state: "active" });

    mockSubmissions.set("camp_n", [
      { id: "s1", campaignId: "camp_n", userId: "u1", status: "approved", submittedAt: twoDaysAgo.toISOString() },
    ]);

    const data = buildDigestData("biz_n", "Biz N", "n@test.com");
    expect(data.weekOverWeekChange).toBe(100);
  });

  it("returns 0% week-over-week when both weeks are zero", () => {
    mockCampaigns.set("camp_z", { id: "camp_z", businessId: "biz_z", state: "active" });
    mockSubmissions.set("camp_z", []);

    const data = buildDigestData("biz_z", "Biz Z", "z@test.com");
    expect(data.weekOverWeekChange).toBe(0);
  });

  it("excludes submissions outside the week period", () => {
    const now = new Date();
    const twentyDaysAgo = new Date(now);
    twentyDaysAgo.setDate(twentyDaysAgo.getDate() - 20);

    mockCampaigns.set("camp_old", { id: "camp_old", businessId: "biz_old", state: "active" });

    mockSubmissions.set("camp_old", [
      { id: "s1", campaignId: "camp_old", userId: "u1", status: "approved", submittedAt: twentyDaysAgo.toISOString() },
    ]);

    const data = buildDigestData("biz_old", "Old Biz", "old@test.com");
    expect(data.submissions.total).toBe(0);
    expect(data.completions).toBe(0);
  });

  it("sets period start and end dates correctly", () => {
    const data = buildDigestData("biz_period", "Period Biz", "p@test.com");

    // Period should cover exactly one week
    const start = new Date(data.period.start);
    const end = new Date(data.period.end);
    const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBe(7);
  });

  it("uses campaign ID as fallback name when event store has no name", () => {
    const now = new Date();
    const twoDaysAgo = new Date(now);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    mockCampaigns.set("camp_noname", { id: "camp_noname", businessId: "biz_nn", state: "active" });

    mockSubmissions.set("camp_noname", [
      { id: "s1", campaignId: "camp_noname", userId: "u1", status: "approved", submittedAt: twoDaysAgo.toISOString() },
    ]);

    // No event for this campaign
    const data = buildDigestData("biz_nn", "No Name Biz", "nn@test.com");
    expect(data.topCampaign).not.toBeNull();
    expect(data.topCampaign!.name).toBe("camp_noname");
  });
});
