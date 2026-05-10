import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/shared/nav";
import { Footer } from "@/components/shared/footer";

export const metadata: Metadata = {
  title: "Affiliate Program · Earn 30% Recurring · Social Perks",
  description:
    "Earn 30% recurring commission for every customer you refer to Social Perks. No caps. Paid for as long as they stay subscribed.",
  openGraph: {
    title: "Earn 30% recurring commission with Social Perks",
    description:
      "Refer small businesses to Social Perks and earn 30% of their subscription — every month, for as long as they stay.",
    url: "https://socialperks.onrender.com/affiliate",
    siteName: "Social Perks",
    type: "website",
  },
};

const STEPS = [
  {
    n: "01",
    title: "Get your link",
    body: "Sign up free in 30 seconds. We hand you a personal tracking link the moment your account exists.",
  },
  {
    n: "02",
    title: "Share it anywhere",
    body: "Drop it in a tweet, a YouTube description, your newsletter, your Discord — wherever your audience already is.",
  },
  {
    n: "03",
    title: "Earn forever",
    body: "30% of every payment, every month, for as long as the customer stays. Paid out monthly via Stripe.",
  },
];

const FAQ = [
  {
    q: "Is the 30% really recurring?",
    a: "Yes. As long as the customer you referred keeps paying, you keep earning. There's no cap and no expiration window.",
  },
  {
    q: "When do I get paid?",
    a: "Payouts run on the 15th of each month for the prior month's earnings, via Stripe Connect. Minimum payout is $25 — anything below rolls over.",
  },
  {
    q: "Who's a good fit?",
    a: "Anyone whose audience overlaps with small business owners — local-business YouTubers, restaurant Instagram accounts, marketing newsletters, agency owners, accountants, lawyers, PR consultants, and service-business communities.",
  },
  {
    q: "What can't I do?",
    a: "No paid-search bidding on the Social Perks brand, no spammy unsolicited DMs, no incentivizing fake signups. We ban for that. Everything else is fair game.",
  },
];

