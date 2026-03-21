"use client";

import { useMemo } from "react";
import {
  findAction,
  ACTION_CATEGORIES,
  FOLLOWER_TIERS,
  TIER_META,
} from "@/lib/platforms";
import type { CampaignTier, DiscountType } from "@/lib/types";

// ─── Types ──────────────────────────────────────────────────────────────────

interface CampaignData {
  id: string;
  name: string;
  description: string;
  actions: readonly string[];
  discountValue: number;
  discountType: DiscountType;
  category: string;
  tier: CampaignTier | string;
  aiReason?: string;
  reason?: string;
}

interface CampaignCardProps {
  campaign: CampaignData;
  expanded: boolean;
  onToggle: () => void;
  onLaunch: (campaign: CampaignData) => void;
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function Badge({
  children,
  color = "#22D3EE",
}: {
  children: React.ReactNode;
  color?: string;
}) {
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-3xs font-semibold tracking-wide uppercase font-mono whitespace-nowrap"
      style={{ color, backgroundColor: color + "14" }}
    >
      {children}
    </span>
  );
}

function Dots({ count, max = 5 }: { count: number; max?: number }) {
  return (
    <span className="inline-flex gap-0.5">
      {Array.from({ length: max }, (_, i) => (
        <span
          key={i}
          className={`w-1.5 h-1.5 rounded-full transition-colors ${
            i < count ? "bg-brand-cyan" : "bg-brand-border"
          }`}
        />
      ))}
    </span>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

export function CampaignCard({
  campaign,
  expanded,
  onToggle,
  onLaunch,
}: CampaignCardProps) {
  const acts = useMemo(
    () => campaign.actions.map(findAction).filter(Boolean),
    [campaign.actions]
  );

  const tierMeta = TIER_META[campaign.tier] || {
    label: campaign.tier,
    color: "#636B8A",
    icon: "•",
  };

  const totalValue = acts.reduce((s, a) => s + (a?.value ?? 0), 0);
  const maxEffort = Math.max(...acts.map((a) => a?.effort ?? 0), 0);
  const reason = campaign.aiReason || campaign.reason || "";

  return (
    <div
      className="bg-brand-surface border border-brand-border rounded-lg p-4 transition-all duration-200 cursor-pointer hover:border-brand-cyan/20 hover:-translate-y-px hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-brand-cyan/40"
      style={{ borderLeftWidth: 3, borderLeftColor: tierMeta.color }}
      onClick={onToggle}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggle(); } }}
      tabIndex={0}
      role="button"
      aria-expanded={expanded}
      aria-label={`Campaign: ${campaign.name}. Click to ${expanded ? "collapse" : "expand"} details.`}
    >
      <div className="flex justify-between items-start gap-3">
        {/* Left: Info */}
        <div className="flex-1 min-w-0">
          <div className="flex gap-1.5 items-center mb-1 flex-wrap">
            <Badge color={tierMeta.color}>
              {tierMeta.icon} {tierMeta.label}
            </Badge>
            <Badge color="#636B8A">{campaign.category}</Badge>
            <span className="text-sm font-bold tracking-tight text-brand-text font-body">
              {campaign.name}
            </span>
          </div>
          <p className="text-xs text-brand-dim leading-relaxed mb-2 font-body">
            {campaign.description}
          </p>
          <div className="flex gap-1 flex-wrap">
            {acts.map(
              (a) =>
                a && (
                  <Badge key={a.id} color={a.platformColor ?? "#636B8A"}>
                    {a.platformIcon} {a.label}
                  </Badge>
                )
            )}
          </div>
        </div>

        {/* Right: Value / Effort */}
        <div className="text-right shrink-0">
          <div className="text-xl font-extrabold text-brand-green font-mono">
            {campaign.discountValue}
            {campaign.discountType === "pct" ? "%" : "$"}
          </div>
          <div className="text-3xs text-brand-muted font-body">base perk</div>
          <div className="text-2xs text-brand-dim mt-1 font-body">
            Value:{" "}
            <strong className="text-brand-amber font-mono">
              ${totalValue.toFixed(0)}
            </strong>
          </div>
          <div className="text-2xs text-brand-dim mt-0.5 font-body">
            Effort: <Dots count={maxEffort} />
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div
          className="mt-4 pt-4 border-t border-brand-border"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Expert Analysis */}
          {reason && (
            <div className="bg-brand-cyan/5 border border-brand-cyan/15 rounded-lg p-3 mb-3">
              <div className="text-3xs font-bold text-brand-cyan font-mono mb-1">
                EXPERT ANALYSIS
              </div>
              <div className="text-xs text-brand-dim leading-relaxed font-body">
                {reason}
              </div>
            </div>
          )}

          {/* Actions Breakdown */}
          <div className="text-3xs font-bold text-brand-muted font-mono mb-2">
            ACTIONS ({acts.length})
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
            {acts.map((a) => {
              if (!a) return null;
              const catMeta = ACTION_CATEGORIES.find((c) => c.id === a.type);
              return (
                <div
                  key={a.id}
                  className="px-3 py-2 rounded-md border"
                  style={{
                    borderColor: (a.platformColor ?? "#636B8A") + "20",
                    backgroundColor: (a.platformColor ?? "#636B8A") + "06",
                  }}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span
                      className="text-2xs font-bold font-body"
                      style={{ color: a.platformColor }}
                    >
                      {a.platformIcon} {a.platformName} — {a.label}
                    </span>
                    <Badge color={catMeta?.color ?? "#636B8A"}>{a.type}</Badge>
                  </div>
                  <div className="flex gap-3 text-3xs text-brand-muted font-body">
                    <span>
                      Value:{" "}
                      <strong className="text-brand-amber font-mono">
                        ${a.value}
                      </strong>
                    </span>
                    <span>
                      Effort: <Dots count={a.effort} />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Follower Tiers */}
          <div className="text-3xs font-bold text-brand-amber font-mono mb-2">
            FOLLOWER BONUS TIERS
          </div>
          <div className="flex gap-2 flex-wrap mb-4">
            {FOLLOWER_TIERS.map((tier) => (
              <div
                key={tier.label}
                className="px-3 py-2 rounded-md border text-center min-w-[85px]"
                style={{
                  borderColor: tier.color + "20",
                  backgroundColor: tier.color + "06",
                }}
              >
                <div
                  className="text-3xs font-bold font-mono"
                  style={{ color: tier.color }}
                >
                  {tier.label}
                </div>
                <div className="text-base font-extrabold text-brand-green mt-0.5 font-mono">
                  {campaign.discountValue + tier.bonus}
                  {campaign.discountType === "pct" ? "%" : "$"}
                </div>
              </div>
            ))}
          </div>

          {/* FTC Note */}
          <div className="text-2xs text-brand-amber bg-brand-amber/5 px-3 py-2 rounded-md mb-4 font-body">
            <strong>FTC Compliance:</strong> Disclosure auto-injected per
            platform. Reviews must state perk received. Social must include #ad.
          </div>

          {/* Launch Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => onLaunch(campaign)}
              className="font-body font-semibold rounded-md border-none cursor-pointer transition-all duration-150 tracking-wide px-3 py-1.5 text-xs bg-brand-green text-white hover:brightness-110"
            >
              Launch Campaign
            </button>
            <button
              onClick={() => onLaunch(campaign)}
              className="font-body font-semibold rounded-md border-none cursor-pointer transition-all duration-150 tracking-wide px-3 py-1.5 text-xs bg-brand-elevated text-brand-text border border-brand-border hover:border-brand-border-hover"
            >
              Customize & Launch
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default CampaignCard;
