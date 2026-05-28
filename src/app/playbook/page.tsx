import type { Metadata } from "next";
import Link from "next/link";
import { PLAYBOOKS } from "@/lib/playbook-data";
import { safeJsonForScript } from "@/lib/security/json-ld";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "https://socialperks.app");

export const metadata: Metadata = {
  title: "Marketing playbooks by platform and industry | Social Perks",
  description:
    "Tested marketing playbooks for specific (platform, industry) pairs. Instagram for coffee shops, TikTok for restaurants, Google for local businesses, and more.",
  alternates: { canonical: `${SITE_URL}/playbook` },
};

export const dynamic = "force-static";

export default function PlaybookIndex() {
  const ld = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Marketing playbooks by platform and industry",
    itemListElement: PLAYBOOKS.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${SITE_URL}/playbook/${p.slug}`,
      name: p.title,
    })),
  };

  // Group by platform.
  const byPlatform = new Map<string, typeof PLAYBOOKS>();
  for (const p of PLAYBOOKS) {
    const list = byPlatform.get(p.platform) ?? [];
    list.push(p);
    byPlatform.set(p.platform, list);
  }

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonForScript(ld) }}
      />
      <div className="mx-auto max-w-3xl px-6 py-16">
        <header className="mb-10">
          <p className="text-sm text-brand-text-dim mb-2">Playbooks</p>
          <h1 className="font-serif text-5xl italic text-brand-white mb-4">
            Marketing playbooks
          </h1>
          <p className="text-lg text-brand-text-dim">
            Tested strategies for specific (platform, industry) pairs.
            Quick-start steps, perk amounts, FTC notes — actionable
            content, not theory.
          </p>
        </header>

        {Array.from(byPlatform.entries()).map(([platform, list]) => (
          <section key={platform} className="mb-10">
            <h2 className="font-serif italic text-2xl text-brand-white mb-4">
              {platform}
            </h2>
            <ul className="space-y-3">
              {list.map((p) => (
                <li key={p.slug}>
                  <Link
                    href={`/playbook/${p.slug}`}
                    className="block rounded-lg border border-brand-border bg-brand-card p-4 hover:border-brand-cyan/40"
                  >
                    <p className="font-medium text-brand-white mb-1">{p.title}</p>
                    <p className="text-sm text-brand-text-dim">{p.description}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
