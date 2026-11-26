// @vitest-environment happy-dom
/**
 * The browser side of /api/v1/events: openEventStream, which both realtime
 * hooks use.
 *
 * - The stream signs in with the HttpOnly access cookie, which the browser
 *   sends by itself. No token goes in the URL: page scripts cannot read the
 *   cookie, and a URL ends up in logs.
 * - One connection per stream URL in a page: the business portal's live
 *   updates and its bell share one. Over HTTP/1.1 (`next dev`) a browser
 *   allows six connections to a host, so two streams per tab used them all up
 *   with three tabs open.
 * - Before each connection it asks HEAD /api/v1/events through apiFetch.
 *   EventSource never shows the status of a refused connection; apiFetch
 *   does, and with PR #252 it renews an expired 15-minute cookie on a 401.
 * - The answer decides: 200 connect; 204 (realtime is off on this server, or
 *   there is nothing to stream) and 403 stop for good; 401 asks once more a
 *   minute later and stops as signed out if that is a 401 too. With #252,
 *   apiFetch hands back a 401 as it came whenever it could not renew the
 *   cookie right then: at most one refresh a minute per tab, and sign-in's
 *   5-a-minute limit per address, shared by every tab.
 * - Anything else, and a dropped stream, retries with growing waits: five
 *   failed tries in a row and it gives up. A stream counts as having
 *   connected once it has stayed up five seconds; one dropped sooner is
 *   another failed try.
 * - It starts again after a "signed-out" or "gave-up" stop when the tab is
 *   shown again or the browser comes back online.
 *
 * All ids here are made up.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FakeEventSource } from "@/__tests__/helpers/fake-event-source";
import { apiFetch } from "@/lib/api/csrf-fetch";
import { _closeAllEventStreams, openEventStream, type EventStreamOptions } from "../event-stream";

vi.mock("@/lib/api/csrf-fetch", () => ({ apiFetch: vi.fn() }));
const apiFetchMock = vi.mocked(apiFetch);

const answer = (status: number) => new Response(null, { status });

function start(overrides: Partial<EventStreamOptions> = {}) {
  const calls = {
    events: [] as Array<{ type: string; data: unknown }>,
    connected: [] as boolean[],
    stops: [] as string[],
  };
  const stream = openEventStream({
    businessId: "biz_test_alpha",
    eventTypes: ["submission.created"],
    onEvent: (type, data) => calls.events.push({ type, data }),
    onConnectedChange: (connected) => calls.connected.push(connected),
    onStop: (reason) => calls.stops.push(reason),
    ...overrides,
  });
  return { stream, calls };
}

/** The stream connects, stays up long enough to count, then drops. */
async function connectThenDrop(after = 5_000): Promise<void> {
  FakeEventSource.latest().emit("connected", {});
  await vi.advanceTimersByTimeAsync(after);
  FakeEventSource.latest().fail();
}

function setVisibility(state: "visible" | "hidden"): void {
  Object.defineProperty(document, "visibilityState", { configurable: true, get: () => state });
  document.dispatchEvent(new Event("visibilitychange"));
}

beforeEach(() => {
  vi.useFakeTimers();
  FakeEventSource.reset();
  vi.stubGlobal("EventSource", FakeEventSource);
  apiFetchMock.mockReset();
});

