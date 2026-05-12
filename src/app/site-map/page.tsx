import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/shared/nav";
import { Footer } from "@/components/shared/footer";
import { allPosts } from "@/lib/blog/posts";
import { GUIDES as HOWTO_GUIDES } from "@/lib/howto/guides";
import { GLOSSARY } from "@/lib/glossary/terms";
import { CASE_STUDIES } from "@/lib/case-studies/data";
import { COMMUNITIES } from "@/lib/communities/data";
import {
  INDUSTRIES as PLAYBOOK_INDUSTRIES,
  CAMPAIGNS as PLAYBOOK_CAMPAIGNS,
} from "@/lib/playbooks/data";
import { ALTERNATIVES } from "@/lib/alternatives/data";
import { DIY_METHODS } from "@/lib/instead-of/data";
import { INDUSTRY_PAGES } from "@/lib/industry-pages/data";
import { CITIES, INDUSTRIES as LOCAL_INDUSTRIES } from "@/lib/programmatic-seo/data";
import { STATES, STATE_INDUSTRIES } from "@/lib/programmatic-seo/states";

export const metadata: Metadata = {
  title: "Site Map · Every page on Social Perks",
  description:
    "A human-readable map of every section on Social Perks: blog posts, case studies, tools, playbooks, glossary, local pages, and more.",
  alternates: { canonical: "https://socialperks.app/site-map" },
  openGraph: {
    title: "Social Perks site map",
    description:
      "A visual map of every section on the Social Perks site — for humans and Google alike.",
    url: "https://socialperks.app/site-map",
    siteName: "Social Perks",
    type: "website",
  },
};

interface Section {
  title: string;
  count: number;
  intro: string;
  rootHref: string;
  links: { href: string; label: string }[];
}

function buildSections(): Section[] {
  const localPageCount = CITIES.length * LOCAL_INDUSTRIES.length;
  const statePageCount = STATES.length * STATE_INDUSTRIES.length;
  const playbookCount = PLAYBOOK_INDUSTRIES.length * PLAYBOOK_CAMPAIGNS.length;

  return [
    {
      title: "Blog",
      count: allPosts.length,
      intro: "Tactics, strategy, and case studies for small business marketing.",
      rootHref: "/blog",
      links: allPosts.slice(0, 12).map((p) => ({
        href: `/blog/${p.slug}`,
        label: p.title,
      })),
    },
    {
      title: "How-to guides",
      count: HOWTO_GUIDES.length,
      intro: "Step-by-step playbooks across reviews, content, and growth.",
      rootHref: "/how-to",
      links: HOWTO_GUIDES.slice(0, 12).map((g) => ({
        href: `/how-to/${g.slug}`,
        label: g.title,
      })),
    },
    {
      title: "Case studies",
      count: CASE_STUDIES.length,
      intro: "Real campaigns, real numbers — what worked and what didn't.",
      rootHref: "/case-studies",
      links: CASE_STUDIES.slice(0, 12).map((c) => ({
        href: `/case-studies/${c.slug}`,
        label: c.title,
      })),
    },
    {
      title: "Glossary",
      count: GLOSSARY.length,
      intro: "Plain-language definitions for marketing terms.",
      rootHref: "/glossary",
      links: GLOSSARY.slice(0, 12).map((t) => ({
        href: `/glossary/${t.slug}`,
        label: t.term,
      })),
    },
    {
      title: "Tools",
      count: 9,
      intro: "Free calculators and generators for small business marketing.",
      rootHref: "/tools",
      links: [
        { href: "/tools/cac-calculator", label: "Customer Acquisition Cost Calculator" },
        { href: "/tools/review-roi-calculator", label: "Review ROI Calculator" },
        { href: "/tools/viral-coefficient-calculator", label: "Viral Coefficient Calculator" },
        { href: "/tools/instagram-caption-generator", label: "Instagram Caption Generator" },
        { href: "/tools/loyalty-program-generator", label: "Loyalty Program Generator" },
        { href: "/tools/sms-review-templates", label: "SMS Review Templates" },
        { href: "/tools/utm-link-generator", label: "UTM Link Generator" },
        { href: "/tools/google-business-checker", label: "Google Business Profile Checker" },
        { href: "/tools/review-email-generator", label: "Review Email Generator" },
      ],
    },
    {
      title: "Industries",
      count: INDUSTRY_PAGES.length,
      intro: "Marketing playbooks tailored by industry.",
      rootHref: "/industries",
      links: INDUSTRY_PAGES.slice(0, 12).map((p) => ({
        href: `/industries/${p.slug}`,
        label: p.industry,
      })),
    },
    {
      title: "Communities",
      count: COMMUNITIES.length,
      intro: "Niche landing pages for high-intent audiences.",
      rootHref: "/communities",
      links: COMMUNITIES.slice(0, 12).map((c) => ({
        href: `/communities/${c.slug}`,
        label: `For ${c.niche}`,
      })),
    },
    {
      title: "Playbooks",
      count: playbookCount,
      intro: "Industry × campaign playbooks for very specific searches.",
      rootHref: "/playbooks",
      links: PLAYBOOK_INDUSTRIES.slice(0, 12).map((i) => ({
        href: `/playbooks/${i.slug}`,
        label: `${i.Name} playbooks`,
      })),
    },
    {
      title: "Local",
      count: localPageCount,
      intro: "City × industry landing pages for local search.",
      rootHref: "/local",
      links: CITIES.slice(0, 12).map((c) => ({
        href: `/local/${c.slug}`,
        label: `${c.name}, ${c.stateCode}`,
      })),
    },
    {
      title: "State",
      count: statePageCount,
      intro: "Statewide industry pages targeting state-level intent.",
      rootHref: "/state",
      links: STATES.slice(0, 12).map((s) => ({
        href: `/state/${s.slug}`,
        label: s.name,
      })),
    },
    {
      title: "Alternatives",
      count: ALTERNATIVES.length,
      intro: "Comparison pages targeting 'alternative to X' searches.",
      rootHref: "/alternatives",
      links: ALTERNATIVES.slice(0, 12).map((a) => ({
        href: `/alternatives/${a.slug}`,
        label: `${a.name} alternatives`,
      })),
    },
    {
      title: "Instead of",
      count: DIY_METHODS.length,
      intro: "Pages comparing DIY methods to Social Perks.",
      rootHref: "/instead-of",
      links: DIY_METHODS.slice(0, 12).map((d) => ({
        href: `/instead-of/${d.slug}`,
        label: `Instead of ${d.name}`,
      })),
    },
  ];
}

