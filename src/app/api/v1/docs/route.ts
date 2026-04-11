/**
 * GET /api/v1/docs — OpenAPI 3.1 JSON specification
 *
 * Returns the full API spec. CORS-enabled so external tools
 * (Swagger UI, Postman, etc.) can load it directly.
 */

import { openAPISpec } from "@/lib/api/openapi";

export function GET() {
  return Response.json(openAPISpec, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
