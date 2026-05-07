/**
 * GET  /api/v1/experiments — List experiments (optionally filtered by status)
 * POST /api/v1/experiments — Create experiment or perform actions (assign, convert, results)
 */

import type { NextRequest } from "next/server";
import {
  ok,
  err,
  getUser,
  rateLimit,
  parseBody,
  getQuery,
  withTiming,
} from "../_shared";
import { validateString, validateEnum } from "@/lib/security/validate";
import {
  createExperiment,
  startExperiment,
  assignVariant,
  recordConversion,
  getExperimentResults,
  autoSelectWinner,
  listExperiments,
  type ExperimentStatus,
  type CreateExperimentConfig,
} from "@/lib/experiments";

// ─── GET ────────────────────────────────────────────────────────────────────

export const GET = withTiming(async (req: NextRequest) => {
  const limited = rateLimit(req, "relaxed");
  if (limited) return limited;

  const params = getQuery(req);
  const statusParam = params.get("status");

  let status: ExperimentStatus | undefined;
  if (statusParam) {
    const sv = validateEnum(
      statusParam,
      "status",
      ["draft", "running", "paused", "completed"] as const
    );
    if (!sv.success) return err("INVALID_STATUS", sv.error, 400);
    status = sv.data;
  }

  const experiments = listExperiments(status);
  return ok({ experiments, total: experiments.length });
});

// ─── POST ───────────────────────────────────────────────────────────────────
//
// SECURITY: this endpoint multiplexes both client-driven actions
// (`assign`, `convert` — fired by the in-page experiment runner with
// no logged-in user) and admin operations (`create`, `start`,
// `results`, `auto-winner`). Until this PR landed there was zero
// auth on the route, which let any caller create experiments,
// inspect business intel via `results`, and force-pick winners.
//
// New gating:
//   - `assign` / `convert`: NO auth required. These run from the
//     public experiment runner. Strict-tier rate limit (5/min/IP)
//     prevents ballot-stuffing the assignment distribution.
//   - everything else (`create`, `start`, `results`, `auto-winner`):
//     authenticated business or admin role. Standard rate limit.

export const POST = withTiming(async (req: NextRequest) => {
  const body = await parseBody<{
    action?: string;
    // create
    name?: string;
    description?: string;
    variants?: { name: string; weight: number }[];
    targetAudience?: CreateExperimentConfig["targetAudience"];
    // assign / convert / results
    experimentId?: string;
    userId?: string;
    // autoSelectWinner
    minSampleSize?: number;
    minConfidence?: number;
  }>(req);
  if (body instanceof Response) return body;

  const actionV = validateEnum(
    body.action,
    "action",
    ["create", "start", "assign", "convert", "results", "auto-winner"] as const
  );
  if (!actionV.success) return err("INVALID_ACTION", actionV.error, 400);

  const isPublicAction = actionV.data === "assign" || actionV.data === "convert";

  if (isPublicAction) {
    // Strict tier defends the assignment distribution against stuffing.
    const limited = rateLimit(req, "strict");
    if (limited) return limited;
  } else {
    // Auth required for create / start / results / auto-winner. Each of
    // these either mutates global experiment state or surfaces business
    // intel that must not be public.
    const user = getUser(req);
    if (!user) {
      return err(
        "NO_TOKEN",
        "Authentication required for experiment management actions",
        401
      );
    }
    if (user.role !== "admin" && user.role !== "business" && user.role !== "enterprise") {
      return err(
        "FORBIDDEN",
        "Only admin / business / enterprise roles can manage experiments",
        403
      );
    }
    const limited = rateLimit(req, "standard");
    if (limited) return limited;
  }

  switch (actionV.data) {
    // ── Create ──────────────────────────────────────────────────────────
    case "create": {
      const nv = validateString(body.name, "name", { min: 1, max: 200 });
      if (!nv.success) return err("INVALID_NAME", nv.error, 400);

      if (!Array.isArray(body.variants) || body.variants.length < 2) {
        return err(
          "INVALID_VARIANTS",
          "At least 2 variants are required",
          400
        );
      }

      for (const v of body.variants) {
        if (typeof v.name !== "string" || v.name.length === 0) {
          return err("INVALID_VARIANT_NAME", "Each variant must have a name", 400);
        }
        if (typeof v.weight !== "number" || v.weight < 0 || v.weight > 100) {
          return err("INVALID_VARIANT_WEIGHT", "Variant weight must be 0-100", 400);
        }
      }

      const weightSum = body.variants.reduce((s, v) => s + v.weight, 0);
      if (weightSum !== 100) {
        return err(
          "INVALID_WEIGHT_SUM",
          `Variant weights must sum to 100, got ${weightSum}`,
          400
        );
      }

      try {
        const experiment = createExperiment({
          name: nv.data,
          description: body.description,
          variants: body.variants,
          targetAudience: body.targetAudience,
        });
        return ok({ experiment }, 201);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to create experiment";
        return err("CREATE_FAILED", message, 400);
      }
    }

    // ── Start ───────────────────────────────────────────────────────────
    case "start": {
      const ev = validateString(body.experimentId, "experimentId", { min: 1 });
      if (!ev.success) return err("INVALID_EXPERIMENT_ID", ev.error, 400);

      try {
        const experiment = startExperiment(ev.data);
        return ok({ experiment });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to start experiment";
        return err("START_FAILED", message, 400);
      }
    }

    // ── Assign ──────────────────────────────────────────────────────────
    case "assign": {
      const ev = validateString(body.experimentId, "experimentId", { min: 1 });
      if (!ev.success) return err("INVALID_EXPERIMENT_ID", ev.error, 400);

      const uv = validateString(body.userId, "userId", { min: 1 });
      if (!uv.success) return err("INVALID_USER_ID", uv.error, 400);

      try {
        const assignment = assignVariant(ev.data, uv.data);
        return ok({ assignment });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to assign variant";
        return err("ASSIGN_FAILED", message, 400);
      }
    }

    // ── Convert ─────────────────────────────────────────────────────────
    case "convert": {
      const ev = validateString(body.experimentId, "experimentId", { min: 1 });
      if (!ev.success) return err("INVALID_EXPERIMENT_ID", ev.error, 400);

      const uv = validateString(body.userId, "userId", { min: 1 });
      if (!uv.success) return err("INVALID_USER_ID", uv.error, 400);

      try {
        const assignment = recordConversion(ev.data, uv.data);
        return ok({ assignment });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to record conversion";
        return err("CONVERT_FAILED", message, 400);
      }
    }

    // ── Results ─────────────────────────────────────────────────────────
    case "results": {
      const ev = validateString(body.experimentId, "experimentId", { min: 1 });
      if (!ev.success) return err("INVALID_EXPERIMENT_ID", ev.error, 400);

      try {
        const results = getExperimentResults(ev.data);
        return ok({ results });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to get results";
        return err("RESULTS_FAILED", message, 400);
      }
    }

    // ── Auto-Winner ─────────────────────────────────────────────────────
    case "auto-winner": {
      const ev = validateString(body.experimentId, "experimentId", { min: 1 });
      if (!ev.success) return err("INVALID_EXPERIMENT_ID", ev.error, 400);

      try {
        const experiment = autoSelectWinner(
          ev.data,
          body.minSampleSize,
          body.minConfidence
        );
        return ok({ experiment });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to auto-select winner";
        return err("AUTO_WINNER_FAILED", message, 400);
      }
    }
  }
});
