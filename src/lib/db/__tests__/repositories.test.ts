import { describe, it, expect, beforeEach } from "vitest";
import {
  BusinessRepository,
  InfluencerRepository,
} from "../repositories";
import { db, InMemoryConnection } from "../connection";

// Reset the in-memory store before each test to ensure isolation
beforeEach(() => {
  if (db instanceof InMemoryConnection) {
    db.store._reset?.() ?? (() => {
      // fallback: clear known tables
      for (const table of ["businesses", "influencers", "users"]) {
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

// NOTE: CampaignRepository + SubmissionRepository tests were removed alongside
// those repositories (they covered CRUD against the dead v1 launched_campaigns /
// campaign_submissions tables). Durability of the live campaign + submission
// stores is covered by:
//   - src/lib/__tests__/campaign-durability.test.ts   (launched_campaign_state)
//   - src/lib/__tests__/submissions-durability.test.ts (campaign_submissions_v2)
