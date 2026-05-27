/**
 * GET   /api/v1/leads        — list collected leads (filterable)
 * PATCH /api/v1/leads?id=... — update outreach status / notes
 *
 * Query filters: status, industry, city, minScore
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
  withTiming,
} from "../_shared";
import {
  getLead,
  getLeads,
  updateOutreachStatus,
  countLeadsByStatus,
} from "@/lib/leads/store";
import { OUTREACH_STATUSES, type OutreachStatus } from "@/lib/leads/types";

export const GET = withTiming(async (req: NextRequest) => {
  const user = requireAuth(req);
  if (user instanceof Response) return user;

  const csrfError = requireCsrf(req, user);
  if (csrfError) return csrfError;

  const rl = rateLimit(req, "relaxed");
  if (rl) return rl;

  const params = getQuery(req);
  const status = params.get("status") as OutreachStatus | null;
  const industry = params.get("industry") ?? undefined;
  const city = params.get("city") ?? undefined;
  const minScoreStr = params.get("minScore");
  const minScore = minScoreStr ? parseInt(minScoreStr, 10) : undefined;

  if (status && !OUTREACH_STATUSES.includes(status)) {
    return err(
      "INVALID_FIELD",
      `status must be one of: ${OUTREACH_STATUSES.join(", ")}`,
      400
    );
  }

  const ownerId = (user as { id: string }).id;
  const leads = await getLeads({
    ownerId,
    status: status ?? undefined,
    industry,
    city,
    minScore,
  });

  const stats = await countLeadsByStatus(ownerId);

  return ok({ leads, total: leads.length, stats });
});

interface PatchBody {
  status?: OutreachStatus;
  notes?: string;
}

export const PATCH = withTiming(async (req: NextRequest) => {
  const user = requireAuth(req);
  if (user instanceof Response) return user;

  const csrfError = requireCsrf(req, user);
  if (csrfError) return csrfError;

  const rl = rateLimit(req, "standard");
  if (rl) return rl;

  const id = getQuery(req).get("id");
  if (!id) return err("MISSING_FIELD", "id query param is required", 400);

  const body = await parseBody<PatchBody>(req);
  if (body instanceof Response) return body;

  if (body.status && !OUTREACH_STATUSES.includes(body.status)) {
    return err(
      "INVALID_FIELD",
      `status must be one of: ${OUTREACH_STATUSES.join(", ")}`,
      400
    );
  }

  // SECURITY: verify ownership BEFORE mutating the store so that another
  // authenticated user can't update a lead they don't own.
  const existing = await getLead(id);
  if (!existing) return err("NOT_FOUND", "Lead not found", 404);
  if (existing.ownerId && existing.ownerId !== (user as { id: string }).id) {
    return err("FORBIDDEN", "Not your lead", 403);
  }

  const updated = await updateOutreachStatus(
    id,
    body.status ?? "new",
    body.notes
  );
  if (!updated) return err("NOT_FOUND", "Lead not found", 404);

  return ok({ lead: updated });
});
