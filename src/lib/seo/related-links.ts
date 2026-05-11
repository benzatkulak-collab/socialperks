// ---------------------------------------------------------------------------
// Internal Linking Engine
// ---------------------------------------------------------------------------
//
// Provides sitewide related-link suggestions for every page on the site.
// Internal linking is a massive SEO multiplier — every page should link to
// 5+ related pages so that Google crawls deep and ranks each page better.
//
// Public API:
//   - getRelatedLinks(currentPath, count?)  → contextual suggestions
//   - getCategoryLinks(category)            → all links in a category
//   - getFooterLinks()                      → grouped links for mega-footer
//
// Data sources are imported lazily so this module remains tree-shake safe
// for static pages that only need a small subset.

import { CITIES, INDUSTRIES, getNearbyCities, getOtherIndustries } from "@/lib/programmatic-seo/data";
import { STATES, STATE_INDUSTRIES, getNearbyStates, getOtherStateIndustries } from "@/lib/programmatic-seo/states";
import { allPosts } from "@/lib/blog/posts";
import { GUIDES as HOWTO_GUIDES } from "@/lib/howto/guides";
import { GLOSSARY } from "@/lib/glossary/terms";
import { CASE_STUDIES } from "@/lib/case-studies/data";
import { COMMUNITIES } from "@/lib/communities/data";
import { INDUSTRIES as PLAYBOOK_INDUSTRIES, CAMPAIGNS as PLAYBOOK_CAMPAIGNS } from "@/lib/playbooks/data";
import { ALTERNATIVES } from "@/lib/alternatives/data";
import { DIY_METHODS } from "@/lib/instead-of/data";
import { INDUSTRY_PAGES } from "@/lib/industry-pages/data";

export interface RelatedLink {
  href: string;
  title: string;
  description?: string;
  category: string;
}

// ---------------------------------------------------------------------------
// Static catalogues — small, hand-curated lists used as fall-backs and as
// "popular" suggestions on pages where context isn't enough.
// ---------------------------------------------------------------------------

const TOOLS: RelatedLink[] = [
  {
    href: "/tools/cac-calculator",
    title: "Customer Acquisition Cost Calculator",
    description: "See what each new customer actually costs you.",
    category: "Tools",
  },
  {
    href: "/tools/review-roi-calculator",
    title: "Review ROI Calculator",
    description: "Estimate the revenue a single 5-star review brings in.",
    category: "Tools",
  },
  {
    href: "/tools/viral-coefficient-calculator",
    title: "Viral Coefficient Calculator",
    description: "Find out whether your perk program loops or leaks.",
    category: "Tools",
  },
  {
    href: "/tools/instagram-caption-generator",
    title: "Instagram Caption Generator",
    description: "AI-written captions tuned for local businesses.",
    category: "Tools",
  },
  {
    href: "/tools/loyalty-program-generator",
    title: "Loyalty Program Generator",
    description: "Design a customer-rewards program in 60 seconds.",
    category: "Tools",
  },
  {
    href: "/tools/sms-review-templates",
    title: "SMS Review Templates",
    description: "30 proven SMS templates that earn 5-star reviews.",
    category: "Tools",
  },
  {
    href: "/tools/utm-link-generator",
    title: "UTM Link Generator",
    description: "Track every link from email, SMS, and social.",
    category: "Tools",
  },
  {
    href: "/tools/google-business-checker",
    title: "Google Business Profile Checker",
    description: "Find the gaps killing your local search rank.",
    category: "Tools",
  },
  {
    href: "/tools/review-email-generator",
    title: "Review Email Generator",
    description: "Write the review request that actually converts.",
    category: "Tools",
  },
];

const POPULAR: RelatedLink[] = [
  { href: "/pricing", title: "Pricing", description: "Flat monthly pricing — start free for 14 days.", category: "Product" },
  { href: "/how-it-works", title: "How It Works", description: "From perk to post in three steps.", category: "Product" },
  { href: "/blog", title: "Blog", description: "Tactics, playbooks, and case studies.", category: "Resources" },
  { href: "/tools", title: "Free Tools", description: "Calculators and generators for small business marketing.", category: "Tools" },
  { href: "/case-studies", title: "Case Studies", description: "Real campaigns, real numbers.", category: "Resources" },
  { href: "/glossary", title: "Marketing Glossary", description: "Plain-English definitions for every marketing term.", category: "Resources" },
  { href: "/how-to", title: "How-To Guides", description: "Step-by-step playbooks for small business growth.", category: "Resources" },
  { href: "/communities", title: "By Audience", description: "Tailored playbooks for yoga teachers, restaurants, and more.", category: "Audience" },
];

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function _shuffle<T>(arr: T[]): T[] {
  // Stable order is fine — keep deterministic so SSR matches CSR.
  return [...arr];
}

