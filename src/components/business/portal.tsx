"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { useBusinessDashboard } from "@/lib/hooks/use-business-dashboard";
import { useRealtime } from "@/lib/hooks/use-realtime";
import { useToast } from "@/lib/context/app-context";
import { PLATFORMS } from "@/lib/platforms";
import { apiFetch } from "@/lib/api/csrf-fetch";
import { PortalHome } from "./portal-home";
import { PortalCreate } from "./portal-create";
import { PortalAnalytics } from "./portal-analytics";
import { OnboardingWizard } from "./onboarding-wizard";
import { CampaignEditModal } from "./campaign-edit-modal";
import { SectionErrorBoundary } from "@/components/ui/section-error-boundary";
import { DashboardSkeleton } from "@/components/ui/portal-skeletons";
import { NotificationCenter } from "@/components/shared/notification-center";
import type { SeedData, SeedBusiness } from "@/lib/seed";
import type { CampaignTemplate } from "@/lib/campaign-templates";

// Lazy-loaded tabs for code splitting
const AnalyticsDashboard = dynamic(
  () => import("@/components/business/analytics-dashboard").then(m => ({ default: m.AnalyticsDashboard })),
);
const BusinessSettings = dynamic(
  () => import("@/components/business/settings").then(m => ({ default: m.BusinessSettings })),
);
const OnboardingChecklist = dynamic(
  () => import("@/components/business/onboarding-checklist").then(m => ({ default: m.OnboardingChecklist })),
);
const CampaignDetail = dynamic(
  () => import("@/components/business/campaign-detail").then(m => ({ default: m.CampaignDetail })),
);

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
  const [page, setPage] = useState<"home" | "create" | "campaigns" | "analytics" | "analytics-detail" | "settings" | "campaign-detail">("home");
  const [myCampaigns, setMyCampaigns] = useState<ActiveCampaign[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);

  // Hydrate campaign list on mount. Without this, the dashboard always shows
  // "No campaigns yet" after a page reload because myCampaigns is initialised
  // empty and there was no path to populate it from the server. Pull from the
  // API so campaigns persisted by the onboarding wizard (or via another
  // device) actually show up.
  useEffect(() => {
    let cancelled = false;
    const token =
      typeof document !== "undefined"
        ? document.cookie.match(/sp-access-token=([^;]+)/)?.[1]
        : null;
    fetch(`/api/v1/campaigns?businessId=${encodeURIComponent(biz.id)}`, {
      credentials: "include",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => {
        if (cancelled || !body) return;
        const raw = (body?.data?.campaigns ?? body?.campaigns ?? []) as unknown[];
        if (!Array.isArray(raw) || raw.length === 0) return;
        // Normalize the lifecycle shape coming back from the API
        // (`completions: {current,max}`, `budget: {...}`, etc.) to the flat
        // `ActiveCampaign` shape this component renders. Without this the
        // portal crashed with React error #31 ("Objects are not valid as
        // a React child") because portal-home renders `{c.completions}`
        // directly as text — which works for a number, not an object.
        const normalized: ActiveCampaign[] = raw.map((r) => {
          const rec = r as Record<string, unknown>;
          const completionsRaw = rec.completions as
            | number
            | { current?: number }
            | undefined;
          const completionsCount =
            typeof completionsRaw === "number"
              ? completionsRaw
              : (completionsRaw?.current ?? 0);
          const budget = rec.budget as
            | { allocated?: number; type?: string }
            | undefined;
          const expiry = rec.expiry as { launchedAt?: string } | undefined;
          const stateField = rec.state ?? rec.status;
          return {
            id: String(rec.id ?? ""),
            name: String(rec.name ?? rec.id ?? "Campaign"),
            platform: String(rec.platform ?? "—"),
            platformIcon: String(rec.platformIcon ?? "🔗"),
            action: String(rec.action ?? "—"),
            rewardType:
              (budget?.type as "pct" | "dol") ??
              ((rec.rewardType as "pct" | "dol" | "free") || "pct"),
            rewardValue:
              budget?.allocated != null
                ? String(budget.allocated)
                : String(rec.rewardValue ?? ""),
            status:
              stateField === "active" ||
              stateField === "paused" ||
              stateField === "ended"
                ? (stateField as "active" | "paused" | "ended")
                : "active",
            completions: completionsCount,
            createdAt: String(
              expiry?.launchedAt ?? rec.createdAt ?? new Date().toISOString()
            ),
          };
        });
        setMyCampaigns(normalized);
      })
      .catch(() => {
        /* leave myCampaigns empty; UI will show "No campaigns yet" */
      });
    return () => {
      cancelled = true;
    };
  }, [biz.id]);

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
  const [showOnboarding, setShowOnboarding] = useState(true);

  const { stats, loading: dashboardLoading } = useBusinessDashboard(biz.id);
  const { connected, subscribe } = useRealtime({ businessId: biz.id });

  // Extract auth token from cookie for SSE notifications
  const authToken = useMemo(() => {
    if (typeof document === "undefined") return null;
    return document.cookie.match(/sp-access-token=([^;]+)/)?.[1] ?? null;
  }, []);

  // Toast notifications via AppContext
  const contextShowToast = useToast();
  const showToast = useCallback((msg: string) => {
    contextShowToast(msg, "success", 4000);
  }, [contextShowToast]);

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

  const applyRichTemplate = useCallback((tpl: CampaignTemplate) => {
    setSelectedPlatform(tpl.platform);
    setSelectedAction(tpl.actionId);
    setRewardType(tpl.discountType);
    setRewardValue(String(tpl.discountValue));
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
      const res = await apiFetch("/api/v1/campaigns", {
        method: "POST",
        signal: controller.signal,
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

  const handleOnboardingComplete = useCallback(() => setShowOnboarding(false), []);
  const handleOnboardingSkip = useCallback(() => setShowOnboarding(false), []);

  const handleViewCampaignDetail = useCallback((campaignId: string) => {
    setSelectedCampaignId(campaignId);
    setPage("campaign-detail");
  }, []);

  const handleBackFromCampaignDetail = useCallback(() => {
    setSelectedCampaignId(null);
    setPage("home");
  }, []);

  const handleChecklistNavigate = useCallback((section: string) => {
    if (section === "create") {
      resetCreate();
      setPage("create");
    } else if (section === "analytics-detail" || section === "analytics") {
      setPage("analytics");
    } else if (section === "settings") {
      setPage("settings");
    }
  }, [resetCreate]);


  const handleBackToHome = useCallback(() => setPage("home"), []);
  const handleGoToStep2 = useCallback(() => setStep(2), []);
  const handleGoToStep3 = useCallback(() => setStep(3), []);
  const handleGoToStep1 = useCallback(() => setStep(1), []);
  const handleSetStep2 = useCallback(() => setStep(2), []);

  // ── Campaign edit modal state ─────────────────────────────────────────────
  const [editingCampaign, setEditingCampaign] = useState<ActiveCampaign | null>(null);

  const handleEditCampaign = useCallback((campaign: ActiveCampaign) => {
    setEditingCampaign(campaign);
  }, []);

  const handleEditSave = useCallback(() => {
    setEditingCampaign(null);
    showToast("Campaign updated successfully.");
  }, [showToast]);

  const handleEditClose = useCallback(() => {
    setEditingCampaign(null);
  }, []);

  // ── Campaign lifecycle actions ────────────────────────────────────────────

  const callCampaignAction = useCallback(async (campaignId: string, action: "pause" | "resume" | "end") => {
    try {
      const res = await apiFetch("/api/v1/campaigns", {
        method: "PUT",
        body: JSON.stringify({ campaignId, action }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        showToast(data?.error?.message ?? `Failed to ${action} campaign.`);
        return;
      }

      // Optimistically update local state
      const newStatus = action === "pause" ? "paused" : action === "resume" ? "active" : "ended";
      setMyCampaigns((prev) =>
        prev.map((c) =>
          c.id === campaignId ? { ...c, status: newStatus as ActiveCampaign["status"] } : c
        )
      );

      const labels = { pause: "paused", resume: "resumed", end: "ended" } as const;
      showToast(`Campaign ${labels[action]}.`);
    } catch {
      showToast(`Network error. Failed to ${action} campaign.`);
    }
  }, [showToast]);

  const handlePauseCampaign = useCallback(
    (campaignId: string) => callCampaignAction(campaignId, "pause"),
    [callCampaignAction]
  );

  const handleResumeCampaign = useCallback(
    (campaignId: string) => callCampaignAction(campaignId, "resume"),
    [callCampaignAction]
  );

  const handleEndCampaign = useCallback(
    (campaignId: string) => callCampaignAction(campaignId, "end"),
    [callCampaignAction]
  );

  return (
    <div className="min-h-screen bg-brand-bg">
      {/* Onboarding wizard for new businesses with no campaigns */}
      {showOnboarding && myCampaigns.length === 0 && (
        <SectionErrorBoundary section="Onboarding">
        <OnboardingWizard
          businessId={biz.id}
          businessName={biz.name}
          businessType={biz.type}
          onComplete={handleOnboardingComplete}
          onSkip={handleOnboardingSkip}
        />
        </SectionErrorBoundary>
      )}

      {/* Top Bar — sticky with backdrop blur */}
      <div className="sticky top-0 z-40 bg-brand-surface/90 backdrop-blur-xl border-b border-brand-border/50 safe-top">
        <div className="mx-auto max-w-5xl px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Logo size="sm" />
            <nav className="flex items-center gap-0.5 sm:gap-1 ml-2 sm:ml-4">
              {([
                { id: "home" as const, label: "Dashboard" },
                { id: "analytics" as const, label: "Analytics" },
                { id: "analytics-detail" as const, label: "Insights" },
                { id: "settings" as const, label: "Settings" },
              ]).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setPage(tab.id)}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/40 min-h-[36px] ${
                    page === tab.id
                      ? "bg-brand-cyan/10 text-brand-cyan"
                      : "text-brand-dim hover:text-brand-white hover:bg-brand-elevated/50"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <span className="text-xs text-brand-dim hidden sm:block truncate max-w-[140px]">{biz.avatar} {biz.name}</span>
            {connected && <span className="flex h-2 w-2 rounded-full bg-brand-green animate-pulse" title="Live" />}
            <NotificationCenter token={authToken} />
            <Button variant="ghost" size="sm" onClick={onLogout} className="hidden xs:inline-flex">Log Out</Button>
            <button onClick={onLogout} className="xs:hidden text-xs text-brand-dim hover:text-brand-white p-1.5" aria-label="Log out">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3M10.5 11.5L14 8l-3.5-3.5M14 8H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">

        {/* ════════════ HOME ════════════ */}
        {page === "home" && (
          <SectionErrorBoundary section="Dashboard">
          {dashboardLoading ? <DashboardSkeleton /> : (
          <div className="animate-fade-up">
            <h1 className="font-heading text-2xl italic text-brand-white mb-1 sm:text-3xl">{biz.name}</h1>
            <p className="text-sm text-brand-dim mb-8 sm:mb-10">{biz.type} &middot; {biz.location || "Your business"}</p>

            {/* Onboarding Checklist — shown at top of dashboard until dismissed (self-managing via localStorage) */}
            <SectionErrorBoundary section="Onboarding Checklist">
              <OnboardingChecklist
                hasProfile={Boolean(biz.type && biz.location)}
                hasSocialConnection={false}
                hasCampaign={myCampaigns.length > 0}
                hasSharedLink={false}
                hasReviewedSubmission={false}
                onNavigate={handleChecklistNavigate}
              />
            </SectionErrorBoundary>

            <PortalHome
              myCampaigns={myCampaigns}
              showWelcome={showWelcome}
              activeCampaignCount={activeCampaignCount}
              totalCompletions={totalCompletions}
              stats={stats}
              platformOptions={PLATFORM_OPTIONS}
              campaignTemplates={CAMPAIGN_TEMPLATES}
              businessType={biz.type}
              onDismissWelcome={handleDismissWelcome}
              onGoToCreate={handleGoToCreate}
              onApplyTemplate={applyTemplate}
              onSelectRichTemplate={applyRichTemplate}
              onExportCSV={exportCSV}
              onEditCampaign={handleEditCampaign}
              onPauseCampaign={handlePauseCampaign}
              onResumeCampaign={handleResumeCampaign}
              onEndCampaign={handleEndCampaign}
              onViewCampaignDetail={handleViewCampaignDetail}
            />
          </div>
          )}
          </SectionErrorBoundary>
        )}

        {/* ════════════ CREATE CAMPAIGN ════════════ */}
        {page === "create" && (
          <SectionErrorBoundary section="Campaign Creator">
          <div className="animate-fade-up">
            <PortalCreate
              step={step}
              selectedPlatform={selectedPlatform}
              selectedAction={selectedAction}
              rewardType={rewardType}
              rewardValue={rewardValue}
              campaignName={campaignName}
              scheduleDate={scheduleDate}
              launching={launching}
              todayStr={todayStr}
              platform={platform}
              action={action}
              stepNumbers={STEP_NUMBERS}
              rewardOptions={REWARD_OPTIONS}
              platformOptions={PLATFORM_OPTIONS}
              onBackToHome={handleBackToHome}
              onGoToStep1={handleGoToStep1}
              onGoToStep2={handleGoToStep2}
              onGoToStep3={handleGoToStep3}
              onSetStep2={handleSetStep2}
              onPlatformSelect={handlePlatformSelect}
              onActionSelect={setSelectedAction}
              onRewardTypeSelect={setRewardType}
              onRewardValueChange={setRewardValue}
              onCampaignNameChange={setCampaignName}
              onScheduleDateChange={handleScheduleDateChange}
              onLaunch={handleLaunch}
            />
          </div>
          </SectionErrorBoundary>
        )}

        {/* ════════════ ANALYTICS ════════════ */}
        {page === "analytics" && (
          <SectionErrorBoundary section="Analytics">
            <PortalAnalytics businessId={biz.id} />
          </SectionErrorBoundary>
        )}

        {/* ════════════ ANALYTICS DETAIL (Insights) ════════════ */}
        {page === "analytics-detail" && (
          <SectionErrorBoundary section="Analytics Dashboard">
            <AnalyticsDashboard businessId={biz.id} />
          </SectionErrorBoundary>
        )}

        {/* ════════════ SETTINGS ════════════ */}
        {page === "settings" && (
          <SectionErrorBoundary section="Settings">
            <BusinessSettings
              businessId={biz.id}
              businessName={biz.name}
              businessEmail={biz.email}
              businessType={biz.type}
              businessIndustry={biz.industry || ""}
            />
          </SectionErrorBoundary>
        )}

        {/* ════════════ CAMPAIGN DETAIL ════════════ */}
        {page === "campaign-detail" && selectedCampaignId && (
          <SectionErrorBoundary section="Campaign Detail">
            <CampaignDetail
              campaignId={selectedCampaignId}
              onBack={handleBackFromCampaignDetail}
              onEdit={() => {
                const campaign = myCampaigns.find(c => c.id === selectedCampaignId);
                if (campaign) handleEditCampaign(campaign);
              }}
            />
          </SectionErrorBoundary>
        )}
      </div>

      {/* Campaign Edit Modal */}
      {editingCampaign && (
        <SectionErrorBoundary section="Campaign Editor">
        <CampaignEditModal
          campaign={editingCampaign}
          onSave={handleEditSave}
          onClose={handleEditClose}
        />
        </SectionErrorBoundary>
      )}
    </div>
  );
}
