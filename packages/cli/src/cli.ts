#!/usr/bin/env node
/**
 * @socialperks/cli — Agent-runnable Social Perks CLI.
 *
 * Design constraint: every command must be runnable from a non-
 * interactive shell with zero browser dependence. This is what makes
 * the difference between "an agent can use this" and "an agent has
 * to ask a human to click something."
 *
 * Commands:
 *   init                Create an account, get an API key, write .env.local
 *   whoami              Print the authenticated business
 *   campaigns list      List campaigns
 *   campaigns create    Create a campaign (flag-driven)
 *   actions list        List the action library
 *   poster              Print or save the QR poster for a campaign
 *   sms                 Enqueue a post-purchase SMS
 *   help                Print usage
 *
 * All flags map 1:1 to SDK arguments. Output is JSON by default unless
 * the user passes --format=table.
 */

import { SocialPerks, SocialPerksError } from "@socialperks/sdk";
import { promises as fs } from "node:fs";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output, exit, env } from "node:process";
import { resolve } from "node:path";

const VERSION = "0.1.0";

interface Args {
  command: string;
  sub?: string;
  flags: Record<string, string | boolean>;
  rest: string[];
}

function parseArgs(argv: string[]): Args {
  const flags: Record<string, string | boolean> = {};
  const rest: string[] = [];
  let command = "";
  let sub: string | undefined;

  let positionalIdx = 0;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a.startsWith("--")) {
      const eq = a.indexOf("=");
      if (eq > -1) {
        flags[a.slice(2, eq)] = a.slice(eq + 1);
      } else {
        const next = argv[i + 1];
        if (next && !next.startsWith("--")) {
          flags[a.slice(2)] = next;
          i++;
        } else {
          flags[a.slice(2)] = true;
        }
      }
    } else {
      if (positionalIdx === 0) command = a;
      else if (positionalIdx === 1) sub = a;
      else rest.push(a);
      positionalIdx++;
    }
  }
  return { command, sub, flags, rest };
}

function getBaseUrl(flags: Args["flags"]): string {
  return (
    (flags.host as string | undefined) ??
    env.SOCIAL_PERKS_BASE_URL ??
    "https://socialperks.io"
  );
}

function getApiKey(flags: Args["flags"]): string | undefined {
  return (flags["api-key"] as string | undefined) ?? env.SOCIAL_PERKS_API_KEY;
}

function fail(msg: string, hint?: string): never {
  console.error(`error: ${msg}`);
  if (hint) console.error(`hint: ${hint}`);
  exit(1);
}

function printHelp(): void {
  console.log(`@socialperks/cli v${VERSION}

USAGE
  socialperks <command> [subcommand] [flags]

COMMANDS
  init                       Create an account + write SOCIAL_PERKS_API_KEY to .env.local
  whoami                     Show the authenticated business
  campaigns list             List campaigns. Flags: --status active|paused|ended
  campaigns create           Create a campaign.
                               --platform instagram --action ig_story
                               --reward-type pct --reward 15 --name "..."
  actions list               List action library.
                               --platform instagram --tier high_impact --business-type coffee_shop
  poster --campaign <id>     Print poster URL. Add --save out.svg to save.
  sms                        Enqueue post-purchase SMS.
                               --campaign <id> --phone +14155551234
  ai quick-start             Get the single-best campaign for a business type.
                               --business-type coffee_shop --budget 100
  health                     Ping the API.
  help                       Show this message.

GLOBAL FLAGS
  --api-key <key>            Override SOCIAL_PERKS_API_KEY env var
  --host <url>               Override base URL (default https://socialperks.io)
  --format json|table        Output format (default json)
  --json                     Shorthand for --format json (default)

ENVIRONMENT
  SOCIAL_PERKS_API_KEY       Auth. Get one with 'socialperks init'.
  SOCIAL_PERKS_BASE_URL      Override base URL.

EXAMPLES
  npx @socialperks/cli init
  socialperks campaigns list --status active
  socialperks poster --campaign cmp_abc123 --save poster.svg
  socialperks ai quick-start --business-type coffee_shop --format table
`);
}

function output_(data: unknown, format: string | undefined): void {
  if (format === "table" && Array.isArray(data)) {
    if (data.length === 0) {
      console.log("(no rows)");
      return;
    }
    const cols = Object.keys(data[0] as object);
    console.log(cols.join("\t"));
    for (const row of data) {
      console.log(cols.map((c) => String((row as Record<string, unknown>)[c] ?? "")).join("\t"));
    }
    return;
  }
  console.log(JSON.stringify(data, null, 2));
}

