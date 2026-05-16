import type { Metadata } from "next";
import { AgentActivityClient } from "./client";

export const metadata: Metadata = {
  title: "Agents — Social Perks",
  description:
    "See what AI agents have done on your behalf — campaigns launched, submissions reviewed, perks redeemed.",
  robots: { index: false, follow: false },
};

export default function AgentActivityPage() {
  return (
    <div className="min-h-screen bg-brand-bg text-brand-text">
      <div className="mx-auto max-w-5xl px-6 py-12">
        <header className="mb-10">
          <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-brand-cyan mb-2">
            Agent activity
          </p>
          <h1 className="font-serif text-4xl italic text-brand-white mb-3">
            What your agents have done for you
          </h1>
          <p className="text-brand-text-dim text-lg max-w-2xl">
            Every action an AI agent takes on your account is recorded here.
            Use it to verify what was done, spot anomalies, and prove value.
          </p>
          <p className="mt-3 text-sm text-brand-muted">
            <a
              href="/dashboard/api-keys"
              className="text-brand-cyan hover:underline"
            >
              Manage API keys →
            </a>
          </p>
        </header>

        <AgentActivityClient />
      </div>
    </div>
  );
}
