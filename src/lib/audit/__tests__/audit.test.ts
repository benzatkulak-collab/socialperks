import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { AuditLog } from "@/lib/audit";
import type { AuditLogInput, AuditEntry } from "@/lib/audit";

// --- Helpers -----------------------------------------------------------------

function makeInput(overrides: Partial<AuditLogInput> = {}): AuditLogInput {
  return {
    actor: { userId: "user-1", email: "test@demo.com", role: "admin" },
    action: "campaign.created",
    resource: { type: "campaign", id: "camp-1" },
    ...overrides,
  };
}

function seedEntries(log: AuditLog, count: number): AuditEntry[] {
  const entries: AuditEntry[] = [];
  for (let i = 0; i < count; i++) {
    entries.push(
      log.log(
        makeInput({
          actor: { userId: `user-${i % 3}`, role: "admin" },
          action: i % 2 === 0 ? "campaign.created" : "campaign.updated",
          resource: { type: "campaign", id: `camp-${i}` },
        })
      )
    );
  }
  return entries;
}

// --- Tests -------------------------------------------------------------------

describe("AuditLog", () => {
  let log: AuditLog;

  beforeEach(() => {
    log = new AuditLog();
  });

  // -- Entry creation ---------------------------------------------------------

  it("creates an entry with all required fields", () => {
    const entry = log.log(makeInput());

    expect(entry.id).toMatch(/^aud_/);
    expect(entry.timestamp).toBeTruthy();
    expect(entry.actor.userId).toBe("user-1");
    expect(entry.actor.email).toBe("test@demo.com");
    expect(entry.action).toBe("campaign.created");
    expect(entry.resource.type).toBe("campaign");
    expect(entry.resource.id).toBe("camp-1");
    expect(entry.hash).toHaveLength(64);
    expect(entry.previousHash).toHaveLength(64);
  });

  it("includes optional changes and metadata", () => {
    const entry = log.log(
      makeInput({
        changes: { before: { status: "draft" }, after: { status: "active" } },
        metadata: { trigger: "api", version: 2 },
        requestId: "req-abc-123",
      })
    );

    expect(entry.changes?.before).toEqual({ status: "draft" });
    expect(entry.changes?.after).toEqual({ status: "active" });
    expect(entry.metadata?.trigger).toBe("api");
    expect(entry.requestId).toBe("req-abc-123");
  });

  it("first entry has genesis previousHash (64 zeros)", () => {
    const entry = log.log(makeInput());
    expect(entry.previousHash).toBe("0".repeat(64));
  });

  // -- Hash chain integrity ---------------------------------------------------

  it("chains hashes correctly across multiple entries", () => {
    const e1 = log.log(makeInput());
    const e2 = log.log(makeInput({ action: "campaign.updated" }));
    const e3 = log.log(makeInput({ action: "campaign.deleted" }));

    expect(e2.previousHash).toBe(e1.hash);
    expect(e3.previousHash).toBe(e2.hash);
  });

  it("produces unique hashes for different content", () => {
    const e1 = log.log(makeInput({ action: "campaign.created" }));
    const e2 = log.log(makeInput({ action: "campaign.updated" }));

    expect(e1.hash).not.toBe(e2.hash);
  });

  // -- Query ------------------------------------------------------------------

  it("queries by actorId", () => {
    seedEntries(log, 9);
    const { entries, total } = log.query({ actorId: "user-0" });

    expect(total).toBe(3); // indices 0, 3, 6
    expect(entries.every((e) => e.actor.userId === "user-0")).toBe(true);
  });

  it("queries by action", () => {
    seedEntries(log, 6);
    const { entries, total } = log.query({ action: "campaign.created" });

    expect(total).toBe(3); // even indices
    expect(entries.every((e) => e.action === "campaign.created")).toBe(true);
  });

  it("queries by resourceType and resourceId", () => {
    seedEntries(log, 5);
    const { entries } = log.query({
      resourceType: "campaign",
      resourceId: "camp-2",
    });

    expect(entries).toHaveLength(1);
    expect(entries[0].resource.id).toBe("camp-2");
  });

  it("queries by date range", () => {
    const baseTime = new Date("2026-01-15T12:00:00.000Z").getTime();

    vi.useFakeTimers();

    vi.setSystemTime(baseTime);
    log.log(makeInput({ action: "early" }));

    vi.setSystemTime(baseTime + 60_000); // +1 min
    log.log(makeInput({ action: "middle" }));

    vi.setSystemTime(baseTime + 120_000); // +2 min
    log.log(makeInput({ action: "late" }));

    vi.useRealTimers();

    const { entries } = log.query({
      startDate: new Date(baseTime + 30_000).toISOString(),
      endDate: new Date(baseTime + 90_000).toISOString(),
    });

    expect(entries).toHaveLength(1);
    expect(entries[0].action).toBe("middle");
  });

  it("paginates results", () => {
    seedEntries(log, 10);

    const page1 = log.query({ page: 1, perPage: 3 });
    const page2 = log.query({ page: 2, perPage: 3 });

    expect(page1.total).toBe(10);
    expect(page1.entries).toHaveLength(3);
    expect(page2.entries).toHaveLength(3);
    expect(page1.entries[0].id).not.toBe(page2.entries[0].id);
  });

  it("combines multiple filters", () => {
    seedEntries(log, 12);
    const { entries } = log.query({
      actorId: "user-0",
      action: "campaign.created",
    });

    // user-0 at indices 0,3,6,9 -- even indices are "created": 0,6
    expect(entries.every((e) => e.actor.userId === "user-0")).toBe(true);
    expect(entries.every((e) => e.action === "campaign.created")).toBe(true);
  });

  // -- Resource history -------------------------------------------------------

  it("returns chronological resource history", () => {
    log.log(makeInput({ resource: { type: "campaign", id: "camp-A" }, action: "created" }));
    log.log(makeInput({ resource: { type: "campaign", id: "camp-B" }, action: "created" }));
    log.log(makeInput({ resource: { type: "campaign", id: "camp-A" }, action: "updated" }));

    const history = log.getResourceHistory("campaign", "camp-A");
    expect(history).toHaveLength(2);
    expect(history[0].action).toBe("created");
    expect(history[1].action).toBe("updated");
  });

  // -- Actor history ----------------------------------------------------------

  it("returns actor history newest-first with limit", () => {
    for (let i = 0; i < 5; i++) {
      log.log(makeInput({ action: `action-${i}` }));
    }

    const history = log.getActorHistory("user-1", 3);
    expect(history).toHaveLength(3);
    expect(history[0].action).toBe("action-4"); // newest first
    expect(history[2].action).toBe("action-2");
  });

  it("returns all actor entries when no limit is given", () => {
    for (let i = 0; i < 4; i++) {
      log.log(makeInput());
    }

    const history = log.getActorHistory("user-1");
    expect(history).toHaveLength(4);
  });

  // -- Export -----------------------------------------------------------------

  it("exports entries within date range", () => {
    const baseTime = new Date("2026-06-01T00:00:00.000Z").getTime();

    vi.useFakeTimers();

    vi.setSystemTime(baseTime);
    log.log(makeInput({ action: "before-range" }));

    vi.setSystemTime(baseTime + 100_000);
    log.log(makeInput({ action: "in-range" }));

    vi.setSystemTime(baseTime + 200_000);
    log.log(makeInput({ action: "after-range" }));

    vi.useRealTimers();

    const exported = log.export(
      new Date(baseTime + 50_000).toISOString(),
      new Date(baseTime + 150_000).toISOString()
    );

    expect(exported).toHaveLength(1);
    expect(exported[0].action).toBe("in-range");
  });

  it("returns empty array for invalid date strings", () => {
    log.log(makeInput());
    expect(log.export("not-a-date", "also-bad")).toEqual([]);
  });

  // -- Stats ------------------------------------------------------------------

  it("computes correct stats", () => {
    seedEntries(log, 6);
    const stats = log.getStats();

    expect(stats.totalEntries).toBe(6);
    expect(stats.byAction["campaign.created"]).toBe(3);
    expect(stats.byAction["campaign.updated"]).toBe(3);
    expect(stats.byActor["user-0"]).toBe(2);
    expect(stats.byActor["user-1"]).toBe(2);
    expect(stats.byActor["user-2"]).toBe(2);
  });

  // -- Integrity verification -------------------------------------------------

  it("passes integrity check for a clean log", () => {
    seedEntries(log, 10);
    const result = log.verifyIntegrity();

    expect(result.valid).toBe(true);
    expect(result.totalChecked).toBe(10);
    expect(result.firstInvalidIndex).toBeUndefined();
  });

  it("detects tampered entry content", () => {
    seedEntries(log, 5);

    // Tamper with the action field of the 3rd entry
    const raw = log._unsafeGetEntries();
    const tampered = { ...raw[2], action: "tampered.action" } as AuditEntry;
    raw[2] = tampered;

    const result = log.verifyIntegrity();

    expect(result.valid).toBe(false);
    expect(result.firstInvalidIndex).toBe(2);
    expect(result.error).toContain("hash mismatch");
  });

  it("detects broken previousHash link", () => {
    seedEntries(log, 5);

    // Break the chain by altering previousHash of entry 3
    const raw = log._unsafeGetEntries();
    const tampered = { ...raw[3], previousHash: "a".repeat(64) } as AuditEntry;
    raw[3] = tampered;

    const result = log.verifyIntegrity();

    expect(result.valid).toBe(false);
    expect(result.firstInvalidIndex).toBe(3);
    expect(result.error).toContain("previousHash mismatch");
  });

  // -- Empty log edge cases ---------------------------------------------------

  it("handles empty log gracefully for all operations", () => {
    expect(log.query()).toEqual({ entries: [], total: 0 });
    expect(log.getResourceHistory("campaign", "x")).toEqual([]);
    expect(log.getActorHistory("user-1")).toEqual([]);
    expect(log.export("2024-01-01", "2024-12-31")).toEqual([]);
    expect(log.getStats()).toEqual({
      totalEntries: 0,
      byAction: {},
      byActor: {},
    });
    expect(log.verifyIntegrity()).toEqual({ valid: true, totalChecked: 0 });
    expect(log.size).toBe(0);
    expect(log.snapshot()).toEqual([]);
  });

  // -- Size and reset ---------------------------------------------------------

  it("tracks size correctly", () => {
    expect(log.size).toBe(0);
    log.log(makeInput());
    log.log(makeInput());
    expect(log.size).toBe(2);
  });

  it("reset clears all entries", () => {
    seedEntries(log, 5);
    expect(log.size).toBe(5);
    log._reset();
    expect(log.size).toBe(0);
    expect(log.verifyIntegrity().valid).toBe(true);
  });

  it("snapshot returns a copy, not the internal array", () => {
    log.log(makeInput());
    const snap = log.snapshot();
    expect(snap).toHaveLength(1);
    // Mutating the snapshot should not affect the log
    (snap as AuditEntry[]).length = 0;
    expect(log.size).toBe(1);
  });
});
