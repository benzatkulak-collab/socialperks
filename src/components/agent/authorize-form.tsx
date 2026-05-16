"use client";

import { useState, useCallback } from "react";
import { apiFetch } from "@/lib/api/csrf-fetch";

interface Props {
  agentName: string;
  scope: string[];
  redirectUri: string;
  state: string;
}

/**
 * Approve / deny buttons for the agent authorization consent page.
 *
 * On approve: POST to /api/v1/agent-auth/approve with the request
 * params. Server validates the user is signed in, mints a scoped
 * API key bound to the user's business, creates a single-use
 * authorization code, and returns it. We then redirect to the agent's
 * redirect_uri with `?code=...&state=...`.
 *
 * On deny: redirect to redirect_uri with `?error=access_denied&state=...`
 * — same shape as standard OAuth deny.
 *
 * Why client-side: the approve action requires CSRF (this is a
 * mutating call from a browser). A server action would need its own
 * CSRF dance; using the existing apiFetch helper inherits the
 * already-working flow.
 */
export function AgentAuthorizeForm({ agentName, scope, redirectUri, state }: Props) {
  const [loading, setLoading] = useState<"approve" | "deny" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleApprove = useCallback(async () => {
    setLoading("approve");
    setError(null);
    try {
      const res = await apiFetch("/api/v1/agent-auth/approve", {
        method: "POST",
        body: JSON.stringify({ agentName, scope, redirectUri }),
      });

      if (res.status === 401) {
        // Not signed in — bounce to login with a return path back here.
        const current = window.location.href;
        window.location.href = `/dashboard#login?return_to=${encodeURIComponent(current)}`;
        return;
      }

      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.success) {
        setError(body?.error?.message ?? "Couldn't approve the request. Please try again.");
        setLoading(null);
        return;
      }

      const code = body.data?.code as string | undefined;
      if (!code) {
        setError("Authorization succeeded but no code was returned. Please retry.");
        setLoading(null);
        return;
      }

      // Build the redirect URL safely. `redirect_uri` was validated
      // server-side at render time, but we reconstruct via URL here
      // to guarantee correct query-param encoding.
      const target = new URL(redirectUri);
      target.searchParams.set("code", code);
      if (state) target.searchParams.set("state", state);
      window.location.href = target.toString();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error. Please try again.");
      setLoading(null);
    }
  }, [agentName, scope, redirectUri, state]);

  const handleDeny = useCallback(() => {
    setLoading("deny");
    // No API call needed for deny — just redirect with error param.
    // Mirrors the OAuth 2.0 access_denied error response shape so
    // standard OAuth clients handle it correctly.
    try {
      const target = new URL(redirectUri);
      target.searchParams.set("error", "access_denied");
      target.searchParams.set("error_description", "User declined the authorization request");
      if (state) target.searchParams.set("state", state);
      window.location.href = target.toString();
    } catch {
      // If redirectUri somehow became malformed between render and
      // click, fall back to the home page.
      window.location.href = "/";
    }
  }, [redirectUri, state]);

  return (
    <>
      {error && (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-brand-red/40 bg-brand-red/10 px-4 py-3 text-sm text-brand-red"
        >
          {error}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={handleApprove}
          disabled={loading !== null}
          className="flex-1 rounded-xl bg-brand-cyan px-5 py-3 text-sm font-semibold text-brand-bg transition-all hover:bg-brand-cyan/90 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/50"
        >
          {loading === "approve" ? "Authorizing…" : "Approve"}
        </button>
        <button
          type="button"
          onClick={handleDeny}
          disabled={loading !== null}
          className="flex-1 rounded-xl border border-brand-border bg-brand-surface px-5 py-3 text-sm font-semibold text-brand-text transition-all hover:border-brand-subtle hover:bg-brand-elevated disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/30"
        >
          {loading === "deny" ? "Cancelling…" : "Deny"}
        </button>
      </div>
    </>
  );
}
