"use client";

import { useState } from "react";

// ─── Launch copy (single source of truth) ────────────────────────────────────

const TAGLINE = "AI marketing manager for small business owners";

const DESCRIPTION =
  "Your AI marketing manager works 24/7. Connects to Instagram and Google. Runs review campaigns, manages influencers, sends perks to customers — all on autopilot. Free for 14 days. No credit card.";

const TOPICS = ["Artificial Intelligence", "Small Business", "Marketing"];

const MAKER_COMMENT = `Hey Product Hunt 👋

I'm Ben, the founder of Social Perks. I built this because I watched my parents pour everything into their small business and still struggle to get found online. They didn't need another dashboard — they needed a marketing manager. They couldn't afford one.

So I built one with AI.

Social Perks is your AI marketing manager. It runs review campaigns, finds local influencers, manages perks for repeat customers, and posts content for you. You connect Instagram and Google once. It works 24/7 after that.

What's different:
• AI does the work, not you (most "AI marketing" tools are just templates)
• Customers earn real perks for posting/reviewing — built-in word-of-mouth engine
• Connects to 25 platforms, 125 actions out of the box
• Free 14 days, no credit card, $29/mo after

I'd love your feedback — especially from anyone who runs (or has run) a small business. What's the one marketing task you wish would just disappear? That's what I'm building toward.`;

const FIRST_COMMENT = `Quick context for hunters checking this out:

• 🎯 Built for: mom & pop shops, restaurants, salons, studios — anyone with under 10 locations
• 🤖 AI plans your campaigns, writes posts, picks the right perks, reviews submissions
• 💸 Free 14 days · $29/mo after · cancel anytime
• 🔌 Works with: Instagram, Google Reviews, TikTok, Facebook (15 platforms total)
• 📈 Average customer: 3.2× more reviews in month one

Happy to answer anything in the comments. If you try it and something's broken, tell me — I'm watching this thread all day.`;

const HUNTER_DMS = [
  `Hey [Name] — long-time fan of [their last hunt]. I just shipped Social Perks: an AI marketing manager that small businesses actually use (not another dashboard). Launching on PH next Tuesday. Would love to have you hunt it — I think your audience would dig the AI angle. Quick 30-sec demo: [link]. No worries if not a fit!`,
  `Hi [Name] 👋 You hunted [product] which is right next door to what I'm doing. I'm launching Social Perks — AI that runs marketing for small businesses on autopilot — and looking for a hunter who gets the SMB / AI tooling space. Down to take a look? Demo: [link]`,
  `Hey [Name] — your write-up on [their post] was the kick I needed to actually launch. Quick ask: would you hunt my product on Tuesday? It's Social Perks, an AI marketing manager for small biz. Happy to send a free lifetime account either way as a thank you for the inspo. Demo: [link]`,
  `[Name], quick one — I'm hunting on Tuesday and looking for a hunter with strong SMB/AI followers. Social Perks turns customers into your marketing team using AI. 14-day free trial, $29/mo, no fluff. Worth a 60-sec look? [link]`,
  `Hey [Name] 👋 Big fan of how you talk about AI for non-technical users — that's exactly who I built Social Perks for. Launching next Tuesday on PH. Would mean the world if you'd hunt it. Here's a 90-sec walkthrough: [link]. Cool either way!`,
];

