"use client";

import { useState, useCallback, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLocalStorage } from "@/lib/hooks/use-store";
import { useToast } from "@/lib/context/app-context";
import { PLATFORMS } from "@/lib/platforms";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

// ─── Types ──────────────────────────────────────────────────────────────────

interface InfluencerSettingsData {
  displayName: string;
  bio: string;
  niches: string[];
  location: string;
}

interface RateCardData {
  post: string;
  story: string;
  review: string;
  video: string;
}

interface NotificationPreferences {
  submissionReceived: boolean;
  campaignMilestone: boolean;
  weeklyDigest: boolean;
}

interface ConnectedPlatform {
  platformId: string;
  handle: string;
  followers: number;
}

export interface InfluencerSettingsProps {
  influencerId: string;
  displayName: string;
  email: string;
  bio: string;
  niches: string[];
  location: string;
  platforms: ConnectedPlatform[];
}

// ─── Constants ──────────────────────────────────────────────────────────────

const ALL_NICHES = [
  "food",
  "fitness",
  "fashion",
  "beauty",
  "wellness",
  "tech",
  "travel",
  "photography",
  "lifestyle",
  "parenting",
  "gaming",
  "music",
  "local",
  "restaurants",
  "outdoor",
  "pets",
  "diy",
  "education",
] as const;

// ─── Toggle Switch ──────────────────────────────────────────────────────────

function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description: string;
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex-1 min-w-0 mr-4">
        <div className="text-sm font-medium text-brand-text">{label}</div>
        <div className="text-xs text-brand-muted mt-0.5">{description}</div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`
          relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent
          transition-colors duration-200 ease-in-out cursor-pointer
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/40 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-bg
          ${checked ? "bg-brand-cyan" : "bg-brand-elevated"}
        `}
      >
        <span
          className={`
            pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm
            transform transition-transform duration-200 ease-in-out
            ${checked ? "translate-x-5" : "translate-x-0"}
          `}
        />
      </button>
    </div>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