async function prompt(question: string): Promise<string> {
  const rl = createInterface({ input, output });
  try {
    return (await rl.question(question)).trim();
  } finally {
    rl.close();
  }
}

// ─── Commands ─────────────────────────────────────────────────────────────

async function cmdInit(args: Args): Promise<void> {
  const baseUrl = getBaseUrl(args.flags);
  const noninteractive = !!args.flags["non-interactive"] || !!env.CI || !input.isTTY;

  let email = (args.flags.email as string | undefined) ?? env.SOCIAL_PERKS_EMAIL;
  let businessName = (args.flags["business-name"] as string | undefined) ?? env.SOCIAL_PERKS_BUSINESS_NAME;

  if (!email) {
    if (noninteractive) {
      fail(
        "missing --email in non-interactive mode",
        "pass --email you@example.com --business-name 'My Shop' --non-interactive",
      );
    }
    email = await prompt("Email: ");
  }
  if (!businessName) {
    businessName = noninteractive
      ? `Auto-${email.split("@")[0] ?? "shop"}`
      : (await prompt(`Business name [${email.split("@")[0]}]: `)) || (email.split("@")[0] ?? "Auto");
  }

  console.error(`→ provisioning account at ${baseUrl}…`);
  const res = await fetch(`${baseUrl}/api/v1/dev/init`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, businessName, source: "cli" }),
  });
  const body = (await res.json().catch(() => ({}))) as {
    apiKey?: string;
    businessId?: string;
    error?: string;
    message?: string;
  };
  if (!res.ok || !body.apiKey) {
    fail(
      `account provisioning failed (HTTP ${res.status})`,
      body.error ?? body.message ?? "the dev/init endpoint is dev-only; deploy the app or run against a local server",
    );
  }

  const envPath = (args.flags["env-path"] as string | undefined) ?? resolve(process.cwd(), ".env.local");
  const writeMode = (args.flags["env-mode"] as string | undefined) ?? "append";

  const line = `SOCIAL_PERKS_API_KEY=${body.apiKey}\nSOCIAL_PERKS_BUSINESS_ID=${body.businessId ?? ""}\n`;
  if (writeMode === "stdout") {
    console.log(line);
  } else {
    let existing = "";
    try { existing = await fs.readFile(envPath, "utf8"); } catch { /* ok */ }
    const filtered = existing
      .split("\n")
      .filter((l) => !l.startsWith("SOCIAL_PERKS_API_KEY=") && !l.startsWith("SOCIAL_PERKS_BUSINESS_ID="))
      .join("\n");
    const finalContent = (filtered.endsWith("\n") || filtered === "" ? filtered : filtered + "\n") + line;
    await fs.writeFile(envPath, finalContent, { mode: 0o600 });
    console.error(`→ wrote SOCIAL_PERKS_API_KEY to ${envPath}`);
  }

  output_({ apiKey: body.apiKey, businessId: body.businessId, baseUrl }, args.flags.format as string | undefined);
}

function clientFromArgs(args: Args): SocialPerks {
  const apiKey = getApiKey(args.flags);
  if (!apiKey) {
    fail(
      "no SOCIAL_PERKS_API_KEY",
      "run `npx @socialperks/cli init` to create one, or pass --api-key",
    );
  }
  return new SocialPerks({ apiKey, baseUrl: getBaseUrl(args.flags) });
}

async function cmdCampaigns(args: Args): Promise<void> {
  const sp = clientFromArgs(args);
  if (args.sub === "list") {
    const status = args.flags.status as string | undefined;
    output_(await sp.campaigns.list({ status }), args.flags.format as string | undefined);
    return;
  }
  if (args.sub === "create") {
    const platformId = args.flags.platform as string | undefined;
    const actionId = args.flags.action as string | undefined;
    const rewardType = (args.flags["reward-type"] as string | undefined) ?? "pct";
    const rewardValue = args.flags.reward as string | undefined;
    if (!platformId || !actionId || !rewardValue) {
      fail("campaigns create requires --platform, --action, --reward (and optional --reward-type)");
    }
    const created = await sp.campaigns.create({
      platformId,
      actionId,
      rewardType: rewardType as "pct" | "dol" | "free",
      rewardValue,
      name: args.flags.name as string | undefined,
    });
    output_(created, args.flags.format as string | undefined);
    return;
  }
  fail(`unknown campaigns subcommand: ${args.sub ?? "(none)"}`, "try `socialperks campaigns list`");
}

