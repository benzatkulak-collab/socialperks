/**
 * GET  /api/v2/auth — Validate session (v2 format)
 * POST /api/v2/auth — Auth actions: login, signup, logout, etc. (v2 format)
 *
 * Thin wrapper: transforms v2 requests to v1 internally,
 * delegates to existing auth logic, transforms response back to v2.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  GET as v1GET,
  POST as v1POST,
} from "../../v1/auth/route";
import { addVersionHeaders, transformRequest, transformResponse } from "@/lib/api/versioning";

const ENDPOINT = "auth";

// ─── Helpers ────────────────────────────────────────────────────────────────

async function wrapV2Response(
  v1Response: NextResponse
): Promise<NextResponse> {
  const v1Body = await v1Response.json();
  const v2Body = transformResponse(v1Body, "v1", "v2", ENDPOINT);

  const res = NextResponse.json(v2Body, { status: v1Response.status });

  // Copy over headers from v1 response (cookies, rate limit headers, etc.)
  v1Response.headers.forEach((value, key) => {
    if (key.toLowerCase() !== "content-type") {
      res.headers.set(key, value);
    }
  });

  return addVersionHeaders(res, "v2", ENDPOINT);
}

async function transformV2Request(req: NextRequest): Promise<NextRequest> {
  if (req.method === "GET" || req.method === "HEAD") {
    return req;
  }

  try {
    const body = await req.json();
    const v1Body = transformRequest(body, "v2", "v1", ENDPOINT);
    return new NextRequest(req.url, {
      method: req.method,
      headers: req.headers,
      body: JSON.stringify(v1Body),
    });
  } catch {
    return req;
  }
}

// ─── GET ────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const v1Response = await v1GET(req);
  return wrapV2Response(v1Response);
}

// ─── POST ───────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const transformedReq = await transformV2Request(req);
  const v1Response = await v1POST(transformedReq);
  return wrapV2Response(v1Response);
}
