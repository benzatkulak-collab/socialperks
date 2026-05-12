"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { useBusinessDashboard } from "@/lib/hooks/use-business-dashboard";
import { useRealtime } from "@/lib/hooks/use-realtime";
import { PLATFORMS, findPlatform, findAction } from "@/lib/platforms";
import { apiFetch } from "@/lib/api/csrf-fetch";
import { PortalHome } from "./portal-home";
import { PortalCreate } from "./portal-create";
import { PortalAnalytics } from "./portal-analytics";
import { OnboardingWizard } from "./onboarding-wizard";
import { CampaignEditModal } from "./campaign-edit-modal";
import { CheckoutBanner } from "./checkout-banner";
import { PlanLimitModal, reportPlanLimit } from "./plan-limit-modal";
import { SectionErrorBoundary } from "@/components/ui/section-error-boundary";
import { DashboardSkeleton } from "@/components/ui/portal-skeletons";
import { NotificationCenter } from "@/components/shared/notification-center";
import type { SeedData, SeedBusiness } from "@/lib/seed";
import type { CampaignTemplate } from "@/lib/campaign-templates";

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
// All template actions point at platforms where incentivization is allowed
// with FTC disclosure. Google/Yelp/Tripadvisor reviews are intentionally
// excluded — their ToS prohibits incentivized reviews and the launch API
// will reject those campaigns with PROHIBITED_ACTION (422).

