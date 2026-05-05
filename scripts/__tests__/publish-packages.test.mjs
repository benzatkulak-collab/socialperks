/**
 * Smoke test for `scripts/publish-packages.mjs --dry-run`. We do NOT use
 * vitest here because the publish script runs at the node level and
 * already speaks plain stdout/exit-code.
 *
 * Run with: node scripts/__tests__/publish-packages.test.mjs
 *
 * This is invoked indirectly by CI's existing dry-run smoke step; this
 * file is for local "did I break the release pipeline?" verification.
 */

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(__dirname, "..", "..");
const SCRIPT = resolve(REPO, "scripts/publish-packages.mjs");

function readVersion(pkgDir) {
  return JSON.parse(readFileSync(resolve(REPO, pkgDir, "package.json"), "utf8")).version;
}

function run(args) {
  return spawnSync("node", [SCRIPT, ...args], {
    cwd: REPO,
    encoding: "utf8",
    timeout: 120_000,
  });
}

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

test("dry-run prints 'Done' and exits 0", () => {
  // Pin to the SDK's current version so the script's idempotency-on-no-change
  // path matches the on-disk file. Using a lower version would fail the
  // `not valid semver` regex; using the current version is a no-op.
  const current = readVersion("packages/sdk");
  const r = run([
    "--dry-run",
    "--skip-clean",
    "--skip-git",
    `--version=${current}`,
  ]);
  assert.equal(r.status, 0, `expected exit 0 but got ${r.status}\nstderr: ${r.stderr}\nstdout: ${r.stdout}`);
  assert.match(r.stdout, /Done/, "expected 'Done' in stdout");
});

test("version-write step is idempotent (running twice with same version is a no-op on package.json)", () => {
  const sdkBefore = readVersion("packages/sdk");
  const cliBefore = readVersion("packages/cli");
  const mcpBefore = readVersion("packages/mcp-server");

  const r1 = run(["--dry-run", "--skip-clean", "--skip-git", `--version=${sdkBefore}`]);
  assert.equal(r1.status, 0);

  const r2 = run(["--dry-run", "--skip-clean", "--skip-git", `--version=${sdkBefore}`]);
  assert.equal(r2.status, 0);

  assert.equal(readVersion("packages/sdk"), sdkBefore);
  assert.equal(readVersion("packages/cli"), cliBefore);
  assert.equal(readVersion("packages/mcp-server"), mcpBefore);
});

let failed = 0;
for (const t of tests) {
  try {
    t.fn();
    console.log(`  ok ${t.name}`);
  } catch (e) {
    failed++;
    console.error(`  fail ${t.name}\n    ${e.stack ?? e.message ?? e}`);
  }
}

if (failed) {
  console.error(`\n${failed}/${tests.length} test(s) failed`);
  process.exit(1);
}
console.log(`\n${tests.length}/${tests.length} passed`);