function uniqueByHref(links: RelatedLink[]): RelatedLink[] {
  const seen = new Set<string>();
  const out: RelatedLink[] = [];
  for (const l of links) {
    if (seen.has(l.href)) continue;
    seen.add(l.href);
    out.push(l);
  }
  return out;
}

function take<T>(arr: T[], n: number): T[] {
  return arr.slice(0, Math.max(0, n));
}

// ---------------------------------------------------------------------------
// Adapters — turn raw data records into RelatedLink shapes.
// ---------------------------------------------------------------------------

function blogToLink(p: { slug: string; title: string; description: string; category: string }): RelatedLink {
  return {
    href: `/blog/${p.slug}`,
    title: p.title,
    description: p.description,
    category: p.category,
  };
}

function howToToLink(g: { slug: string; title: string; description: string; category: string }): RelatedLink {
  return {
    href: `/how-to/${g.slug}`,
    title: g.title,
    description: g.description,
    category: g.category,
  };
}

function glossaryToLink(t: { slug: string; term: string; definition: string; category: string }): RelatedLink {
  return {
    href: `/glossary/${t.slug}`,
    title: t.term,
    description: t.definition.slice(0, 140) + (t.definition.length > 140 ? "…" : ""),
    category: t.category,
  };
}

function caseStudyToLink(c: { slug: string; title: string; description: string; businessType: string }): RelatedLink {
  return {
    href: `/case-studies/${c.slug}`,
    title: c.title,
    description: c.description,
    category: c.businessType,
  };
}

function communityToLink(c: { slug: string; niche: string; hook: string; category: string }): RelatedLink {
  return {
    href: `/communities/${c.slug}`,
    title: `For ${c.niche}`,
    description: c.hook,
    category: c.category,
  };
}

function localToLink(citySlug: string, industrySlug: string, cityName: string, industryName: string): RelatedLink {
  return {
    href: `/local/${citySlug}/${industrySlug}`,
    title: `${industryName} in ${cityName}`,
    description: `Customer-marketing playbook for ${industryName.toLowerCase()} in ${cityName}.`,
    category: "Local",
  };
}

function stateToLink(stateSlug: string, industrySlug: string, stateName: string, industryName: string): RelatedLink {
  return {
    href: `/state/${stateSlug}/${industrySlug}`,
    title: `${industryName} in ${stateName}`,
    description: `Statewide marketing playbook for ${industryName.toLowerCase()} across ${stateName}.`,
    category: "State",
  };
}

function playbookToLink(industrySlug: string, campaignSlug: string, industryName: string, campaignName: string): RelatedLink {
  return {
    href: `/playbooks/${industrySlug}/${campaignSlug}`,
    title: `${campaignName} for ${industryName}`,
    description: `Full playbook: how to run a ${campaignName.toLowerCase()} for ${industryName.toLowerCase()}.`,
    category: "Playbook",
  };
}

// ---------------------------------------------------------------------------
// URL parsing
// ---------------------------------------------------------------------------

interface ParsedPath {
  segments: string[];
  section: string;
}

function parse(path: string): ParsedPath {
  const clean = path.split("?")[0].split("#")[0];
  const segments = clean.split("/").filter(Boolean);
  return { segments, section: segments[0] || "" };
}

// ---------------------------------------------------------------------------
// Section resolvers — return contextually relevant links per URL pattern.
// ---------------------------------------------------------------------------

function forBlog(slug?: string, count = 5): RelatedLink[] {
  const current = slug ? allPosts.find(p => p.slug === slug) : undefined;
  const sameCat = current
    ? allPosts.filter(p => p.slug !== slug && p.category === current.category)
    : allPosts;
  const otherCat = allPosts.filter(p => p.slug !== slug && (!current || p.category !== current.category));

  const blogs = take(sameCat.length >= 3 ? sameCat : [...sameCat, ...otherCat], 3).map(blogToLink);
  const howTo = take(HOWTO_GUIDES, 1).map(howToToLink);
  const tool = take(TOOLS, 1);
  return uniqueByHref([...blogs, ...howTo, ...tool]).slice(0, count);
}

