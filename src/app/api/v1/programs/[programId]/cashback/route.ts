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
  type Payout,
} from "@/lib/programs/store";

// ─── Route Context Type ─────────────────────────────────────────────────────

interface RouteContext {
  params: Promise<{ programId: string }>;
}

// ─── GET ────────────────────────────────────────────────────────────────────

export const GET = withTiming(async (req: NextRequest, ctx?: unknown) => {
  // Auth required
  const user = requireAuth(req);
  if (user instanceof Response) return user;

  const csrfError = requireCsrf(req, user);
  if (csrfError) return csrfError;

  // Relaxed rate limit
  const limited = rateLimit(req, "relaxed");
  if (limited) return limited;

  const { programId } = await (ctx as RouteContext).params;
  const program = programs.get(programId);

  if (!program) {
    return err("NOT_FOUND", `Program '${programId}' not found`, 404);
  }

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

  const csrfError = requireCsrf(req, user);
  if (csrfError) return csrfError;

  // Standard rate limit
  const limited = rateLimit(req, "standard");
  if (limited) return limited;

  const { programId } = await (ctx as RouteContext).params;
  const program = programs.get(programId);

  if (!program) {
    return err("NOT_FOUND", `Program '${programId}' not found`, 404);
  }

  const body = await parseBody<{
    action: string;
    memberId?: string;
    amount?: number;
    currency?: string;
    payoutId?: string;
    note?: string;
  }>(req);
  if (body instanceof Response) return body;

  const { action } = body;

  // SECURITY: approve/reject/mark_paid mutate financial state and must only
  // be callable by the program's owning business (or an admin). "request" is
  // allowed for any authenticated user — the enrollment check below restricts
  // it to enrolled members.
  const financialActions = new Set(["approve", "reject", "mark_paid"]);
  if (financialActions.has(action) && user.role !== "admin" && user.businessId !== program.businessId) {
    return err(
      "FORBIDDEN",
      "You do not have permission to manage payouts for this program",
      403
    );
  }

  // ── Request cashback ──────────────────────────────────────────────────
  if (action === "request") {
    const { memberId, amount, currency } = body;

    if (!memberId) return err("MISSING_MEMBER_ID", "memberId is required", 400);
    if (!amount || typeof amount !== "number" || amount <= 0) {
      return err("INVALID_AMOUNT", "amount must be a positive number", 400);
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

    const payout: Payout = {
      id: crypto.randomUUID(),
      programId,
      memberId,
      amount: Math.round(amount * 100) / 100,
      currency: currency ?? "USD",
      status: "pending",
      requestedAt: new Date().toISOString(),
      processedAt: null,
      note: body.note ?? null,
    };

    payouts.set(payout.id, payout);
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

    return ok({ payout: updated });
  }

  return err(
    "INVALID_ACTION",
    `Unknown action: '${action}'. Valid actions: request, approve, reject, mark_paid`,
    400
  );
});
