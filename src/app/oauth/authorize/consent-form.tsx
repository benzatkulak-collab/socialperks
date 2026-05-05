"use client";

import { useState } from "react";

interface ConsentFormProps {
  appId: string;
  clientId: string;
  redirectUri: string;
  scopes: string[];
  state: string;
}

export function ConsentForm({
  appId,
  clientId,
  redirectUri,
  scopes,
  state,
}: ConsentFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAuthorize() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/oauth/authorize", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appId, clientId, redirectUri, scopes, state }),
      });
      if (res.status === 401) {
        // Not signed in — bounce to dashboard and bring them back.
        const next = encodeURIComponent(window.location.href);
        window.location.href = `/dashboard#login?next=${next}`;
        return;
      }
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
        throw new Error(json.message ?? json.error ?? `HTTP ${res.status}`);
      }
      const json = (await res.json()) as { redirect: string };
      window.location.href = json.redirect;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Authorization failed");
      setSubmitting(false);
    }
  }

  function handleDeny() {
    // Per OAuth spec — bounce back to redirect_uri with error=access_denied.
    const url = new URL(redirectUri);
    url.searchParams.set("error", "access_denied");
    if (state) url.searchParams.set("state", state);
    window.location.href = url.toString();
  }

  return (
    <div className="mt-8 flex flex-col gap-3 sm:flex-row-reverse">
      <button
        type="button"
        disabled={submitting}
        onClick={handleAuthorize}
        className="rounded-xl bg-brand-cyan px-6 py-3 text-sm font-semibold text-brand-bg transition-all hover:bg-brand-cyan/90 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/50"
      >
        {submitting ? "Authorizing…" : "Authorize"}
      </button>
      <button
        type="button"
        disabled={submitting}
        onClick={handleDeny}
        className="rounded-xl border border-brand-border bg-brand-surface/50 px-6 py-3 text-sm font-semibold text-brand-text transition-all hover:bg-brand-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/40"
      >
        Deny
      </button>
      {error && (
        <p className="text-xs text-brand-red sm:self-center sm:flex-1">{error}</p>
      )}
    </div>
  );
}
