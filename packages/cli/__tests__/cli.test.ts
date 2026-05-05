import { describe, it, expect, beforeAll } from "vitest";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { readFileSync, existsSync } from "node:fs";

const PKG_DIR = resolve(__dirname, "..");
const CLI = resolve(PKG_DIR, "dist/cli.js");
const VERSION = JSON.parse(readFileSync(resolve(PKG_DIR, "package.json"), "utf8")).version as string;

function run(args: string[], extraEnv: Record<string, string> = {}) {
  // Strip API key from inherited env so tests are deterministic regardless
  // of the developer's shell having SOCIAL_PERKS_API_KEY exported.
  const env: NodeJS.ProcessEnv = { ...process.env, ...extraEnv };
  if (!("SOCIAL_PERKS_API_KEY" in extraEnv)) delete env.SOCIAL_PERKS_API_KEY;
  return spawnSync("node", [CLI, ...args], {
    encoding: "utf8",
    env,
    timeout: 10000,
  });
}

beforeAll(() => {
  if (!existsSync(CLI)) {
    throw new Error(
      `CLI dist missing at ${CLI}. Run \`npm run build\` in packages/cli first.`,
    );
  }
});

describe("@socialperks/cli", () => {
  it("help prints USAGE and exits 0", () => {
    const r = run(["help"]);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("USAGE");
  });

  it("version prints the package version", () => {
    const r = run(["version"]);
    expect(r.status).toBe(0);
    expect(r.stdout.trim()).toBe(VERSION);
  });

  it("unknown command exits non-zero with helpful error", () => {
    const r = run(["frobnicate"]);
    expect(r.status).not.toBe(0);
    expect(r.stderr).toMatch(/unknown command/i);
  });

  it("init without --email in non-interactive mode fails", () => {
    const r = run(["init", "--non-interactive", "--host", "http://127.0.0.1:1"]);
    expect(r.status).not.toBe(0);
    expect(r.stderr).toMatch(/missing --email/i);
  });

  it("whoami without API key fails fast", () => {
    const r = run(["whoami", "--host", "http://127.0.0.1:1"], { SOCIAL_PERKS_API_KEY: "" });
    expect(r.status).not.toBe(0);
    expect(r.stderr).toMatch(/no SOCIAL_PERKS_API_KEY/i);
  });

  it("campaigns list parses --status flag (no network when host unreachable)", () => {
    // With a dummy key + closed-port host, the SDK will fail to reach the
    // host. We only assert the CLI got far enough to reach the network call
    // (i.e. flag parsing succeeded — the error is a network/timeout/auth
    // error, not a parse error).
    const r = run(
      ["campaigns", "list", "--status", "active", "--host", "http://127.0.0.1:1"],
      { SOCIAL_PERKS_API_KEY: "sk_test" },
    );
    expect(r.status).not.toBe(0);
    expect(r.stderr).not.toMatch(/unknown command/i);
    expect(r.stderr).not.toMatch(/no SOCIAL_PERKS_API_KEY/i);
  });
});
