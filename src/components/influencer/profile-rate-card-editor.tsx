"use client";

import type { RateCard } from "./profile-editor";

// ═══════════════ Constants ═══════════════

const RATE_LABELS: Record<keyof RateCard, { label: string; description: string }> = {
  content: { label: "Content Creation", description: "Photos, videos, reels, stories" },
  review: { label: "Reviews", description: "Google, Yelp, TripAdvisor reviews" },
  engage: { label: "Engagement", description: "Likes, follows, comments, saves" },
  share: { label: "Sharing", description: "Reposts, DM shares, story shares" },
  referral: { label: "Referrals", description: "Friend referrals, group chats" },
};

// ═══════════════ Component ═══════════════

interface ProfileRateCardEditorProps {
  rateCard: RateCard;
  onUpdateRate: (key: keyof RateCard, value: number) => void;
}

export function ProfileRateCardEditor({ rateCard, onUpdateRate }: ProfileRateCardEditorProps) {
  return (
    <div className="space-y-6 rounded-xl border border-brand-border bg-brand-surface p-6">
      <div>
        <h2 className="font-heading text-xl italic text-brand-white">Rate Card</h2>
        <p className="mt-1 text-sm text-brand-muted">
          Set your base rates per action type. Businesses see these when considering you for campaigns.
        </p>
      </div>
      <div className="space-y-4">
        {(Object.keys(RATE_LABELS) as Array<keyof RateCard>).map((key) => {
          const { label, description } = RATE_LABELS[key];
          return (
            <div
              key={key}
              className="flex flex-col gap-3 rounded-lg border border-brand-border bg-brand-bg p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-sm font-medium text-brand-text">{label}</p>
                <p className="text-xs text-brand-muted">{description}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-brand-muted">$</span>
                <input
                  type="number"
                  value={rateCard[key]}
                  onChange={(e) => onUpdateRate(key, Number(e.target.value))}
                  min={0}
                  step={5}
                  className="w-24 rounded-lg border border-brand-border bg-brand-elevated px-3 py-1.5 text-right font-mono text-sm text-brand-green focus:border-brand-cyan focus:outline-none focus:ring-1 focus:ring-brand-cyan"
                  aria-label={`Rate for ${label}`}
                />
                <span className="text-xs text-brand-muted">per action</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
