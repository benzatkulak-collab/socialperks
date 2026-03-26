"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Stat } from "@/components/ui/stat";
import { Tabs } from "@/components/ui/tabs";
import { Logo } from "@/components/ui/logo";
import { AgentTicker } from "@/components/shared/agent-ticker";
import { AnimateOnScroll } from "@/components/shared/animate-on-scroll";
import { formatNumber } from "@/lib/shared/formatters";
import { PLATFORMS } from "@/lib/platforms";
import { useSubmissions, type Submission } from "@/lib/hooks/use-submissions";
import type { SeedData, SeedInfluencer } from "@/lib/seed";

interface MarketplaceCampaign {
  id: string;
  businessId: string;
  businessName: string;
  businessType: string;
  businessAvatar: string;
  campaignName: string;
  description: string;
  perkValue: number;
  perkType: "pct" | "dol";
  platform: string;
  platformIcon: string;
  actionId: string;
  actionsRequired: string[];
  effortLevel: number;
}

interface SubmissionEntry {
  id: string;
  campaignId: string;
  campaignName: string;
  businessName: string;
  proofUrl: string;
  proofType: string;
  notes: string;
  status: "pending" | "approved" | "rejected";
  submittedAt: string;
  perkValue?: number;
}

// ─── Constants outside component ─────────────────────────────────────────

const TIER_COLORS: Record<string, string> = {
  micro: "#22D3EE",
  mid: "#A78BFA",
  macro: "#FBBF24",
  mega: "#F472B6",
};

const PLATFORM_MAP: Record<string, { name: string; icon: string; actionId: string; action: string; effort: number }> = {
  ig: { name: "Instagram", icon: "\uD83D\uDCF8", actionId: "ig_rl", action: "Reel", effort: 3 },
  tt: { name: "TikTok", icon: "\uD83C\uDFAC", actionId: "tt_vd", action: "Video", effort: 3 },
  ggl: { name: "Google", icon: "\uD83C\uDF10", actionId: "ggl_rv", action: "Review", effort: 1 },
  yt: { name: "YouTube", icon: "\uD83D\uDCFA", actionId: "yt_sh", action: "Short", effort: 3 },
  yelp: { name: "Yelp", icon: "\u2B50", actionId: "yelp_rv", action: "Review", effort: 1 },
  fb: { name: "Facebook", icon: "\uD83D\uDC4D", actionId: "fb_ps", action: "Post", effort: 2 },
};

const PLATFORM_KEYS = Object.keys(PLATFORM_MAP);

function buildMarketplaceCampaigns(data: SeedData): MarketplaceCampaign[] {
  const businesses = (data.businesses ?? []).slice(0, 8); // Show first 8 businesses
  const campaigns: MarketplaceCampaign[] = [];

  businesses.forEach((biz, idx) => {
    // Each business gets 1-2 campaigns
    const pk1 = PLATFORM_KEYS[idx % PLATFORM_KEYS.length];
    const p1 = PLATFORM_MAP[pk1];
    campaigns.push({
      id: `mkt-${biz.id}-1`,
      businessId: biz.id,
      businessName: biz.name,
      businessType: biz.type,
      businessAvatar: biz.avatar,
      campaignName: `${p1.action} for ${biz.name}`,
      description: `Share your experience at ${biz.name} with a ${p1.name} ${p1.action.toLowerCase()}.`,
      perkValue: 15 + (idx % 3) * 5,
      perkType: "pct",
      platform: p1.name,
      platformIcon: p1.icon,
      actionId: p1.actionId,
      actionsRequired: [p1.action],
      effortLevel: p1.effort,
    });
    if (idx < 5) {
      const pk2 = PLATFORM_KEYS[(idx + 3) % PLATFORM_KEYS.length];
      const p2 = PLATFORM_MAP[pk2];
      campaigns.push({
        id: `mkt-${biz.id}-2`,
        businessId: biz.id,
        businessName: biz.name,
        businessType: biz.type,
        businessAvatar: biz.avatar,
        campaignName: `${p2.action} Campaign — ${biz.name}`,
        description: `Leave a ${p2.action.toLowerCase()} on ${p2.name} about your visit to ${biz.name}.`,
        perkValue: 10 + (idx % 4) * 5,
        perkType: idx % 2 === 0 ? "pct" : "dol",
        platform: p2.name,
        platformIcon: p2.icon,
        actionId: p2.actionId,
        actionsRequired: [p2.action],
        effortLevel: p2.effort,
      });
    }
  });

  return campaigns;
}

