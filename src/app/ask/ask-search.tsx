"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { AskQuestion, AskCategory } from "@/lib/ask/types";
import { ASK_CATEGORIES } from "@/lib/ask/types";

interface Props {
  questions: AskQuestion[];
}

export function AskSearch({ questions }: Props) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return questions;
    return questions.filter(
      (item) =>
        item.question.toLowerCase().includes(q) ||
        item.tldr.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q),
    );
  }, [questions, query]);

  const grouped = useMemo(() => {
    const g: Record<string, AskQuestion[]> = {};
    for (const item of filtered) {
      if (!g[item.category]) g[item.category] = [];
      g[item.category].push(item);
    }
    return g;
  }, [filtered]);

  return (
    <div>
      <div className="mb-10">
        <label htmlFor="ask-search" className="sr-only">
          Search questions
        </label>
        <input
          id="ask-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search 40 questions... e.g. 'google reviews', 'instagram', 'influencer pricing'"
          className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-5 py-4 text-brand-white placeholder:text-brand-text/40 focus:border-brand-cyan/50 focus:outline-none"
        />
        <p className="mt-2 text-sm text-brand-text/50">
          {filtered.length} of {questions.length} questions
        </p>
      </div>

      {ASK_CATEGORIES.map((cat: AskCategory) =>
        grouped[cat] && grouped[cat].length > 0 ? (
          <section key={cat} className="mb-12">
            <h2 className="mb-4 font-serif text-2xl italic text-brand-white">
              {cat}
            </h2>
            <ul className="space-y-2">
              {grouped[cat].map((item) => (
                <li key={item.slug}>
                  <Link
                    href={`/ask/${item.slug}`}
                    className="group block rounded-xl border border-white/10 bg-white/[0.02] p-5 transition hover:border-brand-cyan/40 hover:bg-white/[0.04]"
                  >
                    <div className="font-medium text-brand-white group-hover:text-brand-cyan">
                      {item.question}
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm text-brand-text/60">
                      {item.tldr}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null,
      )}

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-8 text-center text-brand-text/60">
          No questions match &ldquo;{query}&rdquo;. Try a different search.
        </div>
      ) : null}
    </div>
  );
}
