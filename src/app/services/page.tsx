import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/shared/nav";
import { Footer } from "@/components/shared/footer";
import { SERVICES, SERVICE_CITIES } from "@/lib/services/data";

const SITE_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://socialperks.onrender.com";

export const metadata: Metadata = {
  title: "Marketing Services for Small Businesses | Social Perks",
  description: `${SERVICES.length} AI-powered marketing services across ${SERVICE_CITIES.length} U.S. cities. Built for owner-operators, not agencies.`,
  alternates: { canonical: `${SITE_URL}/services` },
  openGraph: {
    title: "Marketing Services for Small Businesses | Social Perks",
    description: `${SERVICES.length} AI-powered marketing services across ${SERVICE_CITIES.length} U.S. cities.`,
    type: "website",
    url: `${SITE_URL}/services`,
    siteName: "Social Perks",
  },
};

export default function ServicesIndexPage() {
  return (
    <div className="min-h-screen overflow-x-hidden">
      <Nav />

      {/* HERO */}
      <section
        className="relative overflow-hidden bg-brand-bg pt-32 pb-16 sm:pt-40 sm:pb-20"
        aria-label="Hero"
      >
        <div
          className="pointer-events-none absolute inset-0 animate-gradient bg-[length:300%_300%] bg-[linear-gradient(135deg,rgba(34,211,238,0.07),rgba(167,139,250,0.05),rgba(244,114,182,0.04),rgba(34,211,238,0.02))]"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-brand-cyan/5 blur-3xl"
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
            <span className="text-brand-cyan">Services</span>
          </nav>

          <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.15em] text-brand-cyan sm:text-xs">
            {SERVICES.length} services · {SERVICE_CITIES.length} cities
          </p>
          <h1 className="font-heading text-[clamp(2rem,5vw,3.75rem)] italic leading-[1.1] tracking-tight text-brand-white">
            Marketing services{" "}
            <span className="bg-gradient-to-r from-brand-cyan via-brand-green to-brand-cyan bg-clip-text text-transparent">
              built for owner-operators
            </span>
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-brand-dim sm:mt-8 sm:text-lg">
            Eight AI-powered marketing services — from review generation to
            influencer campaigns — available in {SERVICE_CITIES.length} major
            U.S. metros. Same playbook agencies charge $3,000/mo for.
            Ours runs $49/mo with a 14-day free trial.
          </p>
        </div>
      </section>

      {/* SERVICES GRID */}
      <section
        className="relative bg-brand-bg pb-20 sm:pb-28"
        aria-labelledby="services-heading"
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-border to-transparent"
          aria-hidden="true"
        />
        <div className="mx-auto max-w-6xl px-4 pt-16 sm:px-6 sm:pt-20 lg:px-8">
          <h2
            id="services-heading"
            className="font-heading text-[clamp(1.5rem,3vw,2.25rem)] italic leading-tight text-brand-white"
          >
            All services
          </h2>
          <p className="mt-2 text-sm text-brand-muted">
            Each available in {SERVICE_CITIES.length} cities. Click a service
            to see local variants.
          </p>

          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
            {SERVICES.map((service) => (
              <li key={service.slug}>
                <Link
                  href={`/services/${service.slug}`}
                  className="group flex h-full flex-col rounded-xl border border-brand-border/40 bg-brand-surface/30 p-6 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-brand-border/70 hover:bg-brand-surface/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/40"
                >
                  <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-brand-cyan">
                    {SERVICE_CITIES.length} cities
                  </span>
                  <span className="mt-2 font-heading text-xl italic text-brand-white">
                    {service.name}
                  </span>
                  <span className="mt-2 text-sm leading-relaxed text-brand-dim">
                    {service.oneLiner}
                  </span>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm text-brand-cyan transition-transform group-hover:translate-x-0.5">
                    Explore service &rarr;
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          <div className="mt-16 rounded-2xl border border-brand-border/40 bg-brand-surface/20 p-8 backdrop-blur-sm">
            <h2 className="font-heading text-2xl italic text-brand-white">
              Available in {SERVICE_CITIES.length} cities
            </h2>
            <ul className="mt-6 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3 lg:grid-cols-4">
              {SERVICE_CITIES.map((c) => (
                <li key={c.slug}>
                  <span className="text-sm text-brand-muted">
                    {c.name}, {c.stateCode}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
