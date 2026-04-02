import { Hono } from "hono";
import type { AppEnv } from "@api/env.js";
import { apiResponse, apiError } from "../../helpers.js";
import { requireAuth, optionalAuth } from "../../middleware/auth.js";
import { rateLimit } from "../../middleware/rate-limit.js";
import { perkProgramManager } from "@lib/perk-programs";
import type { CreateProgramConfig } from "@lib/perk-programs";
import { logger } from "@lib/logging";
import { eventBus } from "@lib/realtime";

const app = new Hono<AppEnv>();

// GET /v1/programs?businessId=xxx
app.get("/", rateLimit("relaxed"), (c) => {
  const businessId = c.req.query("businessId");
  if (!businessId) return apiError(c, "MISSING_PARAM", "businessId query parameter is required");
  if (typeof businessId !== "string" || businessId.length > 100) return apiError(c, "INVALID_INPUT", "Invalid businessId");
  const programs = perkProgramManager.listPrograms(businessId);
  return apiResponse(c, { programs });
});

// POST /v1/programs
app.post("/", rateLimit("standard"), requireAuth, async (c) => {
  try {
    const body = await c.req.json();
    const required = ["businessId", "name", "description", "rules", "tiers", "cycle", "cycleStartDay"];
    const missing = required.filter((f) => body[f] === undefined || body[f] === null);
    if (missing.length > 0) return apiError(c, "MISSING_FIELDS", `Missing required fields: ${missing.join(", ")}`);
    if (typeof body.name !== "string" || body.name.trim().length === 0) return apiError(c, "INVALID_INPUT", "name must be a non-empty string");
    if (typeof body.businessId !== "string") return apiError(c, "INVALID_INPUT", "businessId must be a string");
    if (!body.rules || typeof body.rules !== "object") return apiError(c, "INVALID_INPUT", "rules must be an object");
    if (!Array.isArray(body.tiers) || body.tiers.length === 0) return apiError(c, "INVALID_INPUT", "tiers must be a non-empty array");
    const validCycles = ["weekly", "biweekly", "monthly", "quarterly"];
    if (!validCycles.includes(body.cycle)) return apiError(c, "INVALID_INPUT", `cycle must be one of: ${validCycles.join(", ")}`);

    const config: CreateProgramConfig = {
      name: String(body.name).slice(0, 200), description: String(body.description ?? "").slice(0, 2000),
      rules: body.rules, tiers: body.tiers, cycle: body.cycle, cycleStartDay: Number(body.cycleStartDay),
      carryOverPartial: body.carryOverPartial ?? false, gracePeriodDays: body.gracePeriodDays ?? 0, maxMembers: body.maxMembers ?? null,
    };

    const program = perkProgramManager.createProgram(String(body.businessId).slice(0, 100), config);
    eventBus.publish({ type: "program.created", payload: { programId: program.id, businessId: program.businessId, name: program.name }, targetBusinessId: program.businessId, timestamp: new Date().toISOString() });
    logger.info("Perk program created", { programId: program.id, businessId: program.businessId });
    return apiResponse(c, program, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create program";
    return apiError(c, "CREATE_FAILED", message, 400);
  }
});

// GET /v1/programs/:id
app.get("/:programId", rateLimit("relaxed"), (c) => {
  const programId = c.req.param("programId");
  const program = perkProgramManager.getProgram(programId);
  if (!program) return apiError(c, "NOT_FOUND", "Program not found", 404);
  const stats = perkProgramManager.getProgramStats(programId);
  return apiResponse(c, { program, stats });
});

// PUT /v1/programs/:id — requires ownership
app.put("/:programId", rateLimit("standard"), requireAuth, async (c) => {
  const programId = c.req.param("programId");
  try {
    const existing = perkProgramManager.getProgram(programId);
    if (!existing) return apiError(c, "NOT_FOUND", "Program not found", 404);
    const userId = c.get("userId");
    if (userId && userId !== existing.businessId) {
      return apiError(c, "FORBIDDEN", "You do not own this program", 403);
    }
    const body = await c.req.json();
    const program = perkProgramManager.updateProgram(programId, body);
    eventBus.publish({ type: "program.updated", payload: { programId: program.id, businessId: program.businessId }, targetBusinessId: program.businessId, timestamp: new Date().toISOString() });
    return apiResponse(c, program);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update program";
    return apiError(c, "UPDATE_FAILED", message, 400);
  }
});

// DELETE /v1/programs/:id — requires ownership
app.delete("/:programId", rateLimit("standard"), requireAuth, async (c) => {
  const programId = c.req.param("programId");
  try {
    const existing = perkProgramManager.getProgram(programId);
    if (!existing) return apiError(c, "NOT_FOUND", "Program not found", 404);
    const userId = c.get("userId");
    if (userId && userId !== existing.businessId) {
      return apiError(c, "FORBIDDEN", "You do not own this program", 403);
    }
    const program = perkProgramManager.endProgram(programId);
    eventBus.publish({ type: "program.ended", payload: { programId: program.id, businessId: program.businessId }, targetBusinessId: program.businessId, timestamp: new Date().toISOString() });
    return apiResponse(c, { program, message: "Program ended successfully" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to end program";
    return apiError(c, "DELETE_FAILED", message, 400);
  }
});

// GET /v1/programs/:id/progress?memberId=xxx — user can only view own progress
app.get("/:programId/progress", rateLimit("relaxed"), requireAuth, (c) => {
  const programId = c.req.param("programId");
  const memberId = c.req.query("memberId");
  if (!memberId) return apiError(c, "MISSING_PARAM", "memberId query parameter is required");
  // IDOR protection: users can only view their own progress (business owners can view any)
  const userId = c.get("userId");
  const program = perkProgramManager.getProgram(programId);
  if (userId && userId !== memberId && (!program || userId !== program.businessId)) {
    return apiError(c, "FORBIDDEN", "You can only view your own progress", 403);
  }
  try {
    const progress = perkProgramManager.getMemberProgress(programId, memberId);
    return apiResponse(c, { progress });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to get progress";
    return apiError(c, "PROGRESS_FAILED", message, 400);
  }
});

// POST /v1/programs/:id/submit
app.post("/:programId/submit", rateLimit("standard"), requireAuth, async (c) => {
  const programId = c.req.param("programId");
  try {
    const body = await c.req.json();
    if (!body.memberId || !body.actionId) return apiError(c, "MISSING_FIELDS", "memberId and actionId are required");
    // Users can only submit actions for themselves
    const userId = c.get("userId");
    if (userId && userId !== String(body.memberId)) {
      return apiError(c, "FORBIDDEN", "You can only submit actions for yourself", 403);
    }
    const actionData = {
      actionId: String(body.actionId).slice(0, 100),
      platformId: body.platformId ? String(body.platformId).slice(0, 50) : "unknown",
      proofUrl: body.proofUrl ? String(body.proofUrl).slice(0, 2000) : "",
      proofType: (body.proofType as "url" | "screenshot" | "video") ?? "url",
    };
    const result = perkProgramManager.submitAction(programId, String(body.memberId).slice(0, 100), actionData);
    eventBus.publish({ type: "program.action_submitted", payload: { programId, memberId: String(body.memberId), actionId: String(body.actionId) }, timestamp: new Date().toISOString() });
    return apiResponse(c, result, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to submit action";
    return apiError(c, "SUBMIT_FAILED", message, 400);
  }
});

// GET /v1/programs/:id/cashback — user can only view own cashback
app.get("/:programId/cashback", rateLimit("relaxed"), requireAuth, (c) => {
  const programId = c.req.param("programId");
  const memberId = c.req.query("memberId");
  // IDOR protection: users can only view their own cashback (business owners can view any)
  const userId = c.get("userId");
  const program = perkProgramManager.getProgram(programId);
  if (memberId && userId && userId !== memberId && (!program || userId !== program.businessId)) {
    return apiError(c, "FORBIDDEN", "You can only view your own cashback", 403);
  }
  try {
    const program = perkProgramManager.getProgram(programId);
    const cashbackStats = program ? perkProgramManager.getCashBackStats(program.businessId) : null;
    return apiResponse(c, { cashbacks: cashbackStats });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to get cashbacks";
    return apiError(c, "CASHBACK_FAILED", message, 400);
  }
});

// POST /v1/programs/:id/cashback — ownership checks per action
app.post("/:programId/cashback", rateLimit("standard"), requireAuth, async (c) => {
  const programId = c.req.param("programId");
  try {
    const body = await c.req.json();
    const action = body.action ?? "request";
    const validActions = ["request", "approve", "send", "confirm"];
    if (!validActions.includes(action)) {
      return apiError(c, "INVALID_ACTION", "action must be 'request', 'approve', 'send', or 'confirm'");
    }
    let result;
    switch (action) {
      case "request": {
        if (!body.memberId) return apiError(c, "MISSING_FIELDS", "memberId is required");
        // Users can only request cashback for themselves
        const userId = c.get("userId");
        if (userId && userId !== String(body.memberId)) {
          return apiError(c, "FORBIDDEN", "You can only request cashback for yourself", 403);
        }
        const method = body.method ?? "paypal";
        const methodDetails = body.methodDetails ? String(body.methodDetails).slice(0, 500) : "";
        result = perkProgramManager.requestCashBack(programId, String(body.memberId).slice(0, 100), method, methodDetails);
        break;
      }
      case "approve":
      case "send":
      case "confirm": {
        if (!body.cashbackId) return apiError(c, "MISSING_FIELDS", "cashbackId is required");
        // Only program owner can approve/send/confirm
        const userId = c.get("userId");
        const program = perkProgramManager.getProgram(programId);
        if (userId && (!program || userId !== program.businessId)) {
          return apiError(c, "FORBIDDEN", "Only the program owner can process cashbacks", 403);
        }
        result = perkProgramManager.approveCashBack(String(body.cashbackId).slice(0, 100));
        break;
      }
    }
    // Only publish safe fields in event (no raw body spread)
    eventBus.publish({ type: `cashback.${action}`, payload: { programId, action, memberId: body.memberId ? String(body.memberId) : undefined, cashbackId: body.cashbackId ? String(body.cashbackId) : undefined }, timestamp: new Date().toISOString() });
    return apiResponse(c, result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to process cashback";
    return apiError(c, "CASHBACK_FAILED", message, 400);
  }
});

// GET /v1/programs/:id/members — requires auth (prevents PII exposure)
app.get("/:programId/members", rateLimit("relaxed"), requireAuth, (c) => {
  const programId = c.req.param("programId");
  // Only program owner can list members
  const userId = c.get("userId");
  const program = perkProgramManager.getProgram(programId);
  if (userId && (!program || userId !== program.businessId)) {
    return apiError(c, "FORBIDDEN", "Only the program owner can list members", 403);
  }
  try {
    const members = perkProgramManager.listMembers(programId);
    return apiResponse(c, { members });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to list members";
    return apiError(c, "MEMBERS_FAILED", message, 400);
  }
});

// POST /v1/programs/:id/members
app.post("/:programId/members", rateLimit("standard"), requireAuth, async (c) => {
  const programId = c.req.param("programId");
  try {
    const body = await c.req.json();
    if (!body.userId || !body.name) return apiError(c, "MISSING_FIELDS", "userId and name are required");
    if (typeof body.userId !== "string" || typeof body.name !== "string") return apiError(c, "INVALID_INPUT", "userId and name must be strings");
    const member = perkProgramManager.enrollMember(programId, String(body.userId).slice(0, 100), String(body.name).slice(0, 200), body.email ? String(body.email).slice(0, 254) : "");
    eventBus.publish({ type: "member.enrolled", payload: { programId, memberId: member.id, userId: String(body.userId) }, timestamp: new Date().toISOString() });
    return apiResponse(c, member, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to enroll member";
    return apiError(c, "ENROLL_FAILED", message, 400);
  }
});

export default app;
