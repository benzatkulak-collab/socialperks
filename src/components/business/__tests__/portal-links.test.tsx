import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { BusinessPortal } from "../portal";
import type { SeedBusiness } from "@/lib/seed";
import { createSeedData } from "@/lib/seed";

const apiFetch = vi.fn();
vi.mock("@/lib/api/csrf-fetch", () => ({ apiFetch: (...a: unknown[]) => apiFetch(...a) }));
vi.mock("@/lib/hooks/use-business-dashboard", () => ({
  useBusinessDashboard: () => ({
    stats: { activeCampaigns: 0, completions: 0, reviews: 0, marketingValue: 0 },
    loading: false,
    refresh: vi.fn(),
  }),
}));
vi.mock("@/lib/hooks/use-realtime", () => ({
  useRealtime: () => ({ connected: false, lastEvent: null, subscribe: () => () => {} }),
}));

const biz: SeedBusiness = {
  id: "b1", name: "Test Coffee", type: "Coffee Shop", email: "test@demo.com", pin: "1234",
  avatar: "☕", size: "small", location: "Portland, OR", industry: "Coffee Shop",
};

const sub = (id: string, status = "approved") => ({
  id, campaignId: "camp_1", userId: "cust_1", actionId: "ig_st", status, proofUrl: "",
  submittedAt: "2026-11-20T10:00:00Z", reviewedAt: null, metadata: {},
});

function respond(list: unknown[]) {
  apiFetch.mockImplementation(async (url: string) => ({
    ok: true,
    json: async () =>
      url.startsWith("/api/v1/submissions")
        ? { success: true, data: { submissions: list, total: list.length } }
        : { success: true, data: {} },
  }));
}

const scrollIntoView = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  Element.prototype.scrollIntoView = scrollIntoView;
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, json: async () => ({}) })));
});
afterEach(() => {
  window.history.replaceState(null, "", "/");
  vi.unstubAllGlobals();
});

const mount = () => render(<BusinessPortal biz={biz} data={createSeedData()} save={vi.fn()} onLogout={vi.fn()} />);

describe("portal deep link to a submission", () => {
  it("?tab=submissions opens the Submissions view", async () => {
    respond([sub("sub_1")]);
    window.history.replaceState(null, "", "/dashboard?tab=submissions");
    mount();
    expect(await screen.findByRole("heading", { name: "Submissions" })).toBeInTheDocument();
  });

  it("&submission= highlights that submission and scrolls to it, in any status", async () => {
    respond([sub("sub_1"), sub("sub_2")]);
    window.history.replaceState(null, "", "/dashboard?tab=submissions&submission=sub_2");
    mount();
    const el = await waitFor(() => {
      const e = document.getElementById("submission-sub_2");
      expect(e).not.toBeNull();
      return e!;
    });
    expect(el.getAttribute("data-highlighted")).toBe("true");
    expect(document.getElementById("submission-sub_1")!.getAttribute("data-highlighted")).toBeNull();
    await waitFor(() => expect(scrollIntoView).toHaveBeenCalled());
    // the list loaded unfiltered, so a decided submission can be found
    expect(apiFetch.mock.calls.some((c) => String(c[0]).startsWith("/api/v1/submissions?") && !String(c[0]).includes("status="))).toBe(true);
  });

  it("an id that is not in the list breaks nothing and highlights nothing", async () => {
    respond([sub("sub_1")]);
    window.history.replaceState(null, "", "/dashboard?tab=submissions&submission=ghost");
    mount();
    await waitFor(() => expect(document.getElementById("submission-sub_1")).not.toBeNull());
    expect(document.querySelector("[data-highlighted]")).toBeNull();
    expect(scrollIntoView).not.toHaveBeenCalled();
  });
});
