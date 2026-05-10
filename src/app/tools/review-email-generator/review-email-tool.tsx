"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type Tone = "friendly" | "professional" | "post-purchase";

interface Template {
  id: Tone;
  label: string;
  description: string;
  build: (ctx: BuildContext) => { subject: string; body: string };
}

interface BuildContext {
  business: string;
  customer: string;
  reason: string;
}

function safe(str: string, fallback: string): string {
  const s = str.trim();
  return s.length > 0 ? s : fallback;
}

const TEMPLATES: Template[] = [
  {
    id: "friendly",
    label: "Friendly",
    description: "Warm and casual. Feels like a note from a real person.",
    build: ({ business, customer, reason }) => {
      const name = safe(customer, "there");
      const biz = safe(business, "our shop");
      const what = safe(reason, "stopping by");
      return {
        subject: `A small favor from ${biz}`,
        body: `Hi ${name},

Thanks so much for ${what} — it genuinely made our week. Small businesses like ours live and die by word of mouth, and a Google review from you would mean the world.

It takes about 30 seconds, and it helps other people find us:
[Insert your Google review link]

No pressure at all. Either way, we hope to see you again soon.

Thanks,
The team at ${biz}`,
      };
    },
  },
  {
    id: "professional",
    label: "Professional",
    description: "Polished and direct. Good for B2B or service businesses.",
    build: ({ business, customer, reason }) => {
      const name = safe(customer, "valued customer");
      const biz = safe(business, "our team");
      const what = safe(reason, "your recent visit");
      return {
        subject: `Would you share your experience with ${biz}?`,
        body: `Hello ${name},

Thank you for choosing ${biz}. We hope ${what} met your expectations.

If you have a moment, we'd be grateful if you could share your experience in a Google review. Honest feedback helps us improve, and helps other customers decide whether we're the right fit for them.

You can leave a review here:
[Insert your Google review link]

If anything fell short, please reply to this email directly so we can make it right.

Sincerely,
${biz}`,
      };
    },
  },
  {
    id: "post-purchase",
    label: "Post-purchase",
    description: "For after a sale. Asks for review + offers a small thank-you.",
    build: ({ business, customer, reason }) => {
      const name = safe(customer, "friend");
      const biz = safe(business, "us");
      const what = safe(reason, "your purchase");
      return {
        subject: `Quick favor — and a thank-you on us`,
        body: `Hi ${name},

Hope you're loving ${what}! We poured a lot into making sure it was right, and your feedback helps us keep getting better.

Could you leave us a quick Google review? It really does make a difference for a small business like ours.

[Insert your Google review link]

As a thank-you for taking the time, we'd love to send a small perk on your next visit. Just reply with a screenshot of your review and we'll take care of you.

Talk soon,
${biz}`,
      };
    },
  },
];

