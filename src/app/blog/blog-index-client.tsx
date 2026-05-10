"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { BlogPostMeta, BlogCategory } from "@/lib/blog/posts";

interface Props {
  posts: BlogPostMeta[];
  categories: BlogCategory[];
}

const PAGE_SIZE = 9;

export function BlogIndexClient({ posts, categories }: Props) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<BlogCategory | "All">("All");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return posts.filter(p => {
      if (activeCategory !== "All" && p.category !== activeCategory) return false;
      if (!q) return true;
      const haystack = `${p.title} ${p.description} ${p.category} ${p.keyword}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [posts, query, activeCategory]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pagePosts = filtered.slice(pageStart, pageStart + PAGE_SIZE);

  function resetPage() {
    setPage(1);
  }

  return (
    <div className="space-y-8">
      {/* Search + filters */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-md">
          <input
            type="search"
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              resetPage();
            }}
            placeholder="Search articles..."
            className="w-full rounded-lg border border-brand-border/60 bg-brand-card/40 px-4 py-3 font-body text-sm text-brand-text placeholder-brand-muted/70 transition-colors focus:border-brand-cyan/60 focus:outline-none"
            aria-label="Search blog posts"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => {
            setActiveCategory("All");
            resetPage();
          }}
          className={`rounded-full border px-4 py-1.5 text-xs font-medium transition-colors ${
            activeCategory === "All"
              ? "border-brand-cyan bg-brand-cyan/10 text-brand-cyan"
              : "border-brand-border/60 text-brand-muted hover:border-brand-cyan/40 hover:text-brand-text"
          }`}
        >
          All
        </button>
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => {
              setActiveCategory(cat);
              resetPage();
            }}
            className={`rounded-full border px-4 py-1.5 text-xs font-medium transition-colors ${
              activeCategory === cat
                ? "border-brand-cyan bg-brand-cyan/10 text-brand-cyan"
                : "border-brand-border/60 text-brand-muted hover:border-brand-cyan/40 hover:text-brand-text"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Result count */}
      <p className="font-mono text-xs uppercase tracking-wider text-brand-muted">
        {filtered.length} {filtered.length === 1 ? "article" : "articles"}
        {activeCategory !== "All" && ` in ${activeCategory}`}
        {query && ` matching "${query}"`}
      </p>

      {/* Cards */}
      {pagePosts.length === 0 ? (
        <div className="rounded-xl border border-brand-border/40 bg-brand-card/30 p-12 text-center">
          <p className="font-heading text-xl italic text-brand-white">No articles found</p>
          <p className="mt-2 text-sm text-brand-muted">Try a different search or category.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {pagePosts.map(post => (
            <BlogCard key={post.slug} post={post} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-6">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="rounded-md border border-brand-border/60 px-3 py-1.5 text-xs text-brand-muted transition-colors hover:border-brand-cyan/40 hover:text-brand-text disabled:cursor-not-allowed disabled:opacity-30"
          >
            Previous
          </button>
          {Array.from({ length: totalPages }).map((_, i) => {
            const n = i + 1;
            return (
              <button
                key={n}
                onClick={() => setPage(n)}
                className={`min-w-[2.25rem] rounded-md border px-3 py-1.5 text-xs transition-colors ${
                  n === currentPage
                    ? "border-brand-cyan bg-brand-cyan/10 text-brand-cyan"
                    : "border-brand-border/60 text-brand-muted hover:border-brand-cyan/40 hover:text-brand-text"
                }`}
                aria-current={n === currentPage ? "page" : undefined}
              >
                {n}
              </button>
            );
          })}
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="rounded-md border border-brand-border/60 px-3 py-1.5 text-xs text-brand-muted transition-colors hover:border-brand-cyan/40 hover:text-brand-text disabled:cursor-not-allowed disabled:opacity-30"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

function BlogCard({ post }: { post: BlogPostMeta }) {
  const date = new Date(post.publishedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group flex flex-col rounded-xl border border-brand-border/60 bg-brand-card/30 p-6 transition-all hover:-translate-y-0.5 hover:border-brand-cyan/40 hover:bg-brand-card/50"
    >
      <span className="inline-flex w-fit rounded-full border border-brand-cyan/30 bg-brand-cyan/5 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-brand-cyan">
        {post.category}
      </span>
      <h3 className="mt-4 font-heading text-xl italic leading-snug text-brand-white transition-colors group-hover:text-brand-cyan">
        {post.title}
      </h3>
      <p className="mt-3 line-clamp-3 flex-1 text-sm leading-relaxed text-brand-dim">
        {post.description}
      </p>
      <div className="mt-5 flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-brand-muted">
        <span>{date}</span>
        <span>{post.readingTimeMinutes} min read</span>
      </div>
    </Link>
  );
}