async function cmdActions(args: Args): Promise<void> {
  const sp = clientFromArgs(args);
  if (args.sub !== "list") fail(`unknown actions subcommand: ${args.sub ?? "(none)"}`);
  output_(
    await sp.actions.list({
      platform: args.flags.platform as string | undefined,
      tier: args.flags.tier as never,
      businessType: args.flags["business-type"] as string | undefined,
    }),
    args.flags.format as string | undefined,
  );
}

async function cmdPoster(args: Args): Promise<void> {
  const sp = clientFromArgs(args);
  const campaignId = args.flags.campaign as string | undefined;
  if (!campaignId) fail("poster requires --campaign <id>");
  const url = sp.poster.url({
    campaignId,
    businessName: args.flags["business-name"] as string | undefined,
    perk: args.flags.perk as string | undefined,
  });
  if (args.flags.save) {
    const svg = await sp.poster.fetch({
      campaignId,
      businessName: args.flags["business-name"] as string | undefined,
      perk: args.flags.perk as string | undefined,
    });
    const path = typeof args.flags.save === "string" ? args.flags.save : `poster-${campaignId}.svg`;
    await fs.writeFile(path, svg);
    console.error(`→ saved ${path}`);
  }
  console.log(url);
}

async function cmdSms(args: Args): Promise<void> {
  const sp = clientFromArgs(args);
  const campaignId = args.flags.campaign as string | undefined;
  const phone = args.flags.phone as string | undefined;
  const businessId = (args.flags.business as string | undefined) ?? env.SOCIAL_PERKS_BUSINESS_ID ?? "";
  if (!campaignId || !phone) fail("sms requires --campaign and --phone");
  output_(
    await sp.sms.enqueuePostPurchase({
      campaignId,
      customerPhone: phone,
      businessId,
      delayMinutes: args.flags["delay-minutes"] ? Number(args.flags["delay-minutes"]) : undefined,
    }),
    args.flags.format as string | undefined,
  );
}

async function cmdAi(args: Args): Promise<void> {
  const sp = clientFromArgs(args);
  if (args.sub === "quick-start") {
    output_(
      await sp.ai.quickStart({
        businessType: (args.flags["business-type"] as string | undefined) ?? "coffee_shop",
        budget: args.flags.budget ? Number(args.flags.budget) : undefined,
      }),
      args.flags.format as string | undefined,
    );
    return;
  }
  fail(`unknown ai subcommand: ${args.sub ?? "(none)"}`);
}

async function cmdWhoami(args: Args): Promise<void> {
  const sp = clientFromArgs(args);
  const baseUrl = getBaseUrl(args.flags);
  const apiKey = getApiKey(args.flags)!;
  // Whoami is not part of the SDK explicitly — call the auth route.
  const res = await fetch(`${baseUrl}/api/v1/auth`, {
    headers: { Authorization: `Bearer ${apiKey}`, "X-API-Key": apiKey },
  });
  if (!res.ok) {
    void sp; // keep import live
    fail(`whoami failed (HTTP ${res.status})`, "key may be invalid or expired");
  }
  output_(await res.json().catch(() => ({})), args.flags.format as string | undefined);
}

async function cmdHealth(args: Args): Promise<void> {
  const baseUrl = getBaseUrl(args.flags);
  const res = await fetch(`${baseUrl}/api/v1/health`);
  output_({ status: res.status, ok: res.ok, body: await res.json().catch(() => null) }, args.flags.format as string | undefined);
}

// ─── Main ─────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (!args.command || args.command === "help" || args.command === "--help" || args.flags.help) {
    printHelp();
    return;
  }
  if (args.command === "version" || args.command === "--version" || args.flags.version) {
    console.log(VERSION);
    return;
  }

  try {
    switch (args.command) {
      case "init":      return await cmdInit(args);
      case "whoami":    return await cmdWhoami(args);
      case "campaigns": return await cmdCampaigns(args);
      case "actions":   return await cmdActions(args);
      case "poster":    return await cmdPoster(args);
      case "sms":       return await cmdSms(args);
      case "ai":        return await cmdAi(args);
      case "health":    return await cmdHealth(args);
      default:
        fail(`unknown command: ${args.command}`, "run `socialperks help` for usage");
    }
  } catch (e) {
    if (e instanceof SocialPerksError) {
      fail(`${e.code}: ${e.message}`, e.requestId ? `request-id ${e.requestId}` : undefined);
    }
    fail(e instanceof Error ? e.message : String(e));
  }
}

main();
