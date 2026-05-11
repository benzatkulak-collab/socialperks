import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Nav } from "@/components/shared/nav";
import { Footer } from "@/components/shared/footer";
import {
  ALTERNATIVES,
  getAlternative,
  getOtherAlternatives,
} from "@/lib/alternatives/data";

interface Params {
  competitor: string;
}

export function generateStaticParams(): Params[] {
  return ALTERNATIVES.map((a) => ({ competitor: a.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { competitor: slug } = await params;
  const alt = getAlternative(slug);
  if (!alt) return {};

  const title = `${alt.name} Alternative: Try Social Perks Free for 14 Days (2026)`;
  const description = `Looking for a ${alt.name} alternative? Why small businesses switch to Social Perks: lower pricing, AI campaign generation, bundled features. Free for 14 days, no credit card.`;

  return {
    title,
    description,
    alternates: {
      canonical: `https://socialperks.io/alternatives/${alt.slug}`,
    },
    openGraph: {
      title,
      description,
      url: `https://socialperks.io/alternatives/${alt.slug}`,
      siteName: "Social Perks",
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function AlternativePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { competitor: slug } = await params;
  const alt = getAlternative(slug);
  if (!alt) notFound();

  const others = getOtherAlternatives(alt.slug, 4);

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `Looking for a ${alt.name} Alternative? Try Social Perks Free for 14 Days`,
    description: `Why small businesses switch from ${alt.name} to Social Perks. Migration guide, pricing comparison, and honest tradeoffs.`,
    author: { "@type": "Organization", name: "Social Perks" },
    publisher: {
      "@type": "Organization",
      name: "Social Perks",
      logo: {
        "@type": "ImageObject",
        url: "https://socialperks.io/icon-192.png",
      },
    },
    mainEntityOfPage: `https://socialperks.io/alternatives/${alt.slug}`,
    about: [
      { "@type": "SoftwareApplication", name: "Social Perks" },
      { "@type": "SoftwareApplication", name: alt.name },
    ],
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: alt.faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.a,
      },
    })),
  };

  return (
    <div className="min-h-screen overflow-x-hidden">
      <Nav />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <main id="main-content" className="mx-auto max-w-4xl px-6 py-16 md:py-24">
        {/* Breadcrumb */}
        <nav className="mb-8 text-sm text-brand-text/60">
          <Link href="/" className="hover:text-brand-cyan">
            Home
          </Link>
          <span className="mx-2">/</span>
          <Link href="/alternatives" className="hover:text-brand-cyan">
            Alternatives
          </Link>
          <span className="mx-2">/</span>
          <span className="text-brand-text/80">{alt.name}</span>
        </nav>

        {/* Hero */}
        <header className="mb-12">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand-cyan/30 bg-brand-cyan/10 px-3 py-1 text-xs uppercase tracking-wider text-brand-cyan">
            {alt.categoryLabel} alternative
          </div>
          <h1 className="font-serif text-4xl italic leading-tight text-brand-white md:text-5xl">
            Looking for a {alt.name} Alternative?
            <br />
            <span className="text-brand-cyan">
              Try Social Perks Free for 14 Days
            </span>
          </h1>
          <p className="mt-6 text-lg text-brand-text/80">
            Switching from {alt.name}? Here&apos;s why small businesses make the
            switch. {alt.name}: {alt.oneLiner}
          </p>
          <p className="mt-3 text-sm text-brand-text/50">
            Last updated May 2026 · 7 min read
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/ai"
              className="rounded-full bg-brand-cyan px-6 py-3 font-medium text-brand-bg transition hover:bg-brand-cyan/90"
            >
              Start free — no credit card
            </Link>
            <Link
              href="/pricing"
              className="rounded-full border border-white/20 px-6 py-3 font-medium text-brand-white transition hover:border-brand-cyan hover:text-brand-cyan"
            >
              See pricing
            </Link>
          </div>
        </header>

        {/* Why people switch */}
        <section className="mb-14">
          <h2 className="mb-4 font-serif text-3xl italic text-brand-white">
            Why people switch from {alt.name}
          </h2>
          <p className="mb-6 text-brand-text/70">
            We talk to dozens of {alt.name} customers every month. These are the
            four reasons that come up most often:
          </p>
          <ol className="space-y-4">
            {alt.whyPeopleSwitch.map((reason, i) => (
              <li
                key={i}
                className="flex gap-4 rounded-lg border border-white/10 bg-white/[0.02] p-5"
              >
                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-amber-400/40 bg-amber-400/10 font-mono text-sm text-amber-400">
                  {i + 1}
                </span>
                <span className="text-brand-text/80">{reason}</span>
              </li>
            ))}
          </ol>
        </section>

        {/* What we do differently */}
        <section className="mb-14">
          <h2 className="mb-4 font-serif text-3xl italic text-brand-white">
            What Social Perks does differently
          </h2>
          <p className="mb-6 text-brand-text/70">
            Five concrete differentiators — not generic claims:
          </p>
          <ul className="space-y-3">
            {alt.whatWeDoDifferently.map((point, i) => (
              <li
                key={i}
                className="flex gap-3 rounded-lg border border-brand-cyan/20 bg-brand-cyan/[0.04] p-4"
              >
                <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-brand-cyan" />
                <span className="text-brand-text/90">{point}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Migration steps */}
        <section className="mb-14">
          <h2 className="mb-4 font-serif text-3xl italic text-brand-white">
            How migration works
          </h2>
          <p className="mb-6 text-brand-text/70">
            Three steps. Most brands complete the full migration in 1–2 business
            days.
          </p>
          <div className="space-y-4">
            {alt.migrationSteps.map((step, i) => (
              <div
                key={i}
                className="rounded-xl border border-white/10 bg-white/[0.02] p-6"
              >
                <div className="mb-2 flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-cyan font-mono text-xs text-brand-bg">
                    {i + 1}
                  </span>
                  <h3 className="font-serif text-xl italic text-brand-white">
                    {step.title}
                  </h3>
                </div>
                <p className="ml-10 text-brand-text/80">{step.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* What you get */}
        <section className="mb-14">
          <h2 className="mb-4 font-serif text-3xl italic text-brand-white">
            What you get with Social Perks that {alt.name} doesn&apos;t
          </h2>
          <ul className="space-y-3">
            {alt.whatYouGet.map((feature, i) => (
              <li
                key={i}
                className="flex gap-3 rounded-lg border border-brand-cyan/20 bg-brand-cyan/[0.04] p-4"
              >
                <span className="mt-1 text-brand-cyan">✓</span>
                <span className="text-brand-text/90">{feature}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* What you give up */}
        <section className="mb-14">
          <h2 className="mb-4 font-serif text-3xl italic text-brand-white">
            What you&apos;d give up by switching
          </h2>
          <p className="mb-6 text-brand-text/70">
            Honest tradeoffs. We&apos;d rather you know up front than discover
            them in week two:
          </p>
          <ul className="space-y-3">
            {alt.whatYouGiveUp.map((tradeoff, i) => (
              <li
                key={i}
                className="flex gap-3 rounded-lg border border-amber-400/20 bg-amber-400/[0.04] p-4"
              >
                <span className="mt-1 text-amber-400">!</span>
                <span className="text-brand-text/80">{tradeoff}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Pricing comparison */}
        <section className="mb-14">
          <h2 className="mb-6 font-serif text-3xl italic text-brand-white">
            Pricing comparison
          </h2>
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/[0.04] text-xs uppercase tracking-wider text-brand-text/60">
                <tr>
                  <th className="px-5 py-4 font-medium">Plan / feature</th>
                  <th className="px-5 py-4 font-medium text-brand-cyan">
                    Social Perks
                  </th>
                  <th className="px-5 py-4 font-medium">{alt.name}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {alt.pricingTable.map((row) => (
                  <tr key={row.feature} className="hover:bg-white/[0.02]">
                    <td className="px-5 py-4 font-medium text-brand-white">
                      {row.feature}
                    </td>
                    <td className="px-5 py-4 text-brand-text/80">
                      {row.socialPerks}
                    </td>
                    <td className="px-5 py-4 text-brand-text/80">
                      {row.competitor}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* FAQ */}
        <section className="mb-14">
          <h2 className="mb-6 font-serif text-3xl italic text-brand-white">
            FAQ: Switching from {alt.name}
          </h2>
          <div className="space-y-3">
            {alt.faqs.map((faq, i) => (
              <details
                key={i}
                className="group rounded-lg border border-white/10 bg-white/[0.02] p-5 open:border-brand-cyan/30"
              >
                <summary className="cursor-pointer list-none font-medium text-brand-white">
                  <span className="mr-3 text-brand-cyan">+</span>
                  {faq.q}
                </summary>
                <p className="mt-3 pl-7 text-brand-text/80">{faq.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className="mb-14 rounded-2xl border border-brand-cyan/30 bg-gradient-to-br from-brand-cyan/10 to-transparent p-8 text-center md:p-12">
          <h2 className="mb-4 font-serif text-3xl italic text-brand-white md:text-4xl">
            Try Social Perks free for 14 days
          </h2>
          <p className="mx-auto mb-6 max-w-xl text-brand-text/80">
            No credit card. No demo. Import your {alt.name} data in 30 minutes
            and run your first AI-generated campaign in under 10. Keep the free
            tier as long as you want.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/ai"
              className="rounded-full bg-brand-cyan px-6 py-3 font-medium text-brand-bg transition hover:bg-brand-cyan/90"
            >
              Start free
            </Link>
            <Link
              href={`/vs/${alt.slug}`}
              className="rounded-full border border-white/20 px-6 py-3 font-medium text-brand-white transition hover:border-brand-cyan hover:text-brand-cyan"
            >
              See full {alt.name} comparison
            </Link>
          </div>
        </section>

        {/* Other alternatives */}
        <section className="border-t border-white/10 pt-12">
          <h2 className="mb-6 font-serif text-2xl italic text-brand-white">
            Other alternatives you might be evaluating
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {others.map((o) => (
              <Link
                key={o.slug}
                href={`/alternatives/${o.slug}`}
                className="group rounded-lg border border-white/10 bg-white/[0.02] p-4 transition hover:border-brand-cyan/40 hover:bg-white/[0.04]"
              >
                <div className="text-xs uppercase tracking-wider text-brand-text/60">
                  {o.categoryLabel}
                </div>
                <div className="mt-1 font-medium text-brand-white group-hover:text-brand-cyan">
                  {o.name} alternative →
                </div>
              </Link>
            ))}
          </div>
          <div className="mt-6 text-center">
            <Link
              href="/alternatives"
              className="text-sm text-brand-cyan hover:underline"
            >
              See all alternatives →
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