// ═══════════════ Submission Modal ═══════════════

function SubmissionModal({
  campaign,
  onSubmit,
  onClose,
}: {
  campaign: MarketplaceCampaign;
  onSubmit: (proofUrl: string, proofType: string, notes: string) => void;
  onClose: () => void;
}) {
  const [proofUrl, setProofUrl] = useState("");
  const [proofType, setProofType] = useState("url");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = useCallback(() => {
    if (!proofUrl.trim()) {
      setError("Please provide a proof URL.");
      return;
    }
    onSubmit(proofUrl, proofType, notes);
  }, [proofUrl, proofType, notes, onSubmit]);

  const handleProofUrlChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setProofUrl(e.target.value);
    setError("");
  }, []);

  const handleProofTypeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setProofType(e.target.value);
  }, []);

  const handleNotesChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNotes(e.target.value);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Submit proof">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-brand-surface border border-brand-border rounded-xl p-6 animate-fade-up">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-md text-brand-muted hover:text-brand-text hover:bg-brand-elevated transition-colors text-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/40"
          aria-label="Close modal"
        >
          &times;
        </button>
        <h2 className="text-lg font-bold text-brand-text mb-1">Submit Proof</h2>
        <p className="text-xs text-brand-dim mb-4">
          {campaign.platformIcon} {campaign.campaignName}
        </p>

        <div className="bg-brand-elevated/50 rounded-lg p-3 mb-4">
          <div className="text-xs text-brand-muted mb-1">Requirements</div>
          <div className="text-xs text-brand-text">
            {campaign.description}
          </div>
          <div className="flex gap-2 mt-2">
            {campaign.actionsRequired.map((a) => (
              <span key={a} className="px-2 py-0.5 rounded bg-brand-cyan/10 text-brand-cyan text-3xs font-semibold">{a}</span>
            ))}
          </div>
          <div className="text-xs text-brand-green mt-2 font-semibold">
            Perk: {campaign.perkValue}{campaign.perkType === "pct" ? "% off" : " dollars"}
          </div>
        </div>

        <div className="space-y-3 mb-4">
          <div>
            <label className="block text-xs font-semibold text-brand-dim mb-1">Proof URL</label>
            <input
              type="url"
              placeholder="https://instagram.com/p/..."
              value={proofUrl}
              onChange={handleProofUrlChange}
              className="w-full px-3 py-2 rounded-md border border-brand-border bg-brand-bg text-brand-text text-sm font-body outline-none focus:border-brand-cyan/50 focus:ring-2 focus:ring-brand-cyan/40 transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-brand-dim mb-1">Proof Type</label>
            <select
              value={proofType}
              onChange={handleProofTypeChange}
              className="w-full px-3 py-2 rounded-md border border-brand-border bg-brand-bg text-brand-text text-sm font-body outline-none focus:border-brand-cyan/50 focus:ring-2 focus:ring-brand-cyan/40 cursor-pointer appearance-none"
            >
              <option value="url">URL</option>
              <option value="screenshot">Screenshot</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-brand-dim mb-1">Notes (optional)</label>
            <textarea
              placeholder="Any additional context about your submission..."
              value={notes}
              onChange={handleNotesChange}
              rows={3}
              className="w-full px-3 py-2 rounded-md border border-brand-border bg-brand-bg text-brand-text text-sm font-body outline-none focus:border-brand-cyan/50 focus:ring-2 focus:ring-brand-cyan/40 transition-all resize-none"
            />
          </div>
        </div>

        {error && <div className="text-xs text-brand-red mb-3" role="alert" aria-live="polite">{error}</div>}

        <div className="flex gap-3">
          <Button fullWidth onClick={handleSubmit}>
            Submit Proof
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════ Influencer Portal ═══════════════

