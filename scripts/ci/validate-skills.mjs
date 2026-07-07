#!/usr/bin/env node
/**
 * validate-skills — lint the .claude/skills/ pack so a malformed skill can't
 * silently stop loading. Checks each SKILL.md for required frontmatter, a valid
 * model value, name↔directory agreement, and that any shell-injection command
 * in the body has a matching allowed-tools entry (otherwise it prompts at run
 * time instead of injecting). Runs in CI and locally: `node scripts/ci/validate-skills.mjs`.
 */
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const SKILLS_DIR = join(ROOT, ".claude", "skills");
const VALID_MODELS = new Set(["haiku", "sonnet", "opus"]);
const failures = [];

if (!existsSync(SKILLS_DIR)) {
  console.log("No .claude/skills directory — nothing to validate.");
  process.exit(0);
}

/** Minimal frontmatter parser: returns { fm: rawText, fields: {k:v}, body }. */
function parse(md) {
  const m = md.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return null;
  const fields = {};
  for (const line of m[1].split("\n")) {
    const kv = line.match(/^([a-zA-Z0-9_-]+):\s*(.*)$/);
    if (kv) fields[kv[1]] = kv[2].trim();
  }
  return { fmRaw: m[1], fields, body: m[2] };
}

const dirs = readdirSync(SKILLS_DIR).filter((d) => statSync(join(SKILLS_DIR, d)).isDirectory());
if (dirs.length === 0) failures.push("skills directory exists but contains no skills");

for (const dir of dirs) {
  const file = join(SKILLS_DIR, dir, "SKILL.md");
  const rel = `.claude/skills/${dir}/SKILL.md`;
  if (!existsSync(file)) {
    failures.push(`${dir}/ has no SKILL.md`);
    continue;
  }
  const md = readFileSync(file, "utf8");
  const parsed = parse(md);
  if (!parsed) {
    failures.push(`${rel}: missing or malformed YAML frontmatter`);
    continue;
  }
  const { fields, body } = parsed;

  if (!fields.name) failures.push(`${rel}: frontmatter missing 'name'`);
  else if (fields.name !== dir) failures.push(`${rel}: name '${fields.name}' != directory '${dir}'`);

  // description may span multiple lines (>-) — accept a key presence + non-trivial body length.
  if (!/description:/.test(parsed.fmRaw)) failures.push(`${rel}: frontmatter missing 'description'`);

  if (fields.model && !VALID_MODELS.has(fields.model)) {
    failures.push(`${rel}: invalid model '${fields.model}' (use haiku|sonnet|opus)`);
  }

  // Shell-injection lines look like:  !`some command`. Each MUST be covered by a
  // Bash(<prefix>:*) allowed-tools matcher whose prefix is an actual prefix of the
  // command — otherwise it prompts at run time instead of injecting. (Presence of
  // allowed-tools alone is not enough: a matcher for the wrong command silently
  // fails, which is the exact bug this check exists to catch.)
  const injects = [...body.matchAll(/^!\`([^`]+)\`/gm)].map((x) => x[1].trim());
  if (injects.length) {
    const atRaw = fields["allowed-tools"] ?? "";
    // e.g. "Bash(npm run build:*)" -> "npm run build"
    const bashPrefixes = [...atRaw.matchAll(/Bash\(([^)]*?):\*\)/g)].map((m) => m[1].trim());
    if (bashPrefixes.length === 0) {
      failures.push(`${rel}: uses shell-injection but declares no Bash(...:*) allowed-tools matcher`);
    } else {
      for (const cmd of injects) {
        // A matcher covers the command PREFIX, not the trailing `| tail`/`2>&1`,
        // so compare against the head up to the first pipe/redirect.
        const head = cmd.split(/\s*[|>]/)[0].trim();
        if (!bashPrefixes.some((p) => head.startsWith(p))) {
          failures.push(
            `${rel}: shell-injection command \`${head}\` has no matching Bash(...:*) prefix in allowed-tools (would prompt instead of injecting)`,
          );
        }
      }
    }
  }
  if (!body.trim()) failures.push(`${rel}: empty body`);
}

if (failures.length) {
  for (const f of failures) console.log(`::error::[validate-skills] ${f}`);
  console.error(`\nvalidate-skills FAILED (${failures.length} issue(s)) across ${dirs.length} skill(s).`);
  process.exit(1);
}
console.log(`validate-skills passed: ${dirs.length} skills OK.`);
