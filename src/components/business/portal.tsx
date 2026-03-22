"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Stat } from "@/components/ui/stat";
import { Logo } from "@/components/ui/logo";
import { useBusinessDashboard } from "@/lib/hooks/use-business-dashboard";
import { useRealtime } from "@/lib/hooks/use-realtime";
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

  // Get platform/action info
  const platform = PLATFORM_OPTIONS.find((p) => p.id === selectedPlatform);
  const action = platform?.actions.find((a) => a.id === selectedAction);

  function resetCreate() {
    setStep(1);
    setSelectedPlatform(null);
    setSelectedAction(null);
    setRewardType("pct");
    setRewardValue("");
    setCampaignName("");
  }

  async function handleLaunch() {
    if (!platform || !action) return;

    const name = campaignName || `${action.label} on ${platform.name}`;
    setLaunching(true);

    try {
      const token = document.cookie.match(/sp-access-token=([^;]+)/)?.[1];
      await fetch("/api/v1/campaigns", {
        method: "POST",
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
    } catch {
      // Best effort
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
  }

  return (
    <div className="min-h-screen bg-brand-bg">
      {/* Top Bar */}
      <div className="bg-brand-surface border-b border-brand-border px-4 md:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Logo size="sm" />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-brand-dim hidden sm:block">{biz.avatar} {biz.name}</span>
          {connected && <span className="flex h-2 w-2 rounded-full bg-brand-green" title="Live" />}
          <Button variant="ghost" size="sm" onClick={onLogout}>Log Out</Button>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="max-w-3xl mx-auto px-4 md:px-6 pt-3">
          <div className="bg-brand-green/10 border border-brand-green/30 rounded-lg px-4 py-2.5 text-sm text-brand-green font-medium" role="status">
            {toast}
          </div>
        </div>
      )}

      <div className="max-w-3xl mx-auto px-4 md:px-6 py-8">

        {/* ════════════ HOME ════════════ */}
        {page === "home" && (
          <div className="animate-fade-up">
            <h1 className="text-2xl text-brand-white mb-1">{biz.name}</h1>
            <p className="text-sm text-brand-dim mb-8">{biz.type} &middot; {biz.location || "Your business"}</p>

            {/* Stats (only if there are campaigns) */}
            {myCampaigns.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
                <Card><Stat value={String(myCampaigns.filter((c) => c.status === "active").length)} label="Active" color="#22D3EE" /></Card>
                <Card><Stat value={String(myCampaigns.reduce((s, c) => s + c.completions, 0))} label="Completions" color="#34D399" /></Card>
                <Card><Stat value={String(stats.reviews)} label="Reviews" color="#FBBF24" /></Card>
                <Card><Stat value={"$" + stats.marketingValue} label="Value" color="#F472B6" /></Card>
              </div>
            )}

            {/* Create new campaign button */}
            <button
              onClick={() => { resetCreate(); setPage("create"); }}
              className="w-full rounded-xl border-2 border-dashed border-brand-cyan/40 bg-brand-cyan/5 p-8 text-center transition-all hover:border-brand-cyan/70 hover:bg-brand-cyan/10 mb-6"
            >
              <span className="text-3xl">+</span>
              <p className="mt-2 text-sm font-semibold text-brand-white">Create a new campaign</p>
              <p className="mt-1 text-xs text-brand-dim">Pick what you want customers to do and what they get</p>
            </button>

            {/* Active campaigns list */}
            {myCampaigns.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-brand-dim mb-3">Your campaigns</h2>
                <div className="space-y-3">
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
                </div>
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
            <button onClick={() => setPage("home")} className="text-xs text-brand-dim hover:text-brand-text mb-6 transition-colors">
              &larr; Back to dashboard
            </button>

            {/* Step indicator */}
            <div className="flex items-center gap-2 mb-8">
              {[1, 2, 3].map((s) => (
                <div key={s} className="flex items-center gap-2">
                  <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                    step >= s ? "bg-brand-cyan text-brand-bg" : "bg-brand-elevated text-brand-muted"
                  }`}>
                    {s}
                  </div>
                  {s < 3 && <div className={`h-px w-8 sm:w-16 ${step > s ? "bg-brand-cyan" : "bg-brand-border"}`} />}
                </div>
              ))}
            </div>

            {/* STEP 1: Pick platform & action */}
            {step === 1 && (
              <div>
                <h1 className="text-xl text-brand-white mb-2">What do you want customers to do?</h1>
                <p className="text-sm text-brand-dim mb-6">Pick a platform, then pick the action.</p>

                {/* Platform picker */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                  {PLATFORM_OPTIONS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => { setSelectedPlatform(p.id); setSelectedAction(null); }}
                      className={`rounded-xl border-2 p-4 text-center transition-all ${
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
                          className={`w-full rounded-lg border p-4 text-left transition-all ${
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
                      <Button className="mt-6" onClick={() => setStep(2)}>
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
                <h1 className="text-xl text-brand-white mb-2">What do they get in return?</h1>
                <p className="text-sm text-brand-dim mb-6">
                  For every <span className="text-brand-cyan font-medium">{action?.label}</span> on{" "}
                  <span className="text-brand-cyan font-medium">{platform?.name}</span>, the customer gets:
                </p>

                {/* Reward type */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                  {[
                    { value: "pct" as const, label: "% Off", desc: "Percentage discount", example: "e.g. 15% off" },
                    { value: "dol" as const, label: "$ Off", desc: "Dollar amount off", example: "e.g. $5 off" },
                    { value: "free" as const, label: "Free Item", desc: "Something free", example: "e.g. free coffee" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setRewardType(opt.value)}
                      className={`rounded-xl border-2 p-4 text-left transition-all ${
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
                        className="w-24 px-3 py-2.5 rounded-lg border border-brand-border bg-brand-bg text-brand-white text-lg font-mono outline-none focus:border-brand-cyan"
                      />
                      {rewardType === "pct" && <span className="text-lg text-brand-white">%</span>}
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button variant="ghost" onClick={() => setStep(1)}>&larr; Back</Button>
                  <Button onClick={() => setStep(3)} disabled={rewardType !== "free" && !rewardValue}>
                    Next: Review &rarr;
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 3: Review & launch */}
            {step === 3 && (
              <div>
                <h1 className="text-xl text-brand-white mb-2">Review your campaign</h1>
                <p className="text-sm text-brand-dim mb-6">Make sure everything looks right, then launch.</p>

                <Card className="mb-6 bg-brand-surface/50">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs text-brand-muted mb-1">Campaign name (optional)</label>
                      <input
                        type="text"
                        value={campaignName}
                        onChange={(e) => setCampaignName(e.target.value)}
                        placeholder={`${action?.label} on ${platform?.name}`}
                        className="w-full px-3 py-2 rounded-lg border border-brand-border bg-brand-bg text-brand-white text-sm outline-none focus:border-brand-cyan"
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
