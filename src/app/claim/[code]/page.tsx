import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getProgramByClaimCode,
  isValidClaimCodeFormat,
  type PerkProgram,
  type ProgramRule,
  type ProgramTier,
} from "@/lib/programs/store";
import { ALL_ACTIONS } from "@/lib/platforms";
import { createSeedData } from "@/lib/seed";

interface PageProps {
  params: Promise<{ code: string }>;
}

interface ResolvedAction {
  actionId: string;
  platformId: string;
  platformName: string;
  platformIcon: string;
  label: string;
  effort: number;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function resolveBusiness(businessId: string) {
  const seed = createSeedData();
  return seed.businesses.find((b) => b.id === businessId) ?? null;
}

function resolveActions(rules: ProgramRule[]): ResolvedAction[] {
  return rules
    .map((rule): ResolvedAction | null => {
      const found = ALL_ACTIONS.find(
        (a) => a.id === rule.actionId && a.platformId === rule.platformId
      );
      if (!found) return null;
      return {
        actionId: rule.actionId,
        platformId: rule.platformId,
        platformName: found.platformName,
        platformIcon: found.platformIcon,
        label: found.label,
        effort: found.effort,
      };
    })
    .filter((a): a is ResolvedAction => a !== null);
}

function topTier(tiers: ProgramTier[]): ProgramTier | null {
  if (tiers.length === 0) return null;
  const sorted = [...tiers].sort(
    (a, b) => a.requiredActions - b.requiredActions
  );
  return sorted[sorted.length - 1];
}

function formatPerk(tier: ProgramTier): string {
  if (tier.perkType === "pct") return `${tier.perkValue}% off`;
  return `$${tier.perkValue.toFixed(0)} off`;
}

// ─── Metadata ───────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { code } = await params;
  if (!isValidClaimCodeFormat(code)) {
    return { title: "Claim — Social Perks" };
  }
  const program = getProgramByClaimCode(code);
  if (!program || program.status !== "active") {
    return { title: "Claim not found — Social Perks" };
  }
  const business = resolveBusiness(program.businessId);
  const businessName = business?.name ?? "A local business";
  const tier = topTier(program.tiers);
  const description = tier
    ? `Earn ${formatPerk(tier)} at ${businessName} by posting about them on social media.`
    : `Earn a perk at ${businessName} by posting about them on social media.`;
  return {
    title: `Claim your perk at ${businessName} — Social Perks`,
    description,
    // Don't index public claim URLs — they're per-customer entry points,
    // not content we want in search results.
    robots: { index: false, follow: false },
    openGraph: {
      title: `Claim your perk at ${businessName}`,
      description,
      type: "website",
      siteName: "Social Perks",
    },
  };
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default async function ClaimLandingPage({ params }: PageProps) {
  const { code } = await params;

  // Reject malformed codes early — keeps any subsequent enumeration cheap
  // and gives the customer a real "not found" page.
  if (!isValidClaimCodeFormat(code)) {
    notFound();
  }

  const program: PerkProgram | null = getProgramByClaimCode(code);
  if (!program || program.status !== "active") {
    notFound();
  }

  const business = resolveBusiness(program.businessId);
  const tier = topTier(program.tiers);
  const actions = resolveActions(program.rules);

  // Submission target — encoded in the CTA href for the next PR (PR C),
  // which adds the OTP-gated submit endpoint at /claim/{code}/submit.
  const submitHref = `/claim/${program.claimCode}/submit`;

  return (
    <div className="min-h-screen bg-brand-bg">
      <header className="border-b border-brand-border bg-brand-surface/50 backdrop-blur-sm">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <Link
            href="/"
            className="text-xs font-heading italic text-brand-cyan tracking-wide hover:text-brand-white transition-colors"
          >
            Social Perks
          </Link>
          <span className="text-2xs text-brand-muted font-mono uppercase">
            {program.claimCode}
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
            {business?.name ?? "A Local Business"}
          </h1>
          {business && (
            <p className="text-xs text-brand-muted">
              {business.type} &middot; {business.location}
            </p>
          )}
        </div>

        {/* Reward headline */}
        <div className="rounded-xl border border-brand-cyan/20 bg-brand-cyan/5 p-5 sm:p-6 mb-6 text-center animate-fade-up">
          <p className="text-2xs font-semibold text-brand-cyan uppercase tracking-widest mb-2">
            Your Perk
          </p>
          {tier ? (
            <>
              <p className="text-3xl sm:text-4xl font-heading italic text-brand-white mb-2">
                {formatPerk(tier)}
              </p>
              <p className="text-xs text-brand-dim leading-relaxed max-w-xs mx-auto">
                Complete{" "}
                <span className="text-brand-white font-semibold">
                  {tier.requiredActions}
                </span>{" "}
                {tier.requiredActions === 1 ? "action" : "actions"} below to
                unlock the {tier.name} tier.
              </p>
            </>
          ) : (
            <p className="text-xs text-brand-dim">
              Reward details coming soon.
            </p>
          )}
        </div>

        {/* Program description */}
        {program.description && (
          <div className="rounded-xl border border-brand-border bg-brand-surface p-4 mb-6 animate-fade-up">
            <p className="text-sm text-brand-dim leading-relaxed">
              {program.description}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="rounded-xl border border-brand-border bg-brand-surface p-5 sm:p-6 mb-6 animate-fade-up">
          <h2 className="text-lg font-heading italic text-brand-white mb-1">
            What to do
          </h2>
          <p className="text-xs text-brand-dim mb-4">
            Pick any of these actions, then come back to submit your proof.
          </p>
          {actions.length === 0 ? (
            <p className="text-xs text-brand-muted">
              This program has no published actions yet. Check back soon.
            </p>
          ) : (
            <ul className="space-y-2">
              {actions.map((action) => (
                <li
                  key={`${action.platformId}:${action.actionId}`}
                  className="flex items-center gap-3 rounded-lg border border-brand-border/60 bg-brand-elevated/30 px-3 py-2.5"
                >
                  <span className="text-xl" aria-hidden="true">
                    {action.platformIcon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-brand-white truncate">
                      {action.label}
                    </p>
                    <p className="text-2xs text-brand-muted">
                      {action.platformName}
                    </p>
                  </div>
                  <span className="text-2xs text-brand-muted font-mono">
                    effort {action.effort}/5
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Single CTA */}
        <Link
          href={submitHref}
          className="block w-full text-center rounded-xl bg-brand-cyan px-5 py-4 text-sm font-semibold text-brand-bg shadow-lg shadow-brand-cyan/20 hover:bg-brand-cyan/90 transition-colors"
          data-testid="claim-cta"
        >
          I did this — submit proof
        </Link>

        <p className="text-2xs text-brand-muted text-center mt-3">
          You&apos;ll verify your phone or email on the next step.
        </p>

        {/* FTC Disclosure */}
        <div className="mt-8 rounded-lg border border-brand-border/50 bg-brand-elevated/30 px-4 py-3 animate-fade-up">
          <p className="text-2xs text-brand-muted leading-relaxed">
            <span className="font-semibold text-brand-dim">
              FTC Disclosure:
            </span>{" "}
            This is an incentivized marketing program. If you receive a perk in
            exchange for posting, you must disclose the relationship in your
            content (e.g., #ad, #sponsored, or &quot;I received a discount for
            this post&quot;). This is required by FTC guidelines.
          </p>
        </div>
      </main>
    </div>
  );
}
