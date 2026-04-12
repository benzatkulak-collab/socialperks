/**
 * Public Campaign Page — shareable URL for a campaign
 *
 * Server component that renders campaign details so businesses can share
 * links on social media.  Includes OpenGraph metadata for rich previews.
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { campaignManager } from "@/lib/campaign-state-machine";
import { findAction, findPlatform } from "@/lib/platforms";
import { eventStore } from "@/lib/events";
import { CampaignPageClient } from "./client";

// ─── Types ───────────────────────────────────────────────────────────────────

interface CampaignPageProps {
  params: Promise<{ campaignId: string }>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function resolveCampaignName(campaignId: string): string | null {
  const events = eventStore.query({
    type: "campaign.created",
    entityId: campaignId,
  });
  if (events.length > 0) {
    const name = events[0].data?.name;
    if (typeof name === "string") return name;
  }
  return null;
}

function resolveCampaignDetails(campaignId: string): {
  name: string;
  actions: string[];
  discountValue: number;
  discountType: string;
  description: string;
} | null {
  const events = eventStore.query({
    type: "campaign.created",
    entityId: campaignId,
  });
  if (events.length > 0) {
    const d = events[0].data ?? {};
    return {
      name: typeof d.name === "string" ? d.name : campaignId,
      actions: Array.isArray(d.actions) ? (d.actions as string[]) : [],
      discountValue: typeof d.discountValue === "number" ? d.discountValue : 0,
      discountType: typeof d.discountType === "string" ? d.discountType : "dol",
      description:
        typeof d.description === "string" ? d.description : "",
    };
  }
  return null;
}

// ─── Metadata ────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: CampaignPageProps): Promise<Metadata> {
  const { campaignId } = await params;
  const lifecycle = campaignManager.getState(campaignId);
  if (!lifecycle) {
    return { title: "Campaign Not Found | Social Perks" };
  }

  const details = resolveCampaignDetails(campaignId);
  const campaignName = details?.name ?? campaignId;
  const perkDisplay =
    details?.discountType === "pct"
      ? `${details.discountValue}% off`
      : `$${details?.discountValue?.toFixed(2) ?? "0.00"}`;

  const title = `${campaignName} | Social Perks`;
  const description = `Earn ${perkDisplay} by completing a simple marketing action. ${details?.description || "Join now and claim your perk!"}`;

  return {
    title,
    description,
    openGraph: {
      title: campaignName,
      description,
      type: "website",
      siteName: "Social Perks",
      url: `https://socialperks.io/campaign/${campaignId}`,
    },
    twitter: {
      card: "summary_large_image",
      title: campaignName,
      description,
    },
  };
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function CampaignPage({ params }: CampaignPageProps) {
  const { campaignId } = await params;
  const lifecycle = campaignManager.getState(campaignId);

  if (!lifecycle) {
    notFound();
  }

  const details = resolveCampaignDetails(campaignId);
  const campaignName = details?.name ?? resolveCampaignName(campaignId) ?? campaignId;

  // Resolve action details
  const actionIds = details?.actions ?? [];
  const resolvedActions: Array<{
    id: string;
    label: string;
    type: string;
    effort: number;
    value: number;
    platformName: string;
    platformIcon: string;
    platformColor: string;
  }> = [];

  for (const id of actionIds) {
    const action = findAction(id);
    if (!action) continue;
    const platform = findPlatform(action.platformId);
    resolvedActions.push({
      id: action.id,
      label: action.label,
      type: action.type,
      effort: action.effort,
      value: action.value,
      platformName: platform?.name ?? action.platformId,
      platformIcon: platform?.icon ?? "",
      platformColor: platform?.color ?? "#22D3EE",
    });
  }

  // Perk display
  const discountValue = details?.discountValue ?? lifecycle.budget.allocated;
  const discountType = details?.discountType ?? lifecycle.budget.type;
  const perkDisplay =
    discountType === "pct"
      ? `${discountValue}% off`
      : `$${discountValue.toFixed(2)}`;

  // Campaign state
  const isActive = lifecycle.state === "active";
  const expiresAt = lifecycle.expiry?.expiresAt ?? null;

  // Resolve business name from events
  let businessName = lifecycle.businessId;
  const createdEvents = eventStore.query({
    type: "campaign.created",
    entityId: campaignId,
  });
  if (createdEvents.length > 0 && typeof createdEvents[0].data?.businessName === "string") {
    businessName = createdEvents[0].data.businessName as string;
  }

  return (
    <div className="min-h-screen bg-[#0C0F1A]">
      {/* Header */}
      <header className="border-b border-[#2A2F45]">
        <div className="mx-auto max-w-4xl px-4 py-4 sm:px-6">
          <Link
            href="/"
            className="font-serif text-xl italic text-[#22D3EE] transition-colors hover:text-[#67E8F9]"
          >
            Social Perks
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
        {/* Status Banner */}
        {!isActive && (
          <div className="mb-6 rounded-xl border border-[#FBBF24]/20 bg-[#FBBF24]/5 px-4 py-3 text-center">
            <p className="text-sm font-medium text-[#FBBF24]">
              {lifecycle.state === "ended"
                ? "This campaign has ended."
                : lifecycle.state === "paused"
                  ? "This campaign is currently paused."
                  : "This campaign is no longer active."}
            </p>
          </div>
        )}

        {/* Campaign Card */}
        <div className="animate-fade-up rounded-2xl border border-[#2A2F45] bg-[#141825] p-6 sm:p-10">
          {/* Business & Campaign Name */}
          <div className="mb-8">
            <p className="mb-2 text-sm font-medium uppercase tracking-wider text-[#636B8A]">
              {businessName}
            </p>
            <h1 className="font-serif text-3xl italic text-[#FAFBFD] sm:text-4xl lg:text-5xl">
              {campaignName}
            </h1>
            {details?.description && (
              <p className="mt-3 text-base leading-relaxed text-[#8E95B4] sm:text-lg">
                {details.description}
              </p>
            )}
          </div>

          {/* Perk Value Highlight */}
          <div className="mb-8 rounded-xl border border-[#22D3EE]/20 bg-[#22D3EE]/5 p-6 text-center">
            <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-[#636B8A]">
              Earn up to
            </p>
            <p className="font-mono text-4xl font-bold text-[#22D3EE] sm:text-5xl">
              {perkDisplay}
            </p>
            {expiresAt && (
              <p className="mt-2 text-xs text-[#636B8A]">
                Offer expires{" "}
                {new Date(expiresAt).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            )}
          </div>

          {/* Required Actions */}
          {resolvedActions.length > 0 && (
            <div className="mb-8">
              <h2 className="mb-4 font-serif text-xl italic text-[#FAFBFD]">
                What to do
              </h2>
              <div className="space-y-3">
                {resolvedActions.map((action) => (
                  <div
                    key={action.id}
                    className="flex items-center gap-3 rounded-lg border border-[#2A2F45] bg-[#0C0F1A] p-4"
                  >
                    <span className="text-xl">{action.platformIcon}</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-[#E8EAF0]">
                        {action.label}
                      </p>
                      <p className="text-xs text-[#636B8A]">
                        {action.platformName} &middot;{" "}
                        {action.type.charAt(0).toUpperCase() +
                          action.type.slice(1)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div
                          key={i}
                          className={`h-1.5 w-1.5 rounded-full ${
                            i < action.effort
                              ? "bg-[#22D3EE]"
                              : "bg-[#2A2F45]"
                          }`}
                        />
                      ))}
                      <span className="ml-2 text-xs text-[#636B8A]">
                        effort
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* How It Works */}
          <div className="mb-8">
            <h2 className="mb-4 font-serif text-xl italic text-[#FAFBFD]">
              How it works
            </h2>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                {
                  step: "1",
                  title: "Complete the action",
                  desc: "Follow the campaign requirements above on the specified platform.",
                  color: "#22D3EE",
                },
                {
                  step: "2",
                  title: "Submit your proof",
                  desc: "Take a screenshot or share the link to your post as proof.",
                  color: "#A78BFA",
                },
                {
                  step: "3",
                  title: "Earn your perk",
                  desc: "Once verified, the perk is added to your wallet instantly.",
                  color: "#34D399",
                },
              ].map((item) => (
                <div
                  key={item.step}
                  className="rounded-xl border border-[#2A2F45] bg-[#0C0F1A] p-5"
                >
                  <div
                    className="mb-3 flex h-8 w-8 items-center justify-center rounded-full font-mono text-sm font-bold"
                    style={{
                      backgroundColor: `${item.color}15`,
                      color: item.color,
                    }}
                  >
                    {item.step}
                  </div>
                  <h3 className="mb-1 text-sm font-semibold text-[#E8EAF0]" style={{ fontFamily: "'DM Sans', sans-serif", fontStyle: "normal" }}>
                    {item.title}
                  </h3>
                  <p className="text-xs leading-relaxed text-[#636B8A]">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="text-center">
            <Link
              href={isActive ? "/dashboard?action=claim&campaign=" + campaignId : "/"}
              className={`inline-flex items-center gap-2 rounded-xl px-8 py-4 text-base font-semibold transition-all ${
                isActive
                  ? "bg-[#22D3EE] text-[#0C0F1A] hover:bg-[#67E8F9] hover:shadow-[0_0_20px_rgba(34,211,238,0.3)]"
                  : "cursor-not-allowed bg-[#2A2F45] text-[#636B8A]"
              }`}
            >
              {isActive ? (
                <>
                  Claim This Perk
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    className="transition-transform group-hover:translate-x-0.5"
                  >
                    <path
                      d="M6 3l5 5-5 5"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </>
              ) : (
                "Campaign Unavailable"
              )}
            </Link>
            {isActive && (
              <p className="mt-3 text-xs text-[#636B8A]">
                Sign up or log in to submit your proof and earn the perk.
              </p>
            )}
          </div>
        </div>

        {/* Share Section */}
        <CampaignPageClient
          campaignId={campaignId}
          campaignName={campaignName}
          perkDisplay={perkDisplay}
        />

        {/* Footer */}
        <div className="mt-12 text-center">
          <Link
            href="/"
            className="font-serif text-lg italic text-[#22D3EE] transition-colors hover:text-[#67E8F9]"
          >
            Social Perks
          </Link>
          <p className="mt-2 text-xs text-[#636B8A]">
            Turn customers into your marketing team.
          </p>
        </div>
      </main>
    </div>
  );
}
