#!/usr/bin/env node
/**
 * scripts/publish-packages.mjs
 *
 * One command to ship @socialperks/{sdk,cli,mcp-server} to npm.
 *
 * What it does, in order:
 *   1. Pre-flight: clean working tree, npm whoami, npm org/scope access.
 *   2. Compute the next version (patch / minor / major / explicit).
 *   3. Write the new version into all three packages, plus update the
 *      cross-dependency: cli + mcp-server depend on a specific sdk
 *      version, so they need to bump in lockstep.
 *   4. Clean each dist/, rebuild all three from source.
 *   5. Smoke tests: SDK constructs, CLI prints help, MCP catalog
 *      returns the expected tools, MCP `initialize` returns the
 *      protocol version. If any fails, abort before publishing.
 *   6. Publish SDK first (cli + mcp depend on it). Wait for npm
 *      registry propagation. Then publish cli + mcp-server in parallel.
 *   7. Commit the version bump, tag (v0.X.Y plus per-package tags),
 *      and push commits + tags.
 *
 * Usage:
 *   node scripts/publish-packages.mjs                    # patch bump
 *   node scripts/publish-packages.mjs --bump=minor       # minor bump
 *   node scripts/publish-packages.mjs --bump=major       # major bump
 *   node scripts/publish-packages.mjs --version=0.2.5    # explicit
 *   node scripts/publish-packages.mjs --tag=next         # dist-tag (default: latest)
 *   node scripts/publish-packages.mjs --dry-run          # do everything except publish + push
 *   node scripts/publish-packages.mjs --skip-clean       # allow dirty working tree
 *   node scripts/publish-packages.mjs --skip-git         # skip commit+tag+push
 *   node scripts/publish-packages.mjs --otp=123456       # passes --otp to npm publish
 *
 * Why a custom script and not changesets / lerna / nx?
 *   - Three packages with lockstep versions don't need a graph tool.
 *   - The dependency chain is one-way (sdk ← {cli, mcp}) — trivial.
 *   - We want zero added deps. The release tool itself shouldn't need
 *     a release.
 */

import { execSync, spawn, spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, rmSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(__dirname, "..");

// ─── Package definitions (order matters: SDK first) ───────────────────────

const PACKAGES = [
  { name: "@socialperks/sdk", dir: "packages/sdk", role: "lib" },
  { name: "@socialperks/cli", dir: "packages/cli", role: "bin" },
  { name: "@socialperks/mcp-server", dir: "packages/mcp-server", role: "bin" },
];

// SDK is the dep root. CLI + MCP both depend on it. We update their
// dependencies field to match the new SDK version on every bump so
// users installing @socialperks/cli@0.2.0 get @socialperks/sdk@0.2.0
// and not the floating 0.1.0 we shipped first.
const SDK_DEPENDENTS = ["@socialperks/cli", "@socialperks/mcp-server"];

// ─── Arg parsing ──────────────────────────────────────────────────────────

const args = process.argv.slice(2);
function flag(name, defaultValue) {
  const eq = args.find((a) => a.startsWith(`--${name}=`));
  if (eq) return eq.slice(name.length + 3);
  return args.includes(`--${name}`) ? true : defaultValue;
}

const bumpKind = String(flag("bump", "patch"));
const explicitVersion = flag("version", null);
const dryRun = !!flag("dry-run", false);
const distTag = String(flag("tag", "latest"));
const skipClean = !!flag("skip-clean", false);
const skipGit = !!flag("skip-git", false);
const otp = flag("otp", null);
const help = !!flag("help", false) || args.includes("-h");

if (help) {
  console.log(readFileSync(fileURLToPath(import.meta.url), "utf8").split("*/")[0]);
  process.exit(0);
}

// ─── Pretty output ────────────────────────────────────────────────────────

const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const RESET = "\x1b[0m";

const log = {
  step: (msg) => console.log(`\n${BOLD}${CYAN}→${RESET} ${BOLD}${msg}${RESET}`),
  ok: (msg) => console.log(`  ${GREEN}✓${RESET} ${msg}`),
  warn: (msg) => console.log(`  ${YELLOW}⚠${RESET} ${msg}`),
  info: (msg) => console.log(`  ${DIM}${msg}${RESET}`),
  fail: (msg) => console.error(`  ${RED}✗${RESET} ${msg}`),
};

// ─── Helpers ──────────────────────────────────────────────────────────────

function sh(cmd, opts = {}) {
  return execSync(cmd, { cwd: REPO, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], ...opts });
}

