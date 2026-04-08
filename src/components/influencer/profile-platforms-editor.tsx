"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { PlatformConnection } from "./profile-editor";

// ═══════════════ Constants ═══════════════

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

// ═══════════════ Component ═══════════════

interface ProfilePlatformsEditorProps {
  platforms: PlatformConnection[];
  onAddPlatform: (connection: PlatformConnection) => void;
  onRemovePlatform: (platformId: string) => void;
}

export function ProfilePlatformsEditor({ platforms, onAddPlatform, onRemovePlatform }: ProfilePlatformsEditorProps) {
  const [newPlatformId, setNewPlatformId] = useState("");
  const [newHandle, setNewHandle] = useState("");
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

  const handleAddPlatform = useCallback(() => {
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
    onAddPlatform(connection);
    setNewPlatformId("");
    setNewHandle("");
  }, [newPlatformId, newHandle, onAddPlatform]);

  const formatFollowers = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return String(n);
  };

  return (
    <div className="space-y-6 rounded-xl border border-brand-border bg-brand-surface p-6">
      <h2 className="font-heading text-xl italic text-brand-white">Platform Connections</h2>

      {/* Connected Platforms */}
      {platforms.length > 0 && (
        <div className="space-y-3">
          {platforms.map((conn) => (
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
                  onClick={() => onRemovePlatform(conn.platformId)}
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
              (p) => !platforms.some((c) => c.platformId === p.id)
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
            onClick={handleAddPlatform}
            disabled={!newPlatformId || !newHandle}
            className="rounded-lg bg-brand-cyan px-4 py-2 text-sm font-semibold text-brand-bg transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
