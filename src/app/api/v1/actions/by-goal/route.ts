/**
 * GET /api/v1/actions/by-goal?goal=<id>
 *
 * Returns a ranked list of actions that serve a shop-owner goal,
 * along with the goal's suggested perk shape. Designed for AI
 * agents to call when a user expresses an outcome rather than a
 * mechanical action ("get more new customers" → maps to the
 * `new_customers` goal → ranked list of high-reach IG/TikTok
 * content actions).
 *
 * Public, no-auth, ETag-cacheable. Same as /api/v1/actions/full —
 * the underlying data is content baked into the bundle.
 *
 * Without `?goal=`, returns the list of all goals (label +
 * description + suggested perk) so an agent can browse what's
 * available before picking one.
 */

import type { NextRequest } from "next/server";
import { listGoals, findGoal, getActionsForGoal } from "@/lib/actions/intents";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<Response> {
  const url = new URL(req.url);
  const goalId = url.searchParams.get("goal");
  const limitParam = url.searchParams.get("limit");
  const limit = limitParam ? Math.max(1, Math.min(50, parseInt(limitParam, 10) || 10)) : 10;

  if (!goalId) {
    return Response.json(
      {
        v: 1,
        goals: listGoals().map((g) => ({
          id: g.id,
          label: g.label,
          description: g.description,
          suggestedPerk: g.suggestedPerk,
        })),
      },
      {
        headers: {
          "Cache-Control": "public, max-age=300, s-maxage=86400",
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  }

  const goal = findGoal(goalId);
  if (!goal) {
    return Response.json(
      {
        error: "unknown_goal",
        message: `Unknown goal: ${goalId}`,
        availableGoals: listGoals().map((g) => g.id),
      },
      { status: 404 },
    );
  }

  const actions = getActionsForGoal(goalId, { limit });
  return Response.json(
    {
      v: 1,
      goal: {
        id: goal.id,
        label: goal.label,
        description: goal.description,
        suggestedPerk: goal.suggestedPerk,
      },
      actions,
      total: actions.length,
    },
    {
      headers: {
        "Cache-Control": "public, max-age=300, s-maxage=86400",
        "Access-Control-Allow-Origin": "*",
      },
    },
  );
}