function forLocal(citySlug?: string, industrySlug?: string, count = 7): RelatedLink[] {
  const city = CITIES.find(c => c.slug === citySlug);
  const industry = INDUSTRIES.find(i => i.slug === industrySlug);
  const out: RelatedLink[] = [];

  if (city && industry) {
    // 3 nearby cities, same industry
    const nearby = getNearbyCities(city.slug, 3);
    for (const n of nearby) {
      out.push(localToLink(n.slug, industry.slug, n.name, industry.plural));
    }
    // 3 other industries in the same city
    const others = getOtherIndustries(industry.slug, 3);
    for (const o of others) {
      out.push(localToLink(city.slug, o.slug, city.name, o.plural));
    }
    // 1 case study
    const cs = CASE_STUDIES[0];
    if (cs) out.push(caseStudyToLink(cs));
  } else if (city) {
    // City landing page — link to all industries in that city
    for (const ind of take(INDUSTRIES, 6)) {
      out.push(localToLink(city.slug, ind.slug, city.name, ind.plural));
    }
  }

  return uniqueByHref(out).slice(0, count);
}

function forState(stateSlug?: string, industrySlug?: string, count = 7): RelatedLink[] {
  const state = STATES.find(s => s.slug === stateSlug);
  const industry = STATE_INDUSTRIES.find(i => i.slug === industrySlug);
  const out: RelatedLink[] = [];

  if (state && industry) {
    const nearby = getNearbyStates(state.slug, 3);
    for (const n of nearby) {
      out.push(stateToLink(n.slug, industry.slug, n.name, industry.plural));
    }
    const others = getOtherStateIndustries(industry.slug, 3);
    for (const o of others) {
      out.push(stateToLink(state.slug, o.slug, state.name, o.plural));
    }
    out.push({
      href: "/case-studies",
      title: "Customer case studies",
      description: "Real campaigns from real businesses.",
      category: "Resources",
    });
  } else if (state) {
    for (const ind of take(STATE_INDUSTRIES, 6)) {
      out.push(stateToLink(state.slug, ind.slug, state.name, ind.plural));
    }
  }

  return uniqueByHref(out).slice(0, count);
}

function forGlossary(termSlug?: string, count = 5): RelatedLink[] {
  const term = termSlug ? GLOSSARY.find(t => t.slug === termSlug) : undefined;
  const out: RelatedLink[] = [];

  if (term) {
    for (const rel of term.relatedSlugs) {
      const t = GLOSSARY.find(g => g.slug === rel);
      if (t) out.push(glossaryToLink(t));
    }
    // Add blog posts that match the term keyword
    const q = term.term.toLowerCase();
    const matches = allPosts.filter(p =>
      `${p.title} ${p.description} ${p.keyword}`.toLowerCase().includes(q.split(" ")[0]),
    );
    for (const m of take(matches, 2)) out.push(blogToLink(m));
  } else {
    for (const t of take(GLOSSARY, count)) out.push(glossaryToLink(t));
  }

  return uniqueByHref(out).slice(0, count);
}

function forTool(toolSlug?: string, count = 5): RelatedLink[] {
  const others = TOOLS.filter(t => !t.href.endsWith(`/${toolSlug}`));
  const tools = take(others, 2);
  const howTo = take(HOWTO_GUIDES, 1).map(howToToLink);
  const cs = take(CASE_STUDIES, 1).map(caseStudyToLink);
  const blog = take(allPosts, 1).map(blogToLink);
  return uniqueByHref([...tools, ...howTo, ...cs, ...blog]).slice(0, count);
}

function forCaseStudy(slug?: string, count = 5): RelatedLink[] {
  const others = CASE_STUDIES.filter(c => c.slug !== slug);
  const cases = take(others, 3).map(caseStudyToLink);
  const howTo = take(HOWTO_GUIDES, 1).map(howToToLink);
  const industry = take(INDUSTRY_PAGES, 1).map(p => ({
    href: `/industries/${p.slug}`,
    title: `Marketing for ${p.industry}`,
    description: p.metaDescription,
    category: "Industries",
  }));
  return uniqueByHref([...cases, ...howTo, ...industry]).slice(0, count);
}

function forHowTo(slug?: string, count = 5): RelatedLink[] {
  const current = slug ? HOWTO_GUIDES.find(g => g.slug === slug) : undefined;
  const others = current
    ? HOWTO_GUIDES.filter(g => g.slug !== slug && g.category === current.category)
    : HOWTO_GUIDES;
  const guides = take(others.length >= 2 ? others : HOWTO_GUIDES.filter(g => g.slug !== slug), 2).map(howToToLink);
  const tool = take(TOOLS, 1);
  const blog = take(allPosts, 1).map(blogToLink);
  return uniqueByHref([...guides, ...tool, ...blog]).slice(0, count);
}

