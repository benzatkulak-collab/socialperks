// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

let query = "";
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(query) }));
vi.mock("@/components/admin/admin-guard", () => ({ useAdminUser: () => ({ id: "u1", email: "a@example.com", role: "admin" }) }));

import AdminSubmissionsPage from "../page";

const sub = (id: string) => ({
  id, campaignId: `camp_${id}`, userId: "cust_1", actionId: "ig_st", status: "pending",
  proofUrl: "", submittedAt: "2026-11-20T10:00:00Z",
});

const fetchMock = vi.fn();
function route(list: unknown[], one?: { status: number; submission?: unknown }) {
  fetchMock.mockImplementation(async (url: string) => {
    if (url.startsWith("/api/v1/admin/submissions")) {
      return {
        ok: one?.status === 200, status: one?.status ?? 404,
        json: async () => (one?.status === 200
          ? { success: true, data: { submission: one.submission } }
          : { success: false, error: { code: "SUBMISSION_NOT_FOUND", message: "x" } }),
      };
    }
    return { ok: true, status: 200, json: async () => ({ success: true, data: { submissions: list } }) };
  });
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  query = "";
});

const drawerOpen = () => screen.queryByText("Campaign ID");

describe("admin submissions: ?submission=<id>", () => {
  it("opens no drawer without the query", async () => {
    route([sub("sub_1")]);
    render(<AdminSubmissionsPage />);
    await screen.findByText("sub_1…");
    expect(drawerOpen()).toBeNull();
  });

  it("opens the drawer from the loaded list, without asking the route", async () => {
    query = "submission=sub_1";
    route([sub("sub_1"), sub("sub_2")]);
    render(<AdminSubmissionsPage />);
    expect(await screen.findByText("Campaign ID")).toBeInTheDocument();
    expect(screen.getByText("camp_sub_1")).toBeInTheDocument();
    expect(fetchMock.mock.calls.some((c) => String(c[0]).startsWith("/api/v1/admin/submissions"))).toBe(false);
  });

  it("asks the read-one route when the id is not in the list, and opens the drawer", async () => {
    query = "submission=old_9";
    route([sub("sub_1")], { status: 200, submission: { ...sub("old_9"), reviewedAt: null } });
    render(<AdminSubmissionsPage />);
    expect(await screen.findByText("camp_old_9")).toBeInTheDocument();
    const call = fetchMock.mock.calls.find((c) => String(c[0]).startsWith("/api/v1/admin/submissions"))!;
    expect(call[0]).toBe("/api/v1/admin/submissions?id=old_9");
    // read through apiFetch (a signed-in GET), which keeps the session cookie
    expect(call[1]).toMatchObject({ credentials: "include" });
  });

  it("an unknown id leaves the list showing and no drawer", async () => {
    query = "submission=ghost";
    route([sub("sub_1")], { status: 404 });
    render(<AdminSubmissionsPage />);
    await screen.findByText("sub_1…");
    await waitFor(() => expect(fetchMock.mock.calls.some((c) => String(c[0]).startsWith("/api/v1/admin/submissions"))).toBe(true));
    expect(drawerOpen()).toBeNull();
  });
});
