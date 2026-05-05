import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Nav } from "@/components/shared/nav";
import { Footer } from "@/components/shared/footer";
import { getPost, listPosts } from "@/lib/blog";

interface PageProps {
  params: Promise<{ slug: string }>;
}

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "https://socialperks.io");

export function generateStaticParams() {
  return listPosts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};
  const url = `${SITE_URL}/blog/${slug}`;
  return {
    title: `${post.title} — Social Perks`,
    description: post.description,
    alternates: { canonical: url },
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      publishedTime: post.publishedAt,
      url,
      siteName: "Social Perks",
    },
    twitter: { card: "summary_large_image", title: post.title, description: post.description },
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    datePublished: post.publishedAt,
    description: post.description,
    author: { "@type": "Organization", name: "Social Perks" },
    publisher: { "@type": "Organization", name: "Social Perks" },
  };

  const paragraphs = post.body.split(/\n\s*\n/);

  return (
    <div className="min-h-screen bg-brand-bg">
      <Nav />
      <main id="main-content" className="mx-auto max-w-2xl px-4 pt-32 pb-20 sm:px-6 lg:px-8 sm:pt-40 sm:pb-28">
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.15em] text-brand-cyan">
          {new Date(post.publishedAt).toLocaleDateString()}
        </p>
        <h1 className="font-heading text-4xl italic text-brand-white sm:text-5xl">
          {post.title}
        </h1>
        <p className="mt-4 text-lg text-brand-dim">{post.description}</p>

        <article className="mt-10 space-y-5 text-base leading-relaxed text-brand-text sm:text-lg">
          {paragraphs.map((p, idx) => (
            <p key={idx} className="whitespace-pre-line">{p}</p>
          ))}
        </article>

        <p className="mt-12 text-sm text-brand-muted">
          ← <Link href="/blog" className="text-brand-cyan underline underline-offset-2 decoration-brand-cyan/40 hover:decoration-brand-cyan transition-colors">All posts</Link>
        </p>
      </main>
      <Footer />
    </div>
  );
}