export function InfluencerSettings({
  influencerId,
  displayName,
  email: _email,
  bio,
  niches,
  location,
  platforms: connectedPlatforms,
}: InfluencerSettingsProps) {
  const showToast = useToast();

  // ── Profile settings ────────────────────────────────────────────────────
  const { value: savedProfile, setValue: setSavedProfile } = useLocalStorage<InfluencerSettingsData>(
    `sp-inf-settings-${influencerId}`,
    {
      displayName,
      bio,
      niches,
      location,
    }
  );

  const [profile, setProfile] = useState<InfluencerSettingsData>(savedProfile);
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});

  const updateProfile = useCallback(<K extends keyof InfluencerSettingsData>(key: K, value: InfluencerSettingsData[K]) => {
    setProfile(prev => ({ ...prev, [key]: value }));
    setProfileErrors(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const toggleNiche = useCallback((niche: string) => {
    setProfile(prev => {
      const current = prev.niches;
      const next = current.includes(niche)
        ? current.filter(n => n !== niche)
        : [...current, niche];
      return { ...prev, niches: next };
    });
  }, []);

  const validateProfile = useCallback((): boolean => {
    const errors: Record<string, string> = {};
    if (!profile.displayName.trim()) {
      errors.displayName = "Display name is required.";
    }
    if (profile.niches.length === 0) {
      errors.niches = "Select at least one niche.";
    }
    setProfileErrors(errors);
    return Object.keys(errors).length === 0;
  }, [profile]);

  const handleSaveProfile = useCallback(() => {
    if (!validateProfile()) return;
    setSavedProfile(profile);
    showToast("Profile settings saved.", "success", 3000);
  }, [validateProfile, profile, setSavedProfile, showToast]);

  // ── Rate card ───────────────────────────────────────────────────────────
  const { value: savedRateCard, setValue: setSavedRateCard } = useLocalStorage<RateCardData>(
    `sp-inf-rates-${influencerId}`,
    { post: "", story: "", review: "", video: "" }
  );

  const [rateCard, setRateCard] = useState<RateCardData>(savedRateCard);

  const updateRate = useCallback((key: keyof RateCardData, value: string) => {
    // Allow only numbers and empty string
    if (value !== "" && !/^\d+$/.test(value)) return;
    setRateCard(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleSaveRateCard = useCallback(() => {
    setSavedRateCard(rateCard);
    showToast("Rate card saved.", "success", 3000);
  }, [rateCard, setSavedRateCard, showToast]);

  // ── Connected platforms ─────────────────────────────────────────────────
  const [platformList, setPlatformList] = useState<ConnectedPlatform[]>(connectedPlatforms);
  const [disconnectTarget, setDisconnectTarget] = useState<string | null>(null);

  const handleDisconnect = useCallback(() => {
    if (!disconnectTarget) return;
    setPlatformList(prev => prev.filter(p => p.platformId !== disconnectTarget));
    const platformName = PLATFORMS.find(p => p.id === disconnectTarget)?.name ?? disconnectTarget;
    showToast(`${platformName} disconnected.`, "success", 3000);
    setDisconnectTarget(null);
  }, [disconnectTarget, showToast]);

  // ── Notification preferences ────────────────────────────────────────────
  const { value: savedNotifs, setValue: setSavedNotifs } = useLocalStorage<NotificationPreferences>(
    `sp-inf-notifs-${influencerId}`,
    {
      submissionReceived: true,
      campaignMilestone: true,
      weeklyDigest: false,
    }
  );

  const [notifications, setNotifications] = useState<NotificationPreferences>(savedNotifs);

  const updateNotification = useCallback(<K extends keyof NotificationPreferences>(key: K, value: boolean) => {
    setNotifications(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleSaveNotifications = useCallback(() => {
    setSavedNotifs(notifications);
    showToast("Notification preferences saved.", "success", 3000);
  }, [notifications, setSavedNotifs, showToast]);

  // ── Change detection ────────────────────────────────────────────────────
  const hasProfileChanges = useMemo(() => {
    return (
      profile.displayName !== savedProfile.displayName ||
      profile.bio !== savedProfile.bio ||
      profile.location !== savedProfile.location ||
      JSON.stringify(profile.niches.slice().sort()) !== JSON.stringify(savedProfile.niches.slice().sort())
    );
  }, [profile, savedProfile]);

  const hasRateChanges = useMemo(() => {
    return (
      rateCard.post !== savedRateCard.post ||
      rateCard.story !== savedRateCard.story ||
      rateCard.review !== savedRateCard.review ||
      rateCard.video !== savedRateCard.video
    );
  }, [rateCard, savedRateCard]);

  const hasNotifChanges = useMemo(() => {
    return (
      notifications.submissionReceived !== savedNotifs.submissionReceived ||
      notifications.campaignMilestone !== savedNotifs.campaignMilestone ||
      notifications.weeklyDigest !== savedNotifs.weeklyDigest
    );
  }, [notifications, savedNotifs]);

  return (
    <div className="animate-fade-up space-y-6">
      <div>
        <h1 className="font-heading text-2xl italic text-brand-white mb-1 sm:text-3xl">Settings</h1>
        <p className="text-sm text-brand-dim">Manage your profile, rates, and preferences</p>
      </div>

      {/* ── Profile Settings ──────────────────────────────────────────── */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-brand-white">Profile Settings</h2>
          {hasProfileChanges && (
            <span className="text-2xs text-brand-amber font-mono">Unsaved changes</span>
          )}
        </div>

        <div className="space-y-0">
          <Field
            label="Display Name"
            value={profile.displayName}
            onChange={(v) => updateProfile("displayName", v)}
            placeholder="Your creator name"
            required
            error={profileErrors.displayName}
          />

          <Field
            label="Bio"
            value={profile.bio}
            onChange={(v) => updateProfile("bio", v)}
            placeholder="Tell businesses about yourself..."
            multiline
          />

          <Field
            label="Location"
            value={profile.location}
            onChange={(v) => updateProfile("location", v)}
            placeholder="City, State"
          />

          {/* Niches multi-select */}
          <div className="flex flex-col gap-1.5 mb-3">
            <label className="text-xs font-medium text-brand-dim font-body flex items-center gap-1">
              Niches
              <span className="text-brand-red" aria-hidden="true">*</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {ALL_NICHES.map((niche) => {
                const selected = profile.niches.includes(niche);
                return (
                  <button
                    key={niche}
                    type="button"
                    onClick={() => toggleNiche(niche)}
                    className={`
                      px-3 py-1.5 rounded-full text-xs font-medium border transition-all
                      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/40
                      ${selected
                        ? "bg-brand-cyan/10 border-brand-cyan/40 text-brand-cyan"
                        : "bg-brand-elevated border-brand-border text-brand-dim hover:border-brand-border-hover hover:text-brand-text"
                      }
                    `}
                    aria-pressed={selected}
                  >
                    {niche}
                  </button>
                );
              })}
            </div>
            {profileErrors.niches && (
              <span className="text-2xs text-brand-red font-body" role="alert">{profileErrors.niches}</span>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button size="sm" onClick={handleSaveProfile} disabled={!hasProfileChanges}>
            Save Profile
          </Button>
        </div>
      </Card>

      {/* ── Rate Card ─────────────────────────────────────────────────── */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-brand-white">Rate Card</h2>
          {hasRateChanges && (
            <span className="text-2xs text-brand-amber font-mono">Unsaved changes</span>
          )}
        </div>
        <p className="text-xs text-brand-dim mb-4">
          Set your rates for different action types. Businesses will see these when considering you for campaigns.
        </p>

        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Post Rate ($)"
            value={rateCard.post}
            onChange={(v) => updateRate("post", v)}
            placeholder="e.g. 50"
            type="text"
            hint="Feed post or carousel"
          />
          <Field
            label="Story Rate ($)"
            value={rateCard.story}
            onChange={(v) => updateRate("story", v)}
            placeholder="e.g. 25"
            type="text"
            hint="Story or reel mention"
          />
          <Field
            label="Review Rate ($)"
            value={rateCard.review}
            onChange={(v) => updateRate("review", v)}
            placeholder="e.g. 30"
            type="text"
            hint="Written or video review"
          />
          <Field
            label="Video Rate ($)"
            value={rateCard.video}
            onChange={(v) => updateRate("video", v)}
            placeholder="e.g. 100"
            type="text"
            hint="Full video feature"
          />
        </div>

        <div className="flex justify-end pt-2">
          <Button size="sm" onClick={handleSaveRateCard} disabled={!hasRateChanges}>
            Save Rate Card
          </Button>
        </div>
      </Card>

      {/* ── Connected Platforms ────────────────────────────────────────── */}
      <Card>
        <h2 className="text-sm font-semibold text-brand-white mb-4">Connected Platforms</h2>

        {platformList.length === 0 ? (
          <div className="text-center py-6">
            <div className="text-2xl mb-2">&#x1F517;</div>
            <div className="text-sm text-brand-muted">No platforms connected</div>
            <div className="text-xs text-brand-dim mt-1">Connect your social accounts to get discovered by businesses</div>
          </div>
        ) : (
          <div className="space-y-2">
            {platformList.map((cp) => {
              const platformMeta = PLATFORMS.find(p => p.id === cp.platformId);
              return (
                <div
                  key={cp.platformId}
                  className="flex items-center justify-between py-3 px-4 rounded-lg border border-brand-border bg-brand-elevated/50"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-lg">{platformMeta?.icon ?? "🔗"}</span>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-brand-text">{platformMeta?.name ?? cp.platformId}</div>
                      <div className="text-xs text-brand-muted truncate">{cp.handle}</div>
                    </div>
                    <Badge color="cyan" size="sm">{cp.followers.toLocaleString()} followers</Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDisconnectTarget(cp.platformId)}
                    className="text-brand-red hover:text-brand-red hover:bg-brand-red/10"
                  >
                    Disconnect
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* ── Notification Preferences ──────────────────────────────────── */}
      <Card>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-brand-white">Notification Preferences</h2>
          {hasNotifChanges && (
            <span className="text-2xs text-brand-amber font-mono">Unsaved changes</span>
          )}
        </div>

        <div className="divide-y divide-brand-border">
          <Toggle
            checked={notifications.submissionReceived}
            onChange={(v) => updateNotification("submissionReceived", v)}
            label="Submission Updates"
            description="Get notified when your submissions are reviewed"
          />
          <Toggle
            checked={notifications.campaignMilestone}
            onChange={(v) => updateNotification("campaignMilestone", v)}
            label="New Campaigns"
            description="Alerts when new campaigns match your niches"
          />
          <Toggle
            checked={notifications.weeklyDigest}
            onChange={(v) => updateNotification("weeklyDigest", v)}
            label="Weekly Digest"
            description="Weekly summary of your earnings and opportunities"
          />
        </div>

        <div className="flex justify-end pt-4">
          <Button size="sm" onClick={handleSaveNotifications} disabled={!hasNotifChanges}>
            Save Notification Preferences
          </Button>
        </div>
      </Card>

      {/* Disconnect Confirmation Dialog */}
      <ConfirmDialog
        open={!!disconnectTarget}
        title="Disconnect platform?"
        message={`This will remove ${PLATFORMS.find(p => p.id === disconnectTarget)?.name ?? "this platform"} from your connected accounts. You can reconnect it later.`}
        confirmLabel="Disconnect"
        cancelLabel="Keep Connected"
        variant="danger"
        onConfirm={handleDisconnect}
        onCancel={() => setDisconnectTarget(null)}
      />
    </div>
  );
}
