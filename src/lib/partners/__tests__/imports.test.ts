// The partner API must never reach a module that loads whole tables at module
// load. This walks the real import graph (static imports, re-exports, dynamic
// imports and require calls), resolving "@/" to src/ and relative paths.
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const SRC = path.resolve(__dirname, "../../..");
const EXTS = [".ts", ".tsx"];

type Fs = { read: (f: string) => string; isFile: (f: string) => boolean };
const realFs: Fs = {
  read: (f) => fs.readFileSync(f, "utf8"),
  isFile: (f) => fs.existsSync(f) && fs.statSync(f).isFile(),
};

export function resolveModule(spec: string, fromFile: string, host: Fs = realFs): string | null {
  let base: string;
  if (spec.startsWith("@/")) base = path.join(SRC, spec.slice(2));
  else if (spec.startsWith(".")) base = path.resolve(path.dirname(fromFile), spec);
  else return null; // a package, not ours
  for (const ext of EXTS) if (host.isFile(base + ext)) return base + ext;
  for (const ext of EXTS) {
    const idx = path.join(base, "index" + ext);
    if (host.isFile(idx)) return idx;
  }
  return null;
}

const IMPORT_RE = /(?:\bimport|\bexport)\s+(?:type\s+)?(?:[\w*{}\s,$]+?\s+from\s+)?["']([^"']+)["']|\bimport\(\s*["']([^"']+)["']\s*\)|\brequire\(\s*["']([^"']+)["']\s*\)/g;

export function importsOf(source: string): string[] {
  const out: string[] = [];
  for (const m of source.matchAll(IMPORT_RE)) out.push(m[1] ?? m[2] ?? m[3]);
  return out;
}

export function reachableModules(entries: string[], host: Fs = realFs): Set<string> {
  const seen = new Set<string>();
  const queue = [...entries];
  while (queue.length) {
    const file = queue.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);
    for (const spec of importsOf(host.read(file))) {
      const next = resolveModule(spec, file, host);
      if (next && !seen.has(next)) queue.push(next);
    }
  }
  return seen;
}

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== "__tests__") out.push(...walk(p)); }
    else if (/\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name)) out.push(p);
  }
  return out;
}

const FORBIDDEN = ["lib/submissions", "lib/submissions/persist", "lib/auth", "lib/auth/api-keys", "lib/billing/store"].map((m) => {
  const f = resolveModule("@/" + m, path.join(SRC, "x.ts"));
  if (!f) throw new Error(`forbidden module ${m} no longer resolves; update this test`);
  return f;
});

const ENTRYPOINTS = [...walk(path.join(SRC, "app/api/v1/partner")), ...walk(path.join(SRC, "lib/partners"))];

describe("partner modules stay off whole-table loaders", () => {
  it("has entrypoints (three routes and the partner library)", () => {
    expect(ENTRYPOINTS.filter((f) => f.endsWith("route.ts")).length).toBe(3);
    expect(ENTRYPOINTS.length).toBeGreaterThan(8);
  });

  it("reaches none of the five forbidden modules", () => {
    const reached = reachableModules(ENTRYPOINTS);
    const hits = FORBIDDEN.filter((f) => reached.has(f)).map((f) => path.relative(SRC, f));
    expect(hits).toEqual([]);
  });

  it("the walker finds a known import edge", () => {
    const reached = reachableModules([path.join(SRC, "lib/partners/week.ts")]);
    expect(reached.has(path.join(SRC, "lib/db/connection.ts"))).toBe(true);
    expect(reached.has(path.join(SRC, "lib/partners/links.ts"))).toBe(true);
  });

  it("would fail if a partner module later imported a forbidden one (fixture)", () => {
    const fake = path.join(SRC, "lib/partners/fake.ts");
    const files: Record<string, string> = {
      [fake]: `import { x } from "./hop";`,
      [path.join(SRC, "lib/partners/hop.ts")]: `export * from "@/lib/submissions";`,
    };
    const overlay = (files: Record<string, string>): Fs => ({
      read: (f) => files[f] ?? realFs.read(f),
      isFile: (f) => f in files || realFs.isFile(f),
    });
    const reached = reachableModules([fake], overlay(files));
    expect(FORBIDDEN.some((f) => reached.has(f))).toBe(true);
    for (const form of [`import "@/lib/submissions";`, `await import("@/lib/auth");`, `const a = require("@/lib/billing/store");`, `import type { T } from "@/lib/auth/api-keys";`]) {
      const r = reachableModules([fake], overlay({ [fake]: form }));
      expect(FORBIDDEN.some((f) => r.has(f)), form).toBe(true);
    }
  });
});
