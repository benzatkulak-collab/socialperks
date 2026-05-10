import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Chrome Extension — Social Perks",
  description:
    "Send review requests in one click from any customer's email. The Social Perks Chrome extension turns Gmail, Outlook, and any CRM into a review-request machine.",
  openGraph: {
    title: "Social Perks Chrome Extension",
    description:
      "Send review requests in one click from any customer's email.",
    url: "https://socialperks.onrender.com/extension",
    siteName: "Social Perks",
    type: "website",
  },
};

const CHROME_STORE_URL =
  "https://chrome.google.com/webstore/detail/social-perks/comingsoon";

const FEATURES = [
  {
    title: "1-click review requests",
    desc: "Hover over any customer email and send a personalized review request. No copy-paste, no template hunting.",
  },
  {
    title: "Customer history sync",
    desc: "Pulls past orders, visits, and engagement directly into your inbox. See who's a repeat customer instantly.",
  },
  {
    title: "Response tracking",
    desc: "Know exactly who clicked, who left a review, and who needs a friendly nudge — all without leaving your email.",
  },
];

const USE_CASES = [
  {
    title: "After a great service call",
    desc: "Just hung up with a happy customer? Click the extension button in your email reply and send a Google review link in seconds.",
  },
  {
    title: "When invoices are paid",
    desc: "Spot a paid invoice in your inbox? Trigger a review request the moment payment confirmation arrives.",
  },
  {
    title: "Following up on a quote",
    desc: "Customer accepted your estimate over email? Schedule an automatic review ask 7 days after the job completes.",
  },
  {
    title: "Reactivating quiet customers",
    desc: "See an old contact in your thread list? Send them a perk-rewarded review request to win them back.",
  },
];

const FAQS = [
  {
    q: "Which email clients does it work with?",
    a: "Gmail and Outlook on the web are fully supported. Apple Mail and native Outlook desktop are on the roadmap.",
  },
  {
    q: "Does it read my emails?",
    a: "Only the open thread you click on, and only after you press the Social Perks button. We never scan or store inbox contents in the background.",
  },
  {
    q: "Do I need a Social Perks account?",
    a: "Yes — the extension connects to your Social Perks dashboard to track responses and manage perks. A free trial works fine.",
  },
  {
    q: "Is it free?",
    a: "The extension is free. You only pay for your Social Perks subscription, which starts at $0/month for the Starter plan.",
  },
  {
    q: "Can my whole team use it?",
    a: "Yes. Each teammate installs the extension and signs in with their own account. Activity rolls up to your business dashboard.",
  },
];

