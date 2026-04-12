/**
 * Tests for the InfluencerPortal component
 *
 * Verifies rendering, tab navigation, and default dashboard view.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { InfluencerPortal } from "../portal";
import type { SeedInfluencer, SeedData } from "@/lib/seed";
import { createSeedData } from "@/lib/seed";

// Mock hooks and context providers
vi.mock("@/lib/hooks/use-submissions", () => ({
  useSubmissions: () => ({
    submissions: [],
    loading: false,
    addOptimistic: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock("@/lib/context/app-context", () => ({
  useToast: () => vi.fn(),
}));

vi.mock("@/lib/platforms", () => ({
  PLATFORMS: [
    {
      id: "ig",
      name: "Instagram",
      icon: "camera",
      color: "#E1306C",
      actions: [
        { id: "ig_st", label: "Story Tag", type: "content", effort: 1, value: 1.5, incentivizable: true, platformId: "ig", platformName: "Instagram" },
      ],
    },
    {
      id: "go",
      name: "Google",
      icon: "star",
      color: "#FBBC04",
      actions: [
        { id: "go_rv", label: "Review", type: "review", effort: 2, value: 5, incentivizable: false, platformId: "go", platformName: "Google" },
      ],
    },
  ],
}));

vi.mock("@/components/influencer/marketplace-utils", () => ({
  TIER_COLORS: {
    micro: "#22D3EE",
    mid: "#34D399",
    macro: "#FBBF24",
    mega: "#F472B6",
  },
  buildMarketplaceCampaigns: () => [
    {
      id: "mc1",
      businessId: "b1",
      businessName: "Test Coffee",
      businessType: "Coffee Shop",
      businessAvatar: "coffee",
      campaignName: "Test Campaign",
      description: "Test campaign description",
      perkValue: 10,
      perkType: "pct" as const,
      platform: "Instagram",
      platformIcon: "camera",
      actionId: "ig_st",
      actionsRequired: ["ig_st"],
      effortLevel: 1,
    },
  ],
}));

vi.mock("@/components/influencer/perk-wallet", () => ({
  PerkWallet: () => <div data-testid="perk-wallet">Wallet</div>,
}));

vi.mock("@/components/shared/notification-center", () => ({
  NotificationCenter: () => null,
}));

const mockInfluencer: SeedInfluencer = {
  id: "inf1",
  displayName: "Test Creator",
  email: "creator@demo.com",
  pin: "1234",
  avatar: "person",
  bio: "I make content",
  tier: "micro",
  niches: ["fitness", "lifestyle"],
  followerCount: 5000,
  engagementRate: 4.2,
  platforms: [
    { platformId: "ig", handle: "@testcreator", followers: 5000 },
  ],
  location: "Portland, OR",
};

describe("InfluencerPortal", () => {
  let seedData: SeedData;

  beforeEach(() => {
    vi.clearAllMocks();
    seedData = createSeedData();
    // Mock global fetch for campaign fetching
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ success: false }),
    });
  });

  it("renders with required props", () => {
    render(
      <InfluencerPortal
        influencer={mockInfluencer}
        data={seedData}
        save={vi.fn()}
        onLogout={vi.fn()}
      />
    );

    expect(screen.getByText("Test Creator")).toBeInTheDocument();
  });

  it("shows dashboard section by default", () => {
    render(
      <InfluencerPortal
        influencer={mockInfluencer}
        data={seedData}
        save={vi.fn()}
        onLogout={vi.fn()}
      />
    );

    // Dashboard greeting
    expect(screen.getByText(/Hey,/)).toBeInTheDocument();
    expect(screen.getByText("Test Creator")).toBeInTheDocument();
    expect(screen.getByText("Here's your creator dashboard")).toBeInTheDocument();
  });

  it("tab navigation works — switches to Discover", () => {
    render(
      <InfluencerPortal
        influencer={mockInfluencer}
        data={seedData}
        save={vi.fn()}
        onLogout={vi.fn()}
      />
    );

    // Click Discover tab
    fireEvent.click(screen.getByText("Discover"));

    // Should show discover content
    expect(screen.getByText("Discover Campaigns")).toBeInTheDocument();
  });

  it("tab navigation works — switches to Profile", () => {
    render(
      <InfluencerPortal
        influencer={mockInfluencer}
        data={seedData}
        save={vi.fn()}
        onLogout={vi.fn()}
      />
    );

    // Click Profile tab
    fireEvent.click(screen.getByText("Profile"));

    // Should show profile content
    expect(screen.getByText("Your Profile")).toBeInTheDocument();
    expect(screen.getByText("I make content")).toBeInTheDocument();
  });

  it("calls onLogout when Log Out is clicked", () => {
    const onLogout = vi.fn();
    render(
      <InfluencerPortal
        influencer={mockInfluencer}
        data={seedData}
        save={vi.fn()}
        onLogout={onLogout}
      />
    );

    fireEvent.click(screen.getByText("Log Out"));
    expect(onLogout).toHaveBeenCalledOnce();
  });
});
