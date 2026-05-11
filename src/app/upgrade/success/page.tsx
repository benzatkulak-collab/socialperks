"use client";

/**
 * /upgrade/success — Post-purchase confirmation.
 *
 * Reads `session_id` from the query string and (when not in mock mode)
 * confirms the session with the backend.
 */

import { useEffect, useState } from "react";

interface SessionInfo {
  sessionId: string | null;
  mock: boolean;
  plan: string | null;
  interval: string | null;
}

export default function UpgradeSuccessPage(): JSX.Element {
  const [info, setInfo] = useState<SessionInfo>({
    sessionId: null,
    mock: false,
    plan: null,
    interval: null,
  });
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    setInfo({
      sessionId: params.get("session_id"),
      mock: params.get("mock") === "1",
      plan: params.get("plan"),
      interval: params.get("interval"),
    });
    try {
      window.localStorage.setItem("sp-on-trial", "false");
    } catch {
      /* ignore */
    }
  }, []);

  async function openBillingPortal(): Promise<void> {
    setPortalLoading(true);
    setPortalError(null);
    try {
      const res = await fetch("/api/v1/billing/portal", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data?.data?.url) {
        throw new Error(
          data?.error?.message ?? "Could not open billing portal."
        );
      }
      window.location.href = data.data.url as string;
    } catch (e) {
      setPortalError(e instanceof Error ? e.message : "Unexpected error");
      setPortalLoading(false);
    }
  }

  const steps = [
    {
      title: "Create your first paid campaign",
      detail:
        "Use the AI campaign generator to draft a 30-day perk strategy in seconds.",
      href: "/dashboard?tour=campaign",
    },
    {
      title: "Embed the perk widget on your site",
      detail:
        "Drop a one-line script into your homepage so visitors see live offers.",
      href: "/dashboard?tour=widget",
    },
    {
      title: "Invite your team",
      detail:
        "Add teammates and assign roles — owners, managers, and reviewers.",
      href: "/dashboard?tour=team",
    },
  ];

  return (
    <div className="min-h-screen bg-[#0C0F1A] text-white">
      <div className="max-w-3xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-400/15 border border-emerald-400/40 mb-6">
            <svg
              className="h-8 w-8 text-emerald-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1
            className="text-5xl md:text-6xl italic mb-4"
            style={{ fontFamily: "'Instrument Serif', serif" }}
          >
            Welcome to Pro
          </h1>
          <p className="text-white/60 text-lg">
            Your subscription is active. Receipt has been emailed to you.
          </p>
          {info.mock && (
            <div className="mt-4 inline-block text-xs px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-200">
              Demo mode — no real charge was made
            </div>
          )}
          {info.sessionId && (
            <div
              className="mt-3 text-[11px] text-white/30"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              session_id: {info.sessionId}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 mb-8">
          <h2
            className="text-2xl italic mb-6"
            style={{ fontFamily: "'Instrument Serif', serif" }}
          >
            What to do next
          </h2>
          <ol className="space-y-5">
            {steps.map((step, i) => (
              <li key={step.title} className="flex gap-4">
                <span
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-cyan-400/15 border border-cyan-400/40 text-cyan-300 text-sm font-semibold"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {i + 1}
                </span>
                <div>
                  <a
                    href={step.href}
                    className="font-medium text-white hover:text-cyan-300 transition"
                  >
                    {step.title}
                  </a>
                  <p className="text-sm text-white/50 mt-0.5">{step.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4">
          <a
            href="/dashboard?upgraded=1"
            className="px-6 py-3 rounded-lg bg-cyan-400 text-[#0C0F1A] font-medium hover:bg-cyan-300 transition"
          >
            Go to dashboard
          </a>
          <button
            type="button"
            onClick={openBillingPortal}
            disabled={portalLoading}
            className="px-6 py-3 rounded-lg border border-white/10 bg-white/5 text-white font-medium hover:bg-white/10 transition disabled:opacity-50"
          >
            {portalLoading ? "Opening…" : "Manage subscription"}
          </button>
        </div>
        {portalError && (
          <p className="mt-4 text-center text-sm text-rose-300">
            {portalError}
          </p>
        )}
      </div>
    </div>
  );
}
