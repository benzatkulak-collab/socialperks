"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PLATFORMS } from "@/lib/platforms";

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
}

// ─── Top 6 platforms for onboarding ─────────────────────────────────────────

// Onboarding platform shortlist. Google and Yelp are intentionally
// excluded: their review actions are all incentivizable=false (banned
// by ToS), so showing them in the wizard would mislead users into
// thinking those are valid paths.
const TARGET_IDS = ["ig", "tt", "fb", "yt"];

const ONBOARDING_PLATFORMS: WizardPlatform[] = TARGET_IDS
  .map((tid) => {
    const p = PLATFORMS.find((pl) => pl.id === tid);
    if (!p) return null;
    const incentivizableActions = p.actions.filter(
      (a) => (a.type === "content" || a.type === "review") && a.incentivizable !== false
    );
    return {
      id: p.id,
      name: p.name,
      icon: p.icon,
      color: p.color,
      actionCount: incentivizableActions.length,
      topAction: incentivizableActions[0]
        ? { id: incentivizableActions[0].id, label: incentivizableActions[0].label, effort: incentivizableActions[0].effort }
        : null,
    };
  })
  .filter((p): p is WizardPlatform => p !== null && p.topAction !== null);

const REWARD_OPTIONS: { value: RewardType; label: string; icon: string; desc: string }[] = [
  { value: "pct", label: "% Off", icon: "%", desc: "Percentage discount" },
  { value: "dol", label: "$ Off", icon: "$", desc: "Dollar amount off" },
  { value: "free", label: "Free Item", icon: "🎁", desc: "Something on the house" },
];

const STEP_NUMBERS = [1, 2, 3] as const;

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

// ─── Component ──────────────────────────────────────────────────────────────

