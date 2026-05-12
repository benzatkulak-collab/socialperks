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
  onViewCampaignDetail?: (campaignId: string) => void;
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
      : "https://socialperks.app";
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
  onViewCampaignDetail,
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

      {/* Create new campaign button */}
      <button
        onClick={onGoToCreate}
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
                      {onViewCampaignDetail ? (
                        <button
                          type="button"
                          onClick={() => onViewCampaignDetail(campaign.id)}
                          className="text-sm font-semibold text-brand-white truncate hover:text-brand-cyan transition-colors text-left"
                        >
                          {campaign.name}
                        </button>
                      ) : (
                        <p className="text-sm font-semibold text-brand-white truncate">{campaign.name}</p>
                      )}
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
