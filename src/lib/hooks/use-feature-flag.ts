"use client";
import { useState, useEffect, useCallback, useRef } from "react";

// ─── In-Memory Cache ────────────────────────────────────────────────────────

let flagCache: Record<string, boolean | unknown> | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60_000; // 1 minute
let inflightPromise: Promise<Record<string, boolean | unknown>> | null = null;

async function fetchFlags(): Promise<Record<string, boolean | unknown>> {
  // Deduplicate concurrent requests
  if (inflightPromise) return inflightPromise;

  const now = Date.now();
  if (flagCache && now - cacheTimestamp < CACHE_TTL) {
    return flagCache;
  }

  inflightPromise = (async () => {
    try {
      const res = await fetch("/api/v1/flags");
      if (!res.ok) return flagCache ?? {};
      const json = await res.json();
      if (json.success) {
        flagCache = json.data;
        cacheTimestamp = Date.now();
        return json.data as Record<string, boolean | unknown>;
      }
      return flagCache ?? {};
    } catch {
      return flagCache ?? {};
    } finally {
      inflightPromise = null;
    }
  })();

  return inflightPromise;
}

// ─── Hooks ──────────────────────────────────────────────────────────────────

/**
 * Check if a feature flag is enabled for the current user.
 * Fetches flags from the API on mount, caches in memory.
 */
export function useFeatureFlag(flagId: string, defaultValue = false): boolean {
  const [value, setValue] = useState<boolean>(() => {
    if (flagCache && flagId in flagCache) {
      return Boolean(flagCache[flagId]);
    }
    return defaultValue;
  });

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    fetchFlags().then((flags) => {
      if (mountedRef.current && flagId in flags) {
        setValue(Boolean(flags[flagId]));
      }
    });
    return () => { mountedRef.current = false; };
  }, [flagId]);

  return value;
}

/**
 * Get the variant value for a multi-variant feature flag.
 * Fetches flags from the API on mount, caches in memory.
 */
export function useFeatureVariant<T = unknown>(flagId: string, defaultValue?: T): T {
  const [value, setValue] = useState<T>(() => {
    if (flagCache && flagId in flagCache) {
      return flagCache[flagId] as T;
    }
    return defaultValue as T;
  });

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    fetchFlags().then((flags) => {
      if (mountedRef.current && flagId in flags) {
        setValue(flags[flagId] as T);
      }
    });
    return () => { mountedRef.current = false; };
  }, [flagId]);

  return value;
}

/**
 * Invalidate the flag cache so the next hook call refetches.
 */
export const invalidateFlagCache: () => void = useCallback.bind(null, () => {
  flagCache = null;
  cacheTimestamp = 0;
}, []);

// Simpler export for non-hook usage
export function clearFlagCache(): void {
  flagCache = null;
  cacheTimestamp = 0;
}
