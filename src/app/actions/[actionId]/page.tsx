/**
 * Single-action detail page — /actions/[actionId]
 *
 * One static page per marketing action (125 in total). Each is an SEO
 * surface with structured data so search engines and LLMs can answer
 * questions like "what's an Instagram story tag worth?" by citing this
 * page. The same data is also available via /api/v1/pricing for agents.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PLATFORMS } from "@/lib/platforms";
import type { Action, ActionType } from "@social-perks/shared/types";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "https://socialperks.io");

interface FlatAction extends Action {
  platformId: string;
  platformName: string;
  platformIcon: string;
  platformColor: string;
}

function getAllActions(): FlatAction[] {
  const out: FlatAction[] = [];
  for (const p of PLATFORMS) {
    for (const a of p.actions) {
      out.push({
        ...a,
        platformId: p.id,
        platformName: p.name,
        platformIcon: p.icon,
        platformColor: p.color,
      });
    }
  }
  return out;
}

function getAction(actionId: string): FlatAction | null {
  return getAllActions().find((a) => a.id === actionId) ?? null;
}

export const dynamic = "force-static";
export const dynamicParams = false;
export const revalidate = 86400;

export async function generateStaticParams() {
  return getAllActions().map((a) => ({ actionId: a.id }));
}

const TYPE_LABELS: Record<ActionType, string> = {
  content: "Content",
  review: "Review",
  engage: "Engagement",
  share: "Share",
  referral: "Referral",
};

const EFFORT_LABELS = [
  "trivial — under a minute",
  "low — a minute or two",
  "moderate — a few minutes",
  "meaningful — five to ten minutes",
  "significant — fifteen+ minutes",
  "high — half an hour or more",
];

function describe(a: FlatAction): string {
  const effortLabel = EFFORT_LABELS[Math.min(a.effort, 5)];
  const ftcNote = a.incentivizable
    ? ""
    : " Per platform terms (e.g. Google, Yelp, TripAdvisor), this action cannot be incentivized — businesses can only ask for organic submissions.";
  return `${a.platformName} ${a.label} is a ${TYPE_LABELS[a.type].toLowerCase()} action with effort level ${a.effort}/5 (${effortLabel}). The market-rate value is approximately $${a.value.toFixed(2)} per completion.${ftcNote}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ actionId: string }>;
}): Promise<Metadata> {
  const { actionId } = await params;
  const action = getAction(actionId);
  if (!action) return { title: "Action not found — Social Perks" };
  const title = `${action.platformName} ${action.label} — $${action.value.toFixed(2)} per completion | Social Perks`;
  const description = describe(action);
  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/actions/${actionId}` },
    openGraph: {
      title: `${action.platformName} ${action.label}`,
      description,
      url: `${SITE_URL}/actions/${actionId}`,
      type: "article",
    },
    twitter: { card: "summary", title, description },
  };
}

export default async function ActionDetail({
  params,
}: {
  params: Promise<{ actionId: string }>;
}) {
  const { actionId } = await params;
  const action = getAction(actionId);
  if (!action) notFound();

  const platform = PLATFORMS.find((p) => p.id === action.platformId)!;
  const peers = platform.actions.filter((p) => p.id !== action.id).slice(0, 6);

  // Schema.org Service markup. The action is a service the customer
  // performs in exchange for a perk; structured this way Google Rich
  // Results and AI assistants pick it up cleanly.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: `${action.platformName} ${action.label}`,
    description: describe(action),
    provider: {
      "@type": "Organization",
      name: "Social Perks",
      url: SITE_URL,
    },
    serviceType: TYPE_LABELS[action.type],
    offers: {
      "@type": "Offer",
      price: action.value.toFixed(2),
      priceCurrency: "USD",
      url: `${SITE_URL}/actions/${actionId}`,
      availability: action.incentivizable
        ? "https://schema.org/InStock"
        : "https://schema.org/LimitedAvailability",
    },
    areaServed: { "@type": "Country", name: "United States" },
  };

  const breadcrumbsLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Actions", item: `${SITE_URL}/actions` },
      { "@type": "ListItem", position: 2, name: platform.name, item: `${SITE_URL}/platforms/${platform.id}` },
      { "@type": "ListItem", position: 3, name: action.label, item: `${SITE_URL}/actions/${actionId}` },
    ],
  };

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbsLd) }}
      />

      <div className="mx-auto max-w-3xl px-6 py-16">
        <nav className="text-sm text-brand-text-dim mb-8">
          <Link href="/actions" className="hover:text-brand-cyan">Actions</Link>
          <span className="mx-2">/</span>
          <Link href={`/platforms/${platform.id}`} className="hover:text-brand-cyan">{platform.name}</Link>
          <span className="mx-2">/</span>
          <span className="text-brand-text">{action.label}</span>
        </nav>

        <header className="mb-10">
          <div className="flex items-baseline gap-3 mb-3">
            <span className="text-4xl">{platform.icon}</span>
            <span className="text-sm text-brand-text-dim font-mono">
              {action.id}
            </span>
          </div>
          <h1 className="font-serif text-5xl italic text-brand-white mb-4">
            {action.platformName} {action.label}
          </h1>
          <p className="text-lg text-brand-text-dim leading-relaxed">
            {describe(action)}
          </p>
        </header>

        {/* Stats */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
          <Stat label="Market value" value={`$${action.value.toFixed(2)}`} />
          <Stat label="Effort" value={`${action.effort}/5`} />
          <Stat label="Type" value={TYPE_LABELS[action.type]} />
          <Stat
            label="Can incentivize?"
            value={action.incentivizable ? "Yes" : "No"}
          />
        </section>

        {/* Programmatic access */}
        <section className="rounded-xl border border-brand-cyan/20 bg-brand-cyan/5 p-5 mb-10">
          <p className="text-sm font-medium text-brand-white mb-3">
            Programmatic access
          </p>
          <div className="space-y-2 font-mono text-xs">
            <p className="text-brand-text-dim">REST:</p>
            <code className="block px-3 py-2 bg-black/40 rounded border border-brand-border break-all">
              GET /api/v1/pricing?actionId={action.id}
            </code>
            <p className="text-brand-text-dim mt-3">SDK:</p>
            <code className="block px-3 py-2 bg-black/40 rounded border border-brand-border break-all">
              {`sp.pricing.estimate({ actionId: "${action.id}" })`}
            </code>
            <p className="text-brand-text-dim mt-3">MCP:</p>
            <code className="block px-3 py-2 bg-black/40 rounded border border-brand-border break-all">
              {`tool: getPricing, args: { actionId: "${action.id}" }`}
            </code>
          </div>
        </section>

        {/* FTC compliance note */}
        {!action.incentivizable && (
          <section className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5 mb-10">
            <p className="text-sm font-medium text-amber-200 mb-2">
              FTC + platform terms note
            </p>
            <p className="text-sm text-amber-200/80">
              Review platforms (Google, Yelp, TripAdvisor) prohibit
              incentivized reviews. Social Perks routes this action
              through the &quot;ask for organic feedback&quot; pathway —
              you can request a {action.label.toLowerCase()} but cannot
              tie a perk to whether one was left.
            </p>
          </section>
        )}

        {/* Use this action */}
        <section className="text-center mb-10">
          <Link
            href={`/dashboard?intent=campaign&actionId=${action.id}`}
            className="inline-block px-6 py-3 bg-brand-cyan text-brand-bg font-medium rounded-lg hover:bg-brand-cyan/90"
          >
            Launch a campaign with this action
          </Link>
        </section>

        {/* Related actions on same platform */}
        {peers.length > 0 && (
          <section>
            <h2 className="font-serif italic text-xl text-brand-white mb-4">
              Other {platform.name} actions
            </h2>
            <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {peers.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/actions/${p.id}`}
                    className="block rounded-lg border border-brand-border bg-brand-card p-3 hover:border-brand-cyan/40"
                  >
                    <p className="text-sm text-brand-white">{p.label}</p>
                    <p className="text-xs text-brand-text-dim mt-0.5">
                      ${p.value.toFixed(2)} · effort {p.effort}/5
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-brand-border bg-brand-card p-4">
      <p className="text-xs text-brand-text-dim mb-1">{label}</p>
      <p className="font-mono text-brand-white">{value}</p>
    </div>
  );
}
