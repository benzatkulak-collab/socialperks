// @vitest-environment happy-dom
/**
 * What the founder console shows, given its routes' real answers.
 *
 * Each console page writes out by hand the shape of each answer it reads,
 * and the console's other tests answer with fixtures or empty lists, so
 * nothing compared those shapes with what the routes send:
 *
 * - The home's "Recent Audit Events" is `security.recentAudit` from
 *   `GET /api/v1/admin/stats`: the audit log's own entries, as
 *   `queryAuditLog()` in `src/lib/audit-log.ts` returns them from Postgres or
 *   from the in-memory buffer. An entry carries its time as `timestamp` and
 *   has no id. The page read `occurredAt` and keyed each row by `id`, so every
 *   row showed "Invalid Date", whatever its action, and no row had a key.
 * - The home's "Active Campaigns" is `GET /api/v1/campaigns`. For the founder
 *   it lists every campaign the server holds, as the campaign state machine
 *   keeps it: `completions` is `{ current, max }`. The page took `completions`
 *   for a number and read a `maxCompletions` the route never sends, so a
 *   single active campaign made React throw, and the whole console home was
 *   lost.
 *
 * So the sections these tests look at are not answered by hand: the events
 * and campaigns are recorded with the real `audit()` and `campaignManager`,
 * the real route is asked as the founder, and its answer goes to the real
 * page.
 *
 * All ids, names and emails here are made up.
 */
import { cleanup, render, screen, within } from "@testing-library/react";
import type { ComponentType } from "react";
import { NextRequest } from "next/server";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { GET as getAdminStats } from "@/app/api/v1/admin/stats/route";
import { GET as listCampaigns } from "@/app/api/v1/campaigns/route";
import { audit, _resetAuditLog, type AuditEntry } from "@/lib/audit-log";
import { campaignManager } from "@/lib/campaign-state-machine";
import { signJWT } from "@/lib/auth";
import { fakeApi, listOf, okWith } from "@/__tests__/helpers/fake-api";

/** The founder: an admin with no business of their own. */
const FOUNDER = { id: "usr_test_founder", email: "founder@example.test", role: "admin", businessId: null };

// The console shows a time in the viewer's own zone. Pin one, so that the
// expected text can be written out by hand. March 2026 is EST (UTC-5).
const zoneBefore = process.env.TZ;
beforeAll(() => {
  process.env.TZ = "America/New_York";
});
afterAll(() => {
  if (zoneBefore === undefined) delete process.env.TZ;
  else process.env.TZ = zoneBefore;
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  _resetAuditLog();
  campaignManager._reset();
});

/** Runs `fn` with the server's clock at `time`. */
async function at<T>(time: string, fn: () => T | Promise<T>): Promise<T> {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(time));
  try {
    return await fn();
  } finally {
    vi.useRealTimers();
  }
}

let requestCount = 0;

/** Asks a real route as the founder. Returns its answer, as the browser gets it. */
async function askAsFounder(route: (req: NextRequest) => Promise<Response>, path: string): Promise<Response> {
  requestCount += 1;
  const token = signJWT({
    sub: FOUNDER.id,
    role: FOUNDER.role,
    email: FOUNDER.email,
    businessId: FOUNDER.businessId,
    type: "access",
  });
  const res = await route(
    new NextRequest(`http://localhost${path}`, {
      headers: {
        authorization: `Bearer ${token}`,
        "x-nf-client-connection-ip": `10.30.0.${requestCount}`,
      },
    })
  );
  expect(res.status).toBe(200);
  return res;
}

/** Records each event at its own time, as the routes do with audit(). */
async function recordEvents(events: Array<{ at: string; entry: AuditEntry }>): Promise<void> {
  // audit() also writes each entry to the console as a structured log line.
  const auditLogLines = vi.spyOn(console, "warn").mockImplementation(() => {});
  for (const event of events) await at(event.at, () => audit(event.entry));
  auditLogLines.mockRestore();
}

/** Launches an active campaign and records `completed` approved completions. */
function activeCampaign(id: string, name: string, maxCompletions: number | null, completed: number): void {
  campaignManager.launch(id, "biz_test_owner", {
    name,
    budgetAllocated: 10,
    budgetType: "pct",
    maxCompletions,
    expiresInDays: 30,
    actions: ["ig_st"],
  });
  for (let i = 0; i < completed; i++) campaignManager.recordCompletion(id);
}

/** The stats route's answer for the audit log as it is now. */
function statsNow(): Promise<Response> {
  return askAsFounder(getAdminStats, "/api/v1/admin/stats");
}

/** The campaigns route's answer, for the campaigns the server holds now. */
function campaignsNow(): Promise<Response> {
  return askAsFounder(listCampaigns, "/api/v1/campaigns");
}

/**
 * Opens a console page in a freshly loaded tab, signed in as the founder,
 * with each route's one answer given.
 *
 * Returns what React logs as errors meanwhile. A list row with no key is one
 * of them, but React reports it once per component in a whole test run, in
 * whichever test renders first, so every test here checks the log.
 */
async function openPage(load: () => Promise<{ default: ComponentType }>, answers: Record<string, Response>) {
  const reactErrors = vi.spyOn(console, "error");
  fakeApi({
    "GET /api/v1/auth": [okWith({ user: FOUNDER, expiresAt: null })],
    ...Object.fromEntries(Object.entries(answers).map(([route, res]) => [route, [() => res]])),
  });
  vi.resetModules();
  const { AdminGuard } = await import("@/components/admin/admin-guard");
  const { default: Page } = await load();
  render(
    <AdminGuard>
      <Page />
    </AdminGuard>
  );
  return reactErrors;
}

