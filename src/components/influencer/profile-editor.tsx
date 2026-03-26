"use client";

import { useState, useCallback, useEffect, useRef } from "react";

// ═══════════════ Types ═══════════════

export interface PlatformConnection {
  platformId: string;
  platformName: string;
  platformIcon: string;
  handle: string;
  followers: number;
  verified: boolean;
}

export interface RateCard {
  content: number;
  review: number;
  engage: number;
  share: number;
  referral: number;
}

export interface PortfolioItem {
  id: string;
  url: string;
  title: string;
  platform: string;
}

export interface InfluencerProfile {
  id: string;
  displayName: string;
  email: string;
  avatar: string;
  bio: string;
  location: string;
  niches: string[];
  platforms: PlatformConnection[];
  rateCard: RateCard;
  portfolio: PortfolioItem[];
  totalFollowers: number;
  engagementRate: number;
}

interface ProfileEditorProps {
  influencer: InfluencerProfile;
  onSave: (updated: InfluencerProfile) => void;
}

// ═══════════════ Constants ═══════════════

const ALL_NICHES = [
  "Food", "Fitness", "Beauty", "Lifestyle", "Tech", "Travel",
  "Fashion", "Health", "Gaming", "Music", "Education", "Finance",
  "Parenting", "Pets", "Home", "Automotive", "Sports", "Art",
];

const AVAILABLE_PLATFORMS = [
  { id: "ig", name: "Instagram", icon: "📸" },
  { id: "tt", name: "TikTok", icon: "🎬" },
  { id: "yt", name: "YouTube", icon: "📺" },
  { id: "xw", name: "X", icon: "✍️" },
  { id: "fb", name: "Facebook", icon: "👍" },
  { id: "li", name: "LinkedIn", icon: "💼" },
  { id: "pi", name: "Pinterest", icon: "📌" },
  { id: "th", name: "Threads", icon: "🧵" },
  { id: "sc", name: "Snapchat", icon: "👻" },
  { id: "rd", name: "Reddit", icon: "🤖" },
];

const RATE_LABELS: Record<keyof RateCard, { label: string; description: string }> = {
  content: { label: "Content Creation", description: "Photos, videos, reels, stories" },
  review: { label: "Reviews", description: "Google, Yelp, TripAdvisor reviews" },
  engage: { label: "Engagement", description: "Likes, follows, comments, saves" },
  share: { label: "Sharing", description: "Reposts, DM shares, story shares" },
  referral: { label: "Referrals", description: "Friend referrals, group chats" },
};

// ═══════════════ Component ═══════════════

