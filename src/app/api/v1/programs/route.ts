import { NextRequest } from "next/server";
import { apiResponse, apiError, requireAuth } from "@/lib/api/middleware";
import { perkProgramManager } from "@/lib/perk-programs";
import type { CreateProgramConfig } from "@/lib/perk-programs";
import { logger } from "@/lib/logging";
import { eventBus } from "@/lib/realtime";

/**
 * GET /api/v1/programs?businessId=xxx — List programs for a business
 * POST /api/v1/programs — Create a new perk program
 */
export async function GET(request: NextRequest) {
  logger.info("GET /api/v1/programs", { method: "GET", path: "/api/v1/programs" });

  const { searchParams } = new URL(request.url);
  const businessId = searchParams.get("businessId");

  if (!businessId) {
    return apiError("MISSING_PARAM", "businessId query parameter is required");
  }

  const programs = perkProgramManager.listPrograms(businessId);
  return apiResponse({ programs });
}

export async function POST(request: NextRequest) {
  const auth = requireAuth(request);
  if (!auth.authorized) return auth.response!;

  try {
    const body = await request.json();

    // Validate required fields
    const required = ["businessId", "name", "description", "rules", "tiers", "cycle", "cycleStartDay"];
    const missing = required.filter((f) => body[f] === undefined || body[f] === null);
    if (missing.length > 0) {
      return apiError("MISSING_FIELDS", `Missing required fields: ${missing.join(", ")}`);
    }

    if (typeof body.name !== "string" || body.name.trim().length === 0) {
      return apiError("INVALID_INPUT", "name must be a non-empty string");
    }

    if (typeof body.businessId !== "string") {
      return apiError("INVALID_INPUT", "businessId must be a string");
    }

    if (!body.rules || typeof body.rules !== "object") {
      return apiError("INVALID_INPUT", "rules must be an object");
    }

    if (!Array.isArray(body.tiers) || body.tiers.length === 0) {
      return apiError("INVALID_INPUT", "tiers must be a non-empty array");
    }

    const validCycles = ["weekly", "biweekly", "monthly", "quarterly"];
    if (!validCycles.includes(body.cycle)) {
      return apiError("INVALID_INPUT", `cycle must be one of: ${validCycles.join(", ")}`);
    }

    const config: CreateProgramConfig = {
      name: String(body.name).slice(0, 200),
      description: String(body.description ?? "").slice(0, 2000),
      rules: body.rules,
      tiers: body.tiers,
      cycle: body.cycle,
      cycleStartDay: Number(body.cycleStartDay),
      carryOverPartial: body.carryOverPartial ?? false,
      gracePeriodDays: body.gracePeriodDays ?? 0,
      maxMembers: body.maxMembers ?? null,
    };

    const program = perkProgramManager.createProgram(String(body.businessId).slice(0, 100), config);

    // Publish real-time event
    eventBus.publish({
      type: "program.created",
      payload: {
        programId: program.id,
        businessId: program.businessId,
        name: program.name,
      },
      targetBusinessId: program.businessId,
      timestamp: new Date().toISOString(),
    });

    logger.info("Perk program created", { programId: program.id, businessId: program.businessId });

    return apiResponse(program, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create program";
    logger.error("Failed to create perk program", err instanceof Error ? err : undefined);
    return apiError("CREATE_FAILED", message, 400);
  }
}
