/**
 * GET /api/v1/sdk/python — Download the generated Python SDK
 *
 * Returns a fully typed Python client as a downloadable .py file.
 * Public endpoint, cached for 1 hour.
 */

import { generatePythonSDK } from "@/lib/api/sdk-python";

export function GET() {
  const sdk = generatePythonSDK();

  return new Response(sdk, {
    headers: {
      "Content-Type": "text/x-python; charset=utf-8",
      "Content-Disposition": 'attachment; filename="social_perks.py"',
      "Cache-Control": "public, max-age=3600",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