export default function ProfileEditor({ influencer, onSave }: ProfileEditorProps) {
  const [profile, setProfile] = useState<InfluencerProfile>({ ...influencer });
  const [activeSection, setActiveSection] = useState<"basic" | "platforms" | "niches" | "rates" | "portfolio" | "preview">("basic");
  const [newPlatformId, setNewPlatformId] = useState("");
  const [newHandle, setNewHandle] = useState("");
  const [newPortfolioUrl, setNewPortfolioUrl] = useState("");
  const [newPortfolioTitle, setNewPortfolioTitle] = useState("");
  const [newPortfolioPlatform, setNewPortfolioPlatform] = useState("");
  const [saved, setSaved] = useState(false);
  const [verifyingPlatformId, setVerifyingPlatformId] = useState<string | null>(null);
  const [verifiedPlatformIds, setVerifiedPlatformIds] = useState<Set<string>>(new Set());
  const verifyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (verifyTimerRef.current) clearTimeout(verifyTimerRef.current);
    };
  }, []);

  const handleVerifyPlatform = useCallback((platformId: string) => {
    setVerifyingPlatformId(platformId);
    verifyTimerRef.current = setTimeout(() => {
      setVerifiedPlatformIds((prev) => {
        const next = new Set(prev);
        next.add(platformId);
        return next;
      });
      setVerifyingPlatformId(null);
    }, 2000);
  }, []);

  const updateField = useCallback(<K extends keyof InfluencerProfile>(key: K, value: InfluencerProfile[K]) => {
    setProfile((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }, []);

  const toggleNiche = useCallback((niche: string) => {
    setProfile((prev) => {
      const niches = prev.niches.includes(niche)
        ? prev.niches.filter((n) => n !== niche)
        : [...prev.niches, niche];
      return { ...prev, niches };
    });
    setSaved(false);
  }, []);

  const addPlatform = useCallback(() => {
    if (!newPlatformId || !newHandle) return;
    const plat = AVAILABLE_PLATFORMS.find((p) => p.id === newPlatformId);
    if (!plat) return;
    const connection: PlatformConnection = {
      platformId: plat.id,
      platformName: plat.name,
      platformIcon: plat.icon,
      handle: newHandle,
      followers: 0,
      verified: false,
    };
    setProfile((prev) => ({
      ...prev,
      platforms: [...prev.platforms, connection],
    }));
    setNewPlatformId("");
    setNewHandle("");
    setSaved(false);
  }, [newPlatformId, newHandle]);

  const removePlatform = useCallback((platformId: string) => {
    setProfile((prev) => ({
      ...prev,
      platforms: prev.platforms.filter((p) => p.platformId !== platformId),
    }));
    setSaved(false);
  }, []);

  const updateRate = useCallback((key: keyof RateCard, value: number) => {
    setProfile((prev) => ({
      ...prev,
      rateCard: { ...prev.rateCard, [key]: value },
    }));
    setSaved(false);
  }, []);

  const addPortfolioItem = useCallback(() => {
    if (!newPortfolioUrl || !newPortfolioTitle) return;
    const item: PortfolioItem = {
      id: crypto.randomUUID().replace(/-/g, "").slice(0, 12),
      url: newPortfolioUrl,
      title: newPortfolioTitle,
      platform: newPortfolioPlatform || "Other",
    };
    setProfile((prev) => ({
      ...prev,
      portfolio: [...prev.portfolio, item],
    }));
    setNewPortfolioUrl("");
    setNewPortfolioTitle("");
    setNewPortfolioPlatform("");
    setSaved(false);
  }, [newPortfolioUrl, newPortfolioTitle, newPortfolioPlatform]);

  const removePortfolioItem = useCallback((id: string) => {
    setProfile((prev) => ({
      ...prev,
      portfolio: prev.portfolio.filter((p) => p.id !== id),
    }));
    setSaved(false);
  }, []);

  const handleSave = useCallback(() => {
    onSave(profile);
    setSaved(true);
  }, [profile, onSave]);

  const sections = [
    { id: "basic" as const, label: "Basic Info" },
    { id: "platforms" as const, label: "Platforms" },
    { id: "niches" as const, label: "Niches" },
    { id: "rates" as const, label: "Rate Card" },
    { id: "portfolio" as const, label: "Portfolio" },
    { id: "preview" as const, label: "Preview" },
  ];

  const formatFollowers = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return String(n);
  };

  return (
    <div className="min-h-screen bg-brand-bg font-body">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-heading text-3xl italic text-brand-white">Edit Profile</h1>
            <p className="mt-1 text-sm text-brand-muted">Manage your influencer profile, rates, and portfolio</p>
          </div>
          <div className="flex items-center gap-3">
            {saved && (
              <span className="text-sm font-medium text-brand-green" role="status">
                Saved
              </span>
            )}
            <button
              type="button"
              onClick={handleSave}
              className="rounded-lg bg-brand-cyan px-5 py-2 text-sm font-semibold text-brand-bg transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/50 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-bg"
              aria-label="Save profile changes"
            >
              Save Changes
            </button>
          </div>
        </div>

        {/* Section Navigation */}
        <nav className="mt-6 border-b border-brand-border" aria-label="Profile sections">
          <div className="flex gap-1 overflow-x-auto">
            {sections.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => setActiveSection(section.id)}
                className={`whitespace-nowrap px-4 py-3 text-sm font-medium transition-colors rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/40 ${
                  activeSection === section.id
                    ? "border-b-2 border-brand-cyan text-brand-cyan"
                    : "text-brand-muted hover:text-brand-text"
                }`}
                role="tab"
                aria-selected={activeSection === section.id}
              >
                {section.label}
              </button>
            ))}
          </div>
        </nav>

        {/* Section Content */}
        <div className="mt-6" role="tabpanel">
          {/* Basic Info */}
          {activeSection === "basic" && (
            <div className="space-y-6 rounded-xl border border-brand-border bg-brand-surface p-6">
              <h2 className="font-heading text-xl italic text-brand-white">Basic Information</h2>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="displayName" className="block text-sm font-medium text-brand-text">
                    Display Name
                  </label>
                  <input
                    id="displayName"
                    type="text"
                    value={profile.displayName}
                    onChange={(e) => updateField("displayName", e.target.value)}
                    className="mt-1 w-full rounded-lg border border-brand-border bg-brand-bg px-3 py-2 text-sm text-brand-text placeholder-brand-subtle focus:border-brand-cyan focus:outline-none focus:ring-1 focus:ring-brand-cyan"
                    placeholder="Your display name"
                  />
                </div>
                <div>
                  <label htmlFor="location" className="block text-sm font-medium text-brand-text">
                    Location
                  </label>
                  <input
                    id="location"
                    type="text"
                    value={profile.location}
                    onChange={(e) => updateField("location", e.target.value)}
                    className="mt-1 w-full rounded-lg border border-brand-border bg-brand-bg px-3 py-2 text-sm text-brand-text placeholder-brand-subtle focus:border-brand-cyan focus:outline-none focus:ring-1 focus:ring-brand-cyan"
                    placeholder="City, State"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="bio" className="block text-sm font-medium text-brand-text">
                  Bio
                </label>
                <textarea
                  id="bio"
                  value={profile.bio}
                  onChange={(e) => updateField("bio", e.target.value)}
                  rows={4}
                  maxLength={300}
                  className="mt-1 w-full resize-none rounded-lg border border-brand-border bg-brand-bg px-3 py-2 text-sm text-brand-text placeholder-brand-subtle focus:border-brand-cyan focus:outline-none focus:ring-1 focus:ring-brand-cyan"
                  placeholder="Tell businesses about yourself..."
                />
                <p className="mt-1 text-xs text-brand-muted">{profile.bio.length}/300 characters</p>
              </div>
            </div>
          )}

          {/* Platforms */}
          {activeSection === "platforms" && (
            <div className="space-y-6 rounded-xl border border-brand-border bg-brand-surface p-6">
              <h2 className="font-heading text-xl italic text-brand-white">Platform Connections</h2>

              {/* Connected Platforms */}
              {profile.platforms.length > 0 && (
                <div className="space-y-3">
                  {profile.platforms.map((conn) => (
                    <div
                      key={conn.platformId}
                      className="flex items-center justify-between rounded-lg border border-brand-border bg-brand-bg px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg" aria-hidden="true">{conn.platformIcon}</span>
                        <div>
                          <p className="text-sm font-medium text-brand-text">
                            {conn.platformName}
                          </p>
                          <p className="font-mono text-xs text-brand-muted">@{conn.handle}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-mono text-sm text-brand-cyan">
                            {formatFollowers(conn.followers)}
                          </p>
                          <p className="text-xs text-brand-muted">followers</p>
                        </div>
                        {conn.verified || verifiedPlatformIds.has(conn.platformId) ? (
                          <span className="rounded-full bg-brand-green/10 px-2 py-0.5 text-xs font-medium text-brand-green">
                            Verified
                          </span>
                        ) : verifyingPlatformId === conn.platformId ? (
                          <span className="rounded-full border border-brand-cyan/30 px-2 py-0.5 text-xs font-medium text-brand-cyan">
                            Verifying...
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleVerifyPlatform(conn.platformId)}
                            className="rounded-full border border-brand-amber/30 px-2 py-0.5 text-xs font-medium text-brand-amber transition-colors hover:bg-brand-amber/10"
                          >
                            Verify
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => removePlatform(conn.platformId)}
                          className="text-xs text-brand-muted transition-colors hover:text-brand-red"
                          aria-label={`Remove ${conn.platformName}`}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Platform */}
              <div className="rounded-lg border border-dashed border-brand-border bg-brand-bg/50 p-4">
                <h3 className="text-sm font-medium text-brand-text">Add Platform</h3>
                <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                  <select
                    value={newPlatformId}
                    onChange={(e) => setNewPlatformId(e.target.value)}
                    className="flex-1 rounded-lg border border-brand-border bg-brand-bg px-3 py-2 text-sm text-brand-text focus:border-brand-cyan focus:outline-none focus:ring-1 focus:ring-brand-cyan"
                    aria-label="Select platform"
                  >
                    <option value="">Select platform...</option>
                    {AVAILABLE_PLATFORMS.filter(
                      (p) => !profile.platforms.some((c) => c.platformId === p.id)
                    ).map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.icon} {p.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={newHandle}
                    onChange={(e) => setNewHandle(e.target.value)}
                    className="flex-1 rounded-lg border border-brand-border bg-brand-bg px-3 py-2 text-sm text-brand-text placeholder-brand-subtle focus:border-brand-cyan focus:outline-none focus:ring-1 focus:ring-brand-cyan"
                    placeholder="Your handle (without @)"
                    aria-label="Platform handle"
                  />
                  <button
                    type="button"
                    onClick={addPlatform}
                    disabled={!newPlatformId || !newHandle}
                    className="rounded-lg bg-brand-cyan px-4 py-2 text-sm font-semibold text-brand-bg transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Niches */}
          {activeSection === "niches" && (
            <div className="space-y-6 rounded-xl border border-brand-border bg-brand-surface p-6">
              <div>
                <h2 className="font-heading text-xl italic text-brand-white">Niche Tags</h2>
                <p className="mt-1 text-sm text-brand-muted">
                  Select the niches that best describe your content. This helps match you with relevant campaigns.
                </p>
              </div>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Niche selection">
                {ALL_NICHES.map((niche) => {
                  const isSelected = profile.niches.includes(niche);
                  return (
                    <button
                      key={niche}
                      type="button"
                      onClick={() => toggleNiche(niche)}
                      className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-all ${
                        isSelected
                          ? "border-brand-cyan bg-brand-cyan/10 text-brand-cyan"
                          : "border-brand-border bg-brand-bg text-brand-muted hover:border-brand-subtle hover:text-brand-text"
                      }`}
                      aria-pressed={isSelected}
                    >
                      {niche}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-brand-dim">
                {profile.niches.length} selected &middot; Select at least 2 for better campaign matching
              </p>
            </div>
          )}

          {/* Rate Card */}
          {activeSection === "rates" && (
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
                          value={profile.rateCard[key]}
                          onChange={(e) => updateRate(key, Number(e.target.value))}
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
          )}

          {/* Portfolio */}
          {activeSection === "portfolio" && (
            <div className="space-y-6 rounded-xl border border-brand-border bg-brand-surface p-6">
              <div>
                <h2 className="font-heading text-xl italic text-brand-white">Portfolio</h2>
                <p className="mt-1 text-sm text-brand-muted">
                  Add links to your best content to showcase your work to businesses.
                </p>
              </div>

              {/* Existing Items */}
              {profile.portfolio.length > 0 && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {profile.portfolio.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-lg border border-brand-border bg-brand-bg p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-brand-text">{item.title}</p>
                        <p className="truncate text-xs text-brand-muted">{item.platform} &middot; {item.url}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removePortfolioItem(item.id)}
                        className="ml-2 shrink-0 text-xs text-brand-muted transition-colors hover:text-brand-red"
                        aria-label={`Remove ${item.title}`}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add New */}
              <div className="rounded-lg border border-dashed border-brand-border bg-brand-bg/50 p-4">
                <h3 className="text-sm font-medium text-brand-text">Add Content</h3>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <input
                    type="text"
                    value={newPortfolioTitle}
                    onChange={(e) => setNewPortfolioTitle(e.target.value)}
                    className="rounded-lg border border-brand-border bg-brand-bg px-3 py-2 text-sm text-brand-text placeholder-brand-subtle focus:border-brand-cyan focus:outline-none focus:ring-1 focus:ring-brand-cyan"
                    placeholder="Title"
                    aria-label="Content title"
                  />
                  <input
                    type="url"
                    value={newPortfolioUrl}
                    onChange={(e) => setNewPortfolioUrl(e.target.value)}
                    className="rounded-lg border border-brand-border bg-brand-bg px-3 py-2 text-sm text-brand-text placeholder-brand-subtle focus:border-brand-cyan focus:outline-none focus:ring-1 focus:ring-brand-cyan"
                    placeholder="https://..."
                    aria-label="Content URL"
                  />
                  <div className="flex gap-2">
                    <select
                      value={newPortfolioPlatform}
                      onChange={(e) => setNewPortfolioPlatform(e.target.value)}
                      className="flex-1 rounded-lg border border-brand-border bg-brand-bg px-3 py-2 text-sm text-brand-text focus:border-brand-cyan focus:outline-none focus:ring-1 focus:ring-brand-cyan"
                      aria-label="Content platform"
                    >
                      <option value="">Platform</option>
                      {AVAILABLE_PLATFORMS.map((p) => (
                        <option key={p.id} value={p.name}>{p.name}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={addPortfolioItem}
                      disabled={!newPortfolioUrl || !newPortfolioTitle}
                      className="shrink-0 rounded-lg bg-brand-cyan px-4 py-2 text-sm font-semibold text-brand-bg transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Preview */}
          {activeSection === "preview" && (
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
          )}
        </div>
      </div>
    </div>
  );
}
