"use client";

/**
 * Lead-finder dashboard.
 *
 * - Search form (industry, city, state)
 * - Results table with fit-score color coding
 * - Bulk: export CSV, mark all contacted
 * - Filter by status
 * - Stats: total / contacted / replied / converted
 */

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import type { Lead, OutreachStatus } from "@/lib/leads/types";
import { apiFetch } from "@/lib/api/csrf-fetch";
import { OUTREACH_STATUSES } from "@/lib/leads/types";
import { trackLeadSearchUsed } from "@/lib/analytics/plausible";

interface Stats {
  new: number;
  contacted: number;
  replied: number;
  qualified: number;
  converted: number;
  dead: number;
}

const EMPTY_STATS: Stats = {
  new: 0,
  contacted: 0,
  replied: 0,
  qualified: 0,
  converted: 0,
  dead: 0,
};

function scoreColor(score: number): string {
  if (score >= 75) return "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";
  if (score >= 50) return "bg-amber-500/20 text-amber-300 border-amber-500/40";
  return "bg-zinc-500/20 text-zinc-400 border-zinc-500/40";
}

export default function LeadsDashboardPage() {
  const [industry, setIndustry] = useState("coffee");
  const [city, setCity] = useState("Austin");
  const [stateCode, setStateCode] = useState("TX");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [mockMode, setMockMode] = useState<boolean | null>(null);

  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState<Stats>(EMPTY_STATS);
  const [statusFilter, setStatusFilter] = useState<OutreachStatus | "all">(
    "all"
  );

  const loadLeads = useCallback(async () => {
    const qs = new URLSearchParams();
    if (statusFilter !== "all") qs.set("status", statusFilter);
    try {
      const res = await fetch(`/api/v1/leads?${qs.toString()}`);
      const json = await res.json();
      if (json.success && json.data) {
        setLeads(json.data.leads ?? []);
        setStats({ ...EMPTY_STATS, ...(json.data.stats ?? {}) });
      }
    } catch (e) {
      console.error("Failed to load leads:", e);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  async function runSearch() {
    setSearching(true);
    setSearchError(null);
    trackLeadSearchUsed(`${industry} ${city} ${stateCode}`);
    try {
      const res = await apiFetch("/api/v1/leads/search", {
        method: "POST",
        body: JSON.stringify({ industry, city, state: stateCode }),
      });
      const json = await res.json();
      if (!json.success) {
        setSearchError(json.error?.message ?? "Search failed");
      } else {
        setMockMode(Boolean(json.data?.mockMode));
        await loadLeads();
      }
    } catch (e) {
      setSearchError(e instanceof Error ? e.message : "Network error");
    } finally {
      setSearching(false);
    }
  }

  async function markAllContacted() {
    const ids = leads
      .filter((l) => l.outreachStatus === "new")
      .map((l) => l.id);
    for (const id of ids) {
      await fetch(`/api/v1/leads?id=${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "contacted" }),
      });
    }
    await loadLeads();
  }

  const filteredLeads = useMemo(() => {
    if (statusFilter === "all") return leads;
    return leads.filter((l) => l.outreachStatus === statusFilter);
  }, [leads, statusFilter]);

  return (
    <div className="min-h-screen bg-[#0C0F1A] text-zinc-200 p-6">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="font-serif italic text-4xl mb-2">Lead finder</h1>
          <p className="text-zinc-400">
            Find local businesses that fit Social Perks. Public Google data,
            scored by fit, ready for outreach.
          </p>
        </header>

        {/* Stats strip */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-8">
          {(
            [
              ["Total", leads.length, "text-cyan-300"],
              ["New", stats.new, "text-zinc-300"],
              ["Contacted", stats.contacted, "text-amber-300"],
              ["Replied", stats.replied, "text-blue-300"],
              ["Qualified", stats.qualified, "text-violet-300"],
              ["Converted", stats.converted, "text-emerald-300"],
            ] as const
          ).map(([label, value, color]) => (
            <div
              key={label}
              className="border border-zinc-800 bg-zinc-950/60 rounded-lg p-4"
            >
              <div className="text-xs uppercase tracking-wider text-zinc-500">
                {label}
              </div>
              <div className={`font-mono text-2xl ${color}`}>{value}</div>
            </div>
          ))}
        </div>

        {/* Search form */}
        <section className="border border-zinc-800 bg-zinc-950/60 rounded-lg p-5 mb-8">
          <h2 className="text-lg mb-4">Search local businesses</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-zinc-500">Industry</span>
              <input
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                placeholder="coffee, salon, yoga..."
                className="bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-zinc-100"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-zinc-500">City</span>
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Austin"
                className="bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-zinc-100"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-zinc-500">State</span>
              <input
                value={stateCode}
                onChange={(e) => setStateCode(e.target.value)}
                placeholder="TX"
                className="bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-zinc-100"
              />
            </label>
            <div className="flex items-end">
              <button
                onClick={runSearch}
                disabled={searching || !industry || !city}
                className="w-full bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-950 font-semibold rounded px-4 py-2"
              >
                {searching ? "Searching…" : "Find leads"}
              </button>
            </div>
          </div>
          {searchError && (
            <div className="mt-3 text-sm text-rose-400">{searchError}</div>
          )}
          {mockMode && (
            <div className="mt-3 text-xs text-amber-400">
              Using mock data — set <code>GOOGLE_PLACES_API_KEY</code> in{" "}
              <code>.env</code> for real searches.
            </div>
          )}
        </section>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500">Filter:</span>
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as OutreachStatus | "all")
              }
              className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-sm"
            >
              <option value="all">All</option>
              {OUTREACH_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={markAllContacted}
              className="text-sm border border-zinc-700 hover:border-zinc-500 rounded px-3 py-1"
            >
              Mark all new → contacted
            </button>
            <a
              href="/api/v1/leads/export"
              className="text-sm bg-zinc-800 hover:bg-zinc-700 rounded px-3 py-1"
            >
              Export CSV
            </a>
          </div>
        </div>

        {/* Results table */}
        <div className="border border-zinc-800 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900/80 text-zinc-400">
              <tr>
                <th className="text-left px-3 py-2">Business</th>
                <th className="text-left px-3 py-2">City</th>
                <th className="text-left px-3 py-2">Score</th>
                <th className="text-left px-3 py-2">Key insight</th>
                <th className="text-left px-3 py-2">Status</th>
                <th className="text-left px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="text-center text-zinc-500 py-10 italic"
                  >
                    No leads yet — run a search above.
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => (
                  <tr
                    key={lead.id}
                    className="border-t border-zinc-800 hover:bg-zinc-900/40"
                  >
                    <td className="px-3 py-2">
                      <div className="font-medium text-zinc-100">
                        {lead.businessName}
                      </div>
                      <div className="text-xs text-zinc-500">
                        {lead.industry} ·{" "}
                        {lead.googleRating.toFixed(1)}★ ·{" "}
                        {lead.googleReviewCount} reviews
                      </div>
                    </td>
                    <td className="px-3 py-2 text-zinc-400">
                      {lead.city}, {lead.state}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-block px-2 py-0.5 rounded border font-mono text-xs ${scoreColor(
                          lead.fitScore
                        )}`}
                      >
                        {lead.fitScore}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-zinc-400 text-xs max-w-md">
                      {lead.fitReasons[0] ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-xs">{lead.outreachStatus}</td>
                    <td className="px-3 py-2 text-right">
                      <Link
                        href={`/dashboard/leads/${encodeURIComponent(lead.id)}`}
                        className="text-cyan-400 hover:text-cyan-300"
                      >
                        Open →
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
