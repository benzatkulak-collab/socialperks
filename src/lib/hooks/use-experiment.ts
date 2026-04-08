"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface UseExperimentResult {
  variant: string | null;
  loading: boolean;
  convert: () => void;
}

// In-memory cache so re-renders and remounts don't re-fetch assignments
const variantCache = new Map<string, string>();
const conversionSent = new Set<string>();

/**
 * Client-side hook for A/B testing.
 *
 * Fetches the variant assignment for the current user from the experiments API.
 * Caches the assignment in memory so subsequent renders return instantly.
 * Provides a `convert()` function to record a conversion event.
 *
 * @param experimentId - The experiment to get an assignment for
 * @param userId - The user ID (must be stable across renders)
 */
export function useExperiment(
  experimentId: string,
  userId?: string
): UseExperimentResult {
  const [variant, setVariant] = useState<string | null>(
    () => variantCache.get(experimentId) ?? null
  );
  const [loading, setLoading] = useState(!variantCache.has(experimentId));
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!experimentId || !userId) {
      setLoading(false);
      return;
    }

    // If cached, use it immediately
    const cached = variantCache.get(experimentId);
    if (cached) {
      setVariant(cached);
      setLoading(false);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);

    fetch("/api/v1/experiments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      signal: controller.signal,
      body: JSON.stringify({
        action: "assign",
        experimentId,
        userId,
      }),
    })
      .then((res) => res.json())
      .then((json) => {
        if (controller.signal.aborted) return;
        if (json.success && json.data?.assignment) {
          const variantId = json.data.assignment.variantId as string;
          variantCache.set(experimentId, variantId);
          setVariant(variantId);
        }
      })
      .catch((e: Error) => {
        if (e.name !== "AbortError") {
          // Silently fail — variant stays null
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [experimentId, userId]);

  const convert = useCallback(() => {
    if (!experimentId || !userId) return;

    const key = `${experimentId}:${userId}`;
    if (conversionSent.has(key)) return; // Already sent
    conversionSent.add(key);

    fetch("/api/v1/experiments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        action: "convert",
        experimentId,
        userId,
      }),
    }).catch(() => {
      // Fire-and-forget — remove from sent set so it can retry
      conversionSent.delete(key);
    });
  }, [experimentId, userId]);

  return { variant, loading, convert };
}
