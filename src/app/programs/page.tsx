/**
 * /programs — Perk programs index page.
 *
 * Wires the existing /api/v1/programs endpoint to a minimal list view so
 * users have a real route to land on. Previously the route 404'd even
 * though the API was fully implemented.
 */
"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api/csrf-fetch";

interface PerkProgram {
  id: string;
  businessId: string;
  name: string;
  description?: string;
  status?: string;
  createdAt: string;
}

export default function ProgramsPage() {
  const [programs, setPrograms] = useState<PerkProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        // The previous implementation tried to read sp-access-token from
        // document.cookie to extract businessId from the JWT — but that
        // cookie is HttpOnly, so JS can never see it and the page always
        // showed "Sign in to view…" even when authenticated. Ask the
        // server for the session instead; it has access to the cookie.
        const sessionRes = await apiFetch("/api/v1/auth", {
          method: "POST",
          body: JSON.stringify({ action: "session" }),
        });
        if (sessionRes.status === 401) {
          setError("Sign in to view your perk programs.");
          setLoading(false);
          return;
        }
        if (!sessionRes.ok) {
          setError(`Failed to verify session (HTTP ${sessionRes.status}).`);
          setLoading(false);
          return;
        }
        const sessionJson = await sessionRes.json().catch(() => null);
        const businessId: string | undefined =
          sessionJson?.data?.user?.businessId ?? sessionJson?.data?.businessId;
        if (!businessId) {
          setError("Your account doesn't have a business attached. Contact support.");
          setLoading(false);
          return;
        }

        const res = await apiFetch(
          `/api/v1/programs?businessId=${encodeURIComponent(businessId)}`,
          { method: "GET" }
        );
        if (!res.ok) {
          setError(`Failed to load programs (HTTP ${res.status}).`);
          return;
        }
        const json = await res.json().catch(() => null);
        setPrograms(json?.data?.programs ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load programs.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="min-h-screen bg-brand-bg">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Audit found /programs and /exchange were standalone routes
            with no way back to the dashboard. Single link is enough —
            the full portal nav lives inside the dashboard component
            and re-embedding it here would double-load the bundle. */}
        <a
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs text-brand-dim hover:text-brand-cyan transition-colors mb-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/40 rounded"
        >
          ← Back to dashboard
        </a>
        <h1 className="font-heading text-2xl italic text-brand-white mb-2">
          Perk Programs
        </h1>
        <p className="text-sm text-brand-dim mb-8">
          Loyalty programs you&apos;ve created for your customers.
        </p>

        {loading && (
          <div className="text-sm text-brand-dim">Loading programs…</div>
        )}

        {error && (
          <div className="rounded-lg border border-brand-red/40 bg-brand-red/10 px-4 py-3 text-sm text-brand-red">
            {error}
          </div>
        )}

        {!loading && !error && programs.length === 0 && (
          <div className="rounded-xl border border-brand-border bg-brand-surface/30 p-8 text-center">
            <p className="text-sm text-brand-dim">
              No perk programs yet. Create one from the dashboard to get started.
            </p>
          </div>
        )}

        {programs.length > 0 && (
          <ul className="space-y-3">
            {programs.map((p) => (
              <li
                key={p.id}
                className="rounded-xl border border-brand-border bg-brand-surface p-4"
              >
                <p className="text-sm font-semibold text-brand-white">{p.name}</p>
                {p.description && (
                  <p className="text-xs text-brand-dim mt-1">{p.description}</p>
                )}
                <p className="text-xs text-brand-muted mt-2 font-mono">
                  {p.status ?? "active"} · {p.id}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