function forPlaybook(industrySlug?: string, campaignSlug?: string, count = 6): RelatedLink[] {
  const industry = PLAYBOOK_INDUSTRIES.find(i => i.slug === industrySlug);
  const campaign = PLAYBOOK_CAMPAIGNS.find(c => c.slug === campaignSlug);
  const out: RelatedLink[] = [];

  if (industry && campaign) {
    // Other campaigns for the same industry
    for (const c of PLAYBOOK_CAMPAIGNS.filter(c => c.slug !== campaignSlug).slice(0, 3)) {
      out.push(playbookToLink(industry.slug, c.slug, industry.Name, c.name));
    }
    // Same campaign for other industries
    for (const i of PLAYBOOK_INDUSTRIES.filter(i => i.slug !== industrySlug).slice(0, 3)) {
      out.push(playbookToLink(i.slug, campaign.slug, i.Name, campaign.name));
    }
  } else if (industry) {
    for (const c of PLAYBOOK_CAMPAIGNS.slice(0, count)) {
      out.push(playbookToLink(industry.slug, c.slug, industry.Name, c.name));
    }
  }

  return uniqueByHref(out).slice(0, count);
}

function forCommunity(slug?: string, count = 5): RelatedLink[] {
  const others = COMMUNITIES.filter(c => c.slug !== slug);
  const comms = take(others, 2).map(communityToLink);
  const industry = take(INDUSTRY_PAGES, 1).map(p => ({
    href: `/industries/${p.slug}`,
    title: `Marketing for ${p.industry}`,
    description: p.metaDescription,
    category: "Industries",
  }));
  const cs = take(CASE_STUDIES, 1).map(caseStudyToLink);
  const blog = take(allPosts, 1).map(blogToLink);
  return uniqueByHref([...comms, ...industry, ...cs, ...blog]).slice(0, count);
}

function forAlternative(slug?: string, count = 5): RelatedLink[] {
  const others = ALTERNATIVES.filter(a => a.slug !== slug);
  const alts = take(others, 3).map(a => ({
    href: `/alternatives/${a.slug}`,
    title: `${a.name} alternatives`,
    description: a.oneLiner,
    category: a.categoryLabel,
  }));
  const cs = take(CASE_STUDIES, 1).map(caseStudyToLink);
  const blog = take(allPosts, 1).map(blogToLink);
  return uniqueByHref([...alts, ...cs, ...blog]).slice(0, count);
}

function forInsteadOf(slug?: string, count = 5): RelatedLink[] {
  const others = DIY_METHODS.filter(d => d.slug !== slug);
  const methods = take(others, 3).map(d => ({
    href: `/instead-of/${d.slug}`,
    title: `Instead of ${d.name}`,
    description: d.description,
    category: d.category,
  }));
  const howTo = take(HOWTO_GUIDES, 1).map(howToToLink);
  const tool = take(TOOLS, 1);
  return uniqueByHref([...methods, ...howTo, ...tool]).slice(0, count);
}

