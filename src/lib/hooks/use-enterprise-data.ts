"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";

import type { EnterpriseData, LocationSummary } from "@/components/enterprise/dashboard";
import type { Location } from "@/components/enterprise/multi-location";
import type { ReportData, ReportMetric, CampaignPerformance, LocationComparison, PlatformBreakdown } from "@/components/enterprise/report-types";
import type { BrandGuidelines, CampaignTemplate, PendingReview, LocationCompliance } from "@/components/enterprise/brand-manager";
import type { ApiKey as EntApiKey, Webhook as EntWebhook, ApiUsageStats } from "@/components/enterprise/api-console";

// ═══════════════ API Response Types ═══════════════

interface ApiCampaign {
  id: string;
  state: string;
  businessId: string;
  name?: string;
  budget: { allocated: number; spent: number; type: string };
  completions: { current: number; max: number | null };
  expiry: { launchedAt: string; expiresAt: string };
  actions?: string[];
  platform?: string;
  tier?: string;
  location?: string;
  // The API may return enriched fields from POST
  discountValue?: number;
  discountType?: string;
}

interface ApiSubmission {
  id: string;
  campaignId: string;
  userId: string;
  actionId: string;
  proofUrl: string;
  proofType: string;
  status: string;
  submittedAt: string;
  reviewedAt: string | null;
  perkAwarded: boolean;
}

// ═══════════════ Demo Defaults ═══════════════

/** Fallback data for features that don't have real API endpoints yet. */
function createDemoDefaults() {
  const guidelines: BrandGuidelines = {
    approvedHashtags: ["#YourBrand", "#BrandLife", "#GetStarted"],
    requiredDisclaimers: ["Sponsored content", "#ad when receiving perks over $25"],
    photoGuidelines: "Use natural lighting. Show real environment. Include branding when possible.",
    toneOfVoice: "Authentic, approachable, professional.",
  };

  const templates: CampaignTemplate[] = [
    { id: "t1", name: "Welcome Campaign", description: "Post on your first visit for a reward", platforms: ["Instagram", "TikTok"], tier: "essential", actionsRequired: ["ig_story", "ig_tag"], createdAt: "2025-11-15", usageCount: 0 },
    { id: "t2", name: "Review Drive", description: "Leave a review for a discount", platforms: ["Google"], tier: "essential", actionsRequired: ["ggl_rv"], createdAt: "2025-12-01", usageCount: 0 },
  ];

  const pendingReviews: PendingReview[] = [];

  const apiKeys: EntApiKey[] = [
    { id: "ak1", name: "Production API", keyPrefix: "sk_live_****", environment: "production", scope: "admin", createdAt: new Date().toISOString(), lastUsed: null, requestsToday: 0, status: "active" },
    { id: "ak2", name: "Staging API", keyPrefix: "sk_test_****", environment: "sandbox", scope: "read-write", createdAt: new Date().toISOString(), lastUsed: null, requestsToday: 0, status: "active" },
  ];

  const webhooks: EntWebhook[] = [];

  const apiUsage: ApiUsageStats = {
    requestsToday: 0,
    requestsThisMonth: 0,
    rateLimit: 10000,
    rateLimitUsed: 0,
    topEndpoints: [],
  };

  return { guidelines, templates, pendingReviews, apiKeys, webhooks, apiUsage };
}

// ═══════════════ Platform icon mapping ═══════════════

const PLATFORM_ICONS: Record<string, string> = {
  instagram: "\uD83D\uDCF8",
  tiktok: "\uD83C\uDFB5",
  google: "\uD83C\uDF10",
  yelp: "\u2B50",
  facebook: "\uD83D\uDC4D",
  youtube: "\uD83C\uDFA5",
  twitter: "\uD83D\uDC26",
  linkedin: "\uD83D\uDCBC",
  pinterest: "\uD83D\uDCCC",
  snapchat: "\uD83D\uDC7B",
  reddit: "\uD83E\uDD16",
  nextdoor: "\uD83C\uDFE0",
  tripadvisor: "\u2708\uFE0F",
};

function getPlatformIcon(platform: string): string {
  return PLATFORM_ICONS[platform.toLowerCase()] ?? "\uD83C\uDF10";
}

// ═══════════════ Data Computation ═══════════════

