"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Stat } from "@/components/ui/stat";
import { Logo } from "@/components/ui/logo";
import { useBusinessDashboard } from "@/lib/hooks/use-business-dashboard";
import { useRealtime } from "@/lib/hooks/use-realtime";
import { AnimateOnScroll } from "@/components/shared/animate-on-scroll";
import { PLATFORMS } from "@/lib/platforms";
import type { SeedData, SeedBusiness } from "@/lib/seed";

// ─── Types ──────────────────────────────────────────────────────────────────

interface ActiveCampaign {
  id: string;
  name: string;
  platform: string;
  platformIcon: string;
  action: string;
  rewardType: "pct" | "dol" | "free";
  rewardValue: string;
  status: "active" | "paused" | "ended";
  completions: number;
  createdAt: string;
}

export interface BusinessPortalProps {
  biz: SeedBusiness;
  data: SeedData;
  save: (d: SeedData) => void;
  onLogout: () => void;
}

// ─── Platform/Action data for the creator ────────────────────────────────────

const PLATFORM_OPTIONS = PLATFORMS.slice(0, 8).map((p) => ({
  id: p.id,
  name: p.name,
  icon: p.icon,
  color: p.color,
  actions: p.actions
    .filter((a) => (a.type === "content" || a.type === "review") && a.incentivizable !== false)
    .slice(0, 5)
    .map((a) => ({ id: a.id, label: a.label, effort: a.effort })),
})).filter((p) => p.actions.length > 0);

// ─── Campaign Templates ─────────────────────────────────────────────────────

const CAMPAIGN_TEMPLATES = [
  { id: "t-review", label: "Google Review Campaign", platformId: "ggl", actionId: "ggl_rv", rewardType: "pct" as const, rewardValue: "15", name: "Google Review for Discount" },
  { id: "t-ig-story", label: "Instagram Story Mention", platformId: "ig", actionId: "ig_st", rewardType: "pct" as const, rewardValue: "10", name: "Tag Us in Your Story" },
  { id: "t-tt-video", label: "TikTok Video Feature", platformId: "tt", actionId: "tt_vd", rewardType: "dol" as const, rewardValue: "5", name: "TikTok Video Review" },
];

// ─── Constant arrays/objects used in rendering ──────────────────────────────

const STEP_NUMBERS = [1, 2, 3] as const;

const REWARD_OPTIONS = [
  { value: "pct" as const, label: "% Off", desc: "Percentage discount", example: "e.g. 15% off" },
  { value: "dol" as const, label: "$ Off", desc: "Dollar amount off", example: "e.g. $5 off" },
  { value: "free" as const, label: "Free Item", desc: "Something free", example: "e.g. free coffee" },
] as const;

// ─── Component ──────────────────────────────────────────────────────────────

