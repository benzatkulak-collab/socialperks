"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

// ─── Types ──────────────────────────────────────────────────────────────────

interface PlatformOption {
  id: string;
  name: string;
  icon: string;
  color: string;
  actions: { id: string; label: string; effort: number }[];
}

export interface PortalCreateProps {
  step: number;
  selectedPlatform: string | null;
  selectedAction: string | null;
  rewardType: "pct" | "dol" | "free";
  rewardValue: string;
  campaignName: string;
  scheduleDate: string;
  launching: boolean;
  todayStr: string;
  platform: PlatformOption | undefined;
  action: { id: string; label: string; effort: number } | undefined;
  stepNumbers: readonly [1, 2, 3];
  rewardOptions: readonly {
    readonly value: "pct" | "dol" | "free";
    readonly label: string;
    readonly desc: string;
    readonly example: string;
  }[];
  platformOptions: PlatformOption[];
  onBackToHome: () => void;
  onGoToStep1: () => void;
  onGoToStep2: () => void;
  onGoToStep3: () => void;
  onSetStep2: () => void;
  onPlatformSelect: (platformId: string) => void;
  onActionSelect: (actionId: string) => void;
  onRewardTypeSelect: (type: "pct" | "dol" | "free") => void;
  onRewardValueChange: (value: string) => void;
  onCampaignNameChange: (value: string) => void;
  onScheduleDateChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onLaunch: () => void;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function PortalCreate({
  step,
  selectedPlatform,
  selectedAction,
  rewardType,
  rewardValue,
  campaignName,
  scheduleDate,
  launching,
  todayStr,
  platform,
  action,
  stepNumbers,
  rewardOptions,
  platformOptions,
  onBackToHome,
  onGoToStep1,
  onGoToStep2,
  onGoToStep3,
  onSetStep2,
  onPlatformSelect,
  onActionSelect,
  onRewardTypeSelect,
  onRewardValueChange,
  onCampaignNameChange,
  onScheduleDateChange,
  onLaunch,
}: PortalCreateProps) {
  return (
    <>
      <button onClick={onBackToHome} className="inline-flex items-center gap-1 text-xs text-brand-dim hover:text-brand-text mb-8 py-2 transition-colors rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/40">
        &larr; <span>Back to dashboard</span>
      </button>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8 sm:mb-10">
        {stepNumbers.map((s) => (
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
            {platformOptions.map((p) => (
              <button
                key={p.id}
                onClick={() => onPlatformSelect(p.id)}
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
                    onClick={() => onActionSelect(a.id)}
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
                <Button className="mt-6" onClick={onGoToStep2}>
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
            {rewardOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => onRewardTypeSelect(opt.value)}
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
              <label htmlFor="reward-value" className="block text-sm text-brand-dim mb-2">
                How much {rewardType === "pct" ? "percent" : "dollars"} off?
              </label>
              <div className="flex items-center gap-2">
                {rewardType === "dol" && <span className="text-lg text-brand-white">$</span>}
                <input
                  id="reward-value"
                  type="number"
                  min="1"
                  max={rewardType === "pct" ? 100 : 500}
                  value={rewardValue}
                  onChange={(e) => onRewardValueChange(e.target.value)}
                  placeholder={rewardType === "pct" ? "15" : "5"}
                  required
                  className="w-24 px-3 py-2.5 rounded-lg border border-brand-border bg-brand-bg text-brand-white text-lg font-mono outline-none focus:border-brand-cyan/50 focus:ring-2 focus:ring-brand-cyan/40"
                />
                {rewardType === "pct" && <span className="text-lg text-brand-white">%</span>}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <Button variant="ghost" onClick={onGoToStep1}>&larr; Back</Button>
            <Button onClick={onGoToStep3} disabled={rewardType !== "free" && !rewardValue}>
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
                <label htmlFor="campaign-name" className="block text-xs text-brand-muted mb-1">Campaign name (optional)</label>
                <input
                  id="campaign-name"
                  type="text"
                  value={campaignName}
                  onChange={(e) => onCampaignNameChange(e.target.value)}
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
                <label htmlFor="schedule-date" className="block text-xs text-brand-muted mb-1">Schedule start date (optional)</label>
                <input
                  id="schedule-date"
                  type="date"
                  value={scheduleDate}
                  min={todayStr}
                  onChange={onScheduleDateChange}
                  className="w-full px-3 py-2 rounded-lg border border-brand-border bg-brand-bg text-brand-white text-sm outline-none focus:border-brand-cyan/50 focus:ring-2 focus:ring-brand-cyan/40 transition-all [color-scheme:dark]"
                />
                {scheduleDate && scheduleDate < todayStr && (
                  <p className="text-xs text-brand-red mt-1">Start date cannot be in the past.</p>
                )}
              </div>
            </div>
          </Card>

          <div className="flex gap-3">
            <Button variant="ghost" onClick={onSetStep2}>&larr; Back</Button>
            <Button onClick={onLaunch} disabled={launching}>
              {launching ? "Launching..." : "Launch Campaign"}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
