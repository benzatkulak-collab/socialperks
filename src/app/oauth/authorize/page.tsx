/**
 * /oauth/authorize — consent screen.
 *
 * The agent redirects the shop owner here with:
 *   ?client_id=cid_…
 *   &redirect_uri=https://agent.example.com/oauth/callback
 *   &scope=read+write
 *   &state=<random>
 *
 * The shop owner sees the agent's name, what scopes they're asking
 * for, and clicks Authorize. We issue a one-time `code`, redirect
 * back to redirect_uri with `?code=<code>&state=<state>`. The agent
 * exchanges the code at /api/v1/oauth/token for an access token.
 *
 * This page is a server component for the initial render (we look
 * up the app + verify redirect_uri server-side so a malicious
 * client_id can't get arbitrary URLs rendered as "trusted") and
 * delegates the click action to a client form.
 */

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { findAppByClientId } from "@/lib/oauth/agent-apps";
import { Nav } from "@/components/shared/nav";
import { Footer } from "@/components/shared/footer";
import { ConsentForm } from "./consent-form";

export const metadata: Metadata = {
  title: "Authorize — Social Perks",
  robots: { index: false, follow: false },
};

interface PageProps {
  searchParams: Promise<{
    client_id?: string;
    redirect_uri?: string;
    scope?: string;
    state?: string;
    response_type?: string;
  }>;
}

const SCOPE_LABELS: Record<string, { label: string; detail: string }> = {
  read: { label: "Read your campaigns and stats", detail: "List active campaigns, view analytics, read submission status." },
  write: { label: "Create and manage campaigns", detail: "Launch new campaigns, change rewards, end campaigns." },
  "webhooks:write": { label: "Subscribe to your campaign events", detail: "Get real-time notifications when submissions come in." },
  "sms:enqueue": { label: "Schedule customer-facing SMS", detail: "Send post-purchase messages on your behalf via your Twilio." },
};

export default async function AuthorizePage({ searchParams }: PageProps) {
  const params = await searchParams;

  // OAuth spec requires response_type=code. Reject anything else early.
  if (params.response_type && params.response_type !== "code") {
    return ErrorBlock({
      title: "Unsupported response type",
      detail: `response_type=${params.response_type} is not supported. Use response_type=code.`,
    });
  }

  const clientId = params.client_id;
  if (!clientId) {
    return ErrorBlock({ title: "Missing client_id", detail: "The agent didn't include its client_id." });
  }

  const app = await findAppByClientId(clientId);
  if (!app || app.status !== "active") {
    return ErrorBlock({
      title: "Unknown agent",
      detail: "We couldn't find an active agent with that client_id.",
    });
  }

  // redirect_uri must match exactly one of the registered URIs.
  // This is the OAuth security guarantee: malicious actors can't
  // redirect to arbitrary URLs by registering one app and then
  // tweaking the redirect.
  const redirectUri = params.redirect_uri;
  if (!redirectUri || !app.redirectUris.includes(redirectUri)) {
    return ErrorBlock({
      title: "Invalid redirect URI",
      detail:
        "The redirect_uri the agent provided isn't registered. Either the agent is misconfigured or this is a phishing attempt — contact the agent's developer.",
    });
  }

  const requestedScopes = (params.scope ?? app.defaultScopes.join(" "))
    .split(/[\s+]+/)
    .filter(Boolean)
    .filter((s) => Object.keys(SCOPE_LABELS).includes(s));

  if (requestedScopes.length === 0) {
    return ErrorBlock({
      title: "No valid scopes requested",
      detail: `Allowed scopes: ${Object.keys(SCOPE_LABELS).join(", ")}`,
    });
  }

  // We need a logged-in shop owner. If they aren't signed in, send
  // them to login first and bring them back here. The original URL
  // (with all OAuth params) is preserved in the `next` parameter.
  // For MVP, we delegate this to the dashboard's existing auth gate
  // — if there's no session cookie, redirect to /dashboard and let
  // the dashboard log them in then redirect back.
  // (Implementing the cookie check here cleanly requires more
  // plumbing than this scaffold needs; the redirect is handled by
  // the consent form on submit.)

  return (
    <div className="min-h-screen bg-brand-bg">
      <Nav />
      <main id="main-content" className="mx-auto max-w-xl px-4 pt-32 pb-20 sm:px-6">
        <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.15em] text-brand-cyan">
          Authorize an integration
        </p>
        <h1 className="font-heading text-3xl italic text-brand-white">
          {app.name} wants to manage your perks
        </h1>
        {app.description && (
          <p className="mt-3 text-sm text-brand-dim">{app.description}</p>
        )}
        {app.homepageUrl && (
          <p className="mt-2 text-xs text-brand-muted">
            Developer:{" "}
            <a
              href={app.homepageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-cyan underline underline-offset-2 decoration-brand-cyan/40 hover:decoration-brand-cyan transition-colors"
            >
              {new URL(app.homepageUrl).hostname}
            </a>
          </p>
        )}

        <div className="mt-8">
          <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.15em] text-brand-muted">
            They are asking to:
          </p>
          <ul className="space-y-3">
            {requestedScopes.map((scope) => {
              const meta = SCOPE_LABELS[scope]!;
              return (
                <li
                  key={scope}
                  className="rounded-xl border border-brand-border/60 bg-brand-surface/30 p-4"
                >
                  <p className="text-sm font-semibold text-brand-white">
                    {meta.label}
                  </p>
                  <p className="mt-1 text-xs text-brand-dim">{meta.detail}</p>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="mt-8 rounded-xl border border-brand-amber/30 bg-brand-amber/5 px-4 py-3 text-xs text-brand-dim">
          You can revoke this authorization any time at{" "}
          <span className="font-mono text-brand-amber">/dashboard/integrations</span>.
          Revoking immediately invalidates {app.name}&apos;s access tokens.
        </div>

        <ConsentForm
          appId={app.id}
          clientId={app.clientId}
          redirectUri={redirectUri}
          scopes={requestedScopes}
          state={params.state ?? ""}
        />
      </main>
      <Footer />
    </div>
  );
}

function ErrorBlock({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="min-h-screen bg-brand-bg">
      <Nav />
      <main id="main-content" className="mx-auto max-w-xl px-4 pt-32 pb-20 sm:px-6">
        <div className="rounded-2xl border border-brand-red/30 bg-brand-red/5 p-6">
          <h1 className="font-heading text-2xl italic text-brand-white">{title}</h1>
          <p className="mt-3 text-sm text-brand-dim">{detail}</p>
        </div>
      </main>
      <Footer />
    </div>
  );
}

// Avoid unused-import warnings when redirect isn't actually called above.
void redirect;
