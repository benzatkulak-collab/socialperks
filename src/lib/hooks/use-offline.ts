"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { SyncStatus } from "@/lib/offline";

/**
 * useOffline — Hook for offline-aware components
 *
 * Tracks network connectivity, pending mutation count, and sync status.
 * Provides a `syncNow` function to trigger manual sync.
 */
export interface UseOfflineResult {
  isOnline: boolean;
  pendingMutations: number;
  syncStatus: SyncStatus;
  syncNow: () => Promise<void>;
}

export function useOffline(): UseOfflineResult {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingMutations, setPendingMutations] = useState(0);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("synced");
  const syncingRef = useRef(false);

  // Track navigator.onLine — only on client
  useEffect(() => {
    if (typeof window === "undefined") return;

    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => {
      setIsOnline(false);
      setSyncStatus("pending");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Poll pending mutation count (lightweight — reads from IndexedDB)
  useEffect(() => {
    if (typeof window === "undefined") return;

    let cancelled = false;

    async function checkPending() {
      try {
        const { getMutationQueue } = await import("@/lib/offline");
        const queue = getMutationQueue();
        const count = await queue.getPending();
        if (!cancelled) {
          setPendingMutations(count);
          if (count > 0 && syncStatus === "synced") {
            setSyncStatus("pending");
          }
        }
      } catch {
        // IndexedDB not available (SSR or incognito)
      }
    }

    checkPending();
    const interval = setInterval(checkPending, 3000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [syncStatus]);

  // Listen for SW messages about mutation drain completion
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "MUTATIONS_DRAINED") {
        setPendingMutations(0);
        setSyncStatus("synced");
      }
    };

    navigator.serviceWorker.addEventListener("message", handleMessage);
    return () => {
      navigator.serviceWorker.removeEventListener("message", handleMessage);
    };
  }, []);

  // Auto-sync when coming back online
  useEffect(() => {
    if (!isOnline || syncStatus !== "pending") return;
    if (typeof window === "undefined") return;

    // Small delay to let network stabilize
    const timeout = setTimeout(() => {
      syncNowInternal();
    }, 1000);

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline, syncStatus]);

  const syncNowInternal = useCallback(async () => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    setSyncStatus("syncing");

    try {
      const { getSyncManager } = await import("@/lib/offline");
      const syncManager = getSyncManager();
      await syncManager.syncAll();
      setSyncStatus("synced");
      setPendingMutations(0);
    } catch {
      setSyncStatus("error");
    } finally {
      syncingRef.current = false;
    }
  }, []);

  const syncNow = useCallback(async () => {
    await syncNowInternal();
  }, [syncNowInternal]);

  return {
    isOnline,
    pendingMutations,
    syncStatus,
    syncNow,
  };
}
