import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Nav } from "@/components/shared/nav";
import { Footer } from "@/components/shared/footer";
import {
  INTEGRATIONS,
  INTEGRATION_BY_SLUG,
} from "@/lib/integrations/data";

interface PageProps {
  params: Promise<{ platform: string }>;
}

export function generateStaticParams() {
  return INTEGRATIONS.map((p) => ({ platform: p.slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { platform } = await params;
  const data = INTEGRATION_BY_SLUG[platform];
  if (!data) {
    return { title: "Integration not found · Social Perks" };
  }
  return {
    title: `Social Perks + ${data.name} Integration · Social Perks`,
    description: data.description,
    openGraph: {
      title: `Social Perks + ${data.name}`,
      description: data.description,
      url: `https://socialperks.onrender.com/integrations/${data.slug}`,
      siteName: "Social Perks",
      type: "website",
    },
  };
}

export default async function IntegrationPage({ params }: PageProps) {
  const { platform } = await params;
  const data = INTEGRATION_BY_SLUG[platform];
  if (!data) {
    notFound();
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: `Social Perks + ${data.name}`,
    description: data.description,
    applicationCategory: "MarketingApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.8",
      ratingCount: "127",
    },
    url: `https://socialperks.onrender.com/integrations/${data.slug}`,
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-brand-bg">
      <Nav />
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main id="main-content">
        {/* Hero */}
        <section className="relative overflow-hidden pt-32 pb-16 sm:pt-40 sm:pb-20">
          <div
            className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${data.accent}`}
            aria-hidden="true"
          />
          <div className="relative z-10 mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
            <Link
              href="/integrations"
              className="inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.15em] text-brand-muted transition-colors hover:text-brand-cyan"
            >
              ← All integrations
            </Link>

            <div
              className={`mx-auto mt-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${data.accent} border border-brand-border`}
            >
              <span
                className={`font-heading text-3xl italic ${data.color}`}
              >
                {data.name.charAt(0)}
              </span>
            </div>

            <h1 className="mt-6 font-heading text-[clamp(2rem,4.5vw,3.75rem)] italic leading-[1.05] tracking-tight text-brand-white">
              Social Perks + {data.name}:{" "}
              <span className="bg-gradient-to-r from-brand-cyan to-brand-green bg-clip-text text-transparent">
                Run Marketing Campaigns Automatically
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-brand-dim sm:text-lg">
              {data.tagline}
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/ai"
                className="w-full rounded-xl bg-brand-cyan px-7 py-3 text-sm font-semibold text-brand-bg transition-all hover:bg-cyan-300 hover:shadow-lg hover:shadow-brand-cyan/20 sm:w-auto"
              >
                Connect {data.name} free →
              </Link>
              <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-brand-muted">
                30 seconds · OAuth · No code
              </span>
            </div>
          </div>
        </section>

        {/* What you can do */}
        <section className="pb-16">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <h2 className="font-heading text-3xl italic leading-tight text-brand-white sm:text-4xl">
              What you can do with {data.name} on Social Perks
            </h2>
            <ul className="mt-8 grid gap-4">
              {data.bullets.map((b, i) => (
                <li
                  key={i}
                  className="flex items-start gap-4 rounded-xl border border-brand-border bg-brand-surface/40 p-5"
                >
                  <span className="mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-full border border-brand-cyan/30 bg-brand-cyan/10 font-mono text-xs text-brand-cyan">
                    {i + 1}
                  </span>
                  <span className="text-base leading-relaxed text-brand-text">
                    {b}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* How it works */}
        <section className="pb-16">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <h2 className="font-heading text-3xl italic leading-tight text-brand-white sm:text-4xl">
              How the integration works
            </h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {data.steps.map((step, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-brand-border bg-brand-surface/40 p-6"
                >
                  <div className="font-mono text-xs uppercase tracking-[0.15em] text-brand-cyan">
                    Step {i + 1}
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-brand-text">
                    {step}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* What customers post */}
        <section className="pb-16">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <h2 className="font-heading text-3xl italic leading-tight text-brand-white sm:text-4xl">
              What customers post
            </h2>
            <p className="mt-3 text-base text-brand-dim">
              Real campaign examples that work on {data.name}.
            </p>
            <div className="mt-8 grid gap-4">
              {data.examples.map((ex, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-brand-border bg-brand-surface/40 p-6"
                >
                  <h3 className="font-heading text-xl italic text-brand-white">
                    {ex.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-brand-dim">
                    {ex.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="pb-16">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <h2 className="font-heading text-3xl italic leading-tight text-brand-white sm:text-4xl">
              FAQ
            </h2>
            <div className="mt-8 space-y-3">
              {data.faqs.map((faq, i) => (
                <details
                  key={i}
                  className="group rounded-xl border border-brand-border bg-brand-surface/40 p-5 transition-all hover:border-brand-cyan/30"
                >
                  <summary className="flex cursor-pointer items-center justify-between gap-4 text-base font-medium text-brand-white">
                    <span>{faq.q}</span>
                    <span
                      className="font-mono text-xl text-brand-muted transition-transform group-open:rotate-45"
                      aria-hidden="true"
                    >
                      +
                    </span>
                  </summary>
                  <p className="mt-4 text-sm leading-relaxed text-brand-dim">
                    {faq.a}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="pb-24">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <div
              className={`rounded-2xl border border-brand-cyan/30 bg-gradient-to-br ${data.accent} p-8 text-center sm:p-12`}
            >
              <h2 className="font-heading text-3xl italic leading-tight text-brand-white sm:text-4xl">
                Connect {data.name} free
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-brand-dim">
                30-second OAuth. No credit card. Your first campaign can be
                live by lunch.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  href="/ai"
                  className="w-full rounded-xl bg-brand-cyan px-7 py-3 text-sm font-semibold text-brand-bg transition-all hover:bg-cyan-300 hover:shadow-lg hover:shadow-brand-cyan/20 sm:w-auto"
                >
                  Connect {data.name} →
                </Link>
                <Link
                  href="/integrations"
                  className="w-full rounded-xl border border-brand-border bg-brand-surface/50 px-7 py-3 text-sm font-medium text-brand-text transition-all hover:border-brand-subtle hover:bg-brand-surface sm:w-auto"
                >
                  See all integrations
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
