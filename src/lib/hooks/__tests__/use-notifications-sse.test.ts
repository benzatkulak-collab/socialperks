// @vitest-environment happy-dom
/**
 * useNotificationsSSE: the bell in both portals.
 *
 * It used to wait for a token the portals read from `document.cookie`. The
 * access cookie is HttpOnly, so `document.cookie` never holds it: the token
 * was always null and the bell never connected. It now connects with the
 * cookie, which the browser sends by itself.
 *
 * All ids and names here are made up.
 */
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { FakeEventSource } from "@/__tests__/helpers/fake-event-source";
import { apiFetch } from "@/lib/api/csrf-fetch";
import { _closeAllEventStreams } from "@/lib/realtime/event-stream";
import { useNotificationsSSE } from "../use-notifications-sse";

vi.mock("@/lib/api/csrf-fetch", () => ({ apiFetch: vi.fn() }));
const apiFetchMock = vi.mocked(apiFetch);

beforeEach(() => {
  FakeEventSource.reset();
  vi.stubGlobal("EventSource", FakeEventSource);
  apiFetchMock.mockReset();
  apiFetchMock.mockResolvedValue(new Response(null, { status: 200 }));
});

afterEach(() => {
  _closeAllEventStreams();
  vi.unstubAllGlobals();
});

it("connects with the sign-in cookie, with no token handed to it, and lists a new submission", async () => {
  const { result } = renderHook(() => useNotificationsSSE());
  await waitFor(() => expect(FakeEventSource.instances).toHaveLength(1));
  expect(apiFetchMock).toHaveBeenCalledWith("/api/v1/events", { method: "HEAD" });
  expect(FakeEventSource.latest().url).toBe("/api/v1/events");

  act(() => FakeEventSource.latest().emit("connected", {}));
  expect(result.current.connected).toBe(true);

  act(() =>
    FakeEventSource.latest().emit("submission.created", { submissionId: "sub_test_1", campaignName: "Test Latte Week" }),
  );
  expect(result.current.notifications).toHaveLength(1);
  expect(result.current.notifications[0].message).toBe("New submission for Test Latte Week");
  expect(result.current.unreadCount).toBe(1);
});

it("keeps the newest 20", async () => {
  const { result } = renderHook(() => useNotificationsSSE());
  await waitFor(() => expect(FakeEventSource.instances).toHaveLength(1));
  act(() => {
    for (let n = 1; n <= 25; n++) {
      FakeEventSource.latest().emit("campaign.created", { campaignId: `cmp_test_${n}`, name: `Test Campaign ${n}` });
    }
  });
  expect(result.current.notifications).toHaveLength(20);
  expect(result.current.notifications[0].message).toBe("Campaign Test Campaign 25 is now live");
});

it("closes the stream when the bell goes away", async () => {
  const { unmount } = renderHook(() => useNotificationsSSE());
  await waitFor(() => expect(FakeEventSource.instances).toHaveLength(1));
  unmount();
  expect(FakeEventSource.latest().closed).toBe(true);
});

it("does not connect while it is turned off", async () => {
  renderHook(() => useNotificationsSSE({ enabled: false }));
  await act(async () => {});
  expect(apiFetchMock).not.toHaveBeenCalled();
});
