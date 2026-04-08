/**
 * GET /api/v2/migration — Migration guide from v1 to v2
 *
 * Returns a JSON document listing all breaking changes, field renames,
 * envelope changes, and migration examples.
 */

import { NextResponse } from "next/server";
import { addVersionHeaders } from "@/lib/api/versioning";

export async function GET() {
  const guide = {
    title: "Social Perks API Migration Guide: v1 -> v2",
    overview:
      "API v2 introduces structured nested objects for rewards, proofs, and business references, plus a new response envelope with metadata. v1 is deprecated and will be sunset on 2026-12-31.",
    timeline: {
      v2Released: "2026-04-01",
      v1Deprecated: "2026-04-01",
      v1Sunset: "2026-12-31",
      recommendation:
        "Migrate to v2 before 2026-09-01 to allow a 3-month buffer before v1 sunset.",
    },
    versionDetection: {
      description: "v2 can be requested via URL path, header, or query param.",
      methods: [
        { method: "URL path", example: "GET /api/v2/campaigns" },
        { method: "Header", example: "X-API-Version: v2" },
        { method: "Query param", example: "GET /api/v1/campaigns?api_version=v2" },
      ],
    },
    responseEnvelope: {
      description: "The response envelope changes from v1 to v2.",
      v1: {
        format: "{ success: boolean, data: T, error?: { code, message } }",
        example: {
          success: true,
          data: { campaigns: [], total: 0 },
        },
      },
      v2: {
        format: "{ data: T, meta: { version, requestId, timing } }",
        example: {
          data: { campaigns: [], total: 0 },
          meta: { version: "v2", requestId: "req_abc123", timing: null },
        },
      },
    },
    changes: [
      {
        endpoint: "/campaigns",
        category: "field-rename",
        description: "Campaign reward fields restructured into nested object",
        before: {
          discountValue: 15,
          discountType: "pct",
        },
        after: {
          reward: {
            value: 15,
            type: "pct",
            description: "15% off",
          },
        },
        migration:
          "Replace `discountValue` with `reward.value` and `discountType` with `reward.type`. The `reward.description` field is auto-generated if not provided.",
      },
      {
        endpoint: "/submissions",
        category: "field-rename",
        description: "Submission proof fields restructured into nested object",
        before: {
          proofUrl: "https://instagram.com/p/abc123",
          proofType: "url",
        },
        after: {
          proof: {
            url: "https://instagram.com/p/abc123",
            type: "url",
          },
        },
        migration:
          "Replace `proofUrl` with `proof.url` and `proofType` with `proof.type`.",
      },
      {
        endpoint: "/auth",
        category: "field-rename",
        description: "Business reference restructured into nested object",
        before: {
          user: {
            id: "usr_abc",
            email: "owner@shop.com",
            role: "business",
            businessId: "biz_xyz",
          },
        },
        after: {
          user: {
            id: "usr_abc",
            email: "owner@shop.com",
            role: "business",
            business: {
              id: "biz_xyz",
              name: null,
            },
          },
        },
        migration:
          "Replace `user.businessId` with `user.business.id`. The `user.business.name` field will be populated when available.",
      },
    ],
    deprecationHeaders: {
      description:
        "All v1 responses include deprecation headers to aid migration.",
      headers: [
        { header: "Deprecation", value: "true", description: "Indicates the version is deprecated" },
        { header: "Sunset", value: "Sat, 31 Dec 2026 23:59:59 GMT", description: "RFC 7231 date when v1 will be removed" },
        {
          header: "Link",
          value: '</api/v2/campaigns>; rel="successor-version"',
          description: "Points to the v2 equivalent endpoint",
        },
        {
          header: "X-Deprecation-Notice",
          value: "API v1 is deprecated...",
          description: "Human-readable deprecation message",
        },
      ],
    },
    sdkSupport: {
      description:
        "If using the Social Perks SDK, upgrade to v2.x for automatic v2 support. SDK v1.x will continue to work until the v1 sunset date.",
    },
  };

  const res = NextResponse.json(guide, { status: 200 });
  return addVersionHeaders(res, "v2", "migration");
}
