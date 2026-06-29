import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { campaignManager } from "@/lib/campaign-state-machine";
import { loadLifecycle } from "@/lib/campaign-state-machine/persist";
import { createSeedData } from "@/lib/seed";
import { getUserByBusinessId, ensureUsersSeeded } from "@/lib/auth/user-store";
import { PLATFORMS, findAction, findPlatform } from "@/lib/platforms";
import { SubmitForm } from "./submit-form";
import { InviteUnlock } from "@/components/campaign/invite-unlock";

// ─── Types ──────────────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ campaignId: string }>;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

interface BusinessInfo {
  name: string;
  avatar: string;
  type: string;
  location: string;
}

/**
 * Resolve a campaign's business identity for display. Seeded demo businesses
 * live in seed data; real signed-up businesses live in auth_users (keyed by
 * `biz_<userId>`), so we fall back to the user store — otherwise a real
 * business renders as a nameless "Campaign".
 */
async function getBusinessInfo(businessId: string): Promise<BusinessInfo | null> {
  const seed = createSeedData();
  const seeded = seed.businesses.find((b) => b.id === businessId);
  if (seeded) {
    return {
      name: seeded.name,
      avatar: seeded.avatar ?? "🏪",
      type: seeded.type ?? "",
      location: seeded.location ?? "",
    };
  }
  try {
    // Hydrates the in-memory user map from Postgres on a cold start.
    await ensureUsersSeeded();
    const user = getUserByBusinessId(businessId);
    if (user) {
      return { name: user.name, avatar: "🏪", type: "", location: "" };
    }
  } catch {
    // fall through to null — page degrades to a generic header
  }
  return null;
}

/**
 * Look up a campaign: in-memory map → event-store rehydrate → durable DB row.
 * The first two are per-process and wiped on redeploy, so the DB fallback is
 * what keeps a live campaign's /c/{id} page from 404ing after a cold start.
 */
async function getCampaign(campaignId: string) {
  let lifecycle = campaignManager.getState(campaignId);
  if (!lifecycle) {
    lifecycle = campaignManager.rehydrate(campaignId) ?? undefined;
  }
  if (!lifecycle) {
    const fromDb = await loadLifecycle(campaignId);
    if (fromDb) {
      campaignManager.register(fromDb);
      lifecycle = fromDb;
    }
  }
  return lifecycle ?? null;
}

