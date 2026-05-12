import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Nav } from "@/components/shared/nav";
import { Footer } from "@/components/shared/footer";
import {
  STORIES,
  getStoryBySlug,
  type StoryBlock,
} from "@/lib/stories/data";
import { ReadingProgress } from "@/app/how-to/[slug]/reading-progress";

interface Params {
  slug: string;
}

export function generateStaticParams(): Params[] {
  return STORIES.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const story = getStoryBySlug(slug);
  if (!story) return {};

  const url = `https://socialperks.app/stories/${story.slug}`;
  return {
    title: `${story.title} · Social Perks Stories`,
    description: story.excerpt,
    alternates: { canonical: url },
    openGraph: {
      title: story.title,
      description: story.excerpt,
      url,
      siteName: "Social Perks",
      type: "article",
      publishedTime: story.publishedAt,
    },
    twitter: {
      card: "summary_large_image",
      title: story.title,
      description: story.excerpt,
    },
  };
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function renderBlock(block: StoryBlock, i: number) {
  switch (block.type) {
    case "p":
      return (
        <p
          key={i}
          className="my-5 text-base leading-relaxed text-brand-text/85 md:text-lg"
        >
          {block.text}
        </p>
      );
    case "h2":
      return (
        <h2
          key={i}
          className="mb-4 mt-12 font-serif text-2xl italic leading-snug text-brand-white md:text-3xl"
        >
          {block.text}
        </h2>
      );
    case "quote":
      return (
        <blockquote
          key={i}
          className="my-6 border-l-2 border-brand-cyan/60 bg-brand-cyan/[0.04] px-5 py-3 font-serif text-lg italic leading-relaxed text-brand-white"
        >
          {block.text}
        </blockquote>
      );
    case "ul":
      return (
        <ul key={i} className="my-5 space-y-2 pl-5">
          {block.items.map((item, j) => (
            <li
              key={j}
              className="relative list-none pl-5 text-base leading-relaxed text-brand-text/85 md:text-lg"
            >
              <span
                aria-hidden
                className="absolute left-0 top-[0.55em] inline-block h-1.5 w-1.5 rounded-full bg-brand-cyan"
              />
              {item}
            </li>
          ))}
        </ul>
      );
    default:
      return null;
  }
}

export default async function StoryPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const story = getStoryBySlug(slug);
  if (!story) notFound();

  const url = `https://socialperks.app/stories/${story.slug}`;

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: story.title,
    description: story.excerpt,
    datePublished: story.publishedAt,
    dateModified: story.publishedAt,
    author: {
      "@type": "Organization",
      name: "Social Perks Community",
    },
    publisher: {
      "@type": "Organization",
      name: "Social Perks",
      url: "https://socialperks.app",
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    url,
    articleSection: story.categoryLabel,
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://socialperks.app",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Stories",
        item: "https://socialperks.app/stories",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: story.title,
        item: url,
      },
    ],
  };

  const related = STORIES.filter(
    (s) => s.category === story.category && s.slug !== story.slug,
  ).slice(0, 3);

  return (
    <div className="min-h-screen overflow-x-hidden">
      <Nav />
      <ReadingProgress />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
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
          <Link href="/stories" className="hover:text-brand-cyan">
            Stories
          </Link>
          <span className="mx-2">/</span>
          <span className="text-brand-text/80">{story.categoryLabel}</span>
        </nav>

        {/* Header */}
        <header className="mb-10">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand-cyan/30 bg-brand-cyan/10 px-3 py-1 text-xs uppercase tracking-wider text-brand-cyan">
            {story.categoryLabel}
          </div>
          <h1 className="font-serif text-4xl italic leading-tight text-brand-white md:text-5xl lg:text-6xl">
            {story.title}
          </h1>
          <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-brand-text/60">
            <span className="text-brand-text/85">{story.authorPersona}</span>
            <span aria-hidden>·</span>
            <span>{formatDate(story.publishedAt)}</span>
            <span aria-hidden>·</span>
            <span className="font-mono text-brand-cyan">
              {story.readingMinutes} min read
            </span>
          </div>
        </header>

        {/* Body */}
        <article className="mb-16">
          {story.body.map((block, i) => renderBlock(block, i))}
        </article>

        {/* Lessons */}
        {story.lessons.length > 0 ? (
          <section className="mb-12 rounded-2xl border border-brand-cyan/25 bg-gradient-to-br from-brand-cyan/[0.07] to-transparent p-6 md:p-8">
            <h2 className="mb-6 font-serif text-2xl italic text-brand-white md:text-3xl">
              {story.lessons.length} lessons from this story
            </h2>
            <ol className="space-y-5">
              {story.lessons.map((l, i) => (
                <li key={i} className="flex gap-4">
                  <span className="shrink-0 font-mono text-sm text-brand-cyan">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h3 className="mb-1 font-medium text-brand-white">
                      {l.title}
                    </h3>
                    <p className="text-sm leading-relaxed text-brand-text/80">
                      {l.body}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        {/* Soft inline mention */}
        <section className="mb-12 border-t border-white/10 pt-8">
          <p className="text-sm leading-relaxed text-brand-text/65">
            If you want to try what worked for me without duct-taping it
            together yourself, that is roughly what{" "}
            <Link
              href="/ai"
              className="text-brand-cyan underline-offset-4 hover:underline"
            >
              Social Perks
            </Link>{" "}
            does — it runs the perk system, the asks, and the tracking on
            autopilot. Free for 14 days. No pitch beyond that.
          </p>
        </section>

        {/* Related */}
        {related.length > 0 ? (
          <section className="border-t border-white/10 pt-10">
            <h2 className="mb-5 font-serif text-2xl italic text-brand-white">
              More stories like this
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {related.map((r) => (
                <Link
                  key={r.slug}
                  href={`/stories/${r.slug}`}
                  className="group rounded-lg border border-white/10 bg-white/[0.02] p-4 transition hover:border-brand-cyan/40 hover:bg-white/[0.04]"
                >
                  <div className="font-medium text-brand-white group-hover:text-brand-cyan">
                    {r.title}
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-brand-text/60">
                    {r.excerpt}
                  </p>
                  <div className="mt-2 font-mono text-xs text-brand-cyan/70">
                    {r.readingMinutes} min read
                  </div>
                </Link>
              ))}
            </div>
            <div className="mt-6 text-center">
              <Link
                href="/stories"
                className="text-sm text-brand-cyan hover:underline"
              >
                See all stories →
              </Link>
            </div>
          </section>
        ) : null}
      </main>
      <Footer />
    </div>
  );
}
