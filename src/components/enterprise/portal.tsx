"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { Tabs } from "@/components/ui/tabs";
import { AgentTicker } from "@/components/shared/agent-ticker";

const EnterpriseDashboard = dynamic(() => import("@/components/enterprise/dashboard"));
const MultiLocation = dynamic(() => import("@/components/enterprise/multi-location"));
const Reports = dynamic(() => import("@/components/enterprise/reports"));
const BrandManager = dynamic(() => import("@/components/enterprise/brand-manager"));
const ApiConsole = dynamic(() => import("@/components/enterprise/api-console"));

import type { EnterpriseData } from "@/components/enterprise/dashboard";
import type { ReportData, DateRange } from "@/components/enterprise/reports";
import type { BrandGuidelines, CampaignTemplate, PendingReview, LocationCompliance } from "@/components/enterprise/brand-manager";
import type { ApiKey as EntApiKey, Webhook as EntWebhook, ApiUsageStats } from "@/components/enterprise/api-console";
import type { Location } from "@/components/enterprise/multi-location";

// ═══════════════ Enterprise Demo Data ═══════════════

function createEnterpriseDemo() {
  const locations: Location[] = [
    { id: "loc1", name: "FreshFit Downtown DC", address: "1400 K St NW", city: "Washington", state: "DC", activeCampaigns: 8, totalCompletions: 342, completionRate: 72, reviews: 189, marketingValue: 28500, staff: [{ id: "s1", name: "Sarah Chen", role: "Manager" }, { id: "s2", name: "Mike Torres", role: "Marketing" }], status: "active" },
    { id: "loc2", name: "FreshFit Arlington", address: "3100 Clarendon Blvd", city: "Arlington", state: "VA", activeCampaigns: 6, totalCompletions: 278, completionRate: 68, reviews: 145, marketingValue: 22100, staff: [{ id: "s3", name: "James Park", role: "Manager" }], status: "active" },
    { id: "loc3", name: "FreshFit Bethesda", address: "4800 Hampden Ln", city: "Bethesda", state: "MD", activeCampaigns: 5, totalCompletions: 195, completionRate: 65, reviews: 102, marketingValue: 16400, staff: [{ id: "s4", name: "Lisa Wang", role: "Manager" }, { id: "s5", name: "Derek Flynn", role: "Trainer" }], status: "active" },
    { id: "loc4", name: "FreshFit Georgetown", address: "3210 M St NW", city: "Washington", state: "DC", activeCampaigns: 4, totalCompletions: 156, completionRate: 71, reviews: 88, marketingValue: 13200, staff: [{ id: "s6", name: "Anna Rose", role: "Manager" }], status: "active" },
    { id: "loc5", name: "FreshFit Silver Spring", address: "900 Ellsworth Dr", city: "Silver Spring", state: "MD", activeCampaigns: 2, totalCompletions: 45, completionRate: 55, reviews: 22, marketingValue: 4800, staff: [{ id: "s7", name: "Tom Nguyen", role: "Manager" }], status: "pending" },
  ];

  const enterprise: EnterpriseData = {
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

  const reportData: ReportData = {
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

  const guidelines: BrandGuidelines = {
    approvedHashtags: ["#FreshFitGyms", "#FreshFitFam", "#GetFreshFit", "#FreshFitChallenge", "#FreshFitLife"],
    requiredDisclaimers: ["Sponsored by FreshFit Gyms", "#ad when receiving perks over $25"],
    photoGuidelines: "Use natural lighting. Show real gym environment. Include FreshFit branding when possible. No competitor logos visible.",
    toneOfVoice: "Motivational, inclusive, authentic. Avoid aggressive fitness culture language. Focus on wellness journey, not just results.",
  };

  const templates: CampaignTemplate[] = [
    { id: "t1", name: "New Member Welcome", description: "Post a gym selfie on your first visit for a free smoothie", platforms: ["Instagram", "TikTok"], tier: "essential", actionsRequired: ["ig_story", "ig_tag"], createdAt: "2025-11-15", usageCount: 45 },
    { id: "t2", name: "Monthly Challenge", description: "Share your monthly fitness progress for a membership discount", platforms: ["Instagram", "TikTok", "YouTube"], tier: "high_impact", actionsRequired: ["ig_rl", "tt_vd"], createdAt: "2025-12-01", usageCount: 28 },
    { id: "t3", name: "Google Review Drive", description: "Leave a Google review for 10% off next month", platforms: ["Google"], tier: "essential", actionsRequired: ["ggl_rv"], createdAt: "2025-10-20", usageCount: 120 },
  ];

  const pendingReviews: PendingReview[] = [
    { id: "pr1", influencerName: "FitJessica", influencerAvatar: "\uD83C\uDFCB\uFE0F\u200D\u2640\uFE0F", locationName: "FreshFit Downtown DC", campaignName: "Summer Fitness Challenge", platform: "Instagram", platformIcon: "\uD83D\uDCF8", contentType: "Reel", submittedAt: "2026-03-19T14:30:00Z", previewUrl: "https://instagram.com/reel/example1", complianceFlags: [] },
    { id: "pr2", influencerName: "GymBroTony", influencerAvatar: "\uD83D\uDCAA", locationName: "FreshFit Arlington", campaignName: "Monthly Challenge", platform: "TikTok", platformIcon: "\uD83C\uDFB5", contentType: "Video", submittedAt: "2026-03-18T09:15:00Z", previewUrl: "https://tiktok.com/example2", complianceFlags: ["Missing disclosure"] },
  ];

  const locationCompliance: LocationCompliance[] = locations.map((l) => ({
    id: l.id,
    name: l.name,
    score: l.id === "loc5" ? 78 : 92,
    totalSubmissions: l.totalCompletions,
    flaggedSubmissions: Math.floor(l.totalCompletions * 0.03),
  }));

  const apiKeys: EntApiKey[] = [
    { id: "ak1", name: "Production API", keyPrefix: "sk_live_FfG8x", environment: "production", createdAt: "2025-09-15T00:00:00Z", lastUsed: "2026-03-20T08:45:00Z", requestsToday: 1247, status: "active" },
    { id: "ak2", name: "Staging API", keyPrefix: "sk_test_Tn4Kp", environment: "sandbox", createdAt: "2025-11-01T00:00:00Z", lastUsed: "2026-03-19T16:20:00Z", requestsToday: 89, status: "active" },
    { id: "ak3", name: "Old Integration Key", keyPrefix: "sk_live_OlD2w", environment: "production", createdAt: "2025-06-01T00:00:00Z", lastUsed: "2025-12-15T00:00:00Z", requestsToday: 0, status: "revoked" },
  ];

  const webhooks: EntWebhook[] = [
    { id: "wh1", url: "https://hooks.freshfitgyms.com/social-perks", events: ["campaign.created", "submission.approved", "payout.processed"], status: "active", lastTriggered: "2026-03-20T07:30:00Z", failureCount: 0 },
    { id: "wh2", url: "https://crm.freshfitgyms.com/webhooks/sp", events: ["submission.received", "submission.approved", "submission.rejected"], status: "active", lastTriggered: "2026-03-19T22:10:00Z", failureCount: 0 },
  ];

  const apiUsage: ApiUsageStats = {
    requestsToday: 1336,
    requestsThisMonth: 28450,
    rateLimit: 10000,
    rateLimitUsed: 1336,
    topEndpoints: [
      { endpoint: "GET /api/v1/campaigns", count: 4520, avgLatency: 45 },
      { endpoint: "POST /api/v1/campaigns", count: 890, avgLatency: 120 },
      { endpoint: "GET /api/v1/influencers", count: 3200, avgLatency: 62 },
      { endpoint: "GET /api/v1/benchmarks", count: 1800, avgLatency: 38 },
    ],
  };

  return { enterprise, locations, reportData, guidelines, templates, pendingReviews, locationCompliance, apiKeys, webhooks, apiUsage };
}

// ═══════════════ Enterprise Portal ═══════════════

export interface EnterprisePortalProps {
  onLogout: () => void;
}

export function EnterprisePortal({
  onLogout,
}: EnterprisePortalProps) {
  const [page, setPage] = useState<string>("dashboard");
  const [dateRange, setDateRange] = useState<DateRange>({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    end: new Date().toISOString().split("T")[0],
  });
  const [brandGuidelines, setBrandGuidelines] = useState<BrandGuidelines | null>(null);

  const demo = createEnterpriseDemo();
  const currentGuidelines = brandGuidelines ?? demo.guidelines;

  const portalTabs = [
    { id: "dashboard", label: "Dashboard" },
    { id: "locations", label: "Locations" },
    { id: "reports", label: "Reports" },
    { id: "brand", label: "Brand" },
    { id: "api", label: "API" },
  ];

  function handleNavigate(section: string) {
    setPage(section);
  }

  return (
    <div className="min-h-screen">
      {/* Top Bar */}
      <div className="bg-brand-surface border-b border-brand-border px-4 md:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Logo size="sm" />
          <Badge color="#A78BFA">Enterprise</Badge>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-brand-dim hidden sm:block">{demo.enterprise.avatar} {demo.enterprise.companyName}</span>
          <Button variant="ghost" size="sm" onClick={onLogout}>Log Out</Button>
        </div>
      </div>

      {/* Sub-nav */}
      <nav className="bg-brand-elevated border-b border-brand-border px-4 md:px-6 py-2" aria-label="Enterprise portal navigation">
        <Tabs tabs={portalTabs} activeTab={page} onChange={setPage} />
      </nav>

      <AgentTicker />

      {/* Dashboard */}
      {page === "dashboard" && (
        <EnterpriseDashboard
          enterprise={demo.enterprise}
          onNavigate={handleNavigate}
        />
      )}

      {/* Locations */}
      {page === "locations" && (
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
          <MultiLocation
            locations={demo.locations}
            onAddLocation={() => {
              // In production this would persist via API
            }}
          />
        </div>
      )}

      {/* Reports */}
      {page === "reports" && (
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
          <Reports
            reportData={demo.reportData}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
          />
        </div>
      )}

      {/* Brand */}
      {page === "brand" && (
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
          <BrandManager
            guidelines={currentGuidelines}
            templates={demo.templates}
            pendingReviews={demo.pendingReviews}
            locationCompliance={demo.locationCompliance}
            onUpdateGuidelines={(g) => setBrandGuidelines(g)}
          />
        </div>
      )}

      {/* API Console */}
      {page === "api" && (
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
          <ApiConsole
            apiKeys={demo.apiKeys}
            webhooks={demo.webhooks}
            usage={demo.apiUsage}
          />
        </div>
      )}
    </div>
  );
}
