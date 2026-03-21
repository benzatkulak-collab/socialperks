import { describe, it, expect, beforeEach, vi } from "vitest";
import { EventBus, type RealtimeEvent } from "../index";

describe("EventBus", () => {
  let bus: EventBus;

  beforeEach(() => {
    bus = new EventBus();
  });

  // ---------------------------------------------------------------------------
  // Basic subscribe / publish / unsubscribe
  // ---------------------------------------------------------------------------

  describe("subscribe and publish", () => {
    it("subscriber receives published events", () => {
      const handler = vi.fn();
      bus.subscribe("campaign.created", handler);

      const event: RealtimeEvent = {
        type: "campaign.created",
        payload: { campaignId: "c1" },
        timestamp: new Date().toISOString(),
      };
      bus.publish(event);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(event);
    });

    it("subscriber does not receive events of different type", () => {
      const handler = vi.fn();
      bus.subscribe("campaign.created", handler);

      bus.publish({
        type: "campaign.ended",
        payload: {},
        timestamp: new Date().toISOString(),
      });

      expect(handler).not.toHaveBeenCalled();
    });

    it("subscribe returns a subscription ID", () => {
      const id = bus.subscribe("test", () => {});
      expect(typeof id).toBe("string");
      expect(id.startsWith("sub_")).toBe(true);
    });
  });

  describe("unsubscribe", () => {
    it("unsubscribed handler no longer receives events", () => {
      const handler = vi.fn();
      const subId = bus.subscribe("test.event", handler);

      bus.publish({
        type: "test.event",
        payload: {},
        timestamp: new Date().toISOString(),
      });
      expect(handler).toHaveBeenCalledTimes(1);

      bus.unsubscribe(subId);

      bus.publish({
        type: "test.event",
        payload: {},
        timestamp: new Date().toISOString(),
      });
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it("returns true when subscription existed", () => {
      const subId = bus.subscribe("x", () => {});
      expect(bus.unsubscribe(subId)).toBe(true);
    });

    it("returns false for unknown subscription ID", () => {
      expect(bus.unsubscribe("nonexistent")).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // Targeted events
  // ---------------------------------------------------------------------------

  describe("targeted events (user)", () => {
    it("only reaches the intended user", () => {
      const user1Handler = vi.fn();
      const user2Handler = vi.fn();

      bus.subscribe("notification", user1Handler, { userId: "u1" });
      bus.subscribe("notification", user2Handler, { userId: "u2" });

      bus.publish({
        type: "notification",
        payload: { message: "hello u1" },
        targetUserId: "u1",
        timestamp: new Date().toISOString(),
      });

      expect(user1Handler).toHaveBeenCalledTimes(1);
      expect(user2Handler).not.toHaveBeenCalled();
    });

    it("broadcast events reach all subscribers (no targetUserId)", () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      bus.subscribe("announcement", handler1, { userId: "u1" });
      bus.subscribe("announcement", handler2, { userId: "u2" });

      bus.publish({
        type: "announcement",
        payload: { text: "global" },
        timestamp: new Date().toISOString(),
      });

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
    });
  });

  describe("business-targeted events", () => {
    it("only reaches subscribers of the target business", () => {
      const biz1Handler = vi.fn();
      const biz2Handler = vi.fn();

      bus.subscribe("campaign.update", biz1Handler, { businessId: "b1" });
      bus.subscribe("campaign.update", biz2Handler, { businessId: "b2" });

      bus.publish({
        type: "campaign.update",
        payload: { status: "active" },
        targetBusinessId: "b1",
        timestamp: new Date().toISOString(),
      });

      expect(biz1Handler).toHaveBeenCalledTimes(1);
      expect(biz2Handler).not.toHaveBeenCalled();
    });

    it("broadcast events (no targetBusinessId) reach all business subscribers", () => {
      const biz1 = vi.fn();
      const biz2 = vi.fn();

      bus.subscribe("system.maintenance", biz1, { businessId: "b1" });
      bus.subscribe("system.maintenance", biz2, { businessId: "b2" });

      bus.publish({
        type: "system.maintenance",
        payload: {},
        timestamp: new Date().toISOString(),
      });

      expect(biz1).toHaveBeenCalledTimes(1);
      expect(biz2).toHaveBeenCalledTimes(1);
    });
  });

  // ---------------------------------------------------------------------------
  // Multiple subscribers
  // ---------------------------------------------------------------------------

  describe("multiple subscribers", () => {
    it("all subscribers receive the same event", () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      const handler3 = vi.fn();

      bus.subscribe("perk.awarded", handler1);
      bus.subscribe("perk.awarded", handler2);
      bus.subscribe("perk.awarded", handler3);

      const event: RealtimeEvent = {
        type: "perk.awarded",
        payload: { perkId: "p1", value: 10 },
        timestamp: new Date().toISOString(),
      };
      bus.publish(event);

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
      expect(handler3).toHaveBeenCalledTimes(1);

      // All received the same event object
      expect(handler1).toHaveBeenCalledWith(event);
      expect(handler2).toHaveBeenCalledWith(event);
      expect(handler3).toHaveBeenCalledWith(event);
    });

    it("wildcard subscriber receives all event types", () => {
      const wildcard = vi.fn();
      bus.subscribe("*", wildcard);

      bus.publish({ type: "a", payload: {}, timestamp: new Date().toISOString() });
      bus.publish({ type: "b", payload: {}, timestamp: new Date().toISOString() });
      bus.publish({ type: "c", payload: {}, timestamp: new Date().toISOString() });

      expect(wildcard).toHaveBeenCalledTimes(3);
    });
  });

  // ---------------------------------------------------------------------------
  // Utility methods
  // ---------------------------------------------------------------------------

  describe("utility methods", () => {
    it("size returns the number of subscriptions", () => {
      expect(bus.size).toBe(0);

      bus.subscribe("a", () => {});
      bus.subscribe("b", () => {});

      expect(bus.size).toBe(2);
    });

    it("clear removes all subscriptions", () => {
      bus.subscribe("a", () => {});
      bus.subscribe("b", () => {});

      bus.clear();

      expect(bus.size).toBe(0);
    });
  });
});
