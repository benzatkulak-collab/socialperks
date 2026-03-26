import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  EventStore,
  ConcurrencyError,
  SnapshotStore,
  ProjectionManager,
  SagaOrchestrator,
} from "../index";
import type { DomainEvent, Projection, SagaDefinition } from "../index";

// ═══════════════════════════════════════════════════════════════════════════════
// EVENT STORE
// ═══════════════════════════════════════════════════════════════════════════════

describe("EventStore", () => {
  let store: EventStore;

  beforeEach(() => {
    store = new EventStore();
  });

  it("appends events to a new stream with version starting at 0", () => {
    const events = store.append("agg-1", [
      { aggregateType: "campaign", eventType: "campaign.created", payload: { name: "Test" } },
    ], 0);
    expect(events.length).toBe(1);
    expect(events[0].version).toBe(1);
    expect(events[0].aggregateId).toBe("agg-1");
    expect(events[0].eventType).toBe("campaign.created");
  });

  it("appends multiple events in one call", () => {
    const events = store.append("agg-2", [
      { aggregateType: "campaign", eventType: "campaign.created", payload: {} },
      { aggregateType: "campaign", eventType: "campaign.launched", payload: {} },
    ], 0);
    expect(events.length).toBe(2);
    expect(events[0].version).toBe(1);
    expect(events[1].version).toBe(2);
  });

  it("getStream returns the full stream", () => {
    store.append("agg-3", [
      { aggregateType: "campaign", eventType: "campaign.created", payload: {} },
      { aggregateType: "campaign", eventType: "campaign.launched", payload: {} },
    ], 0);

    const stream = store.getStream("agg-3");
    expect(stream).not.toBeNull();
    expect(stream!.events.length).toBe(2);
    expect(stream!.version).toBe(2);
  });

  it("getStream returns null for non-existent aggregate", () => {
    const stream = store.getStream("nonexistent");
    expect(stream).toBeNull();
  });

  it("enforces optimistic concurrency", () => {
    store.append("agg-4", [
      { aggregateType: "campaign", eventType: "campaign.created", payload: {} },
    ], 0);

    // Try to append with wrong expectedVersion
    expect(() =>
      store.append("agg-4", [
        { aggregateType: "campaign", eventType: "campaign.launched", payload: {} },
      ], 0) // should be 1
    ).toThrow(ConcurrencyError);
  });

  it("ConcurrencyError has correct properties", () => {
    store.append("agg-5", [
      { aggregateType: "campaign", eventType: "campaign.created", payload: {} },
    ], 0);

    try {
      store.append("agg-5", [
        { aggregateType: "campaign", eventType: "campaign.launched", payload: {} },
      ], 0);
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(ConcurrencyError);
      const ce = err as ConcurrencyError;
      expect(ce.aggregateId).toBe("agg-5");
      expect(ce.expectedVersion).toBe(0);
      expect(ce.actualVersion).toBe(1);
    }
  });

  it("skips concurrency check when expectedVersion is -1", () => {
    store.append("agg-6", [
      { aggregateType: "campaign", eventType: "campaign.created", payload: {} },
    ], 0);

    // Should not throw with -1
    const events = store.append("agg-6", [
      { aggregateType: "campaign", eventType: "campaign.launched", payload: {} },
    ], -1);
    expect(events.length).toBe(1);
    expect(events[0].version).toBe(2);
  });

  it("subscribe receives events", () => {
    const received: DomainEvent[] = [];
    store.subscribe("campaign.created", (evt) => received.push(evt));

    store.append("agg-7", [
      { aggregateType: "campaign", eventType: "campaign.created", payload: { name: "Hello" } },
    ], 0);

    expect(received.length).toBe(1);
    expect(received[0].payload.name).toBe("Hello");
  });

  it("wildcard subscriber receives all events", () => {
    const received: DomainEvent[] = [];
    store.subscribe("*", (evt) => received.push(evt));

    store.append("agg-8", [
      { aggregateType: "campaign", eventType: "campaign.created", payload: {} },
      { aggregateType: "campaign", eventType: "campaign.launched", payload: {} },
    ], 0);

    expect(received.length).toBe(2);
  });

  it("unsubscribe stops receiving events", () => {
    const received: DomainEvent[] = [];
    const unsub = store.subscribe("*", (evt) => received.push(evt));

    store.append("agg-9", [
      { aggregateType: "campaign", eventType: "campaign.created", payload: {} },
    ], 0);
    expect(received.length).toBe(1);

    unsub();

    store.append("agg-9", [
      { aggregateType: "campaign", eventType: "campaign.launched", payload: {} },
    ], 1);
    expect(received.length).toBe(1); // No new events
  });

  it("subscriber errors do not break the pipeline", () => {
    store.subscribe("*", () => { throw new Error("boom"); });
    const received: DomainEvent[] = [];
    store.subscribe("*", (evt) => received.push(evt));

    store.append("agg-10", [
      { aggregateType: "campaign", eventType: "campaign.created", payload: {} },
    ], 0);

    expect(received.length).toBe(1);
  });

  it("getStreamFromVersion returns events after a given version", () => {
    store.append("agg-11", [
      { aggregateType: "campaign", eventType: "campaign.created", payload: {} },
      { aggregateType: "campaign", eventType: "campaign.launched", payload: {} },
      { aggregateType: "campaign", eventType: "campaign.paused", payload: {} },
    ], 0);

    const stream = store.getStreamFromVersion("agg-11", 1);
    expect(stream).not.toBeNull();
    expect(stream!.events.length).toBe(2);
    expect(stream!.events[0].version).toBe(2);
  });

  it("tracks aggregate and event counts", () => {
    store.append("a", [{ aggregateType: "t", eventType: "e1", payload: {} }], 0);
    store.append("b", [{ aggregateType: "t", eventType: "e2", payload: {} }], 0);

    expect(store.aggregateCount).toBe(2);
    expect(store.totalEventCount).toBe(2);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SNAPSHOT STORE
// ═══════════════════════════════════════════════════════════════════════════════

describe("SnapshotStore", () => {
  let snapStore: SnapshotStore;

  beforeEach(() => {
    snapStore = new SnapshotStore(5);
  });

  it("saves and loads a snapshot", () => {
    snapStore.save("agg-1", "campaign", 10, { status: "active", count: 5 });
    const loaded = snapStore.load("agg-1");
    expect(loaded).not.toBeNull();
    expect(loaded!.version).toBe(10);
    expect(loaded!.state).toEqual({ status: "active", count: 5 });
  });

  it("returns null for non-existent snapshot", () => {
    const loaded = snapStore.load("nonexistent");
    expect(loaded).toBeNull();
  });

  it("overwrites previous snapshot for same aggregate", () => {
    snapStore.save("agg-2", "campaign", 5, { v: 1 });
    snapStore.save("agg-2", "campaign", 10, { v: 2 });
    const loaded = snapStore.load("agg-2");
    expect(loaded!.version).toBe(10);
    expect(loaded!.state).toEqual({ v: 2 });
  });

  it("shouldSnapshot returns true when frequency threshold reached", () => {
    expect(snapStore.shouldSnapshot(5, 0)).toBe(true);
    expect(snapStore.shouldSnapshot(10, 5)).toBe(true);
  });

  it("shouldSnapshot returns false when below frequency threshold", () => {
    expect(snapStore.shouldSnapshot(3, 0)).toBe(false);
    expect(snapStore.shouldSnapshot(7, 5)).toBe(false);
  });

  it("tracks size correctly", () => {
    expect(snapStore.size).toBe(0);
    snapStore.save("a", "t", 1, {});
    snapStore.save("b", "t", 1, {});
    expect(snapStore.size).toBe(2);
  });

  it("_reset clears all snapshots", () => {
    snapStore.save("a", "t", 1, {});
    snapStore._reset();
    expect(snapStore.size).toBe(0);
    expect(snapStore.load("a")).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PROJECTION MANAGER
// ═══════════════════════════════════════════════════════════════════════════════

describe("ProjectionManager", () => {
  let manager: ProjectionManager;

  function createMockProjection(name: string): Projection & { events: DomainEvent[] } {
    const events: DomainEvent[] = [];
    return {
      name,
      version: 0,
      events,
      async handleEvent(event: DomainEvent) {
        events.push(event);
      },
      async rebuild(allEvents: DomainEvent[]) {
        events.length = 0;
        events.push(...allEvents);
      },
    };
  }

  beforeEach(() => {
    manager = new ProjectionManager();
  });

  it("registers and routes events to projections", async () => {
    const proj = createMockProjection("test-proj");
    manager.register(proj);

    const event: DomainEvent = {
      id: "e1",
      aggregateId: "a1",
      aggregateType: "campaign",
      eventType: "campaign.created",
      version: 1,
      payload: {},
      metadata: { timestamp: new Date().toISOString() },
      createdAt: new Date().toISOString(),
    };

    await manager.processEvent(event);
    expect(proj.events.length).toBe(1);
    expect(proj.version).toBe(1);
  });

  it("routes events to multiple projections", async () => {
    const p1 = createMockProjection("p1");
    const p2 = createMockProjection("p2");
    manager.register(p1);
    manager.register(p2);

    const event: DomainEvent = {
      id: "e2",
      aggregateId: "a2",
      aggregateType: "campaign",
      eventType: "campaign.launched",
      version: 1,
      payload: {},
      metadata: { timestamp: new Date().toISOString() },
      createdAt: new Date().toISOString(),
    };

    await manager.processEvent(event);
    expect(p1.events.length).toBe(1);
    expect(p2.events.length).toBe(1);
  });

  it("rebuilds a specific projection", async () => {
    const proj = createMockProjection("rebuild-proj");
    manager.register(proj);

    const events: DomainEvent[] = [
      { id: "e1", aggregateId: "a1", aggregateType: "c", eventType: "e1", version: 1, payload: {}, metadata: { timestamp: "" }, createdAt: "" },
      { id: "e2", aggregateId: "a1", aggregateType: "c", eventType: "e2", version: 2, payload: {}, metadata: { timestamp: "" }, createdAt: "" },
    ];

    await manager.rebuildProjection("rebuild-proj", events);
    expect(proj.events.length).toBe(2);
    expect(proj.version).toBe(2);
  });

  it("rebuildProjection throws for unknown projection", async () => {
    await expect(manager.rebuildProjection("unknown", [])).rejects.toThrow(/not found/);
  });

  it("getProjectionStatus returns status for all projections", async () => {
    manager.register(createMockProjection("s1"));
    manager.register(createMockProjection("s2"));
    const statuses = manager.getProjectionStatus();
    expect(statuses.length).toBe(2);
    expect(statuses[0].name).toBe("s1");
    expect(statuses[1].name).toBe("s2");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SAGA ORCHESTRATOR
// ═══════════════════════════════════════════════════════════════════════════════

describe("SagaOrchestrator", () => {
  let orchestrator: SagaOrchestrator;

  beforeEach(() => {
    orchestrator = new SagaOrchestrator();
  });

  it("runs a saga to completion when all steps succeed", async () => {
    const log: string[] = [];

    orchestrator.define({
      name: "test-saga",
      steps: [
        {
          name: "step1",
          execute: async () => { log.push("exec1"); return { s1: true }; },
          compensate: async () => { log.push("comp1"); },
        },
        {
          name: "step2",
          execute: async () => { log.push("exec2"); return { s2: true }; },
          compensate: async () => { log.push("comp2"); },
        },
      ],
    });

    const result = await orchestrator.start("test-saga", { initial: true });
    expect(result.status).toBe("completed");
    expect(log).toEqual(["exec1", "exec2"]);
  });

  it("compensates on failure in reverse order", async () => {
    const log: string[] = [];

    orchestrator.define({
      name: "failing-saga",
      steps: [
        {
          name: "step1",
          execute: async () => { log.push("exec1"); return {}; },
          compensate: async () => { log.push("comp1"); },
        },
        {
          name: "step2",
          execute: async () => { log.push("exec2"); return {}; },
          compensate: async () => { log.push("comp2"); },
        },
        {
          name: "step3",
          execute: async () => { throw new Error("Step 3 failed"); },
          compensate: async () => { log.push("comp3"); },
        },
      ],
    });

    const result = await orchestrator.start("failing-saga", {});
    expect(result.status).toBe("failed");
    expect(log).toContain("exec1");
    expect(log).toContain("exec2");
    expect(log).toContain("comp2");
    expect(log).toContain("comp1");
  });

  it("handles a single-step saga", async () => {
    orchestrator.define({
      name: "single-step",
      steps: [
        {
          name: "only",
          execute: async () => ({ done: true }),
          compensate: async () => {},
        },
      ],
    });

    const result = await orchestrator.start("single-step", {});
    expect(result.status).toBe("completed");
  });

  it("returns failed status when first step fails", async () => {
    const log: string[] = [];

    orchestrator.define({
      name: "first-fail",
      steps: [
        {
          name: "step1",
          execute: async () => { throw new Error("fail"); },
          compensate: async () => { log.push("comp1"); },
        },
      ],
    });

    const result = await orchestrator.start("first-fail", {});
    expect(result.status).toBe("failed");
  });

  it("throws for undefined saga definition", async () => {
    await expect(orchestrator.start("nonexistent")).rejects.toThrow(/not found/);
  });
});
