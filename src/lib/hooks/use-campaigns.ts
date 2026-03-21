"use client";
import { useState, useEffect, useMemo, useRef } from "react";
import { API_ENDPOINTS } from "@/lib/shared/constants";
import type { Campaign } from "@/lib/types";

interface Filters { search: string; category: string; tier: string; }

export function useCampaigns(businessType: string, businessSize: string = "small") {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>({ search: "", category: "all", tier: "all" });
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    fetch(API_ENDPOINTS.aiGenerate, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessType, businessSize }),
      signal: controller.signal,
    })
      .then(r => {
        if (!r.ok) throw new Error(`Request failed with status ${r.status}`);
        return r.json();
      })
      .then(json => {
        if (!controller.signal.aborted) {
          setCampaigns(json.data ?? []);
          setLoading(false);
        }
      })
      .catch(e => {
        if (e instanceof Error && e.name !== "AbortError") {
          setError(e.message);
          setLoading(false);
        }
      });

    return () => { controller.abort(); };
  }, [businessType, businessSize]);

  const filtered = useMemo(() => {
    return campaigns.filter(c => {
      if (filters.search) {
        const q = filters.search.toLowerCase();
        if (!c.name.toLowerCase().includes(q) && !c.description.toLowerCase().includes(q)) return false;
      }
      if (filters.category !== "all" && c.category !== filters.category) return false;
      if (filters.tier !== "all" && c.tier !== filters.tier) return false;
      return true;
    });
  }, [campaigns, filters]);

  const categories = useMemo(() => [...new Set(campaigns.map(c => c.category))], [campaigns]);
  const tiers = useMemo(() => [...new Set(campaigns.map(c => c.tier))], [campaigns]);

  return { campaigns, filtered, loading, error, filters, setFilters, categories, tiers };
}
