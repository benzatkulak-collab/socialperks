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

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : null;
}

function parseJwtBusinessId(jwt: string | null): string | null {
  if (!jwt) return null;
  try {
    const payload = JSON.parse(atob(jwt.split(".")[1] ?? ""));
    return (payload?.businessId ?? null) as string | null;
  } catch {
    return null;
  }
}

export default function ProgramsPage() {
  const [programs, setPrograms] = useState<PerkProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const businessId = parseJwtBusinessId(readCookie("sp-access-token"));
    if (!businessId) {
      setError("Sign in to view your perk programs.");
      setLoading(false);
      return;
    }
    (async () => {
      try {
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
