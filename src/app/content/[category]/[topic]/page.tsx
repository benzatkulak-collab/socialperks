import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  CONTENT_CATEGORIES,
  getTopic,
  ALL_CONTENT_PATHS,
} from "@/lib/content/data";

export const dynamicParams = true;
export const revalidate = 86400;

export function generateStaticParams() {
  // Prebuild 10 most popular topics (first topic of each cat + first 5 review topics)
  const popular = [
    ...CONTENT_CATEGORIES.map((c) => ({ category: c.slug, topic: c.topics[0].slug })),
    ...CONTENT_CATEGORIES[0].topics.slice(1, 6).map((t) => ({
      category: CONTENT_CATEGORIES[0].slug,
      topic: t.slug,
    })),
  ];
  return popular;
}

type Params = { params: Promise<{ category: string; topic: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { category, topic } = await params;
  const result = getTopic(category, topic);
  if (!result) return { title: "Not Found" };
  return {
    title: `${result.topic.title} — ${result.category.label} | Social Perks`,
    description: result.topic.intro.slice(0, 160),
    openGraph: { title: result.topic.title, description: result.topic.intro.slice(0, 160), type: "article" },
  };
}

export default async function ContentTopicPage({ params }: Params) {
  const { category, topic } = await params;
  const result = getTopic(category, topic);
  if (!result) return notFound();
  const { category: cat, topic: t } = result;

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: t.title,
    description: t.intro.slice(0, 160),
    author: { "@type": "Organization", name: "Social Perks" },
    publisher: { "@type": "Organization", name: "Social Perks" },
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Content", item: "/content" },
      { "@type": "ListItem", position: 2, name: cat.label, item: `/content/${cat.slug}` },
      { "@type": "ListItem", position: 3, name: t.title, item: `/content/${cat.slug}/${t.slug}` },
    ],
  };

  const related = cat.topics.filter((x) => x.slug !== t.slug).slice(0, 5);

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      <nav className="mb-6 text-sm text-gray-400">
        <Link href="/content" className="hover:text-cyan-300">
          Content
        </Link>
        <span className="mx-2">/</span>
        <Link href={`/content/${cat.slug}`} className="hover:text-cyan-300">
          {cat.label}
        </Link>
      </nav>

      <h1 className="font-serif text-4xl italic text-white">{t.title}</h1>
      <p className="mt-6 text-lg text-gray-300">{t.intro}</p>

      <div className="mt-12 space-y-8">
        {t.sections.map((s, i) => (
          <section key={i}>
            <h2 className="font-serif text-2xl italic text-white">{s.heading}</h2>
            <p className="mt-3 text-gray-300">{s.body}</p>
          </section>
        ))}
      </div>

      <section className="mt-14 rounded-lg border border-cyan-400/30 bg-cyan-400/5 p-6">
        <p className="text-lg text-white">Ready to put this into practice?</p>
        <p className="mt-1 text-sm text-gray-300">
          Social Perks gives you reviews, referrals, UGC, and loyalty in one platform. Start free for 14 days.
        </p>
        <Link
          href="/?signup=1"
          className="mt-4 inline-block rounded-md bg-cyan-400 px-5 py-2.5 text-sm font-semibold text-gray-900 hover:bg-cyan-300"
        >
          Start free trial
        </Link>
      </section>

      <section className="mt-12">
        <h2 className="font-serif text-xl italic text-white">Related topics</h2>
        <ul className="mt-4 grid gap-2">
          {related.map((r) => (
            <li key={r.slug}>
              <Link
                href={`/content/${cat.slug}/${r.slug}`}
                className="text-sm text-cyan-300 hover:underline"
              >
                {r.title}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
