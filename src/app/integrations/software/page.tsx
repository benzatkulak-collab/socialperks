"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

interface SoftwareIntegration {
  name: string;
  category:
    | "E-commerce"
    | "CRM"
    | "Email"
    | "Productivity"
    | "Accounting"
    | "Automation"
    | "Communication";
  icon: string;
  description: string;
  status: "Available" | "Coming soon";
}

const SOFTWARE: SoftwareIntegration[] = [
  // E-commerce
  {
    name: "Square",
    category: "E-commerce",
    icon: "Sq",
    description: "Sync POS sales and trigger review requests automatically.",
    status: "Available",
  },
  {
    name: "Stripe",
    category: "E-commerce",
    icon: "St",
    description: "Reward customers post-payment with perk-linked emails.",
    status: "Available",
  },
  {
    name: "Shopify",
    category: "E-commerce",
    icon: "Sh",
    description: "Auto-enroll buyers in perk programs after order fulfillment.",
    status: "Available",
  },
  {
    name: "WooCommerce",
    category: "E-commerce",
    icon: "Wc",
    description: "Connect your WordPress store to perk campaigns in 30s.",
    status: "Available",
  },
  {
    name: "BigCommerce",
    category: "E-commerce",
    icon: "Bc",
    description: "Native integration for the BigCommerce app store.",
    status: "Coming soon",
  },
  {
    name: "Wix",
    category: "E-commerce",
    icon: "Wx",
    description: "Embed perk widgets directly on Wix-built storefronts.",
    status: "Available",
  },
  {
    name: "Squarespace",
    category: "E-commerce",
    icon: "Sq",
    description: "One-click install for Squarespace Commerce sites.",
    status: "Coming soon",
  },
  {
    name: "Webflow",
    category: "E-commerce",
    icon: "Wf",
    description: "Drop-in script tag for Webflow sites with full theming.",
    status: "Available",
  },

  // CRM
  {
    name: "HubSpot",
    category: "CRM",
    icon: "Hs",
    description: "Sync contacts, deals, and engagement scores both ways.",
    status: "Available",
  },
  {
    name: "Salesforce",
    category: "CRM",
    icon: "Sf",
    description: "Push perk activity into Salesforce as custom objects.",
    status: "Available",
  },
  {
    name: "Pipedrive",
    category: "CRM",
    icon: "Pd",
    description: "Trigger perks on deal stage changes and won opportunities.",
    status: "Available",
  },
  {
    name: "Zoho CRM",
    category: "CRM",
    icon: "Zo",
    description: "Bidirectional contact and activity sync.",
    status: "Coming soon",
  },
  {
    name: "Close",
    category: "CRM",
    icon: "Cl",
    description: "Inbound sales CRM integration for high-velocity teams.",
    status: "Coming soon",
  },

  // Email
  {
    name: "Mailchimp",
    category: "Email",
    icon: "Mc",
    description: "Add perk recipients to audiences and trigger campaigns.",
    status: "Available",
  },
  {
    name: "Klaviyo",
    category: "Email",
    icon: "Kl",
    description: "Sync perk events into Klaviyo flows and segments.",
    status: "Available",
  },
  {
    name: "Constant Contact",
    category: "Email",
    icon: "Cc",
    description: "Push contacts and perk events to your lists.",
    status: "Coming soon",
  },
  {
    name: "ActiveCampaign",
    category: "Email",
    icon: "Ac",
    description: "Trigger automations from Social Perks events.",
    status: "Available",
  },
  {
    name: "ConvertKit",
    category: "Email",
    icon: "Ck",
    description: "Tag subscribers automatically when they earn or redeem.",
    status: "Coming soon",
  },

  // Communication
  {
    name: "Slack",
    category: "Communication",
    icon: "Sl",
    description: "Get real-time alerts on submissions, fraud flags, and more.",
    status: "Available",
  },
  {
    name: "Discord",
    category: "Communication",
    icon: "Ds",
    description: "Pipe events into community channels with rich embeds.",
    status: "Available",
  },
  {
    name: "Microsoft Teams",
    category: "Communication",
    icon: "MT",
    description: "Channel notifications and approval workflows.",
    status: "Coming soon",
  },

  // Automation
  {
    name: "Zapier",
    category: "Automation",
    icon: "Zp",
    description: "Connect to 6,000+ apps without writing code.",
    status: "Available",
  },
  {
    name: "Make",
    category: "Automation",
    icon: "Mk",
    description: "Visual workflow automation (formerly Integromat).",
    status: "Available",
  },
  {
    name: "n8n",
    category: "Automation",
    icon: "n8",
    description: "Self-hosted, open-source automation platform.",
    status: "Available",
  },
  {
    name: "Pipedream",
    category: "Automation",
    icon: "Pm",
    description: "Event-driven workflows with full code steps.",
    status: "Available",
  },

  // Productivity
  {
    name: "Google Sheets",
    category: "Productivity",
    icon: "GS",
    description: "Append rows on every perk event for live dashboards.",
    status: "Available",
  },
  {
    name: "Airtable",
    category: "Productivity",
    icon: "At",
    description: "Sync campaigns, submissions, and influencer data.",
    status: "Available",
  },
  {
    name: "Notion",
    category: "Productivity",
    icon: "Nt",
    description: "Create pages from perk events and update databases.",
    status: "Available",
  },
  {
    name: "ClickUp",
    category: "Productivity",
    icon: "Cu",
    description: "Auto-create tasks for submission reviews.",
    status: "Coming soon",
  },
  {
    name: "Asana",
    category: "Productivity",
    icon: "As",
    description: "Tasks for content moderation and approvals.",
    status: "Coming soon",
  },
  {
    name: "Trello",
    category: "Productivity",
    icon: "Tr",
    description: "Cards for each pending submission and influencer outreach.",
    status: "Coming soon",
  },

  // Accounting
  {
    name: "QuickBooks",
    category: "Accounting",
    icon: "Qb",
    description: "Sync perk payouts and influencer expenses.",
    status: "Available",
  },
  {
    name: "Xero",
    category: "Accounting",
    icon: "Xr",
    description: "Push perk-related invoices and bills.",
    status: "Coming soon",
  },
  {
    name: "FreshBooks",
    category: "Accounting",
    icon: "Fb",
    description: "Automate invoicing for influencer payouts.",
    status: "Coming soon",
  },
];

