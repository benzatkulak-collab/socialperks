/**
 * v1 -> v2 API Transformers
 *
 * Defines field renames and structural changes between API v1 and v2.
 *
 * v2 changes:
 * - Campaigns: `discountValue` -> `reward.value`, `discountType` -> `reward.type`, add `reward.description`
 * - Submissions: `proofUrl` -> `proof.url`, `proofType` -> `proof.type`
 * - Users: `businessId` -> `business.id`, add `business.name`
 * - Response envelope: v2 uses `{ data, meta: { version, requestId, timing } }`
 *   instead of `{ success, data }`
 */

import type { VersionTransformer } from "./versioning";

// ─── Campaign Transformers ──────────────────────────────────────────────────

export const campaignTransformers: VersionTransformer = {
  /**
   * Transform v1 campaign data UP to v2 format.
   * - `discountValue` -> `reward.value`
   * - `discountType` -> `reward.type`
   * - Adds `reward.description` (derived or default)
   */
  requestUp(body: Record<string, unknown>): Record<string, unknown> {
    const result = { ...body };

    // Transform campaign object if nested
    const campaign =
      typeof result.campaign === "object" && result.campaign !== null
        ? { ...(result.campaign as Record<string, unknown>) }
        : null;

    const target = campaign ?? result;

    if ("discountValue" in target || "discountType" in target) {
      const reward: Record<string, unknown> = {
        ...(typeof target.reward === "object" && target.reward !== null
          ? (target.reward as Record<string, unknown>)
          : {}),
      };

      if ("discountValue" in target) {
        reward.value = target.discountValue;
        delete target.discountValue;
      }
      if ("discountType" in target) {
        reward.type = target.discountType;
        delete target.discountType;
      }
      if (!reward.description) {
        reward.description = buildRewardDescription(
          reward.value as number | undefined,
          reward.type as string | undefined
        );
      }

      target.reward = reward;
    }

    if (campaign) {
      result.campaign = campaign;
    }

    return result;
  },

  /**
   * Transform v2 campaign data DOWN to v1 format.
   * - `reward.value` -> `discountValue`
   * - `reward.type` -> `discountType`
   * - Drops `reward.description`
   */
  responseDown(body: Record<string, unknown>): Record<string, unknown> {
    const result = { ...body };

    const campaign =
      typeof result.campaign === "object" && result.campaign !== null
        ? { ...(result.campaign as Record<string, unknown>) }
        : null;

    const target = campaign ?? result;

    if (typeof target.reward === "object" && target.reward !== null) {
      const reward = target.reward as Record<string, unknown>;
      if ("value" in reward) target.discountValue = reward.value;
      if ("type" in reward) target.discountType = reward.type;
      delete target.reward;
    }

    if (campaign) {
      result.campaign = campaign;
    }

    return result;
  },
};

// ─── Submission Transformers ────────────────────────────────────────────────

export const submissionTransformers: VersionTransformer = {
  /**
   * Transform v1 submission data UP to v2 format.
   * - `proofUrl` -> `proof.url`
   * - `proofType` -> `proof.type`
   */
  requestUp(body: Record<string, unknown>): Record<string, unknown> {
    const result = { ...body };

    const submission =
      typeof result.submission === "object" && result.submission !== null
        ? { ...(result.submission as Record<string, unknown>) }
        : null;

    const target = submission ?? result;

    if ("proofUrl" in target || "proofType" in target) {
      const proof: Record<string, unknown> = {
        ...(typeof target.proof === "object" && target.proof !== null
          ? (target.proof as Record<string, unknown>)
          : {}),
      };

      if ("proofUrl" in target) {
        proof.url = target.proofUrl;
        delete target.proofUrl;
      }
      if ("proofType" in target) {
        proof.type = target.proofType;
        delete target.proofType;
      }

      target.proof = proof;
    }

    if (submission) {
      result.submission = submission;
    }

    return result;
  },

  /**
   * Transform v2 submission data DOWN to v1 format.
   * - `proof.url` -> `proofUrl`
   * - `proof.type` -> `proofType`
   */
  responseDown(body: Record<string, unknown>): Record<string, unknown> {
    const result = { ...body };

    const submission =
      typeof result.submission === "object" && result.submission !== null
        ? { ...(result.submission as Record<string, unknown>) }
        : null;

    const target = submission ?? result;

    if (typeof target.proof === "object" && target.proof !== null) {
      const proof = target.proof as Record<string, unknown>;
      if ("url" in proof) target.proofUrl = proof.url;
      if ("type" in proof) target.proofType = proof.type;
      delete target.proof;
    }

    if (submission) {
      result.submission = submission;
    }

    return result;
  },
};

