"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PLATFORMS } from "@/lib/platforms";
import { apiFetch } from "@/lib/api/csrf-fetch";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface OnboardingWizardProps {
  businessId: string;
  businessName: string;
  businessType: string;
  onComplete: () => void;
  onSkip: () => void;
}

type RewardType = "pct" | "dol" | "free";

interface WizardPlatform {
  id: string;
  name: string;
  icon: string;
  color: string;
  actionCount: number;
  topAction: { id: string; label: string; effort: number } | null;
  popular: boolean;
}

interface RewardConfig {
  type: RewardType;
  value: string;
  freeItemDescription: string;
}

// ─── Platform discovery ─────────────────────────────────────────────────────

// The five platforms shown by default in step 1. Everything else lives
// behind a "Show more platforms" toggle to keep the first impression
// digestible without hiding coverage.
const MOST_POPULAR_IDS = ["ig", "tt", "fb", "yt", "xw"];

// Google (`go`) and Yelp (`yp`) are intentionally excluded from the
// wizard entirely. Their review actions are flagged
// `incentivizable=false` (banned by ToS), and even though both have
// other incentivizable actions (photos, etc.), users see "Google" and
// assume they're being offered Google Reviews, which is the path that
// would get them in trouble. Better to hide them than mislead.
const EXCLUDED_IDS = new Set(["go", "yp"]);

const ONBOARDING_PLATFORMS: WizardPlatform[] = (() => {
  const out: WizardPlatform[] = [];
  for (const p of PLATFORMS) {
    if (EXCLUDED_IDS.has(p.id)) continue;
    const incentivizableActions = p.actions.filter(
      (a) => (a.type === "content" || a.type === "review") && a.incentivizable !== false
    );
    if (incentivizableActions.length === 0) continue;
    out.push({
      id: p.id,
      name: p.name,
      icon: p.icon,
      color: p.color,
      actionCount: incentivizableActions.length,
      topAction: {
        id: incentivizableActions[0].id,
        label: incentivizableActions[0].label,
        effort: incentivizableActions[0].effort,
      },
      popular: MOST_POPULAR_IDS.includes(p.id),
    });
  }
  // Stable order: popular first (in MOST_POPULAR_IDS order), then the rest alphabetically by name.
  out.sort((a, b) => {
    if (a.popular && !b.popular) return -1;
    if (!a.popular && b.popular) return 1;
    if (a.popular && b.popular) {
      return MOST_POPULAR_IDS.indexOf(a.id) - MOST_POPULAR_IDS.indexOf(b.id);
    }
    return a.name.localeCompare(b.name);
  });
  return out;
})();

const REWARD_OPTIONS: { value: RewardType; label: string; icon: string; desc: string }[] = [
  { value: "pct", label: "% Off", icon: "%", desc: "Percentage discount" },
  { value: "dol", label: "$ Off", icon: "$", desc: "Dollar amount off" },
  { value: "free", label: "Free Item", icon: "🎁", desc: "Something on the house" },
];

const STEP_NUMBERS = [1, 2, 3] as const;

// localStorage key the dashboard reads on mount to know which
// platforms the user just picked, so the template picker can scope
// itself to those platforms. 24-hour expiry — after that the
// dashboard reverts to its default behavior.
const ONBOARDING_PLATFORMS_KEY = "sp:onboarding:platforms";
const ONBOARDING_TTL_MS = 24 * 60 * 60 * 1000;

const DEFAULT_REWARD: RewardConfig = { type: "pct", value: "15", freeItemDescription: "" };

// ─── Confetti particle ──────────────────────────────────────────────────────

function ConfettiParticle({ delay, left, color }: { delay: number; left: number; color: string }) {
  return (
    <span
      className="absolute top-0 w-2 h-2 rounded-sm pointer-events-none"
      style={{
        left: `${left}%`,
        backgroundColor: color,
        animation: `confettiFall 1.8s ease-out ${delay}s both`,
        opacity: 0,
      }}
      aria-hidden="true"
    />
  );
}

const CONFETTI_COLORS = ["#22D3EE", "#34D399", "#FBBF24", "#F472B6", "#A78BFA", "#FB923C"];