/** `GET /api/v1/admin/system` while the server is healthy. */
const systemHealth = {
  status: "ok",
  timestamp: "2026-03-02T15:10:00.000Z",
  node: "v22.0.0",
  platform: "linux",
  uptimeSeconds: 3600,
  pid: 1,
  database: { connected: true },
  memory: { rssMB: 160, heapUsedMB: 80, heapTotalMB: 120, externalMB: 4 },
  cpu: { userMicros: 1000, systemMicros: 500 },
};

/** The console home, with these stats and campaigns answers and nothing else to show. */
function openHome(answers: { stats: Response; campaigns: Response }) {
  return openPage(() => import("../page"), {
    "GET /api/v1/campaigns": answers.campaigns,
    "GET /api/v1/submissions": listOf("submissions", [])(),
    "GET /api/v1/admin/system": okWith(systemHealth)(),
    "GET /api/v1/admin/stats": answers.stats,
    "GET /api/v1/admin/agents": okWith({ agents: [] })(),
  });
}

/** The value shown above a stat's label, or null with no such stat. */
function statValue(container: HTMLElement, label: string): string | null {
  return within(container).queryByText(label)?.previousElementSibling?.textContent ?? null;
}

describe("/admin: Recent Audit Events", () => {
  /** The rows, newest first: When, Action, Actor, Status. */
  async function auditRows(): Promise<string[][]> {
    const heading = await screen.findByRole("heading", { name: "Recent Audit Events" });
    const [, ...rows] = within(heading.closest("section")!).getAllByRole("row");
    return rows.map((row) => within(row).getAllByRole("cell").map((cell) => cell.textContent ?? ""));
  }

  /** What the review route records when the founder approves a submission. */
  function founderApproval(submissionId: string): AuditEntry {
    return {
      action: "admin.submission.reviewed",
      actor: `user:${FOUNDER.id}`,
      businessId: "biz_test_owner",
      resourceId: `submission:${submissionId}`,
      ok: true,
      meta: { decision: "approve", campaignId: "camp_test_owner" },
    };
  }

  it("shows when each event happened, whatever its action", async () => {
    await recordEvents([
      { at: "2026-03-02T14:58:00.000Z", entry: { action: "auth.login_success", actor: `user:${FOUNDER.id}`, ok: true } },
      { at: "2026-03-02T15:04:00.000Z", entry: founderApproval("sub_test_1") },
      { at: "2026-03-02T15:07:00.000Z", entry: { action: "api_key.verification_failed", actor: "api-key:key_test_1", ok: false } },
    ]);
    const stats = await at("2026-03-02T15:10:00.000Z", statsNow);
    const reactErrors = await openHome({ stats, campaigns: await campaignsNow() });

    expect(await auditRows()).toEqual([
      ["Mar 2, 10:07 AM", "api_key.verification_failed", "api-key:key_test_1", "failed"],
      ["Mar 2, 10:04 AM", "admin.submission.reviewed", "user:usr_test_founder", "ok"],
      ["Mar 2, 09:58 AM", "auth.login_success", "user:usr_test_founder", "ok"],
    ]);
    expect(reactErrors).not.toHaveBeenCalled();
  });

  it("gives two events of the same millisecond a row each, and each row its own key", async () => {
    // Two approvals one after the other can be stamped with the same time.
    // Two rows with one key is an error React reports every time.
    await recordEvents([
      { at: "2026-03-02T15:04:00.000Z", entry: founderApproval("sub_test_1") },
      { at: "2026-03-02T15:04:00.000Z", entry: founderApproval("sub_test_2") },
    ]);
    const stats = await at("2026-03-02T15:10:00.000Z", statsNow);
    const reactErrors = await openHome({ stats, campaigns: await campaignsNow() });

    expect(await auditRows()).toEqual([
      ["Mar 2, 10:04 AM", "admin.submission.reviewed", "user:usr_test_founder", "ok"],
      ["Mar 2, 10:04 AM", "admin.submission.reviewed", "user:usr_test_founder", "ok"],
    ]);
    expect(reactErrors).not.toHaveBeenCalled();
  });
});

describe("/admin: Active Campaigns", () => {
  /** Each card in the list, in the order shown: its name, completions and limit. */
  async function campaignCards() {
    const list = (await screen.findByRole("heading", { name: "Active Campaigns" })).nextElementSibling!;
    return Array.from(list.children as HTMLCollectionOf<HTMLElement>).map((card) => ({
      name: card.querySelector("p")?.textContent,
      completions: statValue(card, "Completions"),
      max: statValue(card, "Max"),
    }));
  }

  it("shows each active campaign's completions and limit, most completed first", async () => {
    activeCampaign("camp_test_unlimited", "Open Reel Shout-out", null, 1);
    activeCampaign("camp_test_limited", "Spring Story Tag", 50, 3);
    const reactErrors = await openHome({ stats: await statsNow(), campaigns: await campaignsNow() });

    expect(await campaignCards()).toEqual([
      { name: "Spring Story Tag", completions: "3", max: "50" },
      { name: "Open Reel Shout-out", completions: "1", max: null },
    ]);
    expect(reactErrors).not.toHaveBeenCalled();
  });
});
