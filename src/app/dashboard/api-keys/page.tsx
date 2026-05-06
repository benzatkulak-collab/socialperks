import type { Metadata } from "next";
import { ApiKeysClient } from "./client";

export const metadata: Metadata = {
  title: "API Keys — Social Perks",
  description:
    "Mint and manage API keys for AI agents that operate on your Social Perks account.",
  robots: { index: false, follow: false },
};

export default function ApiKeysPage() {
  return (
    <div className="min-h-screen bg-brand-bg text-brand-text">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <header className="mb-10">
          <h1 className="font-serif text-4xl italic text-brand-white mb-3">
            API Keys
          </h1>
          <p className="text-brand-text-dim text-lg">
            Mint keys for AI agents that need to call Social Perks on
            behalf of your business.{" "}
            <a
              href="/AGENTS.md"
              target="_blank"
              rel="noreferrer"
              className="text-brand-cyan hover:underline"
            >
              Agent docs →
            </a>
          </p>
        </header>
        <ApiKeysClient />
      </div>
    </div>
  );
}
