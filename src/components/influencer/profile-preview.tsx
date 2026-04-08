"use client";

import type { InfluencerProfile, RateCard } from "./profile-editor";

// ═══════════════ Constants ═══════════════

const RATE_LABELS: Record<keyof RateCard, { label: string; description: string }> = {
  content: { label: "Content Creation", description: "Photos, videos, reels, stories" },
  review: { label: "Reviews", description: "Google, Yelp, TripAdvisor reviews" },
  engage: { label: "Engagement", description: "Likes, follows, comments, saves" },
  share: { label: "Sharing", description: "Reposts, DM shares, story shares" },
  referral: { label: "Referrals", description: "Friend referrals, group chats" },
};

// ═══════════════ Component ═══════════════

interface ProfilePreviewProps {
  profile: InfluencerProfile;
}

export function ProfilePreview({ profile }: ProfilePreviewProps) {
  return (
    <div className="space-y-6 rounded-xl border border-brand-border bg-brand-surface p-6">
      <h2 className="font-heading text-xl italic text-brand-white">Profile Preview</h2>
      <p className="text-sm text-brand-muted">This is how businesses see your profile.</p>

      <div className="rounded-xl border border-brand-border bg-brand-bg p-6">
        {/* Preview Header */}
        <div className="flex items-start gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-brand-elevated text-3xl" aria-hidden="true">
            {profile.avatar}
          </div>
          <div className="flex-1">
            <h3 className="font-heading text-xl italic text-brand-white">
              {profile.displayName || "Your Name"}
            </h3>
            <p className="text-sm text-brand-muted">{profile.location || "Location not set"}</p>
            <p className="mt-2 text-sm text-brand-dim">{profile.bio || "No bio yet."}</p>
          </div>
        </div>

        {/* Preview Niches */}
        {profile.niches.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {profile.niches.map((niche) => (
              <span
                key={niche}
                className="rounded-full bg-brand-cyan/10 px-2.5 py-0.5 text-xs font-medium text-brand-cyan"
              >
                {niche}
              </span>
            ))}
          </div>
        )}

        {/* Preview Platforms */}
        {profile.platforms.length > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {profile.platforms.map((p) => (
              <div key={p.platformId} className="rounded-lg bg-brand-elevated px-3 py-2">
                <div className="flex items-center gap-2">
                  <span aria-hidden="true">{p.platformIcon}</span>
                  <span className="text-xs font-medium text-brand-text">{p.platformName}</span>
                </div>
                <p className="mt-0.5 font-mono text-xs text-brand-muted">@{p.handle}</p>
              </div>
            ))}
          </div>
        )}

        {/* Preview Rate Card */}
        <div className="mt-4 border-t border-brand-border pt-4">
          <p className="text-xs font-medium uppercase tracking-wider text-brand-muted">Rates</p>
          <div className="mt-2 flex flex-wrap gap-3">
            {(Object.keys(RATE_LABELS) as Array<keyof RateCard>).map((key) => (
              <div key={key} className="text-center">
                <p className="font-mono text-sm font-semibold text-brand-green">
                  ${profile.rateCard[key]}
                </p>
                <p className="text-xs text-brand-muted">{RATE_LABELS[key].label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
