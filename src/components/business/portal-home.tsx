"use client";

import { useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Stat } from "@/components/ui/stat";
import { AnimateOnScroll } from "@/components/shared/animate-on-scroll";
import { EmbedCode } from "./embed-code";
import { TemplatePicker } from "./template-picker";
import type { CampaignTemplate as RichCampaignTemplate } from "@/lib/campaign-templates";

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

interface PlatformOption {
  id: string;
  name: string;
  icon: string;
  color: string;
  actions: { id: string; label: string; effort: number }[];
}

interface CampaignTemplate {
  id: string;
  label: string;
  platformId: string;
  actionId: string;
  rewardType: "pct" | "dol" | "free";
  rewardValue: string;
  name: string;
}

export interface PortalHomeProps {
  myCampaigns: ActiveCampaign[];
  showWelcome: boolean;
  activeCampaignCount: string;
  totalCompletions: string;
  stats: { reviews: number; marketingValue: number };
  platformOptions: PlatformOption[];
  campaignTemplates: CampaignTemplate[];
  businessType?: string;
  onDismissWelcome: () => void;
  onGoToCreate: () => void;
  onApplyTemplate: (templateId: string) => void;
  onSelectRichTemplate?: (template: RichCampaignTemplate) => void;
  onExportCSV: () => void;
  onEditCampaign?: (campaign: ActiveCampaign) => void;
  onPauseCampaign?: (campaignId: string) => void;
  onResumeCampaign?: (campaignId: string) => void;
  onEndCampaign?: (campaignId: string) => void;
  businessId?: string;
  businessName?: string;
  /** Business plan — widget shown for starter+ (not free/undefined) */
  plan?: string;
  referralLink?: string;
  referralCreditsEarned?: number;
  onOpenReferrals?: () => void;
}

// ─── Component ──────────────────────────────────────────────────────────────

function getCampaignUrl(campaignId: string): string {
  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://socialperks.io";
  return `${origin}/c/${campaignId}`;
}

