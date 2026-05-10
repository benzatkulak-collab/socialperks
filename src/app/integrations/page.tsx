import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/shared/nav";
import { Footer } from "@/components/shared/footer";
import { INTEGRATIONS } from "@/lib/integrations/data";

export const metadata: Metadata = {
  title: "Integrations · Social Perks",
  description:
    "Connect Social Perks to Instagram, TikTok, Google Business, Facebook, Yelp, and 7 more platforms. Run marketing campaigns automatically.",
  openGraph: {
    title: "Social Perks Integrations",
    description:
      "Run marketing campaigns across 12 platforms — Instagram, TikTok, Google, and more.",
    url: "https://socialperks.onrender.com/integrations",
    siteName: "Social Perks",
    type: "website",
  },
};

export default function IntegrationsIndexPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-brand-bg">
      <Nav />
      <main id="main-content">
        {/* Hero */}
        <section className="relative overflow-hidden pt-32 pb-16 sm:pt-40 sm:pb-20">
          <div
            className="pointer-events-none absolute inset-0 bg-[length:300%_300%] bg-[linear-gradient(135deg,rgba(34,211,238,0.06),rgba(52,211,153,0.04),rgba(34,211,238,0.02))]"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute left-1/3 top-1/4 h-96 w-96 rounded-full bg-brand-cyan/5 blur-3xl"
            aria-hidden="true"
          />

          <div className="relative z-10 mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-cyan/30 bg-brand-cyan/10 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.15em] text-brand-cyan">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-cyan opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-cyan" />
              </span>
              12 platforms · OAuth in 30s
            </div>

            <h1 className="mt-6 font-heading text-[clamp(2.25rem,5vw,4rem)] italic leading-[1.05] tracking-tight text-brand-white">
              Run marketing on{" "}
              <span className="bg-gradient-to-r from-brand-cyan via-brand-green to-brand-cyan bg-clip-text text-transparent">
                every platform.
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-brand-dim sm:text-lg">
              Connect Social Perks once, and your campaigns run automatically
              across Instagram, TikTok, Google, and 9 more. OAuth in 30 seconds.
              No code.
            </p>
          </div>
        </section>

        {/* Integrations grid */}
        <section className="pb-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {INTEGRATIONS.map((platform) => (
                <Link
                  key={platform.slug}
                  href={`/integrations/${platform.slug}`}
                  className="group relative flex flex-col rounded-2xl border border-brand-border bg-brand-surface/50 p-6 transition-all duration-normal ease-smooth hover:-translate-y-1 hover:border-brand-cyan/40 hover:bg-brand-surface hover:shadow-lg hover:shadow-brand-cyan/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/40"
                >
                  <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${platform.accent} flex items-center justify-center`}>
                    <span className={`font-heading text-xl italic ${platform.color}`}>
                      {platform.name.charAt(0)}
                    </span>
                  </div>

                  <h2 className="mt-5 font-heading text-2xl italic leading-tight text-brand-white">
                    {platform.name}
                  </h2>

                  <p className="mt-3 flex-1 text-sm leading-relaxed text-brand-dim">
                    {platform.tagline}
                  </p>

                  <div className="mt-6 flex items-center gap-1.5 text-sm font-medium text-brand-cyan transition-transform duration-fast group-hover:translate-x-0.5">
                    Connect {platform.name}
                    <span aria-hidden="true">→</span>
                  </div>
                </Link>
              ))}
            </div>

            {/* Bottom CTA */}
            <div className="mt-20 rounded-2xl border border-brand-border bg-brand-surface/30 p-8 text-center sm:p-12">
              <h2 className="font-heading text-3xl italic leading-tight text-brand-white sm:text-4xl">
                One signup. Every channel.
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-brand-dim">
                Connect the platforms you actually use. Skip the ones you
                don&apos;t. Social Perks runs the campaigns and tracks results
                across all of them in one dashboard.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  href="/ai"
                  className="w-full rounded-xl bg-brand-cyan px-7 py-3 text-sm font-semibold text-brand-bg transition-all hover:bg-cyan-300 hover:shadow-lg hover:shadow-brand-cyan/20 sm:w-auto"
                >
                  Get started free →
                </Link>
                <Link
                  href="/pricing"
                  className="w-full rounded-xl border border-brand-border bg-brand-surface/50 px-7 py-3 text-sm font-medium text-brand-text transition-all hover:border-brand-subtle hover:bg-brand-surface sm:w-auto"
                >
                  See pricing
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
