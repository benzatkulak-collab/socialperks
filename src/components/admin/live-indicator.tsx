"use client";

import React from "react";

/**
 * LiveIndicator — small badge that shows "Live" with a pulsing dot
 * when polling is active, "Paused" otherwise. Click toggles.
 */
export function LiveIndicator({
  isLive,
  lastTickAt,
  onToggle,
}: {
  isLive: boolean;
  lastTickAt: string | null;
  onToggle: () => void;
}) {
  const rel = formatRel(lastTickAt);
  return (
    <button
      onClick={onToggle}
      className={`flex items-center gap-2 px-2.5 py-1 rounded-md text-2xs font-mono border transition-colors ${
        isLive
          ? "bg-brand-green/10 text-brand-green border-brand-green/40 hover:bg-brand-green/20"
          : "bg-brand-surface/50 text-brand-muted border-brand-border hover:bg-brand-surface"
      }`}
      title={isLive ? `Live — last refresh ${rel}. Click to pause.` : "Paused. Click to resume."}
    >
      {isLive ? (
        <>
          <span className="relative flex w-2 h-2">
            <span className="absolute inline-flex w-full h-full rounded-full bg-brand-green opacity-75 animate-ping" />
            <span className="relative inline-flex w-2 h-2 rounded-full bg-brand-green" />
          </span>
          <span>LIVE · {rel}</span>
        </>
      ) : (
        <>
          <span className="w-2 h-2 rounded-full bg-brand-muted" />
          <span>PAUSED</span>
        </>
      )}
    </button>
  );
}

function formatRel(iso: string | null): string {
  if (!iso) return "—";
  const sec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (sec < 5) return "just now";
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  return `${Math.floor(sec / 3600)}h ago`;
}
