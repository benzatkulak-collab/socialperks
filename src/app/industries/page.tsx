import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/shared/nav";
import { Footer } from "@/components/shared/footer";
import { INDUSTRY_PAGES } from "@/lib/industry-pages/data";

const BASE_URL = "https://socialperks.com";

export const metadata: Metadata = {
  title: "Marketing Software by Industry — Social Perks",
  description:
    "Industry-specific marketing software for restaurants, salons, gyms, dental practices, and 16 more local business categories. Free 14-day trial.",
  openGraph: {
    title: "Marketing Software by Industry — Social Perks",
    description:
      "Industry-specific marketing software built for local businesses. Free 14-day trial.",
    type: "website",
    url: `${BASE_URL}/industries`,
    siteName: "Social Perks",
  },
  alternates: { canonical: `${BASE_URL}/industries` },
};

export default function IndustriesIndexPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-brand-bg text-brand-text">
      <Nav />

      <section className="relative overflow-hidden bg-brand-bg pt-32 pb-16 sm:pt-40 sm:pb-20">
        <div
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(34,211,238,0.07),rgba(167,139,250,0.05),rgba(244,114,182,0.04),rgba(34,211,238,0.02))]"
          aria-hidden="true"
        />
        <div className="relative z-10 mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <nav
            className="mb-8 flex items-center justify-center gap-2 text-sm text-brand-muted"
            aria-label="Breadcrumb"
          >
            <Link href="/" className="transition-colors hover:text-brand-text">
              Home
            </Link>
            <span aria-hidden="true">/</span>
            <span className="text-brand-cyan">Industries</span>
          </nav>

          <h1 className="font-heading text-[clamp(2rem,5vw,4rem)] italic leading-[1.1] tracking-tight text-brand-white">
            <span className="bg-gradient-to-r from-brand-cyan via-brand-green to-brand-cyan bg-clip-text text-transparent">
              Marketing software,
            </span>
            <br />
            <span className="text-brand-white/90">built for your industry</span>
          </h1>
          <p className="mx-auto mt-8 max-w-2xl text-base leading-relaxed text-brand-dim sm:text-lg">
            Pick your industry. Get a dedicated landing page with campaign
            templates, industry-tested perks, and pricing built for your kind of
            business.
          </p>
        </div>
      </section>

      <section className="border-t border-brand-border/30 bg-brand-bg py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {INDUSTRY_PAGES.map((page) => (
              <Link
                key={page.slug}
                href={`/industries/${page.slug}`}
                className="group rounded-2xl border border-brand-border/60 bg-white/[0.02] p-6 transition-all hover:-translate-y-1 hover:border-brand-cyan/40 hover:bg-white/[0.04]"
              >
                <div className="text-xs uppercase tracking-wider text-brand-muted">
                  Marketing software
                </div>
                <h2 className="mt-2 font-heading text-xl italic text-brand-white group-hover:text-brand-cyan">
                  {page.industry}
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-brand-dim">
                  {page.metaDescription}
                </p>
                <div className="mt-5 inline-flex items-center gap-1 text-xs font-medium text-brand-cyan">
                  Explore
                  <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">→</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-brand-border/30 bg-brand-bg/60 py-20 sm:py-24">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="font-heading text-3xl italic text-brand-white sm:text-4xl">
            Don&rsquo;t see your industry?
          </h2>
          <p className="mt-5 text-base text-brand-dim sm:text-lg">
            Social Perks works for any local business with walk-in customers,
            bookings, or repeat sales. Start a free trial and we&rsquo;ll match
            you to industry templates that fit.
          </p>
          <a
            href="/dashboard#signup"
            className="mt-10 inline-flex items-center justify-center rounded-xl bg-brand-cyan px-8 py-3.5 font-body text-base font-semibold text-brand-bg transition-all hover:-translate-y-0.5 hover:bg-brand-cyan/90"
          >
            Start free trial
          </a>
        </div>
      </section>

      <Footer />
    </div>
  );
}
