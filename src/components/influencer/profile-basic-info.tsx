"use client";

import type { InfluencerProfile } from "./profile-editor";

interface ProfileBasicInfoProps {
  profile: InfluencerProfile;
  onUpdateField: <K extends keyof InfluencerProfile>(key: K, value: InfluencerProfile[K]) => void;
}

export function ProfileBasicInfo({ profile, onUpdateField }: ProfileBasicInfoProps) {
  return (
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
            onChange={(e) => onUpdateField("displayName", e.target.value)}
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
            onChange={(e) => onUpdateField("location", e.target.value)}
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
          onChange={(e) => onUpdateField("bio", e.target.value)}
          rows={4}
          maxLength={300}
          className="mt-1 w-full resize-none rounded-lg border border-brand-border bg-brand-bg px-3 py-2 text-sm text-brand-text placeholder-brand-subtle focus:border-brand-cyan focus:outline-none focus:ring-1 focus:ring-brand-cyan"
          placeholder="Tell businesses about yourself..."
        />
        <p className="mt-1 text-xs text-brand-muted">{profile.bio.length}/300 characters</p>
      </div>
    </div>
  );
}