function ConfettiEffect() {
  const particles = useMemo(() => {
    const items: { id: number; delay: number; left: number; color: string }[] = [];
    for (let i = 0; i < 40; i++) {
      items.push({
        id: i,
        delay: Math.random() * 0.6,
        left: Math.random() * 100,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      });
    }
    return items;
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {particles.map((p) => (
        <ConfettiParticle key={p.id} delay={p.delay} left={p.left} color={p.color} />
      ))}
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function isRewardValid(reward: RewardConfig): boolean {
  if (reward.type === "free") {
    return reward.freeItemDescription.trim().length > 0;
  }
  const n = parseFloat(reward.value);
  return Number.isFinite(n) && n > 0;
}

function previewText(reward: RewardConfig): string {
  if (reward.type === "free") {
    const item = reward.freeItemDescription.trim();
    return item ? `a free ${item}` : "a free item";
  }
  if (!reward.value) return reward.type === "pct" ? "X% off" : "$X off";
  return reward.type === "pct" ? `${reward.value}% off` : `$${reward.value} off`;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function OnboardingWizard({
  businessId,
  businessName,
  businessType,
  onComplete,
  onSkip,
}: OnboardingWizardProps) {
  const [step, setStep] = useState(1);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [showMore, setShowMore] = useState(false);
  const [rewards, setRewards] = useState<Record<string, RewardConfig>>({});
  const [campaignName, setCampaignName] = useState("");
  const [launching, setLaunching] = useState(false);
  const [launched, setLaunched] = useState(false);
  const [launchError, setLaunchError] = useState<string | null>(null);
  const [direction, setDirection] = useState<"forward" | "backward">("forward");
  const contentRef = useRef<HTMLDivElement>(null);

  const popularPlatforms = useMemo(
    () => ONBOARDING_PLATFORMS.filter((p) => p.popular),
    []
  );
  const morePlatforms = useMemo(
    () => ONBOARDING_PLATFORMS.filter((p) => !p.popular),
    []
  );

  const selectedPlatformObjects = useMemo(
    () =>
      selectedPlatforms
        .map((id) => ONBOARDING_PLATFORMS.find((p) => p.id === id))
        .filter((p): p is WizardPlatform => p !== undefined),
    [selectedPlatforms]
  );

  // Pre-fill campaign name when selection changes
  useEffect(() => {
    if (selectedPlatformObjects.length === 0) {
      setCampaignName("");
    } else if (selectedPlatformObjects.length === 1) {
      setCampaignName(`${selectedPlatformObjects[0].name} Campaign for ${businessName}`);
    } else {
      setCampaignName(`Multi-platform Campaign for ${businessName}`);
    }
  }, [selectedPlatformObjects, businessName]);

  // Initialize a reward entry whenever a new platform gets selected.
  // Keeps existing entries untouched so the user doesn't lose values
  // they already typed if they un-select then re-select the platform.
  useEffect(() => {
    setRewards((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const id of selectedPlatforms) {
        if (!next[id]) {
          next[id] = { ...DEFAULT_REWARD };
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [selectedPlatforms]);

  // Scroll content to top when step changes
  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  const togglePlatform = useCallback((id: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }, []);

  const updateReward = useCallback((id: string, patch: Partial<RewardConfig>) => {
    setRewards((prev) => ({
      ...prev,
      [id]: { ...(prev[id] ?? DEFAULT_REWARD), ...patch },
    }));
  }, []);

  const allRewardsValid = useMemo(
    () =>
      selectedPlatforms.length > 0 &&
      selectedPlatforms.every((id) => isRewardValid(rewards[id] ?? DEFAULT_REWARD)),
    [selectedPlatforms, rewards]
  );

  const goForward = useCallback((nextStep: number) => {
    setDirection("forward");
    setStep(nextStep);
  }, []);

  const goBackward = useCallback((nextStep: number) => {
    setDirection("backward");
    setStep(nextStep);
  }, []);

  const persistSelection = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        ONBOARDING_PLATFORMS_KEY,
        JSON.stringify({
          ids: selectedPlatforms,
          expiresAt: Date.now() + ONBOARDING_TTL_MS,
        })
      );
    } catch {
      // localStorage may be unavailable (private mode, quota); failing
      // silently is correct — the dashboard just won't pre-filter.
    }
  }, [selectedPlatforms]);

  const handleLaunch = useCallback(async () => {
    if (selectedPlatformObjects.length === 0) return;

    setLaunching(true);
    setLaunchError(null);
    const baseName = campaignName.trim() || `Multi-platform Campaign for ${businessName}`;
    const multi = selectedPlatformObjects.length > 1;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const results = await Promise.all(
        selectedPlatformObjects.map(async (platform) => {
          if (!platform.topAction) {
            return { ok: false, error: `${platform.name}: no eligible action` };
          }
          const reward = rewards[platform.id] ?? DEFAULT_REWARD;
          const name = multi ? `${baseName} — ${platform.name}` : baseName;
          // TODO: server-side persistence for `freeItemDescription` —
          // the campaigns route currently ignores unknown fields,
          // which is safe but means the free-item label isn't stored
          // anywhere yet. Wire it through Campaign type + state machine
          // when convenient.
          const res = await apiFetch("/api/v1/campaigns", {
            method: "POST",
            signal: controller.signal,
            body: JSON.stringify({
              businessId,
              name,
              description: `${platform.topAction.label} on ${platform.name} for ${businessName} (${businessType})`,
              actions: [platform.topAction.id],
              discountValue:
                reward.type === "free" ? 100 : parseInt(reward.value, 10) || 10,
              discountType: reward.type === "free" ? "pct" : reward.type,
              expiresInDays: 30,
              ...(reward.type === "free" && reward.freeItemDescription.trim()
                ? { freeItemDescription: reward.freeItemDescription.trim() }
                : {}),
            }),
          });

          if (!res.ok) {
            const data = await res.json().catch(() => null);
            const msg = data?.error?.message ?? `Failed to launch ${platform.name} campaign (HTTP ${res.status}).`;
            return { ok: false as const, error: msg };
          }
          return { ok: true as const };
        })
      );

      const failed = results.find((r) => !r.ok);
      if (failed && !failed.ok) {
        setLaunchError(failed.error);
        setLaunching(false);
        return;
      }
    } catch (e) {
      const msg = controller.signal.aborted
        ? "Request timed out. Please try again."
        : e instanceof Error
          ? e.message
          : "Network error. Please try again.";
      setLaunchError(msg);
      setLaunching(false);
      return;
    } finally {
      clearTimeout(timeout);
    }

    persistSelection();
    setLaunching(false);
    setLaunched(true);
  }, [
    selectedPlatformObjects,
    campaignName,
    businessId,
    businessName,
    businessType,
    rewards,
    persistSelection,
  ]);

  const slideClass = direction === "forward"
    ? "animate-onboarding-slide-in"
    : "animate-onboarding-slide-in-reverse";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="Onboarding wizard"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-brand-bg/80 backdrop-blur-xl"
        style={{ animation: "overlayFadeIn 0.4s ease-out both" }}
      />

      {/* Wizard container */}
      <div
        className="relative w-full max-w-xl mx-4 max-h-[90vh] flex flex-col rounded-2xl border border-brand-border/60 bg-brand-surface shadow-2xl shadow-brand-cyan/5"
        style={{ animation: "contentScaleIn 0.5s ease-out both" }}
      >
        {!launched && (
          <button
            type="button"
            onClick={onSkip}
            className="absolute top-4 right-4 z-10 text-xs font-medium text-brand-dim hover:text-brand-text border border-brand-border hover:border-brand-subtle bg-brand-surface/40 transition-colors py-1.5 px-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/40"
            aria-label="Skip onboarding and go to dashboard"
          >
            Skip for now ✕
          </button>
        )}

        {/* Step indicators */}
        {!launched && (
          <div className="flex items-center justify-center gap-3 pt-6 pb-2 px-6">
            {STEP_NUMBERS.map((s) => (
              <div key={s} className="flex items-center gap-3">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all duration-300 ${
                    step >= s
                      ? "bg-brand-cyan text-brand-bg shadow-md shadow-brand-cyan/20"
                      : "bg-brand-elevated text-brand-muted"
                  }`}
                >
                  {step > s ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    s
                  )}
                </div>
                {s < 3 && (
                  <div
                    className={`h-px w-10 sm:w-16 transition-all duration-300 ${
                      step > s ? "bg-brand-cyan" : "bg-brand-border/50"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        <div ref={contentRef} className="flex-1 overflow-y-auto px-6 pb-6 pt-4">

          {/* ════════════ STEP 1: Choose Platforms ════════════ */}
          {step === 1 && !launched && (
            <div key="step-1" className={slideClass}>
              <h2 className="font-heading text-xl sm:text-2xl italic text-brand-white mb-1">
                Choose your platforms
              </h2>
              <p className="text-sm text-brand-dim mb-2">
                Where do your customers hang out? Pick one or more to start.
              </p>
              <p className="text-xs text-brand-cyan mb-6" aria-live="polite">
                {selectedPlatforms.length === 0
                  ? "Nothing selected yet"
                  : `${selectedPlatforms.length} selected`}
              </p>

              <h3 className="text-xs uppercase tracking-wide font-semibold text-brand-muted mb-3">
                Most popular
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {popularPlatforms.map((p) => {
                  const isSelected = selectedPlatforms.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => togglePlatform(p.id)}
                      aria-pressed={isSelected}
                      className={`group relative rounded-xl border-2 p-5 text-center transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/40 ${
                        isSelected
                          ? "border-brand-cyan bg-brand-cyan/10 shadow-lg shadow-brand-cyan/10"
                          : "border-brand-border/50 bg-brand-surface/30 hover:border-brand-border hover:bg-brand-surface/50"
                      }`}
                    >
                      {isSelected && (
                        <span className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-brand-cyan text-brand-bg">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </span>
                      )}

                      <span className="text-3xl block">{p.icon}</span>
                      <p className="mt-2 text-sm font-semibold text-brand-white">{p.name}</p>
                      <p className="mt-1 text-xs text-brand-muted">
                        {p.actionCount} marketing action{p.actionCount !== 1 ? "s" : ""}
                      </p>
                    </button>
                  );
                })}
              </div>

              {morePlatforms.length > 0 && (
                <div className="mt-6">
                  <button
                    type="button"
                    onClick={() => setShowMore((v) => !v)}
                    aria-expanded={showMore}
                    aria-controls="onboarding-more-platforms"
                    className="text-xs font-semibold text-brand-cyan hover:text-brand-white transition-colors py-1.5 px-2 -mx-2 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/40"
                  >
                    {showMore
                      ? "Show fewer ↑"
                      : `Show ${morePlatforms.length} more platform${morePlatforms.length !== 1 ? "s" : ""} ↓`}
                  </button>

                  {showMore && (
                    <div id="onboarding-more-platforms" className="mt-3">
                      <h3 className="text-xs uppercase tracking-wide font-semibold text-brand-muted mb-3">
                        More platforms
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {morePlatforms.map((p) => {
                          const isSelected = selectedPlatforms.includes(p.id);
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => togglePlatform(p.id)}
                              aria-pressed={isSelected}
                              className={`group relative rounded-xl border-2 p-4 text-center transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/40 ${
                                isSelected
                                  ? "border-brand-cyan bg-brand-cyan/10 shadow-lg shadow-brand-cyan/10"
                                  : "border-brand-border/50 bg-brand-surface/30 hover:border-brand-border hover:bg-brand-surface/50"
                              }`}
                            >
                              {isSelected && (
                                <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-brand-cyan text-brand-bg">
                                  <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                  </svg>
                                </span>
                              )}
                              <span className="text-2xl block">{p.icon}</span>
                              <p className="mt-1.5 text-xs font-semibold text-brand-white">{p.name}</p>
                              <p className="mt-0.5 text-3xs text-brand-muted">
                                {p.actionCount} action{p.actionCount !== 1 ? "s" : ""}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-8 flex justify-end">
                <Button
                  onClick={() => goForward(2)}
                  disabled={selectedPlatforms.length === 0}
                  size="lg"
                >
                  Next &rarr;
                </Button>
              </div>
            </div>
          )}

          {/* ════════════ STEP 2: Set Rewards (per platform) ════════════ */}
          {step === 2 && !launched && (
            <div key="step-2" className={slideClass}>
              <h2 className="font-heading text-xl sm:text-2xl italic text-brand-white mb-1">
                Set your reward{selectedPlatformObjects.length > 1 ? "s" : ""}
              </h2>
              <p className="text-sm text-brand-dim mb-6">
                {selectedPlatformObjects.length > 1
                  ? "Each platform can offer a different reward."
                  : "What do customers get for posting?"}
              </p>

              <div className="space-y-6">
                {selectedPlatformObjects.map((platform) => {
                  const reward = rewards[platform.id] ?? DEFAULT_REWARD;
                  const actionLabel = platform.topAction?.label ?? "complete an action";
                  return (
                    <div
                      key={platform.id}
                      className="rounded-xl border border-brand-border/40 bg-brand-bg/30 p-4"
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xl">{platform.icon}</span>
                        <h3 className="text-sm font-semibold" style={{ color: platform.color }}>
                          {platform.name}
                        </h3>
                        <span className="text-xs text-brand-muted">— {actionLabel}</span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 mb-4">
                        {REWARD_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => updateReward(platform.id, { type: opt.value })}
                            className={`rounded-lg border-2 p-2.5 text-center transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/40 ${
                              reward.type === opt.value
                                ? "border-brand-green bg-brand-green/10 shadow-md shadow-brand-green/10"
                                : "border-brand-border/50 bg-brand-surface/20 hover:border-brand-border"
                            }`}
                            aria-pressed={reward.type === opt.value}
                          >
                            <span className="text-base block font-mono font-bold text-brand-white">{opt.icon}</span>
                            <p className="text-xs font-semibold text-brand-white mt-0.5">{opt.label}</p>
                          </button>
                        ))}
                      </div>

                      {reward.type !== "free" && (
                        <div className="mb-3">
                          <label
                            htmlFor={`reward-value-${platform.id}`}
                            className="block text-xs text-brand-dim mb-1.5"
                          >
                            How much {reward.type === "pct" ? "percent" : "dollars"} off?
                          </label>
                          <div className="flex items-center gap-2">
                            {reward.type === "dol" && <span className="text-lg text-brand-white font-mono">$</span>}
                            <input
                              id={`reward-value-${platform.id}`}
                              type="number"
                              min="1"
                              max={reward.type === "pct" ? 100 : 500}
                              value={reward.value}
                              onChange={(e) => updateReward(platform.id, { value: e.target.value })}
                              placeholder={reward.type === "pct" ? "15" : "5"}
                              className="w-24 px-2.5 py-2 rounded-lg border border-brand-border bg-brand-bg text-brand-white text-base font-mono outline-none focus:border-brand-cyan/50 focus:ring-2 focus:ring-brand-cyan/40 transition-all"
                            />
                            {reward.type === "pct" && <span className="text-lg text-brand-white font-mono">%</span>}
                          </div>
                        </div>
                      )}

                      {reward.type === "free" && (
                        <div className="mb-3">
                          <label
                            htmlFor={`reward-free-${platform.id}`}
                            className="block text-xs text-brand-dim mb-1.5"
                          >
                            What&apos;s the free item?
                          </label>
                          <input
                            id={`reward-free-${platform.id}`}
                            type="text"
                            maxLength={100}
                            value={reward.freeItemDescription}
                            onChange={(e) =>
                              updateReward(platform.id, { freeItemDescription: e.target.value })
                            }
                            placeholder="e.g. a free latte"
                            className="w-full px-3 py-2 rounded-lg border border-brand-border bg-brand-bg text-brand-white text-sm outline-none focus:border-brand-cyan/50 focus:ring-2 focus:ring-brand-cyan/40 transition-all"
                          />
                        </div>
                      )}

                      <Card className="bg-brand-bg/50 border-brand-border/40" padding="sm">
                        <p className="text-xs text-brand-dim">
                          Customers who <span className="text-brand-white font-medium">{actionLabel}</span> get{" "}
                          <span className="text-brand-green font-semibold">{previewText(reward)}</span>
                        </p>
                      </Card>
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-3 justify-between mt-8">
                <Button variant="ghost" onClick={() => goBackward(1)}>
                  &larr; Back
                </Button>
                <Button
                  onClick={() => goForward(3)}
                  disabled={!allRewardsValid}
                  size="lg"
                >
                  Next &rarr;
                </Button>
              </div>
            </div>
          )}

          {/* ════════════ STEP 3: Launch ════════════ */}
          {step === 3 && !launched && (
            <div key="step-3" className={slideClass}>
              <h2 className="font-heading text-xl sm:text-2xl italic text-brand-white mb-1">
                Launch your {selectedPlatformObjects.length > 1 ? "campaigns" : "first campaign"}
              </h2>
              <p className="text-sm text-brand-dim mb-6">
                Review everything and hit launch. You can always edit later.
              </p>

              <Card className="mb-6 bg-brand-bg/50">
                <div className="space-y-3">
                  {selectedPlatformObjects.map((platform, idx) => {
                    const reward = rewards[platform.id] ?? DEFAULT_REWARD;
                    return (
                      <div key={platform.id}>
                        {idx > 0 && <div className="h-px bg-brand-border/30 my-3" />}
                        <div className="flex items-center justify-between text-sm mb-1.5">
                          <span className="font-medium" style={{ color: platform.color }}>
                            {platform.icon} {platform.name}
                          </span>
                          <span className="text-brand-green font-semibold text-xs">
                            {previewText(reward)}
                          </span>
                        </div>
                        <p className="text-xs text-brand-muted">
                          Action: {platform.topAction?.label ?? "—"}
                        </p>
                      </div>
                    );
                  })}
                  <div className="h-px bg-brand-border/30 my-3" />
                  <div className="flex justify-between text-xs">
                    <span className="text-brand-muted">Duration</span>
                    <span className="text-brand-white">30 days each</span>
                  </div>
                </div>
              </Card>

              <div className="mb-8">
                <label htmlFor="onboarding-campaign-name" className="block text-xs text-brand-muted mb-1.5">
                  Campaign name {selectedPlatformObjects.length > 1 && (
                    <span className="text-brand-muted/70">(each platform gets its own copy)</span>
                  )}
                </label>
                <input
                  id="onboarding-campaign-name"
                  type="text"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder={`Campaign for ${businessName}`}
                  className="w-full px-3 py-2.5 rounded-lg border border-brand-border bg-brand-bg text-brand-white text-sm outline-none focus:border-brand-cyan/50 focus:ring-2 focus:ring-brand-cyan/40 transition-all"
                />
              </div>

              {launchError && (
                <div
                  className="mb-4 rounded-lg border border-brand-red/40 bg-brand-red/10 px-4 py-3 text-sm text-brand-red"
                  role="alert"
                >
                  {launchError}
                </div>
              )}

              <div className="flex gap-3 justify-between">
                <Button variant="ghost" onClick={() => goBackward(2)}>
                  &larr; Back
                </Button>
                <Button
                  onClick={handleLaunch}
                  loading={launching}
                  size="lg"
                  variant="success"
                >
                  Launch {selectedPlatformObjects.length > 1 ? `${selectedPlatformObjects.length} Campaigns` : "Campaign"}
                </Button>
              </div>
            </div>
          )}

          {/* ════════════ SUCCESS STATE ════════════ */}
          {launched && (
            <div className="relative text-center py-8 animate-fade-in-scale">
              <ConfettiEffect />

              <div className="relative z-10">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-brand-green/10 mb-4">
                  <svg className="w-8 h-8 text-brand-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>

                <h2 className="font-heading text-2xl sm:text-3xl italic text-brand-white mb-2">
                  Your {selectedPlatformObjects.length > 1
                    ? `${selectedPlatformObjects.length} campaigns are`
                    : "first campaign is"}{" "}
                  live!
                </h2>
                <p className="text-sm text-brand-dim mb-2 max-w-sm mx-auto">
                  Customers can start earning rewards right away.
                </p>
                <div className="text-xs text-brand-muted mb-8 space-y-1">
                  {selectedPlatformObjects.map((p) => (
                    <p key={p.id}>
                      {p.icon} {p.name} ·{" "}
                      <span className="text-brand-green">
                        {previewText(rewards[p.id] ?? DEFAULT_REWARD)}
                      </span>
                    </p>
                  ))}
                </div>

                <Button size="lg" onClick={onComplete}>
                  Go to Dashboard &rarr;
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes confettiFall {
              0% { opacity: 1; transform: translateY(-10px) rotate(0deg) scale(1); }
              100% { opacity: 0; transform: translateY(420px) rotate(720deg) scale(0.3); }
            }
            @keyframes onboardingSlideIn {
              from { opacity: 0; transform: translateX(24px); }
              to   { opacity: 1; transform: translateX(0); }
            }
            @keyframes onboardingSlideInReverse {
              from { opacity: 0; transform: translateX(-24px); }
              to   { opacity: 1; transform: translateX(0); }
            }
            .animate-onboarding-slide-in {
              animation: onboardingSlideIn 0.35s ease-out both;
            }
            .animate-onboarding-slide-in-reverse {
              animation: onboardingSlideInReverse 0.35s ease-out both;
            }
          `,
        }}
      />
    </div>
  );
}
