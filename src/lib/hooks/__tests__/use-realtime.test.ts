// @vitest-environment happy-dom
/**
 * useRealtime: the business portal's live connection. The portal shows a
 * "New submission received!" toast for each `submission.created` it hears.
 *
 * - It signs in with the access cookie and sends only the business it asks
 *   for. It used to open the stream with nothing the server reads, so every
 *   connection got 401 and it gave up after six tries.
 * - The server names every event (`event: submission.created`). The hook
 *   used to listen on `onmessage`, which hears only unnamed events, so even a
 *   stream that connected passed nothing to a subscriber.
 *
 * All ids here are made up.
 */
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { FakeEventSource } from "@/__tests__/helpers/fake-event-source";
import { apiFetch } from "@/lib/api/csrf-fetch";
import { useRealtime, type RealtimeEvent } from "../use-realtime";

vi.mock("@/lib/api/csrf-fetch", () => ({ apiFetch: vi.fn() }));
const apiFetchMock = vi.mocked(apiFetch);

beforeEach(() => {
  FakeEventSource.reset();
  vi.stubGlobal("EventSource", FakeEventSource);
  apiFetchMock.mockReset();
  apiFetchMock.mockResolvedValue(new Response(null, { status: 200 }));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

it("connects for the signed-in business and passes a submission.created event to its subscriber", async () => {
  const { result } = renderHook(() => useRealtime({ businessId: "biz_test_alpha" }));
  await waitFor(() => expect(FakeEventSource.instances).toHaveLength(1));
  expect(apiFetchMock).toHaveBeenCalledWith("/api/v1/events?businessId=biz_test_alpha", { method: "HEAD" });
  expect(FakeEventSource.latest().url).toBe("/api/v1/events?businessId=biz_test_alpha");

  const heard: RealtimeEvent[] = [];
  act(() => {
    result.current.subscribe("submission.created", (event) => heard.push(event));
  });
  act(() => FakeEventSource.latest().emit("connected", { businessId: "biz_test_alpha" }));
  expect(result.current.connected).toBe(true);

  act(() => FakeEventSource.latest().emit("submission.created", { submissionId: "sub_test_1", campaignId: "cmp_test_1" }));
  expect(heard).toHaveLength(1);
  expect(heard[0]).toMatchObject({
    type: "submission.created",
    payload: { submissionId: "sub_test_1", campaignId: "cmp_test_1" },
  });
  expect(result.current.lastEvent?.type).toBe("submission.created");
});

it("passes every published event to a \"*\" subscriber, and no heartbeat", async () => {
  const { result } = renderHook(() => useRealtime({ businessId: "biz_test_alpha" }));
  await waitFor(() => expect(FakeEventSource.instances).toHaveLength(1));
  const heard: string[] = [];
  act(() => {
    result.current.subscribe("*", (event) => heard.push(event.type));
  });
  act(() => {
    const source = FakeEventSource.latest();
    source.emit("connected", {});
    source.emit("campaign.paused", { campaignId: "cmp_test_1" });
    source.emit("heartbeat", { timestamp: "2026-11-26T12:00:30.000Z" });
    source.emit("submission.approved", { submissionId: "sub_test_1" });
  });
  expect(heard).toEqual(["campaign.paused", "submission.approved"]);
});

it("stops hearing an event once its subscriber unsubscribes", async () => {
  const { result } = renderHook(() => useRealtime({ businessId: "biz_test_alpha" }));
  await waitFor(() => expect(FakeEventSource.instances).toHaveLength(1));
  const handler = vi.fn();
  let unsubscribe = () => {};
  act(() => {
    unsubscribe = result.current.subscribe("submission.created", handler);
  });
  act(() => unsubscribe());
  act(() => FakeEventSource.latest().emit("submission.created", { submissionId: "sub_test_1" }));
  expect(handler).not.toHaveBeenCalled();
});

it("closes the stream when the portal goes away", async () => {
  const { result, unmount } = renderHook(() => useRealtime({ businessId: "biz_test_alpha" }));
  await waitFor(() => expect(FakeEventSource.instances).toHaveLength(1));
  act(() => FakeEventSource.latest().emit("connected", {}));
  expect(result.current.connected).toBe(true);
  unmount();
  expect(FakeEventSource.latest().closed).toBe(true);
});

it("does not connect while it is turned off", async () => {
  renderHook(() => useRealtime({ businessId: "biz_test_alpha", enabled: false }));
  await act(async () => {});
  expect(apiFetchMock).not.toHaveBeenCalled();
  expect(FakeEventSource.instances).toHaveLength(0);
});
