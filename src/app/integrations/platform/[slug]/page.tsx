import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Nav } from "@/components/shared/nav";
import { Footer } from "@/components/shared/footer";
import {
  PLATFORM_INTEGRATIONS,
  getPlatformIntegration,
  getRelatedPlatformIntegrations,
} from "@/lib/platform-integrations/data";

export function generateStaticParams() {
  return PLATFORM_INTEGRATIONS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const integration = getPlatformIntegration(slug);
  if (!integration) {
    return { title: "Integration not found | Social Perks" };
  }
  const title = `Social Perks + ${integration.name} Integration | Social Perks`;
  const description = integration.oneLiner;
  return {
    title,
    description,
    alternates: {
      canonical: `/integrations/platform/${integration.slug}`,
    },
    openGraph: {
      title,
      description,
      type: "website",
      url: `/integrations/platform/${integration.slug}`,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

const CATEGORY_LABELS: Record<string, string> = {
  automation: "Automation",
  ecommerce: "E-commerce",
  cms: "CMS",
  crm: "CRM",
  email: "Email",
};

export default async function PlatformIntegrationPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const integration = getPlatformIntegration(slug);
  if (!integration) {
    notFound();
  }

  const related = getRelatedPlatformIntegrations(
    integration.slug,
    integration.category,
    4,
  );

  const isAvailable = integration.status === "available";

  const softwareApplicationLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: `Social Perks + ${integration.name} Integration`,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description: integration.oneLiner,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      description: "Free 14-day trial",
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.8",
      reviewCount: "127",
    },
  };

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: integration.faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.a,
      },
    })),
  };

  const initial = integration.name.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-[#0C0F1A] text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApplicationLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />

      <Nav />

      <main className="mx-auto max-w-5xl px-6 py-16">
        {/* Breadcrumb */}
        <nav
          aria-label="Breadcrumb"
          className="mb-8 text-sm text-white/50"
        >
          <ol className="flex flex-wrap gap-2">
            <li>
              <Link href="/" className="hover:text-cyan-400">
                Home
              </Link>
            </li>
            <li>/</li>
            <li>
              <Link
                href="/integrations/platform"
                className="hover:text-cyan-400"
              >
                Integrations
              </Link>
            </li>
            <li>/</li>
            <li className="text-white/80">{integration.name}</li>
          </ol>
        </nav>

        {/* Hero */}
        <section className="mb-16">
          <div className="mb-6 flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-500/10 text-2xl font-bold text-cyan-400 ring-1 ring-cyan-500/30">
              {initial}
            </div>
            <div>
              <div className="text-xs uppercase tracking-widest text-white/40">
                {CATEGORY_LABELS[integration.category]} Integration
              </div>
              <div className="flex items-center gap-3">
                {isAvailable ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/10 px-3 py-1 text-xs font-medium text-green-400 ring-1 ring-green-500/30">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                    Available now
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-400 ring-1 ring-amber-500/30">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                    Coming soon
                  </span>
                )}
              </div>
            </div>
          </div>

          <h1
            className="mb-6 font-serif text-5xl italic leading-tight md:text-6xl"
            style={{ fontFamily: "'Instrument Serif', serif" }}
          >
            Social Perks + {integration.name} Integration
          </h1>

          <p className="mb-8 max-w-3xl text-xl leading-relaxed text-white/70">
            {integration.oneLiner}
          </p>

          <div className="flex flex-wrap gap-4">
            <Link
              href="/?cta=trial"
              className="inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-6 py-3 font-medium text-[#0C0F1A] transition hover:bg-cyan-400"
            >
              Try free for 14 days
              <span aria-hidden>→</span>
            </Link>
            <Link
              href="/integrations/platform"
              className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-6 py-3 font-medium text-white transition hover:border-white/40"
            >
              See all integrations
            </Link>
          </div>
        </section>

        {/* What this does */}
        <section className="mb-16">
          <h2
            className="mb-6 font-serif text-3xl italic text-cyan-400 md:text-4xl"
            style={{ fontFamily: "'Instrument Serif', serif" }}
          >
            What this integration does
          </h2>
          <div className="space-y-4 text-lg leading-relaxed text-white/70">
            {integration.whatItDoes.split("\n\n").map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
        </section>

        {/* Setup in 4 steps */}
        <section className="mb-16">
          <h2
            className="mb-8 font-serif text-3xl italic text-cyan-400 md:text-4xl"
            style={{ fontFamily: "'Instrument Serif', serif" }}
          >
            Setup in 4 steps
          </h2>
          <ol className="space-y-6">
            {integration.setupSteps.map((step, i) => (
              <li
                key={i}
                className="flex gap-6 rounded-xl border border-white/10 bg-white/[0.02] p-6 transition hover:border-cyan-500/30"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cyan-500/10 font-mono text-lg font-bold text-cyan-400 ring-1 ring-cyan-500/30">
                  {i + 1}
                </div>
                <div>
                  <h3 className="mb-2 text-lg font-semibold text-white">
                    {step.title}
                  </h3>
                  <p className="text-white/60">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* 5 ways to use this */}
        <section className="mb-16">
          <h2
            className="mb-8 font-serif text-3xl italic text-cyan-400 md:text-4xl"
            style={{ fontFamily: "'Instrument Serif', serif" }}
          >
            5 ways to use this
          </h2>
          <ul className="space-y-3">
            {integration.useCases.map((u, i) => (
              <li
                key={i}
                className="flex gap-3 rounded-lg border border-white/10 bg-white/[0.02] p-4 text-white/80"
              >
                <span className="text-cyan-400" aria-hidden>
                  ✓
                </span>
                <span>{u}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Popular workflows */}
        <section className="mb-16">
          <h2
            className="mb-8 font-serif text-3xl italic text-cyan-400 md:text-4xl"
            style={{ fontFamily: "'Instrument Serif', serif" }}
          >
            Popular workflows
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            {integration.useCases.slice(0, 3).map((u, i) => (
              <div
                key={i}
                className="rounded-xl border border-white/10 bg-gradient-to-br from-cyan-500/5 to-transparent p-6"
              >
                <div className="mb-3 font-mono text-xs uppercase tracking-widest text-cyan-400">
                  Workflow {i + 1}
                </div>
                <p className="leading-relaxed text-white/80">{u}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="mb-16">
          <h2
            className="mb-8 font-serif text-3xl italic text-cyan-400 md:text-4xl"
            style={{ fontFamily: "'Instrument Serif', serif" }}
          >
            Frequently asked questions
          </h2>
          <div className="space-y-4">
            {integration.faqs.map((faq, i) => (
              <details
                key={i}
                className="group rounded-xl border border-white/10 bg-white/[0.02] p-6 transition hover:border-cyan-500/30"
              >
                <summary className="cursor-pointer text-lg font-medium text-white">
                  {faq.q}
                </summary>
                <p className="mt-4 leading-relaxed text-white/70">{faq.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Get started CTA */}
        <section className="mb-16 rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-cyan-500/10 via-cyan-500/5 to-transparent p-10 text-center">
          <h2
            className="mb-4 font-serif text-3xl italic md:text-4xl"
            style={{ fontFamily: "'Instrument Serif', serif" }}
          >
            Get started with {integration.name}
          </h2>
          <p className="mx-auto mb-8 max-w-2xl text-lg text-white/70">
            {isAvailable
              ? `Connect Social Perks to ${integration.name} in under ten minutes. Free for 14 days, no credit card required.`
              : `Be first in line when the ${integration.name} integration launches. Join the waitlist and we'll email you when it's ready.`}
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/?cta=trial"
              className="inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-6 py-3 font-medium text-[#0C0F1A] transition hover:bg-cyan-400"
            >
              {isAvailable ? "Try free for 14 days" : "Join the waitlist"}
              <span aria-hidden>→</span>
            </Link>
            <Link
              href="/api/v1/docs/ui"
              className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-6 py-3 font-medium text-white transition hover:border-white/40"
            >
              Read the API docs
            </Link>
          </div>
        </section>

        {/* Related integrations */}
        {related.length > 0 && (
          <section className="mb-16">
            <h2
              className="mb-8 font-serif text-2xl italic text-white/80 md:text-3xl"
              style={{ fontFamily: "'Instrument Serif', serif" }}
            >
              Related integrations
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {related.map((r) => {
                const rInitial = r.name.charAt(0).toUpperCase();
                return (
                  <Link
                    key={r.slug}
                    href={`/integrations/platform/${r.slug}`}
                    className="group rounded-xl border border-white/10 bg-white/[0.02] p-5 transition hover:border-cyan-500/30 hover:bg-white/[0.04]"
                  >
                    <div className="mb-3 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/10 font-bold text-cyan-400 ring-1 ring-cyan-500/30">
                        {rInitial}
                      </div>
                      <div className="font-semibold text-white group-hover:text-cyan-400">
                        {r.name}
                      </div>
                    </div>
                    <p className="line-clamp-2 text-sm text-white/60">
                      {r.oneLiner}
                    </p>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}
