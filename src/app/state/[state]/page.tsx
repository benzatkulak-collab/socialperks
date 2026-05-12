import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Nav } from "@/components/shared/nav";
import { Footer } from "@/components/shared/footer";
import {
  STATES,
  STATE_INDUSTRIES,
  STATE_MAP,
  estimateBusinessCount,
  getNearbyStates,
  regionLabel,
} from "@/lib/programmatic-seo/states";

const SITE_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://socialperks.onrender.com";

export function generateStaticParams() {
  return STATES.map((s) => ({ state: s.slug }));
}

interface PageProps {
  params: Promise<{ state: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { state: stateSlug } = await params;
  const state = STATE_MAP.get(stateSlug);
  if (!state) return {};

  const title = `Small Business Marketing in ${state.name} | Social Perks`;
  const description = `Customer-perks marketing tips for ${state.name} small businesses. ${STATE_INDUSTRIES.length} industries with ready-to-launch campaign ideas built for ${state.name}.`;
  const url = `${SITE_URL}/state/${state.slug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      type: "website",
      url,
      siteName: "Social Perks",
    },
  };
}

export default async function StateIndexPage({ params }: PageProps) {
  const { state: stateSlug } = await params;
  const state = STATE_MAP.get(stateSlug);
  if (!state) notFound();

  const nearbyStates = getNearbyStates(state.slug, 6);

  return (
    <div className="min-h-screen overflow-x-hidden">
      <Nav />

      <section
        className="relative overflow-hidden bg-brand-bg pt-32 pb-16 sm:pt-40 sm:pb-20"
        aria-label="Hero"
      >
        <div
          className="pointer-events-none absolute inset-0 animate-gradient bg-[length:300%_300%] bg-[linear-gradient(135deg,rgba(34,211,238,0.07),rgba(167,139,250,0.05),rgba(244,114,182,0.04),rgba(34,211,238,0.02))]"
          aria-hidden="true"
        />
        <div className="relative z-10 mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <nav
            className="mb-8 flex flex-wrap items-center gap-2 text-sm text-brand-muted"
            aria-label="Breadcrumb"
          >
            <Link href="/" className="transition-colors hover:text-brand-text">
              Home
            </Link>
            <span aria-hidden="true">/</span>
            <Link
              href="/state"
              className="transition-colors hover:text-brand-text"
            >
              State
            </Link>
            <span aria-hidden="true">/</span>
            <span className="text-brand-cyan">{state.name}</span>
          </nav>

          <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.15em] text-brand-cyan sm:text-xs">
            {state.name} · {state.abbreviation} ·{" "}
            {regionLabel(state.region)}
          </p>

          <h1 className="font-heading text-[clamp(2rem,5vw,3.75rem)] italic leading-[1.1] tracking-tight text-brand-white">
            Small Business Marketing in{" "}
            <span className="bg-gradient-to-r from-brand-cyan via-brand-green to-brand-cyan bg-clip-text text-transparent">
              {state.name}
            </span>
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-relaxed text-brand-dim sm:mt-8 sm:text-lg">
            {state.businessClimate}
          </p>

          <p className="mt-4 max-w-2xl text-base leading-relaxed text-brand-dim sm:text-lg">
            Pick your industry below for {state.name}-specific tactics,
            challenges, and campaign ideas built around customer perks.
          </p>
        </div>
      </section>

      <section
        className="relative bg-brand-bg py-16 sm:py-20"
        aria-labelledby="industries-heading"
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-border to-transparent"
          aria-hidden="true"
        />
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.15em] text-brand-cyan sm:text-xs">
            Pick your industry
          </p>
          <h2
            id="industries-heading"
            className="font-heading text-[clamp(1.75rem,3vw,2.5rem)] italic leading-tight text-brand-white"
          >
            {STATE_INDUSTRIES.length} industries we serve in {state.name}
          </h2>

          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {STATE_INDUSTRIES.map((industry) => {
              const count = estimateBusinessCount(state, industry);
              return (
                <li key={industry.slug}>
                  <Link
                    href={`/state/${state.slug}/${industry.slug}`}
                    className="group block rounded-xl border border-brand-border/40 bg-brand-surface/30 p-5 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-brand-border/70 hover:bg-brand-surface/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/40 sm:p-6"
                  >
                    <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-brand-muted">
                      ~{count.toLocaleString()} in {state.abbreviation}
                    </p>
                    <p className="mt-3 font-heading text-2xl italic text-brand-white">
                      {industry.plural}
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-brand-dim">
                      {state.name} {industry.plural.toLowerCase()} marketing
                      tactics, challenges, and 5 campaign ideas built for the
                      local market.
                    </p>
                    <p className="mt-4 inline-flex items-center text-sm font-semibold text-brand-cyan transition-transform group-hover:translate-x-0.5">
                      View {industry.plural.toLowerCase()} in {state.name} →
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section
        className="relative bg-brand-bg py-16 sm:py-20"
        aria-labelledby="nearby-heading"
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-border to-transparent"
          aria-hidden="true"
        />
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.15em] text-brand-cyan sm:text-xs">
            Nearby
          </p>
          <h2
            id="nearby-heading"
            className="font-heading text-[clamp(1.5rem,2.5vw,2rem)] italic leading-tight text-brand-white"
          >
            Other states in the {regionLabel(state.region)}
          </h2>
          <ul className="mt-6 flex flex-wrap gap-2 sm:gap-3">
            {nearbyStates.map((s) => (
              <li key={s.slug}>
                <Link
                  href={`/state/${s.slug}`}
                  className="inline-flex items-center rounded-lg border border-brand-border/40 bg-brand-surface/30 px-3.5 py-2 text-sm text-brand-text transition-all hover:-translate-y-0.5 hover:border-brand-border/70 hover:bg-brand-surface/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/40"
                >
                  {s.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section
        className="relative bg-brand-bg py-20 sm:py-28"
        aria-label="Call to action"
      >
        <div className="relative z-10 mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="font-heading text-[clamp(1.75rem,4vw,3rem)] italic leading-[1.15] text-brand-white">
            Ready to grow your {state.name} business?
          </h2>
          <p className="mx-auto mt-6 max-w-lg text-base leading-relaxed text-brand-dim sm:mt-8 sm:text-lg">
            Try Social Perks free for 14 days. Launch your first campaign
            tonight.
          </p>
          <div className="mt-10 flex justify-center">
            <a
              href="/auth"
              className="rounded-xl bg-brand-cyan px-10 py-4 font-body text-base font-semibold text-brand-bg transition-all hover:-translate-y-0.5 hover:bg-brand-cyan/90 hover:shadow-lg hover:shadow-brand-cyan/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/50"
            >
              Start free trial
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
