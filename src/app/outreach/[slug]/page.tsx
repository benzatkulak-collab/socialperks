import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  OUTREACH_TEMPLATES,
  getOutreachTemplate,
  CATEGORY_LABELS,
  CHANNEL_LABELS,
  type OutreachCategory,
} from "@/lib/outreach/data";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return OUTREACH_TEMPLATES.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const template = getOutreachTemplate(slug);
  if (!template) return { title: "Template not found" };

  const title = `${template.title} — Free Copy/Paste Script`;
  const description = `${template.goal} ${template.context.slice(0, 140)}`;

  return {
    title,
    description,
    alternates: { canonical: `/outreach/${slug}` },
    keywords: [
      template.title.toLowerCase(),
      CHANNEL_LABELS[template.channel].toLowerCase() + " template",
      CATEGORY_LABELS[template.category].toLowerCase() + " script",
      "cold outreach template",
      "small business outreach",
    ],
    openGraph: {
      title,
      description,
      type: "article",
    },
  };
}

const WHY_IT_WORKS: Record<OutreachCategory, string> = {
  "influencer-outreach":
    "Influencer outreach succeeds or fails on the first message. Creators receive dozens of branded DMs and pitches every week — most are interchangeable, mass-sent, and clearly built for a CRM rather than a human. This template wins because it inverts the usual structure: it leads with a gift instead of an ask, it names a specific recent piece of content (proving the message isn't templated), and it uses concrete logistical language ('I'll ship it tomorrow') instead of vague brand-speak. The psychological lever underneath is reciprocity — giving before asking creates a small social debt the recipient often resolves by replying, even if the answer is 'no thanks'. The shorter format also matters mechanically: messages over ~60 words on Instagram get auto-collapsed, which kills reply rates regardless of how good the writing is.",
  "customer-followup":
    "Customer follow-ups work because they convert routine transactional moments into relational ones. Most businesses send post-purchase emails that read like receipts. This template reads like a note from a person who runs the business, which is rare enough to stand out. The mechanism is what behavioral researchers call the 'peak-end rule' — customers remember an experience disproportionately by its peak moment and its ending. A thoughtful, low-ask follow-up resets the ending to be warm and human, which raises the customer's overall recall of the experience and their willingness to return. It also intercepts complaints privately before they become public reviews, which is one of the highest-ROI moves a small business can make.",
  "review-request":
    "Review requests succeed when three things line up: timing, relationship, and frictionlessness. This template handles all three. Timing-wise, the ask lands during the window when the customer's satisfaction is still vivid but their schedule has caught up enough to honor a small favor. Relationship-wise, the language acknowledges that you're asking for something, which is more disarming than pretending the email is neutral. Frictionlessness-wise, the direct review link removes the 4-7 clicks a generic Google search would require, and conversion drops 30-50% with each click. The honesty about the ask ('I'm going to ask for something, but I want to be honest about it') outperforms slicker, more clever versions because trust is the actual conversion lever — and trust collapses the moment a customer suspects manipulation.",
  partnership:
    "Local partnership outreach is high-leverage because it bypasses the cold-acquisition tax entirely. The other business has already done the work of acquiring the customer; you're just borrowing the trust. This template works because it does three counterintuitive things: it names a specific observation (proving you've actually visited or studied them), it offers the 'simple version' first (because local owners are too time-starved to commit to complex co-marketing), and it suggests coffee rather than a meeting (because the framing of the interaction shapes whether they say yes). The deeper psychology is that local business owners reciprocate with other local business owners far more readily than they engage with marketers — speaking the language of neighbors rather than brands is what gets the meeting.",
  "cold-pitch":
    "Cold pitches work or fail on the strength of the second sentence. The first sentence might earn 4 seconds of attention; the second sentence has to justify the next 20. This template wins by acknowledging upfront that it's a cold email — which is so rare it disarms the usual defenses — and then immediately demonstrating that real effort went into the message. The specific observation about the recipient's business is the actual currency here. It signals 'I researched you' more credibly than any other signal you can fit in an email. The offer to send a written-up suggestion (even without a meeting) leverages the reciprocity principle: most recipients will reply just to see the suggestion, even if they have no intention of buying. That reply is the only outcome the first email needs to produce.",
  rebooking:
    "Winback and rebooking outreach works because of a phenomenon called the 'forgotten relationship effect' — customers don't usually leave a business deliberately. They lapse because life got busy, or a competitor was closer, or they couldn't remember to come back. The right winback message doesn't push, doesn't discount, and doesn't manufacture urgency; it just reminds them they were welcomed. This template avoids the classic mistakes (expiring offers, guilt-trip language, generic 'we miss you' subject lines) and instead does the work of a friend nudging another friend — which is, after all, how most real winbacks happen offline. The customer fills in the missing reason for return on their own, which is far more durable than a reason you give them.",
};

