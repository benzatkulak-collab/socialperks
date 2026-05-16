"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * useLivePoll — drop-in auto-refresh helper for admin pages.
 *
 * Returns { isLive, lastTickAt, toggleLive } so callers can render
 * a "Live" indicator and let the admin pause polling (e.g. when
 * inspecting a row they don't want to disappear under them).
 *
 * Polling is paused automatically when the tab loses focus to avoid
 * burning quota for a backgrounded tab.
 */
export function useLivePoll(
  fetcher: () => Promise<void> | void,
  intervalMs: number = 15_000
): {
  isLive: boolean;
  lastTickAt: string | null;
  toggleLive: () => void;
} {
  const [isLive, setIsLive] = useState(true);
  const [lastTickAt, setLastTickAt] = useState<string | null>(null);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const tick = useCallback(async () => {
    await fetcherRef.current();
    setLastTickAt(new Date().toISOString());
  }, []);

  useEffect(() => {
    if (!isLive) return;
    let cancelled = false;

    const id = setInterval(() => {
      if (cancelled) return;
      if (typeof document !== "undefined" && document.hidden) return;
      void tick();
    }, intervalMs);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [isLive, intervalMs, tick]);

  return {
    isLive,
    lastTickAt,
    toggleLive: () => setIsLive((v) => !v),
  };
}