export function PortalHome({
  myCampaigns,
  showWelcome,
  activeCampaignCount,
  totalCompletions,
  stats,
  platformOptions,
  campaignTemplates,
  businessType,
  onDismissWelcome,
  onGoToCreate,
  onApplyTemplate,
  onSelectRichTemplate,
  onExportCSV,
  onEditCampaign,
  onPauseCampaign,
  onResumeCampaign,
  onEndCampaign,
  businessId,
  businessName,
  plan,
  referralLink,
  referralCreditsEarned = 0,
  onOpenReferrals,
}: PortalHomeProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleShareCampaign = useCallback((campaignId: string) => {
    const url = getCampaignUrl(campaignId);
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(campaignId);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }, []);

  // Pick the campaign whose poster we surface as the dashboard hero. Prefer
  // the first active one (so paused/ended don't dominate); fall back to the
  // most recent if nothing is active. The QR poster is the single most
  // important artifact on this page — printing and sticking it on the
  // counter is what actually drives the customer flywheel.
  const heroCampaign =
    myCampaigns.find((c) => c.status === "active") ?? myCampaigns[0];
  const heroPosterUrl = heroCampaign
    ? `/api/v1/businesses/poster?campaignId=${encodeURIComponent(
        heroCampaign.id,
      )}&businessName=${encodeURIComponent(
        businessName ?? "Your Business",
      )}&perk=${encodeURIComponent(heroCampaign.rewardValue + (heroCampaign.rewardType === "pct" ? "% off" : heroCampaign.rewardType === "dol" ? " off" : ""))}`
    : null;

  return (
    <>
      {/* Stats (only if there are campaigns) */}
      {myCampaigns.length > 0 && (
        <AnimateOnScroll animation="fade-up" stagger staggerDelay={80} className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          <Card><Stat value={activeCampaignCount} label="Active" color="cyan" /></Card>
          <Card><Stat value={totalCompletions} label="Completions" color="green" /></Card>
          <Card><Stat value={String(stats.reviews)} label="Reviews" color="amber" /></Card>
          <Card><Stat value={"$" + stats.marketingValue} label="Value" color="pink" /></Card>
        </AnimateOnScroll>
      )}

      {/* QR Poster Hero — the centerpiece of the whole product. The single
          action that turns a campaign into actual customer reach is "print
          this and stick it on the counter." Surface it loud, surface it
          first, make it one click. */}
      {heroCampaign && heroPosterUrl && (
        <AnimateOnScroll animation="fade-up" delay={40} className="mb-8">
          <Card borderColor="cyan" className="bg-gradient-to-br from-brand-cyan/[0.06] to-brand-purple/[0.04]">
            <div className="grid grid-cols-1 sm:grid-cols-[auto,1fr] gap-6 items-center">
              {/* Poster preview thumbnail */}
              <a
                href={heroPosterUrl}
                target="_blank"
                rel="noopener"
                className="block relative shrink-0 rounded-lg overflow-hidden border border-brand-border bg-white shadow-lg transition-transform hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/50"
                style={{ width: 140, height: 180 }}
                aria-label="Open full-size poster in a new tab"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={heroPosterUrl}
                  alt={`Printable QR poster for ${heroCampaign.name}`}
                  className="w-full h-full object-cover"
                />
              </a>

              {/* Copy + actions */}
              <div className="min-w-0">
                <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-brand-cyan mb-2">
                  Step 1 → Print this
                </p>
                <h2 className="font-heading text-2xl italic text-brand-white leading-tight">
                  Stick this on your counter today.
                </h2>
                <p className="mt-2 text-sm text-brand-dim">
                  Customers scan, post, get{" "}
                  <span className="text-brand-white font-semibold">
                    {heroCampaign.rewardValue}
                    {heroCampaign.rewardType === "pct" ? "% off" : heroCampaign.rewardType === "dol" ? " off" : ""}
                  </span>
                  . You get real word-of-mouth seen by every friend they have.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <a
                    href={heroPosterUrl}
                    target="_blank"
                    rel="noopener"
                    className="inline-flex items-center gap-2 rounded-lg bg-brand-cyan px-4 py-2 text-sm font-semibold text-brand-bg transition-all hover:bg-brand-cyan/90 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/50"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829q-.34.018-.68.04m.68-.04a24.5 24.5 0 0 1 4.56 0m-4.56 0v-3.752m4.56 3.752v-3.752m0 3.752q.34.018.68.04m-.68-.04l-1-3.752M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                    </svg>
                    Open & print poster
                  </a>
                  <a
                    href={heroPosterUrl}
                    download={`socialperks-poster-${heroCampaign.id.slice(-6)}.svg`}
                    className="inline-flex items-center gap-2 rounded-lg border border-brand-border bg-brand-surface/50 px-4 py-2 text-sm font-semibold text-brand-text transition-all hover:bg-brand-surface hover:border-brand-border-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/40"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                    Download
                  </a>
                  <button
                    type="button"
                    onClick={() => handleShareCampaign(heroCampaign.id)}
                    className="inline-flex items-center gap-2 rounded-lg border border-brand-border bg-brand-surface/50 px-4 py-2 text-sm font-semibold text-brand-text transition-all hover:bg-brand-surface hover:border-brand-border-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/40"
                  >
                    {copiedId === heroCampaign.id ? (
                      <>
                        <svg className="w-4 h-4 text-brand-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                        Copied
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" /></svg>
                        Copy link
                      </>
                    )}
                  </button>
                </div>
                <p className="mt-3 text-xs text-brand-muted">
                  Tip: tape it next to the register, on the cup sleeve, or on a tip-jar tent card. Most posts reach 800+ people on average.
                </p>
              </div>
            </div>
          </Card>
        </AnimateOnScroll>
      )}

      {/* Welcome card (dismissible) */}
      {showWelcome && myCampaigns.length === 0 && (
        <Card className="mb-6 bg-brand-cyan/5 border-brand-cyan/20 relative">
          <button
            type="button"
            onClick={onDismissWelcome}
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

      {/* Campaign templates — rich picker when handler available, fallback to legacy */}
      {myCampaigns.length === 0 && (
        <AnimateOnScroll animation="fade-up" delay={100} className="mb-6">
          {onSelectRichTemplate && businessType ? (
            <TemplatePicker
              businessType={businessType}
              onSelectTemplate={onSelectRichTemplate}
            />
          ) : (
            <>
              <h2 className="text-sm font-semibold text-brand-dim mb-3">Quick-start templates</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {campaignTemplates.map((tpl) => {
                  const tplPlatform = platformOptions.find((p) => p.id === tpl.platformId);
                  return (
                    <button
                      key={tpl.id}
                      onClick={() => onApplyTemplate(tpl.id)}
                      className="rounded-xl border border-brand-border bg-brand-surface/30 p-4 text-left transition-all hover:border-brand-cyan hover:bg-brand-surface/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/40"
                    >
                      <span className="text-lg">{tplPlatform?.icon ?? "📱"}</span>
                      <p className="text-xs font-semibold text-brand-white mt-2">{tpl.label}</p>
                      <p className="text-xs text-brand-muted mt-0.5">{tpl.rewardValue}{tpl.rewardType === "pct" ? "%" : "$"} off</p>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </AnimateOnScroll>
      )}

      {/* Create new campaign button — copy reframed around the QR
          flow. The visible job is "set the perk" once; the actual
          ongoing artifact is the printed QR which the hero card above
          handles. */}
      <button
        onClick={onGoToCreate}
        className="w-full rounded-xl border-2 border-dashed border-brand-cyan/30 bg-brand-cyan/[0.03] p-8 sm:p-10 text-center transition-all duration-300 hover:border-brand-cyan/60 hover:bg-brand-cyan/[0.07] mb-6 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/40 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-bg"
      >
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-brand-cyan/10 text-brand-cyan text-2xl transition-transform duration-300 group-hover:scale-110">+</span>
        <p className="mt-3 text-sm font-semibold text-brand-white">
          {myCampaigns.length === 0 ? "Print your first QR code" : "Create another campaign"}
        </p>
        <p className="mt-1 text-xs text-brand-dim">
          {myCampaigns.length === 0
            ? "Pick a perk, print the poster, stick it on the counter. 5 minutes."
            : "Add a different perk or a different platform."}
        </p>
      </button>

      {/* Active campaigns list */}
      {myCampaigns.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-brand-dim">Your campaigns</h2>
            <button
              type="button"
              onClick={onExportCSV}
              className="text-xs text-brand-cyan hover:text-brand-white transition-colors py-1 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/40"
            >
              Export CSV
            </button>
          </div>
          <AnimateOnScroll animation="fade-up" stagger staggerDelay={60} className="space-y-3">
            {myCampaigns.map((campaign) => (
              <Card key={campaign.id}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xl shrink-0">{campaign.platformIcon}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-brand-white truncate">{campaign.name}</p>
                      <p className="text-xs text-brand-muted truncate">
                        {campaign.action} &middot; Reward: {campaign.rewardValue} &middot; {campaign.completions} completions
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    {/* Edit button — only for active/paused */}
                    {campaign.status !== "ended" && onEditCampaign && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditCampaign(campaign);
                        }}
                        className="w-8 h-8 flex items-center justify-center rounded-md text-brand-muted hover:text-brand-cyan hover:bg-brand-cyan/10 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/40"
                        aria-label={`Edit ${campaign.name}`}
                        title="Edit campaign"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                        </svg>
                      </button>
                    )}

                    {/* Pause button — only for active */}
                    {campaign.status === "active" && onPauseCampaign && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onPauseCampaign(campaign.id);
                        }}
                        className="w-8 h-8 flex items-center justify-center rounded-md text-brand-muted hover:text-brand-amber hover:bg-brand-amber/10 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber/40"
                        aria-label={`Pause ${campaign.name}`}
                        title="Pause campaign"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" />
                        </svg>
                      </button>
                    )}

                    {/* Resume button — only for paused */}
                    {campaign.status === "paused" && onResumeCampaign && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onResumeCampaign(campaign.id);
                        }}
                        className="w-8 h-8 flex items-center justify-center rounded-md text-brand-muted hover:text-brand-green hover:bg-brand-green/10 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/40"
                        aria-label={`Resume ${campaign.name}`}
                        title="Resume campaign"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347c-.75.412-1.667-.13-1.667-.986V5.653z" />
                        </svg>
                      </button>
                    )}

                    {/* End button — for active or paused */}
                    {(campaign.status === "active" || campaign.status === "paused") && onEndCampaign && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`End "${campaign.name}"? This cannot be undone.`)) {
                            onEndCampaign(campaign.id);
                          }
                        }}
                        className="w-8 h-8 flex items-center justify-center rounded-md text-brand-muted hover:text-brand-red hover:bg-brand-red/10 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red/40"
                        aria-label={`End ${campaign.name}`}
                        title="End campaign"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 7.5A2.25 2.25 0 017.5 5.25h9a2.25 2.25 0 012.25 2.25v9a2.25 2.25 0 01-2.25 2.25h-9a2.25 2.25 0 01-2.25-2.25v-9z" />
                        </svg>
                      </button>
                    )}

                    {/* Share button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleShareCampaign(campaign.id);
                      }}
                      className="relative w-8 h-8 flex items-center justify-center rounded-md text-brand-muted hover:text-brand-cyan hover:bg-brand-cyan/10 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/40"
                      aria-label={`Copy share link for ${campaign.name}`}
                      title="Copy campaign link"
                    >
                      {copiedId === campaign.id ? (
                        <svg className="w-4 h-4 text-brand-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-4.122a4.5 4.5 0 00-1.242-7.244l-4.5-4.5a4.5 4.5 0 00-6.364 6.364L4.34 8.374" />
                        </svg>
                      )}
                    </button>

                    {/* Status badge */}
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                      campaign.status === "active"
                        ? "bg-brand-green/10 text-brand-green"
                        : campaign.status === "paused"
                        ? "bg-brand-amber/10 text-brand-amber"
                        : "bg-brand-muted/10 text-brand-muted"
                    }`}>
                      {campaign.status}
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </AnimateOnScroll>
        </div>
      )}

      {/* Website Widget (starter+ plans only) */}
      {businessId && plan && plan !== "free" && (
        <AnimateOnScroll animation="fade-up" delay={120} className="mb-6">
          <Card borderColor="cyan">
            <EmbedCode
              businessId={businessId}
              businessName={businessName || ""}
            />
          </Card>
        </AnimateOnScroll>
      )}

      {/* Refer & Earn */}
      {referralLink && onOpenReferrals && (
        <AnimateOnScroll animation="fade-up" delay={100} className="mb-6">
          <Card
            borderColor="purple"
            hoverable
            onClick={onOpenReferrals}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-brand-white">
                  Refer &amp; Earn
                </p>
                <p className="text-xs text-brand-dim mt-1">
                  Invite other businesses and earn $10 for each signup.
                  {referralCreditsEarned > 0 && (
                    <span className="text-brand-green font-semibold">
                      {" "}You&apos;ve earned ${referralCreditsEarned} so far!
                    </span>
                  )}
                </p>
              </div>
              <span className="text-brand-purple text-xs font-medium shrink-0 ml-4">
                View details &rarr;
              </span>
            </div>
          </Card>
        </AnimateOnScroll>
      )}

      {/* Empty state */}
      {myCampaigns.length === 0 && (
        <Card className="text-center py-10 bg-brand-surface/30">
          <p className="text-sm text-brand-dim">No campaigns yet. Create your first one above.</p>
          <p className="text-xs text-brand-muted mt-2">It takes less than a minute.</p>
        </Card>
      )}
    </>
  );
}
