// @vitest-environment happy-dom
/**
 * The business portal shows live updates (useRealtime, for its toast) and a
 * bell (useNotificationsSSE). Both ask for the same business's stream, and
 * they share one connection: over HTTP/1.1 (`next dev`) a browser allows six
 * connections to a host, so two streams per tab used them all up with three
 * portal tabs open, and every other request to the app waited.
 *
 * All ids here are made up.
 */
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { FakeEventSource } from "@/__tests__/helpers/fake-event-source";
import { apiFetch } from "@/lib/api/csrf-fetch";
import { _closeAllEventStreams } from "@/lib/realtime/event-stream";
import { useRealtime } from "../use-realtime";
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

it("opens one connection for the portal's live updates and its bell", async () => {
  const { result } = renderHook(() => ({
    live: useRealtime({ businessId: "biz_test_alpha" }),
    bell: useNotificationsSSE({ businessId: "biz_test_alpha" }),
  }));
  await waitFor(() => expect(FakeEventSource.instances.filter((s) => !s.closed)).toHaveLength(1));
  expect(FakeEventSource.instances.filter((s) => !s.closed)[0].url).toBe("/api/v1/events?businessId=biz_test_alpha");
  expect(result.current.live.connected).toBe(false);
});
