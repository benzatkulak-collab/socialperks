/**
 * Sandbox mode (Inevitability blueprint).
 *
 * Bots need a test-mode where they can exercise the full lifecycle
 * — signup → match → submit → approve → payout — without spending
 * real money or risking real platform connections.
 *
 * Mechanism: an auth token whose payload includes `sandbox: true` is
 * scoped to a virtual ledger. Stripe Connect calls return synthetic
 * accounts. OAuth returns mock tokens. Submissions auto-resolve.
 *
 * Detection: any HTTP request with `X-Sandbox: true` header OR an
 * auth token marked sandbox routes through the virtual ledger.
 */

import type { NextRequest } from "next/server";

export function isSandboxRequest(req: NextRequest): boolean {
  if (req.headers.get("x-sandbox") === "true") return true;
  // Auth token check — when JWT is decoded upstream, callers can pass
  // the decoded payload to isSandboxToken().
  return false;
}

export function isSandboxToken(payload: { sandbox?: boolean } | null | undefined): boolean {
  return Boolean(payload && payload.sandbox);
}

/**
 * In-memory virtual ledger for sandbox payouts. Real payouts go to
 * Stripe; sandbox payouts go here and are visible at
 * GET /api/v1/sandbox/ledger?token=<sandbox-auth-token>.
 */
const ledger = new Map<string, Array<{ at: string; amountCents: number; description: string }>>();

export function recordSandboxPayout(args: { ownerId: string; amountCents: number; description: string }): void {
  const list = ledger.get(args.ownerId) ?? [];
  list.push({ at: new Date().toISOString(), amountCents: args.amountCents, description: args.description });
  ledger.set(args.ownerId, list);
}

export function readSandboxLedger(ownerId: string): Array<{ at: string; amountCents: number; description: string }> {
  return ledger.get(ownerId) ?? [];
}
