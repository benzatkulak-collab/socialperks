import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BusinessPortal } from "../portal";
import type { SeedBusiness } from "@/lib/seed";
import { createSeedData } from "@/lib/seed";

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

vi.mock("@/lib/platforms", () => {
  const PLATFORMS = [
    { id: "ig", name: "Instagram", icon: "📸", color: "#E1306C", actions: [
      { id: "ig_st", label: "Story Tag", type: "content", effort: 1, value: 1.5, incentivizable: true, platformId: "ig" },
      { id: "ig_fp", label: "Feed Photo", type: "content", effort: 2, value: 2, incentivizable: true, platformId: "ig" },
    ]},
    { id: "tt", name: "TikTok", icon: "🎬", color: "#000000", actions: [
      { id: "tt_vd", label: "Video", type: "content", effort: 3, value: 5, incentivizable: true, platformId: "tt" },
    ]},
    { id: "go", name: "Google", icon: "⭐", color: "#FBBC04", actions: [
      { id: "go_rv", label: "Review", type: "review", effort: 2, value: 5, incentivizable: false, platformId: "go" },
    ]},
  ];
  const ALL_ACTIONS = PLATFORMS.flatMap((p) => p.actions);
  return {
    PLATFORMS,
    ALL_ACTIONS,
    FOLLOWER_TIERS: [{ label: "Anyone", min: 0, bonus: 0, color: "#94A3B8" }],
    findAction: (id: string) => ALL_ACTIONS.find((a) => a.id === id),
    findPlatform: (id: string) => PLATFORMS.find((p) => p.id === id),
  };
});

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

  it("renders business name", () => {
    render(<BusinessPortal biz={mockBiz} data={createSeedData()} save={vi.fn()} onLogout={vi.fn()} />);
    expect(screen.getByText("Test Coffee")).toBeInTheDocument();
  });

  it("shows create campaign button in empty state", () => {
    render(<BusinessPortal biz={mockBiz} data={createSeedData()} save={vi.fn()} onLogout={vi.fn()} />);
    expect(screen.getByText("Create a new campaign")).toBeInTheDocument();
  });

  it("navigates to create flow", () => {
    render(<BusinessPortal biz={mockBiz} data={createSeedData()} save={vi.fn()} onLogout={vi.fn()} />);
    fireEvent.click(screen.getByText("Create a new campaign"));
    expect(screen.getByText("What do you want customers to do?")).toBeInTheDocument();
  });

  it("calls onLogout when Log Out clicked", () => {
    const onLogout = vi.fn();
    render(<BusinessPortal biz={mockBiz} data={createSeedData()} save={vi.fn()} onLogout={onLogout} />);
    fireEvent.click(screen.getByText("Log Out"));
    expect(onLogout).toHaveBeenCalled();
  });
});
