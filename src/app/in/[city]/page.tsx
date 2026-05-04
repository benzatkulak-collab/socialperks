import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Nav } from "@/components/shared/nav";
import { Footer } from "@/components/shared/footer";
import { WaitlistForm } from "@/components/landing/waitlist-form";
import {
  listCities,
  findCity,
  businessesInCity,
  influencersInCity,
} from "@/lib/cities";
import { buildBusinessSlug, buildInfluencerSlug } from "@/lib/slugs";

interface PageProps {
  params: Promise<{ city: string }>;
}

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "https://socialperks.io");

export function generateStaticParams() {
  return listCities().map((c) => ({ city: c.slug }));
}

function cityLabel(c: { name: string; state: string | null }): string {
  return c.state ? `${c.name}, ${c.state}` : c.name;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { city } = await params;
  const c = findCity(city);
  if (!c) return {};
  const label = cityLabel(c);
  const title = `Social Perks in ${label} — local creators + coffee shops`;
  const description = `Independent businesses in ${label} use Social Perks to turn customers into marketing. Browse local campaigns and creators.`;
  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/in/${c.slug}` },
    openGraph: {
      title,
      description,
      type: "website",
      url: `${SITE_URL}/in/${c.slug}`,
      siteName: "Social Perks",
    },
  };
}

export default async function CityPage({ params }: PageProps) {
  const { city } = await params;
  const c = findCity(city);
  if (!c) notFound();

  const businesses = businessesInCity(c.slug);
  const influencers = influencersInCity(c.slug);
  const label = cityLabel(c);

  // Place + ItemList JSON-LD: signals to Google "this is a local hub
  // page", which is exactly what we want for local-pack / "near me" SERPs.
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Place",
        name: label,
        address: { "@type": "PostalAddress", addressLocality: c.name, addressRegion: c.state ?? undefined },
      },
      {
        "@type": "ItemList",
        name: `Social Perks businesses in ${label}`,
        itemListElement: businesses.slice(0, 10).map((b, idx) => ({
          "@type": "ListItem",
          position: idx + 1,
          url: `${SITE_URL}/b/${buildBusinessSlug(b)}`,
          name: b.name,
        })),
      },
    ],
  };

  return (
    <div className="min-h-screen bg-brand-bg">
      <Nav />

      <main id="main-content" className="mx-auto max-w-4xl px-4 pt-32 pb-20 sm:px-6 lg:px-8 sm:pt-40 sm:pb-28">
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />

        <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.15em] text-brand-cyan">
          {label.toUpperCase()}
        </p>
        <h1 className="font-heading text-4xl italic text-brand-white sm:text-5xl">
          Social Perks in {label}
        </h1>
        <p className="mt-4 max-w-2xl text-base text-brand-dim sm:text-lg">
          Independent businesses in {label} are turning customers into marketing —
          a perk for a post, no paid ads. Browse local campaigns and creators below.
        </p>

        {/* Businesses */}
        <section aria-labelledby="city-businesses" className="mt-12">
          <h2 id="city-businesses" className="font-heading text-2xl italic text-brand-white">
            Businesses in {c.name}
          </h2>
          {businesses.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-brand-border/40 bg-brand-surface/30 p-6 text-sm text-brand-dim">
              No businesses listed yet — we&apos;re onboarding hand-by-hand.
              Want to be the first in {label}?
              <div className="mt-4 max-w-sm">
                <WaitlistForm vertical={c.slug === "washington-dc" ? "coffee_shops" : "other"} />
              </div>
            </div>
          ) : (
            <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {businesses.map((b) => (
                <li key={b.id}>
                  <Link
                    href={`/b/${buildBusinessSlug(b)}`}
                    className="flex items-center gap-3 rounded-2xl border border-brand-border/40 bg-brand-surface/30 p-4 transition-all hover:-translate-y-0.5 hover:border-brand-cyan/40"
                  >
                    <span className="text-2xl" aria-hidden="true">{b.avatar ?? "🏪"}</span>
                    <div className="min-w-0">
                      <p className="font-semibold text-brand-white">{b.name}</p>
                      <p className="text-xs text-brand-dim">{b.type}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Creators */}
        {influencers.length > 0 && (
          <section aria-labelledby="city-creators" className="mt-12">
            <h2 id="city-creators" className="font-heading text-2xl italic text-brand-white">
              Creators in {c.name}
            </h2>
            <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {influencers.map((i) => (
                <li key={i.id}>
                  <Link
                    href={`/i/${buildInfluencerSlug(i)}`}
                    className="flex items-center gap-3 rounded-2xl border border-brand-border/40 bg-brand-surface/30 p-4 transition-all hover:-translate-y-0.5 hover:border-brand-cyan/40"
                  >
                    <span className="text-2xl" aria-hidden="true">🎤</span>
                    <div className="min-w-0">
                      <p className="font-semibold text-brand-white">{i.displayName}</p>
                      <p className="text-xs text-brand-dim">
                        {i.followerCount.toLocaleString()} followers
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* CTA */}
        <div className="mt-16 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-brand-cyan/30 bg-brand-cyan/5 p-6 text-center">
            <p className="font-heading text-xl italic text-brand-white">
              Run a business in {c.name}?
            </p>
            <p className="mt-2 text-sm text-brand-dim">
              Get featured. Reach local creators. Ship your first campaign in 5 minutes.
            </p>
            <Link
              href="/dashboard#signup"
              className="mt-4 inline-block rounded-xl bg-brand-cyan px-5 py-2.5 text-sm font-semibold text-brand-bg hover:-translate-y-0.5 transition-all"
            >
              Start free →
            </Link>
          </div>
          <div className="rounded-2xl border border-brand-border/40 bg-brand-surface/30 p-6 text-center">
            <p className="font-heading text-xl italic text-brand-white">
              Creator in {c.name}?
            </p>
            <p className="mt-2 text-sm text-brand-dim">
              Local businesses pay verified creators for posts. Set up your profile.
            </p>
            <Link
              href="/dashboard#signup"
              className="mt-4 inline-block rounded-xl border border-brand-border bg-brand-surface px-5 py-2.5 text-sm font-semibold text-brand-text hover:-translate-y-0.5 transition-all"
            >
              Set up profile →
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
