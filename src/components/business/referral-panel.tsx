"use client";

import { useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Stat } from "@/components/ui/stat";
import { AnimateOnScroll } from "@/components/shared/animate-on-scroll";

// ─── Types ──────────────────────────────────────────────────────────────────

interface ReferralItem {
  id: string;
  refereeEmail: string;
  status: "pending" | "signed_up" | "activated" | "credited";
  creditAmount: number;
  createdAt: string;
  convertedAt: string | null;
  creditedAt: string | null;
}

interface ReferralStats {
  totalReferred: number;
  totalConverted: number;
  totalCredits: number;
  pendingCredits: number;
}

export interface ReferralPanelProps {
  referralLink: string;
  referralCode: string;
  stats: ReferralStats;
  referrals: ReferralItem[];
}

// ─── Status badge config ────────────────────────────────────────────────────

const statusConfig: Record<
  ReferralItem["status"],
  { label: string; color: "amber" | "cyan" | "green" | "purple" }
> = {
  pending: { label: "Pending", color: "amber" },
  signed_up: { label: "Signed Up", color: "cyan" },
  activated: { label: "Activated", color: "green" },
  credited: { label: "Credited", color: "purple" },
};

// ─── Component ──────────────────────────────────────────────────────────────

export function ReferralPanel({
  referralLink,
  referralCode,
  stats,
  referrals,
}: ReferralPanelProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select and copy
      const input = document.querySelector<HTMLInputElement>("#referral-link-input");
      if (input) {
        input.select();
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  }, [referralLink]);

  const emailTemplate = `Hey! I've been using Social Perks to turn my customers into marketers — it's been great for getting more reviews and social posts. Use my link to sign up and we both get $10 credit: ${referralLink}`;

  const handleEmailShare = useCallback(() => {
    const subject = encodeURIComponent("Join Social Perks — we both get $10!");
    const body = encodeURIComponent(emailTemplate);
    window.open(`mailto:?subject=${subject}&body=${body}`, "_blank");
  }, [emailTemplate]);

  return (
    <div className="space-y-6">
      {/* Referral Link Section */}
      <Card>
        <h3 className="text-sm font-semibold text-brand-white mb-1">
          Your Referral Link
        </h3>
        <p className="text-xs text-brand-dim mb-4">
          Share this link with other businesses. When they sign up and activate, you both earn $10 credit.
        </p>
        <div className="flex items-stretch gap-2">
          <div className="flex-1 relative">
            <input
              id="referral-link-input"
              type="text"
              value={referralLink}
              readOnly
              className="w-full bg-brand-bg border border-brand-border rounded-lg px-3 py-2 text-xs font-mono text-brand-text select-all focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/40"
            />
          </div>
          <button
            type="button"
            onClick={handleCopyLink}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/40 ${
              copied
                ? "bg-brand-green/20 text-brand-green border border-brand-green/30"
                : "bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/30 hover:bg-brand-cyan/20"
            }`}
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>

        {/* Share buttons */}
        <div className="flex items-center gap-3 mt-4">
          <button
            type="button"
            onClick={handleEmailShare}
            className="text-xs text-brand-cyan hover:text-brand-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/40 rounded-sm"
          >
            Share via Email
          </button>
          <span className="text-brand-muted text-xs">|</span>
          <span className="text-2xs text-brand-dim font-mono">
            Code: {referralCode}
          </span>
        </div>
      </Card>

      {/* Stats */}
      <AnimateOnScroll animation="fade-up" stagger staggerDelay={80} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <Stat value={String(stats.totalReferred)} label="Referred" color="cyan" />
        </Card>
        <Card>
          <Stat value={String(stats.totalConverted)} label="Converted" color="green" />
        </Card>
        <Card>
          <Stat value={`$${stats.totalCredits}`} label="Earned" color="purple" />
        </Card>
        <Card>
          <Stat value={`$${stats.pendingCredits}`} label="Pending" color="amber" />
        </Card>
      </AnimateOnScroll>

      {/* Referral List */}
      {referrals.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-brand-dim mb-3">
            Referral History
          </h3>
          <AnimateOnScroll animation="fade-up" stagger staggerDelay={60} className="space-y-2">
            {referrals.map((ref) => {
              const cfg = statusConfig[ref.status];
              const date = new Date(ref.createdAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              });
              return (
                <Card key={ref.id} padding="sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-brand-text truncate">
                          {ref.refereeEmail}
                        </p>
                        <p className="text-2xs text-brand-muted mt-0.5">{date}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs font-mono text-brand-green">
                        ${ref.creditAmount}
                      </span>
                      <Badge color={cfg.color} size="sm" dot>
                        {cfg.label}
                      </Badge>
                    </div>
                  </div>
                </Card>
              );
            })}
          </AnimateOnScroll>
        </div>
      )}

      {/* Empty state */}
      {referrals.length === 0 && (
        <Card className="text-center py-8 bg-brand-surface/30">
          <p className="text-sm text-brand-dim">No referrals yet.</p>
          <p className="text-xs text-brand-muted mt-1">
            Share your link above to start earning credits.
          </p>
        </Card>
      )}
    </div>
  );
}