export function ReviewEmailTool() {
  const [tone, setTone] = useState<Tone>("friendly");
  const [business, setBusiness] = useState("");
  const [customer, setCustomer] = useState("");
  const [reason, setReason] = useState("");
  const [copied, setCopied] = useState(false);

  const template = useMemo(
    () => TEMPLATES.find((t) => t.id === tone) ?? TEMPLATES[0],
    [tone],
  );

  const generated = useMemo(
    () => template.build({ business, customer, reason }),
    [template, business, customer, reason],
  );

  async function handleCopy() {
    const fullText = `Subject: ${generated.subject}\n\n${generated.body}`;
    try {
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select text manually
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        {/* Form */}
        <div className="rounded-2xl border border-brand-border bg-brand-surface/50 p-6">
          <h2 className="font-heading text-xl italic text-brand-white">
            Your details
          </h2>
          <p className="mt-1 text-sm text-brand-dim">
            Fill in what you know. Anything blank gets a friendly fallback.
          </p>

          <div className="mt-6 space-y-5">
            {/* Tone selector */}
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-[0.15em] text-brand-muted">
                Tone
              </label>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTone(t.id)}
                    className={`rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
                      tone === t.id
                        ? "border-brand-cyan bg-brand-cyan/10 text-brand-cyan"
                        : "border-brand-border bg-brand-surface/30 text-brand-dim hover:border-brand-subtle hover:text-brand-text"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-brand-muted">
                {template.description}
              </p>
            </div>

            <div>
              <label
                htmlFor="business"
                className="block font-mono text-[10px] uppercase tracking-[0.15em] text-brand-muted"
              >
                Business name
              </label>
              <input
                id="business"
                type="text"
                value={business}
                onChange={(e) => setBusiness(e.target.value)}
                placeholder="Sol Bakery"
                className="mt-2 w-full rounded-lg border border-brand-border bg-brand-bg/50 px-3 py-2.5 text-sm text-brand-text placeholder:text-brand-muted focus:border-brand-cyan/50 focus:outline-none focus:ring-1 focus:ring-brand-cyan/30"
              />
            </div>

            <div>
              <label
                htmlFor="customer"
                className="block font-mono text-[10px] uppercase tracking-[0.15em] text-brand-muted"
              >
                Customer name <span className="text-brand-muted/60">(optional)</span>
              </label>
              <input
                id="customer"
                type="text"
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
                placeholder="Jamie"
                className="mt-2 w-full rounded-lg border border-brand-border bg-brand-bg/50 px-3 py-2.5 text-sm text-brand-text placeholder:text-brand-muted focus:border-brand-cyan/50 focus:outline-none focus:ring-1 focus:ring-brand-cyan/30"
              />
            </div>

            <div>
              <label
                htmlFor="reason"
                className="block font-mono text-[10px] uppercase tracking-[0.15em] text-brand-muted"
              >
                What did they buy or visit for?
              </label>
              <input
                id="reason"
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="our sourdough class"
                className="mt-2 w-full rounded-lg border border-brand-border bg-brand-bg/50 px-3 py-2.5 text-sm text-brand-text placeholder:text-brand-muted focus:border-brand-cyan/50 focus:outline-none focus:ring-1 focus:ring-brand-cyan/30"
              />
            </div>
          </div>
        </div>

        {/* Output */}
        <div className="rounded-2xl border border-brand-border bg-brand-surface/50 p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-xl italic text-brand-white">
              Your email
            </h2>
            <button
              type="button"
              onClick={handleCopy}
              className={`rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
                copied
                  ? "bg-brand-green/20 text-brand-green"
                  : "bg-brand-cyan text-brand-bg hover:bg-cyan-300"
              }`}
            >
              {copied ? "Copied ✓" : "Copy email"}
            </button>
          </div>

          <div className="mt-5 space-y-4">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-brand-muted">
                Subject
              </div>
              <div className="mt-1 rounded-lg border border-brand-border/50 bg-brand-bg/40 px-3 py-2.5 font-body text-sm text-brand-white">
                {generated.subject}
              </div>
            </div>

            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-brand-muted">
                Body
              </div>
              <pre className="mt-1 whitespace-pre-wrap rounded-lg border border-brand-border/50 bg-brand-bg/40 p-4 font-body text-sm leading-relaxed text-brand-text">
{generated.body}
              </pre>
            </div>

            <p className="text-xs text-brand-muted">
              Tip: Replace{" "}
              <span className="font-mono text-brand-dim">
                [Insert your Google review link]
              </span>{" "}
              with your business&apos;s Google review URL. Find it in your
              Google Business Profile under &quot;Get more reviews.&quot;
            </p>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="mt-12 rounded-2xl border border-brand-border bg-gradient-to-br from-brand-cyan/[0.06] via-brand-surface/30 to-brand-surface/30 p-8 text-center sm:p-10">
        <h3 className="font-heading text-2xl italic leading-tight text-brand-white sm:text-3xl">
          Want this on autopilot?
        </h3>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-brand-dim sm:text-base">
          Social Perks sends review requests automatically after every
          purchase — and rewards customers who leave reviews with perks they
          actually want.
        </p>
        <Link
          href="/ai"
          className="mt-6 inline-flex items-center gap-1.5 rounded-xl bg-brand-cyan px-7 py-3 text-sm font-semibold text-brand-bg transition-all hover:bg-cyan-300 hover:shadow-lg hover:shadow-brand-cyan/20"
        >
          See how it works →
        </Link>
      </div>
    </div>
  );
}
