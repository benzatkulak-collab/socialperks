/**
 * The browser side of /api/v1/events: openEventStream, which both realtime
 * hooks use.
 *
 * - The stream signs in with the HttpOnly access cookie, which the browser
 *   sends by itself. No token goes in the URL: page scripts cannot read the
 *   cookie, and a URL ends up in logs.
 * - Before each connection it asks HEAD /api/v1/events through apiFetch.
 *   EventSource never shows the status of a refused connection; apiFetch
 *   does, and renews an expired 15-minute cookie on a 401 (PR #252).
 * - Its answer decides: 200 connect; 204 realtime is off on this server, or
 *   there is nothing to stream; 401 signed out; 403 not allowed. The last
 *   three stop for good. Anything else, and a dropped stream, retries with
 *   growing waits, five times at most until a stream connects again.
 *
 * All ids here are made up.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FakeEventSource } from "@/__tests__/helpers/fake-event-source";
import { apiFetch } from "@/lib/api/csrf-fetch";
import { openEventStream, type EventStreamOptions } from "../event-stream";

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

beforeEach(() => {
  vi.useFakeTimers();
  FakeEventSource.reset();
  vi.stubGlobal("EventSource", FakeEventSource);
  apiFetchMock.mockReset();
});

afterEach(() => {
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

describe("openEventStream — when the stream drops", () => {
  it("asks again (which renews an expired cookie) before it reconnects, one second later", async () => {
    apiFetchMock.mockResolvedValue(answer(200));
    const { calls } = start();
    await vi.advanceTimersByTimeAsync(0);
    const first = FakeEventSource.latest();
    first.emit("connected", {});

    first.fail();
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

  it("keeps reconnecting for as long as each new stream connects", async () => {
    apiFetchMock.mockResolvedValue(answer(200));
    start();
    await vi.advanceTimersByTimeAsync(0);
    for (let drop = 0; drop < 8; drop++) {
      FakeEventSource.latest().emit("connected", {});
      FakeEventSource.latest().fail();
      await vi.advanceTimersByTimeAsync(1_000);
    }
    expect(FakeEventSource.instances).toHaveLength(9);
  });
});

describe("openEventStream — when to stop for good", () => {
  it.each([
    [401, "signed-out"],
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

  it("stops when the sign-in has gone by the time a dropped stream asks again", async () => {
    apiFetchMock.mockResolvedValueOnce(answer(200)).mockResolvedValue(answer(401));
    const { calls } = start();
    await vi.advanceTimersByTimeAsync(0);
    FakeEventSource.latest().emit("connected", {});
    FakeEventSource.latest().fail();

    await vi.advanceTimersByTimeAsync(10 * 60_000);
    expect(apiFetchMock).toHaveBeenCalledTimes(2);
    expect(FakeEventSource.instances).toHaveLength(1);
    expect(calls.stops).toEqual(["signed-out"]);
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
    expect(apiFetchMock).toHaveBeenCalledTimes(6);
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
    FakeEventSource.latest().emit("connected", {});
    FakeEventSource.latest().fail();
    stream.close();
    await vi.advanceTimersByTimeAsync(10 * 60_000);
    expect(apiFetchMock).toHaveBeenCalledTimes(1);
    expect(FakeEventSource.instances).toHaveLength(1);
  });
});
