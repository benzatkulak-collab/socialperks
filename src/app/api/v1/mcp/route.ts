/**
 * GET /api/v1/mcp — Model Context Protocol server definition
 *
 * Returns the MCP-compatible tool definition JSON for LLM agents
 * to discover and use Social Perks API capabilities.
 * Public endpoint, cached for 1 hour.
 */

import mcpDefinition from "@/lib/mcp/server-definition.json";

export function GET() {
  return Response.json(mcpDefinition, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=3600",
      "Content-Type": "application/json",
    },
  });
}
