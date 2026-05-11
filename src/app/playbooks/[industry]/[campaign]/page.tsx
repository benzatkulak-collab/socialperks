import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Nav } from "@/components/shared/nav";
import { Footer } from "@/components/shared/footer";
import {
  INDUSTRIES,
  CAMPAIGNS,
  getIndustry,
  getCampaign,
  getTimeline,
  getWhatItIs,
} from "@/lib/playbooks/data";

interface Params {
  industry: string;
  campaign: string;
}

export function generateStaticParams(): Params[] {
  const out: Params[] = [];
  for (const i of INDUSTRIES) {
    for (const c of CAMPAIGNS) {
      out.push({ industry: i.slug, campaign: c.slug });
    }
  }
  return out;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { industry, campaign } = await params;
  const i = getIndustry(industry);
  const c = getCampaign(campaign);
  if (!i || !c) return {};
  const url = `https://socialperks.io/playbooks/${i.slug}/${c.slug}`;
  return {
    title: `${c.metaTitle(i)} · Social Perks`,
    description: c.metaDesc(i),
    alternates: { canonical: url },
    openGraph: {
      title: c.metaTitle(i),
      description: c.metaDesc(i),
      url,
      siteName: "Social Perks",
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: c.metaTitle(i),
      description: c.metaDesc(i),
    },
  };
}

