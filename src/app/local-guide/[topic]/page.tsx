import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Nav } from "@/components/shared/nav";
import { Footer } from "@/components/shared/footer";
import {
  LOCAL_GUIDES,
  LOCAL_GUIDE_MAP,
} from "@/lib/programmatic-seo/local-guides";

const SITE_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://socialperks.onrender.com";

export function generateStaticParams() {
  return LOCAL_GUIDES.map((g) => ({ topic: g.slug }));
}

interface PageProps {
  params: Promise<{ topic: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { topic } = await params;
  const guide = LOCAL_GUIDE_MAP.get(topic);
  if (!guide) return {};
  const url = `${SITE_URL}/local-guide/${guide.slug}`;
  return {
    title: guide.metaTitle,
    description: guide.metaDescription,
    alternates: { canonical: url },
    openGraph: {
      title: guide.metaTitle,
      description: guide.metaDescription,
      type: "article",
      url,
      siteName: "Social Perks",
    },
  };
}

export default async function LocalGuidePage({ params }: PageProps) {
  const { topic } = await params;
  const guide = LOCAL_GUIDE_MAP.get(topic);
  if (!guide) notFound();

  const url = `${SITE_URL}/local-guide/${guide.slug}`;

  // JSON-LD: HowTo or Article
  const jsonLd =
    guide.schema === "HowTo"
      ? {
          "@context": "https://schema.org",
          "@type": "HowTo",
          name: guide.h1,
          description: guide.metaDescription,
          totalTime: "PT45M",
          step: guide.steps.map((s, i) => ({
            "@type": "HowToStep",
            position: i + 1,
            name: s.title,
            text: s.body,
          })),
          url,
        }
      : {
          "@context": "https://schema.org",
          "@type": "Article",
          headline: guide.h1,
          description: guide.metaDescription,
          author: { "@type": "Organization", name: "Social Perks" },
          publisher: { "@type": "Organization", name: "Social Perks" },
          mainEntityOfPage: url,
          url,
        };

  const otherGuides = LOCAL_GUIDES.filter((g) => g.slug !== guide.slug).slice(
    0,
    4,
  );

  return (
    <div className="min-h-screen overflow-x-hidden">
      <Nav />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* HERO */}
      <section
        className="relative overflow-hidden bg-brand-bg pt-32 pb-16 sm:pt-40 sm:pb-20"
        aria-label="Hero"
      >
        <div
          className="pointer-events-none absolute inset-0 animate-gradient bg-[length:300%_300%] bg-[linear-gradient(135deg,rgba(34,211,238,0.07),rgba(167,139,250,0.05),rgba(244,114,182,0.04),rgba(34,211,238,0.02))]"
          aria-hidden="true"
        />
        <div className="relative z-10 mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <nav
            className="mb-8 flex flex-wrap items-center gap-2 text-sm text-brand-muted"
            aria-label="Breadcrumb"
          >
            <Link href="/" className="transition-colors hover:text-brand-text">
              Home
            </Link>
            <span aria-hidden="true">/</span>
            <Link
              href="/local-guide"
              className="transition-colors hover:text-brand-text"
            >
              Local Guides
            </Link>
            <span aria-hidden="true">/</span>
            <span className="text-brand-cyan">{guide.h1}</span>
          </nav>

          <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.15em] text-brand-cyan sm:text-xs">
            Local marketing guide
          </p>
          <h1 className="font-heading text-[clamp(1.75rem,4.5vw,3.25rem)] italic leading-[1.1] tracking-tight text-brand-white">
            {guide.h1}
          </h1>
          <p className="mt-6 text-base leading-relaxed text-brand-dim sm:mt-8 sm:text-lg">
            {guide.intro}
          </p>
        </div>
      </section>

