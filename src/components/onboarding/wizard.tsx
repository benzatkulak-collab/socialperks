"use client";

// ══════════════════════════════════════════════════════════════════════════════
// Onboarding Wizard — 5 Steps to a Live Campaign in ~5 Minutes
//
// 1. Welcome
// 2. Business basics  (name, industry, city, website)
// 3. Connect a platform  (Instagram / Google / TikTok / Facebook — or skip)
// 4. First campaign  (pre-filled from industry template, editable)
// 5. Share link  (public campaign URL + QR + share buttons)
//
// Note: Wire post-signup redirect to /welcome separately in
// src/components/auth/auth-form.tsx — when onboardedAt is null, send the user
// to /welcome instead of /dashboard.
// ══════════════════════════════════════════════════════════════════════════════

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { QRCode } from "@/components/ui/qr-code";
import { trackEvent } from "@/lib/analytics/plausible";
import {
  ONBOARDING_INDUSTRIES,
  getCampaignTemplate,
  type CampaignTemplate,
} from "@/lib/onboarding/templates";

// ─── Constants ───────────────────────────────────────────────────────────────

const TOTAL_STEPS = 5;
const ONBOARDED_STORAGE_KEY = "sp-onboarded";
const BUSINESS_STORAGE_KEY = "sp-onboarding-business";
const PLATFORM_STORAGE_KEY = "sp-onboarding-platform";
const CAMPAIGN_STORAGE_KEY = "sp-onboarding-campaign";

const PLATFORMS: { id: CampaignTemplate["platform"]; label: string; icon: string; blurb: string }[] = [
  { id: "instagram", label: "Instagram", icon: "📸", blurb: "Photos, stories & reels" },
  { id: "google", label: "Google Business", icon: "🔍", blurb: "Reviews & local search" },
  { id: "tiktok", label: "TikTok", icon: "🎵", blurb: "Short-form video" },
  { id: "facebook", label: "Facebook", icon: "👍", blurb: "Posts, check-ins & shares" },
];

// ─── Types ───────────────────────────────────────────────────────────────────

interface BusinessInfo {
  name: string;
  industry: string;
  city: string;
  website: string;
}

interface CampaignDraft {
  name: string;
  action: string;
  perk: string;
  platform: CampaignTemplate["platform"];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function safeGet(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // localStorage may be unavailable (private mode, quota); fail silently.
  }
}

function generateCampaignId(): string {
  // Short, URL-safe, sortable-ish id. Good enough for a public share slug.
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `${ts}${rand}`;
}

function getShareOrigin(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return "https://socialperks.onrender.com";
}

// ─── Component ───────────────────────────────────────────────────────────────