const FILTERS = [
  "All",
  "E-commerce",
  "CRM",
  "Email",
  "Productivity",
  "Accounting",
  "Automation",
  "Communication",
] as const;

type Filter = (typeof FILTERS)[number];

export default function SoftwareIntegrationsPage() {
  const [filter, setFilter] = useState<Filter>("All");

  const filtered = useMemo(() => {
    if (filter === "All") return SOFTWARE;
    return SOFTWARE.filter((s) => s.category === filter);
  }, [filter]);

  return (
    <div className="min-h-screen bg-brand-bg">
      <header className="border-b border-brand-border/50">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
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
            href="/integrations"
            className="text-sm text-brand-muted transition-colors hover:text-brand-text"
          >
            &larr; Back to Integrations
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8 sm:py-16">
        <section>
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-cyan/30 bg-brand-cyan/10 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.15em] text-brand-cyan">
            Software integrations
          </div>
          <h1 className="mt-4 font-heading text-3xl italic leading-tight text-brand-white sm:text-5xl">
            Connect Social Perks to your stack.
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-brand-dim">
            30+ direct integrations with the tools you already use. Plus
            anything else via Zapier, Make, or our API.
          </p>
        </section>

        {/* Filters */}
        <section className="mt-10">
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((f) => {
              const active = filter === f;
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                    active
                      ? "border-brand-cyan bg-brand-cyan/10 text-brand-cyan"
                      : "border-brand-border/60 text-brand-dim hover:text-brand-text"
                  }`}
                >
                  {f}
                </button>
              );
            })}
          </div>
        </section>

        {/* Grid */}
        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((s) => (
            <div
              key={s.name}
              className="flex flex-col rounded-lg border border-brand-border/50 bg-brand-surface/30 p-5 transition-colors hover:border-brand-cyan/40"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-cyan/10 font-heading text-sm font-semibold text-brand-cyan">
                    {s.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-brand-text">{s.name}</h3>
                    <div className="text-[11px] uppercase tracking-wider text-brand-muted">
                      {s.category}
                    </div>
                  </div>
                </div>
                <span
                  className={`rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${
                    s.status === "Available"
                      ? "border-brand-green/30 bg-brand-green/10 text-brand-green"
                      : "border-brand-border/60 bg-brand-surface/50 text-brand-muted"
                  }`}
                >
                  {s.status}
                </span>
              </div>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-brand-dim">
                {s.description}
              </p>
            </div>
          ))}
        </section>

        {/* CTA */}
        <section className="mt-20">
          <div className="rounded-2xl border border-brand-cyan/30 bg-gradient-to-br from-brand-cyan/10 to-brand-green/5 p-8 text-center sm:p-12">
            <h2 className="font-heading text-2xl italic text-brand-white sm:text-3xl">
              Don&apos;t see your tool?
            </h2>
            <p className="mt-3 text-brand-dim">
              Connect anything via Zapier, our REST API, or webhooks.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                href="/marketplace"
                className="inline-flex items-center gap-2 rounded-lg bg-brand-cyan px-5 py-3 text-sm font-semibold text-brand-bg transition-opacity hover:opacity-90"
              >
                Open the API marketplace &rarr;
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 rounded-lg border border-brand-border px-5 py-3 text-sm font-semibold text-brand-text transition-colors hover:bg-brand-surface/40"
              >
                Request an integration
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
