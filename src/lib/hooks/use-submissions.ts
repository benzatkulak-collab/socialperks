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
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/v1/submissions?userId=${encodeURIComponent(userId)}`, { signal: controller.signal, credentials: "include" });
      if (!res.ok) throw new Error(`Failed to fetch submissions (${res.status})`);
      const json = await res.json();
      if (controller.signal.aborted) return;
      setSubmissions(json.data?.submissions ?? []);
    } catch (e: unknown) {
      if (e instanceof Error && e.name !== "AbortError") {
        console.error("[useSubmissions] Fetch failed:", e.message);
        setError(e.message);
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refresh();
    return () => { abortRef.current?.abort(); };
  }, [refresh]);

  /** Add a submission optimistically. Returns a rollback function to undo if server rejects. */
  const addOptimistic = useCallback((sub: Submission) => {
    setSubmissions(prev => [sub, ...prev]);
    return () => {
      setSubmissions(prev => prev.filter(s => s.id !== sub.id));
    };
  }, []);

  return { submissions, loading, error, refresh, addOptimistic };
}