const HOW_TO_STEPS = [
  {
    name: "Personalize the variables",
    text: "Replace every {variable} with the recipient's actual details. Generic sends convert at roughly 1/5th the rate of personalized ones.",
  },
  {
    name: "Read the template out loud",
    text: "If a phrase sounds robotic when spoken, it will read robotic too. Cut anything that doesn't sound like you.",
  },
  {
    name: "Send at the right time",
    text: "Use the timing guidance in the 'When to use this' section above. Wrong-time outreach is the biggest reason scripts that should work, don't.",
  },
  {
    name: "Track replies, not just opens",
    text: "Reply rate is the only metric that matters for outreach. Open rate is a vanity number that tells you nothing useful.",
  },
  {
    name: "Follow up at least once",
    text: "Roughly 60% of replies come from a follow-up, not the first message. Use the follow-up sequence provided below.",
  },
];

export default async function OutreachTemplatePage({ params }: PageProps) {
  const { slug } = await params;
  const template = getOutreachTemplate(slug);
  if (!template) notFound();

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://socialperks.app";
  const url = `${baseUrl}/outreach/${slug}`;

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: template.title,
    description: template.goal,
    author: { "@type": "Organization", name: "Social Perks" },
    publisher: {
      "@type": "Organization",
      name: "Social Perks",
      logo: {
        "@type": "ImageObject",
        url: `${baseUrl}/logo.png`,
      },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    datePublished: "2026-05-11",
    dateModified: "2026-05-11",
  };

  const howToJsonLd = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: `How to use the "${template.title}" script`,
    description: template.goal,
    totalTime: "PT5M",
    step: HOW_TO_STEPS.map((s, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: s.name,
      text: s.text,
    })),
  };

  return (
    <div className="min-h-screen bg-[#0C0F1A] text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToJsonLd) }}
      />

      <article className="mx-auto max-w-3xl px-6 py-16">
        <nav className="mb-8 flex flex-wrap items-center gap-2 text-sm text-white/50">
          <Link href="/outreach" className="hover:text-white">
            Outreach
          </Link>
          <span>/</span>
          <Link
            href={`/outreach/category/${template.category}`}
            className="hover:text-white"
          >
            {CATEGORY_LABELS[template.category]}
          </Link>
        </nav>

        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-cyan-300">
            {CHANNEL_LABELS[template.channel]}
          </span>
          <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-amber-300">
            {CATEGORY_LABELS[template.category]}
          </span>
        </div>

        <h1 className="mt-5 font-serif text-3xl italic leading-tight md:text-5xl">
          {template.title}
        </h1>

        <p className="mt-5 text-lg text-white/70">{template.goal}</p>

        <div className="mt-4 inline-flex items-center gap-2 rounded-md border border-green-400/30 bg-green-400/10 px-3 py-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
          <span className="font-mono text-xs text-green-300">
            {template.successRate}
          </span>
        </div>

        <section className="mt-12">
          <h2 className="font-serif text-2xl italic">When to use this</h2>
          <p className="mt-3 text-white/80">{template.context}</p>
        </section>

        <section className="mt-12">
          <h2 className="font-serif text-2xl italic">The template</h2>
          <p className="mt-2 text-sm text-white/50">
            Replace the {"{curly}"} variables with your specific details before
            sending.
          </p>
          <pre className="mt-4 overflow-x-auto whitespace-pre-wrap rounded-lg border border-white/15 bg-black/40 p-6 font-mono text-sm leading-relaxed text-white/90">
            {template.template}
          </pre>
          <CopyHint />
        </section>

        <section className="mt-12">
          <h2 className="font-serif text-2xl italic">
            Variables you&apos;ll need to fill in
          </h2>
          <ul className="mt-4 grid gap-2 md:grid-cols-2">
            {template.variables.map((v) => (
              <li
                key={v}
                className="rounded-md border border-white/10 bg-white/5 px-3 py-2 font-mono text-xs text-cyan-300"
              >
                {v}
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-12">
          <h2 className="font-serif text-2xl italic">Pro tips</h2>
          <ul className="mt-4 space-y-3">
            {template.proTips.map((tip, i) => (
              <li
                key={i}
                className="flex gap-3 rounded-md border border-white/10 bg-white/[0.03] p-4"
              >
                <span className="font-mono text-xs text-cyan-400">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="text-sm text-white/80">{tip}</span>
              </li>
            ))}
          </ul>
        </section>

        {template.followUps.length > 0 && (
          <section className="mt-12">
            <h2 className="font-serif text-2xl italic">Follow-up sequence</h2>
            <p className="mt-2 text-sm text-white/50">
              Send these only if you don&apos;t get a reply. Spacing is in days
              from your first message.
            </p>
            <div className="mt-6 space-y-4">
              {template.followUps.map((f, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-white/10 bg-white/[0.03] p-5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs uppercase tracking-wider text-amber-300">
                      Day {f.day}
                    </span>
                    <span className="font-mono text-[10px] text-white/40">
                      Follow-up #{i + 1}
                    </span>
                  </div>
                  <h3 className="mt-2 font-serif text-lg italic">
                    {f.subject}
                  </h3>
                  <pre className="mt-3 whitespace-pre-wrap font-mono text-sm leading-relaxed text-white/80">
                    {f.body}
                  </pre>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="mt-12">
          <h2 className="font-serif text-2xl italic">Why this works</h2>
          <p className="mt-4 text-white/80">{WHY_IT_WORKS[template.category]}</p>
        </section>

        <section className="mt-16 rounded-xl border border-cyan-400/30 bg-cyan-400/5 p-8 text-center">
          <h2 className="font-serif text-2xl italic md:text-3xl">
            Automate outreach with Social Perks
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-white/70">
            Stop copy-pasting one template at a time. Social Perks personalizes,
            schedules, and sends outreach like this — across email, DM, and SMS
            — using your own templates and tone.
          </p>
          <Link
            href="/ai"
            className="mt-6 inline-block rounded-md bg-cyan-400 px-6 py-3 font-medium text-[#0C0F1A] hover:bg-cyan-300"
          >
            See how it works →
          </Link>
        </section>

        <section className="mt-16 border-t border-white/10 pt-8">
          <h2 className="font-serif text-xl italic">More in this category</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {OUTREACH_TEMPLATES.filter(
              (t) => t.category === template.category && t.slug !== template.slug,
            )
              .slice(0, 4)
              .map((t) => (
                <Link
                  key={t.slug}
                  href={`/outreach/${t.slug}`}
                  className="rounded-md border border-white/10 bg-white/5 p-4 hover:border-cyan-400/40"
                >
                  <p className="font-mono text-[10px] uppercase tracking-wider text-cyan-300">
                    {CHANNEL_LABELS[t.channel]}
                  </p>
                  <p className="mt-1 font-serif italic">{t.title}</p>
                </Link>
              ))}
          </div>
        </section>
      </article>
    </div>
  );
}

function CopyHint() {
  return (
    <p className="mt-2 text-xs text-white/40">
      Tip: triple-click any line to select it, then copy. Or select the whole
      block above and paste into your email/DM client.
    </p>
  );
}
