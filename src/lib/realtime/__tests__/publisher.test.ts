import { describe, it, expect, beforeEach, vi } from "vitest";

// Create a fresh EventPublisher for each test to avoid singleton leakage.
// We import the class indirectly by re-reading the module.
import { eventPublisher, type PublishedEvent } from "../publisher";

describe("EventPublisher", () => {
  // Unsubscribe all listeners between tests so the singleton is clean
  let cleanups: (() => void)[] = [];

  beforeEach(() => {
    cleanups.forEach((fn) => fn());
    cleanups = [];
  });

  function sub(cb: (e: PublishedEvent) => void) {
    const unsub = eventPublisher.subscribe(cb);
    cleanups.push(unsub);
    return unsub;
  }

  // ---------------------------------------------------------------------------
  // Basic subscribe / publish
  // ---------------------------------------------------------------------------

  it("subscriber receives published events", () => {
    const handler = vi.fn();
    sub(handler);

    eventPublisher.publish("campaign.created", { id: "c1" });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({
      type: "campaign.created",
      data: { id: "c1" },
      businessId: undefined,
    });
  });

  it("subscriber receives events with businessId", () => {
    const handler = vi.fn();
    sub(handler);

    eventPublisher.publish("campaign.created", { id: "c1" }, "biz_123");

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({
      type: "campaign.created",
      data: { id: "c1" },
      businessId: "biz_123",
    });
  });

  // ---------------------------------------------------------------------------
  // Multiple subscribers
  // ---------------------------------------------------------------------------

  it("multiple subscribers all receive events", () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();
    const handler3 = vi.fn();

    sub(handler1);
    sub(handler2);
    sub(handler3);

    eventPublisher.publish("submission.created", { submissionId: "s1" });

    expect(handler1).toHaveBeenCalledTimes(1);
    expect(handler2).toHaveBeenCalledTimes(1);
    expect(handler3).toHaveBeenCalledTimes(1);
  });

  // ---------------------------------------------------------------------------
  // Unsubscribe
  // ---------------------------------------------------------------------------

  it("unsubscribe stops receiving events", () => {
    const handler = vi.fn();
    const unsub = sub(handler);

    eventPublisher.publish("event.one", { n: 1 });
    expect(handler).toHaveBeenCalledTimes(1);

    unsub();

    eventPublisher.publish("event.two", { n: 2 });
    expect(handler).toHaveBeenCalledTimes(1); // still 1
  });

  it("unsubscribing one listener does not affect others", () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();

    const unsub1 = sub(handler1);
    sub(handler2);

    unsub1();

    eventPublisher.publish("test", {});

    expect(handler1).not.toHaveBeenCalled();
    expect(handler2).toHaveBeenCalledTimes(1);
  });

  // ---------------------------------------------------------------------------
  // businessId filtering (at the SSE layer, the publisher itself broadcasts
  // to all — but we verify the event carries the businessId so consumers
  // can filter)
  // ---------------------------------------------------------------------------

  it("businessId is included in the published event for consumer filtering", () => {
    const events: PublishedEvent[] = [];
    sub((e) => events.push(e));

    eventPublisher.publish("campaign.created", { id: "c1" }, "biz_abc");
    eventPublisher.publish("user.created", { id: "u1" }); // no businessId

    expect(events).toHaveLength(2);
    expect(events[0].businessId).toBe("biz_abc");
    expect(events[1].businessId).toBeUndefined();
  });

  // ---------------------------------------------------------------------------
  // No errors with zero subscribers
  // ---------------------------------------------------------------------------

  it("publishing with no subscribers does not throw", () => {
    expect(() => {
      eventPublisher.publish("orphan.event", { data: "test" });
    }).not.toThrow();
  });

  // ---------------------------------------------------------------------------
  // Broken listener resilience
  // ---------------------------------------------------------------------------

  it("a throwing listener does not prevent other listeners from receiving events", () => {
    const badHandler = vi.fn(() => {
      throw new Error("boom");
    });
    const goodHandler = vi.fn();

    sub(badHandler);
    sub(goodHandler);

    eventPublisher.publish("test", {});

    expect(badHandler).toHaveBeenCalledTimes(1);
    expect(goodHandler).toHaveBeenCalledTimes(1);
  });

  // ---------------------------------------------------------------------------
  // listenerCount
  // ---------------------------------------------------------------------------

  it("listenerCount reflects active listeners", () => {
    const initialCount = eventPublisher.listenerCount;

    const unsub1 = sub(() => {});
    const unsub2 = sub(() => {});

    expect(eventPublisher.listenerCount).toBe(initialCount + 2);

    unsub1();
    expect(eventPublisher.listenerCount).toBe(initialCount + 1);

    unsub2();
    expect(eventPublisher.listenerCount).toBe(initialCount);
  });
});