export default function AffiliatePage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-brand-bg">
      <Nav />

      <main id="main-content">
        {/* ─── Hero ─────────────────────────────────────────────────────── */}
        <section className="relative pt-32 pb-20 sm:pt-40 sm:pb-24">
          <div
            className="pointer-events-none absolute inset-0 animate-gradient bg-[length:300%_300%] bg-[linear-gradient(135deg,rgba(34,211,238,0.08),rgba(167,139,250,0.05),rgba(34,211,238,0.03))]"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute left-1/3 top-1/4 h-96 w-96 rounded-full bg-brand-cyan/5 blur-3xl"
            aria-hidden="true"
          />

          <div className="relative z-10 mx-auto max-w-4xl px-4 text-center sm:px-6">
            <div className="inline-flex animate-fade-up items-center gap-2 rounded-full border border-brand-cyan/30 bg-brand-cyan/10 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.15em] text-brand-cyan">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-cyan opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-cyan" />
              </span>
              Affiliate Program · Open
            </div>

            <h1 className="mt-6 animate-fade-up animate-delay-100 font-heading text-[clamp(2.25rem,5vw,4.25rem)] italic leading-[1.05] tracking-tight text-brand-white">
              Earn{" "}
              <span className="bg-gradient-to-r from-brand-cyan via-brand-green to-brand-cyan bg-clip-text text-transparent">
                30% recurring
              </span>{" "}
              for every customer you send.
            </h1>

            <p className="mx-auto mt-6 max-w-2xl animate-fade-up animate-delay-200 text-base leading-relaxed text-brand-dim sm:text-lg">
              No caps, no expiration. Refer a coffee shop today, earn 30% of
              their subscription every month for the next ten years if they
              stick around. We don&apos;t mess with affiliates.
            </p>

            <div className="mt-10 flex animate-fade-up animate-delay-300 flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/dashboard#signup"
                className="w-full sm:w-auto rounded-xl bg-brand-cyan px-8 py-3.5 font-body text-base font-semibold text-brand-bg transition-all hover:-translate-y-0.5 hover:bg-brand-cyan/90 hover:shadow-lg hover:shadow-brand-cyan/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/50 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-bg active:translate-y-0"
              >
                Sign up free to get your link →
              </Link>
              <a
                href="#how"
                className="w-full sm:w-auto rounded-xl border border-brand-border bg-brand-surface/50 px-8 py-3.5 font-body text-base font-medium text-brand-text transition-all hover:-translate-y-0.5 hover:border-brand-subtle hover:bg-brand-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/30 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-bg active:translate-y-0"
              >
                How it works
              </a>
            </div>

            <p className="mt-6 animate-fade-up animate-delay-400 text-sm text-brand-muted">
              Free to join. Paid monthly via Stripe. Cookie window: 30 days.
            </p>
          </div>
        </section>

        {/* ─── Quick math ─────────────────────────────────────────────── */}
        <section className="relative py-16 sm:py-20">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <div className="rounded-2xl border border-brand-border bg-brand-surface/50 p-8 sm:p-12">
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-brand-cyan">
                The math
              </p>
              <h2 className="mt-3 font-heading text-2xl italic text-brand-white sm:text-4xl">
                Refer 50 small businesses on the $79/mo plan.
              </h2>
              <div className="mt-6 grid gap-6 sm:grid-cols-3">
                <div>
                  <p className="font-mono text-xs uppercase tracking-wider text-brand-muted">
                    Per customer / month
                  </p>
                  <p className="mt-2 font-heading text-3xl text-brand-white">
                    $23.70
                  </p>
                </div>
                <div>
                  <p className="font-mono text-xs uppercase tracking-wider text-brand-muted">
                    50 customers / month
                  </p>
                  <p className="mt-2 font-heading text-3xl text-brand-cyan">
                    $1,185
                  </p>
                </div>
                <div>
                  <p className="font-mono text-xs uppercase tracking-wider text-brand-muted">
                    50 customers / year
                  </p>
                  <p className="mt-2 font-heading text-3xl text-brand-green">
                    $14,220
                  </p>
                </div>
              </div>
              <p className="mt-6 text-sm text-brand-dim">
                And it compounds. The 50 you refer this month still pay you
                next month, when you refer another 50 on top.
              </p>
            </div>
          </div>
        </section>

        {/* ─── How it works ────────────────────────────────────────────── */}
        <section id="how" className="relative py-20 sm:py-28">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="text-center">
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-brand-cyan">
                How it works
              </p>
              <h2 className="mt-3 font-heading text-3xl italic text-brand-white sm:text-5xl">
                Three steps. No paperwork.
              </h2>
            </div>

            <div className="mt-14 grid gap-6 md:grid-cols-3">
              {STEPS.map((s) => (
                <div
                  key={s.n}
                  className="rounded-2xl border border-brand-border bg-brand-surface/40 p-7 transition-all hover:border-brand-cyan/40 hover:bg-brand-surface"
                >
                  <p className="font-mono text-xs uppercase tracking-[0.18em] text-brand-cyan">
                    {s.n}
                  </p>
                  <h3 className="mt-3 font-heading text-xl italic text-brand-white">
                    {s.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-brand-dim">
                    {s.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Terms grid ──────────────────────────────────────────────── */}
        <section className="relative py-16 sm:py-20">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: "Commission", value: "30%" },
                { label: "Recurring", value: "Forever" },
                { label: "Cookie window", value: "30 days" },
                { label: "Min. payout", value: "$25" },
              ].map((t) => (
                <div
                  key={t.label}
                  className="rounded-xl border border-brand-border bg-brand-surface/50 p-5 text-center"
                >
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-brand-muted">
                    {t.label}
                  </p>
                  <p className="mt-2 font-heading text-2xl italic text-brand-white">
                    {t.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── FAQ ─────────────────────────────────────────────────────── */}
        <section className="relative py-20 sm:py-24">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <h2 className="text-center font-heading text-3xl italic text-brand-white sm:text-4xl">
              Questions
            </h2>
            <div className="mt-10 space-y-4">
              {FAQ.map((item) => (
                <details
                  key={item.q}
                  className="group rounded-xl border border-brand-border bg-brand-surface/40 px-5 py-4 transition-colors open:border-brand-cyan/30 open:bg-brand-surface"
                >
                  <summary className="cursor-pointer list-none font-body text-base font-medium text-brand-white">
                    <span className="flex items-center justify-between gap-4">
                      {item.q}
                      <span className="text-brand-cyan transition-transform group-open:rotate-45">
                        +
                      </span>
                    </span>
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-brand-dim">
                    {item.a}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Final CTA ──────────────────────────────────────────────── */}
        <section className="relative py-20 sm:py-28">
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
            <h2 className="font-heading text-3xl italic text-brand-white sm:text-5xl">
              Get your link in 30 seconds.
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-base text-brand-dim sm:text-lg">
              Sign up free, paste your link wherever, and watch the dashboard.
            </p>
            <div className="mt-10">
              <Link
                href="/dashboard#signup"
                className="inline-flex rounded-xl bg-brand-cyan px-8 py-3.5 font-body text-base font-semibold text-brand-bg transition-all hover:-translate-y-0.5 hover:bg-brand-cyan/90 hover:shadow-lg hover:shadow-brand-cyan/25"
              >
                Sign up free to get your link →
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
