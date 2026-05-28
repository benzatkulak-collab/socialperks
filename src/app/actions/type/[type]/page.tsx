/**
 * /actions/type/[type] — actions filtered by category (content, review,
 * engage, share, referral). One page per type. Each is a focused SEO
 * surface for queries like "social media review actions" or "content
 * marketing actions list".
 */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PLATFORMS } from "@/lib/platforms";
import type { ActionType } from "@social-perks/shared/types";
import { safeJsonForScript } from "@/lib/security/json-ld";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "https://socialperks.app");

const TYPES: ActionType[] = ["content", "review", "engage", "share", "referral"];

const TYPE_DESCRIPTIONS: Record<ActionType, { name: string; description: string }> = {
  content: {
    name: "Content actions",
    description:
      "Customer-created posts, Reels, videos, photos, and stories that promote a business. Highest-effort and highest-value action category — typically $1.50-$10 per completion.",
  },
  review: {
    name: "Review actions",
    description:
      "Public reviews on platforms like Google, Yelp, and TripAdvisor. Most platforms in this category prohibit incentivized reviews — Social Perks routes review actions through an 'ask for organic feedback' pathway.",
  },
  engage: {
    name: "Engagement actions",
    description:
      "Lightweight engagement signals: likes, follows, comments, saves, check-ins. Lowest effort (0-1) and lowest per-action value ($0.10-$1.50) but valuable in volume.",
  },
  share: {
    name: "Share actions",
    description:
      "Customer redistributes content via DMs, story reshares, retweets, or other share mechanisms. Effort 1-2, value $0.50-$1.50 typically.",
  },
  referral: {
    name: "Referral actions",
    description:
      "Customer brings in another customer via a referral code, invitation, or word-of-mouth. Highest per-action value ($1.50-$10+) because conversion is direct.",
  },
};

export const dynamic = "force-static";
export const dynamicParams = false;
export const revalidate = 86400;

export async function generateStaticParams() {
  return TYPES.map((type) => ({ type }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ type: string }>;
}): Promise<Metadata> {
  const { type } = await params;
  if (!TYPES.includes(type as ActionType)) return { title: "Action type not found" };
  const meta = TYPE_DESCRIPTIONS[type as ActionType];
  return {
    title: `${meta.name} — every option for incentivized marketing | Social Perks`,
    description: meta.description,
    alternates: { canonical: `${SITE_URL}/actions/type/${type}` },
  };
}

export default async function ActionTypePage({
  params,
}: {
  params: Promise<{ type: string }>;
}) {
  const { type } = await params;
  if (!TYPES.includes(type as ActionType)) notFound();
  const t = type as ActionType;
  const meta = TYPE_DESCRIPTIONS[t];

  // Flatten + filter actions of this type, group by platform.
  const matches = PLATFORMS.flatMap((p) =>
    p.actions.filter((a) => a.type === t).map((a) => ({ ...a, platform: p }))
  );

  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Social Perks ${meta.name}`,
    description: meta.description,
    numberOfItems: matches.length,
    itemListElement: matches.map((m, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      url: `${SITE_URL}/actions/${m.id}`,
      name: `${m.platform.name} ${m.label}`,
    })),
  };

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonForScript(itemListLd) }}
      />
      <div className="mx-auto max-w-3xl px-6 py-16">
        <nav className="text-sm text-brand-text-dim mb-8">
          <Link href="/actions" className="hover:text-brand-cyan">Actions</Link>
          <span className="mx-2">/</span>
          <span className="text-brand-text">{meta.name}</span>
        </nav>

        <header className="mb-10">
          <h1 className="font-serif text-5xl italic text-brand-white mb-4">
            {meta.name}
          </h1>
          <p className="text-lg text-brand-text leading-relaxed">
            {meta.description}
          </p>
          <p className="text-sm text-brand-text-dim mt-3">
            {matches.length} actions across {new Set(matches.map((m) => m.platform.id)).size}{" "}
            platforms.
          </p>
        </header>

        <ul className="space-y-2">
          {matches.map((m) => (
            <li key={m.id}>
              <Link
                href={`/actions/${m.id}`}
                className="flex items-center justify-between rounded-lg border border-brand-border bg-brand-card p-4 hover:border-brand-cyan/40 gap-3"
              >
                <div className="min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span aria-hidden className="text-base">{m.platform.icon}</span>
                    <p className="font-medium text-brand-white">
                      {m.platform.name} {m.label}
                    </p>
                  </div>
                  <p className="text-xs text-brand-text-dim mt-0.5">
                    Effort {m.effort}/5 ·{" "}
                    {m.incentivizable ? "Incentivizable" : "Organic only (FTC + platform terms)"}
                  </p>
                </div>
                <span className="font-mono text-brand-cyan shrink-0">
                  ${m.value.toFixed(2)}
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <footer className="mt-16 pt-8 border-t border-brand-border text-sm text-brand-text-dim">
          <p>
            Other types:{" "}
            {TYPES.filter((t2) => t2 !== t).map((t2, i) => (
              <span key={t2}>
                <Link
                  href={`/actions/type/${t2}`}
                  className="text-brand-cyan hover:underline"
                >
                  {TYPE_DESCRIPTIONS[t2].name.toLowerCase()}
                </Link>
                {i < TYPES.length - 2 ? ", " : ""}
              </span>
            ))}
            .
          </p>
        </footer>
      </div>
    </div>
  );
}
