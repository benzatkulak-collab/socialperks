import { describe, it, expect, beforeEach } from "vitest";
import {
  BusinessRepository,
  InfluencerRepository,
  CampaignRepository,
  SubmissionRepository,
} from "../repositories";
import { db, InMemoryConnection } from "../connection";

// Reset the in-memory store before each test to ensure isolation
beforeEach(() => {
  if (db instanceof InMemoryConnection) {
    db.store._reset?.() ?? (() => {
      // fallback: clear known tables
      for (const table of ["businesses", "influencers", "launched_campaigns", "campaign_submissions", "users"]) {
        try { (db.store as any).tables?.delete?.(table); } catch {}
      }
    })();
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// BUSINESS REPOSITORY
// ═══════════════════════════════════════════════════════════════════════════════

describe("BusinessRepository", () => {
  const repo = new BusinessRepository();

  it("creates a business with required fields and defaults", async () => {
    const biz = await repo.create({
      name: "Test Cafe",
      type: "Coffee Shop",
      email: "test@cafe.com",
    });
    expect(biz.id).toBeDefined();
    expect(biz.name).toBe("Test Cafe");
    expect(biz.type).toBe("Coffee Shop");
    expect(biz.email).toBe("test@cafe.com");
    expect(biz.plan).toBe("free");
    expect(biz.size).toBe("small");
    expect(biz.verified).toBe(false);
    expect(biz.campaign_count).toBe(0);
    expect(biz.deleted_at).toBeNull();
  });

  it("finds a business by ID", async () => {
    const created = await repo.create({ name: "B1", type: "Gym", email: "b1@gym.com" });
    const found = await repo.findById(created.id);
    expect(found).not.toBeNull();
    expect(found!.name).toBe("B1");
  });

  it("returns null for non-existent ID", async () => {
    const found = await repo.findById("nonexistent-id");
    expect(found).toBeNull();
  });

  it("finds a business by email", async () => {
    await repo.create({ name: "By Email", type: "Salon", email: "salon@test.com" });
    const found = await repo.findByEmail("salon@test.com");
    expect(found).not.toBeNull();
    expect(found!.name).toBe("By Email");
  });

  it("returns null for non-existent email", async () => {
    const found = await repo.findByEmail("nope@nope.com");
    expect(found).toBeNull();
  });

  it("findMany returns paginated results", async () => {
    for (let i = 0; i < 5; i++) {
      await repo.create({ name: `Biz ${i}`, type: "Shop", email: `biz${i}@test.com` });
    }
    const page1 = await repo.findMany({}, { page: 1, perPage: 2 });
    expect(page1.data.length).toBe(2);
    expect(page1.total).toBe(5);
    expect(page1.totalPages).toBe(3);
  });

  it("findMany filters by type", async () => {
    await repo.create({ name: "A", type: "Restaurant", email: "a@test.com" });
    await repo.create({ name: "B", type: "Gym", email: "b@test.com" });
    const result = await repo.findMany({ type: "Restaurant" });
    expect(result.data.length).toBe(1);
    expect(result.data[0].type).toBe("Restaurant");
  });

  it("updates a business", async () => {
    const biz = await repo.create({ name: "Old Name", type: "Shop", email: "upd@test.com" });
    const updated = await repo.update(biz.id, { name: "New Name", verified: true });
    expect(updated).not.toBeNull();
    expect(updated!.name).toBe("New Name");
    expect(updated!.verified).toBe(true);
  });

  it("update returns null for non-existent ID", async () => {
    const result = await repo.update("bad-id", { name: "X" });
    expect(result).toBeNull();
  });

  it("soft-deletes a business", async () => {
    const biz = await repo.create({ name: "Del Me", type: "Shop", email: "del@test.com" });
    const deleted = await repo.delete(biz.id);
    expect(deleted).toBe(true);
    // Should not be findable after soft delete
    const found = await repo.findById(biz.id);
    expect(found).toBeNull();
  });

  it("soft-deleted businesses are excluded from findMany", async () => {
    const biz = await repo.create({ name: "Ghost", type: "Shop", email: "ghost@test.com" });
    await repo.delete(biz.id);
    const result = await repo.findMany({});
    expect(result.data.find((b) => b.id === biz.id)).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INFLUENCER REPOSITORY
// ═══════════════════════════════════════════════════════════════════════════════

describe("InfluencerRepository", () => {
  const repo = new InfluencerRepository();

  it("creates an influencer with defaults", async () => {
    const inf = await repo.create({
      user_id: "u1",
      display_name: "TestInfluencer",
    });
    expect(inf.id).toBeDefined();
    expect(inf.display_name).toBe("TestInfluencer");
    expect(inf.tier).toBe("micro");
    expect(inf.follower_count).toBe(0);
    expect(inf.verified).toBe(false);
  });

  it("finds influencer by ID", async () => {
    const created = await repo.create({ user_id: "u2", display_name: "Inf2" });
    const found = await repo.findById(created.id);
    expect(found).not.toBeNull();
    expect(found!.display_name).toBe("Inf2");
  });

  it("findMany filters by tier", async () => {
    await repo.create({ user_id: "u10", display_name: "Micro", tier: "micro" });
    await repo.create({ user_id: "u11", display_name: "Macro", tier: "macro" });
    const result = await repo.findMany({ tier: "macro" });
    expect(result.data.length).toBe(1);
    expect(result.data[0].tier).toBe("macro");
  });

  it("findMany supports pagination", async () => {
    for (let i = 0; i < 4; i++) {
      await repo.create({ user_id: `pg${i}`, display_name: `Inf${i}` });
    }
    const page = await repo.findMany({}, { page: 1, perPage: 2 });
    expect(page.data.length).toBe(2);
    expect(page.totalPages).toBe(2);
  });

  it("soft-deletes an influencer", async () => {
    const inf = await repo.create({ user_id: "udel", display_name: "DelInf" });
    await repo.delete(inf.id);
    const found = await repo.findById(inf.id);
    expect(found).toBeNull();
  });

  it("updates an influencer", async () => {
    const inf = await repo.create({ user_id: "uup", display_name: "Before" });
    const updated = await repo.update(inf.id, { display_name: "After", verified: true });
    expect(updated!.display_name).toBe("After");
    expect(updated!.verified).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// CAMPAIGN REPOSITORY
// ═══════════════════════════════════════════════════════════════════════════════

describe("CampaignRepository", () => {
  const repo = new CampaignRepository();

  it("creates a campaign with defaults", async () => {
    const campaign = await repo.create({
      business_id: "b1",
      name: "Summer Promo",
      description: "Get 10% off",
      actions: ["ig_rl"],
      discount_value: 10,
      discount_type: "percent",
      expires_in_days: 30,
    });
    expect(campaign.id).toBeDefined();
    expect(campaign.status).toBe("active");
    expect(campaign.completion_count).toBe(0);
    expect(campaign.budget_used).toBe(0);
    expect(campaign.expires_at).toBeDefined();
  });

  it("finds campaign by ID", async () => {
    const created = await repo.create({
      business_id: "b2",
      name: "Test",
      description: "desc",
      actions: [],
      discount_value: 5,
      discount_type: "dollar",
      expires_in_days: 7,
    });
    const found = await repo.findById(created.id);
    expect(found).not.toBeNull();
    expect(found!.name).toBe("Test");
  });

  it("findByBusinessId returns campaigns for a specific business", async () => {
    await repo.create({
      business_id: "bx",
      name: "C1",
      description: "d",
      actions: [],
      discount_value: 5,
      discount_type: "dollar",
      expires_in_days: 7,
    });
    await repo.create({
      business_id: "bx",
      name: "C2",
      description: "d",
      actions: [],
      discount_value: 5,
      discount_type: "dollar",
      expires_in_days: 7,
    });
    await repo.create({
      business_id: "by",
      name: "C3",
      description: "d",
      actions: [],
      discount_value: 5,
      discount_type: "dollar",
      expires_in_days: 7,
    });
    const result = await repo.findByBusinessId("bx");
    expect(result.length).toBe(2);
  });

  it("filters campaigns by status", async () => {
    const c = await repo.create({
      business_id: "bs",
      name: "Active",
      description: "d",
      actions: [],
      discount_value: 5,
      discount_type: "dollar",
      expires_in_days: 7,
    });
    await repo.update(c.id, { status: "paused" });
    const active = await repo.findMany({ status: "active" });
    const paused = await repo.findMany({ status: "paused" });
    expect(active.data.find((x) => x.id === c.id)).toBeUndefined();
    expect(paused.data.find((x) => x.id === c.id)).toBeDefined();
  });

  it("incrementCompletions increments count and budget", async () => {
    const c = await repo.create({
      business_id: "binc",
      name: "Inc",
      description: "d",
      actions: [],
      discount_value: 5,
      discount_type: "dollar",
      expires_in_days: 7,
    });
    const updated = await repo.incrementCompletions(c.id, 10);
    expect(updated!.completion_count).toBe(1);
    expect(updated!.budget_used).toBe(10);

    const updated2 = await repo.incrementCompletions(c.id, 5);
    expect(updated2!.completion_count).toBe(2);
    expect(updated2!.budget_used).toBe(15);
  });

  it("delete sets status to ended", async () => {
    const c = await repo.create({
      business_id: "bdel",
      name: "DelCampaign",
      description: "d",
      actions: [],
      discount_value: 5,
      discount_type: "dollar",
      expires_in_days: 7,
    });
    await repo.delete(c.id);
    const found = await repo.findById(c.id);
    expect(found!.status).toBe("ended");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SUBMISSION REPOSITORY
// ═══════════════════════════════════════════════════════════════════════════════

describe("SubmissionRepository", () => {
  const repo = new SubmissionRepository();

  it("creates a submission with pending status", async () => {
    const sub = await repo.create({
      campaign_id: "c1",
      user_id: "u1",
      action_id: "ig_rl",
      proof_url: "https://example.com/proof",
      proof_type: "url",
    });
    expect(sub.id).toBeDefined();
    expect(sub.status).toBe("pending");
    expect(sub.reviewed_at).toBeNull();
  });

  it("approves a submission", async () => {
    const sub = await repo.create({
      campaign_id: "c2",
      user_id: "u2",
      action_id: "ig_fo",
      proof_url: "https://example.com/proof2",
      proof_type: "screenshot",
    });
    const approved = await repo.approve(sub.id, "reviewer1", "Looks good");
    expect(approved!.status).toBe("approved");
    expect(approved!.reviewed_by).toBe("reviewer1");
    expect(approved!.review_note).toBe("Looks good");
    expect(approved!.reviewed_at).toBeDefined();
  });

  it("rejects a submission", async () => {
    const sub = await repo.create({
      campaign_id: "c3",
      user_id: "u3",
      action_id: "ig_cm",
      proof_url: "https://example.com/bad",
      proof_type: "url",
    });
    const rejected = await repo.reject(sub.id, "reviewer2", "Invalid proof");
    expect(rejected!.status).toBe("rejected");
    expect(rejected!.review_note).toBe("Invalid proof");
  });

  it("filters submissions by status", async () => {
    const s1 = await repo.create({
      campaign_id: "cf",
      user_id: "uf",
      action_id: "ig_lk",
      proof_url: "https://a.com",
      proof_type: "url",
    });
    await repo.create({
      campaign_id: "cf",
      user_id: "uf2",
      action_id: "ig_lk",
      proof_url: "https://b.com",
      proof_type: "url",
    });
    await repo.approve(s1.id, "r1");

    const approved = await repo.findMany({ status: "approved" });
    expect(approved.data.length).toBe(1);
    const pending = await repo.findMany({ status: "pending" });
    expect(pending.data.length).toBe(1);
  });

  it("findByCampaignId returns submissions for a campaign", async () => {
    await repo.create({
      campaign_id: "camp1",
      user_id: "x1",
      action_id: "ig_rl",
      proof_url: "https://c.com",
      proof_type: "url",
    });
    await repo.create({
      campaign_id: "camp1",
      user_id: "x2",
      action_id: "ig_fo",
      proof_url: "https://d.com",
      proof_type: "url",
    });
    const subs = await repo.findByCampaignId("camp1");
    expect(subs.length).toBe(2);
  });

  it("deletes a submission (hard delete)", async () => {
    const sub = await repo.create({
      campaign_id: "cdel",
      user_id: "udel",
      action_id: "ig_rl",
      proof_url: "https://e.com",
      proof_type: "url",
    });
    await repo.delete(sub.id);
    const found = await repo.findById(sub.id);
    expect(found).toBeNull();
  });
});
