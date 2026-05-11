// Server component — renders contextually-relevant related links for the
// current path. Drop this in at the bottom of any page to give Google (and
// humans) 5–6 more places to crawl.

import Link from "next/link";
import { getRelatedLinks, type RelatedLink } from "@/lib/seo/related-links";

interface RelatedLinksProps {
  /** Full pathname, e.g. "/blog/some-slug" or "/local/austin-tx/restaurants". */
  currentPath: string;
  /** Override the default count of suggestions (default 6). */
  count?: number;
  /** Optional heading override. */
  heading?: string;
  /** Optional eyebrow line above the heading. */
  eyebrow?: string;
}

export function RelatedLinks({
  currentPath,
  count = 6,
  heading = "Keep exploring →",
  eyebrow = "More to read",
}: RelatedLinksProps) {
  const links: RelatedLink[] = getRelatedLinks(currentPath, count);
  if (links.length === 0) return null;

  return (
    <section
      aria-labelledby="related-links-heading"
      className="border-t border-brand-border/40 bg-brand-bg"
    >
      <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-16">
        <p className="font-mono text-[10px] uppercase tracking-wider text-brand-cyan">
          {eyebrow}
        </p>
        <h2
          id="related-links-heading"
          className="mt-2 font-heading text-3xl italic text-brand-white sm:text-4xl"
        >
          {heading}
        </h2>

        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {links.map((link) => (
            <li key={link.href} className="list-none">
              <Link
                href={link.href}
                className="group flex h-full flex-col rounded-xl border border-brand-border/60 bg-brand-card/30 p-5 transition-colors hover:border-brand-cyan/40"
              >
                <span className="font-mono text-[10px] uppercase tracking-wider text-brand-cyan">
                  {link.category}
                </span>
                <h3 className="mt-3 font-heading text-lg italic leading-snug text-brand-white group-hover:text-brand-cyan">
                  {link.title}
                </h3>
                {link.description && (
                  <p className="mt-2 line-clamp-2 text-sm text-brand-dim">
                    {link.description}
                  </p>
                )}
                <span className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-brand-cyan opacity-80 group-hover:opacity-100">
                  Read more
                  <span aria-hidden="true">→</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export default RelatedLinks;
