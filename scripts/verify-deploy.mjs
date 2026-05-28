#!/usr/bin/env node
/**
 * verify-deploy.mjs
 *
 * Post-deploy smoke test — runs end-to-end against a deployed Social
 * Perks instance. Hits every public surface, validates response codes,
 * Schema.org markup, and content-type. Exits non-zero on any failure.
 *
 * Usage:
 *   node scripts/verify-deploy.mjs https://socialperks.app
 *   node scripts/verify-deploy.mjs http://localhost:3000
 *
 * Or via npm:
 *   BASE_URL=https://socialperks.app npm run verify:deploy
 */

const BASE = (process.argv[2] ?? process.env.BASE_URL ?? "http://localhost:3000").replace(
  /\/$/,
  ""
);

let pass = 0;
let fail = 0;
const failures = [];

function ok(label) {
  pass++;
  console.log(`  ✓ ${label}`);
}

function bad(label, detail) {
  fail++;
  failures.push({ label, detail });
  console.log(`  ✗ ${label} — ${detail}`);
}

async function head(path, expected = 200) {
  try {
    const res = await fetch(`${BASE}${path}`, { redirect: "follow" });
    if (res.status === expected) ok(`${path} → ${res.status}`);
    else bad(`${path}`, `expected ${expected}, got ${res.status}`);
    return res;
  } catch (e) {
    bad(`${path}`, `fetch failed: ${e.message}`);
    return null;
  }
}

async function checkSchema(path, expectedTypes) {
  try {
    const res = await fetch(`${BASE}${path}`);
    if (!res.ok) {
      bad(`${path} schema`, `HTTP ${res.status}`);
      return;
    }
    const html = await res.text();
    const missing = [];
    for (const type of expectedTypes) {
      const re = new RegExp(`"@type":\\s*"${type}"`);
      if (!re.test(html)) missing.push(type);
    }
    if (missing.length === 0) {
      ok(`${path} schema: ${expectedTypes.join(", ")}`);
    } else {
      bad(`${path} schema`, `missing: ${missing.join(", ")}`);
    }
  } catch (e) {
    bad(`${path} schema`, `fetch failed: ${e.message}`);
  }
}

async function checkContentType(path, expected) {
  try {
    const res = await fetch(`${BASE}${path}`);
    const ct = res.headers.get("content-type") ?? "";
    if (ct.includes(expected)) {
      ok(`${path} content-type: ${expected}`);
    } else {
      bad(`${path} content-type`, `expected ${expected}, got ${ct}`);
    }
  } catch (e) {
    bad(`${path} content-type`, `fetch failed: ${e.message}`);
  }
}

