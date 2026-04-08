import { describe, it, expect, beforeEach, vi } from "vitest";
import { CircuitBreaker, CircuitBreakerError, type CircuitState } from "../circuit-breaker";

// ── Helpers ──────────────────────────────────────────────────────────────────

function createBreaker(
  overrides: Partial<{
    name: string;
    failureThreshold: number;
    successThreshold: number;
    timeout: number;
    fallback: () => unknown;
    onStateChange: (from: CircuitState, to: CircuitState) => void;
  }> = {},
  clock?: () => number
) {
  return new CircuitBreaker(
    {
      name: "test",
      failureThreshold: 3,
      successThreshold: 2,
      timeout: 1000,
      ...overrides,
    },
    clock
  );
}

const fail = () => Promise.reject(new Error("service down"));
const succeed = () => Promise.resolve("ok");

// ── Tests ────────────────────────────────────────────────────────────────────

describe("CircuitBreaker", () => {
  // ── Closed State ─────────────────────────────────────────────────────────

  describe("closed state", () => {
    it("passes requests through and returns their result", async () => {
      const cb = createBreaker();
      const result = await cb.execute(() => Promise.resolve(42));
      expect(result).toBe(42);
      expect(cb.getState()).toBe("closed");
    });

    it("propagates errors from the wrapped function", async () => {
      const cb = createBreaker();
      await expect(cb.execute(fail)).rejects.toThrow("service down");
      expect(cb.getState()).toBe("closed"); // below threshold
    });

    it("increments failure count on error", async () => {
      const cb = createBreaker({ failureThreshold: 5 });
      await expect(cb.execute(fail)).rejects.toThrow();
      await expect(cb.execute(fail)).rejects.toThrow();
      const stats = cb.getStats();
      expect(stats.failures).toBe(2);
      expect(stats.totalFailures).toBe(2);
    });

    it("resets failure count on success", async () => {
      const cb = createBreaker({ failureThreshold: 3 });
      // Two failures
      await expect(cb.execute(fail)).rejects.toThrow();
      await expect(cb.execute(fail)).rejects.toThrow();
      expect(cb.getStats().failures).toBe(2);
      // One success resets
      await cb.execute(succeed);
      expect(cb.getStats().failures).toBe(0);
      expect(cb.getState()).toBe("closed");
    });
  });

  // ── Opening the Circuit ──────────────────────────────────────────────────

  describe("closed -> open transition", () => {
    it("opens after reaching failure threshold", async () => {
      const cb = createBreaker({ failureThreshold: 3 });
      await expect(cb.execute(fail)).rejects.toThrow();
      await expect(cb.execute(fail)).rejects.toThrow();
      expect(cb.getState()).toBe("closed");
      await expect(cb.execute(fail)).rejects.toThrow();
      expect(cb.getState()).toBe("open");
    });

    it("fires onStateChange callback when opening", async () => {
      const changes: { from: CircuitState; to: CircuitState }[] = [];
      const cb = createBreaker({
        failureThreshold: 2,
        onStateChange: (from, to) => changes.push({ from, to }),
      });
      await expect(cb.execute(fail)).rejects.toThrow();
      await expect(cb.execute(fail)).rejects.toThrow();
      expect(changes).toContainEqual({ from: "closed", to: "open" });
    });
  });

  // ── Open State ───────────────────────────────────────────────────────────

  describe("open state", () => {
    let cb: CircuitBreaker;

    beforeEach(async () => {
      cb = createBreaker({ failureThreshold: 2 });
      // Trip the circuit open
      await expect(cb.execute(fail)).rejects.toThrow();
      await expect(cb.execute(fail)).rejects.toThrow();
      expect(cb.getState()).toBe("open");
    });

    it("rejects requests immediately with CircuitBreakerError", async () => {
      await expect(cb.execute(succeed)).rejects.toThrow(CircuitBreakerError);
    });

    it("does not call the wrapped function", async () => {
      const fn = vi.fn().mockResolvedValue("should not run");
      try {
        await cb.execute(fn);
      } catch {
        // expected
      }
      expect(fn).not.toHaveBeenCalled();
    });

    it("calls fallback when provided", async () => {
      const fallbackCb = createBreaker({
        failureThreshold: 2,
        fallback: () => ({ fallback: true }),
      });
      await expect(fallbackCb.execute(fail)).rejects.toThrow();
      await expect(fallbackCb.execute(fail)).rejects.toThrow();
      expect(fallbackCb.getState()).toBe("open");

      const result = await fallbackCb.execute(succeed);
      expect(result).toEqual({ fallback: true });
    });
  });

  // ── Open -> Half-Open Transition ─────────────────────────────────────────

  describe("open -> half_open transition", () => {
    it("transitions to half_open after timeout expires", async () => {
      let now = 1000;
      const cb = createBreaker(
        { failureThreshold: 2, timeout: 5000 },
        () => now
      );

      // Trip open
      await expect(cb.execute(fail)).rejects.toThrow();
      await expect(cb.execute(fail)).rejects.toThrow();
      expect(cb.getState()).toBe("open");

      // Still open before timeout
      now += 4999;
      expect(cb.getState()).toBe("open");

      // Half-open after timeout
      now += 1;
      expect(cb.getState()).toBe("half_open");
    });
  });

  // ── Half-Open State ──────────────────────────────────────────────────────

  describe("half_open state", () => {
    function createHalfOpenBreaker(overrides?: {
      successThreshold?: number;
      fallback?: () => unknown;
    }) {
      let now = 1000;
      const cb = createBreaker(
        {
          failureThreshold: 2,
          successThreshold: overrides?.successThreshold ?? 2,
          timeout: 5000,
          fallback: overrides?.fallback,
        },
        () => now
      );
      const advanceToHalfOpen = async () => {
        await expect(cb.execute(fail)).rejects.toThrow();
        await expect(cb.execute(fail)).rejects.toThrow();
        now += 5000;
        expect(cb.getState()).toBe("half_open");
      };
      return { cb, advanceToHalfOpen, setNow: (n: number) => { now = n; } };
    }

    it("allows a limited request through", async () => {
      const { cb, advanceToHalfOpen } = createHalfOpenBreaker();
      await advanceToHalfOpen();

      const result = await cb.execute(succeed);
      expect(result).toBe("ok");
    });

    it("closes after successThreshold successes", async () => {
      const { cb, advanceToHalfOpen } = createHalfOpenBreaker({ successThreshold: 2 });
      await advanceToHalfOpen();

      await cb.execute(succeed);
      expect(cb.getState()).toBe("half_open"); // 1 of 2
      await cb.execute(succeed);
      expect(cb.getState()).toBe("closed"); // 2 of 2
    });

    it("opens again on any failure", async () => {
      const { cb, advanceToHalfOpen } = createHalfOpenBreaker();
      await advanceToHalfOpen();

      await expect(cb.execute(fail)).rejects.toThrow();
      expect(cb.getState()).toBe("open");
    });

    it("rejects concurrent requests beyond the probe limit", async () => {
      const { cb, advanceToHalfOpen } = createHalfOpenBreaker();
      await advanceToHalfOpen();

      // First request takes a while
      const slow = new Promise<string>((resolve) =>
        setTimeout(() => resolve("slow"), 50)
      );
      const first = cb.execute(() => slow);

      // Second request should be rejected (probe already in flight)
      await expect(cb.execute(succeed)).rejects.toThrow(CircuitBreakerError);

      // First request completes fine
      const result = await first;
      expect(result).toBe("slow");
    });

    it("uses fallback for concurrent requests when configured", async () => {
      const { cb, advanceToHalfOpen } = createHalfOpenBreaker({
        fallback: () => "fallback-value",
      });
      await advanceToHalfOpen();

      // First request takes a while
      const slow = new Promise<string>((resolve) =>
        setTimeout(() => resolve("slow"), 50)
      );
      const first = cb.execute(() => slow);

      // Second concurrent request gets fallback
      const second = await cb.execute(succeed);
      expect(second).toBe("fallback-value");

      await first; // clean up
    });
  });

  // ── Stats Tracking ───────────────────────────────────────────────────────

  describe("stats tracking", () => {
    it("tracks total requests, failures, and successes", async () => {
      const cb = createBreaker({ failureThreshold: 10 });

      await cb.execute(succeed);
      await cb.execute(succeed);
      await expect(cb.execute(fail)).rejects.toThrow();
      await cb.execute(succeed);

      const stats = cb.getStats();
      expect(stats.totalRequests).toBe(4);
      expect(stats.totalSuccesses).toBe(3);
      expect(stats.totalFailures).toBe(1);
    });

    it("records lastFailure and lastSuccess timestamps", async () => {
      let now = 1000;
      const cb = createBreaker({ failureThreshold: 10 }, () => now);

      now = 2000;
      await cb.execute(succeed);
      now = 3000;
      await expect(cb.execute(fail)).rejects.toThrow();

      const stats = cb.getStats();
      expect(stats.lastSuccess).toBe(new Date(2000).toISOString());
      expect(stats.lastFailure).toBe(new Date(3000).toISOString());
    });

    it("records state change history", async () => {
      let now = 1000;
      const cb = createBreaker(
        { failureThreshold: 2, successThreshold: 1, timeout: 1000 },
        () => now
      );

      // closed -> open
      await expect(cb.execute(fail)).rejects.toThrow();
      await expect(cb.execute(fail)).rejects.toThrow();

      // open -> half_open
      now += 1000;

      // half_open -> closed
      await cb.execute(succeed);

      const changes = cb.getStats().stateChanges;
      expect(changes.length).toBe(3);
      expect(changes[0]).toMatchObject({ from: "closed", to: "open" });
      expect(changes[1]).toMatchObject({ from: "open", to: "half_open" });
      expect(changes[2]).toMatchObject({ from: "half_open", to: "closed" });
    });
  });

  // ── State Change Callbacks ───────────────────────────────────────────────

  describe("state change callbacks", () => {
    it("fires on every transition", async () => {
      let now = 1000;
      const changes: { from: CircuitState; to: CircuitState }[] = [];
      const cb = createBreaker(
        {
          failureThreshold: 2,
          successThreshold: 1,
          timeout: 1000,
          onStateChange: (from, to) => changes.push({ from, to }),
        },
        () => now
      );

      // closed -> open
      await expect(cb.execute(fail)).rejects.toThrow();
      await expect(cb.execute(fail)).rejects.toThrow();

      // open -> half_open
      now += 1000;
      cb.getState(); // trigger transition check

      // half_open -> closed
      await cb.execute(succeed);

      expect(changes).toEqual([
        { from: "closed", to: "open" },
        { from: "open", to: "half_open" },
        { from: "half_open", to: "closed" },
      ]);
    });
  });

  // ── Reset ────────────────────────────────────────────────────────────────

  describe("reset", () => {
    it("returns to closed state from open", async () => {
      const cb = createBreaker({ failureThreshold: 2 });
      await expect(cb.execute(fail)).rejects.toThrow();
      await expect(cb.execute(fail)).rejects.toThrow();
      expect(cb.getState()).toBe("open");

      cb.reset();
      expect(cb.getState()).toBe("closed");

      // Should work normally again
      const result = await cb.execute(succeed);
      expect(result).toBe("ok");
    });

    it("records the reset as a state change", async () => {
      const cb = createBreaker({ failureThreshold: 2 });
      await expect(cb.execute(fail)).rejects.toThrow();
      await expect(cb.execute(fail)).rejects.toThrow();

      cb.reset();

      const lastChange = cb.getStats().stateChanges.at(-1);
      expect(lastChange).toMatchObject({ from: "open", to: "closed" });
    });

    it("clears failure count so circuit stays closed", async () => {
      const cb = createBreaker({ failureThreshold: 3 });
      await expect(cb.execute(fail)).rejects.toThrow();
      await expect(cb.execute(fail)).rejects.toThrow();
      expect(cb.getStats().failures).toBe(2);

      cb.reset();
      expect(cb.getStats().failures).toBe(0);

      // One more failure should not open (counter was reset)
      await expect(cb.execute(fail)).rejects.toThrow();
      expect(cb.getState()).toBe("closed");
    });

    it("does not record a state change when already closed", () => {
      const cb = createBreaker();
      const changesBefore = cb.getStats().stateChanges.length;
      cb.reset();
      expect(cb.getStats().stateChanges.length).toBe(changesBefore);
    });
  });

  // ── Edge Cases ───────────────────────────────────────────────────────────

  describe("edge cases", () => {
    it("handles async fallback", async () => {
      const cb = createBreaker({
        failureThreshold: 1,
        fallback: () => Promise.resolve("async-fallback"),
      });
      await expect(cb.execute(fail)).rejects.toThrow();
      // Circuit is now open; fallback should resolve
      const result = await cb.execute(succeed);
      expect(result).toBe("async-fallback");
    });

    it("counts open-state rejections as total requests", async () => {
      const cb = createBreaker({ failureThreshold: 1 });
      await expect(cb.execute(fail)).rejects.toThrow(); // 1 request, opens
      try { await cb.execute(succeed); } catch { /* expected */ }
      expect(cb.getStats().totalRequests).toBe(2);
    });

    it("works with failureThreshold of 1", async () => {
      const cb = createBreaker({ failureThreshold: 1 });
      await expect(cb.execute(fail)).rejects.toThrow();
      expect(cb.getState()).toBe("open");
    });

    it("works with successThreshold of 1", async () => {
      let now = 1000;
      const cb = createBreaker(
        { failureThreshold: 1, successThreshold: 1, timeout: 100 },
        () => now
      );
      await expect(cb.execute(fail)).rejects.toThrow();
      now += 100;
      expect(cb.getState()).toBe("half_open");
      await cb.execute(succeed);
      expect(cb.getState()).toBe("closed");
    });
  });
});
