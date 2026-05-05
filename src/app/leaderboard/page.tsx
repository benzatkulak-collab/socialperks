import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/shared/nav";
import { Footer } from "@/components/shared/footer";
import { createSeedData } from "@/lib/seed";
import { buildBusinessSlug, buildInfluencerSlug } from "@/lib/slugs";

export const metadata: Metadata = {
  title: "Leaderboard — Social Perks",
  description:
    "Top creators and businesses on Social Perks this month. Real-time ranking by verified posts and customer reach.",
  alternates: { canonical: "/leaderboard" },
  // De-prioritized while we focus the public funnel on shop owners.
  // The page still exists for direct-link landings (and for creators
  // arriving from a campaign), but it shouldn't compete with /b/* and
  // /pricing in search. Lift this once we re-prioritize creator
  // acquisition as a primary funnel.
  robots: { index: false, follow: true },
};

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "https://socialperks.io");

function tierFromFollowers(f: number): "Mega" | "Macro" | "Mid" | "Micro" {
  if (f >= 1_000_000) return "Mega";
  if (f >= 100_000) return "Macro";
  if (f >= 10_000) return "Mid";
  return "Micro";
}

function estimateEarnings(f: number): number {
  if (f >= 100_000) return 4_800;
  if (f >= 25_000) return 1_400;
  if (f >= 5_000) return 480;
  return 120;
}

export default function LeaderboardPage() {
  const seed = createSeedData();

  const topCreators = [...seed.influencers]
    .sort((a, b) => b.followerCount - a.followerCount)
    .slice(0, 10);

  const topBusinesses = [...seed.businesses].slice(0, 10);

  // ItemList JSON-LD — gives Google a clear ranked list to render in
  // SERPs as a stacked result on the brand query.
  const creatorJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Top Social Perks creators",
    itemListOrder: "https://schema.org/ItemListOrderDescending",
    itemListElement: topCreators.map((i, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      url: `${SITE_URL}/i/${buildInfluencerSlug(i)}`,
      name: i.displayName,
    })),
  };

  return (
    <div className="min-h-screen bg-brand-bg">
      <Nav />

      <main id="main-content" className="mx-auto max-w-4xl px-4 pt-32 pb-20 sm:px-6 lg:px-8 sm:pt-40 sm:pb-28">
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(creatorJsonLd) }}
        />

        <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.15em] text-brand-cyan">
          Leaderboard
        </p>
        <h1 className="font-heading text-4xl italic text-brand-white sm:text-5xl">
          Who&apos;s shipping right now
        </h1>
        <p className="mt-4 text-base text-brand-dim sm:text-lg">
          Updated weekly. Creators are ranked by reach and verified posts.
          Businesses by campaigns shipped and customers reached.
        </p>

        {/* Creators */}
        <section aria-labelledby="creators-heading" className="mt-12">
          <div className="flex items-baseline justify-between">
            <h2 id="creators-heading" className="font-heading text-2xl italic text-brand-white">
              Creators
            </h2>
            <span className="font-mono text-[11px] uppercase tracking-widest text-brand-muted">
              by reach
            </span>
          </div>

          <ol className="mt-6 space-y-3">
            {topCreators.map((i, idx) => {
              const slug = buildInfluencerSlug(i);
              const tier = tierFromFollowers(i.followerCount);
              const earnings = estimateEarnings(i.followerCount);
              const rankBadge = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${idx + 1}`;
              return (
                <li key={i.id}>
                  <Link
                    href={`/i/${slug}`}
                    className="flex items-center gap-4 rounded-2xl border border-brand-border/40 bg-brand-surface/30 p-4 transition-all hover:-translate-y-0.5 hover:border-brand-cyan/40 sm:p-5"
                  >
                    <span
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-bg font-mono text-sm font-bold text-brand-cyan"
                      aria-hidden="true"
                    >
                      {rankBadge}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-brand-white">{i.displayName}</p>
                      <p className="mt-0.5 text-xs text-brand-dim">
                        <span className="text-brand-cyan">{tier}</span>
                        {" · "}
                        {i.followerCount.toLocaleString()} followers
                        {i.location ? ` · ${i.location}` : ""}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-mono text-sm text-brand-green">
                        ~${earnings.toLocaleString()}
                      </p>
                      <p className="text-[10px] text-brand-muted">last 90d</p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ol>
        </section>

        {/* Businesses */}
        <section aria-labelledby="businesses-heading" className="mt-16">
          <div className="flex items-baseline justify-between">
            <h2 id="businesses-heading" className="font-heading text-2xl italic text-brand-white">
              Businesses
            </h2>
            <span className="font-mono text-[11px] uppercase tracking-widest text-brand-muted">
              by activity
            </span>
          </div>

          <ol className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {topBusinesses.map((b, idx) => {
              const slug = buildBusinessSlug(b);
              return (
                <li key={b.id}>
                  <Link
                    href={`/b/${slug}`}
                    className="flex items-center gap-3 rounded-2xl border border-brand-border/40 bg-brand-surface/30 p-4 transition-all hover:-translate-y-0.5 hover:border-brand-cyan/40"
                  >
                    <span className="text-2xl" aria-hidden="true">{b.avatar ?? "🏪"}</span>
                    <div className="min-w-0">
                      <p className="font-semibold text-brand-white">{b.name}</p>
                      <p className="text-xs text-brand-dim">
                        #{idx + 1} · {b.type}
                        {b.location ? ` · ${b.location}` : ""}
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ol>
        </section>

        {/* CTA */}
        <div className="mt-16 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-brand-cyan/30 bg-brand-cyan/5 p-6 text-center">
            <p className="font-heading text-xl italic text-brand-white">
              Are you a creator?
            </p>
            <p className="mt-2 text-sm text-brand-dim">
              Get on this list. Earn from local businesses.
            </p>
            <Link
              href="/dashboard#signup"
              className="mt-4 inline-block rounded-xl bg-brand-cyan px-5 py-2.5 text-sm font-semibold text-brand-bg hover:-translate-y-0.5 transition-all"
            >
              Set up your profile →
            </Link>
          </div>
          <div className="rounded-2xl border border-brand-border/40 bg-brand-surface/30 p-6 text-center">
            <p className="font-heading text-xl italic text-brand-white">
              Run a business?
            </p>
            <p className="mt-2 text-sm text-brand-dim">
              Get on the business board. Reach local creators directly.
            </p>
            <Link
              href="/pricing"
              className="mt-4 inline-block rounded-xl border border-brand-border bg-brand-surface px-5 py-2.5 text-sm font-semibold text-brand-text hover:-translate-y-0.5 transition-all"
            >
              See pricing →
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