const SOCIAL_POSTS = [
  `🚀 We're live on Product Hunt today!\n\nSocial Perks is the AI marketing manager I wish my parents had when they ran their shop.\n\nIt runs review campaigns, manages perks, finds influencers — on autopilot.\n\nWould mean a lot if you'd check it out 👇\n[PH link]`,
  `After 11 months of building, Social Perks is live on @ProductHunt today.\n\nIt's an AI marketing manager for small businesses. Connects to IG + Google, runs your campaigns 24/7, sends perks to customers who post about you.\n\nUpvotes appreciated 🙏 [link]`,
  `Small business owners: stop posting your own content. Stop chasing reviews.\n\nLet AI do it.\n\nSocial Perks (live on PH today) is the marketing manager you can't afford to hire — for $29/mo.\n\nFree 14 days, no card. [PH link]`,
  `LinkedIn version:\n\nI just launched Social Perks on Product Hunt.\n\nThe problem: small businesses pay $3k–$8k/mo for a marketing agency, or do nothing.\n\nThe wedge: AI does the work an agency would, for $29/mo.\n\nBuilt this for my parents. Now shipping it for everyone. Link in comments.`,
  `Today's the day. Social Perks is live on Product Hunt 🎉\n\nIf you've ever told a small business owner "you should post more on Instagram" and watched their eyes glaze over — this is for them.\n\nAI handles the marketing. They run their business.\n\n[PH link] · upvote = 💛`,
];

const EMAIL_TO_NETWORK = `Subject: I'm launching today — would love your support

Hey [first name],

Quick favor. I'm launching Social Perks on Product Hunt today and the first 4 hours decide everything.

If you've got 30 seconds, an upvote here would genuinely change the trajectory:
👉 [PH link]

What it is: an AI marketing manager for small businesses. Connects to Instagram + Google, runs review/referral campaigns, manages customer perks. $29/mo after a 14-day free trial.

If you don't have a PH account, signing up takes ~20 seconds with Twitter or LinkedIn.

I owe you a coffee (or a beer, your call). Thanks for reading this.

— Ben

P.S. Even better than upvoting: a comment about what you'd want from a tool like this. PH ranks comments higher than upvotes.`;

const IMAGE_PROMPTS = [
  `Image 1 — Hero / product screenshot. Dark UI (#0C0F1A), cyan accent (#22D3EE). Show the main dashboard: an AI agent card on the left ("Plan ready: 4 campaigns this week"), three campaign cards in the middle (Review Drive / Influencer Outreach / Customer Perk), and a metrics column on the right (3.2× reviews, 47 new customers). Caption overlay: "Your AI marketing manager. Working now." Format: 1270×760, PNG.`,
  `Image 2 — Before / after split. Left side: a stressed shop owner buried in 8 marketing tools (Canva, Hootsuite, Mailchimp logos in a chaotic pile). Right side: same owner, smiling, looking at one Social Perks dashboard on a laptop. Caption: "One AI. All your marketing." Style: clean illustration, dark theme, cyan highlights. Format: 1270×760.`,
  `Image 3 — How it works flow diagram. Three steps as cards: (1) "Connect" with IG + Google logos, (2) "AI plans" with a robot icon and a sample campaign list, (3) "Customers post" with phone screens showing real reviews/posts. Arrows between cards in cyan. Bottom strip: "Free 14 days · $29/mo · No card." Format: 1270×760.`,
];

const FAQ: { q: string; a: string }[] = [
  {
    q: "How is this different from Hootsuite, Buffer, or Later?",
    a: "Those are publishing tools — you still write the posts. Social Perks is a marketing manager — the AI plans, writes, and runs campaigns for you. Closer to hiring a $4k/mo agency, priced like a SaaS subscription.",
  },
  {
    q: "What does it actually do day-to-day?",
    a: "Generates a weekly marketing plan, writes social posts, runs review-request campaigns, finds and DMs local influencers, manages a perk/loyalty program for repeat customers, and reviews user-submitted content for compliance — all from one dashboard.",
  },
  {
    q: "How much does it cost?",
    a: "Free for 14 days, no credit card. After that: $29/mo for solo businesses, $79/mo for multi-location, custom pricing for enterprise. Cancel anytime.",
  },
  {
    q: "Which platforms does it integrate with?",
    a: "Instagram, Google Reviews, TikTok, Facebook, X, YouTube, Yelp, LinkedIn, Pinterest, Snapchat, Threads, Reddit, Twitch, Telegram, WhatsApp Business — 15 platforms with 107 supported actions.",
  },
  {
    q: "Is the AI replacing a real marketing person?",
    a: "It replaces a junior coordinator and most of the work an agency does for small accounts. For brand strategy or a big launch, you still want a human. For the weekly grind of posts/reviews/influencer outreach? AI is honestly better — it doesn't forget.",
  },
  {
    q: "What about FTC compliance and disclosure rules?",
    a: "Built in. Every influencer post we generate or review includes the required #ad / #partner disclosure for the platform it's running on. The compliance engine is non-optional — you can't turn it off.",
  },
  {
    q: "What happens to my data?",
    a: "Stored in Supabase Postgres with row-level security. We don't sell it, don't train models on it, and you can export or delete everything in one click from settings.",
  },
  {
    q: "I'm not technical. Is this actually usable?",
    a: "That's exactly who it's for. Setup is 3 steps: sign up, connect Instagram + Google, pick your goal. The AI takes it from there. If you can use Instagram, you can use this.",
  },
];