export default function ExtensionPage() {
  return (
    <div className="min-h-screen bg-brand-bg">
      <header className="border-b border-brand-border/50">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="flex items-center gap-2"
            aria-label="Back to home"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-cyan/10">
              <span className="font-heading text-lg text-brand-cyan">S</span>
            </div>
            <span className="font-heading text-xl italic text-brand-white">
              Social Perks
            </span>
          </Link>
          <Link
            href="/"
            className="text-sm text-brand-muted transition-colors hover:text-brand-text"
          >
            &larr; Back to Home
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8 sm:py-16">
        {/* Hero */}
        <section className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-cyan/30 bg-brand-cyan/10 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.15em] text-brand-cyan">
              Chrome Extension
            </div>
            <h1 className="mt-4 font-heading text-3xl italic leading-tight text-brand-white sm:text-5xl">
              Social Perks Chrome Extension
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-brand-dim">
              Send review requests in one click from any customer&apos;s email.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href={CHROME_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-brand-cyan px-5 py-3 text-sm font-semibold text-brand-bg transition-opacity hover:opacity-90"
              >
                Install free &rarr;
              </a>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 rounded-lg border border-brand-border px-5 py-3 text-sm font-semibold text-brand-text transition-colors hover:bg-brand-surface/40"
              >
                Book a demo
              </Link>
            </div>
            <p className="mt-4 text-xs text-brand-muted">
              Free forever · Works with Gmail &amp; Outlook · 30-second install
            </p>
          </div>

          {/* Mockup */}
          <div className="rounded-2xl border border-brand-border/60 bg-brand-surface/40 p-4 shadow-2xl">
            <div className="rounded-xl bg-brand-bg/80 p-4">
              <div className="flex items-center gap-2 border-b border-brand-border/50 pb-3">
                <div className="h-2 w-2 rounded-full bg-red-400" />
                <div className="h-2 w-2 rounded-full bg-yellow-400" />
                <div className="h-2 w-2 rounded-full bg-green-400" />
                <span className="ml-2 font-mono text-[11px] text-brand-muted">
                  social-perks · popup
                </span>
              </div>
              <div className="mt-4 space-y-3">
                <div className="rounded-lg border border-brand-border/40 bg-brand-bg/60 p-3">
                  <div className="text-xs text-brand-muted">Customer</div>
                  <div className="mt-1 font-medium text-brand-text">
                    Sarah Mitchell
                  </div>
                  <div className="text-xs text-brand-dim">
                    sarah@example.com · 4 visits
                  </div>
                </div>
                <button
                  type="button"
                  className="w-full rounded-lg bg-brand-cyan px-4 py-3 text-sm font-semibold text-brand-bg"
                >
                  Send Google review request
                </button>
                <button
                  type="button"
                  className="w-full rounded-lg border border-brand-border/60 px-4 py-3 text-sm font-medium text-brand-text"
                >
                  Send with $5 perk reward
                </button>
                <div className="flex items-center justify-between text-xs text-brand-muted">
                  <span>Last sent · 2 days ago</span>
                  <span className="text-brand-green">3 reviews this week</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="mt-20">
          <h2 className="font-heading text-2xl italic text-brand-white sm:text-3xl">
            Built for the way you actually work
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-lg border border-brand-border/50 bg-brand-surface/30 p-6"
              >
                <h3 className="font-semibold text-brand-text">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-brand-dim">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Use cases */}
        <section className="mt-20">
          <h2 className="font-heading text-2xl italic text-brand-white sm:text-3xl">
            What you can do
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {USE_CASES.map((u) => (
              <div
                key={u.title}
                className="rounded-lg border border-brand-border/50 bg-brand-surface/30 p-6"
              >
                <h3 className="font-semibold text-brand-text">{u.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-brand-dim">
                  {u.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Privacy */}
        <section className="mt-20">
          <h2 className="font-heading text-2xl italic text-brand-white sm:text-3xl">
            Your inbox stays yours
          </h2>
          <div className="mt-6 rounded-lg border border-brand-border/50 bg-brand-surface/30 p-6">
            <ul className="space-y-3 text-sm leading-relaxed text-brand-dim">
              <li>
                <span className="font-semibold text-brand-text">
                  No background scanning.
                </span>{" "}
                We only read the thread you click on, and only when you press
                the Social Perks button.
              </li>
              <li>
                <span className="font-semibold text-brand-text">
                  No content storage.
                </span>{" "}
                Email bodies never leave your browser. We only store the
                customer&apos;s name and email after you confirm the action.
              </li>
              <li>
                <span className="font-semibold text-brand-text">
                  Encrypted transport.
                </span>{" "}
                All data flows over TLS 1.3 to Social Perks servers.
              </li>
              <li>
                <span className="font-semibold text-brand-text">
                  Revocable in one click.
                </span>{" "}
                Uninstall the extension anytime. Your account and customer data
                stay with you.
              </li>
            </ul>
            <p className="mt-4 text-xs text-brand-muted">
              See full details in our{" "}
              <Link
                href="/privacy"
                className="text-brand-cyan hover:underline"
              >
                privacy policy
              </Link>{" "}
              and{" "}
              <Link
                href="/security"
                className="text-brand-cyan hover:underline"
              >
                security overview
              </Link>
              .
            </p>
          </div>
        </section>

        {/* FAQ */}
        <section className="mt-20">
          <h2 className="font-heading text-2xl italic text-brand-white sm:text-3xl">
            Frequently asked
          </h2>
          <div className="mt-8 space-y-3">
            {FAQS.map((f) => (
              <details
                key={f.q}
                className="group rounded-lg border border-brand-border/50 bg-brand-surface/30 p-5"
              >
                <summary className="flex cursor-pointer items-center justify-between font-medium text-brand-text">
                  {f.q}
                  <span className="text-brand-muted transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-brand-dim">
                  {f.a}
                </p>
              </details>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="mt-20">
          <div className="rounded-2xl border border-brand-cyan/30 bg-gradient-to-br from-brand-cyan/10 to-brand-green/5 p-8 text-center sm:p-12">
            <h2 className="font-heading text-2xl italic text-brand-white sm:text-3xl">
              Ready to turn your inbox into a review machine?
            </h2>
            <p className="mt-3 text-brand-dim">
              Don&apos;t have an account? Start a free trial — no card required.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <a
                href={CHROME_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-brand-cyan px-5 py-3 text-sm font-semibold text-brand-bg transition-opacity hover:opacity-90"
              >
                Install free &rarr;
              </a>
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 rounded-lg border border-brand-border px-5 py-3 text-sm font-semibold text-brand-text transition-colors hover:bg-brand-surface/40"
              >
                Start free trial
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
