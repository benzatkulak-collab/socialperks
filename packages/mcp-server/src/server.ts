#!/usr/bin/env node
/**
 * Social Perks MCP server — stdio transport.
 *
 * Run as `socialperks-mcp` after installing @socialperks/mcp-server.
 * Configure your AI agent (Claude Code, Cursor, custom client) to
 * launch this binary with SOCIAL_PERKS_API_KEY in the env. The agent
 * reads JSON-RPC frames over stdin, this process writes responses to
 * stdout. That's the whole MCP stdio contract.
 *
 * The HTTP transport lives at https://socialperks.io/api/mcp (Next.js
 * route) — same handler, different bytes-in/bytes-out shell.
 */

import { handle, type HandlerOptions } from "./handler.js";
import { stdin, stdout, stderr, env, exit } from "node:process";
import { createInterface } from "node:readline";

function getOpts(): HandlerOptions {
  const apiKey = env.SOCIAL_PERKS_API_KEY;
  if (!apiKey) {
    stderr.write("error: SOCIAL_PERKS_API_KEY is not set. Run `npx @socialperks/cli init` first.\n");
    exit(1);
  }
  return {
    apiKey,
    baseUrl: env.SOCIAL_PERKS_BASE_URL,
  };
}

async function run(): Promise<void> {
  const opts = getOpts();
  // MCP framing over stdio is line-delimited JSON. Each line is one
  // JSON-RPC request; we respond with one line per request.
  const rl = createInterface({ input: stdin, crlfDelay: Infinity });
  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let req: unknown;
    try {
      req = JSON.parse(trimmed);
    } catch {
      stdout.write(JSON.stringify({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }) + "\n");
      continue;
    }
    const response = await handle(req as Parameters<typeof handle>[0], opts);
    stdout.write(JSON.stringify(response) + "\n");
  }
}

run().catch((e) => {
  stderr.write(`fatal: ${e instanceof Error ? e.message : String(e)}\n`);
  exit(1);
});
