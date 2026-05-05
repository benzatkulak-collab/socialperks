import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Nav } from "@/components/shared/nav";
import { Footer } from "@/components/shared/footer";
import { WaitlistForm } from "@/components/landing/waitlist-form";
import { listCities, findCity, businessesInCity } from "@/lib/cities";
import { INDUSTRY_MAP, INDUSTRY_SLUGS } from "@/lib/industries";
import { buildBusinessSlug } from "@/lib/slugs";

interface PageProps {
  params: Promise<{ city: string; industry: string }>;
}

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "https://socialperks.io");

// Cross-product of cities × industries. Generates ~480 indexable
// long-tail pages — far higher search volume in aggregate than head
// terms. Filtered to launch-priority cities × top-priority industries
// to avoid emitting hundreds of empty 404s on first build.
export function generateStaticParams() {
  const cities = listCities().filter((c) => c.priority);
  const params: { city: string; industry: string }[] = [];
  for (const c of cities) {
    for (const slug of INDUSTRY_SLUGS) {
      params.push({ city: c.slug, industry: slug });
    }
  }
  return params;
}

function cityLabel(c: { name: string; state: string | null }): string {
  return c.state ? `${c.name}, ${c.state}` : c.name;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { city, industry } = await params;
  const c = findCity(city);
  const ind = INDUSTRY_MAP.get(industry);
  if (!c || !ind) return {};
  const label = cityLabel(c);
  const title = `Social media marketing for ${ind.name.toLowerCase()} in ${label}`;
  const description = `${ind.name} owners in ${label}: turn customers into Instagram, TikTok, and Facebook posts with a single perk. See local examples and start free.`;
  const url = `${SITE_URL}/in/${c.slug}/${ind.slug}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, type: "website", url, siteName: "Social Perks" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function CityIndustryPage({ params }: PageProps) {
  const { city, industry } = await params;
  const c = findCity(city);
  const ind = INDUSTRY_MAP.get(industry);
  if (!c || !ind) notFound();

  const label = cityLabel(c);
  // Filter businesses to those whose `industry` field matches the target.
  // Seed-data approximate match — once businesses persist with structured
  // industry tags this is a hard SQL filter.
  const allLocal = businessesInCity(c.slug);
  const localMatches = allLocal.filter((b) =>
    (b.industry ?? "").toLowerCase().includes(ind.name.toLowerCase()) ||
    (b.type ?? "").toLowerCase().includes(ind.name.toLowerCase().slice(0, 6)),
  );

  return (
    <div className="min-h-screen bg-brand-bg">
      <Nav />

      <main id="main-content" className="mx-auto max-w-3xl px-4 pt-32 pb-20 sm:px-6 lg:px-8 sm:pt-40 sm:pb-28">
        <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.15em] text-brand-cyan">
          {label.toUpperCase()} · {ind.name.toUpperCase()}
        </p>
        <h1 className="font-heading text-4xl italic text-brand-white sm:text-5xl">
          Social media marketing for {ind.name.toLowerCase()} in {label}
        </h1>
        <p className="mt-4 max-w-2xl text-base text-brand-dim sm:text-lg">
          Independent {ind.name.toLowerCase()} owners in {label} are turning regulars
          into marketing — a perk for a post — without paying for ads. Here&apos;s how it works
          for businesses like yours.
        </p>

        {/* What it looks like */}
        <section aria-labelledby="how-heading" className="mt-12">
          <h2 id="how-heading" className="font-heading text-2xl italic text-brand-white">
            How it works for {ind.name.toLowerCase()}
          </h2>
          <ol className="mt-6 space-y-4">
            <li className="rounded-2xl border border-brand-border/40 bg-brand-surface/30 p-5">
              <p className="font-mono text-[11px] uppercase tracking-widest text-brand-cyan">01</p>
              <p className="mt-2 font-semibold text-brand-white">Pick what you offer</p>
              <p className="mt-1 text-sm text-brand-dim">
                Most {ind.name.toLowerCase()} pick something cheap-but-attractive: 15% off
                next visit, a free pastry, $5 off — anything that fits the margin.
              </p>
            </li>
            <li className="rounded-2xl border border-brand-border/40 bg-brand-surface/30 p-5">
              <p className="font-mono text-[11px] uppercase tracking-widest text-brand-cyan">02</p>
              <p className="mt-2 font-semibold text-brand-white">
                Pick the platform
              </p>
              <p className="mt-1 text-sm text-brand-dim">
                Instagram stories work especially well in {c.name} — short-form, high reach,
                FTC-compliant disclosure auto-injected. TikTok and Facebook also supported.
              </p>
            </li>
            <li className="rounded-2xl border border-brand-border/40 bg-brand-surface/30 p-5">
              <p className="font-mono text-[11px] uppercase tracking-widest text-brand-cyan">03</p>
              <p className="mt-2 font-semibold text-brand-white">
                Customers post; we verify; they get the perk
              </p>
              <p className="mt-1 text-sm text-brand-dim">
                Verified posts only — no honor system. Once verified, they redeem the
                perk in-store. You get real social proof from real customers.
              </p>
            </li>
          </ol>
        </section>

        {/* Local examples (if any) */}
        {localMatches.length > 0 && (
          <section aria-labelledby="local-heading" className="mt-12">
            <h2 id="local-heading" className="font-heading text-2xl italic text-brand-white">
              {ind.name} on Social Perks in {c.name}
            </h2>
            <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {localMatches.slice(0, 8).map((b) => (
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
          </section>
        )}

        {/* CTA */}
        <div className="mt-12 rounded-2xl border border-brand-cyan/30 bg-brand-cyan/5 p-6 text-center sm:p-8">
          <h3 className="font-heading text-2xl italic text-brand-white">
            Run a {ind.name.toLowerCase().replace(/s$/, "")} in {c.name}?
          </h3>
          <p className="mt-3 text-sm text-brand-dim">
            We&apos;re onboarding the first 10 hand-by-hand. Drop your email — we&apos;ll
            reach out when there&apos;s a slot.
          </p>
          <div className="mx-auto mt-6 max-w-md text-left">
            <WaitlistForm vertical={c.slug === "washington-dc" && ind.slug === "coffee-shops" ? "coffee_shops" : "other"} />
          </div>
        </div>

        {/* Cross-links */}
        <p className="mt-12 text-center text-sm text-brand-muted">
          See more in {c.name}: {" "}
          <Link href={`/in/${c.slug}`} className="text-brand-cyan hover:underline">
            all industries →
          </Link>
        </p>
      </main>

      <Footer />
    </div>
  );
}