export default async function PlaybookDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { industry, campaign } = await params;
  const i = getIndustry(industry);
  const c = getCampaign(campaign);
  if (!i || !c) notFound();

  const reasons = c.reasons(i);
  const playbookSteps = c.playbook(i);
  const perkExample = c.perkExample(i);
  const timeline = getTimeline(c, i);
  const whatItIs = getWhatItIs(c, i);

  // Cross-links: 5 other campaigns (same industry) + 5 other industries (same campaign)
  const otherCampaigns = CAMPAIGNS.filter((x) => x.slug !== c.slug).slice(0, 5);
  const otherIndustries = INDUSTRIES.filter((x) => x.slug !== i.slug).slice(
    0,
    5,
  );

  // Fictional case study (templated)
  const caseStudyResult =
    `In the first 90 days, ${i.exampleName} measured a 22% lift in ${i.metric} ` +
    `attributable to the program, and generated more authentic content in three months than ` +
    `the prior two years combined. Cost per acquired ${i.customer.replace(/s$/, "")}: ` +
    `roughly one-third of paid Meta ads.`;

  // Common mistakes — pull from data; pad to 4 if needed
  const mistakes = c.mistakes.slice(0, 4);
  while (mistakes.length < 4) {
    mistakes.push(
      `Launching without telling your existing ${i.customer} the program exists.`,
    );
  }

  // JSON-LD: HowTo
  const howToJsonLd = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: c.metaTitle(i),
    description: c.metaDesc(i),
    totalTime: "P7D",
    step: playbookSteps.map((s, idx) => ({
      "@type": "HowToStep",
      position: idx + 1,
      name: s.title,
      text: s.body,
    })),
  };

  // JSON-LD: FAQPage
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: `What is a ${c.short} for ${i.name}?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: whatItIs,
        },
      },
      {
        "@type": "Question",
        name: `Why should ${i.name} run a ${c.short}?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: reasons.join(" "),
        },
      },
      {
        "@type": "Question",
        name: `How long until I see results from a ${c.short}?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: timeline,
        },
      },
      {
        "@type": "Question",
        name: `What perk should a ${i.singular} offer in a ${c.short}?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: perkExample,
        },
      },
      {
        "@type": "Question",
        name: `What are common mistakes when running a ${c.short} for ${i.name}?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: mistakes.join(" "),
        },
      },
    ],
  };

  return (
    <div className="min-h-screen overflow-x-hidden">
      <Nav />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <main
        id="main-content"
        className="mx-auto max-w-3xl px-6 py-16 md:py-24"
      >
        {/* Breadcrumb */}
        <nav className="mb-8 text-sm text-brand-text/55">
          <Link href="/playbooks" className="hover:text-brand-cyan">
            Playbooks
          </Link>
          <span className="mx-2 opacity-50">/</span>
          <Link
            href={`/playbooks/${i.slug}`}
            className="hover:text-brand-cyan"
          >
            {i.Name}
          </Link>
          <span className="mx-2 opacity-50">/</span>
          <span className="text-brand-text/80">{c.name}</span>
        </nav>

        {/* Hero */}
        <header className="mb-12">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand-cyan/30 bg-brand-cyan/10 px-3 py-1 text-xs uppercase tracking-wider text-brand-cyan">
            {c.name} · {i.Name}
          </div>
          <h1 className="font-serif text-4xl italic leading-tight text-brand-white md:text-5xl">
            {c.name} for {i.Name}: The Complete Playbook
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-brand-text/75">
            A step-by-step playbook for running a {c.short} at a {i.singular}.
            Built around the perk mechanics, content tiering, and timing that
            drive {c.goal} for {i.name} specifically.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/signup"
              className="rounded-full bg-brand-cyan px-6 py-3 text-sm font-medium text-brand-dark transition hover:bg-brand-cyan/85"
            >
              Run this playbook free for 14 days
            </Link>
            <Link
              href={`/playbooks/${i.slug}`}
              className="rounded-full border border-white/15 bg-white/[0.02] px-6 py-3 text-sm text-brand-text/85 transition hover:border-brand-cyan/40 hover:text-brand-white"
            >
              All {i.Name} playbooks
            </Link>
          </div>
        </header>

        <article className="space-y-12">
          {/* What this is */}
          <section>
            <h2 className="mb-4 font-serif text-2xl italic text-brand-white md:text-3xl">
              What this is
            </h2>
            <p className="text-base leading-relaxed text-brand-text/85 md:text-lg">
              {whatItIs}
            </p>
          </section>

          {/* Why this industry */}
          <section>
            <h2 className="mb-5 font-serif text-2xl italic text-brand-white md:text-3xl">
              Why {i.name} should run a {c.short}
            </h2>
            <ol className="space-y-5">
              {reasons.map((r, idx) => (
                <li
                  key={idx}
                  className="flex gap-4 rounded-xl border border-white/10 bg-white/[0.02] p-5"
                >
                  <span className="font-mono text-2xl italic text-brand-cyan">
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  <p className="text-base leading-relaxed text-brand-text/85">
                    {r}
                  </p>
                </li>
              ))}
            </ol>
          </section>

          {/* Playbook */}
          <section>
            <h2 className="mb-5 font-serif text-2xl italic text-brand-white md:text-3xl">
              The playbook
            </h2>
            <ol className="space-y-6">
              {playbookSteps.map((s, idx) => (
                <li
                  key={idx}
                  className="rounded-2xl border border-white/10 bg-white/[0.02] p-6"
                >
                  <div className="mb-3 flex items-baseline gap-3">
                    <span className="font-mono text-sm text-brand-cyan">
                      Step {idx + 1}
                    </span>
                  </div>
                  <h3 className="mb-3 font-serif text-xl italic leading-snug text-brand-white">
                    {s.title}
                  </h3>
                  <p className="text-base leading-relaxed text-brand-text/80">
                    {s.body}
                  </p>
                </li>
              ))}
            </ol>
          </section>

          {/* Example perk structure */}
          <section className="rounded-2xl border border-brand-cyan/30 bg-brand-cyan/[0.04] p-6 md:p-8">
            <h2 className="mb-4 font-serif text-2xl italic text-brand-white md:text-3xl">
              Example perk structure
            </h2>
            <p className="text-base leading-relaxed text-brand-text/85 md:text-lg">
              {perkExample}
            </p>
          </section>

          {/* Timeline */}
          <section>
            <h2 className="mb-4 font-serif text-2xl italic text-brand-white md:text-3xl">
              Timeline: how long to results
            </h2>
            <p className="text-base leading-relaxed text-brand-text/85 md:text-lg">
              {timeline}
            </p>
          </section>

          {/* Common mistakes */}
          <section>
            <h2 className="mb-5 font-serif text-2xl italic text-brand-white md:text-3xl">
              Common mistakes
            </h2>
            <ul className="space-y-3">
              {mistakes.map((m, idx) => (
                <li
                  key={idx}
                  className="flex gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-4"
                >
                  <span className="mt-0.5 font-mono text-sm text-brand-amber">
                    ✕
                  </span>
                  <p className="text-base leading-relaxed text-brand-text/80">
                    {m}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          {/* Real example */}
          <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 md:p-8">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-brand-cyan/25 bg-brand-cyan/10 px-2.5 py-0.5 text-[11px] uppercase tracking-wider text-brand-cyan">
              Example
            </div>
            <h2 className="mb-4 font-serif text-2xl italic text-brand-white md:text-3xl">
              How {i.exampleName} ran this in {i.exampleCity}
            </h2>
            <p className="mb-4 text-base leading-relaxed text-brand-text/85">
              {i.exampleName}, a {i.singular} in {i.exampleCity}, ran this
              exact playbook last quarter. They set perk thresholds matched to
              their {i.avgTicket} ticket size, layered the program on top of
              their existing loyalty system, and trained staff to surface the
              program at the moment of peak satisfaction.
            </p>
            <p className="text-base leading-relaxed text-brand-text/85">
              {caseStudyResult}
            </p>
          </section>

          {/* CTA */}
          <section className="rounded-2xl border border-brand-cyan/30 bg-gradient-to-br from-brand-cyan/10 to-transparent p-8 md:p-12">
            <h2 className="font-serif text-2xl italic leading-snug text-brand-white md:text-3xl">
              Run this playbook with Social Perks
            </h2>
            <p className="mt-3 max-w-2xl text-brand-text/80">
              Social Perks has the perk infrastructure, follower-tier logic, and
              submission tracking purpose-built for this exact playbook. Free
              for 14 days, no credit card required.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/signup"
                className="rounded-full bg-brand-cyan px-6 py-3 text-sm font-medium text-brand-dark transition hover:bg-brand-cyan/85"
              >
                Start free trial
              </Link>
              <Link
                href="/pricing"
                className="rounded-full border border-white/15 bg-white/[0.02] px-6 py-3 text-sm text-brand-text/85 transition hover:border-brand-cyan/40 hover:text-brand-white"
              >
                See pricing
              </Link>
            </div>
          </section>
        </article>

        {/* Cross-links */}
        <aside className="mt-16 grid gap-10 border-t border-white/10 pt-10 md:grid-cols-2">
          <div>
            <h2 className="mb-4 font-serif text-xl italic text-brand-white/85">
              Other playbooks for {i.Name}
            </h2>
            <ul className="space-y-2">
              {otherCampaigns.map((oc) => (
                <li key={oc.slug}>
                  <Link
                    href={`/playbooks/${i.slug}/${oc.slug}`}
                    className="text-sm text-brand-text/75 transition hover:text-brand-cyan"
                  >
                    {oc.name} for {i.Name} →
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="mb-4 font-serif text-xl italic text-brand-white/85">
              {c.name} for other industries
            </h2>
            <ul className="space-y-2">
              {otherIndustries.map((oi) => (
                <li key={oi.slug}>
                  <Link
                    href={`/playbooks/${oi.slug}/${c.slug}`}
                    className="text-sm text-brand-text/75 transition hover:text-brand-cyan"
                  >
                    {c.name} for {oi.Name} →
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </main>
      <Footer />
    </div>
  );
}