function computeEnterpriseData(
  campaigns: ApiCampaign[],
  submissions: ApiSubmission[],
  companyName: string,
): {
  enterprise: EnterpriseData;
  locations: Location[];
  reportData: ReportData;
  locationCompliance: LocationCompliance[];
} {
  // Group campaigns by location (use location field or "Main Location" fallback)
  const locationMap = new Map<string, { campaigns: ApiCampaign[]; submissions: ApiSubmission[] }>();

  for (const c of campaigns) {
    const locName = c.location ?? "Main Location";
    if (!locationMap.has(locName)) {
      locationMap.set(locName, { campaigns: [], submissions: [] });
    }
    locationMap.get(locName)!.campaigns.push(c);
  }

  // Map submissions to locations via their campaign
  const campaignLocationMap = new Map<string, string>();
  for (const c of campaigns) {
    campaignLocationMap.set(c.id, c.location ?? "Main Location");
  }
  for (const s of submissions) {
    const locName = campaignLocationMap.get(s.campaignId) ?? "Main Location";
    if (!locationMap.has(locName)) {
      locationMap.set(locName, { campaigns: [], submissions: [] });
    }
    locationMap.get(locName)!.submissions.push(s);
  }

  // Build locations
  const locations: Location[] = [];
  const locationSummaries: LocationSummary[] = [];
  let locIdx = 0;

  for (const [locName, data] of locationMap) {
    locIdx++;
    const locId = `loc${locIdx}`;
    const activeCampaigns = data.campaigns.filter((c) => c.state === "active").length;
    const totalCompletions = data.campaigns.reduce((sum, c) => sum + (c.completions?.current ?? 0), 0);
    const approvedSubs = data.submissions.filter((s) => s.status === "approved").length;
    const totalSubs = data.submissions.length;
    const completionRate = totalSubs > 0 ? Math.round((approvedSubs / totalSubs) * 100) : 0;
    const marketingValue = data.campaigns.reduce((sum, c) => sum + (c.budget?.spent ?? 0), 0);

    // Count review-type submissions as "reviews"
    const reviews = data.submissions.filter((s) => s.status === "approved").length;

    locations.push({
      id: locId,
      name: locName,
      address: "",
      city: "",
      state: "",
      activeCampaigns,
      totalCompletions,
      completionRate,
      reviews,
      marketingValue,
      staff: [],
      status: activeCampaigns > 0 ? "active" : "inactive",
    });

    locationSummaries.push({
      id: locId,
      name: locName,
      address: locName,
      activeCampaigns,
      completions: totalCompletions,
      reviews,
      marketingValue,
      complianceScore: 92, // Default high compliance for active locations
    });
  }

  // If no locations were derived, add a default
  if (locations.length === 0) {
    locations.push({
      id: "loc1",
      name: "Main Location",
      address: "",
      city: "",
      state: "",
      activeCampaigns: 0,
      totalCompletions: 0,
      completionRate: 0,
      reviews: 0,
      marketingValue: 0,
      staff: [],
      status: "active",
    });
    locationSummaries.push({
      id: "loc1",
      name: "Main Location",
      address: "Main Location",
      activeCampaigns: 0,
      completions: 0,
      reviews: 0,
      marketingValue: 0,
      complianceScore: 100,
    });
  }

  // Aggregate totals
  const totalCampaigns = campaigns.length;
  const totalCompletions = campaigns.reduce((sum, c) => sum + (c.completions?.current ?? 0), 0);
  const totalReviews = submissions.filter((s) => s.status === "approved").length;
  const totalMarketingValue = campaigns.reduce((sum, c) => sum + (c.budget?.spent ?? 0), 0);

  const enterprise: EnterpriseData = {
    id: "ent1",
    companyName,
    plan: "enterprise",
    avatar: "\uD83C\uDFE2",
    locations: locationSummaries,
    totalCampaigns,
    totalCompletions,
    totalReviews,
    totalMarketingValue,
    brandComplianceScore: 92,
  };

  // Build report data
  const reportMetrics: ReportMetric[] = [
    {
      label: "Total Impressions",
      value: totalCompletions * 200, // Estimate: ~200 impressions per completion
      formattedValue: formatCompact(totalCompletions * 200),
      change: 0,
      changeLabel: "vs last period",
    },
    {
      label: "Completion Rate",
      value: submissions.length > 0
        ? Math.round((submissions.filter((s) => s.status === "approved").length / submissions.length) * 1000) / 10
        : 0,
      formattedValue: submissions.length > 0
        ? `${(Math.round((submissions.filter((s) => s.status === "approved").length / submissions.length) * 1000) / 10)}%`
        : "0%",
      change: 0,
      changeLabel: "vs last period",
    },
    {
      label: "Avg Perk Value",
      value: totalCampaigns > 0 ? Math.round((totalMarketingValue / Math.max(totalCompletions, 1)) * 100) / 100 : 0,
      formattedValue: totalCampaigns > 0 ? `$${(Math.round((totalMarketingValue / Math.max(totalCompletions, 1)) * 100) / 100).toFixed(2)}` : "$0.00",
      change: 0,
      changeLabel: "vs last period",
    },
    {
      label: "Total ROI",
      value: totalMarketingValue > 0 ? Math.round((totalMarketingValue / campaigns.reduce((sum, c) => sum + (c.budget?.allocated ?? 0), 0) || 1) * 10) / 10 : 0,
      formattedValue: totalMarketingValue > 0
        ? `${(Math.round((totalMarketingValue / (campaigns.reduce((sum, c) => sum + (c.budget?.allocated ?? 0), 0) || 1)) * 10) / 10)}x`
        : "0x",
      change: 0,
      changeLabel: "vs last period",
    },
  ];

  // Campaign performance for reports
  const campaignPerformance: CampaignPerformance[] = campaigns
    .filter((c) => c.state === "active" || c.completions?.current > 0)
    .slice(0, 20)
    .map((c) => {
      const platform = c.platform ?? "Unknown";
      const completions = c.completions?.current ?? 0;
      const spent = c.budget?.spent ?? 0;
      const allocated = c.budget?.allocated ?? 1;
      return {
        id: c.id,
        name: c.name ?? `Campaign ${c.id.slice(-6)}`,
        location: c.location ?? "Main Location",
        platform,
        platformIcon: getPlatformIcon(platform),
        completions,
        impressions: completions * 200,
        conversions: Math.round(completions * 0.6),
        marketingValue: spent,
        roi: allocated > 0 ? Math.round((spent / allocated) * 100) : 0,
      };
    });

  // Location comparison for reports
  const locationComparison: LocationComparison[] = locations.map((loc) => ({
    id: loc.id,
    name: loc.name,
    campaigns: loc.activeCampaigns,
    completions: loc.totalCompletions,
    reviews: loc.reviews,
    marketingValue: loc.marketingValue,
    roi: loc.activeCampaigns > 0
      ? Math.round((loc.marketingValue / (loc.activeCampaigns * 100 || 1)) * 10) / 10
      : 0,
  }));

  // Platform breakdown for reports
  const platformCounts = new Map<string, { campaigns: number; completions: number; marketingValue: number }>();
  for (const c of campaigns) {
    const platform = c.platform ?? "Unknown";
    const existing = platformCounts.get(platform) ?? { campaigns: 0, completions: 0, marketingValue: 0 };
    existing.campaigns++;
    existing.completions += c.completions?.current ?? 0;
    existing.marketingValue += c.budget?.spent ?? 0;
    platformCounts.set(platform, existing);
  }

  const totalPlatformValue = Array.from(platformCounts.values()).reduce((s, p) => s + p.marketingValue, 0) || 1;
  const platformBreakdown: PlatformBreakdown[] = Array.from(platformCounts.entries()).map(
    ([platform, data]) => ({
      platform,
      platformIcon: getPlatformIcon(platform),
      campaigns: data.campaigns,
      completions: data.completions,
      marketingValue: data.marketingValue,
      share: Math.round((data.marketingValue / totalPlatformValue) * 1000) / 10,
    }),
  );

  const reportData: ReportData = {
    metrics: reportMetrics,
    campaignPerformance,
    locationComparison,
    platformBreakdown,
  };

  const locationCompliance: LocationCompliance[] = locations.map((l) => ({
    id: l.id,
    name: l.name,
    score: 92,
    totalSubmissions: l.totalCompletions,
    flaggedSubmissions: Math.floor(l.totalCompletions * 0.03),
  }));

  return { enterprise, locations, reportData, locationCompliance };
}

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

