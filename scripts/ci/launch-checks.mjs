#!/usr/bin/env node
/**
 * launch-checks — static launch-readiness guards for CI.
 *
 * These are the checks that need NO running server or browser, so they're cheap
 * enough to gate every PR: secret leakage, NEXT_PUBLIC_ hygiene, SEO source
 * sanity, and presence of security headers. Server/browser-based gates
 * (smoke, lighthouse, a11y) live in separate jobs in launch-gate.yml.
 *
 * Exit non-zero on any failure so the gate blocks the merge.
 */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const failures = [];
const warnings = [];
const fail = (m) => failures.push(m);
const warn = (m) => warnings.push(m);

/** Recursively collect files under a dir, skipping node_modules/.next/.git. */
function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next" || entry === ".git") continue;
    const p = join(dir, entry);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

// Scan every code root, not just src/ — this is a workspaces monorepo, and a
// secret committed under packages/ or scripts/ passed the gate unnoticed.
const SCAN_ROOTS = ["src", "packages", "scripts", "e2e"];
// The detector files necessarily contain the very literals they search for
// (e.g. the "service_role" marker below), so scanning them reports the guard
// itself. Exclude only these two, by exact path — not a broad glob that could
// hide a real secret.
const SCANNER_SELF = new Set([
  join(ROOT, "scripts", "ci", "launch-checks.mjs"),
  join(ROOT, "scripts", "ci", "validate-skills.mjs"),
]);
const srcFiles = SCAN_ROOTS.flatMap((r) => {
  const dir = join(ROOT, r);
  return existsSync(dir) ? walk(dir) : [];
}).filter((f) => /\.(ts|tsx|js|jsx|mjs)$/.test(f) && !SCANNER_SELF.has(f));

// ── Guard 1: no live secret literals committed in source ─────────────────────
// Real secrets belong in env vars, never in the bundle or repo. Test/publishable
// prefixes (pk_, phc_, whsec_ appear only in comments/examples) are allowed only
// when clearly not a real value; we flag the dangerous live/secret forms.
const SECRET_PATTERNS = [
  { re: /sk_live_[A-Za-z0-9]{16,}/, name: "Stripe live secret key (sk_live_)" },
  { re: /sk_test_[A-Za-z0-9]{16,}/, name: "Stripe test secret key (sk_test_)" },
  { re: /\bwhsec_[A-Za-z0-9]{16,}/, name: "Stripe webhook secret (whsec_)" },
  { re: /"service_role"/, name: "Supabase service_role JWT marker" },
  { re: /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/, name: "hardcoded JWT" },
];
for (const f of srcFiles) {
  const text = readFileSync(f, "utf8");
  for (const { re, name } of SECRET_PATTERNS) {
    if (re.test(text)) fail(`Possible ${name} committed in ${f.replace(ROOT + "/", "")}`);
  }
}

// ── Guard 2: NEXT_PUBLIC_ hygiene ────────────────────────────────────────────
// Anything named NEXT_PUBLIC_* is inlined into the client bundle. A var whose
// name implies a secret must never be public.
const publicVarRe = /NEXT_PUBLIC_[A-Z0-9_]+/g;
const dangerousName = /(SECRET|PRIVATE|SERVICE_ROLE|_SK_|PASSWORD|_TOKEN\b)/;
for (const f of srcFiles) {
  const text = readFileSync(f, "utf8");
  for (const m of text.match(publicVarRe) ?? []) {
    if (dangerousName.test(m)) fail(`Sensitive-looking public env var ${m} in ${f.replace(ROOT + "/", "")}`);
  }
}

// ── Guard 3: SEO source sanity ───────────────────────────────────────────────
for (const rel of ["src/app/sitemap.ts", "src/app/robots.ts"]) {
  if (!existsSync(join(ROOT, rel))) fail(`Missing ${rel} — SEO crawlability at risk`);
}

// ── Guard 4: security headers present ────────────────────────────────────────
const nextConfig = ["next.config.js", "next.config.mjs", "next.config.ts"]
  .map((f) => join(ROOT, f))
  .find(existsSync);
if (!nextConfig) {
  fail("No next.config.* found — cannot verify security headers");
} else {
  const cfg = readFileSync(nextConfig, "utf8");
  if (!/Content-Security-Policy/.test(cfg)) fail("next.config missing Content-Security-Policy header");
  for (const h of ["X-Frame-Options", "Referrer-Policy"]) {
    if (!new RegExp(h).test(cfg)) warn(`next.config missing recommended header ${h}`);
  }
}

// ── Report ───────────────────────────────────────────────────────────────────
for (const w of warnings) console.log(`::warning::[launch-checks] ${w}`);
if (failures.length) {
  for (const f of failures) console.log(`::error::[launch-checks] ${f}`);
  console.error(`\nlaunch-checks FAILED with ${failures.length} issue(s).`);
  process.exit(1);
}
console.log(`launch-checks passed (${warnings.length} warning(s)).`);
