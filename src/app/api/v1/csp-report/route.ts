/**
 * POST /api/v1/csp-report
 *
 * CSP violation report receiver. Browsers POST violation details here
 * when the page violates Content-Security-Policy. Logs server-side so
 * we have visibility when CSP is bypassed (or when legitimate code
 * trips on a tightened policy).
 *
 * Public endpoint — no auth, no rate limit other than abuse guard.
 * Browsers send violations from many client environments; rate-limiting
 * tightly would silence real attack signals.
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

interface CspReport {
  "csp-report"?: {
    "document-uri"?: string;
    referrer?: string;
    "violated-directive"?: string;
    "effective-directive"?: string;
    "original-policy"?: string;
    "blocked-uri"?: string;
    "status-code"?: number;
    "source-file"?: string;
    "line-number"?: number;
    "column-number"?: number;
    "script-sample"?: string;
  };
  // Reporting API v3 format (preferred by newer Chromium)
  age?: number;
  body?: Record<string, unknown>;
  type?: string;
  url?: string;
  user_agent?: string;
}

export async function POST(req: NextRequest): Promise<Response> {
  let report: CspReport | CspReport[] | null = null;
  try {
    report = (await req.json()) as CspReport | CspReport[];
  } catch {
    // Some browsers send empty body for keep-alive pings.
    return new NextResponse(null, { status: 204 });
  }

  // Normalize legacy report-uri format and Reporting API v3 format.
  const reports = Array.isArray(report) ? report : [report];
  for (const r of reports) {
    if (!r) continue;
    const v = r["csp-report"] ?? r.body ?? r;
    // Strip script-sample to avoid logging potentially sensitive HTML.
    const sample =
      typeof (v as Record<string, unknown>)["script-sample"] === "string"
        ? String((v as Record<string, unknown>)["script-sample"]).slice(0, 80)
        : undefined;
    console.warn(
      JSON.stringify({
        level: "warn",
        event: "csp.violation",
        documentUri: (v as Record<string, unknown>)["document-uri"] ?? r.url,
        directive:
          (v as Record<string, unknown>)["violated-directive"] ??
          (v as Record<string, unknown>)["effective-directive"],
        blockedUri: (v as Record<string, unknown>)["blocked-uri"],
        sourceFile: (v as Record<string, unknown>)["source-file"],
        line: (v as Record<string, unknown>)["line-number"],
        col: (v as Record<string, unknown>)["column-number"],
        sample,
        userAgent: req.headers.get("user-agent")?.slice(0, 100),
      })
    );
  }

  return new NextResponse(null, {
    status: 204,
    headers: { "Cache-Control": "no-store" },
  });
}

export const dynamic = "force-dynamic";
