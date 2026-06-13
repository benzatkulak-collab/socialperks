/**
 * Submissions — durability tests
 *
 * Proves customer proof submissions survive a serverless cold start: create and
 * review are persisted to the durable backing store (`campaign_submissions_v2`)
 * and rehydrated into the in-memory cache + indexes. These run against
 * InMemoryConnection but exercise the SAME persist/hydrate code path that talks
 * to Postgres in production (the store branch vs the SQL branch share structure),
 * so a regression that drops durability fails here.
 *
 * This is the gap the audit flagged: the old persist.ts wrote to the v1
 * UUID/FK `campaign_submissions` table (silently rejected for TEXT ids) and had
 * no reader, so GET /submissions, creator earnings, and the review queue all
 * went empty on every deploy while the in-memory tests stayed green.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  createSubmission,
  reviewSubmission,
  getSubmissionById,
  getSubmissionsForUser,
  getSubmissionsForCampaign,
  hydrateSubmissions,
  clearStore,
  __resetSubmissionsCacheForTests,
} from "@/lib/submissions";

describe("Submissions durability", () => {
  beforeEach(() => {
    // Clears the cache AND the durable backing rows, and resets hydration.
    clearStore();
  });

  it("restores a created submission from durable storage after a cold start", async () => {
    const res = createSubmission("camp_1", "cust_1", "ig_st", "https://www.instagram.com/p/aaa111", "url", { anonymous: true });
    expect(res.success).toBe(true);
    const id = res.data!.id;

    // Sanity: the live cache has it.
    expect(getSubmissionById(id)).toBeDefined();

    // Cold start: cache gone, durable rows remain.
    __resetSubmissionsCacheForTests();
    expect(getSubmissionById(id)).toBeUndefined();

    // Rehydrate from durable storage.
    await hydrateSubmissions();

    const restored = getSubmissionById(id);
    expect(restored).toBeDefined();
    expect(restored!.campaignId).toBe("camp_1");
    expect(restored!.userId).toBe("cust_1");
    expect(restored!.actionId).toBe("ig_st");
    expect(restored!.status).toBe("pending");
    expect(restored!.metadata.anonymous).toBe(true);
    // Indexes are rebuilt too.
    expect(getSubmissionsForUser("cust_1").map((s) => s.id)).toContain(id);
    expect(getSubmissionsForCampaign("camp_1").submissions.map((s) => s.id)).toContain(id);
  });

  it("persists the review decision across a cold start", async () => {
    const res = createSubmission("camp_2", "cust_2", "ig_st", "https://www.instagram.com/p/bbb222", "url");
    const id = res.data!.id;

    const review = await reviewSubmission(id, "biz_2", "approve", "looks good");
    expect(review.success).toBe(true);

    __resetSubmissionsCacheForTests();
    await hydrateSubmissions();

    const restored = getSubmissionById(id);
    expect(restored).toBeDefined();
    expect(restored!.status).toBe("approved");
    expect(restored!.perkAwarded).toBe(true);
    expect(restored!.reviewedBy).toBe("biz_2");
    expect(restored!.reviewNote).toBe("looks good");
    expect(restored!.reviewedAt).not.toBeNull();
  });

  it("rebuilds per-user and per-campaign indexes for many submissions", async () => {
    createSubmission("campA", "alice", "ig_st", "https://www.instagram.com/p/aaa", "url");
    createSubmission("campA", "bob", "ig_st", "https://www.instagram.com/p/bbb", "url");
    createSubmission("campB", "alice", "tt_vd", "https://www.tiktok.com/@x/video/ccc", "url");

    __resetSubmissionsCacheForTests();
    await hydrateSubmissions();

    expect(getSubmissionsForCampaign("campA").submissions).toHaveLength(2);
    expect(getSubmissionsForUser("alice")).toHaveLength(2);
    expect(getSubmissionsForCampaign("campB").submissions).toHaveLength(1);
  });

  it("clearStore isolates durable rows between tests", async () => {
    __resetSubmissionsCacheForTests();
    await hydrateSubmissions();
    expect(getSubmissionsForUser("cust_1")).toHaveLength(0);
    expect(getSubmissionsForUser("alice")).toHaveLength(0);
  });
});
