import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BusinessPortal } from "../portal";
import type { SeedBusiness } from "@/lib/seed";
import { createSeedData } from "@/lib/seed";

// Mock the hooks
vi.mock("@/lib/hooks/use-campaigns", () => ({
  useCampaigns: () => ({
    campaigns: [
      { id: "c1", name: "Test Campaign", description: "A test", actions: ["ig_rl"], discountValue: 10, discountType: "pct", category: "social", tier: "essential", aiReason: "good" },
    ],
    filtered: [
      { id: "c1", name: "Test Campaign", description: "A test", actions: ["ig_rl"], discountValue: 10, discountType: "pct", category: "social", tier: "essential", aiReason: "good" },
    ],
    loading: false,
    error: null,
    filters: { search: "", category: "all", tier: "all" },
    setFilters: vi.fn(),
    categories: ["social"],
    tiers: ["essential"],
  }),
}));

vi.mock("@/lib/hooks/use-business-dashboard", () => ({
  useBusinessDashboard: () => ({
    stats: { activeCampaigns: 3, completions: 42, reviews: 15, marketingValue: 2500 },
    loading: false,
    refresh: vi.fn(),
  }),
}));

vi.mock("@/lib/hooks/use-realtime", () => ({
  useRealtime: () => ({ connected: false, lastEvent: null, subscribe: () => () => {} }),
}));

vi.mock("@/components/shared/agent-ticker", () => ({
  AgentTicker: () => null,
}));

const mockBiz: SeedBusiness = {
  id: "b1",
  name: "Test Coffee",
  type: "Coffee Shop",
  email: "test@demo.com",
  pin: "1234",
  avatar: "☕",
  size: "small",
  location: "Portland, OR",
  industry: "Coffee Shop",
};

describe("BusinessPortal", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("renders business name and type", () => {
    render(<BusinessPortal biz={mockBiz} data={createSeedData()} save={vi.fn()} onLogout={vi.fn()} />);
    expect(screen.getByText("Coffee Shop")).toBeInTheDocument();
    // "Test Coffee" appears in both top bar and welcome heading
    const matches = screen.getAllByText(/Test Coffee/);
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it("shows dashboard stats from hook", () => {
    render(<BusinessPortal biz={mockBiz} data={createSeedData()} save={vi.fn()} onLogout={vi.fn()} />);
    expect(screen.getByText("3")).toBeInTheDocument(); // activeCampaigns
    expect(screen.getByText("42")).toBeInTheDocument(); // completions
  });

  it("navigates to campaigns tab", () => {
    render(<BusinessPortal biz={mockBiz} data={createSeedData()} save={vi.fn()} onLogout={vi.fn()} />);
    fireEvent.click(screen.getByText("Campaigns"));
    expect(screen.getByText("Test Campaign")).toBeInTheDocument();
  });

  it("calls onLogout when Log Out clicked", () => {
    const onLogout = vi.fn();
    render(<BusinessPortal biz={mockBiz} data={createSeedData()} save={vi.fn()} onLogout={onLogout} />);
    fireEvent.click(screen.getByText("Log Out"));
    expect(onLogout).toHaveBeenCalled();
  });
});
