"use client";

import { useState, useEffect, useCallback } from "react";
import { useOffline } from "@/lib/hooks/use-offline";

/**
 * OfflineIndicator — Banner that appears when the user is offline
 *
 * Shows pending mutation count and a "Sync now" button when back online.
 * Auto-dismisses 3 seconds after a successful sync.
 */
export function OfflineIndicator() {
  const { isOnline, pendingMutations, syncStatus, syncNow } = useOffline();
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Show when offline or when there are pending mutations
  useEffect(() => {
    if (!isOnline || pendingMutations > 0 || syncStatus === "syncing") {
      setVisible(true);
      setDismissed(false);
    }
  }, [isOnline, pendingMutations, syncStatus]);

  // Auto-dismiss after successful sync
  useEffect(() => {
    if (syncStatus === "synced" && pendingMutations === 0 && visible && !dismissed) {
      const timeout = setTimeout(() => {
        setVisible(false);
        setDismissed(true);
      }, 3000);
      return () => clearTimeout(timeout);
    }
  }, [syncStatus, pendingMutations, visible, dismissed]);

  const handleSyncNow = useCallback(async () => {
    await syncNow();
  }, [syncNow]);

  const handleDismiss = useCallback(() => {
    setVisible(false);
    setDismissed(true);
  }, []);

  if (!visible) return null;

  const bgColor = !isOnline
    ? "bg-amber-500/10 border-amber-500/30"
    : syncStatus === "error"
      ? "bg-red-500/10 border-red-500/30"
      : syncStatus === "syncing"
        ? "bg-cyan-500/10 border-cyan-500/30"
        : syncStatus === "synced"
          ? "bg-emerald-500/10 border-emerald-500/30"
          : "bg-amber-500/10 border-amber-500/30";

  const textColor = !isOnline
    ? "text-amber-400"
    : syncStatus === "error"
      ? "text-red-400"
      : syncStatus === "syncing"
        ? "text-cyan-400"
        : syncStatus === "synced"
          ? "text-emerald-400"
          : "text-amber-400";

  const icon = !isOnline
    ? "\u26A0" // warning
    : syncStatus === "error"
      ? "\u2717" // x
      : syncStatus === "syncing"
        ? "\u21BB" // sync arrows
        : syncStatus === "synced"
          ? "\u2713" // checkmark
          : "\u26A0";

  const message = !isOnline
    ? "You're offline. Changes will sync when you reconnect."
    : syncStatus === "syncing"
      ? "Syncing your changes..."
      : syncStatus === "error"
        ? "Sync failed. Please try again."
        : syncStatus === "synced" && pendingMutations === 0
          ? "All changes synced successfully."
          : `${pendingMutations} pending change${pendingMutations !== 1 ? "s" : ""} waiting to sync.`;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`
        fixed bottom-4 left-1/2 -translate-x-1/2 z-50
        flex items-center gap-3 px-4 py-2.5
        rounded-lg border backdrop-blur-sm
        shadow-lg shadow-black/20
        font-body text-sm
        transition-all duration-300 ease-out
        ${bgColor}
      `}
    >
      {/* Status icon */}
      <span
        className={`text-base ${textColor} ${syncStatus === "syncing" ? "animate-spin" : ""}`}
        aria-hidden="true"
      >
        {icon}
      </span>

      {/* Message */}
      <span className={textColor}>
        {message}
      </span>

      {/* Pending count badge */}
      {pendingMutations > 0 && syncStatus !== "syncing" && (
        <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-mono font-medium">
          {pendingMutations}
        </span>
      )}

      {/* Sync now button — only when online and not already syncing */}
      {isOnline && pendingMutations > 0 && syncStatus !== "syncing" && syncStatus !== "synced" && (
        <button
          onClick={handleSyncNow}
          className="ml-1 px-3 py-1 rounded-md bg-cyan-500/20 text-cyan-300 text-xs font-medium hover:bg-cyan-500/30 transition-colors cursor-pointer"
        >
          Sync now
        </button>
      )}

      {/* Dismiss button */}
      <button
        onClick={handleDismiss}
        className="ml-1 p-1 rounded text-white/40 hover:text-white/70 transition-colors cursor-pointer"
        aria-label="Dismiss"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M9 3L3 9M3 3L9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
