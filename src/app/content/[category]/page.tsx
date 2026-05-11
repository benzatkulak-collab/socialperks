import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CONTENT_CATEGORIES, getCategory } from "@/lib/content/data";

export const dynamicParams = true;
export const revalidate = 86400;

export function generateStaticParams() {
  return CONTENT_CATEGORIES.map((c) => ({ category: c.slug }));
}

type Params = { params: Promise<{ category: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { category } = await params;
  const cat = getCategory(category);
  if (!cat) return { title: "Not Found" };
  return {
    title: `${cat.label} — Content Hub | Social Perks`,
    description: cat.description,
  };
}

export default async function ContentCategoryPage({ params }: Params) {
  const { category } = await params;
  const cat = getCategory(category);
  if (!cat) return notFound();

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Content", item: "/content" },
      { "@type": "ListItem", position: 2, name: cat.label, item: `/content/${cat.slug}` },
    ],
  };

  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      <nav className="mb-6 text-sm text-gray-400">
        <Link href="/content" className="hover:text-cyan-300">
          ← Content hub
        </Link>
      </nav>

      <h1 className="font-serif text-4xl italic text-white">{cat.label}</h1>
      <p className="mt-4 text-gray-300">{cat.description}</p>

      <ul className="mt-10 grid gap-3">
        {cat.topics.map((t) => (
          <li key={t.slug}>
            <Link
              href={`/content/${cat.slug}/${t.slug}`}
              className="block rounded-lg border border-white/10 p-4 transition hover:border-cyan-400/40 hover:bg-white/5"
            >
              <p className="font-semibold text-white">{t.title}</p>
              <p className="mt-1 text-sm text-gray-400 line-clamp-2">{t.intro.slice(0, 160)}…</p>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