// ─── User / Auth Transformers ───────────────────────────────────────────────

export const userTransformers: VersionTransformer = {
  /**
   * Transform v1 user/auth data UP to v2 format.
   * - `businessId` -> `business.id`
   * - Adds `business.name` (placeholder if unavailable)
   */
  requestUp(body: Record<string, unknown>): Record<string, unknown> {
    const result = { ...body };

    const user =
      typeof result.user === "object" && result.user !== null
        ? { ...(result.user as Record<string, unknown>) }
        : null;

    const target = user ?? result;

    if ("businessId" in target && target.businessId != null) {
      const business: Record<string, unknown> = {
        ...(typeof target.business === "object" && target.business !== null
          ? (target.business as Record<string, unknown>)
          : {}),
      };

      business.id = target.businessId;
      if (!business.name) {
        business.name = (target as Record<string, unknown>).businessName ?? null;
      }
      delete target.businessId;
      delete target.businessName;
      target.business = business;
    }

    if (user) {
      result.user = user;
    }

    return result;
  },

  /**
   * Transform v2 user/auth data DOWN to v1 format.
   * - `business.id` -> `businessId`
   * - Drops `business.name`
   */
  responseDown(body: Record<string, unknown>): Record<string, unknown> {
    const result = { ...body };

    const user =
      typeof result.user === "object" && result.user !== null
        ? { ...(result.user as Record<string, unknown>) }
        : null;

    const target = user ?? result;

    if (typeof target.business === "object" && target.business !== null) {
      const business = target.business as Record<string, unknown>;
      if ("id" in business) target.businessId = business.id;
      delete target.business;
    }

    if (user) {
      result.user = user;
    }

    return result;
  },
};

// ─── Response Envelope Transformers ─────────────────────────────────────────

/**
 * v1 envelope: `{ success: true, data: {...} }`
 * v2 envelope: `{ data: {...}, meta: { version: "v2", requestId, timing } }`
 */
export const responseEnvelopeTransformers: VersionTransformer = {
  /** v1 envelope -> v2 envelope */
  requestUp(body: Record<string, unknown>): Record<string, unknown> {
    // If the body has the v1 `success` / `data` shape, convert it
    if ("success" in body && "data" in body) {
      return {
        data: body.data,
        meta: {
          version: "v2",
          requestId: (body as Record<string, unknown>).requestId ?? null,
          timing: (body as Record<string, unknown>).timing ?? null,
        },
      };
    }

    // Already v2 shape or raw data — wrap it
    return {
      data: body,
      meta: {
        version: "v2",
        requestId: null,
        timing: null,
      },
    };
  },

  /** v2 envelope -> v1 envelope */
  responseDown(body: Record<string, unknown>): Record<string, unknown> {
    if ("data" in body && "meta" in body) {
      return {
        success: true,
        data: body.data,
      };
    }
    return { success: true, data: body };
  },
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function buildRewardDescription(
  value: number | undefined,
  type: string | undefined
): string {
  if (value == null || type == null) return "";
  if (type === "pct") return `${value}% off`;
  if (type === "dol") return `$${value} off`;
  return `${value} ${type}`;
}