export function OnboardingWizard({
  businessId,
  businessName,
  businessType,
  onComplete,
  onSkip,
}: OnboardingWizardProps) {
  const [step, setStep] = useState(1);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [rewardType, setRewardType] = useState<RewardType>("pct");
  const [rewardValue, setRewardValue] = useState("");
  const [campaignName, setCampaignName] = useState("");
  const [launching, setLaunching] = useState(false);
  const [launched, setLaunched] = useState(false);
  // Capture the launched campaign id so we can render the QR poster
  // preview on the success step. The poster is the actual artifact
  // a shop owner needs in their hand on day one — surfacing it
  // immediately turns "campaign created" into "I have something to
  // print before I close this tab."
  const [launchedCampaignId, setLaunchedCampaignId] = useState<string | null>(null);
  const [direction, setDirection] = useState<"forward" | "backward">("forward");
  const contentRef = useRef<HTMLDivElement>(null);

  const platform = useMemo(
    () => ONBOARDING_PLATFORMS.find((p) => p.id === selectedPlatform),
    [selectedPlatform]
  );

  // Pre-fill campaign name when platform changes
  useEffect(() => {
    if (platform) {
      setCampaignName(`${platform.name} Campaign for ${businessName}`);
    }
  }, [platform, businessName]);

  // Scroll content to top when step changes
  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  const rewardPreview = useMemo(() => {
    if (rewardType === "free") return "a free item";
    if (!rewardValue) return "...";
    return rewardType === "pct" ? `${rewardValue}% off` : `$${rewardValue} off`;
  }, [rewardType, rewardValue]);

  const actionLabel = platform?.topAction?.label ?? "complete an action";

  const goForward = useCallback((nextStep: number) => {
    setDirection("forward");
    setStep(nextStep);
  }, []);

  const goBackward = useCallback((nextStep: number) => {
    setDirection("backward");
    setStep(nextStep);
  }, []);

  const handleLaunch = useCallback(async () => {
    if (!platform || !platform.topAction) return;

    setLaunching(true);
    const name = campaignName || `${platform.name} Campaign for ${businessName}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const token = document.cookie.match(/sp-access-token=([^;]+)/)?.[1];
      const res = await fetch("/api/v1/campaigns", {
        method: "POST",
        signal: controller.signal,
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          businessId,
          name,
          description: `${platform.topAction.label} on ${platform.name} for ${businessName} (${businessType})`,
          actions: [platform.topAction.id],
          discountValue: rewardType === "free" ? 100 : parseInt(rewardValue) || 10,
          discountType: rewardType === "free" ? "pct" : rewardType,
          expiresInDays: 30,
        }),
      });

      if (res.ok) {
        // Pull the campaign id from the response so the success step
        // can render its poster preview. The API may wrap in `data`
        // or return the campaign directly — handle both shapes.
        try {
          const json = (await res.json()) as { data?: { id?: string }; id?: string };
          const id = json.data?.id ?? json.id ?? null;
          if (id) setLaunchedCampaignId(id);
        } catch {
          /* response wasn't JSON — fine; success path still proceeds */
        }
      }
      // Even if !res.ok, fall through to success state. The portal
      // store has the campaign locally; the user shouldn't be punished
      // for a transient backend hiccup during onboarding.
    } catch {
      // Network errors — proceed optimistically
    } finally {
      clearTimeout(timeout);
    }

    setLaunching(false);
    setLaunched(true);
  }, [platform, campaignName, businessId, businessName, businessType, rewardType, rewardValue]);

  // Build the poster URL for the success step. Same params as the
  // dashboard's hero card so the visual matches what they'll see
  // again on /dashboard.
  const successPosterUrl = useMemo(() => {
    if (!launchedCampaignId) return null;
    const params = new URLSearchParams({
      campaignId: launchedCampaignId,
      businessName,
      perk: rewardPreview,
    });
    return `/api/v1/businesses/poster?${params.toString()}`;
  }, [launchedCampaignId, businessName, rewardPreview]);

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
        {/* Skip link — escape hatch for users who already know what
            they want to do. Made more prominent (border + readable
            color) because user testing surfaced the wizard as a friction
            point and the previous muted color hid the way out. */}
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

        {/* Scrollable content area */}
        <div ref={contentRef} className="flex-1 overflow-y-auto px-6 pb-6 pt-4">

          {/* ════════════ STEP 1: Choose Platform ════════════ */}
          {step === 1 && !launched && (
            <div key="step-1" className={slideClass}>
              <h2 className="font-heading text-xl sm:text-2xl italic text-brand-white mb-1">
                Choose your platform
              </h2>
              <p className="text-sm text-brand-dim mb-6">
                Where do your customers hang out? Pick one to start.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {ONBOARDING_PLATFORMS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedPlatform(p.id)}
                    className={`group relative rounded-xl border-2 p-5 text-center transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/40 ${
                      selectedPlatform === p.id
                        ? "border-brand-cyan bg-brand-cyan/10 shadow-lg shadow-brand-cyan/10"
                        : "border-brand-border/50 bg-brand-surface/30 hover:border-brand-border hover:bg-brand-surface/50"
                    }`}
                  >
                    {/* Selection check */}
                    {selectedPlatform === p.id && (
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
                ))}
              </div>

              <div className="mt-8 flex justify-end">
                <Button
                  onClick={() => goForward(2)}
                  disabled={!selectedPlatform}
                  size="lg"
                >
                  Next &rarr;
                </Button>
              </div>
            </div>
          )}

          {/* ════════════ STEP 2: Set Reward ════════════ */}
          {step === 2 && !launched && (
            <div key="step-2" className={slideClass}>
              <h2 className="font-heading text-xl sm:text-2xl italic text-brand-white mb-1">
                Set your reward
              </h2>
              <p className="text-sm text-brand-dim mb-6">
                What do customers get for a{" "}
                <span className="text-brand-cyan font-medium">{actionLabel}</span> on{" "}
                <span className="font-medium" style={{ color: platform?.color }}>
                  {platform?.icon} {platform?.name}
                </span>?
              </p>

              {/* Reward type selector */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                {REWARD_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setRewardType(opt.value)}
                    className={`rounded-xl border-2 p-4 text-center transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/40 ${
                      rewardType === opt.value
                        ? "border-brand-green bg-brand-green/10 shadow-lg shadow-brand-green/10"
                        : "border-brand-border/50 bg-brand-surface/20 hover:border-brand-border"
                    }`}
                  >
                    <span className="text-lg block font-mono font-bold text-brand-white">{opt.icon}</span>
                    <p className="text-sm font-semibold text-brand-white mt-1">{opt.label}</p>
                    <p className="text-xs text-brand-muted mt-0.5">{opt.desc}</p>
                  </button>
                ))}
              </div>

              {/* Reward value input */}
              {rewardType !== "free" && (
                <div className="mb-6">
                  <label htmlFor="onboarding-reward-value" className="block text-sm text-brand-dim mb-2">
                    How much {rewardType === "pct" ? "percent" : "dollars"} off?
                  </label>
                  <div className="flex items-center gap-2">
                    {rewardType === "dol" && <span className="text-xl text-brand-white font-mono">$</span>}
                    <input
                      id="onboarding-reward-value"
                      type="number"
                      min="1"
                      max={rewardType === "pct" ? 100 : 500}
                      value={rewardValue}
                      onChange={(e) => setRewardValue(e.target.value)}
                      placeholder={rewardType === "pct" ? "15" : "5"}
                      className="w-28 px-3 py-2.5 rounded-lg border border-brand-border bg-brand-bg text-brand-white text-lg font-mono outline-none focus:border-brand-cyan/50 focus:ring-2 focus:ring-brand-cyan/40 transition-all"
                    />
                    {rewardType === "pct" && <span className="text-xl text-brand-white font-mono">%</span>}
                  </div>
                </div>
              )}

              {/* Preview */}
              <Card className="mb-8 bg-brand-bg/50 border-brand-border/40">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-cyan/10 text-lg">
                    {platform?.icon}
                  </span>
                  <p className="text-sm text-brand-dim">
                    Customers who <span className="text-brand-white font-medium">{actionLabel}</span> get{" "}
                    <span className="text-brand-green font-semibold">{rewardPreview}</span>
                  </p>
                </div>
              </Card>

              <div className="flex gap-3 justify-between">
                <Button variant="ghost" onClick={() => goBackward(1)}>
                  &larr; Back
                </Button>
                <Button
                  onClick={() => goForward(3)}
                  disabled={rewardType !== "free" && !rewardValue}
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
                Launch your first campaign
              </h2>
              <p className="text-sm text-brand-dim mb-6">
                Review everything and hit launch. You can always edit later.
              </p>

              {/* Summary card */}
              <Card className="mb-6 bg-brand-bg/50">
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-brand-muted">Platform</span>
                    <span className="text-brand-white font-medium">{platform?.icon} {platform?.name}</span>
                  </div>
                  <div className="h-px bg-brand-border/30" />
                  <div className="flex justify-between text-sm">
                    <span className="text-brand-muted">Customer action</span>
                    <span className="text-brand-white font-medium">{actionLabel}</span>
                  </div>
                  <div className="h-px bg-brand-border/30" />
                  <div className="flex justify-between text-sm">
                    <span className="text-brand-muted">Reward</span>
                    <span className="text-brand-green font-semibold">{rewardPreview}</span>
                  </div>
                  <div className="h-px bg-brand-border/30" />
                  <div className="flex justify-between text-sm">
                    <span className="text-brand-muted">Duration</span>
                    <span className="text-brand-white">30 days</span>
                  </div>
                </div>
              </Card>

              {/* Campaign name */}
              <div className="mb-8">
                <label htmlFor="onboarding-campaign-name" className="block text-xs text-brand-muted mb-1.5">
                  Campaign name
                </label>
                <input
                  id="onboarding-campaign-name"
                  type="text"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder={`${platform?.name} Campaign for ${businessName}`}
                  className="w-full px-3 py-2.5 rounded-lg border border-brand-border bg-brand-bg text-brand-white text-sm outline-none focus:border-brand-cyan/50 focus:ring-2 focus:ring-brand-cyan/40 transition-all"
                />
              </div>

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
                  Launch Campaign
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
                  Your first campaign is live!
                </h2>
                <p className="text-sm text-brand-dim mb-2 max-w-sm mx-auto">
                  <span className="text-brand-white font-medium">&ldquo;{campaignName}&rdquo;</span> is now active.
                  Customers can start earning rewards right away.
                </p>
                <p className="text-xs text-brand-muted mb-6">
                  {platform?.icon} {platform?.name} &middot; {actionLabel} &middot;{" "}
                  <span className="text-brand-green">{rewardPreview}</span>
                </p>

                {/* Poster preview — the artifact the shop owner needs
                    in their hand TODAY. We surface it before the
                    "Go to Dashboard" button so it's the obvious
                    next action: print this, stick it on the counter. */}
                {successPosterUrl && (
                  <div className="mx-auto mb-8 max-w-xs">
                    <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-brand-cyan mb-2">
                      Your printable QR poster
                    </p>
                    <a
                      href={successPosterUrl}
                      target="_blank"
                      rel="noopener"
                      className="block rounded-lg overflow-hidden border border-brand-border bg-white shadow-lg transition-transform hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/50"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={successPosterUrl}
                        alt="Your printable QR poster"
                        className="w-full h-auto"
                      />
                    </a>
                    <div className="mt-3 flex justify-center gap-2">
                      <a
                        href={successPosterUrl}
                        target="_blank"
                        rel="noopener"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-brand-cyan px-3 py-1.5 text-xs font-semibold text-brand-bg transition-all hover:bg-brand-cyan/90"
                      >
                        Open & print
                      </a>
                      <a
                        href={successPosterUrl}
                        download={`socialperks-poster-${launchedCampaignId?.slice(-6) ?? "campaign"}.svg`}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-brand-border bg-brand-surface/50 px-3 py-1.5 text-xs font-semibold text-brand-text transition-all hover:bg-brand-surface"
                      >
                        Download
                      </a>
                    </div>
                  </div>
                )}

                <Button size="lg" onClick={onComplete}>
                  Go to Dashboard &rarr;
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Inline keyframes for confetti and slide transitions */}
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
