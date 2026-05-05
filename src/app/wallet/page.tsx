/**
 * /wallet — Customer-facing perk wallet
 *
 * Shows the perks a customer has earned across every participating shop.
 * Customer is identified by:
 *   1. ?customer=cust_abc123 query param (deep-link from email/SMS), OR
 *   2. sp_customer_id httpOnly cookie set when claiming a perk on /c/[campaignId]
 *
 * Server component — reads from the perk-wallet engine directly.
 */

import { cookies } from "next/headers";
import Link from "next/link";
import type { Metadata } from "next";
import { listPerksForCustomer, type CustomerPerkView } from "@/lib/perk-wallet";

export const metadata: Metadata = {
  title: "Your perks · Social Perks",
  description: "All the perks you've earned for posting about your favorite local shops.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/wallet" },
};

interface WalletPageProps {
  searchParams: Promise<{ customer?: string }>;
}

function formatPerk(p: CustomerPerkView): string {
  if (p.type === "pct") return `${p.value}% off`;
  return `$${p.value.toFixed(2)} off`;
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function statusLabel(status: CustomerPerkView["status"]): { text: string; tone: string } {
  switch (status) {
    case "available":
      return { text: "Ready to redeem", tone: "bg-brand-cyan/10 text-brand-cyan border-brand-cyan/30" };
    case "redeemed":
      return { text: "Redeemed", tone: "bg-brand-green/10 text-brand-green border-brand-green/30" };
    case "expired":
      return { text: "Expired", tone: "bg-brand-muted/10 text-brand-muted border-brand-border" };
    default:
      return { text: "Pending", tone: "bg-brand-amber/10 text-brand-amber border-brand-amber/30" };
  }
}

export default async function WalletPage({ searchParams }: WalletPageProps) {
  const sp = await searchParams;
  const cookieStore = await cookies();
  const customerId = sp.customer ?? cookieStore.get("sp_customer_id")?.value ?? "";

  const perks = customerId ? listPerksForCustomer(customerId) : [];

  // Anonymized handle: show the suffix of the customerId so the user
  // can confirm "yep, that's me" without exposing PII.
  const handle = customerId
    ? `customer · ${customerId.slice(-6)}`
    : "guest";

  return (
    <main className="min-h-screen bg-brand-bg text-brand-text">
      {/* Header */}
      <header className="border-b border-brand-border">
        <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
          <Link
            href="/"
            className="text-xs text-brand-dim hover:text-brand-text transition-colors"
          >
            &larr; Social Perks
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-3xl px-4 pt-12 pb-8 sm:px-6">
        <p className="text-xs font-mono uppercase tracking-widest text-brand-cyan mb-3">
          {handle}
        </p>
        <h1 className="font-heading text-4xl italic text-brand-white sm:text-5xl">
          Your perks
        </h1>
        <p className="mt-3 max-w-xl text-sm text-brand-dim sm:text-base">
          Everything you&apos;ve earned for posting about your favorite local shops.
          Show this screen at the counter to redeem.
        </p>
      </section>

      {/* Perks list */}
      <section className="mx-auto max-w-3xl px-4 pb-12 sm:px-6">
        {perks.length === 0 ? (
          <div className="rounded-2xl border border-brand-cyan/30 bg-brand-cyan/5 p-8 text-center">
            <div className="text-3xl mb-3" aria-hidden="true">🎁</div>
            <h2 className="font-heading text-xl italic text-brand-white">
              No perks yet
            </h2>
            <p className="mt-2 text-sm text-brand-dim">
              Scan a QR at any participating shop to earn one.
            </p>
            <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-lg bg-brand-cyan px-5 py-2.5 text-sm font-semibold text-brand-bg transition-colors hover:bg-brand-cyan/90"
              >
                How it works
              </Link>
              <Link
                href="/b/marias-coffee"
                className="inline-flex items-center justify-center rounded-lg border border-brand-border px-5 py-2.5 text-sm text-brand-text transition-colors hover:border-brand-cyan hover:text-brand-cyan"
              >
                See an example shop
              </Link>
            </div>
          </div>
        ) : (
          <ul className="space-y-3" role="list">
            {perks.map((perk) => {
              const status = statusLabel(perk.status);
              return (
                <li
                  key={perk.id}
                  className="rounded-xl border border-brand-border bg-brand-surface/50 p-5 transition-colors hover:border-brand-cyan/40"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-mono uppercase tracking-wider text-brand-muted">
                        {perk.businessId}
                      </p>
                      <p className="mt-1 font-heading text-2xl italic text-brand-white">
                        {formatPerk(perk)}
                      </p>
                      <p className="mt-2 text-xs text-brand-dim">
                        {perk.status === "redeemed" && perk.redeemedAt
                          ? `Redeemed ${formatDate(perk.redeemedAt)}`
                          : perk.status === "expired"
                            ? `Expired ${formatDate(perk.expiresAt)}`
                            : `Expires ${formatDate(perk.expiresAt)}`}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-wider ${status.tone}`}
                    >
                      {status.text}
                    </span>
                  </div>
                  {perk.status === "available" && (
                    <div className="mt-4 rounded-lg border border-dashed border-brand-cyan/40 bg-brand-cyan/5 px-4 py-3">
                      <p className="text-[10px] font-mono uppercase tracking-wider text-brand-dim">
                        Redemption code
                      </p>
                      <p className="mt-1 font-mono text-2xl font-bold tracking-widest text-brand-cyan">
                        {perk.redemptionCode}
                      </p>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* How redemption works */}
      <section className="border-t border-brand-border bg-brand-surface/30">
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
          <h2 className="font-mono text-xs uppercase tracking-widest text-brand-dim">
            How redemption works
          </h2>
          <ol className="mt-6 grid gap-6 sm:grid-cols-3" role="list">
            <li>
              <div className="font-heading text-3xl italic text-brand-cyan">1</div>
              <p className="mt-2 text-sm text-brand-text">
                Show this screen at the counter.
              </p>
            </li>
            <li>
              <div className="font-heading text-3xl italic text-brand-cyan">2</div>
              <p className="mt-2 text-sm text-brand-text">
                Staff taps <span className="font-semibold">Mark redeemed</span>.
              </p>
            </li>
            <li>
              <div className="font-heading text-3xl italic text-brand-cyan">3</div>
              <p className="mt-2 text-sm text-brand-text">
                Done — perk applied to your purchase.
              </p>
            </li>
          </ol>
        </div>
      </section>
    </main>
  );
}