afterEach(() => {
  _closeAllEventStreams();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("openEventStream — connecting", () => {
  it("asks HEAD through apiFetch first, then opens the stream with the cookie and no token in the URL", async () => {
    apiFetchMock.mockResolvedValue(answer(200));
    start();
    expect(FakeEventSource.instances).toHaveLength(0);

    await vi.advanceTimersByTimeAsync(0);

    expect(apiFetchMock).toHaveBeenCalledWith("/api/v1/events?businessId=biz_test_alpha", { method: "HEAD" });
    expect(FakeEventSource.instances).toHaveLength(1);
    expect(FakeEventSource.latest().url).toBe("/api/v1/events?businessId=biz_test_alpha");
    expect(FakeEventSource.latest().url).not.toContain("token=");
  });

  it("sends no query when no business is named", async () => {
    apiFetchMock.mockResolvedValue(answer(200));
    start({ businessId: undefined });
    await vi.advanceTimersByTimeAsync(0);
    expect(apiFetchMock).toHaveBeenCalledWith("/api/v1/events", { method: "HEAD" });
    expect(FakeEventSource.latest().url).toBe("/api/v1/events");
  });

  it("counts as connected on the server's `connected` event, and delivers the named events it was asked for", async () => {
    apiFetchMock.mockResolvedValue(answer(200));
    const { calls } = start();
    await vi.advanceTimersByTimeAsync(0);
    const source = FakeEventSource.latest();

    source.emit("connected", { userId: "usr_test_owner_a", businessId: "biz_test_alpha" });
    source.emit("submission.created", { submissionId: "sub_test_1" });
    source.emit("campaign.paused", { campaignId: "cmp_test_1" });
    source.emit("heartbeat", { timestamp: "2026-11-26T12:00:30.000Z" });

    expect(calls.connected).toEqual([true]);
    expect(calls.events).toEqual([{ type: "submission.created", data: { submissionId: "sub_test_1" } }]);
  });

  it("drops an event whose data is not JSON", async () => {
    apiFetchMock.mockResolvedValue(answer(200));
    const { calls } = start();
    await vi.advanceTimersByTimeAsync(0);
    const source = FakeEventSource.latest();
    source.emit("connected", {});
    source.emitRaw("submission.created", "not json");
    expect(calls.events).toEqual([]);
    expect(calls.connected).toEqual([true]);
  });

  it("does nothing in a browser without EventSource", async () => {
    vi.stubGlobal("EventSource", undefined);
    apiFetchMock.mockResolvedValue(answer(200));
    const { calls } = start();
    await vi.advanceTimersByTimeAsync(0);
    expect(apiFetchMock).not.toHaveBeenCalled();
    expect(calls.stops).toEqual(["unsupported"]);
  });
});

describe("openEventStream — one connection per stream", () => {
  it("shares one connection between subscribers to the same stream; each hears the types it asked for", async () => {
    apiFetchMock.mockResolvedValue(answer(200));
    const toast = start({ eventTypes: ["submission.created"] });
    const bell = start({ eventTypes: ["campaign.created"] });
    await vi.advanceTimersByTimeAsync(0);

    expect(apiFetchMock).toHaveBeenCalledTimes(1);
    expect(FakeEventSource.instances).toHaveLength(1);
    const source = FakeEventSource.latest();
    source.emit("connected", {});
    source.emit("submission.created", { submissionId: "sub_test_1" });
    source.emit("campaign.created", { campaignId: "cmp_test_1" });

    expect(toast.calls.connected).toEqual([true]);
    expect(bell.calls.connected).toEqual([true]);
    expect(toast.calls.events.map((e) => e.type)).toEqual(["submission.created"]);
    expect(bell.calls.events.map((e) => e.type)).toEqual(["campaign.created"]);
  });

  it("tells a subscriber that joins a connected stream at once, and starts listening for its types", async () => {
    apiFetchMock.mockResolvedValue(answer(200));
    start({ eventTypes: ["submission.created"] });
    await vi.advanceTimersByTimeAsync(0);
    FakeEventSource.latest().emit("connected", {});

    const late = start({ eventTypes: ["campaign.created"] });
    expect(late.calls.connected).toEqual([true]);
    FakeEventSource.latest().emit("campaign.created", { campaignId: "cmp_test_1" });
    expect(late.calls.events.map((e) => e.type)).toEqual(["campaign.created"]);
    expect(FakeEventSource.instances).toHaveLength(1);
  });

  it("keeps the connection until its last subscriber closes", async () => {
    apiFetchMock.mockResolvedValue(answer(200));
    const first = start();
    const second = start();
    await vi.advanceTimersByTimeAsync(0);
    const source = FakeEventSource.latest();

    first.stream.close();
    expect(source.closed).toBe(false);
    second.stream.close();
    expect(source.closed).toBe(true);
  });

  it("opens a separate connection for a different business", async () => {
    apiFetchMock.mockResolvedValue(answer(200));
    start({ businessId: "biz_test_alpha" });
    start({ businessId: "biz_test_beta" });
    await vi.advanceTimersByTimeAsync(0);
    expect(FakeEventSource.instances.map((s) => s.url).sort()).toEqual([
      "/api/v1/events?businessId=biz_test_alpha",
      "/api/v1/events?businessId=biz_test_beta",
    ]);
  });

  it("tells every subscriber when the stream stops", async () => {
    apiFetchMock.mockResolvedValue(answer(204));
    const first = start();
    const second = start();
    await vi.advanceTimersByTimeAsync(0);
    expect(first.calls.stops).toEqual(["off"]);
    expect(second.calls.stops).toEqual(["off"]);
  });
});

describe("openEventStream — when the stream drops", () => {
  it("asks HEAD again before it reconnects, one second later", async () => {
    apiFetchMock.mockResolvedValue(answer(200));
    const { calls } = start();
    await vi.advanceTimersByTimeAsync(0);
    const first = FakeEventSource.latest();

    await connectThenDrop();
    expect(first.closed).toBe(true);
    expect(calls.connected).toEqual([true, false]);

    await vi.advanceTimersByTimeAsync(999);
    expect(apiFetchMock).toHaveBeenCalledTimes(1);
    expect(FakeEventSource.instances).toHaveLength(1);

    await vi.advanceTimersByTimeAsync(1);
    expect(apiFetchMock).toHaveBeenCalledTimes(2);
    expect(FakeEventSource.instances).toHaveLength(2);
    expect(FakeEventSource.latest().closed).toBe(false);
  });

  it("keeps reconnecting for as long as each new stream stays up five seconds", async () => {
    apiFetchMock.mockResolvedValue(answer(200));
    start();
    await vi.advanceTimersByTimeAsync(0);
    for (let drop = 0; drop < 8; drop++) {
      await connectThenDrop();
      await vi.advanceTimersByTimeAsync(1_000);
    }
    expect(FakeEventSource.instances).toHaveLength(9);
  });

  it("counts a stream that drops within five seconds of connecting as a failed try", async () => {
    apiFetchMock.mockResolvedValue(answer(200));
    const { calls } = start();
    await vi.advanceTimersByTimeAsync(0);
    for (const wait of [1_000, 2_000, 4_000, 8_000, 16_000]) {
      await connectThenDrop(100);
      await vi.advanceTimersByTimeAsync(wait);
    }
    await connectThenDrop(100);
    await vi.advanceTimersByTimeAsync(10 * 60_000);
    expect(FakeEventSource.instances).toHaveLength(6);
    expect(calls.stops).toEqual(["gave-up"]);
  });
});

describe("openEventStream — when to stop", () => {
  it.each([
    [403, "forbidden"],
    [204, "off"],
  ])("stops when the check answers %i (%s), without opening the stream", async (status, reason) => {
    apiFetchMock.mockResolvedValue(answer(status));
    const { calls } = start();
    await vi.advanceTimersByTimeAsync(0);
    expect(calls.stops).toEqual([reason]);

    await vi.advanceTimersByTimeAsync(10 * 60_000);
    expect(apiFetchMock).toHaveBeenCalledTimes(1);
    expect(FakeEventSource.instances).toHaveLength(0);
  });

  it("asks once more a minute after a 401, and stops as signed out when that is a 401 too", async () => {
    apiFetchMock.mockResolvedValue(answer(401));
    const { calls } = start();
    await vi.advanceTimersByTimeAsync(0);
    expect(calls.stops).toEqual([]);

    await vi.advanceTimersByTimeAsync(64_999);
    expect(apiFetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(apiFetchMock).toHaveBeenCalledTimes(2);
    expect(calls.stops).toEqual(["signed-out"]);

    await vi.advanceTimersByTimeAsync(10 * 60_000);
    expect(apiFetchMock).toHaveBeenCalledTimes(2);
    expect(FakeEventSource.instances).toHaveLength(0);
  });

  it("reconnects when the second ask, a minute after a 401, answers 200 (the cookie was renewed meanwhile)", async () => {
    apiFetchMock.mockResolvedValueOnce(answer(200)).mockResolvedValueOnce(answer(401)).mockResolvedValue(answer(200));
    const { calls } = start();
    await vi.advanceTimersByTimeAsync(0);
    await connectThenDrop();

    await vi.advanceTimersByTimeAsync(1_000);
    expect(apiFetchMock).toHaveBeenCalledTimes(2);
    expect(FakeEventSource.instances).toHaveLength(1);

    await vi.advanceTimersByTimeAsync(65_000);
    expect(apiFetchMock).toHaveBeenCalledTimes(3);
    expect(FakeEventSource.instances).toHaveLength(2);
    expect(calls.stops).toEqual([]);
  });

  it("retries a failed check after 1, 2, 4, 8 and 16 seconds, then gives up", async () => {
    apiFetchMock.mockResolvedValueOnce(answer(503)).mockRejectedValue(new TypeError("Failed to fetch"));
    const { calls } = start();
    await vi.advanceTimersByTimeAsync(0);
    let checks = 1;
    for (const wait of [1_000, 2_000, 4_000, 8_000, 16_000]) {
      await vi.advanceTimersByTimeAsync(wait - 1);
      expect(apiFetchMock).toHaveBeenCalledTimes(checks);
      await vi.advanceTimersByTimeAsync(1);
      checks += 1;
      expect(apiFetchMock).toHaveBeenCalledTimes(checks);
    }
    expect(calls.stops).toEqual(["gave-up"]);

    await vi.advanceTimersByTimeAsync(10 * 60_000);
    expect(apiFetchMock).toHaveBeenCalledTimes(6);
    expect(FakeEventSource.instances).toHaveLength(0);
  });

  it("gives up after five streams in a row that never connect", async () => {
    apiFetchMock.mockResolvedValue(answer(200));
    const { calls } = start();
    await vi.advanceTimersByTimeAsync(0);
    for (const wait of [1_000, 2_000, 4_000, 8_000, 16_000]) {
      FakeEventSource.latest().fail();
      await vi.advanceTimersByTimeAsync(wait);
    }
    FakeEventSource.latest().fail();
    await vi.advanceTimersByTimeAsync(10 * 60_000);
    expect(FakeEventSource.instances).toHaveLength(6);
    expect(calls.stops).toEqual(["gave-up"]);
  });
});

describe("openEventStream — starting again after a stop", () => {
  async function giveUp(): Promise<void> {
    apiFetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(31_000);
  }

  it("starts again when the browser comes back online after giving up", async () => {
    const { calls } = start();
    await giveUp();
    expect(calls.stops).toEqual(["gave-up"]);

    apiFetchMock.mockResolvedValue(answer(200));
    window.dispatchEvent(new Event("online"));
    await vi.advanceTimersByTimeAsync(0);
    expect(FakeEventSource.instances).toHaveLength(1);
    FakeEventSource.latest().emit("connected", {});
    expect(calls.connected).toEqual([true]);
  });

  it("starts again when the tab is shown after a signed-out stop", async () => {
    apiFetchMock.mockResolvedValue(answer(401));
    const { calls } = start();
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(65_000);
    expect(calls.stops).toEqual(["signed-out"]);

    apiFetchMock.mockResolvedValue(answer(200));
    setVisibility("hidden");
    await vi.advanceTimersByTimeAsync(0);
    expect(FakeEventSource.instances).toHaveLength(0);
    setVisibility("visible");
    await vi.advanceTimersByTimeAsync(0);
    expect(FakeEventSource.instances).toHaveLength(1);
  });

  it("does not start again a stop the server decided (204, 403)", async () => {
    apiFetchMock.mockResolvedValue(answer(204));
    start();
    await vi.advanceTimersByTimeAsync(0);
    window.dispatchEvent(new Event("online"));
    setVisibility("visible");
    await vi.advanceTimersByTimeAsync(10 * 60_000);
    expect(apiFetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not start again while it is connected", async () => {
    apiFetchMock.mockResolvedValue(answer(200));
    start();
    await vi.advanceTimersByTimeAsync(0);
    FakeEventSource.latest().emit("connected", {});
    window.dispatchEvent(new Event("online"));
    setVisibility("visible");
    await vi.advanceTimersByTimeAsync(0);
    expect(apiFetchMock).toHaveBeenCalledTimes(1);
    expect(FakeEventSource.instances).toHaveLength(1);
  });
});

describe("openEventStream — close()", () => {
  it("closes the stream and starts nothing afterwards", async () => {
    apiFetchMock.mockResolvedValue(answer(200));
    const { stream } = start();
    await vi.advanceTimersByTimeAsync(0);
    const source = FakeEventSource.latest();
    source.emit("connected", {});

    stream.close();
    expect(source.closed).toBe(true);
    await vi.advanceTimersByTimeAsync(10 * 60_000);
    expect(apiFetchMock).toHaveBeenCalledTimes(1);
    expect(FakeEventSource.instances).toHaveLength(1);
  });

  it("opens nothing when the check answers after close()", async () => {
    let answerCheck: (res: Response) => void = () => {};
    apiFetchMock.mockReturnValue(new Promise<Response>((resolve) => (answerCheck = resolve)));
    const { stream, calls } = start();
    stream.close();
    answerCheck(answer(200));
    await vi.advanceTimersByTimeAsync(10 * 60_000);
    expect(FakeEventSource.instances).toHaveLength(0);
    expect(calls.connected).toEqual([]);
  });

  it("cancels a reconnect that was waiting", async () => {
    apiFetchMock.mockResolvedValue(answer(200));
    const { stream } = start();
    await vi.advanceTimersByTimeAsync(0);
    await connectThenDrop();
    stream.close();
    await vi.advanceTimersByTimeAsync(10 * 60_000);
    expect(apiFetchMock).toHaveBeenCalledTimes(1);
    expect(FakeEventSource.instances).toHaveLength(1);
  });

  it("does not start again on online or visibility after close()", async () => {
    apiFetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    const { stream } = start();
    await vi.advanceTimersByTimeAsync(31_000);
    stream.close();
    apiFetchMock.mockClear();
    window.dispatchEvent(new Event("online"));
    setVisibility("visible");
    await vi.advanceTimersByTimeAsync(0);
    expect(apiFetchMock).not.toHaveBeenCalled();
  });
});