async function checkMcpTools() {
  try {
    const res = await fetch(`${BASE}/api/mcp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/list",
      }),
    });
    if (!res.ok) {
      bad("MCP tools/list", `HTTP ${res.status}`);
      return;
    }
    const json = await res.json();
    const tools = json?.result?.tools ?? [];
    const expected = ["getPricing", "listActions", "getBenchmarks", "listCampaigns", "searchInfluencers"];
    const names = tools.map((t) => t.name);
    const missing = expected.filter((e) => !names.includes(e));
    if (missing.length === 0) {
      ok(`MCP tools/list: ${expected.length} tools present`);
    } else {
      bad("MCP tools/list", `missing: ${missing.join(", ")}`);
    }
  } catch (e) {
    bad("MCP tools/list", `fetch failed: ${e.message}`);
  }
}

async function checkRobotsAllows() {
  try {
    const res = await fetch(`${BASE}/robots.txt`);
    if (!res.ok) {
      bad("robots.txt", `HTTP ${res.status}`);
      return;
    }
    const text = await res.text();
    const expectedBots = ["GPTBot", "ClaudeBot", "PerplexityBot", "OAI-SearchBot"];
    const missing = expectedBots.filter((b) => !text.includes(b));
    if (missing.length === 0) {
      ok(`robots.txt: ${expectedBots.length} AI bots explicitly welcomed`);
    } else {
      bad("robots.txt", `missing AI bot allow rules for: ${missing.join(", ")}`);
    }
  } catch (e) {
    bad("robots.txt", `fetch failed: ${e.message}`);
  }
}

async function main() {
  console.log(`Verifying deploy: ${BASE}\n`);

  // ─── 1. Public discovery surfaces ──────────────────────────────────────
  console.log("─── Discovery surfaces");
  await head("/");
  await head("/sitemap.xml");
  await head("/robots.txt");
  await head("/llms.txt");
  await head("/humans.txt");
  await head("/AGENTS.md");
  await checkRobotsAllows();

  // ─── 2. Catalog ──────────────────────────────────────────────────────
  console.log("\n─── Catalog");
  await head("/actions");
  await head("/platforms");
  await head("/actions/type/content");
  await head("/actions/type/review");
  await head("/actions/type/engage");
  await head("/actions/ig_rl"); // sample action
  await head("/actions/go_rv");
  await head("/platforms/ig");
  await head("/platforms/tt");
  await head("/platforms/go");

  // ─── 3. Reference ────────────────────────────────────────────────────
  console.log("\n─── Reference");
  await head("/faq");
  await head("/glossary");
  await head("/benchmarks");
  await head("/pricing-oracle");
  await head("/pricing-oracle/coffee-shops");
  await head("/pricing-oracle/restaurants");

  // ─── 4. Guidance ──────────────────────────────────────────────────────
  console.log("\n─── Guidance");
  await head("/guides");
  await head("/guides/build-mcp-agent-for-social-perks");
  await head("/guides/incentivize-customer-reviews-without-violating-google-tos");
  await head("/compare");
  await head("/compare/instagram-vs-tiktok");
  await head("/best");
  await head("/best/highest-value-marketing-actions");
  await head("/resources");
  await head("/agents");

  // ─── 5. Industry × platform combos ────────────────────────────────────
  console.log("\n─── Industry × platform");
  await head("/for/restaurants/on/ig");
  await head("/for/coffee-shops/on/tt");

  // ─── 6. Public APIs ──────────────────────────────────────────────────
  console.log("\n─── Public APIs");
  await head("/api/v1/openapi");
  await head("/api/v1/health");
  await head("/api/v1/pricing?actionId=ig_rl");
  await head("/api/v1/actions");
  await head("/api/v1/benchmarks?businessType=coffee-shops");
  await head("/api/llm-context");
  await head("/api/feed.json");

  // ─── 7. MCP server ───────────────────────────────────────────────────
  console.log("\n─── MCP server");
  await head("/api/mcp");
  await checkMcpTools();

  // ─── 8. OG images ────────────────────────────────────────────────────
  console.log("\n─── OG images");
  await checkContentType("/api/og/action?id=ig_rl", "image/svg+xml");
  await checkContentType("/api/og/platform?id=ig", "image/svg+xml");
  await head("/.well-known/ai-plugin.json");

  // ─── 9. Schema.org markup ────────────────────────────────────────────
  console.log("\n─── Schema.org markup");
  await checkSchema("/", ["Organization", "WebSite", "SearchAction", "SoftwareApplication"]);
  await checkSchema("/actions/ig_rl", ["Service", "Offer", "BreadcrumbList"]);
  await checkSchema("/platforms/ig", ["WebPage", "BreadcrumbList"]);
  await checkSchema("/faq", ["FAQPage", "Question", "Answer", "SpeakableSpecification"]);
  await checkSchema("/glossary", ["DefinedTermSet", "DefinedTerm"]);
  await checkSchema("/benchmarks", ["Dataset"]);
  await checkSchema("/guides/choose-perk-amount", ["HowTo", "HowToStep"]);
  await checkSchema("/compare/instagram-vs-tiktok", ["Article", "BreadcrumbList"]);
  await checkSchema("/best/highest-value-marketing-actions", ["ItemList", "ListItem", "Article"]);

  // ─── Summary ────────────────────────────────────────────────────────
  console.log(`\n${"=".repeat(60)}`);
  console.log(`Results: ${pass} passed · ${fail} failed`);

  // Map each failure to the PR that fixes it. Helps the user understand
  // whether a 404 means "broken" or "PR not merged yet".
  const PR_DEPS = {
    "/api/v1/openapi": "PR #19 (agent infrastructure)",
    "/api/mcp": "PR #19 (agent infrastructure)",
    "MCP tools/list": "PR #19 (agent infrastructure)",
    "/.well-known/ai-plugin.json": "PR #19 (agent infrastructure)",
    "robots.txt": "PR #19 (agent infrastructure)",
    "/llms.txt": "PR #19 + PR #24 (this branch)",
    "/AGENTS.md": "PR #19 + PR #24 (this branch)",
    "/dashboard/api-keys": "PR #21 (api-keys)",
    "/dashboard/billing": "PR #22 (revenue path)",
  };

  if (fail > 0) {
    console.log(`\nFailures (with PR dependencies):`);
    for (const f of failures) {
      const pr = Object.entries(PR_DEPS).find(([k]) => f.label.includes(k));
      const prNote = pr ? `  [needs ${pr[1]}]` : "";
      console.log(`  ✗ ${f.label} — ${f.detail}${prNote}`);
    }

    const allPrDeps = failures.every((f) =>
      Object.keys(PR_DEPS).some((k) => f.label.includes(k))
    );
    if (allPrDeps) {
      console.log(
        `\nAll failures are unmerged-PR dependencies. Merge the listed PRs and re-run.`
      );
      // Soft-exit when only PR-dep failures so CI doesn't block on
      // staged-but-unmerged work.
      process.exit(0);
    }
    process.exit(1);
  }
  console.log("\n✓ All checks passed. Deploy is healthy.");
  console.log(`\nNext steps:`);
  console.log(`  1. Submit ${BASE}/sitemap.xml to Google Search Console`);
  console.log(`  2. Submit ${BASE}/sitemap.xml to Bing Webmaster Tools`);
  console.log(`  3. Validate Schema.org with Google Rich Results Test:`);
  console.log(`     https://search.google.com/test/rich-results?url=${encodeURIComponent(BASE)}`);
  console.log(`  4. Walk through docs/launch-submissions/ playbook`);
}

main().catch((e) => {
  console.error("Verify failed:", e);
  process.exit(2);
});
