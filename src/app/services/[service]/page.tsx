import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Nav } from "@/components/shared/nav";
import { Footer } from "@/components/shared/footer";
import {
  SERVICES,
  SERVICE_MAP,
  SERVICE_CITIES,
} from "@/lib/services/data";

const SITE_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://socialperks.onrender.com";

export function generateStaticParams() {
  return SERVICES.map((s) => ({ service: s.slug }));
}

interface PageProps {
  params: Promise<{ service: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { service: serviceSlug } = await params;
  const service = SERVICE_MAP.get(serviceSlug);
  if (!service) return {};

  const title = `${service.name} — AI-Powered, Built for Small Businesses | Social Perks`;
  const description = `${service.oneLiner} Available in ${SERVICE_CITIES.length} U.S. cities. $49/mo with a 14-day free trial.`;
  const url = `${SITE_URL}/services/${service.slug}`;

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

export default async function ServiceOverviewPage({ params }: PageProps) {
  const { service: serviceSlug } = await params;
  const service = SERVICE_MAP.get(serviceSlug);
  if (!service) notFound();

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
            <Link
              href="/services"
              className="transition-colors hover:text-brand-text"
            >
              Services
            </Link>
            <span aria-hidden="true">/</span>
            <span className="text-brand-cyan">{service.name}</span>
          </nav>

          <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.15em] text-brand-cyan sm:text-xs">
            Service · Available in {SERVICE_CITIES.length} cities
          </p>
          <h1 className="font-heading text-[clamp(2rem,5vw,3.75rem)] italic leading-[1.1] tracking-tight text-brand-white">
            <span className="bg-gradient-to-r from-brand-cyan via-brand-green to-brand-cyan bg-clip-text text-transparent">
              {service.name}
            </span>
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-brand-dim sm:mt-8 sm:text-lg">
            {service.oneLiner}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/pricing"
              className="rounded-xl bg-brand-cyan px-6 py-3 text-sm font-medium text-brand-bg transition-all hover:-translate-y-0.5 hover:bg-brand-cyan/90"
            >
              Start 14-day free trial
            </Link>
            <Link
              href="#cities"
              className="rounded-xl border border-brand-border/40 bg-brand-surface/30 px-6 py-3 text-sm text-brand-text transition-all hover:-translate-y-0.5 hover:border-brand-border/70 hover:bg-brand-surface/50"
            >
              See local pages &darr;
            </Link>
          </div>
        </div>
      </section>

      {/* DELIVERABLES */}
      <section
        className="relative bg-brand-bg pb-16 sm:pb-20"
        aria-labelledby="deliverables-heading"
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-border to-transparent"
          aria-hidden="true"
        />
        <div className="mx-auto max-w-4xl px-4 pt-16 sm:px-6 sm:pt-20 lg:px-8">
          <h2
            id="deliverables-heading"
            className="font-heading text-[clamp(1.5rem,3vw,2.25rem)] italic leading-tight text-brand-white"
          >
            What you get
          </h2>
          <p className="mt-2 text-sm text-brand-muted">
            Outcome: {service.outcome}.
          </p>

          <ul className="mt-10 space-y-3">
            {service.deliverables.map((d, i) => (
              <li
                key={i}
                className="flex items-start gap-4 rounded-xl border border-brand-border/40 bg-brand-surface/30 p-5 backdrop-blur-sm"
              >
                <span className="mt-0.5 font-mono text-xs text-brand-cyan">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="text-sm leading-relaxed text-brand-text">
                  {d}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* FAQ */}
      <section
        className="relative bg-brand-bg pb-16 sm:pb-20"
        aria-labelledby="faq-heading"
      >
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2
            id="faq-heading"
            className="font-heading text-[clamp(1.5rem,3vw,2.25rem)] italic leading-tight text-brand-white"
          >
            Frequently asked
          </h2>
          <ul className="mt-10 space-y-4">
            {service.faqs.map((f, i) => (
              <li
                key={i}
                className="rounded-xl border border-brand-border/40 bg-brand-surface/30 p-6 backdrop-blur-sm"
              >
                <h3 className="font-body text-base font-medium text-brand-white">
                  {f.q}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-brand-dim">
                  {f.a}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* CITIES */}
      <section
        id="cities"
        className="relative bg-brand-bg pb-20 sm:pb-28"
        aria-labelledby="cities-heading"
      >
        <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6 lg:px-8">
          <h2
            id="cities-heading"
            className="font-heading text-[clamp(1.5rem,3vw,2.25rem)] italic leading-tight text-brand-white"
          >
            {service.name} in your city
          </h2>
          <p className="mt-2 text-sm text-brand-muted">
            {SERVICE_CITIES.length} local variants of this service.
          </p>

          <ul className="mt-10 grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
            {SERVICE_CITIES.map((city) => (
              <li key={city.slug}>
                <Link
                  href={`/services/${service.slug}/${city.slug}`}
                  className="group flex items-center justify-between gap-3 rounded-xl border border-brand-border/40 bg-brand-surface/30 px-5 py-4 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-brand-border/70 hover:bg-brand-surface/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/40"
                >
                  <span>
                    <span className="block font-body text-base font-medium text-brand-white">
                      {service.name} in {city.name}
                    </span>
                    <span className="mt-0.5 block font-mono text-[11px] uppercase tracking-[0.12em] text-brand-muted">
                      {city.stateCode}
                    </span>
                  </span>
                  <span
                    aria-hidden="true"
                    className="text-brand-cyan transition-transform group-hover:translate-x-0.5"
                  >
                    &rarr;
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          <div className="mt-12 flex justify-center">
            <Link
              href="/services"
              className="rounded-xl border border-brand-border/40 bg-brand-surface/30 px-5 py-3 text-sm text-brand-muted transition-all hover:-translate-y-0.5 hover:border-brand-border/70 hover:bg-brand-surface/50 hover:text-brand-text"
            >
              &larr; All services
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