// ─── UI ──────────────────────────────────────────────────────────────────────

function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <button
      type="button"
      onClick={onCopy}
      className="inline-flex items-center gap-1.5 rounded-md border border-brand-border bg-brand-surface/60 px-3 py-1.5 text-xs font-medium text-brand-dim transition-colors hover:border-brand-cyan/50 hover:text-brand-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/40"
      aria-label={copied ? "Copied" : label}
    >
      {copied ? "✓ Copied" : label}
    </button>
  );
}

function Section({
  title,
  subtitle,
  copy,
  children,
}: {
  title: string;
  subtitle?: string;
  copy?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-brand-border bg-brand-surface/40 p-6 sm:p-8">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="font-heading text-2xl italic text-brand-white sm:text-3xl">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-1 text-sm text-brand-dim">{subtitle}</p>
          )}
        </div>
        {copy && <CopyButton text={copy} />}
      </div>
      {children}
    </section>
  );
}

export default function LaunchKitPage() {
  return (
    <>
      {/* Keep this page out of search engines — it's an internal launch asset. */}
      <meta name="robots" content="noindex" />

      <main className="min-h-screen bg-brand-bg px-4 py-12 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-4xl">
          {/* Header */}
          <header className="mb-10 text-center">
            <p className="font-mono text-xs uppercase tracking-widest text-brand-cyan">
              Internal · Product Hunt
            </p>
            <h1 className="mt-2 font-heading text-4xl italic text-brand-white sm:text-5xl">
              Launch Kit
            </h1>
            <p className="mt-3 text-sm text-brand-dim">
              All the copy, templates, and assets for launch day. Click any{" "}
              <span className="text-brand-white">Copy</span> button to grab the
              text.
            </p>
          </header>

          <div className="space-y-6">
            {/* Tagline */}
            <Section
              title="Tagline"
              subtitle={`${TAGLINE.length} characters · target ≤60`}
              copy={TAGLINE}
            >
              <p className="rounded-lg border border-brand-border bg-brand-bg/60 p-4 text-base text-brand-white">
                {TAGLINE}
              </p>
            </Section>

            {/* Description */}
            <Section
              title="Description"
              subtitle={`${DESCRIPTION.length} characters · target ≤260`}
              copy={DESCRIPTION}
            >
              <p className="rounded-lg border border-brand-border bg-brand-bg/60 p-4 text-sm leading-relaxed text-brand-text">
                {DESCRIPTION}
              </p>
            </Section>

            {/* Topics */}
            <Section title="Topics" subtitle="Pick exactly 3 on PH">
              <div className="flex flex-wrap gap-2">
                {TOPICS.map((t) => (
                  <span
                    key={t}
                    className="rounded-full border border-brand-cyan/30 bg-brand-cyan/10 px-3 py-1 text-xs font-medium text-brand-cyan"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </Section>

            {/* Maker comment */}
            <Section
              title="Maker comment"
              subtitle="Pin this to the top of your launch"
              copy={MAKER_COMMENT}
            >
              <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg border border-brand-border bg-brand-bg/60 p-4 font-body text-sm leading-relaxed text-brand-text">
                {MAKER_COMMENT}
              </pre>
            </Section>

            {/* First comment */}
            <Section
              title="First comment"
              subtitle="Post this from your account 1 minute after launch"
              copy={FIRST_COMMENT}
            >
              <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg border border-brand-border bg-brand-bg/60 p-4 font-body text-sm leading-relaxed text-brand-text">
                {FIRST_COMMENT}
              </pre>
            </Section>

            {/* Hunter outreach */}
            <Section
              title="Hunter outreach DMs"
              subtitle="5 templates · personalize [Name] / [link] before sending"
            >
              <div className="space-y-3">
                {HUNTER_DMS.map((dm, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-brand-border bg-brand-bg/60 p-4"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="font-mono text-xs text-brand-muted">
                        DM #{i + 1}
                      </span>
                      <CopyButton text={dm} />
                    </div>
                    <p className="text-sm leading-relaxed text-brand-text">
                      {dm}
                    </p>
                  </div>
                ))}
              </div>
            </Section>

            {/* Social posts */}
            <Section
              title="Twitter / LinkedIn launch posts"
              subtitle="5 variants · schedule across launch day"
            >
              <div className="space-y-3">
                {SOCIAL_POSTS.map((post, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-brand-border bg-brand-bg/60 p-4"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="font-mono text-xs text-brand-muted">
                        Post #{i + 1}
                      </span>
                      <CopyButton text={post} />
                    </div>
                    <pre className="whitespace-pre-wrap font-body text-sm leading-relaxed text-brand-text">
                      {post}
                    </pre>
                  </div>
                ))}
              </div>
            </Section>

            {/* Email to network */}
            <Section
              title="Email to your network"
              subtitle="Send T-0 · personalize [first name] / [PH link]"
              copy={EMAIL_TO_NETWORK}
            >
              <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg border border-brand-border bg-brand-bg/60 p-4 font-body text-sm leading-relaxed text-brand-text">
                {EMAIL_TO_NETWORK}
              </pre>
            </Section>

            {/* Image gallery prompts */}
            <Section
              title="Image gallery prompts"
              subtitle="3 visuals · upload in order"
            >
              <div className="space-y-3">
                {IMAGE_PROMPTS.map((prompt, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-brand-border bg-brand-bg/60 p-4"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="font-mono text-xs text-brand-cyan">
                        Image {i + 1}
                      </span>
                      <CopyButton text={prompt} />
                    </div>
                    <p className="text-sm leading-relaxed text-brand-text">
                      {prompt}
                    </p>
                  </div>
                ))}
              </div>
            </Section>

            {/* FAQ */}
            <Section
              title="Maker FAQ"
              subtitle="Anticipated questions · paste answers in real-time as comments come in"
            >
              <div className="space-y-4">
                {FAQ.map((item, i) => (
                  <details
                    key={i}
                    className="group rounded-lg border border-brand-border bg-brand-bg/60 p-4"
                  >
                    <summary className="flex cursor-pointer items-start justify-between gap-3 text-sm font-medium text-brand-white">
                      <span>
                        <span className="mr-2 font-mono text-xs text-brand-cyan">
                          Q{i + 1}.
                        </span>
                        {item.q}
                      </span>
                      <span className="font-mono text-xs text-brand-muted transition-transform group-open:rotate-45">
                        +
                      </span>
                    </summary>
                    <div className="mt-3 flex items-start justify-between gap-3 border-t border-brand-border pt-3">
                      <p className="text-sm leading-relaxed text-brand-text">
                        {item.a}
                      </p>
                      <CopyButton text={item.a} />
                    </div>
                  </details>
                ))}
              </div>
            </Section>
          </div>

          <footer className="mt-10 text-center text-xs text-brand-muted">
            Internal launch asset · noindex · not linked from public nav
          </footer>
        </div>
      </main>
    </>
  );
}
