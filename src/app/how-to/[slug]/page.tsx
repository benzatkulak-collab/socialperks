import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Nav } from "@/components/shared/nav";
import { Footer } from "@/components/shared/footer";
import { GUIDES, getGuide } from "@/lib/howto/guides";
import { ReadingProgress } from "./reading-progress";

interface Params {
  slug: string;
}

export function generateStaticParams(): Params[] {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const g = getGuide(slug);
  if (!g) return {};

  const title = `${g.title} · Social Perks`;
  return {
    title,
    description: g.description,
    alternates: { canonical: `https://socialperks.io/how-to/${g.slug}` },
    openGraph: {
      title: g.title,
      description: g.description,
      url: `https://socialperks.io/how-to/${g.slug}`,
      siteName: "Social Perks",
      type: "article",
    },
  };
}

export default async function GuidePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const g = getGuide(slug);
  if (!g) notFound();

  const url = `https://socialperks.io/how-to/${g.slug}`;

  // HowTo JSON-LD (the critical one for rich snippets)
  const howToJsonLd = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: g.h1,
    description: g.description,
    totalTime: `PT${g.timeMinutes}M`,
    url,
    step: g.steps.map((s, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: s.title,
      text: s.body,
      url: `${url}#step-${i + 1}`,
    })),
    supply: g.prerequisites.map((p) => ({
      "@type": "HowToSupply",
      name: p,
    })),
  };

  // FAQ JSON-LD
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: g.faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <div className="min-h-screen overflow-x-hidden">
      <Nav />
      <ReadingProgress />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <main
        id="main-content"
        className="mx-auto max-w-3xl px-6 py-16 md:py-24"
      >
        {/* Breadcrumb */}
        <nav className="mb-6 text-sm text-brand-text/60">
          <Link href="/" className="hover:text-brand-cyan">
            Home
          </Link>
          <span className="mx-2">/</span>
          <Link href="/how-to" className="hover:text-brand-cyan">
            How-to
          </Link>
          <span className="mx-2">/</span>
          <span className="text-brand-text/80">{g.category}</span>
        </nav>

        {/* Header */}
        <header className="mb-10">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-brand-cyan/30 bg-brand-cyan/10 px-3 py-1 text-xs uppercase tracking-wider text-brand-cyan">
            {g.category}
          </div>
          <h1 className="font-serif text-4xl italic leading-tight text-brand-white md:text-5xl">
            {g.h1}
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-brand-text/60">
            <span className="font-mono text-brand-cyan">
              {g.timeMinutes} min read
            </span>
            <span>·</span>
            <span>{g.difficulty}</span>
            <span>·</span>
            <span>{g.steps.length} steps</span>
          </div>
        </header>

        {/* What you'll learn */}
        <section className="mb-8 rounded-2xl border border-brand-cyan/20 bg-gradient-to-br from-brand-cyan/[0.06] to-transparent p-6">
          <h2 className="mb-3 font-serif text-xl italic text-brand-white">
            What you&apos;ll learn
          </h2>
          <ul className="space-y-2">
            {g.learn.map((l, i) => (
              <li key={i} className="flex gap-2 text-brand-text/85">
                <span className="text-brand-cyan">→</span>
                <span>{l}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Before you start */}
        <section className="mb-8 rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <h2 className="mb-3 font-serif text-xl italic text-brand-white">
            Before you start
          </h2>
          <ul className="space-y-2">
            {g.prerequisites.map((p, i) => (
              <li key={i} className="flex gap-2 text-brand-text/85">
                <span className="text-brand-text/40">□</span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Intro */}
        <section className="mb-10">
          <p className="text-lg leading-relaxed text-brand-text/85">
            {g.intro}
          </p>
        </section>

        {/* Steps */}
        <section className="mb-12">
          <h2 className="mb-6 font-serif text-3xl italic text-brand-white">
            The steps
          </h2>
          <ol className="space-y-8">
            {g.steps.map((s, i) => (
              <li
                key={i}
                id={`step-${i + 1}`}
                className="rounded-2xl border border-white/10 bg-white/[0.02] p-6"
              >
                <div className="mb-3 flex items-baseline gap-3">
                  <span className="font-mono text-sm text-brand-cyan">
                    Step {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
                <h3 className="mb-3 font-serif text-2xl italic text-brand-white">
                  {s.title}
                </h3>
                <p className="leading-relaxed text-brand-text/85">{s.body}</p>

                {/* Screenshot placeholder */}
                <div
                  aria-hidden
                  className="my-4 flex h-32 items-center justify-center rounded-lg border border-dashed border-white/10 bg-white/[0.015] text-xs text-brand-text/40"
                >
                  Screenshot · Step {i + 1}
                </div>

                {s.tip ? (
                  <div className="mt-4 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.06] p-4 text-sm text-brand-text/85">
                    <span className="mr-2 font-mono text-xs uppercase tracking-wider text-emerald-400">
                      Tip
                    </span>
                    {s.tip}
                  </div>
                ) : null}

                {s.mistake ? (
                  <div className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/[0.06] p-4 text-sm text-brand-text/85">
                    <span className="mr-2 font-mono text-xs uppercase tracking-wider text-amber-400">
                      Common mistake
                    </span>
                    {s.mistake}
                  </div>
                ) : null}
              </li>
            ))}
          </ol>
        </section>

        {/* FAQ */}
        <section className="mb-12">
          <h2 className="mb-6 font-serif text-3xl italic text-brand-white">
            Common questions
          </h2>
          <div className="space-y-3">
            {g.faqs.map((f, i) => (
              <details
                key={i}
                className="group rounded-xl border border-white/10 bg-white/[0.02] p-5 open:bg-white/[0.04]"
              >
                <summary className="cursor-pointer list-none font-medium text-brand-white">
                  <span className="mr-2 text-brand-cyan group-open:hidden">
                    +
                  </span>
                  <span className="mr-2 hidden text-brand-cyan group-open:inline">
                    −
                  </span>
                  {f.q}
                </summary>
                <p className="mt-3 leading-relaxed text-brand-text/80">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* What to do next CTA */}
        <section className="mb-12 rounded-2xl border border-brand-cyan/30 bg-gradient-to-br from-brand-cyan/10 to-transparent p-8 text-center">
          <h2 className="mb-3 font-serif text-2xl italic text-brand-white">
            What to do next
          </h2>
          <p className="mb-5 text-brand-text/80">{g.nextCta.body}</p>
          <Link
            href={g.nextCta.href}
            className="inline-block rounded-full bg-brand-cyan px-6 py-3 font-medium text-brand-bg transition hover:bg-brand-cyan/90"
          >
            {g.nextCta.label}
          </Link>
        </section>

        {/* More guides */}
        <section className="border-t border-white/10 pt-10">
          <h2 className="mb-4 font-serif text-2xl italic text-brand-white">
            More guides in {g.category}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {GUIDES.filter(
              (other) => other.category === g.category && other.slug !== g.slug,
            )
              .slice(0, 4)
              .map((other) => (
                <Link
                  key={other.slug}
                  href={`/how-to/${other.slug}`}
                  className="group rounded-lg border border-white/10 bg-white/[0.02] p-4 transition hover:border-brand-cyan/40 hover:bg-white/[0.04]"
                >
                  <div className="font-medium text-brand-white group-hover:text-brand-cyan">
                    {other.title} →
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-brand-text/60">
                    {other.description}
                  </p>
                </Link>
              ))}
          </div>
          <div className="mt-6 text-center">
            <Link
              href="/how-to"
              className="text-sm text-brand-cyan hover:underline"
            >
              See all 30 how-to guides →
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
