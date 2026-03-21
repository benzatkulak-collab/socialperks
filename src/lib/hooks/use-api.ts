"use client";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";

interface UseApiOptions { method?: string; body?: unknown; enabled?: boolean; ttl?: number; }

interface UseApiResult<T> { data: T | null; loading: boolean; error: string | null; refetch: () => void; }

const MAX_CACHE_ENTRIES = 200;
const cache = new Map<string, { data: unknown; timestamp: number }>();

function cacheSet(key: string, data: unknown) {
  // Evict oldest entry if at capacity (Map iterates in insertion order)
  if (cache.size >= MAX_CACHE_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, { data, timestamp: Date.now() });
}

export function useApi<T>(endpoint: string, options: UseApiOptions = {}): UseApiResult<T> {
  const { method = "GET", body, enabled = true, ttl = 60000 } = options;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Stabilize body by serializing it so object identity changes do not cause re-fetches
  const bodyJson = useMemo(() => (body !== undefined ? JSON.stringify(body) : undefined), [body]);

  const fetchData = useCallback(async () => {
    if (!enabled) return;
    const cacheKey = method + ":" + endpoint + ":" + (bodyJson ?? "");
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < ttl) { setData(cached.data as T); return; }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true); setError(null);
    try {
      const res = await fetch(endpoint, {
        method, signal: controller.signal,
        headers: bodyJson ? { "Content-Type": "application/json" } : undefined,
        body: bodyJson ?? undefined,
      });
      if (!res.ok && !controller.signal.aborted) {
        setError(`Request failed with status ${res.status}`);
        return;
      }
      const json = await res.json();
      if (controller.signal.aborted) return;
      if (json.success) { setData(json.data); cacheSet(cacheKey, json.data); }
      else setError(json.error?.message ?? "Request failed");
    } catch (e: unknown) {
      if (e instanceof Error && e.name !== "AbortError") setError(e.message);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [endpoint, method, bodyJson, enabled, ttl]);

  useEffect(() => { fetchData(); return () => { abortRef.current?.abort(); }; }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}
