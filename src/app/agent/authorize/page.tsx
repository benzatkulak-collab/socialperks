import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/shared/nav";
import { Footer } from "@/components/shared/footer";
import { VALID_SCOPES, isAcceptableRedirectUri, isValidScope } from "@/lib/auth/agent-auth";
import { AgentAuthorizeForm } from "@/components/agent/authorize-form";

export const metadata: Metadata = {
  title: "Authorize agent — Social Perks",
  description:
    "Approve a third-party AI agent to act on your Social Perks account with the scopes you choose.",
  robots: { index: false, follow: false },
};

interface PageProps {
  searchParams: Promise<{
    agent_name?: string;
    scope?: string;
    redirect_uri?: string;
    state?: string;
  }>;
}

const SCOPE_DESCRIPTIONS: Record<string, string> = {
  "read.campaigns": "View your active and past campaigns",
  "read.submissions": "View customer submissions and proofs",
  "read.analytics": "View campaign performance metrics",
  "write.campaigns": "Create and launch new campaigns",
  "write.submissions": "Submit proofs on behalf of customers",
  "review.submissions": "Approve or reject submissions",
};

export default async function AuthorizePage({ searchParams }: PageProps) {
  const params = await searchParams;

  // Validate inputs synchronously so we render an error page rather
  // than 500-ing on bad agent input. Each branch returns its own
  // explanation so debugging is easy from the user side.
  const agentName = (params.agent_name ?? "").trim();
  const redirectUri = (params.redirect_uri ?? "").trim();
  const state = (params.state ?? "").trim();
  const rawScope = (params.scope ?? "").trim();

  const errors: string[] = [];
  if (!agentName) errors.push("Missing required parameter: agent_name");
  else if (agentName.length > 100) errors.push("agent_name exceeds 100 characters");
  if (!redirectUri) errors.push("Missing required parameter: redirect_uri");
  else if (!isAcceptableRedirectUri(redirectUri))
    errors.push("redirect_uri must be a valid https URL (http only allowed for localhost)");
  if (!rawScope) errors.push("Missing required parameter: scope");

  const requestedScopes = rawScope
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const invalidScopes = requestedScopes.filter((s) => !isValidScope(s));
  if (rawScope && invalidScopes.length > 0) {
    errors.push(`Invalid scopes: ${invalidScopes.join(", ")}. Valid: ${VALID_SCOPES.join(", ")}`);
  }

  if (errors.length > 0) {
    return (
      <div className="min-h-screen bg-brand-bg text-brand-text flex flex-col">
        <Nav />
        <main className="flex-1 flex items-center justify-center px-4 py-16">
          <div className="max-w-md w-full rounded-2xl border border-brand-red/40 bg-brand-red/5 p-6 sm:p-8">
            <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-brand-red mb-2">
              Invalid request
            </p>
            <h1 className="font-heading text-2xl italic text-brand-white mb-4">
              This agent authorization link is broken
            </h1>
            <p className="text-sm text-brand-dim mb-4">
              The agent that sent you here didn&apos;t construct a valid authorization request.
              You can safely close this page.
            </p>
            <ul className="text-xs text-brand-red space-y-1 mb-6 font-mono">
              {errors.map((e, i) => (
                <li key={i}>• {e}</li>
              ))}
            </ul>
            <Link
              href="/"
              className="text-sm text-brand-cyan hover:underline underline-offset-4"
            >
              ← Back to socialperks.app
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // All validation passed. Render the consent screen.
  return (
    <div className="min-h-screen bg-brand-bg text-brand-text flex flex-col">
      <Nav />
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="max-w-md w-full rounded-2xl border border-brand-border/60 bg-brand-surface/40 p-6 sm:p-8 backdrop-blur-sm">
          <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-brand-cyan mb-2">
            Authorize agent
          </p>
          <h1 className="font-heading text-2xl italic text-brand-white mb-2 sm:text-3xl">
            {agentName}
          </h1>
          <p className="text-sm text-brand-dim mb-6">
            wants to act on your Social Perks account with the following permissions:
          </p>

          <ul className="space-y-2.5 mb-6" role="list">
            {requestedScopes.map((scope) => (
              <li
                key={scope}
                className="flex items-start gap-3 rounded-lg border border-brand-border/40 bg-brand-bg/40 px-4 py-3"
              >
                <span
                  className="mt-1 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-brand-cyan/10 text-[10px] text-brand-cyan"
                  aria-hidden="true"
                >
                  ✓
                </span>
                <div className="min-w-0">
                  <p className="text-sm text-brand-white font-medium">
                    {SCOPE_DESCRIPTIONS[scope] ?? scope}
                  </p>
                  <p className="text-xs text-brand-muted font-mono mt-0.5">{scope}</p>
                </div>
              </li>
            ))}
          </ul>

          <div className="rounded-lg border border-brand-amber/30 bg-brand-amber/5 p-3 mb-6">
            <p className="text-xs text-brand-amber leading-relaxed">
              <strong>What this means:</strong> the agent receives an API key bound to your
              business. You can revoke it any time from your dashboard. The agent never
              sees your password or login session.
            </p>
          </div>

          <p className="text-xs text-brand-muted mb-6">
            After approval you&apos;ll be redirected to{" "}
            <span className="font-mono break-all text-brand-dim">
              {new URL(redirectUri).host}
            </span>
            .
          </p>

          <AgentAuthorizeForm
            agentName={agentName}
            scope={requestedScopes}
            redirectUri={redirectUri}
            state={state}
          />
        </div>
      </main>
      <Footer />
    </div>
  );
}
