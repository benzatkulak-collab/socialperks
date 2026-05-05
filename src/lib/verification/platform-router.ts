/**
 * Platform-router — picks real-vs-mock verification adapter based
 * on env. Decision is computed once at module load and cached.
 *
 * The verification engine never knows which it's using; it just
 * calls `getVerifier(platform).verify(args)` and reads
 * `verifier.isMock` for the production-redemption gate.
 *
 * Why a router file rather than per-call branching: keeps the
 * decision in ONE place. When TikTok adapter ships, it adds one
 * branch here; the engine is unchanged.
 *
 * Forced-mock override: setting `VERIFICATION_FORCE_MOCK=1`
 * bypasses the env check and always returns the mock. Useful for
 * staging environments that have IG credentials but want to
 * exercise the demo path for testing.
 */

import type { PlatformId, PlatformVerifier } from "./platforms/types";
import { instagramMock } from "./platforms/instagram-mock";
import { instagramReal } from "./platforms/instagram";

function pickInstagram(): PlatformVerifier {
  if (process.env.VERIFICATION_FORCE_MOCK === "1") return instagramMock;
  const hasCreds =
    !!process.env.OAUTH_IG_CLIENT_ID &&
    !!process.env.OAUTH_IG_CLIENT_SECRET;
  return hasCreds ? instagramReal : instagramMock;
}

const VERIFIERS: Record<PlatformId, PlatformVerifier> = {
  instagram: pickInstagram(),
  // Stubs for platforms whose adapters haven't been written yet.
  // The real router will replace these once we ship them; this
  // shape keeps the type signature complete so the engine doesn't
  // need conditional `?.` checks.
  tiktok: instagramMock, // routed to IG mock until tiktok.ts ships
  facebook: instagramMock, // same
};

export function getVerifier(platform: PlatformId): PlatformVerifier {
  return VERIFIERS[platform];
}

/**
 * Diagnostic: returns the current routing table for the readiness
 * probe to surface. The shape mirrors what /api/v1/health/readiness
 * already returns elsewhere.
 */
export function describeVerifierRouting(): Array<{
  platform: PlatformId;
  isMock: boolean;
  ready: boolean;
  reason?: string;
}> {
  return (Object.keys(VERIFIERS) as PlatformId[]).map((p) => {
    const v = VERIFIERS[p];
    return {
      platform: p,
      isMock: v.isMock,
      ready: !v.isMock,
      reason: v.isMock
        ? p === "instagram"
          ? "OAUTH_IG_CLIENT_ID/SECRET unset — running on demo data"
          : `${p} adapter not yet shipped — routing to demo`
        : undefined,
    };
  });
}

/**
 * Hard-gate: verification engine MUST refuse production-redemption
 * when this returns false unless an admin has manually approved
 * the submission. Keeps the "we never issue real perks for fake
 * verifications" guarantee from VERIFICATION_ENGINE_REAL_API.md.
 */
export function isPlatformProductionReady(platform: PlatformId): boolean {
  const v = VERIFIERS[platform];
  return !v.isMock;
}
