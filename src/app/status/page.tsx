import type { Metadata } from "next";
import { Nav } from "@/components/shared/nav";
import { Footer } from "@/components/shared/footer";

export const metadata: Metadata = {
  title: "Status — Social Perks",
  description: "Current platform status and recent incidents.",
  alternates: { canonical: "/status" },
};

// Placeholder static page until a proper incident timeline is wired
// to a real provider (Statuspage, Better Stack, in-house). The
// /api/v1/health/readiness endpoint already exposes machine-readable
// component status; this page is the human-facing wrapper.

export default function StatusPage() {
  return (
    <div className="min-h-screen bg-brand-bg">
      <Nav />
      <main id="main-content" className="mx-auto max-w-3xl px-4 pt-32 pb-20 sm:px-6 lg:px-8 sm:pt-40 sm:pb-28">
        <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.15em] text-brand-cyan">
          Status
        </p>
        <h1 className="font-heading text-4xl italic text-brand-white sm:text-5xl">
          All systems operational
        </h1>
        <p className="mt-4 text-base text-brand-dim sm:text-lg">
          We&apos;re early — this page will turn into a real incident timeline
          once we&apos;re processing customer money. Until then, we monitor
          internally and post updates here on any disruption.
        </p>

        <ul className="mt-12 space-y-3">
          <ServiceRow name="Public site" detail="Vercel · multi-region" status="ok" />
          <ServiceRow name="Dashboard" detail="Auth, campaign management" status="ok" />
          <ServiceRow name="Submission engine" detail="Proof intake + verification" status="ok" />
          <ServiceRow name="Stripe payments" detail="Subscription billing + Connect payouts" status="ok" />
          <ServiceRow name="Email delivery" detail="Resend transactional" status="ok" />
        </ul>

        <div className="mt-12 rounded-2xl border border-brand-border/40 bg-brand-surface/30 p-6 text-sm text-brand-dim">
          <p>
            Machine-readable status is at{" "}
            <code className="rounded bg-brand-bg px-2 py-1 text-brand-cyan">
              GET /api/v1/health
            </code>
            . Detailed readiness (admin-gated) at{" "}
            <code className="rounded bg-brand-bg px-2 py-1 text-brand-cyan">
              GET /api/v1/health/readiness
            </code>
            .
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function ServiceRow({ name, detail, status }: { name: string; detail: string; status: "ok" | "degraded" | "down" }) {
  const dotColor =
    status === "ok" ? "bg-brand-green" : status === "degraded" ? "bg-brand-amber" : "bg-brand-red";
  const label = status === "ok" ? "Operational" : status === "degraded" ? "Degraded" : "Outage";
  return (
    <li className="flex items-center justify-between gap-4 rounded-2xl border border-brand-border/40 bg-brand-surface/30 p-4 sm:p-5">
      <div className="min-w-0">
        <p className="font-semibold text-brand-white">{name}</p>
        <p className="text-xs text-brand-dim">{detail}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className={`h-2 w-2 rounded-full ${dotColor}`} aria-hidden="true" />
        <span className="text-xs text-brand-text">{label}</span>
      </div>
    </li>
  );
}
