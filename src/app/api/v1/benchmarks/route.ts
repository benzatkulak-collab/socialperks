import { NextRequest } from "next/server";
import { getBenchmarks } from "@/lib/ai-engine";
import { apiResponse, apiError } from "@/lib/api/middleware";
import { logger } from "@/lib/logging";

/**
 * GET /api/v1/benchmarks
 *
 * Industry performance benchmarks.
 * AI agents use this to set campaign expectations.
 */
export async function GET(request: NextRequest) {
  const startTime = performance.now();
  logger.info("GET /api/v1/benchmarks", { method: "GET", path: "/api/v1/benchmarks" });

  const { searchParams } = new URL(request.url);
  const businessType = searchParams.get("businessType");

  if (!businessType) {
    return apiError("MISSING_PARAM", "businessType query parameter is required");
  }

  try {
    const benchmarks = getBenchmarks(businessType);

    return apiResponse(
      { benchmarks, meta: { generatedAt: new Date().toISOString() } },
      200,
      { "Cache-Control": "public, max-age=1800" }
    );
  } catch (err) {
    logger.error("Benchmark generation failed", err);
    return apiError("BENCHMARK_ERROR", "Failed to generate benchmarks", 500);
  }
}
