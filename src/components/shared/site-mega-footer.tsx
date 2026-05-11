// Server component — a mega-footer of deep internal links that pushes Google
// to crawl 60+ targeted pages from anywhere on the site.
//
// This is the SEO-flavoured cousin of the standard <Footer />. The regular
// footer is short and human-friendly; this one is wide and link-dense.
// Render it ABOVE (or below) the regular footer on any page that wants
// to leak link equity into deep programmatic pages.

import Link from "next/link";
import { getFooterLinks } from "@/lib/seo/related-links";

const SECTION_ORDER = [
  "Industries",
  "Cities",
  "Tools",
  "Guides",
  "Compare",
  "Resources",
] as const;

type SectionName = typeof SECTION_ORDER[number];

const SECTION_DESCRIPTIONS: Record<SectionName, string> = {
  Industries: "Marketing playbooks tailored to your kind of business.",
  Cities: "Local insights for the metros we serve.",
  Tools: "Free calculators and generators.",
  Guides: "Step-by-step playbooks.",
  Compare: "How Social Perks stacks up.",
  Resources: "Everything else worth reading.",
};

export function SiteMegaFooter() {
  const sections = getFooterLinks();

  return (
    <section
      aria-labelledby="mega-footer-heading"
      className="border-t border-brand-border/50 bg-brand-bg"
    >
      <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-16">
        <p className="font-mono text-[10px] uppercase tracking-wider text-brand-cyan">
          Site directory
        </p>
        <h2
          id="mega-footer-heading"
          className="mt-2 font-heading text-3xl italic text-brand-white sm:text-4xl"
        >
          Explore Social Perks
        </h2>
        <p className="mt-3 max-w-2xl text-sm text-brand-dim">
          Sixty deep links into the parts of the site most people miss.
          Pick a category and start digging.
        </p>

        <div className="mt-10 grid gap-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {SECTION_ORDER.map((name) => {
            const links = sections[name] || [];
            if (links.length === 0) return null;
            return (
              <div key={name}>
                <h3 className="font-mono text-[11px] uppercase tracking-wider text-brand-white">
                  {name}
                </h3>
                <p className="mt-1 text-[11px] leading-snug text-brand-dim">
                  {SECTION_DESCRIPTIONS[name]}
                </p>
                <ul className="mt-4 space-y-2">
                  {links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-sm text-brand-muted transition-colors hover:text-brand-cyan"
                      >
                        {link.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        <div className="mt-10 flex flex-wrap gap-3 border-t border-brand-border/40 pt-6 text-xs">
          <Link
            href="/site-map"
            className="text-brand-cyan transition-colors hover:text-brand-white"
          >
            Full site map →
          </Link>
          <span className="text-brand-dim">·</span>
          <Link
            href="/sitemap.xml"
            className="text-brand-muted transition-colors hover:text-brand-cyan"
          >
            XML sitemap
          </Link>
          <span className="text-brand-dim">·</span>
          <Link
            href="/blog"
            className="text-brand-muted transition-colors hover:text-brand-cyan"
          >
            All blog posts
          </Link>
          <span className="text-brand-dim">·</span>
          <Link
            href="/case-studies"
            className="text-brand-muted transition-colors hover:text-brand-cyan"
          >
            All case studies
          </Link>
        </div>
      </div>
    </section>
  );
}

export default SiteMegaFooter;