function shOk(cmd, opts = {}) {
  try {
    sh(cmd, opts);
    return true;
  } catch {
    return false;
  }
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function writeJson(path, obj) {
  // Match npm's formatting: 2-space indent, trailing newline.
  writeFileSync(path, JSON.stringify(obj, null, 2) + "\n");
}

function bumpVersion(current, kind) {
  const [maj, min, pat] = current.split(".").map(Number);
  if (kind === "major") return `${maj + 1}.0.0`;
  if (kind === "minor") return `${maj}.${min + 1}.0`;
  if (kind === "patch") return `${maj}.${min}.${pat + 1}`;
  throw new Error(`unknown bump kind: ${kind}`);
}

function pkgPath(pkg, file = "package.json") {
  return resolve(REPO, pkg.dir, file);
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function fail(msg) {
  log.fail(msg);
  process.exit(1);
}

// ─── Pre-flight ───────────────────────────────────────────────────────────

function preflight() {
  log.step("Pre-flight checks");

  // Working tree
  if (!skipClean) {
    const status = sh("git status --porcelain").trim();
    if (status) {
      log.fail("Working tree is dirty. Commit/stash or pass --skip-clean.");
      console.error(status);
      process.exit(1);
    }
    log.ok("Working tree clean");
  } else {
    log.warn("Working tree check skipped");
  }

  // Branch
  const branch = sh("git rev-parse --abbrev-ref HEAD").trim();
  if (branch !== "main" && branch !== "master") {
    log.warn(`On branch '${branch}' (not main/master) — preview release`);
  } else {
    log.ok(`On ${branch}`);
  }

  // npm logged in
  // Soft-fail on dry-run so the rest of the pipeline (build + smoke)
  // can be exercised without an npm session.
  let user;
  try {
    user = sh("npm whoami").trim();
    log.ok(`npm whoami: ${user}`);
  } catch {
    if (dryRun) {
      log.warn("npm whoami failed — ok in --dry-run; real publish needs `npm login`");
    } else {
      fail("npm whoami failed. Run `npm login` first.");
    }
  }

  // Scope ownership: best-effort. If @socialperks isn't yet claimed we
  // surface a friendly hint rather than failing — first publish will
  // claim the scope automatically.
  for (const pkg of PACKAGES) {
    if (shOk(`npm view ${pkg.name} version`, { stdio: ["ignore", "ignore", "ignore"] })) {
      log.ok(`${pkg.name} exists on registry`);
    } else {
      log.info(`${pkg.name} not yet on registry — first publish will create it`);
    }
  }
}

// ─── Version planning ─────────────────────────────────────────────────────

function planVersion() {
  log.step("Plan version");

  const sdkPkg = readJson(pkgPath(PACKAGES[0]));
  const current = sdkPkg.version;

  let next;
  if (explicitVersion && typeof explicitVersion === "string") {
    if (!/^\d+\.\d+\.\d+(-[\w.]+)?$/.test(explicitVersion)) {
      fail(`--version=${explicitVersion} is not valid semver`);
    }
    next = explicitVersion;
  } else {
    next = bumpVersion(current, bumpKind);
  }

  log.ok(`current: ${current} → next: ${BOLD}${next}${RESET}`);
  return { current, next };
}

// ─── Version write ────────────────────────────────────────────────────────

function writeVersions(next) {
  log.step(`Update package.json (× ${PACKAGES.length}) to ${next}`);

  for (const pkg of PACKAGES) {
    const path = pkgPath(pkg);
    const pkgJson = readJson(path);
    pkgJson.version = next;
    if (pkgJson.dependencies && pkgJson.dependencies["@socialperks/sdk"]) {
      pkgJson.dependencies["@socialperks/sdk"] = next;
    }
    writeJson(path, pkgJson);
    log.ok(`${pkg.name} → ${next}`);
  }

  // Sanity: re-read and confirm the cross-deps point at the new SDK.
  for (const name of SDK_DEPENDENTS) {
    const pkg = PACKAGES.find((p) => p.name === name);
    const json = readJson(pkgPath(pkg));
    if (json.dependencies?.["@socialperks/sdk"] !== next) {
      fail(`${name} dependency on @socialperks/sdk is not ${next}`);
    }
  }
}

// ─── Build ────────────────────────────────────────────────────────────────

function build() {
  log.step("Build all packages");

  for (const pkg of PACKAGES) {
    const distDir = resolve(REPO, pkg.dir, "dist");
    rmSync(distDir, { recursive: true, force: true });
  }

  for (const pkg of PACKAGES) {
    const start = Date.now();
    try {
      execSync("npx tsc -p tsconfig.json", {
        cwd: resolve(REPO, pkg.dir),
        stdio: ["ignore", "pipe", "inherit"],
      });
    } catch {
      fail(`tsc failed for ${pkg.name}`);
    }
    if (pkg.role === "bin") {
      // Make the bin script executable. tsc strips the shebang's exec
      // bit; restore it so `npx <pkg>` and direct invocation work.
      try {
        const binFile = pkg.name === "@socialperks/cli" ? "dist/cli.js" : "dist/server.js";
        execSync(`chmod 0755 ${binFile}`, { cwd: resolve(REPO, pkg.dir) });
      } catch {
        log.warn(`could not chmod bin for ${pkg.name} (non-fatal on Windows)`);
      }
    }
    log.ok(`${pkg.name} (${Date.now() - start}ms)`);
  }
}

// ─── Smoke tests ──────────────────────────────────────────────────────────

async function smoke() {
  log.step("Smoke tests");

  // 1. SDK: dynamically import the dist/index.js, instantiate the
  // client, exercise a sync method (no network).
  try {
    const sdkUrl = new URL("file://" + resolve(REPO, "packages/sdk/dist/index.js"));
    const sdkMod = await import(sdkUrl.href);
    if (typeof sdkMod.SocialPerks !== "function") throw new Error("SocialPerks export missing");
    const inst = new sdkMod.SocialPerks({ apiKey: "sk_test_smoke" });
    const url = inst.poster.url({ campaignId: "cmp_smoke" });
    if (!url.includes("/api/v1/businesses/poster?campaignId=cmp_smoke")) {
      throw new Error(`unexpected poster URL: ${url}`);
    }
    log.ok("SDK: instantiates + poster.url() returns expected URL");
  } catch (e) {
    fail(`SDK smoke failed: ${e.message ?? e}`);
  }

  // 2. CLI: spawn `node dist/cli.js help`, assert exit 0 and "USAGE" in
  // stdout. Spawn instead of import — this is what npx will do.
  try {
    const res = spawnSync("node", [resolve(REPO, "packages/cli/dist/cli.js"), "help"], {
      stdio: ["ignore", "pipe", "pipe"],
      encoding: "utf8",
    });
    if (res.status !== 0) throw new Error(`exit ${res.status}: ${res.stderr}`);
    if (!res.stdout.includes("USAGE")) throw new Error("CLI output missing USAGE");
    log.ok("CLI: `socialperks help` prints usage and exits 0");
  } catch (e) {
    fail(`CLI smoke failed: ${e.message ?? e}`);
  }

  // 3. MCP: import dist/handler.js, verify catalog has 6 tools, call
  // initialize and assert protocol version.
  try {
    const handlerUrl = new URL("file://" + resolve(REPO, "packages/mcp-server/dist/handler.js"));
    const mod = await import(handlerUrl.href);
    const cat = mod.catalog();
    const expected = [
      "list_action_ideas",
      "create_perk_campaign",
      "print_qr_poster",
      "list_campaigns",
      "enqueue_post_purchase_sms",
      "ai_quick_start",
    ];
    const names = cat.tools.map((t) => t.name);
    for (const e of expected) {
      if (!names.includes(e)) throw new Error(`tool missing from catalog: ${e}`);
    }
    const init = await mod.handle(
      { jsonrpc: "2.0", id: 1, method: "initialize" },
      { apiKey: "sk_test_smoke" },
    );
    if (init.result?.protocolVersion !== "2024-11-05") {
      throw new Error(`unexpected protocolVersion: ${init.result?.protocolVersion}`);
    }
    log.ok(`MCP: catalog has ${cat.tools.length} tools, initialize → 2024-11-05`);
  } catch (e) {
    fail(`MCP smoke failed: ${e.message ?? e}`);
  }
}

// ─── Publish ──────────────────────────────────────────────────────────────

function publishOne(pkg) {
  const otpFlag = otp ? `--otp=${otp}` : "";
  const cmd = `npm publish --access public --tag ${distTag} ${otpFlag}`.trim();
  log.info(`$ ${cmd}  (cwd: ${pkg.dir})`);
  if (dryRun) {
    log.warn("DRY RUN — not actually publishing");
    return;
  }
  try {
    execSync(cmd, { cwd: resolve(REPO, pkg.dir), stdio: "inherit" });
  } catch {
    fail(`npm publish failed for ${pkg.name}`);
  }
}

async function publish() {
  log.step("Publish to npm");

  // SDK first — CLI + MCP depend on it.
  publishOne(PACKAGES[0]);
  log.ok(`${PACKAGES[0].name} published`);

  if (!dryRun) {
    log.info("Waiting 5s for registry propagation…");
    await sleep(5000);
  }

  // CLI + MCP can publish in parallel — they don't depend on each other.
  await Promise.all(
    PACKAGES.slice(1).map(
      (pkg) =>
        new Promise((resolveP, rejectP) => {
          if (dryRun) {
            publishOne(pkg);
            resolveP();
            return;
          }
          const otpArgs = otp ? ["--otp", String(otp)] : [];
          const child = spawn(
            "npm",
            ["publish", "--access", "public", "--tag", distTag, ...otpArgs],
            { cwd: resolve(REPO, pkg.dir), stdio: "inherit" },
          );
          child.on("exit", (code) => {
            if (code !== 0) rejectP(new Error(`${pkg.name} publish failed (exit ${code})`));
            else {
              log.ok(`${pkg.name} published`);
              resolveP();
            }
          });
        }),
    ),
  ).catch((e) => fail(e.message));
}

// ─── Git tag + push ───────────────────────────────────────────────────────

function gitTagAndPush(version) {
  if (skipGit) {
    log.warn("Git commit/tag/push skipped (--skip-git)");
    return;
  }
  log.step(`Commit + tag v${version}`);
  if (dryRun) {
    log.warn("DRY RUN — not committing or pushing");
    return;
  }

  // Stage just the package.json files so we don't accidentally commit
  // half-finished work that happens to be in the tree.
  for (const pkg of PACKAGES) {
    sh(`git add ${pkg.dir}/package.json`);
  }
  sh(`git commit -m "release: v${version}"`);
  log.ok("committed");

  // Combined tag plus per-package tags. The per-package tags follow
  // npm's convention so `git checkout @socialperks/sdk@0.2.0` works.
  sh(`git tag -a v${version} -m "v${version}"`);
  for (const pkg of PACKAGES) {
    const tag = `${pkg.name}@${version}`;
    sh(`git tag -a "${tag}" -m "${tag}"`);
  }
  log.ok(`tagged v${version} + per-package tags`);

  sh("git push");
  sh("git push --tags");
  log.ok("pushed commits + tags");
}

// ─── Final summary ────────────────────────────────────────────────────────

function summary(version) {
  log.step("Done");
  for (const pkg of PACKAGES) {
    const url = `https://www.npmjs.com/package/${pkg.name}/v/${version}`;
    console.log(`  ${GREEN}✓${RESET} ${BOLD}${pkg.name}@${version}${RESET}  ${DIM}→ ${url}${RESET}`);
  }
  console.log(
    `\n${BOLD}Try it:${RESET}\n  ${CYAN}npx @socialperks/cli@${version} init --email you@example.com${RESET}\n`,
  );
  if (dryRun) {
    console.log(`${YELLOW}This was a DRY RUN — nothing was published or pushed.${RESET}\n`);
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────

async function main() {
  console.log(`${BOLD}@socialperks release${RESET}  ${DIM}— bump=${bumpKind} tag=${distTag} dryRun=${dryRun}${RESET}`);

  preflight();
  const { current, next } = planVersion();

  // Confirm if not a dry-run and not in CI.
  if (!dryRun && !process.env.CI && process.stdin.isTTY) {
    const readline = await import("node:readline/promises");
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const ans = (await rl.question(
      `\nAbout to publish ${PACKAGES.length} packages from ${current} → ${BOLD}${next}${RESET}. Continue? [y/N] `,
    )).trim().toLowerCase();
    rl.close();
    if (ans !== "y" && ans !== "yes") {
      log.warn("Aborted by user");
      process.exit(0);
    }
  }

  writeVersions(next);
  build();
  await smoke();
  await publish();
  gitTagAndPush(next);
  summary(next);
}

main().catch((e) => {
  log.fail(e instanceof Error ? e.stack ?? e.message : String(e));
  process.exit(1);
});
