"use client";

import { useState, useCallback } from "react";
import { ProfileBasicInfo } from "./profile-basic-info";
import { ProfilePlatformsEditor } from "./profile-platforms-editor";
import { ProfileRateCardEditor } from "./profile-rate-card-editor";
import { ProfilePortfolioEditor } from "./profile-portfolio-editor";
import { ProfilePreview } from "./profile-preview";

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

// ═══════════════ Component ═══════════════

export default function ProfileEditor({ influencer, onSave }: ProfileEditorProps) {
  const [profile, setProfile] = useState<InfluencerProfile>({ ...influencer });
  const [activeSection, setActiveSection] = useState<"basic" | "platforms" | "niches" | "rates" | "portfolio" | "preview">("basic");
  const [saved, setSaved] = useState(false);

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

  const addPlatform = useCallback((connection: PlatformConnection) => {
    setProfile((prev) => ({
      ...prev,
      platforms: [...prev.platforms, connection],
    }));
    setSaved(false);
  }, []);

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

  const addPortfolioItem = useCallback((item: PortfolioItem) => {
    setProfile((prev) => ({
      ...prev,
      portfolio: [...prev.portfolio, item],
    }));
    setSaved(false);
  }, []);

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
          {activeSection === "basic" && (
            <ProfileBasicInfo profile={profile} onUpdateField={updateField} />
          )}

          {activeSection === "platforms" && (
            <ProfilePlatformsEditor
              platforms={profile.platforms}
              onAddPlatform={addPlatform}
              onRemovePlatform={removePlatform}
            />
          )}

          {/* Niches — small enough to keep inline */}
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

          {activeSection === "rates" && (
            <ProfileRateCardEditor rateCard={profile.rateCard} onUpdateRate={updateRate} />
          )}

          {activeSection === "portfolio" && (
            <ProfilePortfolioEditor
              portfolio={profile.portfolio}
              onAddItem={addPortfolioItem}
              onRemoveItem={removePortfolioItem}
            />
          )}

          {activeSection === "preview" && (
            <ProfilePreview profile={profile} />
          )}
        </div>
      </div>
    </div>
  );
}
