"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface DashboardStats {
  activeCampaigns: number;
  completions: number;
  reviews: number;
  marketingValue: number;
}

export function useBusinessDashboard(businessId: string) {
  const [stats, setStats] = useState<DashboardStats>({ activeCampaigns: 0, completions: 0, reviews: 0, marketingValue: 0 });
  const [loading, setLoading] = useState(true);
  const abortRef = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);

    try {
      const res = await fetch(`/api/v1/campaigns?businessId=${encodeURIComponent(businessId)}`, { signal: controller.signal, credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      if (controller.signal.aborted) return;

      const campaigns = json.data?.campaigns ?? [];
      const active = campaigns.filter((c: { state?: string; status?: string }) => (c.state ?? c.status) === "active");

      setStats({
        activeCampaigns: active.length,
        completions: campaigns.reduce((sum: number, c: { completionCount?: number }) => sum + (c.completionCount ?? 0), 0),
        reviews: campaigns.reduce((sum: number, c: { reviewCount?: number }) => sum + (c.reviewCount ?? 0), 0),
        marketingValue: campaigns.reduce((sum: number, c: { budgetUsed?: number }) => sum + (c.budgetUsed ?? 0), 0),
      });
    } catch (e: unknown) {
      if (e instanceof Error && e.name !== "AbortError") {
        console.warn("[useBusinessDashboard] Stats fetch failed, keeping defaults:", e.message);
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    refresh();
    return () => { abortRef.current?.abort(); };
  }, [refresh]);

  return { stats, loading, refresh };
}
