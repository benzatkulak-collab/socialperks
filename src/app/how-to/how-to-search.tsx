"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Guide } from "@/lib/howto/guides";

export function HowToSearch({ guides }: { guides: Guide[] }) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return [] as Guide[];
    return guides
      .filter(
        (g) =>
          g.title.toLowerCase().includes(term) ||
          g.description.toLowerCase().includes(term) ||
          g.category.toLowerCase().includes(term),
      )
      .slice(0, 8);
  }, [q, guides]);

  return (
    <div className="mb-12">
      <label htmlFor="howto-search" className="sr-only">
        Search how-to guides
      </label>
      <input
        id="howto-search"
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search guides — try 'Google reviews' or 'Instagram'"
        className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-5 py-3 text-base text-brand-white placeholder:text-brand-text/40 focus:border-brand-cyan/50 focus:outline-none focus:ring-2 focus:ring-brand-cyan/20"
      />
      {filtered.length > 0 ? (
        <div className="mt-3 overflow-hidden rounded-xl border border-white/10 bg-white/[0.02]">
          {filtered.map((g) => (
            <Link
              key={g.slug}
              href={`/how-to/${g.slug}`}
              className="flex items-center justify-between gap-4 border-b border-white/5 px-4 py-3 last:border-b-0 hover:bg-white/[0.04]"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-brand-white">
                  {g.title}
                </div>
                <div className="truncate text-xs text-brand-text/50">
                  {g.category}
                </div>
              </div>
              <span className="shrink-0 font-mono text-xs text-brand-cyan/80">
                {g.timeMinutes} min
              </span>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