const CAMPAIGN_TEMPLATES = [
  { id: "t-ig-story", label: "Instagram Story Mention", platformId: "ig", actionId: "ig_st", rewardType: "pct" as const, rewardValue: "10", name: "Tag Us in Your Story" },
  { id: "t-ig-photo", label: "Instagram Feed Photo", platformId: "ig", actionId: "ig_fp", rewardType: "pct" as const, rewardValue: "15", name: "Share Your Visit on Instagram" },
  { id: "t-tt-video", label: "TikTok Video Feature", platformId: "tt", actionId: "tt_vd", rewardType: "dol" as const, rewardValue: "5", name: "TikTok Video Feature" },
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
  const [page, setPage] = useState<"home" | "create" | "campaigns" | "analytics">("home");
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
  // Onboarding visibility persists across reloads so users who dismissed it
  // don't see it every time. Stored per-business in localStorage.
  const [showOnboarding, setShowOnboarding] = useState(() => {
    if (typeof window === "undefined") return true;
    try {
      return window.localStorage.getItem(`sp:wizardDismissed:${biz.id}`) !== "1";
    } catch {
      return true;
    }
  });

  const { stats, loading: dashboardLoading } = useBusinessDashboard(biz.id);
  const { connected, subscribe } = useRealtime({ businessId: biz.id });

  // Extract auth token from cookie for SSE notifications
  const authToken = useMemo(() => {
    if (typeof document === "undefined") return null;
    return document.cookie.match(/sp-access-token=([^;]+)/)?.[1] ?? null;
  }, []);

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

  // ── Hydrate myCampaigns from the API ──────────────────────────────────────
  // Without this, the dashboard always showed "No campaigns yet" after reload
  // even when GET /api/v1/campaigns?businessId=… returned rows. We also call
  // this after a successful launch / lifecycle action so the displayed ids
  // always match what the server's in-memory campaign manager actually has
  // (the optimistic prepend was sending random UUIDs that 404'd on PUT).
  const reloadCampaigns = useCallback(async (): Promise<boolean> => {
    try {
      const res = await apiFetch(
        `/api/v1/campaigns?businessId=${encodeURIComponent(biz.id)}&perPage=100`,
        { method: "GET" }
      );
      if (!res.ok) return false;
      const json = await res.json().catch(() => null);
      const rows: Array<{
        id: string;
        state: string;
        completions?: { current: number };
        budget?: { allocated: number; type: string };
        expiry?: { launchedAt: string };
        transitions?: Array<{ to: string; reason: string }>;
        name?: string;
        actions?: string[];
      }> = json?.data?.campaigns ?? [];
      if (!Array.isArray(rows)) return false;

      const mapped: ActiveCampaign[] = rows.map((c) => {
        const actionId = c.actions?.[0];
        const action = actionId ? findAction(actionId) : null;
        const platformId = action?.platformId;
        const platform = platformId ? findPlatform(platformId) : null;
        const rewardType: ActiveCampaign["rewardType"] =
          c.budget?.type === "dol" ? "dol" : "pct";
        const rewardValueRaw = c.budget?.allocated ?? 0;
        const rewardValue =
          rewardType === "pct"
            ? `${rewardValueRaw}% off`
            : `$${rewardValueRaw} off`;
        const status: ActiveCampaign["status"] =
          c.state === "active"
            ? "active"
            : c.state === "paused"
              ? "paused"
              : "ended";
        return {
          id: c.id,
          name: c.name ?? `Campaign ${c.id.slice(-8)}`,
          platform: platform?.name ?? "—",
          platformIcon: platform?.icon ?? "📣",
          action: action?.label ?? "—",
          rewardType,
          rewardValue,
          status,
          completions: c.completions?.current ?? 0,
          createdAt: (c.expiry?.launchedAt ?? new Date().toISOString()).slice(0, 10),
        };
      });

      setMyCampaigns(mapped);
      return true;
    } catch {
      // Best-effort hydration — fall back to existing local state.
      return false;
    }
  }, [biz.id]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ok = await reloadCampaigns();
      if (cancelled || !ok) return;
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadCampaigns]);

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

    // Capture the server-assigned campaign id so subsequent pause/resume/end
    // PUTs target a row that actually exists. Earlier, the dashboard generated
    // a fresh client UUID and the next action returned 404.
    let serverCampaignId: string | null = null;

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
        // Plan-limit failures get the upgrade modal instead of a toast.
        if (await reportPlanLimit(res)) {
          setLaunching(false);
          return;
        }
        showToast("Failed to launch campaign. Please try again.");
        setLaunching(false);
        return;
      }
      try {
        const body = await res.clone().json();
        const id = body?.data?.campaign?.id;
        if (typeof id === "string" && id.length > 0) serverCampaignId = id;
      } catch {
        // Non-JSON or malformed body — fall through to optimistic UUID
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
      id: serverCampaignId ?? crypto.randomUUID(),
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

    // Re-fetch from the server FIRST so the displayed card carries the real
    // camp_xxx id. Previously we did an optimistic prepend with a possibly-
    // random UUID and only fired reloadCampaigns() without awaiting — that
    // left a window where Pause/Resume/End buttons clicked on the optimistic
    // card hit /api/v1/campaigns PUT with an id the manager didn't recognise
    // (404). If the reload fails (network blip), fall back to the optimistic
    // card just so the user sees their work.
    const reloaded = await reloadCampaigns();
    if (!reloaded) {
      setMyCampaigns((prev) => [newCampaign, ...prev]);
    }
    // Persist only the optimistic id-less fields to localStorage so a stale
    // random UUID doesn't survive across sessions.
    save({
      ...data,
      campaigns: [
        ...(data.campaigns || []).filter((c) => c.id !== newCampaign.id),
      ],
    });
    setLaunching(false);
    resetCreate();
    setPage("home");
    showToast(`"${newCampaign.name}" is live!`);
  }, [platform, action, campaignName, biz.id, biz.name, rewardType, rewardValue, data, save, resetCreate, showToast, reloadCampaigns]);

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

  const persistWizardDismissed = useCallback(() => {
    try {
      window.localStorage.setItem(`sp:wizardDismissed:${biz.id}`, "1");
    } catch {
      // ignore quota / privacy mode
    }
    setShowOnboarding(false);
  }, [biz.id]);
  const handleOnboardingComplete = persistWizardDismissed;
  const handleOnboardingSkip = persistWizardDismissed;

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
        // If the card we clicked points at an id the server has never seen
        // (legacy localStorage entry from before the camp_xxx id fix), the
        // PUT returns 404. Pull fresh server state so the orphan disappears
        // and surface a clearer message than "Campaign not found".
        if (res.status === 404) {
          showToast("Refreshing your campaigns — that one was stale.");
          await reloadCampaigns();
          return;
        }
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
  }, [showToast, reloadCampaigns]);

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
        <OnboardingWizard
          businessId={biz.id}
          businessName={biz.name}
          businessType={biz.type}
          onComplete={handleOnboardingComplete}
          onSkip={handleOnboardingSkip}
        />
      )}

      {/* Top Bar — sticky with backdrop blur */}
      <div className="sticky top-0 z-40 bg-brand-surface/90 backdrop-blur-xl border-b border-brand-border/50">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo size="sm" />
            <nav className="flex items-center gap-1 ml-4">
              {(["home", "analytics"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setPage(tab)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/40 ${
                    page === tab
                      ? "bg-brand-cyan/10 text-brand-cyan"
                      : "text-brand-dim hover:text-brand-white hover:bg-brand-elevated/50"
                  }`}
                >
                  {tab === "home" ? "Dashboard" : "Analytics"}
                </button>
              ))}
              {/* Programs and Exchange live at top-level Next routes — the
                  /api/v1/programs and /api/v1/exchange APIs already exist
                  but had no UI entry point. Link out rather than embedding
                  to keep the portal bundle small. */}
              <a
                href="/programs"
                className="px-3 py-1.5 rounded-md text-xs font-medium text-brand-dim hover:text-brand-white hover:bg-brand-elevated/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/40"
              >
                Programs
              </a>
              <a
                href="/exchange"
                className="px-3 py-1.5 rounded-md text-xs font-medium text-brand-dim hover:text-brand-white hover:bg-brand-elevated/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/40"
              >
                Exchange
              </a>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-brand-dim hidden sm:block">{biz.avatar} {biz.name}</span>
            {connected && <span className="flex h-2 w-2 rounded-full bg-brand-green animate-pulse" title="Live" />}
            <NotificationCenter token={authToken} />
            <Button variant="ghost" size="sm" onClick={onLogout}>Log Out</Button>
          </div>
        </div>
      </div>

      {/* Stripe checkout return banner — confirms payment so the user
          doesn't email support asking "did it go through?". Renders only
          if ?checkout=success or ?checkout=cancelled is in the URL. */}
      <CheckoutBanner />

      {/* Plan-limit modal — listens for sp:plan-limit window events
          dispatched by reportPlanLimit() after a 403 PLAN_LIMIT_EXCEEDED
          response. Single mount; routes don't need their own modal. */}
      <PlanLimitModal />

      {/* Toast */}
      {toast && (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="bg-brand-green/10 border border-brand-green/30 rounded-xl px-4 py-3 text-sm text-brand-green font-medium animate-fade-up" role="status" aria-live="polite">
            {toast}
          </div>
        </div>
      )}

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">

        {/* ════════════ HOME ════════════ */}
        {page === "home" && (
          <SectionErrorBoundary section="Dashboard">
          {dashboardLoading ? <DashboardSkeleton /> : (
          <div className="animate-fade-up">
            <h1 className="font-heading text-2xl italic text-brand-white mb-1 sm:text-3xl">{biz.name}</h1>
            <p className="text-sm text-brand-dim mb-8 sm:mb-10">{biz.type} &middot; {biz.location || "Your business"}</p>

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
      </div>

      {/* Campaign Edit Modal */}
      {editingCampaign && (
        <CampaignEditModal
          campaign={editingCampaign}
          onSave={handleEditSave}
          onClose={handleEditClose}
        />
      )}
    </div>
  );
}
