/**
 * Browser code reads the signed-in API only through apiFetch.
 *
 * apiFetch renews the 15-minute access cookie on a 401. A plain fetch() does
 * not, so a signed-in read made with one fails on any tab open longer than
 * 15 minutes. This test walks src/ with the TypeScript parser and lists every
 * plain fetch() that reads a same-origin `/api/v1` URL. Only a browser can
 * fetch a relative URL, so server code never matches.
 *
 * Plain reads that stay allowed:
 * - the auth route itself (apiFetch never renews on its 401s either);
 * - the public routes below, which answer the same signed in or not.
 *
 * Writes (POST, PUT, PATCH, DELETE) are not checked here.
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
import { expect, it } from "vitest";

const SRC = path.join(process.cwd(), "src");
const AUTH_ROUTE = "/api/v1/auth";

/** Routes that answer a visitor with no sign-in, so a plain fetch loses nothing. */
const PUBLIC_READS: Record<string, string> = {
  "/api/v1/csrf": "apiFetch's own call; issues a token signed in or not",
  "/api/v1/search": "campaign search; anonymous, active campaigns only",
  "/api/v1/stats/public": "the landing page's public numbers",
  "/api/v1/flags": "feature flags; a visitor with no sign-in gets the defaults",
  "/api/v1/discover": "campaign discovery, built from seed data",
};

interface PlainRead {
  where: string;
  path: string;
}

function sourceFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "__tests__" || full === path.join(SRC, "app", "api")) continue;
      files.push(...sourceFiles(full));
    } else if (/\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

function isPlainFetch(call: ts.CallExpression): boolean {
  const callee = call.expression;
  if (ts.isIdentifier(callee)) return callee.text === "fetch";
  return (
    ts.isPropertyAccessExpression(callee) &&
    callee.name.text === "fetch" &&
    ts.isIdentifier(callee.expression) &&
    ["window", "globalThis", "self"].includes(callee.expression.text)
  );
}

/** The literal start of the URL, or null when it is not written out. */
function literalUrl(arg: ts.Expression | undefined): string | null {
  if (!arg) return null;
  if (ts.isStringLiteral(arg) || ts.isNoSubstitutionTemplateLiteral(arg)) return arg.text;
  if (ts.isTemplateExpression(arg)) return arg.head.text;
  return null;
}

/** True unless the options name a method other than GET. Unreadable options count as a read. */
function isRead(options: ts.Expression | undefined): boolean {
  if (!options) return true;
  if (!ts.isObjectLiteralExpression(options)) return true;
  for (const prop of options.properties) {
    if (!ts.isPropertyAssignment(prop)) continue;
    const name = ts.isIdentifier(prop.name) || ts.isStringLiteral(prop.name) ? prop.name.text : null;
    if (name !== "method") continue;
    return !ts.isStringLiteral(prop.initializer) || ["GET", "HEAD"].includes(prop.initializer.text.toUpperCase());
  }
  return true;
}

function plainReads(): PlainRead[] {
  const found: PlainRead[] = [];
  for (const file of sourceFiles(SRC)) {
    const text = readFileSync(file, "utf8");
    if (!text.includes("fetch(")) continue;
    const kind = file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
    const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, kind);
    const visit = (node: ts.Node): void => {
      if (ts.isCallExpression(node) && isPlainFetch(node)) {
        const url = literalUrl(node.arguments[0]);
        if (url?.startsWith("/api/v1/") && isRead(node.arguments[1])) {
          const { line } = source.getLineAndCharacterOfPosition(node.getStart(source));
          found.push({ where: `${path.relative(process.cwd(), file)}:${line + 1}`, path: url.split("?")[0] });
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  return found;
}

const isPublic = (p: string) => Object.keys(PUBLIC_READS).some((route) => p === route || p.startsWith(`${route}/`));

it("finds no plain fetch() reading a signed-in /api/v1 route", () => {
  const reads = plainReads();

  // The scan works: it sees reads that are allowed to stay plain.
  expect(reads).toContainEqual(expect.objectContaining({ path: AUTH_ROUTE }));
  expect(reads).toContainEqual(expect.objectContaining({ path: "/api/v1/search" }));

  const signedIn = reads
    .filter((r) => r.path !== AUTH_ROUTE && !isPublic(r.path))
    .map((r) => `${r.where}  ${r.path}`);
  expect(signedIn).toEqual([]);
});