export interface InfluencerPortalProps {
  influencer: SeedInfluencer;
  data: SeedData;
  save: (d: SeedData) => void;
  onLogout: () => void;
}

export function InfluencerPortal({
  influencer,
  data,
  save,
  onLogout,
}: InfluencerPortalProps) {
  const [page, setPage] = useState<string>("dashboard");
  const [appliedCampaigns, setAppliedCampaigns] = useState<Set<string>>(new Set());
  const { submissions: serverSubmissions, addOptimistic, refresh: refreshSubmissions } = useSubmissions(influencer.id);
  const submissions: SubmissionEntry[] = useMemo(() => serverSubmissions.map(s => ({
    id: s.id,
    campaignId: s.campaignId,
    campaignName: s.campaignName ?? "Campaign",
    businessName: s.businessName ?? "Business",
    proofUrl: s.proofUrl,
    proofType: s.proofType,
    notes: s.notes ?? "",
    status: s.status,
    submittedAt: s.submittedAt?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
    perkValue: s.perkValue,
  })), [serverSubmissions]);

  const [showSubmitModal, setShowSubmitModal] = useState<MarketplaceCampaign | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  // Dispute flow state
  const [disputeId, setDisputeId] = useState<string | null>(null);
  const [disputeReason, setDisputeReason] = useState("");
  const [disputeSubmitted, setDisputeSubmitted] = useState<Set<string>>(new Set());

  // Profile editing state
  const [editingProfile, setEditingProfile] = useState(false);
  const [editBio, setEditBio] = useState(influencer.bio || "");
  const [editLocation, setEditLocation] = useState(influencer.location || "");
  const [profileSaved, setProfileSaved] = useState(false);

  // Timer refs for cleanup
  const submitSuccessTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const profileSavedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (submitSuccessTimer.current) clearTimeout(submitSuccessTimer.current);
      if (profileSavedTimer.current) clearTimeout(profileSavedTimer.current);
    };
  }, []);

  // Marketplace state
  const [platformFilter, setPlatformFilter] = useState("all");
  const [effortFilter, setEffortFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [marketplaceCampaigns, setMarketplaceCampaigns] = useState<MarketplaceCampaign[]>(() => buildMarketplaceCampaigns(data));

  useEffect(() => {
    let cancelled = false;
    async function fetchCampaigns() {
      try {
        const res = await fetch("/api/v1/campaigns?status=active");
        if (!res.ok) return;
        const json = await res.json();
        const campaigns = json.data?.campaigns ?? [];
        if (cancelled || campaigns.length === 0) return;

        // Map API campaigns to MarketplaceCampaign format
        const mapped: MarketplaceCampaign[] = campaigns.map((c: Record<string, unknown>) => ({
          id: c.id as string,
          businessId: (c.businessId ?? c.business_id) as string,
          businessName: (c.businessName as string) ?? "Business",
          businessType: (c.businessType as string) ?? "",
          businessAvatar: (c.businessAvatar as string) ?? "\uD83C\uDFEA",
          campaignName: c.name as string,
          description: (c.description as string) ?? "",
          perkValue: (c.discountValue ?? c.discount_value) as number,
          perkType: ((c.discountType ?? c.discount_type) as "pct" | "dol") ?? "pct",
          platform: "Multiple",
          platformIcon: "\uD83D\uDCF1",
          actionId: ((c.actions as string[]) ?? [])[0] ?? "",
          actionsRequired: (c.actions as string[]) ?? [],
          effortLevel: 2,
        }));
        setMarketplaceCampaigns(mapped);
      } catch {
        // Keep fallback generated campaigns
      }
    }
    fetchCampaigns();
    return () => { cancelled = true; };
  }, []);

  const filteredCampaigns = useMemo(() => {
    return marketplaceCampaigns.filter((c) => {
      if (platformFilter !== "all" && c.platform !== platformFilter) return false;
      if (effortFilter !== "all" && String(c.effortLevel) !== effortFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!c.campaignName.toLowerCase().includes(q) && !c.businessName.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [marketplaceCampaigns, platformFilter, effortFilter, searchQuery]);

  const platforms = useMemo(() => {
    const set = new Set(marketplaceCampaigns.map((c) => c.platform));
    return Array.from(set).sort();
  }, [marketplaceCampaigns]);

  const portalTabs = useMemo(() => [
    { id: "dashboard", label: "Dashboard" },
    { id: "discover", label: "Discover", count: marketplaceCampaigns.length },
    { id: "earnings", label: "Earnings", count: submissions.length || undefined },
    { id: "profile", label: "Profile" },
  ], [marketplaceCampaigns.length, submissions.length]);

  // Memoized computed stats
  const totalEarned = useMemo(
    () => "$" + submissions.filter(s => s.status === "approved").reduce((sum, s) => sum + (s.perkValue || 0), 0),
    [submissions]
  );
  const pendingCount = useMemo(
    () => String(submissions.filter(s => s.status === "pending").length),
    [submissions]
  );
  const pendingEarnings = useMemo(
    () => "$" + submissions.filter(s => s.status === "pending").reduce((sum, s) => sum + (s.perkValue || 0), 0),
    [submissions]
  );
  const submissionCount = useMemo(
    () => String(submissions.length),
    [submissions]
  );

  // Memoized by-campaign breakdown
  const campaignBreakdown = useMemo(() => {
    if (submissions.length === 0) return null;
    const byCampaign = submissions.reduce<Record<string, { name: string; business: string; earned: number; pending: number; count: number }>>((acc, s) => {
      const key = s.campaignId;
      if (!acc[key]) acc[key] = { name: s.campaignName, business: s.businessName, earned: 0, pending: 0, count: 0 };
      acc[key].count++;
      if (s.status === "approved") acc[key].earned += s.perkValue || 0;
      if (s.status === "pending") acc[key].pending += s.perkValue || 0;
      return acc;
    }, {});
    return Object.entries(byCampaign);
  }, [submissions]);

  const handleApply = useCallback((campaign: MarketplaceCampaign) => {
    setShowSubmitModal(campaign);
  }, []);

  const handleSubmitProof = useCallback(async (campaign: MarketplaceCampaign, proofUrl: string, proofType: string, notes: string) => {
    const entry: SubmissionEntry = {
      id: "sub-" + crypto.randomUUID().replace(/-/g, "").slice(0, 9),
      campaignId: campaign.id,
      campaignName: campaign.campaignName,
      businessName: campaign.businessName,
      proofUrl,
      proofType,
      notes,
      status: "pending",
      submittedAt: new Date().toISOString().slice(0, 10),
      perkValue: campaign.perkValue,
    };

    // POST to backend
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      await fetch("/api/v1/submissions", {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId: campaign.id,
          userId: influencer.id,
          actionId: campaign.actionId,
          proofUrl,
          proofType: proofType === "screenshot" ? "screenshot" : "url",
          metadata: { notes, businessId: campaign.businessId, platformId: campaign.platform.toLowerCase() },
        }),
      });
      // Optimistically add and then sync with server
      addOptimistic({
        id: entry.id,
        campaignId: entry.campaignId,
        campaignName: entry.campaignName,
        businessName: entry.businessName,
        proofUrl: entry.proofUrl,
        proofType: entry.proofType,
        notes: entry.notes,
        status: entry.status,
        submittedAt: entry.submittedAt,
        perkValue: entry.perkValue,
      });
      refreshSubmissions();
    } catch {
      if (controller.signal.aborted) {
        setSubmitSuccess(null);
      }
      // Add optimistically even on error/timeout so user's work isn't lost
      addOptimistic({
        id: entry.id,
        campaignId: entry.campaignId,
        campaignName: entry.campaignName,
        businessName: entry.businessName,
        proofUrl: entry.proofUrl,
        proofType: entry.proofType,
        notes: entry.notes,
        status: entry.status,
        submittedAt: entry.submittedAt,
        perkValue: entry.perkValue,
      });
    } finally {
      clearTimeout(timeout);
    }
    setAppliedCampaigns((prev) => new Set(prev).add(campaign.id));
    setShowSubmitModal(null);
    setSubmitSuccess(campaign.campaignName);
    if (submitSuccessTimer.current) clearTimeout(submitSuccessTimer.current);
    submitSuccessTimer.current = setTimeout(() => setSubmitSuccess(null), 3000);
  }, [influencer.id, addOptimistic, refreshSubmissions]);

  const handleCloseSubmitModal = useCallback(() => setShowSubmitModal(null), []);

  const handleGoToDiscover = useCallback(() => setPage("discover"), []);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);

  const handlePlatformFilterChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setPlatformFilter(e.target.value);
  }, []);

  const handleEffortFilterChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setEffortFilter(e.target.value);
  }, []);

  const handleStartEditProfile = useCallback(() => {
    setEditingProfile(true);
    setEditBio(influencer.bio || "");
    setEditLocation(influencer.location || "");
    setProfileSaved(false);
  }, [influencer.bio, influencer.location]);

  const handleSaveProfile = useCallback(() => {
    const updatedInfluencer = { ...influencer, bio: editBio, location: editLocation };
    const updatedInfluencers = (data.influencers ?? []).map((inf) =>
      inf.id === influencer.id ? updatedInfluencer : inf
    );
    save({ ...data, influencers: updatedInfluencers });
    influencer.bio = editBio;
    influencer.location = editLocation;
    setEditingProfile(false);
    setProfileSaved(true);
    if (profileSavedTimer.current) clearTimeout(profileSavedTimer.current);
    profileSavedTimer.current = setTimeout(() => setProfileSaved(false), 3000);
  }, [influencer, editBio, editLocation, data, save]);

  const handleCancelEditProfile = useCallback(() => setEditingProfile(false), []);

  const handleSubmitDispute = useCallback((subId: string) => {
    setDisputeSubmitted((prev) => new Set(prev).add(subId));
    setDisputeId(null);
    setDisputeReason("");
  }, []);

  const handleCancelDispute = useCallback(() => {
    setDisputeId(null);
    setDisputeReason("");
  }, []);

  const handleDisputeReasonChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDisputeReason(e.target.value);
  }, []);

  return (
    <div className="min-h-screen bg-brand-bg">
      {/* Top Bar — sticky with backdrop blur */}
      <div className="sticky top-0 z-40 bg-brand-surface/90 backdrop-blur-xl border-b border-brand-border/50">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo size="sm" />
            <Badge color={TIER_COLORS[influencer.tier]}>{influencer.tier} creator</Badge>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-brand-dim hidden sm:block">{influencer.avatar} {influencer.displayName}</span>
            <Button variant="ghost" size="sm" onClick={onLogout}>Log Out</Button>
          </div>
        </div>
      </div>

      {/* Sub-nav */}
      <nav className="bg-brand-elevated/80 backdrop-blur-lg border-b border-brand-border/50 sticky top-[52px] z-30" aria-label="Creator portal navigation">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-2">
          <Tabs tabs={portalTabs} activeTab={page} onChange={setPage} />
        </div>
      </nav>

      {/* Success toast */}
      {submitSuccess && (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="bg-brand-green/10 border border-brand-green/30 rounded-xl px-4 py-3 text-sm text-brand-green font-medium animate-fade-up" role="status">
            Submitted! Awaiting review for &quot;{submitSuccess}&quot;
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {page === "dashboard" && (
          <div className="animate-fade-up">
            <h1 className="font-heading text-2xl italic mb-1 sm:text-3xl">
              Hey, <span className="text-brand-pink">{influencer.displayName}</span>
            </h1>
            <p className="text-sm text-brand-dim mb-6 sm:mb-8">Here&apos;s your creator dashboard</p>

            <AnimateOnScroll animation="fade-up" stagger staggerDelay={80} className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <Card><Stat value={totalEarned} label="Total Earned" color="#34D399" /></Card>
              <Card><Stat value={pendingCount} label="Pending Review" color="#22D3EE" /></Card>
              <Card><Stat value={formatNumber(influencer.followerCount)} label="Total Followers" color="#F472B6" /></Card>
              <Card><Stat value={influencer.engagementRate + "%"} label="Engagement Rate" color="#FBBF24" /></Card>
            </AnimateOnScroll>

            <AnimateOnScroll animation="fade-up" delay={150}>
            <Card className="mb-4">
              <div className="text-xs font-bold text-brand-dim mb-2">Your Platforms</div>
              <div className="flex gap-2 flex-wrap">
                {influencer.platforms.map((p) => {
                  const platform = PLATFORMS.find((pl) => pl.id === p.platformId);
                  return platform ? (
                    <div key={p.platformId} className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-brand-border">
                      <span className="text-sm">{platform.icon}</span>
                      <span className="text-xs text-brand-dim">{p.handle}</span>
                      <span className="text-3xs font-mono text-brand-muted">{formatNumber(p.followers)}</span>
                    </div>
                  ) : null;
                })}
              </div>
            </Card>
            </AnimateOnScroll>

            <AnimateOnScroll animation="fade-up" delay={250}>
            <Card borderColor="pink">
              <div className="text-xs font-bold text-brand-pink mb-2">Get Started</div>
              <p className="text-xs text-brand-dim mb-3">
                Browse available campaigns from local businesses. Complete actions, earn perks. The more you do, the higher you rank.
              </p>
              <Button size="sm" onClick={handleGoToDiscover}>Discover Campaigns &rarr;</Button>
            </Card>
            </AnimateOnScroll>
          </div>
        )}

        {page === "discover" && (
          <div className="animate-fade-up">
            <h1 className="font-heading text-2xl italic mb-1 sm:text-3xl">Discover Campaigns</h1>
            <p className="text-sm text-brand-dim mb-4 sm:mb-6">
              {filteredCampaigns.length} campaigns from local businesses
            </p>
            <div aria-live="polite" className="sr-only">
              {filteredCampaigns.length} campaigns found
            </div>

            {/* Filters */}
            <Card className="mb-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Search campaigns or businesses..."
                    value={searchQuery}
                    onChange={handleSearchChange}
                    className="w-full px-3 py-2 rounded-md border border-brand-border bg-brand-bg text-brand-text text-sm font-body outline-none focus:border-brand-cyan transition-colors"
                  />
                </div>
                <select
                  value={platformFilter}
                  onChange={handlePlatformFilterChange}
                  className="px-3 py-2 rounded-md border border-brand-border bg-brand-bg text-brand-text text-sm font-body outline-none focus:border-brand-cyan cursor-pointer appearance-none"
                >
                  <option value="all">All Platforms</option>
                  {platforms.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
                <select
                  value={effortFilter}
                  onChange={handleEffortFilterChange}
                  className="px-3 py-2 rounded-md border border-brand-border bg-brand-bg text-brand-text text-sm font-body outline-none focus:border-brand-cyan cursor-pointer appearance-none"
                >
                  <option value="all">Any Effort</option>
                  <option value="1">Low (1)</option>
                  <option value="2">Medium (2)</option>
                  <option value="3">High (3)</option>
                </select>
              </div>
            </Card>

            {/* Campaign Cards */}
            <div className="space-y-3">
              {filteredCampaigns.map((campaign) => {
                const applied = appliedCampaigns.has(campaign.id);
                return (
                  <Card key={campaign.id}>
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">{campaign.platformIcon}</span>
                          <span className="text-sm font-bold text-brand-text">{campaign.campaignName}</span>
                        </div>
                        <div className="text-xs text-brand-muted mb-2">
                          {campaign.businessAvatar} {campaign.businessName} &middot; {campaign.businessType}
                        </div>
                        <div className="text-xs text-brand-dim mb-2">{campaign.description}</div>
                        <div className="flex gap-2 flex-wrap">
                          {campaign.actionsRequired.map((a) => (
                            <span key={a} className="px-2 py-0.5 rounded-md bg-brand-elevated text-3xs text-brand-text">{a}</span>
                          ))}
                          <span className="px-2 py-0.5 rounded-md bg-brand-elevated text-3xs text-brand-muted">
                            Effort: {"\u25CF".repeat(campaign.effortLevel)}{"\u25CB".repeat(5 - campaign.effortLevel)}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2 min-w-[100px]">
                        <div className="font-mono text-lg font-semibold text-brand-green">
                          {campaign.perkValue}{campaign.perkType === "pct" ? "%" : "$"}
                        </div>
                        <div className="text-3xs text-brand-muted">perk value</div>
                        {applied ? (
                          <span className="px-3 py-1.5 rounded-md bg-brand-green/10 text-brand-green text-xs font-semibold">
                            Applied
                          </span>
                        ) : (
                          <Button size="sm" onClick={() => handleApply(campaign)}>
                            Apply
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
              {filteredCampaigns.length === 0 && (
                <Card className="text-center py-10">
                  <div className="text-sm text-brand-muted">No campaigns match your filters.</div>
                </Card>
              )}
            </div>
          </div>
        )}

        {page === "earnings" && (
          <div className="animate-fade-up">
            <h1 className="font-heading text-2xl italic mb-1 sm:text-3xl">Earnings &amp; Submissions</h1>
            <p className="text-sm text-brand-dim mb-6 sm:mb-8">Track your submissions and income</p>
            <div className="grid grid-cols-3 gap-3 mb-6">
              <Card><Stat value={totalEarned} label="Earned" color="#34D399" /></Card>
              <Card><Stat value={pendingEarnings} label="Pending" color="#FBBF24" /></Card>
              <Card><Stat value={submissionCount} label="Submissions" color="#22D3EE" /></Card>
            </div>

            {/* By-campaign breakdown */}
            {campaignBreakdown && campaignBreakdown.length > 0 && (
              <div className="mb-6">
                <h2 className="text-sm font-semibold text-brand-dim mb-3">Earnings by Campaign</h2>
                <div className="space-y-2">
                  {campaignBreakdown.map(([id, c]) => (
                    <Card key={id}>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-bold text-brand-text">{c.name}</div>
                          <div className="text-xs text-brand-muted">{c.business} &middot; {c.count} submission{c.count !== 1 ? "s" : ""}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono text-sm font-semibold text-brand-green">${c.earned}</div>
                          {c.pending > 0 && <div className="font-mono text-xs text-brand-amber">${c.pending} pending</div>}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {submissions.length === 0 ? (
              <Card className="text-center py-12">
                <div className="text-3xl mb-3">&#x1F4B0;</div>
                <div className="text-sm font-bold mb-1">No submissions yet</div>
                <div className="text-xs text-brand-dim mb-3">Apply to campaigns and submit proof to start earning</div>
                <Button size="sm" onClick={handleGoToDiscover}>Discover Campaigns &rarr;</Button>
              </Card>
            ) : (
              <div className="space-y-3">
                {submissions.map((sub) => (
                  <Card key={sub.id}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-bold text-brand-text">{sub.campaignName}</div>
                        <div className="text-xs text-brand-muted">{sub.businessName} &middot; {sub.submittedAt}</div>
                        <a href={sub.proofUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-cyan hover:underline mt-1 block">
                          View Proof &rarr;
                        </a>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-sm font-semibold text-brand-green">${sub.perkValue || 0}</div>
                        <Badge color={sub.status === "approved" ? "#34D399" : sub.status === "rejected" ? "#EF4444" : "#FBBF24"}>
                          {sub.status}
                        </Badge>
                        {sub.status === "rejected" && !disputeSubmitted.has(sub.id) && disputeId !== sub.id && (
                          <button
                            type="button"
                            aria-expanded={false}
                            onClick={() => { setDisputeId(sub.id); setDisputeReason(""); }}
                            className="mt-1 text-xs text-brand-amber hover:text-brand-amber/80 transition-colors block ml-auto"
                          >
                            Dispute
                          </button>
                        )}
                        {disputeSubmitted.has(sub.id) && (
                          <span className="mt-1 text-xs text-brand-dim block">Dispute sent</span>
                        )}
                      </div>
                    </div>
                    {/* Inline dispute form */}
                    {disputeId === sub.id && (
                      <div className="mt-3 pt-3 border-t border-brand-border animate-fade-up">
                        <label className="block text-xs font-semibold text-brand-dim mb-1">Reason for dispute</label>
                        <textarea
                          value={disputeReason}
                          onChange={handleDisputeReasonChange}
                          rows={2}
                          placeholder="Explain why you think this rejection was incorrect..."
                          className="w-full px-3 py-2 rounded-md border border-brand-border bg-brand-bg text-brand-text text-xs outline-none focus:border-brand-cyan transition-colors resize-none"
                        />
                        <div className="flex gap-2 mt-2">
                          <Button size="sm" disabled={!disputeReason.trim()} onClick={() => handleSubmitDispute(sub.id)}>
                            Submit Dispute
                          </Button>
                          <Button variant="ghost" size="sm" onClick={handleCancelDispute}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {page === "profile" && (
          <div className="animate-fade-up">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="font-heading text-2xl italic mb-1 sm:text-3xl">Your Profile</h1>
                <p className="text-sm text-brand-dim">Manage your creator profile and rate card</p>
              </div>
              <Button size="sm" variant="ghost" onClick={editingProfile ? handleCancelEditProfile : handleStartEditProfile} aria-expanded={editingProfile}>
                {editingProfile ? "Cancel Editing" : "Edit Profile"}
              </Button>
            </div>

            {profileSaved && (
              <div className="bg-brand-green/10 border border-brand-green/30 rounded-lg px-4 py-2.5 text-sm text-brand-green font-medium mb-4" role="status">
                Profile updated successfully.
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <div className="text-xs font-bold mb-3">Profile Info</div>
                <div className="text-3xl mb-3">{influencer.avatar}</div>
                <div className="text-sm font-bold">{influencer.displayName}</div>

                {editingProfile ? (
                  <div className="mt-3 space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-brand-dim mb-1">Bio</label>
                      <textarea
                        value={editBio}
                        onChange={(e) => setEditBio(e.target.value)}
                        rows={3}
                        placeholder="Tell businesses about yourself..."
                        className="w-full px-3 py-2 rounded-md border border-brand-border bg-brand-bg text-brand-text text-xs outline-none focus:border-brand-cyan transition-colors resize-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-brand-dim mb-1">Location</label>
                      <input
                        type="text"
                        value={editLocation}
                        onChange={(e) => setEditLocation(e.target.value)}
                        placeholder="City, State"
                        className="w-full px-3 py-2 rounded-md border border-brand-border bg-brand-bg text-brand-text text-xs outline-none focus:border-brand-cyan transition-colors"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleSaveProfile}>
                        Save Changes
                      </Button>
                      <Button variant="ghost" size="sm" onClick={handleCancelEditProfile}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="text-xs text-brand-dim mt-1">{influencer.bio || "No bio yet"}</div>
                    <div className="mt-3">
                      <Badge color={TIER_COLORS[influencer.tier]}>{influencer.tier} tier</Badge>
                    </div>
                    <div className="flex gap-1 flex-wrap mt-3">
                      {influencer.niches.map((n) => (
                        <Badge key={n} color="muted">{n}</Badge>
                      ))}
                    </div>
                  </>
                )}
              </Card>
              <Card>
                <div className="text-xs font-bold mb-3">Stats</div>
                <div className="space-y-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-brand-dim">Followers</span>
                    <span className="font-mono text-brand-text">{formatNumber(influencer.followerCount)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-brand-dim">Engagement Rate</span>
                    <span className="font-mono text-brand-text">{influencer.engagementRate}%</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-brand-dim">Location</span>
                    <span className="font-mono text-brand-text">{influencer.location || "Not set"}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-brand-dim">Platforms</span>
                    <span className="font-mono text-brand-text">{influencer.platforms.length}</span>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}
      </div>

      {/* Submission Modal */}
      {showSubmitModal && (
        <SubmissionModal
          campaign={showSubmitModal}
          onSubmit={(proofUrl, proofType, notes) => handleSubmitProof(showSubmitModal, proofUrl, proofType, notes)}
          onClose={handleCloseSubmitModal}
        />
      )}
    </div>
  );
}