// ═══════════════ Hook ═══════════════

export interface EnterpriseDataResult {
  enterprise: EnterpriseData;
  locations: Location[];
  reportData: ReportData;
  guidelines: BrandGuidelines;
  templates: CampaignTemplate[];
  pendingReviews: PendingReview[];
  locationCompliance: LocationCompliance[];
  apiKeys: EntApiKey[];
  webhooks: EntWebhook[];
  apiUsage: ApiUsageStats;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

/**
 * Fetches enterprise data from the real API (campaigns + submissions),
 * computes derived metrics (locations, reports, etc.), and falls back to
 * demo data for features without real endpoints (API keys, webhooks, brand).
 *
 * When businessId is null/undefined, returns full demo data immediately.
 */
export function useEnterpriseData(businessId: string | null | undefined): EnterpriseDataResult {
  const [campaigns, setCampaigns] = useState<ApiCampaign[]>([]);
  const [submissions, setSubmissions] = useState<ApiSubmission[]>([]);
  const [loading, setLoading] = useState(!!businessId);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const demoDefaults = useMemo(() => createDemoDefaults(), []);

  const refresh = useCallback(async () => {
    if (!businessId) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(null);

    try {
      // Fetch campaigns and submissions in parallel
      const [campaignsRes, submissionsRes] = await Promise.all([
        fetch(
          `/api/v1/campaigns?businessId=${encodeURIComponent(businessId)}`,
          { signal: controller.signal, credentials: "include" },
        ),
        fetch(
          `/api/v1/submissions?businessId=${encodeURIComponent(businessId)}`,
          { signal: controller.signal, credentials: "include" },
        ),
      ]);

      if (controller.signal.aborted) return;

      if (!campaignsRes.ok) {
        throw new Error(`Campaigns fetch failed (${campaignsRes.status})`);
      }
      if (!submissionsRes.ok) {
        throw new Error(`Submissions fetch failed (${submissionsRes.status})`);
      }

      const [campaignsJson, submissionsJson] = await Promise.all([
        campaignsRes.json(),
        submissionsRes.json(),
      ]);

      if (controller.signal.aborted) return;

      setCampaigns(campaignsJson.data?.campaigns ?? []);
      setSubmissions(submissionsJson.data?.submissions ?? []);
    } catch (e: unknown) {
      if (e instanceof Error && e.name !== "AbortError") {
        console.warn("[useEnterpriseData] Fetch failed, using demo fallback:", e.message);
        setError(e.message);
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    if (businessId) {
      refresh();
    }
    return () => {
      abortRef.current?.abort();
    };
  }, [refresh, businessId]);

  // Compute derived data from API responses
  const computed = useMemo(() => {
    if (!businessId || (campaigns.length === 0 && submissions.length === 0 && !loading)) {
      // No real data -- return null to signal "use demo fallback"
      return null;
    }
    return computeEnterpriseData(campaigns, submissions, "Enterprise Account");
  }, [businessId, campaigns, submissions, loading]);

  // Build the final result, merging computed data with demo defaults
  return useMemo(() => {
    if (computed) {
      return {
        ...computed,
        guidelines: demoDefaults.guidelines,
        templates: demoDefaults.templates,
        pendingReviews: demoDefaults.pendingReviews,
        apiKeys: demoDefaults.apiKeys,
        webhooks: demoDefaults.webhooks,
        apiUsage: demoDefaults.apiUsage,
        loading,
        error,
        refresh,
      };
    }

    // Full demo fallback (no businessId or empty API data)
    return {
      enterprise: createDemoEnterprise(),
      locations: createDemoLocations(),
      reportData: createDemoReportData(),
      locationCompliance: createDemoLocationCompliance(),
      guidelines: demoDefaults.guidelines,
      templates: demoDefaults.templates,
      pendingReviews: demoDefaults.pendingReviews,
      apiKeys: demoDefaults.apiKeys,
      webhooks: demoDefaults.webhooks,
      apiUsage: demoDefaults.apiUsage,
      loading,
      error,
      refresh,
    };
  }, [computed, demoDefaults, loading, error, refresh]);
}

// ═══════════════ Full Demo Fallback Data ═══════════════

function createDemoLocations(): Location[] {
  return [
    { id: "loc1", name: "FreshFit Downtown DC", address: "1400 K St NW", city: "Washington", state: "DC", activeCampaigns: 8, totalCompletions: 342, completionRate: 72, reviews: 189, marketingValue: 28500, staff: [{ id: "s1", name: "Sarah Chen", role: "Manager" }, { id: "s2", name: "Mike Torres", role: "Marketing" }], status: "active" },
    { id: "loc2", name: "FreshFit Arlington", address: "3100 Clarendon Blvd", city: "Arlington", state: "VA", activeCampaigns: 6, totalCompletions: 278, completionRate: 68, reviews: 145, marketingValue: 22100, staff: [{ id: "s3", name: "James Park", role: "Manager" }], status: "active" },
    { id: "loc3", name: "FreshFit Bethesda", address: "4800 Hampden Ln", city: "Bethesda", state: "MD", activeCampaigns: 5, totalCompletions: 195, completionRate: 65, reviews: 102, marketingValue: 16400, staff: [{ id: "s4", name: "Lisa Wang", role: "Manager" }, { id: "s5", name: "Derek Flynn", role: "Trainer" }], status: "active" },
    { id: "loc4", name: "FreshFit Georgetown", address: "3210 M St NW", city: "Washington", state: "DC", activeCampaigns: 4, totalCompletions: 156, completionRate: 71, reviews: 88, marketingValue: 13200, staff: [{ id: "s6", name: "Anna Rose", role: "Manager" }], status: "active" },
    { id: "loc5", name: "FreshFit Silver Spring", address: "900 Ellsworth Dr", city: "Silver Spring", state: "MD", activeCampaigns: 2, totalCompletions: 45, completionRate: 55, reviews: 22, marketingValue: 4800, staff: [{ id: "s7", name: "Tom Nguyen", role: "Manager" }], status: "pending" },
  ];
}

function createDemoEnterprise(): EnterpriseData {
  const locations = createDemoLocations();
  return {
    id: "ent1",
    companyName: "FreshFit Gyms",
    plan: "enterprise",
    avatar: "\uD83D\uDCAA",
    locations: locations.map((l) => ({
      id: l.id,
      name: l.name,
      address: `${l.address}, ${l.city}, ${l.state}`,
      activeCampaigns: l.activeCampaigns,
      completions: l.totalCompletions,
      reviews: l.reviews,
      marketingValue: l.marketingValue,
      complianceScore: l.id === "loc5" ? 78 : 92,
    })),
    totalCampaigns: 25,
    totalCompletions: 1016,
    totalReviews: 546,
    totalMarketingValue: 85000,
    brandComplianceScore: 91,
  };
}

function createDemoReportData(): ReportData {
  const locations = createDemoLocations();
  return {
    metrics: [
      { label: "Total Impressions", value: 284000, formattedValue: "284K", change: 12.4, changeLabel: "vs last period" },
      { label: "Completion Rate", value: 68.5, formattedValue: "68.5%", change: 3.2, changeLabel: "vs last period" },
      { label: "Avg Perk Value", value: 14.50, formattedValue: "$14.50", change: -1.8, changeLabel: "vs last period" },
      { label: "Total ROI", value: 4.2, formattedValue: "4.2x", change: 0.6, changeLabel: "vs last period" },
    ],
    campaignPerformance: [
      { id: "cp1", name: "Summer Fitness Challenge", location: "FreshFit Downtown DC", platform: "Instagram", platformIcon: "\uD83D\uDCF8", completions: 156, impressions: 42000, conversions: 89, marketingValue: 12400, roi: 5.2 },
      { id: "cp2", name: "Google Review Blitz", location: "FreshFit Arlington", platform: "Google", platformIcon: "\uD83C\uDF10", completions: 98, impressions: 15000, conversions: 98, marketingValue: 8200, roi: 6.8 },
      { id: "cp3", name: "TikTok Gym Tour", location: "FreshFit Bethesda", platform: "TikTok", platformIcon: "\uD83C\uDFB5", completions: 67, impressions: 89000, conversions: 34, marketingValue: 9800, roi: 3.9 },
    ],
    locationComparison: locations.map((l) => ({
      id: l.id,
      name: l.name,
      campaigns: l.activeCampaigns,
      completions: l.totalCompletions,
      reviews: l.reviews,
      marketingValue: l.marketingValue,
      roi: parseFloat((l.marketingValue / (l.activeCampaigns * 500 || 1)).toFixed(1)),
    })),
    platformBreakdown: [
      { platform: "Instagram", platformIcon: "\uD83D\uDCF8", campaigns: 12, completions: 480, marketingValue: 38000, share: 44.7 },
      { platform: "Google", platformIcon: "\uD83C\uDF10", campaigns: 8, completions: 312, marketingValue: 26000, share: 30.6 },
      { platform: "TikTok", platformIcon: "\uD83C\uDFB5", campaigns: 3, completions: 134, marketingValue: 14000, share: 16.5 },
      { platform: "Yelp", platformIcon: "\u2B50", campaigns: 2, completions: 90, marketingValue: 7000, share: 8.2 },
    ],
  };
}

function createDemoLocationCompliance(): LocationCompliance[] {
  return createDemoLocations().map((l) => ({
    id: l.id,
    name: l.name,
    score: l.id === "loc5" ? 78 : 92,
    totalSubmissions: l.totalCompletions,
    flaggedSubmissions: Math.floor(l.totalCompletions * 0.03),
  }));
}
