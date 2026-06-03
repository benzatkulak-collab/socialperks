/**
 * GET/POST /api/v1/programs/:programId/members
 *
 * Member enrollment and listing for perk programs.
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
  hydratePrograms,
  persistMember,
  type ProgramMember,
} from "@/lib/programs/store";
import { validateEmail, validateString } from "@/lib/security/validate";

// ─── Route Context Type ─────────────────────────────────────────────────────

interface RouteContext {
  params: Promise<{ programId: string }>;
}

// ─── GET ────────────────────────────────────────────────────────────────────

export const GET = withTiming(async (req: NextRequest, ctx?: unknown) => {
  // Auth required — member data contains PII
  const user = requireAuth(req);
  if (user instanceof Response) return user;

  const limited = rateLimit(req, "standard");
  if (limited) return limited;

  const { programId } = await (ctx as RouteContext).params;
  await hydratePrograms();
  const program = programs.get(programId);

  if (!program) {
    return err("NOT_FOUND", `Program '${programId}' not found`, 404);
  }

  // Tenant isolation: only the program owner can list members
  if (user.businessId && program.businessId !== user.businessId) {
    return err("FORBIDDEN", "You do not have access to this program's members", 403);
  }

  const params = getQuery(req);
  const { page, perPage } = paginate(params);

  // Collect members for this program
  const members: ProgramMember[] = [];
  for (const member of programMembers.values()) {
    if (member.programId === programId) {
      members.push(member);
    }
  }

  // Sort by enrolledAt descending
  members.sort(
    (a, b) => new Date(b.enrolledAt).getTime() - new Date(a.enrolledAt).getTime()
  );

  // Paginate
  const total = members.length;
  const start = (page - 1) * perPage;
  const items = members.slice(start, start + perPage);

  return ok({
    members: items,
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

  // Tenant isolation: only the program owner can enroll members
  if (user.businessId && program.businessId !== user.businessId) {
    return err("FORBIDDEN", "You cannot enroll members in another business's program", 403);
  }

  if (program.status !== "active") {
    return err("PROGRAM_NOT_ACTIVE", `Cannot enroll in a program that is '${program.status}'`, 400);
  }

  const body = await parseBody<{
    memberId: string;
    name: string;
    email: string;
  }>(req);
  if (body instanceof Response) return body;

  const { memberId, name, email } = body;

  if (!memberId) return err("MISSING_MEMBER_ID", "memberId is required", 400);

  const nameResult = validateString(name, "name", { min: 1, max: 200 });
  if (!nameResult.success) return err("INVALID_NAME", nameResult.error, 400);

  const emailResult = validateEmail(email);
  if (!emailResult.success) return err("INVALID_EMAIL", emailResult.error, 400);

  // Check for duplicate enrollment
  for (const m of programMembers.values()) {
    if (m.programId === programId && m.memberId === memberId) {
      return err(
        "ALREADY_ENROLLED",
        `Member '${memberId}' is already enrolled in this program`,
        409
      );
    }
  }

  const member: ProgramMember = {
    id: crypto.randomUUID(),
    programId,
    memberId,
    name: nameResult.data,
    email: emailResult.data,
    enrolledAt: new Date().toISOString(),
    totalPoints: 0,
    currentTier: null,
  };

  programMembers.set(member.id, member);
  await persistMember(member);

  return ok({ member }, 201);
});
