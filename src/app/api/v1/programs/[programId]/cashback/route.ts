/**
 * GET/POST /api/v1/programs/:programId/cashback
 *
 * Cash back payout management for perk programs.
 */

import type { NextRequest } from "next/server";
import {
  ok,
  err,
  requireAuth,
  requireCsrf,
  rateLimit,
  parseBody,
  getQuery,
  paginate,
  withTiming,
} from "../../../_shared";
import {
  programs,
  programMembers,
  payouts,
  hydratePrograms,
  persistPayout,
  type Payout,
} from "@/lib/programs/store";
import { validateEnum, validateNumber, validateString } from "@/lib/security/validate";
import { requireOwnership } from "@/lib/security/owner";

// ─── Route Context Type ─────────────────────────────────────────────────────

interface RouteContext {
  params: Promise<{ programId: string }>;
}

// ─── GET ────────────────────────────────────────────────────────────────────

export const GET = withTiming(async (req: NextRequest, ctx?: unknown) => {
  // Auth required
  const user = requireAuth(req);
  if (user instanceof Response) return user;

  // Relaxed rate limit
  const limited = rateLimit(req, "relaxed");
  if (limited) return limited;

  const { programId } = await (ctx as RouteContext).params;
  await hydratePrograms();
  const program = programs.get(programId);

  if (!program) {
    return err("NOT_FOUND", `Program '${programId}' not found`, 404);
  }

  // Ownership: explicit (treats null user.businessId as no-access).
  // Was the cashback financial-fraud IDOR vector.
  const ownership = requireOwnership(user, program.businessId);
  if (ownership) return ownership;

  const params = getQuery(req);
  const statusFilter = params.get("status");
  const { page, perPage } = paginate(params);

  // Collect payouts for this program
  const programPayouts: Payout[] = [];
  for (const payout of payouts.values()) {
    if (payout.programId === programId) {
      if (!statusFilter || payout.status === statusFilter) {
        programPayouts.push(payout);
      }
    }
  }

  // Sort by requestedAt descending
  programPayouts.sort(
    (a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()
  );

  // Paginate
  const total = programPayouts.length;
  const start = (page - 1) * perPage;
  const items = programPayouts.slice(start, start + perPage);

  return ok({
    payouts: items,
    pagination: { page, perPage, total, totalPages: Math.ceil(total / perPage) },
  });
});

// ─── POST ───────────────────────────────────────────────────────────────────

export const POST = withTiming(async (req: NextRequest, ctx?: unknown) => {
  // Auth required
  const user = requireAuth(req);
  if (user instanceof Response) return user;

  // Standard rate limit
  const limited = rateLimit(req, "standard");
  if (limited) return limited;

  // CSRF — enforce on mutating routes (PR: live audit found bypass)
  const csrfErr = requireCsrf(req);
  if (csrfErr) return csrfErr;

  const { programId } = await (ctx as RouteContext).params;
  await hydratePrograms();
  const program = programs.get(programId);

  if (!program) {
    return err("NOT_FOUND", `Program '${programId}' not found`, 404);
  }

  // Ownership: explicit (treats null user.businessId as no-access).
  // Was the cashback financial-fraud IDOR vector — null user.businessId
  // would skip the check and let any auth'd user mark payouts paid.
  const ownership = requireOwnership(user, program.businessId);
  if (ownership) return ownership;

  const body = await parseBody<{
    action: string;
    memberId?: string;
    amount?: number;
    currency?: string;
    payoutId?: string;
    note?: string;
  }>(req);
  if (body instanceof Response) return body;

  // Validate action
  const validActions = ["request", "approve", "reject", "mark_paid"] as const;
  const actionResult = validateEnum(body.action, "action", validActions);
  if (!actionResult.success) return err("INVALID_ACTION", actionResult.error, 400);
  const action = actionResult.data;

  // Validate note length if provided
  if (body.note !== undefined) {
    const noteResult = validateString(body.note, "note", { max: 1000 });
    if (!noteResult.success) return err("INVALID_NOTE", noteResult.error, 400);
  }

  // ── Request cashback ──────────────────────────────────────────────────
  if (action === "request") {
    const { memberId, amount, currency } = body;

    if (!memberId) return err("MISSING_MEMBER_ID", "memberId is required", 400);

    const amountResult = validateNumber(amount, "amount", { min: 0.01, max: 100000 });
    if (!amountResult.success) return err("INVALID_AMOUNT", amountResult.error, 400);

    // Validate currency if provided
    if (currency !== undefined) {
      const validCurrencies = ["USD", "EUR", "GBP", "CAD", "AUD"] as const;
      const currencyResult = validateEnum(currency, "currency", validCurrencies);
      if (!currencyResult.success) return err("INVALID_CURRENCY", currencyResult.error, 400);
    }

    // Verify member is enrolled
    let enrolled = false;
    for (const m of programMembers.values()) {
      if (m.programId === programId && m.memberId === memberId) {
        enrolled = true;
        break;
      }
    }

    if (!enrolled) {
      return err("NOT_ENROLLED", `Member '${memberId}' is not enrolled in this program`, 403);
    }

    // Idempotency: check for existing pending payout with same member and amount
    for (const existing of payouts.values()) {
      if (
        existing.programId === programId &&
        existing.memberId === memberId &&
        existing.status === "pending" &&
        existing.amount === Math.round(amountResult.data * 100) / 100
      ) {
        return ok({ payout: existing, duplicate: true });
      }
    }

    const payout: Payout = {
      id: crypto.randomUUID(),
      programId,
      memberId,
      amount: Math.round(amountResult.data * 100) / 100,
      currency: currency ?? "USD",
      status: "pending",
      requestedAt: new Date().toISOString(),
      processedAt: null,
      note: body.note ?? null,
    };

    payouts.set(payout.id, payout);
    await persistPayout(payout);
    return ok({ payout }, 201);
  }

  // ── Approve payout ────────────────────────────────────────────────────
  if (action === "approve") {
    const { payoutId } = body;
    if (!payoutId) return err("MISSING_PAYOUT_ID", "payoutId is required", 400);

    const payout = payouts.get(payoutId);
    if (!payout || payout.programId !== programId) {
      return err("NOT_FOUND", `Payout '${payoutId}' not found in this program`, 404);
    }
    if (payout.status !== "pending") {
      return err("INVALID_STATUS", `Payout is already '${payout.status}'`, 400);
    }

    const updated: Payout = {
      ...payout,
      status: "approved",
      processedAt: new Date().toISOString(),
      note: body.note ?? payout.note,
    };
    payouts.set(payoutId, updated);
    await persistPayout(updated);

    return ok({ payout: updated });
  }

  // ── Reject payout ─────────────────────────────────────────────────────
  if (action === "reject") {
    const { payoutId } = body;
    if (!payoutId) return err("MISSING_PAYOUT_ID", "payoutId is required", 400);

    const payout = payouts.get(payoutId);
    if (!payout || payout.programId !== programId) {
      return err("NOT_FOUND", `Payout '${payoutId}' not found in this program`, 404);
    }
    if (payout.status !== "pending") {
      return err("INVALID_STATUS", `Payout is already '${payout.status}'`, 400);
    }

    const updated: Payout = {
      ...payout,
      status: "rejected",
      processedAt: new Date().toISOString(),
      note: body.note ?? payout.note,
    };
    payouts.set(payoutId, updated);
    await persistPayout(updated);

    return ok({ payout: updated });
  }

  // ── Mark as paid ──────────────────────────────────────────────────────
  if (action === "mark_paid") {
    const { payoutId } = body;
    if (!payoutId) return err("MISSING_PAYOUT_ID", "payoutId is required", 400);

    const payout = payouts.get(payoutId);
    if (!payout || payout.programId !== programId) {
      return err("NOT_FOUND", `Payout '${payoutId}' not found in this program`, 404);
    }
    if (payout.status !== "approved") {
      return err("INVALID_STATUS", `Payout must be 'approved' before marking as paid (current: '${payout.status}')`, 400);
    }

    const updated: Payout = {
      ...payout,
      status: "paid",
      processedAt: new Date().toISOString(),
      note: body.note ?? payout.note,
    };
    payouts.set(payoutId, updated);
    await persistPayout(updated);

    return ok({ payout: updated });
  }

  // Unreachable due to enum validation above, but kept as safety net
  return err("INVALID_ACTION", `Unknown action: '${action}'`, 400);
});