const PRODUCT_LINKS = [
  { href: "/", label: "Home" },
  { href: "/pricing", label: "Pricing" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/about", label: "About" },
  { href: "/agents", label: "AI agents" },
  { href: "/integrations", label: "Integrations" },
  { href: "/developers", label: "Developers" },
  { href: "/contact", label: "Contact" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
];

function formatCount(n: number): string {
  if (n >= 1000) {
    const k = (n / 1000).toFixed(n % 1000 === 0 ? 0 : 1);
    return `${k}k+`;
  }
  return `${n}`;
}

export default function SiteMapPage() {
  const sections = buildSections();
  const totalPages =
    sections.reduce((sum, s) => sum + s.count, 0) + PRODUCT_LINKS.length;

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text">
      <Nav />
      <main id="main" className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
        {/* Hero */}
        <div className="max-w-3xl">
          <p className="font-mono text-[10px] uppercase tracking-wider text-brand-cyan">
            Site map
          </p>
          <h1 className="mt-3 font-heading text-4xl italic text-brand-white sm:text-5xl">
            Every page on Social Perks
          </h1>
          <p className="mt-4 text-base text-brand-dim sm:text-lg">
            A human-readable map of the site. {formatCount(totalPages)} pages
            organized into {sections.length + 1} sections. Use it to find
            something specific — or just to see how deep we go.
          </p>
        </div>

        {/* Product / Company links */}
        <section className="mt-16 border-t border-brand-border/40 pt-10">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="font-heading text-2xl italic text-brand-white">
              Product
            </h2>
            <span className="font-mono text-xs text-brand-dim">
              {PRODUCT_LINKS.length} pages
            </span>
          </div>
          <p className="mt-2 text-sm text-brand-dim">
            The essentials — pricing, how it works, who we are.
          </p>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {PRODUCT_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-sm text-brand-muted transition-colors hover:text-brand-cyan"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* Data sections */}
        {sections.map((section) => (
          <section
            key={section.title}
            className="mt-12 border-t border-brand-border/40 pt-10"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-4">
              <h2 className="font-heading text-2xl italic text-brand-white">
                <Link
                  href={section.rootHref}
                  className="transition-colors hover:text-brand-cyan"
                >
                  {section.title}{" "}
                  <span className="text-brand-dim">
                    ({formatCount(section.count)})
                  </span>
                </Link>
              </h2>
              <Link
                href={section.rootHref}
                className="font-mono text-xs text-brand-cyan hover:text-brand-white"
              >
                View all →
              </Link>
            </div>
            <p className="mt-2 text-sm text-brand-dim">{section.intro}</p>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {section.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-brand-muted transition-colors hover:text-brand-cyan"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
            {section.count > section.links.length && (
              <p className="mt-4 text-xs text-brand-dim">
                + {formatCount(section.count - section.links.length)} more in{" "}
                <Link
                  href={section.rootHref}
                  className="text-brand-cyan hover:text-brand-white"
                >
                  {section.title.toLowerCase()}
                </Link>
                .
              </p>
            )}
          </section>
        ))}

        {/* Outro */}
        <section className="mt-16 rounded-xl border border-brand-border/60 bg-brand-card/30 p-6 sm:p-8">
          <h2 className="font-heading text-2xl italic text-brand-white">
            Can't find something?
          </h2>
          <p className="mt-2 text-sm text-brand-dim">
            We also publish an{" "}
            <Link
              href="/sitemap.xml"
              className="text-brand-cyan hover:text-brand-white"
            >
              XML sitemap
            </Link>{" "}
            for search engines, and you can always reach out via the{" "}
            <Link
              href="/contact"
              className="text-brand-cyan hover:text-brand-white"
            >
              contact page
            </Link>
            .
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}
