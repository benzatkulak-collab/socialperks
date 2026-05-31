/**
 * GET /api/v1/claim/:code
 *
 * Public, rate-limited lookup of a perk program by its short claim code.
 * The customer-facing claim landing (/claim/[code]) renders from this
 * payload. No auth — this is the entry point for end-users who have only
 * a 6-char code printed on a poster, sticker, or QR-link.
 *
 * Returns just enough context to render the landing page:
 *   - Business name
 *   - Program name + description
 *   - Top-tier perk value (so the customer can see "earn $25 cash back")
 *   - The set of allowed actions (so the customer knows what to do)
 *
 * Does NOT leak internal IDs other than programId (which is needed by the
 * subsequent submit flow), member counts, business email, etc.
 */

import type { NextRequest } from "next/server";
import { ok, err, rateLimit, withTiming } from "../../_shared";
import {
  getProgramByClaimCode,
  isValidClaimCodeFormat,
  type PerkProgram,
  type ProgramRule,
  type ProgramTier,
} from "@/lib/programs/store";
import { ALL_ACTIONS } from "@/lib/platforms";
import { createSeedData } from "@/lib/seed";

interface RouteContext {
  params: Promise<{ code: string }>;
}

interface PublicAction {
  actionId: string;
  platformId: string;
  platformName: string;
  platformIcon: string;
  label: string;
  effort: number;
  pointsPerAction: number;
  maxPerCycle: number;
}

interface PublicTier {
  name: string;
  requiredActions: number;
  perkValue: number;
  perkType: "pct" | "dol";
}

interface PublicClaimPayload {
  programId: string;
  claimCode: string;
  businessName: string;
  businessAvatar: string;
  programName: string;
  programDescription: string;
  cycle: PerkProgram["cycle"];
  topTier: PublicTier | null;
  tiers: PublicTier[];
  actions: PublicAction[];
}

/** Resolve a businessId to a display name + avatar, falling back gracefully. */
function resolveBusiness(businessId: string): { name: string; avatar: string } {
  // The seed data is the source of truth for demo accounts. Real businesses
  // would live in the `businesses` table once the persistence layer is wired
  // up; for now this keeps the public landing page working in dev.
  const seed = createSeedData();
  const match = seed.businesses.find((b) => b.id === businessId);
  if (match) return { name: match.name, avatar: match.avatar };
  return { name: "A Local Business", avatar: "🎁" };
}

function ruleToPublic(rule: ProgramRule): PublicAction | null {
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
    pointsPerAction: rule.pointsPerAction,
    maxPerCycle: rule.maxPerCycle,
  };
}

function tierToPublic(tier: ProgramTier): PublicTier {
  return {
    name: tier.name,
    requiredActions: tier.requiredActions,
    perkValue: tier.perkValue,
    perkType: tier.perkType,
  };
}

export const GET = withTiming(async (req: NextRequest, ctx?: unknown) => {
  // PUBLIC endpoint — no auth. The whole point is that a customer can
  // open the URL printed on a sticker without an account.
  // Use the "public" tier (120 req/min) — generous, but rate-limited
  // by IP so a scraper can't enumerate the full code space cheaply.
  const limited = rateLimit(req, "public");
  if (limited) return limited;

  const { code } = await (ctx as RouteContext).params;

  if (!isValidClaimCodeFormat(code)) {
    return err("INVALID_CODE", "Claim code must be 6 base32 characters", 400);
  }

  const program = getProgramByClaimCode(code);
  if (!program) {
    // Same response for "not found" and "wrong format that happened to
    // match the regex" — don't leak which is which to enumerators.
    return err("NOT_FOUND", "Claim code not found", 404);
  }

  // Programs that have ended should still 404 publicly. They shouldn't
  // appear claimable to a customer who scans an old sticker.
  if (program.status !== "active") {
    return err(
      "PROGRAM_INACTIVE",
      "This perk program is not currently accepting claims",
      404
    );
  }

  const business = resolveBusiness(program.businessId);

  // Tiers are sorted ascending by required actions — the "top" tier is
  // the highest reward, which is what the landing page should emphasize.
  const sortedTiers = [...program.tiers].sort(
    (a, b) => a.requiredActions - b.requiredActions
  );
  const topTier =
    sortedTiers.length > 0
      ? tierToPublic(sortedTiers[sortedTiers.length - 1])
      : null;

  const actions = program.rules
    .map(ruleToPublic)
    .filter((a): a is PublicAction => a !== null);

  const payload: PublicClaimPayload = {
    programId: program.id,
    claimCode: program.claimCode,
    businessName: business.name,
    businessAvatar: business.avatar,
    programName: program.name,
    programDescription: program.description,
    cycle: program.cycle,
    topTier,
    tiers: sortedTiers.map(tierToPublic),
    actions,
  };

  return ok(payload);
});
