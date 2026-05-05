import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/shared/nav";
import { Footer } from "@/components/shared/footer";
import { listPosts } from "@/lib/blog";

export const metadata: Metadata = {
  title: "Blog — Social Perks",
  description: "Notes on local marketing, FTC compliance, and the platform.",
  alternates: { canonical: "/blog" },
};

export default function BlogIndex() {
  const posts = listPosts();
  return (
    <div className="min-h-screen bg-brand-bg">
      <Nav />
      <main id="main-content" className="mx-auto max-w-3xl px-4 pt-32 pb-20 sm:px-6 lg:px-8 sm:pt-40 sm:pb-28">
        <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.15em] text-brand-cyan">Blog</p>
        <h1 className="font-heading text-4xl italic text-brand-white sm:text-5xl">Notes</h1>
        <ol className="mt-12 space-y-8">
          {posts.map((p) => (
            <li key={p.slug} className="border-l-2 border-brand-cyan/40 pl-6">
              <p className="font-mono text-xs text-brand-muted">{new Date(p.publishedAt).toLocaleDateString()}</p>
              <h2 className="mt-1 font-heading text-2xl italic text-brand-white">
                <Link href={`/blog/${p.slug}`} className="hover:text-brand-cyan">{p.title}</Link>
              </h2>
              <p className="mt-2 text-sm text-brand-dim sm:text-base">{p.description}</p>
            </li>
          ))}
        </ol>
      </main>
      <Footer />
    </div>
  );
}
