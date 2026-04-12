/**
 * GET/POST /api/v1/sandbox -- Sandbox Environment Management
 *
 * POST with action `create`:  Create a sandbox environment (returns sandbox API key)
 * POST with action `reset`:   Reset the sandbox to a fresh state
 * POST with action `destroy`:  Destroy the sandbox
 * GET:                         Return sandbox status and test credentials
 */

import type { NextRequest } from "next/server";
import {
  ok,
  err,
  rateLimit,
  parseBody,
  withTiming,
} from "../_shared";
import {
  createSandbox,
  getSandbox,
  getSandboxById,
  resetSandbox,
  destroySandbox,
  isSandboxKey,
  sandboxStats,
} from "@/lib/sandbox";

// ── Serialization ─────────────────────────────────────────────────────────

function serializeSandbox(sandbox: ReturnType<typeof getSandbox>) {
  if (!sandbox) return null;
  return {
    id: sandbox.id,
    apiKey: sandbox.apiKey,
    createdAt: sandbox.createdAt.toISOString(),
    expiresAt: sandbox.expiresAt.toISOString(),
    testData: sandbox.testData,
  };
}

// ── GET ────────────────────────────────────────────────────────────────────

export const GET = withTiming(async (req: NextRequest) => {
  const limited = rateLimit(req, "relaxed");
  if (limited) return limited;

  // Check for sandbox API key in the request
  const apiKey = req.headers.get("x-api-key") ?? req.headers.get("authorization")?.replace("Bearer ", "");

  if (apiKey && isSandboxKey(apiKey)) {
    const sandbox = getSandbox(apiKey);
    if (!sandbox) {
      return err("SANDBOX_NOT_FOUND", "Sandbox not found or expired. Create a new one.", 404);
    }

    return ok({
      sandbox: serializeSandbox(sandbox),
      status: "active",
      remainingMs: sandbox.expiresAt.getTime() - Date.now(),
    });
  }

  // No sandbox key: return general sandbox system stats
  const stats = sandboxStats();
  return ok({
    sandbox: null,
    status: "no_sandbox",
    system: stats,
    hint: "POST with action 'create' to create a sandbox environment. Include the returned API key in subsequent requests via x-api-key header.",
  });
});

// ── POST ───────────────────────────────────────────────────────────────────

export const POST = withTiming(async (req: NextRequest) => {
  // Rate limit -- standard for mutations
  const limited = rateLimit(req, "standard");
  if (limited) return limited;

  const body = await parseBody<{
    action?: string;
    sandboxId?: string;
  }>(req);
  if (body instanceof Response) return body;

  const action = body.action;

  if (!action || !["create", "reset", "destroy"].includes(action)) {
    return err(
      "INVALID_ACTION",
      "action must be one of: create, reset, destroy",
      400
    );
  }

  // ── CREATE ─────────────────────────────────────────────────────────────
  if (action === "create") {
    try {
      const sandbox = createSandbox();
      return ok(
        {
          sandbox: serializeSandbox(sandbox),
          message: "Sandbox created. Use the apiKey in the x-api-key header for all sandbox requests.",
          credentials: {
            apiKey: sandbox.apiKey,
            testBusinesses: sandbox.testData.businesses,
            testCampaigns: sandbox.testData.campaigns,
            testInfluencers: sandbox.testData.influencers,
          },
        },
        201
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create sandbox";
      return err("SANDBOX_CREATE_FAILED", message, 429);
    }
  }

  // ── RESET / DESTROY require sandbox identification ─────────────────────

  // Identify the sandbox from the API key header or sandboxId in the body
  const apiKey = req.headers.get("x-api-key") ?? req.headers.get("authorization")?.replace("Bearer ", "");
  let sandboxId = body.sandboxId;

  if (!sandboxId && apiKey && isSandboxKey(apiKey)) {
    const sandbox = getSandbox(apiKey);
    if (sandbox) {
      sandboxId = sandbox.id;
    }
  }

  if (!sandboxId) {
    return err(
      "SANDBOX_REQUIRED",
      "Provide sandboxId in the body or include a sandbox API key in the x-api-key header",
      400
    );
  }

  // Verify the sandbox exists
  const existing = getSandboxById(sandboxId);
  if (!existing) {
    return err("SANDBOX_NOT_FOUND", `Sandbox '${sandboxId}' not found or expired`, 404);
  }

  // ── RESET ──────────────────────────────────────────────────────────────
  if (action === "reset") {
    try {
      resetSandbox(sandboxId);
      const refreshed = getSandboxById(sandboxId);
      return ok({
        sandbox: serializeSandbox(refreshed),
        message: "Sandbox reset to fresh state. API key unchanged.",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to reset sandbox";
      return err("SANDBOX_RESET_FAILED", message, 500);
    }
  }

  // ── DESTROY ────────────────────────────────────────────────────────────
  if (action === "destroy") {
    try {
      destroySandbox(sandboxId);
      return ok({
        sandboxId,
        message: "Sandbox destroyed. API key is no longer valid.",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to destroy sandbox";
      return err("SANDBOX_DESTROY_FAILED", message, 500);
    }
  }

  return err("INVALID_ACTION", "Unrecognized action", 400);
});
