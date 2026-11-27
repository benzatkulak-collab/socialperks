/**
 * Finds plain fetch() calls in the source with the TypeScript parser, for
 * the tests that keep browser code on apiFetch. Test-only.
 *
 * It sees calls whose URL is written out (a string, or the start of a
 * template). It does not see URLs held in variables, wrappers around fetch,
 * or EventSource.
 */
import { readdirSync } from "node:fs";
import path from "node:path";
import ts from "typescript";

export interface FetchCall {
  /** file:line */
  where: string;
  /** The URL as written, up to the first placeholder; null when not written out. */
  url: string | null;
  /** The URL's path: no query string, no trailing slash. */
  path: string | null;
  /** Upper case. GET when no options are passed; null when the options do not say plainly. */
  method: string | null;
  /** The `action` of a `JSON.stringify({ action: "…" })` body, if any. */
  action: string | null;
  /** Names of the calls this fetch sits inside, innermost first (e.g. "signOutWith"). */
  insideCalls: string[];
}

/** Every .ts/.tsx file under `dir`, without tests and without server routes (`src/app/api`). */
export function sourceFiles(dir: string, apiRoutesDir = path.join(dir, "app", "api")): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "__tests__" || full === apiRoutesDir) continue;
      files.push(...sourceFiles(full, apiRoutesDir));
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

function literalText(node: ts.Expression | undefined): string | null {
  if (!node) return null;
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (ts.isTemplateExpression(node)) return node.head.text;
  return null;
}

function propertyNamed(options: ts.ObjectLiteralExpression, name: string): ts.Expression | undefined {
  for (const prop of options.properties) {
    if (!ts.isPropertyAssignment(prop)) continue;
    const key = ts.isIdentifier(prop.name) || ts.isStringLiteral(prop.name) ? prop.name.text : null;
    if (key === name) return prop.initializer;
  }
  return undefined;
}

function methodOf(options: ts.Expression | undefined): string | null {
  if (!options) return "GET";
  if (!ts.isObjectLiteralExpression(options)) return null;
  const method = propertyNamed(options, "method");
  if (method) return ts.isStringLiteral(method) ? method.text.toUpperCase() : null;
  // No method written: GET, unless a spread or a `{ method }` shorthand could carry one.
  const mayCarryMethod = options.properties.some(
    (p) => ts.isSpreadAssignment(p) || (ts.isShorthandPropertyAssignment(p) && p.name.text === "method")
  );
  return mayCarryMethod ? null : "GET";
}

function actionOf(options: ts.Expression | undefined): string | null {
  if (!options || !ts.isObjectLiteralExpression(options)) return null;
  const body = propertyNamed(options, "body");
  if (!body || !ts.isCallExpression(body) || body.expression.getText() !== "JSON.stringify") return null;
  const payload = body.arguments[0];
  if (!payload || !ts.isObjectLiteralExpression(payload)) return null;
  const action = propertyNamed(payload, "action");
  return action && ts.isStringLiteral(action) ? action.text : null;
}

function enclosingCalls(node: ts.Node): string[] {
  const names: string[] = [];
  for (let at = node.parent; at; at = at.parent) {
    if (!ts.isCallExpression(at)) continue;
    const callee = at.expression;
    if (ts.isIdentifier(callee)) names.push(callee.text);
    else if (ts.isPropertyAccessExpression(callee)) names.push(callee.name.text);
  }
  return names;
}

/** The plain fetch() calls in one file's text. */
export function fetchCalls(fileName: string, text: string): FetchCall[] {
  if (!text.includes("fetch(")) return [];
  const kind = fileName.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const source = ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, true, kind);
  const found: FetchCall[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node) && isPlainFetch(node)) {
      const url = literalText(node.arguments[0]);
      const { line } = source.getLineAndCharacterOfPosition(node.getStart(source));
      found.push({
        where: `${fileName}:${line + 1}`,
        url,
        path: url === null ? null : url.split(/[?#]/)[0].replace(/\/+$/, ""),
        method: methodOf(node.arguments[1]),
        action: actionOf(node.arguments[1]),
        insideCalls: enclosingCalls(node),
      });
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
}
