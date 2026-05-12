/**
 * /exchange — Public market opportunities page.
 *
 * Wires the existing /api/v1/exchange/opportunities endpoint to a list view.
 * The API is public (no auth required) so this page works for logged-out
 * visitors too.
 */
"use client";

import { useEffect, useState } from "react";

interface OpportunityResponse {
  topActions?: Array<{
    id: string;
    label: string;
    platformName?: string;
    value?: number;
    effort?: number;
  }>;
  estimatedMonthlyEarnings?: number;
  totalActions?: number;
}

export default function ExchangePage() {
  const [data, setData] = useState<OpportunityResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/v1/exchange/opportunities", {
          credentials: "include",
        });
        if (!res.ok) {
          setError(`Failed to load opportunities (HTTP ${res.status}).`);
          return;
        }
        const json = await res.json().catch(() => null);
        setData(json?.data ?? null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load opportunities.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="min-h-screen bg-brand-bg">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="font-heading text-2xl italic text-brand-white mb-2">
          Exchange
        </h1>
        <p className="text-sm text-brand-dim mb-8">
          Live market opportunities — top-paying marketing actions across all platforms.
        </p>

        {loading && <div className="text-sm text-brand-dim">Loading market data…</div>}

        {error && (
          <div className="rounded-lg border border-brand-red/40 bg-brand-red/10 px-4 py-3 text-sm text-brand-red">
            {error}
          </div>
        )}

        {data && (
          <>
            {typeof data.estimatedMonthlyEarnings === "number" && (
              <div className="rounded-xl border border-brand-cyan/30 bg-brand-cyan/5 p-4 mb-6">
                <p className="text-xs text-brand-dim uppercase tracking-wider font-mono">
                  Est. monthly earnings
                </p>
                <p className="text-2xl font-mono font-bold text-brand-cyan mt-1">
                  ${data.estimatedMonthlyEarnings.toFixed(0)}
                </p>
              </div>
            )}

            {data.topActions && data.topActions.length > 0 && (
              <ul className="space-y-2">
                {data.topActions.slice(0, 20).map((a) => (
                  <li
                    key={a.id}
                    className="rounded-lg border border-brand-border bg-brand-surface p-3 flex items-center justify-between"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-brand-white truncate">
                        {a.label}
                      </p>
                      {a.platformName && (
                        <p className="text-xs text-brand-muted">{a.platformName}</p>
                      )}
                    </div>
                    {typeof a.value === "number" && (
                      <span className="text-sm font-mono text-brand-green ml-3 shrink-0">
                        ${a.value}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}
