// Demo data — hardcoded, fabricated, for the public /demo experience.
// No real customer data. No real auth. No API calls.

export const DEMO_BUSINESS = {
  name: "Bloom Café",
  industry: "Coffee Shop",
  location: "Austin, TX",
  monthlyRevenue: 22000,
  customers: 247,
  joinedDate: "2025-09-14",
  logoInitials: "BC",
};

export type DemoCampaign = {
  id: string;
  name: string;
  platform: string;
  status: "active" | "paused" | "draft";
  tier: "essential" | "high-impact" | "growth" | "premium" | "starter";
  perk: string;
  completions: number;
  budgetUsed: number;
  budgetTotal: number;
  approvalRate: number;
  startedAt: string;
};

export const DEMO_CAMPAIGNS: DemoCampaign[] = [
  {
    id: "cmp_ig_tag_001",
    name: "Instagram Tag Challenge",
    platform: "Instagram",
    status: "active",
    tier: "high-impact",
    perk: "Free pastry with any drink",
    completions: 84,
    budgetUsed: 420,
    budgetTotal: 600,
    approvalRate: 92,
    startedAt: "2026-04-12",
  },
  {
    id: "cmp_gbp_rev_002",
    name: "Google Review Sprint",
    platform: "Google",
    status: "active",
    tier: "essential",
    perk: "$5 off next visit",
    completions: 51,
    budgetUsed: 255,
    budgetTotal: 400,
    approvalRate: 96,
    startedAt: "2026-04-22",
  },
  {
    id: "cmp_tt_dance_003",
    name: "TikTok Latte Art Trend",
    platform: "TikTok",
    status: "active",
    tier: "growth",
    perk: "Buy one, get one free latte",
    completions: 37,
    budgetUsed: 296,
    budgetTotal: 500,
    approvalRate: 84,
    startedAt: "2026-04-29",
  },
  {
    id: "cmp_fb_check_004",
    name: "Facebook Check-In Friday",
    platform: "Facebook",
    status: "active",
    tier: "starter",
    perk: "10% off Friday orders",
    completions: 28,
    budgetUsed: 84,
    budgetTotal: 200,
    approvalRate: 89,
    startedAt: "2026-05-02",
  },
];

export type DemoSubmissionStatus = "pending" | "approved" | "rejected";

export type DemoSubmission = {
  id: string;
  customerName: string;
  initials: string;
  platform: string;
  campaignName: string;
  submittedAt: string;
  status: DemoSubmissionStatus;
  perkValue: number;
  caption: string;
};

