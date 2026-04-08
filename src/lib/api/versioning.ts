/**
 * API Version Management
 *
 * Detects requested API version from URL path, header, query param, or default.
 * Adds deprecation/sunset headers. Transforms requests/responses between versions.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  campaignTransformers,
  submissionTransformers,
  userTransformers,
  responseEnvelopeTransformers,
} from "./v2-transforms";

// ─── Types ──────────────────────────────────────────────────────────────────

export type APIVersion = "v1" | "v2";

export interface VersionConfig {
  version: APIVersion;
  status: "current" | "deprecated" | "sunset";
  sunsetDate?: string; // ISO date when version will be removed
  deprecationMessage?: string;
}

export interface VersionTransformer {
  /** Transform v1 request body to v2 format */
  requestUp?: (body: Record<string, unknown>) => Record<string, unknown>;
  /** Transform v2 response to v1 format */
  responseDown?: (body: Record<string, unknown>) => Record<string, unknown>;
}

// ─── Version Configs ────────────────────────────────────────────────────────

const VERSION_CONFIGS: Record<APIVersion, VersionConfig> = {
  v1: {
    version: "v1",
    status: "deprecated",
    sunsetDate: "2026-12-31T23:59:59Z",
    deprecationMessage:
      "API v1 is deprecated and will be removed on 2026-12-31. Please migrate to v2. See /api/v2/migration for details.",
  },
  v2: {
    version: "v2",
    status: "current",
  },
};

// ─── Transformer Registry ───────────────────────────────────────────────────

// Maps endpoint pattern to versioned transformers
const TRANSFORMERS: Record<string, VersionTransformer> = {
  campaigns: campaignTransformers,
  submissions: submissionTransformers,
  auth: userTransformers,
};

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Detect the requested API version from a NextRequest.
 *
 * Resolution order:
 *  1. URL path: `/api/v2/campaigns` -> v2
 *  2. Header: `X-API-Version: v2`
 *  3. Query param: `?api_version=v2`
 *  4. Default: v1
 */
export function detectVersion(req: NextRequest): APIVersion {
  // 1. URL path
  const url = new URL(req.url);
  const pathMatch = url.pathname.match(/\/api\/(v[12])\//);
  if (pathMatch) {
    const matched = pathMatch[1] as string;
    if (matched === "v1" || matched === "v2") return matched;
  }

  // 2. X-API-Version header
  const headerVersion = req.headers.get("x-api-version");
  if (headerVersion === "v1" || headerVersion === "v2") return headerVersion;

  // 3. Query param
  const queryVersion = url.searchParams.get("api_version");
  if (queryVersion === "v1" || queryVersion === "v2") return queryVersion;

  // 4. Default
  return "v1";
}

/**
 * Get the configuration for a given API version.
 */
export function getVersionConfig(version: APIVersion): VersionConfig {
  return VERSION_CONFIGS[version];
}

/**
 * Add versioning and deprecation headers to a response.
 *
 * Headers added:
 *  - `X-API-Version` — the resolved version
 *  - `Deprecation: true` — if the version is deprecated
 *  - `Sunset: <date>` — if a sunset date is configured
 *  - `Link` — successor-version hint for deprecated versions
 */
export function addVersionHeaders(
  res: NextResponse,
  version: APIVersion,
  endpoint?: string
): NextResponse {
  const config = VERSION_CONFIGS[version];

  res.headers.set("X-API-Version", version);

  if (config.status === "deprecated" || config.status === "sunset") {
    res.headers.set("Deprecation", "true");

    if (config.deprecationMessage) {
      res.headers.set("X-Deprecation-Notice", config.deprecationMessage);
    }

    if (config.sunsetDate) {
      // RFC 7231 date format for Sunset header
      res.headers.set("Sunset", new Date(config.sunsetDate).toUTCString());
    }

    // Link to successor version
    if (endpoint) {
      const successorPath = `/api/v2/${endpoint.replace(/^\//, "")}`;
      res.headers.set(
        "Link",
        `<${successorPath}>; rel="successor-version"`
      );
    }
  }

  return res;
}

/**
 * Transform a request body from one API version to another.
 *
 * @param body - The request body to transform
 * @param from - Source version
 * @param to - Target version
 * @param endpoint - Endpoint name (e.g. "campaigns", "submissions")
 */
export function transformRequest(
  body: Record<string, unknown>,
  from: APIVersion,
  to: APIVersion,
  endpoint: string
): Record<string, unknown> {
  if (from === to) return body;

  const normalizedEndpoint = normalizeEndpoint(endpoint);
  const transformer = TRANSFORMERS[normalizedEndpoint];
  if (!transformer) return body;

  if (from === "v2" && to === "v1" && transformer.responseDown) {
    // v2 request -> v1 format: use responseDown (structural reversal)
    return transformer.responseDown(body);
  }

  if (from === "v1" && to === "v2" && transformer.requestUp) {
    return transformer.requestUp(body);
  }

  return body;
}

/**
 * Transform a response body from one API version to another.
 *
 * @param body - The response body to transform
 * @param from - Source version (the version the response was generated in)
 * @param to - Target version (the version the client expects)
 * @param endpoint - Endpoint name (e.g. "campaigns", "submissions")
 */
export function transformResponse(
  body: Record<string, unknown>,
  from: APIVersion,
  to: APIVersion,
  endpoint: string
): Record<string, unknown> {
  if (from === to) return body;

  const normalizedEndpoint = normalizeEndpoint(endpoint);
  const transformer = TRANSFORMERS[normalizedEndpoint];

  if (from === "v1" && to === "v2") {
    // Upgrade v1 response to v2 format.
    // v1 responses have shape: { success, data: { ... } }
    // We need to transform the inner data BEFORE wrapping in v2 envelope.
    let result = { ...body };

    if (transformer?.requestUp && typeof result.data === "object" && result.data !== null) {
      // Transform the inner data object (field renames etc.)
      result.data = transformer.requestUp(result.data as Record<string, unknown>);
    }

    // Wrap in v2 envelope: { data, meta }
    result = responseEnvelopeTransformers.requestUp!(result);
    return result;
  }

  if (from === "v2" && to === "v1") {
    // Downgrade v2 response to v1 format.
    // v2 responses have shape: { data: { ... }, meta: { ... } }
    // First unwrap v2 envelope, then transform the inner data.
    let result = responseEnvelopeTransformers.responseDown!(body);

    if (transformer?.responseDown && typeof result.data === "object" && result.data !== null) {
      result = { ...result, data: transformer.responseDown(result.data as Record<string, unknown>) };
    }

    return result;
  }

  return body;
}

/**
 * Check if a version string is a valid APIVersion.
 */
export function isValidVersion(version: string): version is APIVersion {
  return version === "v1" || version === "v2";
}

// ─── Internal Helpers ───────────────────────────────────────────────────────

function normalizeEndpoint(endpoint: string): string {
  // Strip leading slashes and api/vN prefix
  return endpoint
    .replace(/^\/?(api\/)?(v[12]\/)?/, "")
    .split("/")[0]
    .toLowerCase();
}