function forIndustryPage(slug?: string, count = 5): RelatedLink[] {
  const others = INDUSTRY_PAGES.filter(p => p.slug !== slug);
  const industries = take(others, 3).map(p => ({
    href: `/industries/${p.slug}`,
    title: `Marketing for ${p.industry}`,
    description: p.metaDescription,
    category: "Industries",
  }));
  const cs = take(CASE_STUDIES, 1).map(caseStudyToLink);
  const howTo = take(HOWTO_GUIDES, 1).map(howToToLink);
  return uniqueByHref([...industries, ...cs, ...howTo]).slice(0, count);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function getRelatedLinks(currentPath: string, count = 6): RelatedLink[] {
  const { segments, section } = parse(currentPath);

  switch (section) {
    case "blog": {
      const slug = segments[1];
      return forBlog(slug, count);
    }
    case "local": {
      const [, city, industry] = segments;
      return forLocal(city, industry, count);
    }
    case "state": {
      const [, state, industry] = segments;
      return forState(state, industry, count);
    }
    case "glossary": {
      return forGlossary(segments[1], count);
    }
    case "tools": {
      return forTool(segments[1], count);
    }
    case "case-studies": {
      return forCaseStudy(segments[1], count);
    }
    case "how-to": {
      return forHowTo(segments[1], count);
    }
    case "playbooks": {
      return forPlaybook(segments[1], segments[2], count);
    }
    case "communities": {
      return forCommunity(segments[1], count);
    }
    case "alternatives": {
      return forAlternative(segments[1], count);
    }
    case "instead-of": {
      return forInsteadOf(segments[1], count);
    }
    case "industries": {
      return forIndustryPage(segments[1], count);
    }
    default: {
      return take(POPULAR, count);
    }
  }
}

export function getCategoryLinks(category: string): RelatedLink[] {
  const key = category.toLowerCase();

  if (key === "blog" || key === "resources") {
    return allPosts.slice(0, 12).map(blogToLink);
  }
  if (key === "tools") {
    return TOOLS;
  }
  if (key === "how-to" || key === "guides") {
    return HOWTO_GUIDES.slice(0, 12).map(howToToLink);
  }
  if (key === "glossary") {
    return GLOSSARY.slice(0, 12).map(glossaryToLink);
  }
  if (key === "case-studies" || key === "case studies") {
    return CASE_STUDIES.slice(0, 12).map(caseStudyToLink);
  }
  if (key === "communities" || key === "audience") {
    return COMMUNITIES.slice(0, 12).map(communityToLink);
  }
  if (key === "industries") {
    return INDUSTRY_PAGES.slice(0, 12).map(p => ({
      href: `/industries/${p.slug}`,
      title: `Marketing for ${p.industry}`,
      description: p.metaDescription,
      category: "Industries",
    }));
  }
  if (key === "cities" || key === "local") {
    return CITIES.slice(0, 12).map(c => ({
      href: `/local/${c.slug}`,
      title: c.name,
      description: `Small business marketing in ${c.name}, ${c.stateCode}.`,
      category: "Local",
    }));
  }
  if (key === "states") {
    return STATES.slice(0, 12).map(s => ({
      href: `/state/${s.slug}`,
      title: s.name,
      description: `Small business marketing across ${s.name}.`,
      category: "State",
    }));
  }
  if (key === "playbooks") {
    return PLAYBOOK_INDUSTRIES.slice(0, 12).map(i => ({
      href: `/playbooks/${i.slug}`,
      title: `${i.Name} playbooks`,
      description: `Campaign playbooks for ${i.name}.`,
      category: "Playbook",
    }));
  }
  if (key === "alternatives") {
    return ALTERNATIVES.slice(0, 12).map(a => ({
      href: `/alternatives/${a.slug}`,
      title: `${a.name} alternatives`,
      description: a.oneLiner,
      category: a.categoryLabel,
    }));
  }
  if (key === "compare" || key === "instead-of") {
    return DIY_METHODS.slice(0, 12).map(d => ({
      href: `/instead-of/${d.slug}`,
      title: `Instead of ${d.name}`,
      description: d.description,
      category: d.category,
    }));
  }

  return POPULAR;
}

export function getFooterLinks(): { [section: string]: RelatedLink[] } {
  const topIndustries = take(INDUSTRY_PAGES, 10).map(p => ({
    href: `/industries/${p.slug}`,
    title: p.industry,
    category: "Industries",
  }));

  const topCities = take(CITIES, 10).map(c => ({
    href: `/local/${c.slug}`,
    title: `${c.name}, ${c.stateCode}`,
    category: "Cities",
  }));

  const topTools = take(TOOLS, 9);

  const topGuides = take(HOWTO_GUIDES, 10).map(g => ({
    href: `/how-to/${g.slug}`,
    title: g.title,
    category: g.category,
  }));

  const topCompare = [
    ...take(ALTERNATIVES, 5).map(a => ({
      href: `/alternatives/${a.slug}`,
      title: `${a.name} alternatives`,
      category: a.categoryLabel,
    })),
    ...take(DIY_METHODS, 5).map(d => ({
      href: `/instead-of/${d.slug}`,
      title: `Instead of ${d.name}`,
      category: d.category,
    })),
  ];

  const topResources: RelatedLink[] = [
    { href: "/blog", title: "Blog", category: "Resources" },
    { href: "/case-studies", title: "Case studies", category: "Resources" },
    { href: "/how-to", title: "How-to guides", category: "Resources" },
    { href: "/glossary", title: "Marketing glossary", category: "Resources" },
    { href: "/tools", title: "Free tools", category: "Resources" },
    { href: "/templates", title: "Templates", category: "Resources" },
    { href: "/communities", title: "By audience", category: "Resources" },
    { href: "/playbooks", title: "Playbooks", category: "Resources" },
    { href: "/ask", title: "Q&A library", category: "Resources" },
    { href: "/site-map", title: "Site map", category: "Resources" },
  ];

  return {
    Industries: topIndustries,
    Cities: topCities,
    Tools: topTools,
    Guides: topGuides,
    Compare: topCompare,
    Resources: topResources,
  };
}
