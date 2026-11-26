/**
 * useRealtime hears only the event types REALTIME_EVENT_TYPES lists (an
 * EventSource passes a named event only to a listener for that name), so a
 * type that something publishes but the list leaves out never reaches a "*"
 * subscriber.
 *
 * This reads every `eventPublisher.publish(...)` call under src (tests
 * aside) with the TypeScript parser, takes the event type it passes, and
 * checks it against the list. The type must be written out: a string, or a
 * variable whose value is written out in the same file (as in
 * `const eventType = ok ? "submission.approved" : "submission.rejected"`).
 * A call whose type cannot be read that way fails the test too.
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { REALTIME_EVENT_TYPES } from "../event-types";

interface PublishCall {
  where: string;
  /** The event types the call may publish; null when they cannot be read. */
  types: string[] | null;
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === "__tests__" ? [] : sourceFiles(full);
    return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

/**
 * The strings an expression can evaluate to, when they are written out: a
 * string, either branch of a ternary (not its condition), through brackets
 * and `as`. Null for anything else.
 */
function valuesOf(node: ts.Expression): string[] | null {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return [node.text];
  if (ts.isParenthesizedExpression(node) || ts.isAsExpression(node)) return valuesOf(node.expression);
  if (ts.isConditionalExpression(node)) {
    const whenTrue = valuesOf(node.whenTrue);
    const whenFalse = valuesOf(node.whenFalse);
    return whenTrue && whenFalse ? [...whenTrue, ...whenFalse] : null;
  }
  return null;
}

function publishCalls(where: string, text: string): PublishCall[] {
  const source = ts.createSourceFile(where, text, ts.ScriptTarget.Latest, true);
  const declarations = new Map<string, ts.Expression>();
  const calls: Array<{ node: ts.CallExpression }> = [];

  const visit = (node: ts.Node): void => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
      declarations.set(node.name.text, node.initializer);
    }
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === "publish" &&
      ts.isIdentifier(node.expression.expression) &&
      node.expression.expression.text === "eventPublisher"
    ) {
      calls.push({ node });
    }
    node.forEachChild(visit);
  };
  visit(source);

  return calls.map(({ node }) => {
    const line = source.getLineAndCharacterOfPosition(node.getStart()).line + 1;
    const first = node.arguments[0];
    let types: string[] | null = null;
    if (first && ts.isIdentifier(first)) {
      const init = declarations.get(first.text);
      types = init ? valuesOf(init) : null;
    } else if (first) {
      types = valuesOf(first);
    }
    return { where: `${where}:${line}`, types };
  });
}

describe("the publish-call reader", () => {
  it("reads a written-out type, a variable's written-out values, and flags anything else", () => {
    const fixture = [
      'eventPublisher.publish("perk.redeemed", {}, biz);',
      'const eventType = decision === "approve" ? "submission.approved" : "submission.rejected";',
      "eventPublisher.publish(eventType, {}, biz);",
      "eventPublisher.publish(kindOf(x), {}, biz);",
      'other.publish("not.an.event", {});',
    ].join("\n");
    expect(publishCalls("fixture.ts", fixture)).toEqual([
      { where: "fixture.ts:1", types: ["perk.redeemed"] },
      { where: "fixture.ts:3", types: ["submission.approved", "submission.rejected"] },
      { where: "fixture.ts:4", types: null },
    ]);
  });
});

describe("REALTIME_EVENT_TYPES", () => {
  const SRC = path.join(process.cwd(), "src");
  const calls = sourceFiles(SRC).flatMap((file) => {
    const text = readFileSync(file, "utf8");
    return text.includes("eventPublisher.publish(") ? publishCalls(path.relative(process.cwd(), file), text) : [];
  });

  it("finds the publishers", () => {
    expect(calls.length).toBeGreaterThanOrEqual(8);
  });

  it("can read the type of every publish call", () => {
    expect(calls.filter((c) => c.types === null).map((c) => c.where)).toEqual([]);
  });

  it("lists every type that is published", () => {
    const listed = new Set<string>(REALTIME_EVENT_TYPES);
    const missing = calls.flatMap((c) => (c.types ?? []).filter((t) => !listed.has(t)).map((t) => `${c.where}  ${t}`));
    expect(missing).toEqual([]);
  });
});