export function BusinessPortal({ biz, data, save, onLogout }: BusinessPortalProps) {
  const [page, setPage] = useState<"home" | "create" | "campaigns">("home");
  const [myCampaigns, setMyCampaigns] = useState<ActiveCampaign[]>([]);

  // Create campaign state
  const [step, setStep] = useState(1);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [rewardType, setRewardType] = useState<"pct" | "dol" | "free">("pct");
  const [rewardValue, setRewardValue] = useState("");
  const [campaignName, setCampaignName] = useState("");
  const [launching, setLaunching] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [showWelcome, setShowWelcome] = useState(true);

  const { stats } = useBusinessDashboard(biz.id);
  const { connected, subscribe } = useRealtime({ businessId: biz.id });

  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast(msg);
    toastTimerRef.current = setTimeout(() => setToast(null), 4000);
  }, []);

  useEffect(() => {
    return () => { if (toastTimerRef.current) clearTimeout(toastTimerRef.current); };
  }, []);

  useEffect(() => {
    const unsub = subscribe("submission.created", () => {
      showToast("New submission received!");
    });
    return unsub;
  }, [subscribe, showToast]);

  // Get platform/action info — memoized
  const platform = useMemo(
    () => PLATFORM_OPTIONS.find((p) => p.id === selectedPlatform),
    [selectedPlatform]
  );
  const action = useMemo(
    () => platform?.actions.find((a) => a.id === selectedAction),
    [platform, selectedAction]
  );

  const resetCreate = useCallback(() => {
    setStep(1);
    setSelectedPlatform(null);
    setSelectedAction(null);
    setRewardType("pct");
    setRewardValue("");
    setCampaignName("");
    setScheduleDate("");
  }, []);

  const applyTemplate = useCallback((templateId: string) => {
    const tpl = CAMPAIGN_TEMPLATES.find((t) => t.id === templateId);
    if (!tpl) return;
    setSelectedPlatform(tpl.platformId);
    setSelectedAction(tpl.actionId);
    setRewardType(tpl.rewardType);
    setRewardValue(tpl.rewardValue);
    setCampaignName(tpl.name);
    setStep(3);
    setPage("create");
  }, []);

  const exportCSV = useCallback(() => {
    if (myCampaigns.length === 0) return;
    const header = "Name,Platform,Action,Reward,Status,Completions,Created";
    const rows = myCampaigns.map((c) =>
      [c.name, c.platform, c.action, c.rewardValue, c.status, c.completions, c.createdAt]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",")
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `campaigns-${biz.name.replace(/\s+/g, "-").toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [myCampaigns, biz.name]);

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Memoized computed values for the stats section
  const activeCampaignCount = useMemo(
    () => String(myCampaigns.filter((c) => c.status === "active").length),
    [myCampaigns]
  );
  const totalCompletions = useMemo(
    () => String(myCampaigns.reduce((s, c) => s + c.completions, 0)),
    [myCampaigns]
  );

  const handleLaunch = useCallback(async () => {
    if (!platform || !action) return;

    const name = campaignName || `${action.label} on ${platform.name}`;
    setLaunching(true);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const token = document.cookie.match(/sp-access-token=([^;]+)/)?.[1];
      const res = await fetch("/api/v1/campaigns", {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          businessId: biz.id,
          name,
          description: `${action.label} on ${platform.name} for ${biz.name}`,
          actions: [action.id],
          discountValue: rewardType === "free" ? 100 : parseInt(rewardValue) || 10,
          discountType: rewardType === "free" ? "pct" : rewardType,
          expiresInDays: 30,
        }),
      });
      if (!res.ok) {
        showToast("Failed to launch campaign. Please try again.");
        setLaunching(false);
        return;
      }
    } catch {
      if (controller.signal.aborted) {
        showToast("Request timed out. Please try again.");
        setLaunching(false);
        return;
      }
      // Non-timeout network error — proceed with optimistic creation
    } finally {
      clearTimeout(timeout);
    }

    const newCampaign: ActiveCampaign = {
      id: crypto.randomUUID(),
      name,
      platform: platform.name,
      platformIcon: platform.icon,
      action: action.label,
      rewardType,
      rewardValue: rewardType === "free" ? "Free item" : `${rewardValue}${rewardType === "pct" ? "%" : "$"} off`,
      status: "active",
      completions: 0,
      createdAt: new Date().toISOString().slice(0, 10),
    };

    setMyCampaigns((prev) => [newCampaign, ...prev]);
    save({ ...data, campaigns: [...(data.campaigns || []), { ...newCampaign }] });
    setLaunching(false);
    resetCreate();
    setPage("home");
    showToast(`"${newCampaign.name}" is live!`);
  }, [platform, action, campaignName, biz.id, biz.name, rewardType, rewardValue, data, save, resetCreate, showToast]);

  const handlePlatformSelect = useCallback((platformId: string) => {
    setSelectedPlatform(platformId);
    setSelectedAction(null);
  }, []);

  const handleScheduleDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.value;
    if (picked && picked < todayStr) return;
    setScheduleDate(picked);
  }, [todayStr]);

  const handleDismissWelcome = useCallback(() => setShowWelcome(false), []);

  const handleGoToCreate = useCallback(() => {
    resetCreate();
    setPage("create");
  }, [resetCreate]);

  const handleBackToHome = useCallback(() => setPage("home"), []);
  const handleGoToStep2 = useCallback(() => setStep(2), []);
  const handleGoToStep3 = useCallback(() => setStep(3), []);
  const handleGoToStep1 = useCallback(() => setStep(1), []);

  return (
    <div className="min-h-screen bg-brand-bg">
      {/* Top Bar — sticky with backdrop blur */}
      <div className="sticky top-0 z-40 bg-brand-surface/90 backdrop-blur-xl border-b border-brand-border/50">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo size="sm" />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-brand-dim hidden sm:block">{biz.avatar} {biz.name}</span>
            {connected && <span className="flex h-2 w-2 rounded-full bg-brand-green animate-pulse" title="Live" />}
            <Button variant="ghost" size="sm" onClick={onLogout}>Log Out</Button>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="bg-brand-green/10 border border-brand-green/30 rounded-xl px-4 py-3 text-sm text-brand-green font-medium animate-fade-up" role="status">
            {toast}
          </div>
        </div>
      )}

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">

        {/* ════════════ HOME ════════════ */}
        {page === "home" && (
          <div className="animate-fade-up">
            <h1 className="font-heading text-2xl italic text-brand-white mb-1 sm:text-3xl">{biz.name}</h1>
            <p className="text-sm text-brand-dim mb-8 sm:mb-10">{biz.type} &middot; {biz.location || "Your business"}</p>

            {/* Stats (only if there are campaigns) */}
            {myCampaigns.length > 0 && (
              <AnimateOnScroll animation="fade-up" stagger staggerDelay={80} className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
                <Card><Stat value={activeCampaignCount} label="Active" color="cyan" /></Card>
                <Card><Stat value={totalCompletions} label="Completions" color="green" /></Card>
                <Card><Stat value={String(stats.reviews)} label="Reviews" color="amber" /></Card>
                <Card><Stat value={"$" + stats.marketingValue} label="Value" color="pink" /></Card>
              </AnimateOnScroll>
            )}

            {/* Welcome card (dismissible) */}
            {showWelcome && myCampaigns.length === 0 && (
              <Card className="mb-6 bg-brand-cyan/5 border-brand-cyan/20 relative">
                <button
                  type="button"
                  onClick={handleDismissWelcome}
                  className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-md text-brand-muted hover:text-brand-text hover:bg-brand-elevated transition-colors text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/40"
                  aria-label="Dismiss welcome card"
                >
                  &times;
                </button>
                <div className="pr-6">
                  <p className="text-sm font-semibold text-brand-white mb-1">Welcome to Social Perks!</p>
                  <p className="text-xs text-brand-dim">
                    Get started by creating your first campaign or pick a template below. Customers will see your campaign, complete the action, and earn a perk.
                  </p>
                </div>
              </Card>
            )}

            {/* Quick-start templates */}
            {myCampaigns.length === 0 && (
              <AnimateOnScroll animation="fade-up" delay={100} className="mb-6">
                <h2 className="text-sm font-semibold text-brand-dim mb-3">Quick-start templates</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {CAMPAIGN_TEMPLATES.map((tpl) => {
                    const tplPlatform = PLATFORM_OPTIONS.find((p) => p.id === tpl.platformId);
                    return (
                      <button
                        key={tpl.id}
                        onClick={() => applyTemplate(tpl.id)}
                        className="rounded-xl border border-brand-border bg-brand-surface/30 p-4 text-left transition-all hover:border-brand-cyan hover:bg-brand-surface/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/40"
                      >
                        <span className="text-lg">{tplPlatform?.icon ?? "📱"}</span>
                        <p className="text-xs font-semibold text-brand-white mt-2">{tpl.label}</p>
                        <p className="text-xs text-brand-muted mt-0.5">{tpl.rewardValue}{tpl.rewardType === "pct" ? "%" : "$"} off</p>
                      </button>
                    );
                  })}
                </div>
              </AnimateOnScroll>
            )}

            {/* Create new campaign button */}
            <button
              onClick={handleGoToCreate}
              className="w-full rounded-xl border-2 border-dashed border-brand-cyan/30 bg-brand-cyan/[0.03] p-8 sm:p-10 text-center transition-all duration-300 hover:border-brand-cyan/60 hover:bg-brand-cyan/[0.07] mb-6 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/40 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-bg"
            >
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-brand-cyan/10 text-brand-cyan text-2xl transition-transform duration-300 group-hover:scale-110">+</span>
              <p className="mt-3 text-sm font-semibold text-brand-white">Create a new campaign</p>
              <p className="mt-1 text-xs text-brand-dim">Pick what you want customers to do and what they get</p>
            </button>

            {/* Active campaigns list */}
            {myCampaigns.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-brand-dim">Your campaigns</h2>
                  <button
                    type="button"
                    onClick={exportCSV}
                    className="text-xs text-brand-cyan hover:text-brand-white transition-colors py-1 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/40"
                  >
                    Export CSV
                  </button>
                </div>
                <AnimateOnScroll animation="fade-up" stagger staggerDelay={60} className="space-y-3">
                  {myCampaigns.map((campaign) => (
                    <Card key={campaign.id}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{campaign.platformIcon}</span>
                          <div>
                            <p className="text-sm font-semibold text-brand-white">{campaign.name}</p>
                            <p className="text-xs text-brand-muted">
                              {campaign.action} &middot; Reward: {campaign.rewardValue} &middot; {campaign.completions} completions
                            </p>
                          </div>
                        </div>
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                          campaign.status === "active"
                            ? "bg-brand-green/10 text-brand-green"
                            : "bg-brand-muted/10 text-brand-muted"
                        }`}>
                          {campaign.status}
                        </span>
                      </div>
                    </Card>
                  ))}
                </AnimateOnScroll>
              </div>
            )}

            {/* Empty state */}
            {myCampaigns.length === 0 && (
              <Card className="text-center py-10 bg-brand-surface/30">
                <p className="text-sm text-brand-dim">No campaigns yet. Create your first one above.</p>
                <p className="text-xs text-brand-muted mt-2">It takes less than a minute.</p>
              </Card>
            )}
          </div>
        )}

        {/* ════════════ CREATE CAMPAIGN ════════════ */}
        {page === "create" && (
          <div className="animate-fade-up">
            <button onClick={handleBackToHome} className="inline-flex items-center gap-1 text-xs text-brand-dim hover:text-brand-text mb-8 py-2 transition-colors rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/40">
              &larr; <span>Back to dashboard</span>
            </button>

            {/* Step indicator */}
            <div className="flex items-center gap-2 mb-8 sm:mb-10">
              {STEP_NUMBERS.map((s) => (
                <div key={s} className="flex items-center gap-2">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors duration-200 ${
                    step >= s ? "bg-brand-cyan text-brand-bg shadow-md shadow-brand-cyan/20" : "bg-brand-elevated text-brand-muted"
                  }`}>
                    {s}
                  </div>
                  {s < 3 && <div className={`h-px w-8 sm:w-16 transition-colors duration-200 ${step > s ? "bg-brand-cyan" : "bg-brand-border/50"}`} />}
                </div>
              ))}
            </div>

            {/* STEP 1: Pick platform & action */}
            {step === 1 && (
              <div>
                <h1 className="font-heading text-xl italic text-brand-white mb-2 sm:text-2xl">What do you want customers to do?</h1>
                <p className="text-sm text-brand-dim mb-6 sm:mb-8">Pick a platform, then pick the action.</p>

                {/* Platform picker */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                  {PLATFORM_OPTIONS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handlePlatformSelect(p.id)}
                      className={`rounded-xl border-2 p-4 text-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/40 ${
                        selectedPlatform === p.id
                          ? "border-brand-cyan bg-brand-cyan/10"
                          : "border-brand-border/50 bg-brand-surface/30 hover:border-brand-border"
                      }`}
                    >
                      <span className="text-2xl">{p.icon}</span>
                      <p className="mt-2 text-xs font-medium text-brand-white">{p.name}</p>
                    </button>
                  ))}
                </div>

                {/* Action picker (shows after platform selected) */}
                {platform && (
                  <div className="animate-fade-up">
                    <p className="text-sm text-brand-dim mb-3">What should they do on {platform.name}?</p>
                    <div className="space-y-2">
                      {platform.actions.map((a) => (
                        <button
                          key={a.id}
                          onClick={() => setSelectedAction(a.id)}
                          className={`w-full rounded-lg border p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/40 ${
                            selectedAction === a.id
                              ? "border-brand-cyan bg-brand-cyan/10"
                              : "border-brand-border/50 bg-brand-surface/20 hover:border-brand-border"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-brand-white">{a.label}</span>
                            <span className="text-xs text-brand-muted">
                              Effort: {"●".repeat(a.effort)}{"○".repeat(Math.max(0, 5 - a.effort))}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>

                    {selectedAction && (
                      <Button className="mt-6" onClick={handleGoToStep2}>
                        Next: Set the reward &rarr;
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* STEP 2: Set the reward */}
            {step === 2 && (
              <div>
                <h1 className="font-heading text-xl italic text-brand-white mb-2 sm:text-2xl">What do they get in return?</h1>
                <p className="text-sm text-brand-dim mb-6">
                  For every <span className="text-brand-cyan font-medium">{action?.label}</span> on{" "}
                  <span className="text-brand-cyan font-medium">{platform?.name}</span>, the customer gets:
                </p>

                {/* Reward type */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                  {REWARD_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setRewardType(opt.value)}
                      className={`rounded-xl border-2 p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/40 ${
                        rewardType === opt.value
                          ? "border-brand-green bg-brand-green/10"
                          : "border-brand-border/50 bg-brand-surface/20 hover:border-brand-border"
                      }`}
                    >
                      <p className="text-sm font-semibold text-brand-white">{opt.label}</p>
                      <p className="text-xs text-brand-dim mt-1">{opt.example}</p>
                    </button>
                  ))}
                </div>

                {/* Reward value */}
                {rewardType !== "free" && (
                  <div className="mb-6">
                    <label className="block text-sm text-brand-dim mb-2">
                      How much {rewardType === "pct" ? "percent" : "dollars"} off?
                    </label>
                    <div className="flex items-center gap-2">
                      {rewardType === "dol" && <span className="text-lg text-brand-white">$</span>}
                      <input
                        type="number"
                        min="1"
                        max={rewardType === "pct" ? 100 : 500}
                        value={rewardValue}
                        onChange={(e) => setRewardValue(e.target.value)}
                        placeholder={rewardType === "pct" ? "15" : "5"}
                        className="w-24 px-3 py-2.5 rounded-lg border border-brand-border bg-brand-bg text-brand-white text-lg font-mono outline-none focus:border-brand-cyan/50 focus:ring-2 focus:ring-brand-cyan/40"
                      />
                      {rewardType === "pct" && <span className="text-lg text-brand-white">%</span>}
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button variant="ghost" onClick={handleGoToStep1}>&larr; Back</Button>
                  <Button onClick={handleGoToStep3} disabled={rewardType !== "free" && !rewardValue}>
                    Next: Review &rarr;
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 3: Review & launch */}
            {step === 3 && (
              <div>
                <h1 className="font-heading text-xl italic text-brand-white mb-2 sm:text-2xl">Review your campaign</h1>
                <p className="text-sm text-brand-dim mb-6 sm:mb-8">Make sure everything looks right, then launch.</p>

                <Card className="mb-6 bg-brand-surface/50">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs text-brand-muted mb-1">Campaign name (optional)</label>
                      <input
                        type="text"
                        value={campaignName}
                        onChange={(e) => setCampaignName(e.target.value)}
                        placeholder={`${action?.label} on ${platform?.name}`}
                        className="w-full px-3 py-2 rounded-lg border border-brand-border bg-brand-bg text-brand-white text-sm outline-none focus:border-brand-cyan/50 focus:ring-2 focus:ring-brand-cyan/40 transition-all"
                      />
                    </div>

                    <div className="rounded-lg bg-brand-bg/50 p-4 space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-brand-muted">Platform</span>
                        <span className="text-brand-white">{platform?.icon} {platform?.name}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-brand-muted">Customer action</span>
                        <span className="text-brand-white">{action?.label}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-brand-muted">Reward</span>
                        <span className="text-brand-green font-semibold">
                          {rewardType === "free" ? "Free item" : `${rewardValue}${rewardType === "pct" ? "%" : "$"} off`}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-brand-muted">Duration</span>
                        <span className="text-brand-white">30 days</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs text-brand-muted mb-1">Schedule start date (optional)</label>
                      <input
                        type="date"
                        value={scheduleDate}
                        min={todayStr}
                        onChange={handleScheduleDateChange}
                        className="w-full px-3 py-2 rounded-lg border border-brand-border bg-brand-bg text-brand-white text-sm outline-none focus:border-brand-cyan/50 focus:ring-2 focus:ring-brand-cyan/40 transition-all [color-scheme:dark]"
                      />
                      {scheduleDate && scheduleDate < todayStr && (
                        <p className="text-xs text-brand-red mt-1">Start date cannot be in the past.</p>
                      )}
                    </div>
                  </div>
                </Card>

                <div className="flex gap-3">
                  <Button variant="ghost" onClick={() => setStep(2)}>&larr; Back</Button>
                  <Button onClick={handleLaunch} disabled={launching}>
                    {launching ? "Launching..." : "Launch Campaign"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