// ─── Dynamic Metadata ───────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { campaignId } = await params;
  const campaign = await getCampaign(campaignId);

  if (!campaign) {
    return {
      title: "Campaign Not Found - Social Perks",
    };
  }

  const business = await getBusinessInfo(campaign.businessId);
  const businessName = business?.name ?? "A local business";

  // Try to extract campaign name from event store
  const title = `Campaign by ${businessName} - Social Perks`;
  const description = `Complete a marketing action for ${businessName} and earn a reward. Powered by Social Perks.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      siteName: "Social Perks",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default async function CampaignPage({ params }: PageProps) {
  const { campaignId } = await params;
  const campaign = await getCampaign(campaignId);

  // Campaign not found
  if (!campaign) {
    notFound();
  }

  const business = await getBusinessInfo(campaign.businessId);
  const isTerminal =
    campaign.state === "ended" || campaign.state === "expired";

  // Attribution for the B2B2C "Powered by" links. A customer who discovers
  // Social Perks via a business's claim page and clicks through is a
  // referral-channel visit; without utm params that traffic was invisible to
  // analytics. (Per-business ?ref credit additionally requires reconciling the
  // two referral-code systems — tracked separately — but channel attribution
  // works regardless.)
  const poweredByHref = `/?utm_source=campaign_page&utm_medium=powered_by&utm_campaign=${encodeURIComponent(campaignId)}`;

  // Format the reward
  const budgetLabel =
    campaign.budget.type === "pct"
      ? `${campaign.budget.allocated}% off`
      : `$${campaign.budget.allocated.toFixed(0)} off`;

  // Build the action picker from the campaign's own `actions[]` array
  // — previously we showed a "curated" top-8 across every platform,
  // which let customers pick actions the campaign didn't actually
  // allow. The /submissions/public endpoint correctly rejected those
  // with ACTION_NOT_ALLOWED, but the customer-facing error was
  // confusing ("but I picked one of your options!"). Source: live
  // click-through audit, /c/[id] dropdown showed 8 actions on a
  // 1-action campaign.
  const campaignActions = (campaign.actions ?? [])
    .map((id) => {
      const action = findAction(id);
      const platform = action?.platformId ? findPlatform(action.platformId) : null;
      if (!action) return null;
      return {
        id: action.id,
        label: action.label,
        platformIcon: platform?.icon ?? "•",
      };
    })
    .filter((a): a is { id: string; label: string; platformIcon: string } => a !== null);

  // Defensive fallback: if a legacy campaign somehow has no actions[]
  // recorded, fall back to the old popular list so the page still
  // works rather than offering an empty dropdown.
  const popularActions =
    campaignActions.length > 0
      ? campaignActions
      : PLATFORMS.flatMap((p) =>
          p.actions
            .filter((a) => a.incentivizable && a.effort <= 3)
            .slice(0, 2)
            .map((a) => ({
              id: a.id,
              label: a.label,
              platformIcon: p.icon,
            }))
        ).slice(0, 8);

  // Expiry info
  const expiresAt = new Date(campaign.expiry.expiresAt);
  const now = new Date();
  const daysLeft = Math.max(
    0,
    Math.ceil((expiresAt.getTime() - now.getTime()) / 86_400_000)
  );

  return (
    <div className="min-h-screen bg-brand-bg">
      {/* Header bar */}
      <header className="border-b border-brand-border bg-brand-surface/50 backdrop-blur-sm">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <Link
            href={poweredByHref}
            className="text-xs font-heading italic text-brand-cyan tracking-wide hover:text-brand-white transition-colors"
          >
            Social Perks
          </Link>
          {/* Campaign-code chip. Was showing the bare uuid tail
              ("28737c22") which read as random gibberish. Format as a
              "CAMP-XXXX" code uppercase. Still a deterministic
              identifier the customer can quote to support, just less
              "what is this random string" to a layperson. */}
          <span
            className="text-2xs text-brand-muted font-mono uppercase tracking-wider"
            title={`Campaign ${campaignId}`}
          >
            CAMP-{campaignId.slice(-6).toUpperCase()}
          </span>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8 sm:py-12">
        {/* Business identity */}
        <div className="text-center mb-8 animate-fade-up">
          {business && (
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-surface border border-brand-border text-3xl mb-4">
              {business.avatar}
            </div>
          )}
          <h1 className="text-2xl sm:text-3xl font-heading italic text-brand-white mb-1">
            {business?.name ?? "Campaign"}
          </h1>
          {business && (business.type || business.location) && (
            <p className="text-xs text-brand-muted">
              {[business.type, business.location].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>

        {/* Reward card */}
        <div className="rounded-xl border border-brand-cyan/20 bg-brand-cyan/5 p-5 sm:p-6 mb-6 text-center animate-fade-up">
          <p className="text-2xs font-semibold text-brand-cyan uppercase tracking-widest mb-2">
            Your Reward
          </p>
          <p className="text-3xl sm:text-4xl font-heading italic text-brand-white mb-2">
            {budgetLabel}
          </p>
          <p className="text-xs text-brand-dim leading-relaxed max-w-xs mx-auto">
            Complete one of the marketing actions below and submit your proof to
            earn this perk.
          </p>
          {!isTerminal && daysLeft > 0 && (
            <p className="text-2xs text-brand-muted mt-3 font-mono">
              {daysLeft} day{daysLeft !== 1 ? "s" : ""} remaining
            </p>
          )}
        </div>

        {/* Campaign ended/expired state */}
        {isTerminal ? (
          <div className="rounded-xl border border-brand-amber/20 bg-brand-amber/5 p-6 text-center animate-fade-up">
            <div className="w-12 h-12 rounded-full bg-brand-amber/10 flex items-center justify-center mx-auto mb-3">
              <svg
                className="w-6 h-6 text-brand-amber"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                />
              </svg>
            </div>
            <h2 className="text-lg font-heading italic text-brand-white mb-1">
              Campaign {campaign.state === "expired" ? "Expired" : "Ended"}
            </h2>
            <p className="text-xs text-brand-dim">
              This campaign is no longer accepting submissions. Check back for
              new offers from {business?.name ?? "this business"}.
            </p>
          </div>
        ) : (
          <>
            {/* Submission form */}
            <div className="rounded-xl border border-brand-border bg-brand-surface p-5 sm:p-6 animate-fade-up">
              <h2 className="text-lg font-heading italic text-brand-white mb-1">
                Submit Your Proof
              </h2>
              <p className="text-xs text-brand-dim mb-5">
                Post about {business?.name ?? "this business"} on social media,
                then share the link below.
              </p>
              <SubmitForm
                campaignId={campaignId}
                actions={popularActions}
              />
            </div>

            {/* Viral loop: share with N friends to unlock a bigger perk.
                Computes the upgraded perk as +5 (pct) or +$2 (dol) on
                top of the base — generous enough to motivate sharing,
                cheap enough that the business can absorb it. */}
            <InviteUnlock
              campaignId={campaignId}
              basePerkText={budgetLabel}
              upgradedPerkText={
                campaign.budget.type === "pct"
                  ? `${campaign.budget.allocated + 5}% off`
                  : `$${campaign.budget.allocated + 2} off`
              }
            />

            {/* FTC Disclosure */}
            <div className="mt-6 rounded-lg border border-brand-border/50 bg-brand-elevated/30 px-4 py-3 animate-fade-up">
              <p className="text-2xs text-brand-muted leading-relaxed">
                <span className="font-semibold text-brand-dim">
                  FTC Disclosure:
                </span>{" "}
                This is an incentivized marketing campaign. If you receive a perk
                in exchange for posting, you must disclose the relationship in
                your content (e.g., #ad, #sponsored, or &quot;I received a
                discount for this post&quot;). This is required by FTC
                guidelines.
              </p>
            </div>
          </>
        )}

        {/* Stats footer */}
        {!isTerminal && (
          <div className="mt-6 flex items-center justify-center gap-6 text-center animate-fade-up">
            <div>
              <p className="text-lg font-mono font-semibold text-brand-white">
                {campaign.completions.current}
              </p>
              <p className="text-2xs text-brand-muted">Completions</p>
            </div>
            {campaign.completions.max !== null && (
              <div>
                <p className="text-lg font-mono font-semibold text-brand-white">
                  {Math.max(
                    0,
                    campaign.completions.max - campaign.completions.current
                  )}
                </p>
                <p className="text-2xs text-brand-muted">Spots left</p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-brand-border/50 mt-12">
        <div className="max-w-lg mx-auto px-4 py-6 text-center">
          <p className="text-2xs text-brand-muted">
            Powered by{" "}
            <Link
              href={poweredByHref}
              className="text-brand-cyan hover:text-brand-white transition-colors"
            >
              Social Perks
            </Link>{" "}
            &mdash; Turn customers into your marketing team
          </p>
        </div>
      </footer>
    </div>
  );
}
