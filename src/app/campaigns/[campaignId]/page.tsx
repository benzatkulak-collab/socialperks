/**
 * /campaigns/[campaignId] — Minimal campaign detail page.
 *
 * The portal's primary edit flow is the CampaignEditModal triggered from
 * the dashboard card. This route gives campaigns a shareable URL and
 * reads the same /api/v1/campaigns endpoint. Anything richer should still
 * live behind the modal.
 */
"use client";

import { use, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api/csrf-fetch";

interface CampaignLifecycle {
  id: string;
  state: string;
  businessId: string;
  budget?: { allocated: number; spent: number; type: string };
  completions?: { current: number; max: number | null };
  expiry?: { launchedAt: string; expiresAt: string };
  name?: string;
}

export default function CampaignDetailPage({
  params,
}: {
  params: Promise<{ campaignId: string }>;
}) {
  const { campaignId } = use(params);
  const [campaign, setCampaign] = useState<CampaignLifecycle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // The list endpoint accepts filtering by state but not by id, so
        // we fetch the caller's campaigns and find ours. Cheap for the
        // typical small-business volume; the dedicated /campaigns/:id
        // route can replace this once it lands.
        const res = await apiFetch(`/api/v1/campaigns?perPage=100`, {
          method: "GET",
        });
        if (!res.ok) {
          if (!cancelled) setError(`Failed to load campaign (HTTP ${res.status}).`);
          return;
        }
        const json = await res.json().catch(() => null);
        const list: CampaignLifecycle[] = json?.data?.campaigns ?? [];
        const found = list.find((c) => c.id === campaignId) ?? null;
        if (!cancelled) {
          if (!found) {
            setError("Campaign not found.");
          } else {
            setCampaign(found);
          }
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load campaign.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [campaignId]);

  return (
    <div className="min-h-screen bg-brand-bg">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <a
          href="/dashboard"
          className="text-xs text-brand-cyan hover:underline mb-4 inline-block"
        >
          &larr; Back to dashboard
        </a>

        {loading && <div className="text-sm text-brand-dim">Loading campaign…</div>}

        {error && (
          <div className="rounded-lg border border-brand-red/40 bg-brand-red/10 px-4 py-3 text-sm text-brand-red">
            {error}
          </div>
        )}

        {campaign && (
          <>
            <h1 className="font-heading text-2xl italic text-brand-white mb-1">
              {campaign.name ?? `Campaign ${campaign.id.slice(-8)}`}
            </h1>
            <p className="text-xs text-brand-muted mb-6 font-mono">{campaign.id}</p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <Stat label="State" value={campaign.state} />
              <Stat
                label="Completions"
                value={String(campaign.completions?.current ?? 0)}
              />
              <Stat
                label="Budget"
                value={`${campaign.budget?.allocated ?? 0}${
                  campaign.budget?.type === "pct" ? "%" : "$"
                }`}
              />
              <Stat
                label="Expires"
                value={
                  campaign.expiry?.expiresAt
                    ? campaign.expiry.expiresAt.slice(0, 10)
                    : "—"
                }
              />
            </div>

            <p className="text-xs text-brand-dim">
              Edits go through the dashboard&apos;s edit modal — open this
              campaign from there to change name, discount, or guidelines.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-brand-border bg-brand-surface p-3">
      <p className="text-3xs text-brand-muted font-mono uppercase tracking-wider">
        {label}
      </p>
      <p className="text-sm font-mono text-brand-white mt-1">{value}</p>
    </div>
  );
}
