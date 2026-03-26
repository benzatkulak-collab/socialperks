import { describe, it, expect, beforeEach } from "vitest";
import {
  LWWRegister,
  GCounter,
  ORSet,
  ConflictResolver,
  OperationLog,
} from "../index";

// ═══════════════════════════════════════════════════════════════════════════════
// LWW REGISTER
// ═══════════════════════════════════════════════════════════════════════════════

describe("LWWRegister", () => {
  it("stores an initial value", () => {
    const reg = new LWWRegister("hello", "node-a", 100);
    expect(reg.value).toBe("hello");
    expect(reg.timestamp).toBe(100);
    expect(reg.nodeId).toBe("node-a");
  });

  it("set updates value when timestamp is higher", () => {
    const reg = new LWWRegister("v1", "a", 100);
    reg.set("v2", "b", 200);
    expect(reg.value).toBe("v2");
    expect(reg.timestamp).toBe(200);
  });

  it("set ignores value with lower timestamp", () => {
    const reg = new LWWRegister("v1", "a", 200);
    reg.set("v2", "b", 100);
    expect(reg.value).toBe("v1");
    expect(reg.timestamp).toBe(200);
  });

  it("breaks ties by nodeId (higher nodeId wins)", () => {
    const reg = new LWWRegister("v1", "a", 100);
    reg.set("v2", "b", 100); // same timestamp, "b" > "a"
    expect(reg.value).toBe("v2");
    expect(reg.nodeId).toBe("b");
  });

  it("tie: lower nodeId does not win", () => {
    const reg = new LWWRegister("v1", "b", 100);
    reg.set("v2", "a", 100); // same timestamp, "a" < "b"
    expect(reg.value).toBe("v1");
  });

  it("merge applies remote state correctly", () => {
    const reg = new LWWRegister("local", "a", 100);
    reg.merge({ value: "remote", timestamp: 200, nodeId: "b" });
    expect(reg.value).toBe("remote");
  });

  it("merge does not overwrite with older state", () => {
    const reg = new LWWRegister("local", "a", 200);
    reg.merge({ value: "remote", timestamp: 100, nodeId: "b" });
    expect(reg.value).toBe("local");
  });

  it("getState returns a copy of the internal state", () => {
    const reg = new LWWRegister(42, "n1", 500);
    const state = reg.getState();
    expect(state).toEqual({ value: 42, timestamp: 500, nodeId: "n1" });
  });

  it("works with complex object values", () => {
    const reg = new LWWRegister({ name: "old" }, "n1", 100);
    reg.set({ name: "new" }, "n2", 200);
    expect(reg.value).toEqual({ name: "new" });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// G-COUNTER
// ═══════════════════════════════════════════════════════════════════════════════

describe("GCounter", () => {
  it("starts at zero", () => {
    const counter = new GCounter("node-a");
    expect(counter.value).toBe(0);
  });

  it("increments by 1 by default", () => {
    const counter = new GCounter("node-a");
    counter.increment();
    expect(counter.value).toBe(1);
  });

  it("increments by a custom amount", () => {
    const counter = new GCounter("node-a");
    counter.increment(5);
    expect(counter.value).toBe(5);
  });

  it("rejects negative increments", () => {
    const counter = new GCounter("node-a");
    expect(() => counter.increment(-1)).toThrow(/non-negative/);
  });

  it("merge takes the max of each node counter", () => {
    const c1 = new GCounter("node-a");
    const c2 = new GCounter("node-b");

    c1.increment(3);
    c2.increment(5);

    c1.merge(c2.getState());
    // c1 should now have: node-a=3, node-b=5 => total = 8
    expect(c1.value).toBe(8);
  });

  it("merge is idempotent", () => {
    const c1 = new GCounter("node-a");
    const c2 = new GCounter("node-b");

    c1.increment(3);
    c2.increment(5);

    const state2 = c2.getState();
    c1.merge(state2);
    c1.merge(state2); // merge again
    expect(c1.value).toBe(8); // still 8
  });

  it("merge does not decrease values", () => {
    const c1 = new GCounter("node-a");
    c1.increment(10);

    // Remote has lower value for node-a
    c1.merge({ "node-a": 5 });
    expect(c1.value).toBe(10); // max(10, 5) = 10
  });

  it("getState returns node counts", () => {
    const counter = new GCounter("n1");
    counter.increment(7);
    const state = counter.getState();
    expect(state["n1"]).toBe(7);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// OR-SET
// ═══════════════════════════════════════════════════════════════════════════════

describe("ORSet", () => {
  it("starts empty", () => {
    const set = new ORSet<string>();
    expect(set.values).toEqual([]);
    expect(set.size).toBe(0);
  });

  it("add inserts an element", () => {
    const set = new ORSet<string>();
    set.add("apple");
    expect(set.has("apple")).toBe(true);
    expect(set.size).toBe(1);
  });

  it("add returns a unique tag", () => {
    const set = new ORSet<string>();
    const tag1 = set.add("apple");
    const tag2 = set.add("banana");
    expect(tag1).not.toBe(tag2);
  });

  it("remove removes an element", () => {
    const set = new ORSet<string>();
    set.add("apple");
    set.remove("apple");
    expect(set.has("apple")).toBe(false);
    expect(set.size).toBe(0);
  });

  it("remove returns removed tags", () => {
    const set = new ORSet<string>();
    set.add("x");
    const tags = set.remove("x");
    expect(tags.length).toBe(1);
  });

  it("remove of non-existent element returns empty", () => {
    const set = new ORSet<string>();
    const tags = set.remove("ghost");
    expect(tags.length).toBe(0);
  });

  it("deduplicates same logical value", () => {
    const set = new ORSet<string>();
    set.add("dup");
    set.add("dup");
    // values should only list "dup" once
    expect(set.values).toEqual(["dup"]);
    // But internally there are two tags
    const state = set.getState();
    expect(state.elements.length).toBe(2);
  });

  it("merge with add-wins semantics", () => {
    const set1 = new ORSet<string>();
    const set2 = new ORSet<string>();

    set1.add("apple");
    const tag = set2.add("apple"); // concurrent add

    // set1 removes apple (tombstones its own tag)
    set1.remove("apple");

    // Merge set2 into set1: set2's tag was not tombstoned by set1
    set1.merge(set2.getState());
    expect(set1.has("apple")).toBe(true); // add wins
  });

  it("merge preserves elements from both sides", () => {
    const s1 = new ORSet<string>();
    const s2 = new ORSet<string>();

    s1.add("a");
    s2.add("b");

    s1.merge(s2.getState());
    expect(s1.has("a")).toBe(true);
    expect(s1.has("b")).toBe(true);
  });

  it("merge removes elements that are tombstoned remotely", () => {
    const s1 = new ORSet<string>();
    const tag = s1.add("x");

    const s2 = new ORSet<string>();
    s2.merge(s1.getState()); // s2 now has "x"
    s2.remove("x"); // s2 tombstones the tag

    s1.merge(s2.getState()); // s1 should remove "x"
    expect(s1.has("x")).toBe(false);
  });

  it("works with number values", () => {
    const set = new ORSet<number>();
    set.add(42);
    set.add(99);
    expect(set.has(42)).toBe(true);
    expect(set.has(99)).toBe(true);
    expect(set.size).toBe(2);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// CONFLICT RESOLVER
// ═══════════════════════════════════════════════════════════════════════════════

describe("ConflictResolver", () => {
  it("resolves with client_wins strategy", () => {
    const resolver = new ConflictResolver("client_wins");
    const clientOp = makeOp("node-a", "campaign", "c1", "update", "name", "Client Name");
    const serverOp = makeOp("node-b", "campaign", "c1", "update", "name", "Server Name");

    const result = resolver.resolve(clientOp, serverOp);
    expect(result.resolved).toBe(true);
    expect(result.resolvedValue).toBe("Client Name");
  });

  it("resolves with server_wins strategy", () => {
    const resolver = new ConflictResolver("server_wins");
    const clientOp = makeOp("node-a", "campaign", "c1", "update", "name", "Client");
    const serverOp = makeOp("node-b", "campaign", "c1", "update", "name", "Server");

    const result = resolver.resolve(clientOp, serverOp);
    expect(result.resolved).toBe(true);
    expect(result.resolvedValue).toBe("Server");
  });

  it("resolves with last_write_wins (defaults to client)", () => {
    const resolver = new ConflictResolver("last_write_wins");
    const clientOp = makeOp("node-a", "campaign", "c1", "update", "name", "LWW");
    const serverOp = makeOp("node-b", "campaign", "c1", "update", "name", "Other");

    const result = resolver.resolve(clientOp, serverOp);
    expect(result.resolved).toBe(true);
    expect(result.resolvedValue).toBe("LWW");
  });

  it("manual strategy returns resolved: false", () => {
    const resolver = new ConflictResolver("manual");
    const clientOp = makeOp("a", "campaign", "c1", "update", "name", "A");
    const serverOp = makeOp("b", "campaign", "c1", "update", "name", "B");

    const result = resolver.resolve(clientOp, serverOp);
    expect(result.resolved).toBe(false);
    expect(result.strategy).toBe("manual");
  });

  it("per-entity strategy overrides default", () => {
    const resolver = new ConflictResolver("client_wins");
    resolver.setEntityStrategy("campaign", "server_wins");

    const clientOp = makeOp("a", "campaign", "c1", "update", "name", "Client");
    const serverOp = makeOp("b", "campaign", "c1", "update", "name", "Server");

    const result = resolver.resolve(clientOp, serverOp);
    expect(result.resolvedValue).toBe("Server");
  });

  it("per-field strategy overrides per-entity strategy", () => {
    const resolver = new ConflictResolver("client_wins");
    resolver.setEntityStrategy("campaign", "server_wins");
    resolver.setFieldStrategy("campaign", "name", "client_wins");

    const clientOp = makeOp("a", "campaign", "c1", "update", "name", "ClientField");
    const serverOp = makeOp("b", "campaign", "c1", "update", "name", "ServerField");

    const result = resolver.resolve(clientOp, serverOp);
    expect(result.resolvedValue).toBe("ClientField");
  });

  it("merge strategy with custom merge function", () => {
    const resolver = new ConflictResolver();
    resolver.setFieldStrategy("campaign", "count", "merge", (c, s) => {
      return Math.max(c as number, s as number);
    });

    const clientOp = makeOp("a", "campaign", "c1", "update", "count", 10);
    const serverOp = makeOp("b", "campaign", "c1", "update", "count", 15);

    const result = resolver.resolve(clientOp, serverOp);
    expect(result.resolvedValue).toBe(15);
  });

  it("detectConflict returns false for same node", () => {
    const resolver = new ConflictResolver();
    const op1 = makeOp("a", "campaign", "c1", "update", "name", "v1");
    const op2 = makeOp("a", "campaign", "c1", "update", "name", "v2");
    expect(resolver.detectConflict(op1, op2)).toBe(false);
  });

  it("detectConflict returns true for same field from different nodes", () => {
    const resolver = new ConflictResolver();
    const op1 = makeOp("a", "campaign", "c1", "update", "name", "v1");
    const op2 = makeOp("b", "campaign", "c1", "update", "name", "v2");
    expect(resolver.detectConflict(op1, op2)).toBe(true);
  });

  it("detectConflict returns false for different entities", () => {
    const resolver = new ConflictResolver();
    const op1 = makeOp("a", "campaign", "c1", "update", "name", "v1");
    const op2 = makeOp("b", "campaign", "c2", "update", "name", "v2");
    expect(resolver.detectConflict(op1, op2)).toBe(false);
  });

  it("detectConflict returns true for delete vs update", () => {
    const resolver = new ConflictResolver();
    const op1 = makeOp("a", "campaign", "c1", "delete", null, null);
    const op2 = makeOp("b", "campaign", "c1", "update", "name", "v2");
    expect(resolver.detectConflict(op1, op2)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// OPERATION LOG
// ═══════════════════════════════════════════════════════════════════════════════

describe("OperationLog", () => {
  let log: OperationLog;

  beforeEach(() => {
    log = new OperationLog("node-1");
  });

  it("starts empty", () => {
    expect(log.length).toBe(0);
  });

  it("append adds an operation", () => {
    const op = log.append({
      entityType: "campaign",
      entityId: "c1",
      operationType: "create",
      value: { name: "Test" },
    });
    expect(op.id).toBeDefined();
    expect(op.nodeId).toBe("node-1");
    expect(op.synced).toBe(false);
    expect(log.length).toBe(1);
  });

  it("getPending returns only unsynced operations", () => {
    log.append({ entityType: "campaign", entityId: "c1", operationType: "create" });
    log.append({ entityType: "campaign", entityId: "c2", operationType: "update" });

    const pending = log.getPending();
    expect(pending.length).toBe(2);
  });

  it("markSynced marks operations as synced", () => {
    const op = log.append({ entityType: "campaign", entityId: "c1", operationType: "create" });
    log.markSynced(op.id);

    const pending = log.getPending();
    expect(pending.length).toBe(0);

    const synced = log.get(op.id);
    expect(synced!.synced).toBe(true);
    expect(synced!.syncedAt).toBeDefined();
  });

  it("markSynced accepts array of IDs", () => {
    const op1 = log.append({ entityType: "campaign", entityId: "c1", operationType: "create" });
    const op2 = log.append({ entityType: "campaign", entityId: "c2", operationType: "create" });

    const count = log.markSynced([op1.id, op2.id]);
    expect(count).toBe(2);
    expect(log.getPending().length).toBe(0);
  });

  it("markSynced with resolution records the resolution strategy", () => {
    const op = log.append({ entityType: "campaign", entityId: "c1", operationType: "update" });
    log.markSynced(op.id, "merged");
    expect(log.get(op.id)!.conflictResolution).toBe("merged");
  });

  it("compact removes old synced operations", () => {
    const op = log.append({ entityType: "campaign", entityId: "c1", operationType: "create" });
    log.markSynced(op.id);

    // Compact with a future cutoff
    const removed = log.compact(Date.now() + 1000);
    expect(removed).toBe(1);
    expect(log.length).toBe(0);
  });

  it("compact preserves unsynced operations", () => {
    log.append({ entityType: "campaign", entityId: "c1", operationType: "create" });
    const removed = log.compact(Date.now() + 1000);
    expect(removed).toBe(0);
    expect(log.length).toBe(1);
  });

  it("getByEntity returns operations for a specific entity", () => {
    log.append({ entityType: "campaign", entityId: "c1", operationType: "create" });
    log.append({ entityType: "campaign", entityId: "c1", operationType: "update", field: "name", value: "New" });
    log.append({ entityType: "campaign", entityId: "c2", operationType: "create" });

    const ops = log.getByEntity("campaign", "c1");
    expect(ops.length).toBe(2);
  });

  it("incrementRetry increases retry count", () => {
    const op = log.append({ entityType: "campaign", entityId: "c1", operationType: "update" });
    expect(op.retryCount).toBe(0);

    const count = log.incrementRetry(op.id);
    expect(count).toBe(1);

    const count2 = log.incrementRetry(op.id);
    expect(count2).toBe(2);
  });

  it("incrementRetry returns -1 for non-existent operation", () => {
    const count = log.incrementRetry("nonexistent");
    expect(count).toBe(-1);
  });
});

// ─── Test Helpers ────────────────────────────────────────────────────────────

function makeOp(
  nodeId: string,
  entityType: string,
  entityId: string,
  operationType: "create" | "update" | "delete",
  field: string | null,
  value: unknown
) {
  return {
    id: `op_${Math.random().toString(36).slice(2)}`,
    entityType,
    entityId,
    operationType,
    field,
    value,
    previousValue: null,
    timestamp: Date.now(),
    nodeId,
    synced: false,
    syncedAt: null,
    conflictResolution: null,
    retryCount: 0,
  } as const;
}
