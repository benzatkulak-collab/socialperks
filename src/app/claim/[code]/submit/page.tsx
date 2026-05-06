import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getProgramByClaimCode,
  isValidClaimCodeFormat,
  type ProgramRule,
} from "@/lib/programs/store";
import { ALL_ACTIONS } from "@/lib/platforms";
import { createSeedData } from "@/lib/seed";
import { SubmitFlow } from "./submit-flow";

interface PageProps {
  params: Promise<{ code: string }>;
}

interface ResolvedAction {
  actionId: string;
  platformId: string;
  platformName: string;
  platformIcon: string;
  label: string;
}

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
      };
    })
    .filter((a): a is ResolvedAction => a !== null);
}

export const metadata: Metadata = {
  title: "Submit your proof — Social Perks",
  robots: { index: false, follow: false },
};

export default async function ClaimSubmitPage({ params }: PageProps) {
  const { code } = await params;
  if (!isValidClaimCodeFormat(code)) {
    notFound();
  }
  const program = getProgramByClaimCode(code);
  if (!program || program.status !== "active") {
    notFound();
  }

  const business = resolveBusiness(program.businessId);
  const actions = resolveActions(program.rules);

  return (
    <div className="min-h-screen bg-brand-bg">
      <header className="border-b border-brand-border bg-brand-surface/50 backdrop-blur-sm">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <Link
            href={`/claim/${program.claimCode}`}
            className="text-xs font-heading italic text-brand-cyan tracking-wide hover:text-brand-white transition-colors"
          >
            ← Back
          </Link>
          <span className="text-2xs text-brand-muted font-mono uppercase">
            {program.claimCode}
          </span>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8 sm:py-12">
        <div className="text-center mb-6">
          {business && (
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-brand-surface border border-brand-border text-2xl mb-3">
              {business.avatar}
            </div>
          )}
          <h1 className="text-xl sm:text-2xl font-heading italic text-brand-white">
            Submit your proof
          </h1>
          <p className="text-xs text-brand-muted mt-1">
            {business?.name ?? "A local business"}
          </p>
        </div>

        <SubmitFlow code={program.claimCode} actions={actions} />

        <div className="mt-8 rounded-lg border border-brand-border/50 bg-brand-elevated/30 px-4 py-3">
          <p className="text-2xs text-brand-muted leading-relaxed">
            Your phone or email is used only to send a one-time code and tie this
            submission to you. We do not create an account or send marketing.
          </p>
        </div>
      </main>
    </div>
  );
}