      {/* WHY IT MATTERS */}
      <section className="relative bg-brand-bg pb-12 sm:pb-16">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-border to-transparent"
          aria-hidden="true"
        />
        <div className="mx-auto max-w-3xl px-4 pt-12 sm:px-6 sm:pt-16 lg:px-8">
          <h2 className="font-heading text-[clamp(1.5rem,3vw,2rem)] italic leading-tight text-brand-white">
            Why it matters
          </h2>
          <ul className="mt-6 space-y-3">
            {guide.whyItMatters.map((w, i) => (
              <li
                key={i}
                className="flex items-start gap-3 rounded-xl border border-brand-border/40 bg-brand-surface/30 p-4 text-sm leading-relaxed text-brand-dim"
              >
                <span className="mt-0.5 font-mono text-xs font-semibold text-brand-cyan">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span>{w}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* STEPS */}
      <section className="relative bg-brand-bg pb-12 sm:pb-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-heading text-[clamp(1.5rem,3vw,2rem)] italic leading-tight text-brand-white">
            The playbook
          </h2>
          <ol className="mt-8 space-y-6">
            {guide.steps.map((s, i) => (
              <li
                key={i}
                className="rounded-xl border border-brand-border/40 bg-brand-surface/30 p-6"
              >
                <div className="flex items-baseline gap-3">
                  <span className="font-mono text-sm font-semibold text-brand-cyan">
                    Step {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
                <h3 className="mt-2 font-body text-lg font-medium text-brand-white">
                  {s.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-brand-dim">
                  {s.body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* PITFALLS */}
      <section className="relative bg-brand-bg pb-12 sm:pb-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-heading text-[clamp(1.5rem,3vw,2rem)] italic leading-tight text-brand-white">
            Pitfalls to avoid
          </h2>
          <ul className="mt-6 space-y-3">
            {guide.pitfalls.map((p, i) => (
              <li
                key={i}
                className="flex items-start gap-3 rounded-xl border border-orange-400/20 bg-orange-400/5 p-4 text-sm leading-relaxed text-brand-dim"
              >
                <span className="mt-0.5 font-mono text-xs font-semibold text-orange-400">
                  !
                </span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* TOOLS */}
      <section className="relative bg-brand-bg pb-12 sm:pb-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-heading text-[clamp(1.5rem,3vw,2rem)] italic leading-tight text-brand-white">
            Tools you'll need
          </h2>
          <p className="mt-2 text-sm text-brand-muted">
            Free Social Perks tools that pair with this playbook.
          </p>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {guide.tools.map((t) => (
              <li key={t.href}>
                <Link
                  href={t.href}
                  className="group flex h-full flex-col rounded-xl border border-brand-border/40 bg-brand-surface/30 px-5 py-4 transition-all hover:-translate-y-0.5 hover:border-brand-border/70 hover:bg-brand-surface/50"
                >
                  <span className="font-body text-base font-medium text-brand-white">
                    {t.name}
                  </span>
                  <span className="mt-2 block text-sm leading-relaxed text-brand-dim">
                    {t.blurb}
                  </span>
                  <span className="mt-3 font-mono text-[11px] uppercase tracking-[0.12em] text-brand-cyan">
                    Open tool &rarr;
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-6">
            <Link
              href="/tools"
              className="font-mono text-xs uppercase tracking-[0.12em] text-brand-cyan hover:text-brand-text"
            >
              All tools &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* INDUSTRIES */}
      <section className="relative bg-brand-bg pb-12 sm:pb-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-heading text-[clamp(1.5rem,3vw,2rem)] italic leading-tight text-brand-white">
            Industries this works best for
          </h2>
          <ul className="mt-6 space-y-3">
            {guide.industries.map((ind) => (
              <li key={ind.slug}>
                <Link
                  href={`/industry/${ind.slug}`}
                  className="group flex flex-col rounded-xl border border-brand-border/40 bg-brand-surface/30 px-5 py-4 transition-all hover:-translate-y-0.5 hover:border-brand-border/70 hover:bg-brand-surface/50"
                >
                  <span className="font-body text-base font-medium text-brand-white">
                    {ind.name}
                  </span>
                  <span className="mt-1 block text-sm leading-relaxed text-brand-dim">
                    {ind.why}
                  </span>
                  <span className="mt-2 font-mono text-[11px] uppercase tracking-[0.12em] text-brand-cyan">
                    {ind.name} playbook &rarr;
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* CTA */}
      <section className="relative bg-brand-bg pb-12 sm:pb-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-brand-border/40 bg-brand-surface/30 p-8">
            <p className="text-sm leading-relaxed text-brand-dim sm:text-base">
              {guide.closing}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/?signup=1"
                className="rounded-xl bg-brand-cyan px-5 py-3 font-mono text-sm font-semibold text-brand-bg transition-all hover:-translate-y-0.5"
              >
                Start a perk campaign
              </Link>
              <Link
                href="/local-guide"
                className="rounded-xl border border-brand-border/40 bg-brand-surface/30 px-5 py-3 text-sm text-brand-text transition-all hover:-translate-y-0.5 hover:border-brand-border/70"
              >
                More local guides
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* OTHER GUIDES */}
      <section className="relative bg-brand-bg pb-20 sm:pb-28">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-heading text-[clamp(1.5rem,3vw,2rem)] italic leading-tight text-brand-white">
            More local guides
          </h2>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {otherGuides.map((g) => (
              <li key={g.slug}>
                <Link
                  href={`/local-guide/${g.slug}`}
                  className="group flex h-full flex-col rounded-xl border border-brand-border/40 bg-brand-surface/30 px-5 py-4 transition-all hover:-translate-y-0.5 hover:border-brand-border/70 hover:bg-brand-surface/50"
                >
                  <span className="font-body text-base font-medium text-brand-white">
                    {g.h1}
                  </span>
                  <span className="mt-2 block text-sm leading-snug text-brand-dim">
                    {g.metaDescription.split(".")[0]}.
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <Footer />
    </div>
  );
}