export const DEMO_SUBMISSIONS: DemoSubmission[] = [
  {
    id: "sub_001",
    customerName: "Priya Shankar",
    initials: "PS",
    platform: "Instagram",
    campaignName: "Instagram Tag Challenge",
    submittedAt: "2026-05-11T09:14:00Z",
    status: "pending",
    perkValue: 6,
    caption: "Morning fuel from @bloomcafe — best oat latte in Austin 💛",
  },
  {
    id: "sub_002",
    customerName: "Marcus Reeves",
    initials: "MR",
    platform: "Google",
    campaignName: "Google Review Sprint",
    submittedAt: "2026-05-11T08:42:00Z",
    status: "approved",
    perkValue: 5,
    caption:
      "5 stars. The baristas remember my order and the cortado is perfect.",
  },
  {
    id: "sub_003",
    customerName: "Sofia Alvarez",
    initials: "SA",
    platform: "TikTok",
    campaignName: "TikTok Latte Art Trend",
    submittedAt: "2026-05-10T19:08:00Z",
    status: "approved",
    perkValue: 8,
    caption: "POV: you found the cutest café in East Austin 🌸 #bloomcafe",
  },
  {
    id: "sub_004",
    customerName: "Daniel Kim",
    initials: "DK",
    platform: "Instagram",
    campaignName: "Instagram Tag Challenge",
    submittedAt: "2026-05-10T15:30:00Z",
    status: "pending",
    perkValue: 6,
    caption: "Sunday slow mornings are made for this. @bloomcafe ☕",
  },
  {
    id: "sub_005",
    customerName: "Hannah Wu",
    initials: "HW",
    platform: "Facebook",
    campaignName: "Facebook Check-In Friday",
    submittedAt: "2026-05-09T13:22:00Z",
    status: "approved",
    perkValue: 4,
    caption: "Friday treat at Bloom Café — checked in!",
  },
  {
    id: "sub_006",
    customerName: "Jamal Bennett",
    initials: "JB",
    platform: "Google",
    campaignName: "Google Review Sprint",
    submittedAt: "2026-05-09T11:05:00Z",
    status: "approved",
    perkValue: 5,
    caption:
      "Quiet, great wifi, friendly staff. My new remote-work spot. ⭐⭐⭐⭐⭐",
  },
  {
    id: "sub_007",
    customerName: "Lily Tran",
    initials: "LT",
    platform: "Instagram",
    campaignName: "Instagram Tag Challenge",
    submittedAt: "2026-05-08T17:46:00Z",
    status: "rejected",
    perkValue: 6,
    caption: "café ☕",
  },
  {
    id: "sub_008",
    customerName: "Owen Becker",
    initials: "OB",
    platform: "TikTok",
    campaignName: "TikTok Latte Art Trend",
    submittedAt: "2026-05-08T10:14:00Z",
    status: "approved",
    perkValue: 8,
    caption: "The way she pours this rosetta 🌹 #latteart #bloomcafe",
  },
  {
    id: "sub_009",
    customerName: "Aisha Patel",
    initials: "AP",
    platform: "Google",
    campaignName: "Google Review Sprint",
    submittedAt: "2026-05-07T16:38:00Z",
    status: "approved",
    perkValue: 5,
    caption:
      "Great spot to meet a friend. Pastries are fresh, espresso is bold.",
  },
  {
    id: "sub_010",
    customerName: "Ethan Martinez",
    initials: "EM",
    platform: "Instagram",
    campaignName: "Instagram Tag Challenge",
    submittedAt: "2026-05-07T08:50:00Z",
    status: "pending",
    perkValue: 6,
    caption: "Made my morning. @bloomcafe never misses 🤎",
  },
  {
    id: "sub_011",
    customerName: "Nora Fischer",
    initials: "NF",
    platform: "Facebook",
    campaignName: "Facebook Check-In Friday",
    submittedAt: "2026-05-06T14:02:00Z",
    status: "approved",
    perkValue: 4,
    caption: "First time here — coming back tomorrow.",
  },
  {
    id: "sub_012",
    customerName: "Tariq Hassan",
    initials: "TH",
    platform: "TikTok",
    campaignName: "TikTok Latte Art Trend",
    submittedAt: "2026-05-06T09:18:00Z",
    status: "approved",
    perkValue: 8,
    caption: "Austin coffee tour stop #4: Bloom Café 🏆",
  },
];

export const DEMO_STATS = {
  activeCustomers: 247,
  perksEarnedThisMonth: 2340,
  newCampaignsThisWeek: 12,
  pendingReviews: 3,
  approvalRate: 91,
  totalReach: 38420,
};

// Submissions per day over last 30 days (most recent last). Deterministic.
export const DEMO_SUBMISSIONS_PER_DAY: number[] = [
  3, 5, 4, 6, 8, 7, 5, 9, 11, 8, 6, 10, 12, 9, 7, 11, 14, 13, 10, 12, 15, 13,
  11, 16, 18, 14, 12, 17, 20, 19,
];

export const DEMO_PLATFORM_BREAKDOWN: { platform: string; count: number; color: string }[] = [
  { platform: "Instagram", count: 84, color: "#E1306C" },
  { platform: "Google", count: 51, color: "#4285F4" },
  { platform: "TikTok", count: 37, color: "#22D3EE" },
  { platform: "Facebook", count: 28, color: "#1877F2" },
  { platform: "X / Twitter", count: 14, color: "#A78BFA" },
];

// Cumulative reach over last 30 days
export const DEMO_REACH_CUMULATIVE: number[] = [
  1200, 2050, 2900, 4100, 5400, 6700, 7800, 9200, 10800, 12100, 13400, 14900,
  16800, 18200, 19500, 21400, 23800, 25800, 27500, 29400, 31600, 33200, 34500,
  36100, 37200, 37800, 38000, 38150, 38280, 38420,
];

export const DEMO_NAV_TABS = [
  { id: "dashboard", label: "Dashboard", href: "/demo" },
  { id: "campaigns", label: "Campaigns", href: "/demo/campaigns" },
  { id: "submissions", label: "Submissions", href: "/demo/submissions" },
  { id: "analytics", label: "Analytics", href: "/demo/analytics" },
  { id: "settings", label: "Settings", href: "#settings" },
] as const;

export function platformColor(platform: string): string {
  const map: Record<string, string> = {
    Instagram: "#E1306C",
    Google: "#4285F4",
    TikTok: "#22D3EE",
    Facebook: "#1877F2",
    "X / Twitter": "#A78BFA",
  };
  return map[platform] ?? "#A78BFA";
}

export function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  const now = new Date("2026-05-11T10:00:00Z").getTime();
  const diff = Math.max(0, now - then);
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}
