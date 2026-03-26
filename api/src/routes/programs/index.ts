import { Hono } from "hono";
import { apiResponse, apiError } from "../../helpers.js";
import { requireAuth } from "../../middleware/auth.js";
import { rateLimit } from "../../middleware/rate-limit.js";
import { perkProgramManager } from "@/lib/perk-programs";
import type { CreateProgramConfig } from "@/lib/perk-programs";
import { logger } from "@/lib/logging";
import { eventBus } from "@/lib/realtime";

const app = new Hono();

// GET /v1/programs?businessId=xxx
app.get("/", (c) => {
  const businessId = c.req.query("businessId");
  if (!businessId) return apiError(c, "MISSING_PARAM", "businessId query parameter is required");
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
app.get("/:programId", (c) => {
  const programId = c.req.param("programId");
  const program = perkProgramManager.getProgram(programId);
  if (!program) return apiError(c, "NOT_FOUND", "Program not found", 404);
  const stats = perkProgramManager.getProgramStats(programId);
  return apiResponse(c, { program, stats });
});

// PUT /v1/programs/:id
app.put("/:programId", requireAuth, async (c) => {
  const programId = c.req.param("programId");
  try {
    const body = await c.req.json();
    const program = perkProgramManager.updateProgram(programId, body);
    eventBus.publish({ type: "program.updated", payload: { programId: program.id, businessId: program.businessId }, targetBusinessId: program.businessId, timestamp: new Date().toISOString() });
    return apiResponse(c, program);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update program";
    return apiError(c, "UPDATE_FAILED", message, 400);
  }
});

// DELETE /v1/programs/:id
app.delete("/:programId", requireAuth, async (c) => {
  const programId = c.req.param("programId");
  try {
    const program = perkProgramManager.endProgram(programId);
    eventBus.publish({ type: "program.ended", payload: { programId: program.id, businessId: program.businessId }, targetBusinessId: program.businessId, timestamp: new Date().toISOString() });
    return apiResponse(c, { program, message: "Program ended successfully" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to end program";
    return apiError(c, "DELETE_FAILED", message, 400);
  }
});

// GET /v1/programs/:id/progress?memberId=xxx
app.get("/:programId/progress", requireAuth, (c) => {
  const programId = c.req.param("programId");
  const memberId = c.req.query("memberId");
  if (!memberId) return apiError(c, "MISSING_PARAM", "memberId query parameter is required");
  try {
    const progress = perkProgramManager.getMemberProgress(programId, memberId);
    return apiResponse(c, { progress });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to get progress";
    return apiError(c, "PROGRESS_FAILED", message, 400);
  }
});

// POST /v1/programs/:id/submit
app.post("/:programId/submit", requireAuth, async (c) => {
  const programId = c.req.param("programId");
  try {
    const body = await c.req.json();
    if (!body.memberId || !body.actionId) return apiError(c, "MISSING_FIELDS", "memberId and actionId are required");
    const result = perkProgramManager.submitAction(programId, String(body.memberId), String(body.actionId), { proofUrl: body.proofUrl, proofType: body.proofType, metadata: body.metadata });
    eventBus.publish({ type: "program.action_submitted", payload: { programId, memberId: String(body.memberId), actionId: String(body.actionId) }, timestamp: new Date().toISOString() });
    return apiResponse(c, result, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to submit action";
    return apiError(c, "SUBMIT_FAILED", message, 400);
  }
});

// GET /v1/programs/:id/cashback
app.get("/:programId/cashback", requireAuth, (c) => {
  const programId = c.req.param("programId");
  const memberId = c.req.query("memberId");
  try {
    const cashbacks = perkProgramManager.getCashbacks(programId, memberId ?? undefined);
    return apiResponse(c, { cashbacks });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to get cashbacks";
    return apiError(c, "CASHBACK_FAILED", message, 400);
  }
});

// POST /v1/programs/:id/cashback
app.post("/:programId/cashback", requireAuth, async (c) => {
  const programId = c.req.param("programId");
  try {
    const body = await c.req.json();
    const action = body.action ?? "request";
    let result;
    switch (action) {
      case "request":
        if (!body.memberId) return apiError(c, "MISSING_FIELDS", "memberId is required");
        result = perkProgramManager.requestCashback(programId, String(body.memberId));
        break;
      case "approve":
      case "send":
      case "confirm":
        if (!body.cashbackId) return apiError(c, "MISSING_FIELDS", "cashbackId is required");
        result = perkProgramManager.processCashback(programId, String(body.cashbackId), action);
        break;
      default:
        return apiError(c, "INVALID_ACTION", "action must be 'request', 'approve', 'send', or 'confirm'");
    }
    eventBus.publish({ type: `cashback.${action}`, payload: { programId, ...body }, timestamp: new Date().toISOString() });
    return apiResponse(c, result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to process cashback";
    return apiError(c, "CASHBACK_FAILED", message, 400);
  }
});

// GET /v1/programs/:id/members
app.get("/:programId/members", (c) => {
  const programId = c.req.param("programId");
  try {
    const members = perkProgramManager.listMembers(programId);
    return apiResponse(c, { members });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to list members";
    return apiError(c, "MEMBERS_FAILED", message, 400);
  }
});

// POST /v1/programs/:id/members
app.post("/:programId/members", requireAuth, async (c) => {
  const programId = c.req.param("programId");
  try {
    const body = await c.req.json();
    if (!body.userId || !body.name) return apiError(c, "MISSING_FIELDS", "userId and name are required");
    const member = perkProgramManager.enrollMember(programId, { userId: String(body.userId), name: String(body.name), email: body.email, metadata: body.metadata });
    eventBus.publish({ type: "member.enrolled", payload: { programId, memberId: member.id, userId: String(body.userId) }, timestamp: new Date().toISOString() });
    return apiResponse(c, member, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to enroll member";
    return apiError(c, "ENROLL_FAILED", message, 400);
  }
});

export default app;