export function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const startedAtRef = useRef<number>(Date.now());
  const stepStartedAtRef = useRef<number>(Date.now());

  const [business, setBusiness] = useState<BusinessInfo>({
    name: "",
    industry: "",
    city: "",
    website: "",
  });
  const [connectedPlatform, setConnectedPlatform] = useState<string | null>(null);
  const [campaign, setCampaign] = useState<CampaignDraft>({
    name: "",
    action: "",
    perk: "",
    platform: "instagram",
  });
  const [campaignId, setCampaignId] = useState<string>("");
  const [savingBusiness, setSavingBusiness] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [copied, setCopied] = useState(false);

  // ─── Restore in-progress state (so a refresh doesn't blow it away) ──────
  useEffect(() => {
    const savedBiz = safeGet(BUSINESS_STORAGE_KEY);
    if (savedBiz) {
      try {
        const parsed = JSON.parse(savedBiz) as Partial<BusinessInfo>;
        setBusiness((prev) => ({ ...prev, ...parsed }));
      } catch {
        // ignore malformed state
      }
    }
    const savedPlat = safeGet(PLATFORM_STORAGE_KEY);
    if (savedPlat) setConnectedPlatform(savedPlat);
    const savedCamp = safeGet(CAMPAIGN_STORAGE_KEY);
    if (savedCamp) {
      try {
        const parsed = JSON.parse(savedCamp) as Partial<CampaignDraft>;
        setCampaign((prev) => ({ ...prev, ...parsed }));
      } catch {
        // ignore
      }
    }
  }, []);

  // When industry changes, pre-fill the campaign template (but only if the
  // user hasn't already typed something into the campaign fields).
  useEffect(() => {
    if (!business.industry) return;
    setCampaign((prev) => {
      if (prev.name || prev.action || prev.perk) return prev;
      const tpl = getCampaignTemplate(business.industry);
      return {
        name: tpl.name,
        action: tpl.action,
        perk: tpl.perk,
        platform: tpl.platform,
      };
    });
  }, [business.industry]);

  // ─── Analytics helper ───────────────────────────────────────────────────
  const recordStepCompleted = useCallback((completed: number) => {
    const now = Date.now();
    trackEvent("onboarding_step_completed", {
      step: completed,
      time_in_step_ms: now - stepStartedAtRef.current,
      total_elapsed_ms: now - startedAtRef.current,
    });
    stepStartedAtRef.current = now;
  }, []);

  const goNext = useCallback(() => {
    setStep((s) => {
      const next = Math.min(TOTAL_STEPS, s + 1) as 1 | 2 | 3 | 4 | 5;
      return next;
    });
  }, []);

  const goBack = useCallback(() => {
    setStep((s) => Math.max(1, s - 1) as 1 | 2 | 3 | 4 | 5);
  }, []);

  // ─── Step 1: Welcome ────────────────────────────────────────────────────
  const handleStartWizard = useCallback(() => {
    recordStepCompleted(1);
    goNext();
  }, [recordStepCompleted, goNext]);

  // ─── Step 2: Business basics ────────────────────────────────────────────
  const canSubmitBusiness = business.name.trim().length > 0 && business.industry.length > 0;

  const handleSaveBusiness = useCallback(async () => {
    if (!canSubmitBusiness) return;
    setSavingBusiness(true);
    // Persist locally so a refresh keeps the wizard's state.
    safeSet(BUSINESS_STORAGE_KEY, JSON.stringify(business));
    // Try to PUT to the businesses endpoint. If it doesn't exist or fails,
    // we still let the user proceed — onboarding completion shouldn't be
    // blocked by a backend hiccup. The local copy is the source of truth
    // for the wizard.
    try {
      await fetch("/api/v1/businesses", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(business),
      });
    } catch {
      // network failure — proceed anyway
    } finally {
      setSavingBusiness(false);
      recordStepCompleted(2);
      goNext();
    }
  }, [business, canSubmitBusiness, recordStepCompleted, goNext]);

  // ─── Step 3: Connect a platform ─────────────────────────────────────────
  const handleConnectPlatform = useCallback(
    (id: string) => {
      // No real OAuth — just flag client-side. The real OAuth flow lives at
      // /api/v1/auth/oauth/connect; we'll wire it up in a follow-up.
      setConnectedPlatform(id);
      safeSet(PLATFORM_STORAGE_KEY, id);
      trackEvent("onboarding_platform_connected", { platform: id });
    },
    [],
  );

  const handlePlatformContinue = useCallback(() => {
    recordStepCompleted(3);
    goNext();
  }, [recordStepCompleted, goNext]);

  const handleSkipPlatform = useCallback(() => {
    trackEvent("onboarding_platform_skipped");
    recordStepCompleted(3);
    goNext();
  }, [recordStepCompleted, goNext]);

  // ─── Step 4: First campaign ─────────────────────────────────────────────
  const canLaunchCampaign =
    campaign.name.trim().length > 0 &&
    campaign.action.trim().length > 0 &&
    campaign.perk.trim().length > 0;

  const handleLaunchCampaign = useCallback(async () => {
    if (!canLaunchCampaign) return;
    setLaunching(true);
    const id = generateCampaignId();
    setCampaignId(id);
    safeSet(CAMPAIGN_STORAGE_KEY, JSON.stringify(campaign));

    // Best-effort create on the backend; the wizard proceeds either way.
    try {
      await fetch("/api/v1/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          name: campaign.name,
          action: campaign.action,
          perk: campaign.perk,
          platform: campaign.platform,
          business: business.name,
          source: "onboarding-wizard",
        }),
      });
    } catch {
      // ignore
    } finally {
      setLaunching(false);
      trackEvent("onboarding_campaign_created", { platform: campaign.platform });
      recordStepCompleted(4);
      goNext();
    }
  }, [campaign, business.name, canLaunchCampaign, recordStepCompleted, goNext]);

  // ─── Step 5: Share link ─────────────────────────────────────────────────
  const shareUrl = useMemo(() => {
    const origin = getShareOrigin();
    return `${origin}/campaign/${campaignId || "preview"}`;
  }, [campaignId]);

  const handleCopyLink = useCallback(async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // Clipboard API may be blocked — fall back to a no-op; the URL is
      // already visible in the input so the user can copy it manually.
    }
    trackEvent("onboarding_share_link_copied");
  }, [shareUrl]);

  const tweetUrl = useMemo(
    () =>
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(
        `Just launched a perk for ${business.name || "my customers"} — ${campaign.perk}. Get it here:`,
      )}&url=${encodeURIComponent(shareUrl)}`,
    [shareUrl, business.name, campaign.perk],
  );

  const mailtoUrl = useMemo(
    () =>
      `mailto:?subject=${encodeURIComponent(`My new Social Perks campaign: ${campaign.name}`)}&body=${encodeURIComponent(
        `Hey — I just launched a perk: ${campaign.perk}. Share this link with your friends: ${shareUrl}`,
      )}`,
    [shareUrl, campaign.name, campaign.perk],
  );

  const handleFinish = useCallback(() => {
    recordStepCompleted(5);
    trackEvent("onboarding_completed", {
      total_elapsed_ms: Date.now() - startedAtRef.current,
      industry: business.industry || "unknown",
      platform_connected: connectedPlatform ?? "none",
    });
    safeSet(ONBOARDED_STORAGE_KEY, new Date().toISOString());
    router.push("/dashboard");
  }, [recordStepCompleted, router, business.industry, connectedPlatform]);

  // ─── Render ──────────────────────────────────────────────────────────────
  const progressPct = Math.round(((step - 1) / (TOTAL_STEPS - 1)) * 100);

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex justify-between text-xs text-brand-dim mb-2 font-mono">
            <span>
              Step {step} of {TOTAL_STEPS}
            </span>
            <span>{progressPct}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-brand-elevated overflow-hidden">
            <div
              className="h-full bg-brand-cyan transition-all duration-300 ease-out"
              style={{ width: `${progressPct}%` }}
              role="progressbar"
              aria-valuenow={progressPct}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-brand-border bg-brand-surface p-6 sm:p-10">
          {step === 1 && <StepWelcome onStart={handleStartWizard} />}
          {step === 2 && (
            <StepBusiness
              value={business}
              onChange={setBusiness}
              onContinue={handleSaveBusiness}
              onBack={goBack}
              canSubmit={canSubmitBusiness}
              saving={savingBusiness}
            />
          )}
          {step === 3 && (
            <StepPlatform
              connected={connectedPlatform}
              onConnect={handleConnectPlatform}
              onContinue={handlePlatformContinue}
              onSkip={handleSkipPlatform}
              onBack={goBack}
            />
          )}
          {step === 4 && (
            <StepCampaign
              value={campaign}
              onChange={setCampaign}
              onLaunch={handleLaunchCampaign}
              onBack={goBack}
              canLaunch={canLaunchCampaign}
              launching={launching}
            />
          )}
          {step === 5 && (
            <StepShare
              shareUrl={shareUrl}
              copied={copied}
              tweetUrl={tweetUrl}
              mailtoUrl={mailtoUrl}
              onCopy={handleCopyLink}
              onFinish={handleFinish}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Step 1 — Welcome
// ═══════════════════════════════════════════════════════════════════════════

function StepWelcome({ onStart }: { onStart: () => void }) {
  return (
    <div className="text-center space-y-6">
      <h1 className="font-serif italic text-4xl sm:text-5xl text-brand-white">
        Welcome to Social Perks!
      </h1>
      <p className="text-brand-dim text-base sm:text-lg">
        Let&apos;s get your first campaign live in 5 minutes.
      </p>

      {/* Video placeholder — replace with a real intro video later. */}
      <div className="aspect-video w-full rounded-xl bg-brand-elevated border border-brand-border flex items-center justify-center text-brand-dim text-sm">
        <div className="flex flex-col items-center gap-2">
          <span className="text-3xl">▶</span>
          <span>30-second intro video</span>
        </div>
      </div>

      <div className="pt-2">
        <Button onClick={onStart} size="xl">
          Let&apos;s go →
        </Button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Step 2 — Business basics
// ═══════════════════════════════════════════════════════════════════════════

function StepBusiness({
  value,
  onChange,
  onContinue,
  onBack,
  canSubmit,
  saving,
}: {
  value: BusinessInfo;
  onChange: (v: BusinessInfo) => void;
  onContinue: () => void;
  onBack: () => void;
  canSubmit: boolean;
  saving: boolean;
}) {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h2 className="font-serif italic text-3xl text-brand-white">Tell us about your business</h2>
        <p className="text-brand-dim text-sm">
          We&apos;ll use this to recommend the right campaigns for you.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="text-xs text-brand-dim uppercase tracking-wide font-mono">
            Business name *
          </span>
          <input
            type="text"
            value={value.name}
            onChange={(e) => onChange({ ...value, name: e.target.value })}
            placeholder="e.g. Sunrise Coffee Co."
            className="mt-1 w-full rounded-lg border border-brand-border bg-brand-bg px-3 py-2 text-sm text-brand-text placeholder:text-brand-dim/50 focus:outline-none focus:ring-2 focus:ring-brand-cyan/40 focus:border-brand-cyan/40"
          />
        </label>

        <label className="block sm:col-span-2">
          <span className="text-xs text-brand-dim uppercase tracking-wide font-mono">
            Industry *
          </span>
          <select
            value={value.industry}
            onChange={(e) => onChange({ ...value, industry: e.target.value })}
            className="mt-1 w-full rounded-lg border border-brand-border bg-brand-bg px-3 py-2 text-sm text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-cyan/40 focus:border-brand-cyan/40"
          >
            <option value="">Choose one…</option>
            {ONBOARDING_INDUSTRIES.map((ind) => (
              <option key={ind.slug} value={ind.slug}>
                {ind.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-xs text-brand-dim uppercase tracking-wide font-mono">City</span>
          <input
            type="text"
            value={value.city}
            onChange={(e) => onChange({ ...value, city: e.target.value })}
            placeholder="e.g. Austin"
            className="mt-1 w-full rounded-lg border border-brand-border bg-brand-bg px-3 py-2 text-sm text-brand-text placeholder:text-brand-dim/50 focus:outline-none focus:ring-2 focus:ring-brand-cyan/40 focus:border-brand-cyan/40"
          />
        </label>

        <label className="block">
          <span className="text-xs text-brand-dim uppercase tracking-wide font-mono">
            Website (optional)
          </span>
          <input
            type="url"
            value={value.website}
            onChange={(e) => onChange({ ...value, website: e.target.value })}
            placeholder="https://yourshop.com"
            className="mt-1 w-full rounded-lg border border-brand-border bg-brand-bg px-3 py-2 text-sm text-brand-text placeholder:text-brand-dim/50 focus:outline-none focus:ring-2 focus:ring-brand-cyan/40 focus:border-brand-cyan/40"
          />
        </label>
      </div>

      <div className="flex items-center justify-between pt-2">
        <Button onClick={onBack} variant="ghost">
          ← Back
        </Button>
        <Button onClick={onContinue} disabled={!canSubmit} loading={saving}>
          Continue →
        </Button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Step 3 — Connect a platform
// ═══════════════════════════════════════════════════════════════════════════

function StepPlatform({
  connected,
  onConnect,
  onContinue,
  onSkip,
  onBack,
}: {
  connected: string | null;
  onConnect: (id: string) => void;
  onContinue: () => void;
  onSkip: () => void;
  onBack: () => void;
}) {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h2 className="font-serif italic text-3xl text-brand-white">Connect a platform</h2>
        <p className="text-brand-dim text-sm">
          Pick one to start with. You can add more later.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        {PLATFORMS.map((p) => {
          const isConnected = connected === p.id;
          return (
            <div
              key={p.id}
              className={`rounded-xl border p-4 transition-colors ${
                isConnected
                  ? "border-brand-cyan bg-brand-cyan/5"
                  : "border-brand-border bg-brand-bg hover:border-brand-border-hover"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="text-2xl" aria-hidden>
                  {p.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-brand-white">{p.label}</div>
                  <div className="text-xs text-brand-dim mt-0.5">{p.blurb}</div>
                </div>
              </div>
              <div className="mt-3">
                <Button
                  onClick={() => onConnect(p.id)}
                  variant={isConnected ? "success" : "outline"}
                  size="sm"
                  fullWidth
                >
                  {isConnected ? "✓ Connected" : "Connect"}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between pt-2">
        <Button onClick={onBack} variant="ghost">
          ← Back
        </Button>
        <div className="flex items-center gap-3">
          <Button onClick={onSkip} variant="link">
            Skip for now
          </Button>
          <Button onClick={onContinue} disabled={!connected}>
            Continue →
          </Button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Step 4 — First campaign
// ═══════════════════════════════════════════════════════════════════════════

function StepCampaign({
  value,
  onChange,
  onLaunch,
  onBack,
  canLaunch,
  launching,
}: {
  value: CampaignDraft;
  onChange: (v: CampaignDraft) => void;
  onLaunch: () => void;
  onBack: () => void;
  canLaunch: boolean;
  launching: boolean;
}) {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h2 className="font-serif italic text-3xl text-brand-white">Your first campaign</h2>
        <p className="text-brand-dim text-sm">
          We&apos;ve pre-filled a campaign for you based on your industry. Edit anything you like.
        </p>
      </header>

      <div className="space-y-4">
        <label className="block">
          <span className="text-xs text-brand-dim uppercase tracking-wide font-mono">
            Campaign name
          </span>
          <input
            type="text"
            value={value.name}
            onChange={(e) => onChange({ ...value, name: e.target.value })}
            className="mt-1 w-full rounded-lg border border-brand-border bg-brand-bg px-3 py-2 text-sm text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-cyan/40 focus:border-brand-cyan/40"
          />
        </label>

        <label className="block">
          <span className="text-xs text-brand-dim uppercase tracking-wide font-mono">
            What customers do
          </span>
          <input
            type="text"
            value={value.action}
            onChange={(e) => onChange({ ...value, action: e.target.value })}
            className="mt-1 w-full rounded-lg border border-brand-border bg-brand-bg px-3 py-2 text-sm text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-cyan/40 focus:border-brand-cyan/40"
          />
        </label>

        <label className="block">
          <span className="text-xs text-brand-dim uppercase tracking-wide font-mono">
            What they get (the perk)
          </span>
          <input
            type="text"
            value={value.perk}
            onChange={(e) => onChange({ ...value, perk: e.target.value })}
            className="mt-1 w-full rounded-lg border border-brand-border bg-brand-bg px-3 py-2 text-sm text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-cyan/40 focus:border-brand-cyan/40"
          />
        </label>

        <label className="block">
          <span className="text-xs text-brand-dim uppercase tracking-wide font-mono">Platform</span>
          <select
            value={value.platform}
            onChange={(e) =>
              onChange({ ...value, platform: e.target.value as CampaignDraft["platform"] })
            }
            className="mt-1 w-full rounded-lg border border-brand-border bg-brand-bg px-3 py-2 text-sm text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-cyan/40 focus:border-brand-cyan/40"
          >
            <option value="instagram">Instagram</option>
            <option value="google">Google Business</option>
            <option value="tiktok">TikTok</option>
            <option value="facebook">Facebook</option>
          </select>
        </label>
      </div>

      <div className="flex items-center justify-between pt-2">
        <Button onClick={onBack} variant="ghost">
          ← Back
        </Button>
        <Button onClick={onLaunch} disabled={!canLaunch} loading={launching}>
          Launch campaign →
        </Button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Step 5 — Your share link
// ═══════════════════════════════════════════════════════════════════════════

function StepShare({
  shareUrl,
  copied,
  tweetUrl,
  mailtoUrl,
  onCopy,
  onFinish,
}: {
  shareUrl: string;
  copied: boolean;
  tweetUrl: string;
  mailtoUrl: string;
  onCopy: () => void;
  onFinish: () => void;
}) {
  return (
    <div className="space-y-6">
      <header className="text-center space-y-2">
        <h2 className="font-serif italic text-3xl text-brand-white">
          Your campaign is live! 🎉
        </h2>
        <p className="text-brand-dim text-sm">
          Share this link with customers — or post it on your front door.
        </p>
      </header>

      {/* Copy-paste box */}
      <div className="rounded-xl border border-brand-border bg-brand-bg p-4">
        <div className="text-xs text-brand-dim uppercase tracking-wide font-mono mb-2">
          Your share link
        </div>
        <div className="flex items-stretch gap-2">
          <input
            readOnly
            value={shareUrl}
            onFocus={(e) => e.currentTarget.select()}
            className="flex-1 rounded-lg border border-brand-border bg-brand-elevated px-3 py-2 text-sm font-mono text-brand-white focus:outline-none focus:ring-2 focus:ring-brand-cyan/40"
          />
          <Button onClick={onCopy} variant="primary" size="md">
            {copied ? "Copied!" : "Copy link"}
          </Button>
        </div>
      </div>

      {/* Share buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Button onClick={onCopy} variant="secondary" size="sm" fullWidth>
          {copied ? "✓ Copied" : "Copy"}
        </Button>
        <a
          href={tweetUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center rounded-lg border border-brand-border bg-brand-elevated px-3 py-1.5 text-xs font-medium text-brand-text min-h-[32px] hover:border-brand-border-hover hover:bg-brand-surface transition-colors"
          onClick={() => trackEvent("onboarding_share_twitter")}
        >
          Share on Twitter
        </a>
        <a
          href={mailtoUrl}
          className="inline-flex items-center justify-center rounded-lg border border-brand-border bg-brand-elevated px-3 py-1.5 text-xs font-medium text-brand-text min-h-[32px] hover:border-brand-border-hover hover:bg-brand-surface transition-colors"
          onClick={() => trackEvent("onboarding_share_email")}
        >
          Email to self
        </a>
        <details className="relative">
          <summary className="list-none cursor-pointer inline-flex items-center justify-center w-full rounded-lg border border-brand-border bg-brand-elevated px-3 py-1.5 text-xs font-medium text-brand-text min-h-[32px] hover:border-brand-border-hover hover:bg-brand-surface transition-colors">
            QR code
          </summary>
          <div className="absolute right-0 mt-2 rounded-xl border border-brand-border bg-brand-surface p-4 shadow-lg z-10">
            <QRCode url={shareUrl} size={200} />
            <div className="mt-2 text-xs text-brand-dim text-center">
              Scan to open the campaign
            </div>
          </div>
        </details>
      </div>

      <div className="pt-2 flex justify-center">
        <Button onClick={onFinish} size="lg">
          Go to dashboard →
        </Button>
      </div>
    </div>
  );
}
