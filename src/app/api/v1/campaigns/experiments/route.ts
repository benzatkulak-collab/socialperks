/**
 * Campaign A/B Testing API.
 * Create experiments, record conversions, view results.
 */
import type { NextRequest } from "next/server";
import { ok, err, requireAuth, parseBody } from "@/app/api/v1/_shared";
import {
  createCampaignExperiment,
  getExperimentResults,
  concludeExperiment,
  listExperiments,
  isStatisticallySignificant,
  recordConversion,
  type CampaignVariant,
} from "@/lib/experiments/campaign-experiments";

export async function GET(req: NextRequest) {
  const user = requireAuth(req);
  if (user instanceof Response) return user;

  const campaignId = new URL(req.url).searchParams.get("campaignId");
  const experimentId = new URL(req.url).searchParams.get("experimentId");

  if (experimentId) {
    const experiment = getExperimentResults(experimentId);
    if (!experiment) return err("NOT_FOUND", "Experiment not found", 404);
    return ok({ ...experiment, isSignificant: isStatisticallySignificant(experiment) });
  }

  return ok(listExperiments(campaignId || undefined));
}

export async function POST(req: NextRequest) {
  const user = requireAuth(req);
  if (user instanceof Response) return user;

  const body = await parseBody<{
    action: string;
    campaignId?: string;
    name?: string;
    variants?: CampaignVariant[];
    experimentId?: string;
    value?: number;
  }>(req);
  if (body instanceof Response) return body;

  switch (body.action) {
    case "create": {
      if (!body.campaignId || !body.name || !body.variants) {
        return err("MISSING_FIELDS", "campaignId, name, and variants are required", 400);
      }
      try {
        const experiment = createCampaignExperiment(body.campaignId, body.name, body.variants);
        return ok(experiment, 201);
      } catch (error) {
        return err("INVALID_EXPERIMENT", error instanceof Error ? error.message : "Failed", 400);
      }
    }
    case "convert": {
      if (!body.experimentId) return err("MISSING_ID", "experimentId is required", 400);
      const recorded = recordConversion(body.experimentId, user.id, body.value || 1);
      if (!recorded) return err("CONVERSION_FAILED", "Could not record conversion", 400);
      return ok({ recorded: true });
    }
    case "conclude": {
      if (!body.experimentId) return err("MISSING_ID", "experimentId is required", 400);
      const result = concludeExperiment(body.experimentId);
      if (!result) return err("CONCLUDE_FAILED", "Not found or already concluded", 400);
      return ok({ ...result, isSignificant: isStatisticallySignificant(result) });
    }
    default:
      return err("INVALID_ACTION", "Valid actions: create, convert, conclude", 400);
  }
}
