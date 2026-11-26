/**
 * The bell connects by itself, with the sign-in cookie: the portals no longer
 * hand it a token, which they used to read from `document.cookie` and which
 * was always null (the access cookie is HttpOnly).
 *
 * All names here are made up.
 */
import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { FakeEventSource } from "@/__tests__/helpers/fake-event-source";
import { apiFetch } from "@/lib/api/csrf-fetch";
import { _closeAllEventStreams } from "@/lib/realtime/event-stream";
import { NotificationCenter } from "../notification-center";

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

it("counts a submission that arrives on the stream as unread", async () => {
  render(<NotificationCenter />);
  await waitFor(() => expect(FakeEventSource.instances).toHaveLength(1));
  expect(screen.getByRole("button", { name: "Notifications" })).toBeInTheDocument();

  act(() => {
    FakeEventSource.latest().emit("connected", {});
    FakeEventSource.latest().emit("submission.created", { submissionId: "sub_test_1", campaignName: "Test Latte Week" });
  });

  expect(screen.getByRole("button", { name: "Notifications (1 unread)" })).toBeInTheDocument();
});
