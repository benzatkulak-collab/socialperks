/**
 * Single platform detail page — /platforms/[platformId]
 *
 * One static page per supported social platform. Lists the platform's
 * actions with values, links to each action's detail page, includes
 * Schema.org SoftwareApplication / Service markup, and shows
 * platform-specific compliance notes (e.g. review platforms).
 */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PLATFORMS } from "@/lib/platforms";
import { safeJsonForScript } from "@/lib/security/json-ld";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "https://socialperks.io");

export const dynamic = "force-static";
export const dynamicParams = false;
export const revalidate = 86400;

export async function generateStaticParams() {
  return PLATFORMS.map((p) => ({ platformId: p.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ platformId: string }>;
}): Promise<Metadata> {
  const { platformId } = await params;
  const platform = PLATFORMS.find((p) => p.id === platformId);
  if (!platform) return { title: "Platform not found — Social Perks" };
  const totalValue = platform.actions.reduce((s, a) => s + a.value, 0);
  const title = `${platform.name} marketing actions — ${platform.actions.length} actions, $${totalValue.toFixed(0)} combined value | Social Perks`;
  const description = `All ${platform.actions.length} ${platform.name} marketing actions Social Perks supports, with market-rate pricing. From low-effort engagement to high-value content. Free to browse.`;
  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/platforms/${platformId}` },
    openGraph: {
      title: `${platform.name} marketing actions on Social Perks`,
      description,
      url: `${SITE_URL}/platforms/${platformId}`,
      images: [
        {
          url: `${SITE_URL}/api/og/platform?id=${platformId}`,
          width: 1200,
          height: 630,
          alt: `${platform.name} marketing actions — Social Perks`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${SITE_URL}/api/og/platform?id=${platformId}`],
    },
  };
}

const TYPE_COLORS: Record<string, string> = {
  content: "bg-brand-cyan/10 text-brand-cyan border-brand-cyan/20",
  review: "bg-amber-500/10 text-amber-300 border-amber-500/20",
  engage: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
  share: "bg-purple-500/10 text-purple-300 border-purple-500/20",
  referral: "bg-pink-500/10 text-pink-300 border-pink-500/20",
};

export default async function PlatformDetail({
  params,
}: {
  params: Promise<{ platformId: string }>;
}) {
  const { platformId } = await params;
  const platform = PLATFORMS.find((p) => p.id === platformId);
  if (!platform) notFound();

  const totalValue = platform.actions.reduce((s, a) => s + a.value, 0);
  const reviewActions = platform.actions.filter((a) => a.type === "review");
  const hasNonIncentivizable = platform.actions.some((a) => !a.incentivizable);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `${platform.name} marketing actions`,
    description: `All ${platform.actions.length} ${platform.name} marketing actions on Social Perks with pricing.`,
    url: `${SITE_URL}/platforms/${platformId}`,
    isPartOf: {
      "@type": "WebSite",
      name: "Social Perks",
      url: SITE_URL,
    },
    about: {
      "@type": "Organization",
      name: platform.name,
    },
  };

  const breadcrumbsLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Platforms", item: `${SITE_URL}/platforms` },
      { "@type": "ListItem", position: 2, name: platform.name, item: `${SITE_URL}/platforms/${platformId}` },
    ],
  };

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonForScript(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonForScript(breadcrumbsLd) }}
      />

      <div className="mx-auto max-w-3xl px-6 py-16">
        <nav className="text-sm text-brand-text-dim mb-8">
          <Link href="/platforms" className="hover:text-brand-cyan">
            Platforms
          </Link>
          <span className="mx-2">/</span>
          <span className="text-brand-text">{platform.name}</span>
        </nav>

        <header className="mb-10">
          <div className="flex items-baseline gap-3 mb-3">
            <span className="text-5xl">{platform.icon}</span>
          </div>
          <h1 className="font-serif text-5xl italic text-brand-white mb-4">
            {platform.name}
          </h1>
          <p className="text-lg text-brand-text-dim">
            {platform.actions.length} marketing actions, ${totalValue.toFixed(2)}{" "}
            combined value per cycle.
          </p>
        </header>

        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
          <Stat label="Actions" value={String(platform.actions.length)} />
          <Stat label="Combined value" value={`$${totalValue.toFixed(0)}`} />
          <Stat
            label="Highest-value"
            value={`$${Math.max(...platform.actions.map((a) => a.value)).toFixed(2)}`}
          />
          <Stat
            label="Lowest-effort"
            value={`${Math.min(...platform.actions.map((a) => a.effort))}/5`}
          />
        </section>

        {/* Compliance notes for review platforms */}
        {reviewActions.length > 0 && hasNonIncentivizable && (
          <section className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5 mb-10">
            <p className="text-sm font-medium text-amber-200 mb-2">
              {platform.name} review compliance
            </p>
            <p className="text-sm text-amber-200/80">
              {platform.name} prohibits incentivized reviews. Social Perks
              routes review actions through an &quot;ask for organic
              feedback&quot; pathway — businesses can request a review,
              but cannot tie a perk to whether one was left. The
              non-review actions on {platform.name} (likes, follows, etc.)
              can be incentivized normally.
            </p>
          </section>
        )}

        {/* Action list */}
        <section className="mb-10">
          <h2 className="font-serif italic text-2xl text-brand-white mb-4">
            All actions
          </h2>
          <ul className="space-y-2">
            {platform.actions.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/actions/${a.id}`}
                  className="flex items-center justify-between rounded-lg border border-brand-border bg-brand-card p-4 hover:border-brand-cyan/40 gap-3"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-brand-white">{a.label}</p>
                    <div className="flex flex-wrap gap-1.5 mt-1.5 text-xs">
                      <span
                        className={`px-1.5 py-0.5 rounded border ${TYPE_COLORS[a.type] ?? "border-brand-border"}`}
                      >
                        {a.type}
                      </span>
                      <span className="px-1.5 py-0.5 rounded border border-brand-border text-brand-text-dim">
                        Effort {a.effort}/5
                      </span>
                      {!a.incentivizable && (
                        <span className="px-1.5 py-0.5 rounded border border-amber-500/30 text-amber-300">
                          Organic only
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="font-mono text-brand-cyan shrink-0">
                    ${a.value.toFixed(2)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* Programmatic */}
        <section className="rounded-xl border border-brand-cyan/20 bg-brand-cyan/5 p-5 mb-10">
          <p className="text-sm font-medium text-brand-white mb-3">
            Programmatic access
          </p>
          <code className="block px-3 py-2 bg-black/40 rounded border border-brand-border font-mono text-xs">
            GET /api/v1/actions?platformId={platform.id}
          </code>
        </section>

        <section className="text-center">
          <Link
            href={`/dashboard?intent=campaign&platformId=${platform.id}`}
            className="inline-block px-6 py-3 bg-brand-cyan text-brand-bg font-medium rounded-lg hover:bg-brand-cyan/90"
          >
            Launch a campaign on {platform.name}
          </Link>
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-brand-border bg-brand-card p-4">
      <p className="text-xs text-brand-text-dim mb-1">{label}</p>
      <p className="font-mono text-brand-white">{value}</p>
    </div>
  );
}
