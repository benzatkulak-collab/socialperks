import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Nav } from "@/components/shared/nav";
import { Footer } from "@/components/shared/footer";
import {
  DIY_METHODS,
  getDIYMethod,
  getOtherDIYMethods,
} from "@/lib/instead-of/data";

interface Params {
  method: string;
}

export function generateStaticParams(): Params[] {
  return DIY_METHODS.map((m) => ({ method: m.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { method: slug } = await params;
  const m = getDIYMethod(slug);
  if (!m) return {};

  const title = `Social Perks vs ${m.displayName}: Which Should Your Business Use? (2026)`;
  const description = `An honest comparison of ${m.name} and Social Perks. Pros, cons, real cost math, when to stick with ${m.name}, when to switch, and how migration works.`;

  return {
    title,
    description,
    alternates: {
      canonical: `https://socialperks.app/instead-of/${m.slug}`,
    },
    openGraph: {
      title,
      description,
      url: `https://socialperks.app/instead-of/${m.slug}`,
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

export default async function InsteadOfMethodPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { method: slug } = await params;
  const m = getDIYMethod(slug);
  if (!m) notFound();

  const others = getOtherDIYMethods(m.slug, 4);

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `Social Perks vs ${m.displayName}: Which Should Your Business Use?`,
    description: `Honest comparison of ${m.name} and Social Perks — pros, cons, cost math, migration guide, and FAQs.`,
    author: { "@type": "Organization", name: "Social Perks" },
    publisher: {
      "@type": "Organization",
      name: "Social Perks",
      logo: {
        "@type": "ImageObject",
        url: "https://socialperks.app/icon-192.png",
      },
    },
    mainEntityOfPage: `https://socialperks.app/instead-of/${m.slug}`,
    about: [
      { "@type": "SoftwareApplication", name: "Social Perks" },
      { "@type": "Thing", name: m.displayName },
    ],
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: m.faqs.map((f) => ({
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
          <Link href="/instead-of" className="hover:text-brand-cyan">
            Instead of
          </Link>
          <span className="mx-2">/</span>
          <span className="text-brand-text/80">{m.displayName}</span>
        </nav>

        {/* Hero */}
        <header className="mb-12">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand-cyan/30 bg-brand-cyan/10 px-3 py-1 text-xs uppercase tracking-wider text-brand-cyan">
            {m.category}
          </div>
          <h1 className="font-serif text-4xl italic leading-tight text-brand-white md:text-5xl">
            Social Perks vs {m.displayName}:
            <br />
            <span className="text-brand-cyan">
              Which Should Your Business Use?
            </span>
          </h1>
          <p className="mt-6 text-lg text-brand-text/80">
            If you&apos;re currently using {m.name}, you&apos;re not doing
            anything wrong — most small businesses start there. The question
            isn&apos;t whether it works, but whether it&apos;s still the right
            tool for where your business is now. {m.description}
          </p>
          <p className="mt-3 text-sm text-brand-text/50">
            Last updated May 2026 · 7 min read
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/ai"
              className="rounded-full bg-brand-cyan px-6 py-3 font-medium text-brand-bg transition hover:bg-brand-cyan/90"
            >
              Try Social Perks free for 14 days
            </Link>
            <Link
              href="/pricing"
              className="rounded-full border border-white/20 px-6 py-3 font-medium text-brand-white transition hover:border-brand-cyan hover:text-brand-cyan"
            >
              See pricing
            </Link>
          </div>
        </header>

        {/* What's good about it */}
        <section className="mb-14">
          <h2 className="mb-4 font-serif text-3xl italic text-brand-white">
            What&apos;s good about {m.name}
          </h2>
          <p className="mb-6 text-brand-text/70">
            The reason this approach is so common — these are real benefits,
            not consolation prizes:
          </p>
          <ul className="space-y-3">
            {m.pros.map((pro, i) => (
              <li
                key={i}
                className="flex gap-3 rounded-lg border border-emerald-400/20 bg-emerald-400/[0.04] p-4"
              >
                <span className="mt-1 text-emerald-400">✓</span>
                <span className="text-brand-text/90">{pro}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Where it breaks down */}
        <section className="mb-14">
          <h2 className="mb-4 font-serif text-3xl italic text-brand-white">
            Where {m.name} breaks down
          </h2>
          <p className="mb-6 text-brand-text/70">
            The four issues that show up consistently once a business grows
            past the very early stage:
          </p>
          <ol className="space-y-4">
            {m.cons.map((con, i) => (
              <li
                key={i}
                className="flex gap-4 rounded-lg border border-white/10 bg-white/[0.02] p-5"
              >
                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-amber-400/40 bg-amber-400/10 font-mono text-sm text-amber-400">
                  {i + 1}
                </span>
                <span className="text-brand-text/80">{con}</span>
              </li>
            ))}
          </ol>
        </section>

        {/* What Social Perks does differently */}
        <section className="mb-14">
          <h2 className="mb-4 font-serif text-3xl italic text-brand-white">
            What Social Perks does differently
          </h2>
          <p className="mb-6 text-brand-text/70">
            Five concrete differences — these are the levers that change the
            math, not generic feature claims:
          </p>
          <ul className="space-y-3">
            {m.differentiators.map((point, i) => (
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

        {/* The math */}
        <section className="mb-14">
          <h2 className="mb-4 font-serif text-3xl italic text-brand-white">
            The math
          </h2>
          <p className="mb-6 text-brand-text/70">
            Concrete cost and time comparison. Your numbers will vary — these
            are the order-of-magnitude figures we see most often:
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            {/* DIY side */}
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
              <div className="mb-2 text-xs uppercase tracking-wider text-brand-text/60">
                Current method
              </div>
              <div className="mb-3 font-serif text-2xl italic text-brand-white">
                {m.mathExample.diyLabel}
              </div>
              <div className="mb-3 font-mono text-2xl text-amber-400">
                {m.mathExample.diyCost}
              </div>
              <p className="text-sm text-brand-text/80">
                {m.mathExample.diyBreakdown}
              </p>
            </div>

            {/* Social Perks side */}
            <div className="rounded-xl border border-brand-cyan/30 bg-brand-cyan/[0.04] p-6">
              <div className="mb-2 text-xs uppercase tracking-wider text-brand-cyan">
                Social Perks
              </div>
              <div className="mb-3 font-serif text-2xl italic text-brand-white">
                {m.mathExample.socialPerksLabel}
              </div>
              <div className="mb-3 font-mono text-2xl text-brand-cyan">
                {m.mathExample.socialPerksCost}
              </div>
              <p className="text-sm text-brand-text/80">
                {m.mathExample.socialPerksBreakdown}
              </p>
            </div>
          </div>
          <p className="mt-6 rounded-lg border border-amber-400/20 bg-amber-400/[0.04] p-4 text-sm text-brand-text/80">
            <span className="font-medium text-amber-400">Honest note: </span>
            {m.mathExample.honestNote}
          </p>
        </section>

        {/* When to stick */}
        <section className="mb-14">
          <h2 className="mb-4 font-serif text-3xl italic text-brand-white">
            When to stick with {m.name}
          </h2>
          <p className="mb-6 text-brand-text/70">
            We&apos;d rather you stay than churn in month two. If any of these
            describe you, the switch probably isn&apos;t worth it yet:
          </p>
          <ul className="space-y-3">
            {m.whenToStick.map((reason, i) => (
              <li
                key={i}
                className="flex gap-3 rounded-lg border border-white/10 bg-white/[0.02] p-4"
              >
                <span className="mt-1 text-brand-text/60">·</span>
                <span className="text-brand-text/80">{reason}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* When to switch */}
        <section className="mb-14">
          <h2 className="mb-4 font-serif text-3xl italic text-brand-white">
            When to switch
          </h2>
          <p className="mb-6 text-brand-text/70">
            The volume and use-case thresholds where Social Perks starts paying
            for itself:
          </p>
          <ul className="space-y-3">
            {m.whenToSwitch.map((reason, i) => (
              <li
                key={i}
                className="flex gap-3 rounded-lg border border-brand-cyan/20 bg-brand-cyan/[0.04] p-4"
              >
                <span className="mt-1 text-brand-cyan">→</span>
                <span className="text-brand-text/90">{reason}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* How to migrate */}
        <section className="mb-14">
          <h2 className="mb-4 font-serif text-3xl italic text-brand-white">
            How to migrate
          </h2>
          <p className="mb-6 text-brand-text/70">
            Three steps. Most businesses finish the move in a single afternoon
            — you can keep your current method running in parallel for the
            first two weeks if you want.
          </p>
          <div className="space-y-4">
            {m.migrationSteps.map((step, i) => (
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

        {/* FAQ */}
        <section className="mb-14">
          <h2 className="mb-6 font-serif text-3xl italic text-brand-white">
            FAQ: Switching from {m.name}
          </h2>
          <div className="space-y-3">
            {m.faqs.map((faq, i) => (
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
            No credit card. No demo. Run your first campaign in under 10
            minutes and keep your current {m.name} workflow in parallel until
            you trust the numbers.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/ai"
              className="rounded-full bg-brand-cyan px-6 py-3 font-medium text-brand-bg transition hover:bg-brand-cyan/90"
            >
              Start free
            </Link>
            <Link
              href="/instead-of"
              className="rounded-full border border-white/20 px-6 py-3 font-medium text-brand-white transition hover:border-brand-cyan hover:text-brand-cyan"
            >
              See all methods
            </Link>
          </div>
        </section>

        {/* Other methods */}
        <section className="border-t border-white/10 pt-12">
          <h2 className="mb-6 font-serif text-2xl italic text-brand-white">
            Other methods you might be replacing
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {others.map((o) => (
              <Link
                key={o.slug}
                href={`/instead-of/${o.slug}`}
                className="group rounded-lg border border-white/10 bg-white/[0.02] p-4 transition hover:border-brand-cyan/40 hover:bg-white/[0.04]"
              >
                <div className="text-xs uppercase tracking-wider text-brand-text/60">
                  {o.category}
                </div>
                <div className="mt-1 font-medium text-brand-white group-hover:text-brand-cyan">
                  Instead of {o.displayName} →
                </div>
              </Link>
            ))}
          </div>
          <div className="mt-6 text-center">
            <Link
              href="/instead-of"
              className="text-sm text-brand-cyan hover:underline"
            >
              See all methods →
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
