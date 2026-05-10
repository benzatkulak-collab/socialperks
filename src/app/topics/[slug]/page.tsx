import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Nav } from "@/components/shared/nav";
import { Footer } from "@/components/shared/footer";
import { TOPIC_HUBS, getTopic } from "@/lib/seo-pillars/topics";
import type { TopicLink } from "@/lib/seo-pillars/topics";

interface Params {
  slug: string;
}

export function generateStaticParams(): Params[] {
  return TOPIC_HUBS.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const topic = getTopic(slug);
  if (!topic) return { title: "Not Found · Social Perks" };

  const url = `https://socialperks.com/topics/${topic.slug}`;
  return {
    title: topic.metaTitle,
    description: topic.metaDescription,
    alternates: { canonical: url },
    openGraph: {
      title: topic.metaTitle,
      description: topic.metaDescription,
      url,
      type: "website",
      siteName: "Social Perks",
    },
    twitter: {
      card: "summary_large_image",
      title: topic.metaTitle,
      description: topic.metaDescription,
    },
  };
}

function LinkSection({
  title,
  links,
  emptyHref,
  emptyLabel,
  accent = "brand-cyan",
}: {
  title: string;
  links: TopicLink[];
  emptyHref?: string;
  emptyLabel?: string;
  accent?: string;
}) {
  if (links.length === 0 && !emptyHref) return null;
  return (
    <section className="mb-10">
      <h2 className={`mb-4 font-serif text-2xl italic text-brand-white`}>
        {title}
      </h2>
      {links.length > 0 ? (
        <ul className="grid gap-3 sm:grid-cols-2">
          {links.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                className={`group flex items-start gap-3 rounded-lg border border-white/10 bg-white/[0.02] p-4 transition hover:border-${accent}/40 hover:bg-white/[0.04]`}
              >
                <span className={`mt-0.5 text-${accent}`}>→</span>
                <span className="font-medium text-brand-white group-hover:text-brand-cyan">
                  {l.label}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        emptyHref && (
          <Link
            href={emptyHref}
            className="text-sm text-brand-cyan hover:underline"
          >
            {emptyLabel} →
          </Link>
        )
      )}
    </section>
  );
}

export default async function TopicPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const topic = getTopic(slug);
  if (!topic) notFound();

  const url = `https://socialperks.com/topics/${topic.slug}`;
  const allLinks = [
    ...topic.beginnerLinks,
    ...topic.toolLinks,
    ...topic.exampleLinks,
    ...topic.comparisonLinks,
    ...topic.glossaryLinks,
  ];

  // CollectionPage JSON-LD with itemList of all curated resources
  const collectionLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: topic.metaTitle,
    description: topic.metaDescription,
    url,
    mainEntity: {
      "@type": "ItemList",
      itemListElement: allLinks.map((l, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `https://socialperks.com${l.href}`,
        name: l.label,
      })),
    },
  };

  return (
    <div className="min-h-screen overflow-x-hidden">
      <Nav />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionLd) }}
      />

      <main
        id="main-content"
        className="mx-auto max-w-4xl px-6 py-16 md:py-24"
      >
        {/* Breadcrumb */}
        <nav className="mb-8 text-sm text-brand-text/60">
          <Link href="/" className="hover:text-brand-cyan">
            Home
          </Link>
          <span className="mx-2">/</span>
          <Link href="/topics" className="hover:text-brand-cyan">
            Topics
          </Link>
          <span className="mx-2">/</span>
          <span className="text-brand-text/80">{topic.topic}</span>
        </nav>

        {/* Header */}
        <header className="mb-10">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-brand-cyan/30 bg-brand-cyan/10 px-3 py-1 text-xs uppercase tracking-wider text-brand-cyan">
            Topic hub
          </div>
          <h1 className="font-serif text-4xl italic leading-tight text-brand-white md:text-5xl">
            {topic.topic} for Small Business: Complete Resource Hub
          </h1>
        </header>

        {/* Intro */}
        <section className="mb-12 space-y-4 text-lg leading-relaxed text-brand-text/85">
          {topic.intro.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </section>

        {/* Beginner's guide */}
        <LinkSection
          title="Beginner's guide"
          links={topic.beginnerLinks}
          emptyHref="/blog"
          emptyLabel="Browse the blog"
        />

        {/* Tools */}
        <LinkSection
          title="Tools"
          links={topic.toolLinks}
          emptyHref="/tools"
          emptyLabel="See all tools"
        />

        {/* Examples & case studies */}
        <LinkSection
          title="Examples & case studies"
          links={topic.exampleLinks}
          emptyHref="/case-studies"
          emptyLabel="Browse case studies"
        />

        {/* Comparisons */}
        <LinkSection
          title="Comparisons"
          links={topic.comparisonLinks}
          emptyHref="/vs"
          emptyLabel="See all comparisons"
        />

        {/* Glossary */}
        <LinkSection
          title="Glossary terms"
          links={topic.glossaryLinks}
          emptyHref="/glossary"
          emptyLabel="See full glossary"
        />

        {/* CTA */}
        <section className="mb-12 rounded-2xl border border-brand-cyan/30 bg-gradient-to-br from-brand-cyan/10 to-transparent p-8 text-center">
          <h2 className="mb-3 font-serif text-2xl italic text-brand-white">
            Run {topic.topic.toLowerCase()} on autopilot with Social Perks
          </h2>
          <p className="mx-auto mb-5 max-w-xl text-brand-text/80">
            {topic.ctaCopy}
          </p>
          <Link
            href="/ai"
            className="inline-block rounded-full bg-brand-cyan px-6 py-3 font-medium text-brand-bg transition hover:bg-brand-cyan/90"
          >
            Start free
          </Link>
        </section>

        {/* Other topics */}
        <section className="border-t border-white/10 pt-10">
          <h2 className="mb-5 font-serif text-xl italic text-brand-white">
            Explore other topics
          </h2>
          <div className="flex flex-wrap gap-2">
            {TOPIC_HUBS.filter((t) => t.slug !== topic.slug).map((t) => (
              <Link
                key={t.slug}
                href={`/topics/${t.slug}`}
                className="rounded-full border border-white/10 bg-white/[0.02] px-3 py-1 text-sm text-brand-text/80 transition hover:border-brand-cyan/40 hover:text-brand-cyan"
              >
                {t.topic}
              </Link>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
