"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export interface Submission {
  id: string;
  campaignId: string;
  campaignName?: string;
  businessName?: string;
  proofUrl: string;
  proofType: string;
  notes?: string;
  status: "pending" | "approved" | "rejected";
  submittedAt: string;
  perkValue?: number;
}

export function useSubmissions(userId: string) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const abortRef = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);

    try {
      const res = await fetch(`/api/v1/submissions?userId=${encodeURIComponent(userId)}`, { signal: controller.signal });
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      if (controller.signal.aborted) return;
      setSubmissions(json.data?.submissions ?? []);
    } catch (e: unknown) {
      if (e instanceof Error && e.name !== "AbortError") {
        console.warn("[useSubmissions] Fetch failed, keeping existing data:", e.message);
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refresh();
    return () => { abortRef.current?.abort(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const addOptimistic = useCallback((sub: Submission) => {
    setSubmissions(prev => [sub, ...prev]);
  }, []);

  return { submissions, loading, refresh, addOptimistic };
}
