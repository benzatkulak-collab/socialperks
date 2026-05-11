import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/shared/nav";
import { Footer } from "@/components/shared/footer";
import {
  STORIES,
  CATEGORY_LABELS,
  type StoryCategory,
} from "@/lib/stories/data";

export const metadata: Metadata = {
  title: "Stories from small business owners · Social Perks",
  description:
    "Real, first-person stories from small business owners — what they tried, what they got wrong, and what actually worked. Long-form notes from the trenches.",
  alternates: { canonical: "https://socialperks.io/stories" },
  openGraph: {
    title: "Real stories from small business owners",
    description:
      "What worked, what flopped, and what nobody told you. Long-form notes from the people running the shops.",
    url: "https://socialperks.io/stories",
    siteName: "Social Perks",
    type: "website",
  },
};

const CATEGORY_ORDER: StoryCategory[] = [
  "tried-30-days",
  "mistakes",
  "what-worked",
  "industry",
];

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function StoriesIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const sp = await searchParams;
  const activeCategory = (CATEGORY_ORDER as string[]).includes(
    sp.category ?? "",
  )
    ? (sp.category as StoryCategory)
    : null;

  const visibleStories = activeCategory
    ? STORIES.filter((s) => s.category === activeCategory)
    : STORIES;

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Social Perks Stories",
    description:
      "Long-form first-person stories from small business owners about marketing experiments.",
    itemListElement: STORIES.map((s, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `https://socialperks.io/stories/${s.slug}`,
      name: s.title,
    })),
  };

  return (
    <div className="min-h-screen overflow-x-hidden">
      <Nav />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
      <main id="main-content" className="mx-auto max-w-6xl px-6 py-16 md:py-24">
        {/* Hero */}
        <header className="mb-12 max-w-3xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand-cyan/30 bg-brand-cyan/10 px-3 py-1 text-xs uppercase tracking-wider text-brand-cyan">
            Stories
          </div>
          <h1 className="font-serif text-4xl italic leading-tight text-brand-white md:text-6xl">
            Real stories from small business owners
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-brand-text/75">
            Long-form, first-person notes from the people actually running the
            shops. What they tried, what flopped, what worked, and what they
            wish someone had told them on day one.
          </p>
        </header>

        {/* Filter tabs */}
        <nav className="mb-10 flex flex-wrap gap-2">
          <Link
            href="/stories"
            className={
              !activeCategory
                ? "rounded-full border border-brand-cyan/60 bg-brand-cyan/15 px-4 py-2 text-sm text-brand-cyan"
                : "rounded-full border border-white/10 bg-white/[0.02] px-4 py-2 text-sm text-brand-text/70 transition hover:border-brand-cyan/40 hover:text-brand-white"
            }
          >
            All stories
            <span className="ml-2 font-mono text-xs opacity-60">
              {STORIES.length}
            </span>
          </Link>
          {CATEGORY_ORDER.map((cat) => {
            const count = STORIES.filter((s) => s.category === cat).length;
            if (count === 0) return null;
            const active = activeCategory === cat;
            return (
              <Link
                key={cat}
                href={`/stories?category=${cat}`}
                className={
                  active
                    ? "rounded-full border border-brand-cyan/60 bg-brand-cyan/15 px-4 py-2 text-sm text-brand-cyan"
                    : "rounded-full border border-white/10 bg-white/[0.02] px-4 py-2 text-sm text-brand-text/70 transition hover:border-brand-cyan/40 hover:text-brand-white"
                }
              >
                {CATEGORY_LABELS[cat]}
                <span className="ml-2 font-mono text-xs opacity-60">
                  {count}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Grid */}
        {visibleStories.length === 0 ? (
          <p className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center text-brand-text/60">
            No stories in this category yet. Check back soon.
          </p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {visibleStories.map((s) => (
              <article
                key={s.slug}
                className="group flex flex-col rounded-2xl border border-white/10 bg-white/[0.02] p-6 transition hover:border-brand-cyan/40 hover:bg-white/[0.04]"
              >
                <div className="mb-3 inline-flex w-fit items-center gap-2 rounded-full border border-brand-cyan/25 bg-brand-cyan/10 px-2.5 py-0.5 text-[11px] uppercase tracking-wider text-brand-cyan">
                  {s.categoryLabel}
                </div>
                <h2 className="mb-3 font-serif text-2xl italic leading-snug text-brand-white">
                  <Link
                    href={`/stories/${s.slug}`}
                    className="transition group-hover:text-brand-cyan"
                  >
                    {s.title}
                  </Link>
                </h2>
                <p className="mb-4 line-clamp-3 text-sm leading-relaxed text-brand-text/75">
                  {s.excerpt}
                </p>
                <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-brand-text/55">
                  <span className="text-brand-text/75">{s.authorPersona}</span>
                  <span aria-hidden>·</span>
                  <span className="font-mono text-brand-cyan/80">
                    {s.readingMinutes} min read
                  </span>
                  <span aria-hidden>·</span>
                  <span>{formatDate(s.publishedAt)}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
