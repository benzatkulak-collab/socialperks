// @vitest-environment happy-dom
/**
 * The founder console's writes go through apiFetch, as its reads already do.
 *
 * apiFetch sends the CSRF token a write needs, and on a 401 it renews the
 * 15-minute access cookie and sends the write once more. A plain fetch()
 * does neither. So, before this:
 * - approve and reject (`/admin`, `/admin/submissions`) and issuing a key
 *   (`/admin/api-keys`) were refused with 403 CSRF_TOKEN_MISSING, whatever
 *   the cookie's age, by any caller who got as far as the CSRF check;
 * - every other console write failed with 401 once the access cookie had
 *   run out, unless the page's own polling had renewed it first.
 *
 * Each test renders the real page inside the real AdminGuard and answers its
 * requests from the fake API, with the bodies the real routes send.
 * `fakeSession` checks the cookie and, where the real route does, the CSRF
 * token, so the requests a test sees are the ones a browser would send.
 * Test data only.
 */
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ComponentType } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ANONYMOUS_CSRF,
  type Answer,
  errorWith,
  fakeApi,
  fakeSession,
  jsonResponse,
  listOf,
  okWith,
  SIGNED_IN_CSRF,
  testCampaign,
  testSubmission,
  times,
} from "@/__tests__/helpers/fake-api";

type FakeApi = ReturnType<typeof fakeApi>;

/**
 * The signed-in admin: the owner of the test campaign, given the admin role.
 * The review route checks the caller's business before the CSRF token, and
 * lets a reviewer act only on its own business's campaigns, so this is the
 * kind of admin it lets through. The founder account has no business: the
 * route refuses it with 403 NO_TENANT before it looks at a token.
 */
const admin = { id: "usr_test_1", email: "owner@example.test", role: "admin", businessId: testCampaign.businessId };

/** `GET /api/v1/auth`: AdminGuard's session check. */
const adminSession = okWith({ user: admin, expiresAt: null });

let alerts: string[];

beforeEach(() => {
  alerts = [];
  vi.spyOn(window, "alert").mockImplementation((message?: unknown) => {
    alerts.push(String(message));
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

/**
 * Open a console page in a freshly loaded tab. apiFetch keeps its CSRF token
 * and its refresh state for as long as a tab is open, so each test loads the
 * modules again. The page renders inside the real AdminGuard, which signs
 * the admin in from `GET /api/v1/auth`.
 */
async function openPage(load: () => Promise<{ default: ComponentType }>): Promise<void> {
  vi.resetModules();
  const { AdminGuard } = await import("@/components/admin/admin-guard");
  const { default: Page } = await load();
  render(
    <AdminGuard>
      <Page />
    </AdminGuard>
  );
}

/** What a test sent besides reads, plus each token fetch: "METHOD /path token". */
function writeLog(api: FakeApi): string[] {
  return api.requests
    .filter((r) => r.method !== "GET" || r.path === "/api/v1/csrf")
    .map((r) => [r.method, r.path, r.headers.get("X-CSRF-Token")].filter(Boolean).join(" "));
}

/**
 * The first write of a tab whose cookie has run out, to a route that checks
 * no CSRF token: the token is fetched while signed out, the write gets 401,
 * one refresh, and the same write goes again and gets through. Returns the
 * two attempts.
 */
function expectRenewedWrite(api: FakeApi, route: string) {
  expect(writeLog(api)).toEqual([
    "GET /api/v1/csrf",
    `${route} ${ANONYMOUS_CSRF}`,
    "POST /api/v1/auth",
    `${route} ${ANONYMOUS_CSRF}`,
  ]);
  expect(api.sent("POST /api/v1/auth").map((r) => r.body)).toEqual([{ action: "refresh" }]);
  const attempts = api.sent(route);
  expect(attempts[1].body).toEqual(attempts[0].body);
  return attempts;
}

// ─── Submissions and their review ───────────────────────────────────────────

const pendingSubmission = {
  ...testSubmission,
  id: "sub_test_pending_1",
  status: "pending",
  reviewedAt: null,
  reviewedBy: null,
  perkAwarded: false,
};
const secondPendingSubmission = { ...pendingSubmission, id: "sub_test_pending_2", userId: "usr_test_3" };

/** `POST /api/v1/submissions/review` once its checks pass: the reviewed submission. */
const reviewed: Answer = (req) => {
  const { submissionId, decision } = req.body as { submissionId: string; decision: "approve" | "reject" };
  const submission = [pendingSubmission, secondPendingSubmission].find((s) => s.id === submissionId)!;
  return okWith({
    submission: {
      ...submission,
      status: decision === "approve" ? "approved" : "rejected",
      reviewedAt: "2026-03-02T10:00:00.000Z",
      reviewedBy: admin.id,
    },
    perk: null,
  })();
};

describe("/admin (console home)", () => {
  const systemHealth = {
    status: "ok",
    timestamp: "2026-03-02T09:00:00.000Z",
    node: "v22.0.0",
    platform: "linux",
    uptimeSeconds: 3600,
    pid: 1,
    database: { connected: true },
    memory: { rssMB: 160, heapUsedMB: 80, heapTotalMB: 120, externalMB: 4 },
    cpu: { userMicros: 1000, systemMicros: 500 },
  };
  const adminStats = {
    users: { total: 3, businesses: 1, enterprises: 0, influencers: 1, admins: 1 },
    security: { auditFailures24h: 0, recentAudit: [] },
  };

  /** What the home page reads when it opens. */
  function homeReads(): Record<string, Answer[]> {
    return {
      "GET /api/v1/auth": [adminSession],
      "GET /api/v1/campaigns": [listOf("campaigns", [])],
      "GET /api/v1/submissions": [listOf("submissions", [pendingSubmission])],
      "GET /api/v1/admin/system": [okWith(systemHealth)],
      "GET /api/v1/admin/stats": [okWith(adminStats)],
      "GET /api/v1/admin/agents": [okWith({ agents: [] })],
    };
  }

  it("Approve sends the CSRF token the review route asks for", async () => {
    const session = fakeSession(admin);
    const api = fakeApi({
      ...homeReads(),
      "GET /api/v1/csrf": [session.csrf],
      "POST /api/v1/submissions/review": [session.signedInThenCsrf(reviewed)],
    });
    await openPage(() => import("../page"));

    const approve = await screen.findByRole("button", { name: "Approve" });
    const row = approve.closest("tr")!;
    fireEvent.click(approve);

    expect(await within(row).findByText("approved")).toBeInTheDocument();
    expect(writeLog(api)).toEqual(["GET /api/v1/csrf", `POST /api/v1/submissions/review ${SIGNED_IN_CSRF}`]);
    expect(api.sent("POST /api/v1/submissions/review")[0].body).toMatchObject({
      submissionId: "sub_test_pending_1",
      decision: "approve",
    });
  });

  it("Reject once the access cookie has run out renews it, gets a new token and rejects", async () => {
    const session = fakeSession(admin);
    const api = fakeApi({
      ...homeReads(),
      "GET /api/v1/csrf": times(2, session.csrf),
      "POST /api/v1/submissions/review": times(3, session.signedInThenCsrf(reviewed)),
      "POST /api/v1/auth": [session.refresh],
    });
    await openPage(() => import("../page"));

    const reject = await screen.findByRole("button", { name: "Reject" });
    const row = reject.closest("tr")!;
    session.expire();
    fireEvent.click(reject);

    expect(await within(row).findByText("rejected")).toBeInTheDocument();
    expect(writeLog(api)).toEqual([
      "GET /api/v1/csrf", // issued while signed out
      `POST /api/v1/submissions/review ${ANONYMOUS_CSRF}`, // 401: the cookie has run out
      "POST /api/v1/auth", // the refresh
      `POST /api/v1/submissions/review ${ANONYMOUS_CSRF}`, // 403: that token belongs to nobody
      "GET /api/v1/csrf",
      `POST /api/v1/submissions/review ${SIGNED_IN_CSRF}`,
    ]);
  });
});

describe("/admin/submissions", () => {
  it("the drawer's Reject sends the CSRF token and the note", async () => {
    const session = fakeSession(admin);
    const api = fakeApi({
      "GET /api/v1/auth": [adminSession],
      "GET /api/v1/submissions": [listOf("submissions", [pendingSubmission])],
      "GET /api/v1/csrf": [session.csrf],
      "POST /api/v1/submissions/review": [session.signedInThenCsrf(reviewed)],
    });
    await openPage(() => import("../submissions/page"));

    fireEvent.click(await screen.findByText(/^sub_test_pending/));
    fireEvent.change(screen.getByPlaceholderText("Note (optional, logged to audit)"), {
      target: { value: "The proof link shows no tag" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Reject" }));

    expect(await screen.findByText("Override prior decision")).toBeInTheDocument();
    expect(alerts).toEqual([]);
    expect(writeLog(api)).toEqual(["GET /api/v1/csrf", `POST /api/v1/submissions/review ${SIGNED_IN_CSRF}`]);
    expect(api.sent("POST /api/v1/submissions/review")[0].body).toMatchObject({
      submissionId: "sub_test_pending_1",
      decision: "reject",
      note: "The proof link shows no tag",
    });
  });

  it("bulk Approve sends every selected submission with the one CSRF token", async () => {
    const session = fakeSession(admin);
    const api = fakeApi({
      "GET /api/v1/auth": [adminSession],
      "GET /api/v1/submissions": [
        listOf("submissions", [pendingSubmission, secondPendingSubmission]),
        listOf("submissions", []),
      ],
      "GET /api/v1/csrf": [session.csrf],
      "POST /api/v1/submissions/review": times(2, session.signedInThenCsrf(reviewed)),
    });
    await openPage(() => import("../submissions/page"));

    fireEvent.click(await screen.findByRole("button", { name: "Select all pending (2)" }));
    fireEvent.click(screen.getByRole("button", { name: "Approve 2" }));

    await waitFor(() => expect(alerts).toEqual(["Approved 2 / 2"]));
    await waitFor(() => expect(api.sent("GET /api/v1/submissions")).toHaveLength(2));
    expect(writeLog(api)).toEqual([
      "GET /api/v1/csrf",
      `POST /api/v1/submissions/review ${SIGNED_IN_CSRF}`,
      `POST /api/v1/submissions/review ${SIGNED_IN_CSRF}`,
    ]);
    const reviewedIds = api.sent("POST /api/v1/submissions/review").map((r) => (r.body as { submissionId: string }).submissionId);
    expect(reviewedIds.sort()).toEqual(["sub_test_pending_1", "sub_test_pending_2"]);
  });

  it("bulk Approve once the access cookie has run out renews it once for the whole batch", async () => {
    const session = fakeSession(admin);
    const api = fakeApi({
      "GET /api/v1/auth": [adminSession],
      "GET /api/v1/submissions": [
        listOf("submissions", [pendingSubmission, secondPendingSubmission]),
        listOf("submissions", []),
      ],
      "GET /api/v1/csrf": times(2, session.csrf),
      "POST /api/v1/submissions/review": times(4, session.signedInThenCsrf(reviewed)),
      "POST /api/v1/auth": [session.refresh],
    });
    await openPage(() => import("../submissions/page"));

    fireEvent.click(await screen.findByRole("button", { name: "Select all pending (2)" }));
    session.expire();
    fireEvent.click(screen.getByRole("button", { name: "Approve 2" }));

    await waitFor(() => expect(alerts).toEqual(["Approved 2 / 2"]));
    await waitFor(() => expect(api.sent("GET /api/v1/submissions")).toHaveLength(2));
    expect(writeLog(api)).toEqual([
      "GET /api/v1/csrf",
      `POST /api/v1/submissions/review ${ANONYMOUS_CSRF}`, // 401
      "POST /api/v1/auth",
      `POST /api/v1/submissions/review ${ANONYMOUS_CSRF}`, // 403: that token belongs to nobody
      "GET /api/v1/csrf",
      `POST /api/v1/submissions/review ${SIGNED_IN_CSRF}`, // the first submission
      `POST /api/v1/submissions/review ${SIGNED_IN_CSRF}`, // the second, with no new refresh
    ]);
  });
});

// ─── Accounts ───────────────────────────────────────────────────────────────

describe("/admin/users", () => {
  const member = {
    id: "usr_test_2",
    email: "member@example.test",
    name: "Test Member",
    role: "business",
    businessId: "biz_usr_test_2",
    suspendedAt: null as string | null,
    suspensionReason: null as string | null,
    createdAt: "2026-03-01T15:00:00.000Z",
  };
  const suspendedMember = {
    ...member,
    suspendedAt: "2026-03-02T10:00:00.000Z",
    suspensionReason: "Repeated fake proofs",
  };

  /** `GET /api/v1/admin/users`: one page of accounts plus the counts. */
  function userList(users: Array<typeof member>): Answer {
    return okWith({
      users,
      total: users.length,
      page: 1,
      perPage: 25,
      counts: {
        total: users.length,
        byRole: { business: users.length, influencer: 0, enterprise: 0, admin: 0 },
        suspended: users.filter((u) => u.suspendedAt).length,
      },
      totalPages: 1,
    });
  }

  it("Suspend once the access cookie has run out renews it and suspends the account", async () => {
    const session = fakeSession(admin);
    const api = fakeApi({
      "GET /api/v1/auth": [adminSession],
      "GET /api/v1/admin/users": [userList([member]), userList([suspendedMember])],
      "GET /api/v1/csrf": [session.csrf],
      "PATCH /api/v1/admin/users": times(2, session.signedIn(okWith({ user: suspendedMember }))),
      "POST /api/v1/auth": [session.refresh],
    });
    await openPage(() => import("../users/page"));

    fireEvent.click(await screen.findByText("member@example.test"));
    fireEvent.change(screen.getByPlaceholderText("Reason for suspension (logged to audit)"), {
      target: { value: "Repeated fake proofs" },
    });
    session.expire();
    fireEvent.click(screen.getByRole("button", { name: "Suspend account" }));

    expect(await screen.findByRole("button", { name: "Unsuspend" })).toBeInTheDocument();
    await waitFor(() => expect(api.sent("GET /api/v1/admin/users")).toHaveLength(2));
    expect(alerts).toEqual([]);
    const [patch] = expectRenewedWrite(api, "PATCH /api/v1/admin/users");
    expect(patch.body).toEqual({ email: "member@example.test", action: "suspend", reason: "Repeated fake proofs" });
  });

  it("Sign in as once the access cookie has run out renews it and signs in as the account", async () => {
    const location = { href: "http://localhost:3000/admin/users" };
    vi.stubGlobal("location", location);
    const session = fakeSession(admin);
    const api = fakeApi({
      "GET /api/v1/auth": [adminSession],
      "GET /api/v1/admin/users": [userList([member])],
      "GET /api/v1/csrf": [session.csrf],
      "POST /api/v1/admin/impersonate": times(
        2,
        session.signedIn(
          okWith({
            impersonating: { id: member.id, email: member.email, role: member.role, businessId: member.businessId },
          })
        )
      ),
      "POST /api/v1/auth": [session.refresh],
    });
    await openPage(() => import("../users/page"));

    fireEvent.click(await screen.findByText("member@example.test"));
    session.expire();
    fireEvent.click(screen.getByRole("button", { name: "Sign in as member@example.test" }));

    await waitFor(() => expect(location.href).toBe("/"));
    expect(alerts).toEqual([]);
    const [impersonate] = expectRenewedWrite(api, "POST /api/v1/admin/impersonate");
    expect(impersonate.body).toEqual({ email: "member@example.test" });
  });
});

// ─── Agents ─────────────────────────────────────────────────────────────────

/** One agent as `GET /api/v1/admin/agents` lists it (values from fraud-sentinel.ts). */
const fraudSentinel = {
  id: "fraud-sentinel",
  name: "Fraud Sentinel",
  description: "Scores users for abuse signals and auto-suspends high-risk accounts above threshold.",
  intervalSeconds: 300,
  configSpec: {
    threshold: { min: 0.5, max: 0.99, default: 0.85, step: 0.01 },
    maxActionsPerRun: { min: 1, max: 50, default: 10 },
    custom: {
      autoSuspendAbove: { label: "Auto-suspend risk-score above", min: 0.5, max: 0.99, default: 0.8, step: 0.01 },
      minSubmissionsForScoring: { label: "Min submissions before scoring", min: 1, max: 50, default: 5, step: 1 },
    },
  },
  mode: "dry-run",
  status: "idle",
  config: { threshold: 0.85, maxActionsPerRun: 10, custom: { autoSuspendAbove: 0.8, minSubmissionsForScoring: 5 } },
  lastRunAt: null,
  lastReport: null,
  recentDecisions: [],
};

/** The same, for compliance-watchdog.ts. */
const complianceWatchdog = {
  ...fraudSentinel,
  id: "compliance-watchdog",
  name: "Compliance Watchdog",
  description: "Scans approved submissions for FTC disclosure markers; flags ones missing required disclosures.",
  intervalSeconds: 3600,
  configSpec: {
    threshold: { min: 0.5, max: 1, default: 0.9, step: 0.05 },
    maxActionsPerRun: { min: 1, max: 100, default: 25 },
    custom: { lookbackDays: { label: "How many days back to scan", min: 1, max: 30, default: 7, step: 1 } },
  },
  config: { threshold: 0.9, maxActionsPerRun: 25, custom: { lookbackDays: 7 } },
};

const agentList = (...agents: unknown[]) => okWith({ agents });

/** `POST /api/v1/admin/agents {action: "run"}`: the run's report. */
const runReport = okWith({
  report: {
    startedAt: "2026-03-02T10:00:00.000Z",
    finishedAt: "2026-03-02T10:00:01.000Z",
    durationMs: 1000,
    scanned: 0,
    decisions: [],
    errored: false,
  },
});

describe("/admin/agents", () => {
  it("switching an agent's mode once the access cookie has run out renews it and switches", async () => {
    const session = fakeSession(admin);
    const api = fakeApi({
      "GET /api/v1/auth": [adminSession],
      "GET /api/v1/admin/agents": [agentList(fraudSentinel), agentList({ ...fraudSentinel, mode: "live" })],
      "GET /api/v1/csrf": [session.csrf],
      "PATCH /api/v1/admin/agents": times(2, session.signedIn(okWith({ mode: "live", config: fraudSentinel.config }))),
      "POST /api/v1/auth": [session.refresh],
    });
    await openPage(() => import("../agents/page"));

    const live = await screen.findByRole("button", { name: "live" });
    session.expire();
    fireEvent.click(live);

    await waitFor(() => expect(api.sent("GET /api/v1/admin/agents")).toHaveLength(2));
    await waitFor(() => expect(screen.getByRole("button", { name: "live" })).toBeDisabled());
    const [patch] = expectRenewedWrite(api, "PATCH /api/v1/admin/agents");
    expect(patch.body).toEqual({ agentId: "fraud-sentinel", mode: "live" });
  });

  it("moving a config slider once the access cookie has run out renews it and saves the value", async () => {
    const tuned = { ...fraudSentinel.config, threshold: 0.9 };
    const session = fakeSession(admin);
    const api = fakeApi({
      "GET /api/v1/auth": [adminSession],
      "GET /api/v1/admin/agents": [agentList(fraudSentinel), agentList({ ...fraudSentinel, config: tuned })],
      "GET /api/v1/csrf": [session.csrf],
      "PATCH /api/v1/admin/agents": times(2, session.signedIn(okWith({ mode: "dry-run", config: tuned }))),
      "POST /api/v1/auth": [session.refresh],
    });
    await openPage(() => import("../agents/page"));

    fireEvent.click(await screen.findByRole("button", { name: "Configure" }));
    const threshold = screen.getAllByRole("slider")[0];
    session.expire();
    fireEvent.change(threshold, { target: { value: "0.9" } });
    fireEvent.mouseUp(threshold);

    await waitFor(() => expect(api.sent("GET /api/v1/admin/agents")).toHaveLength(2));
    const [patch] = expectRenewedWrite(api, "PATCH /api/v1/admin/agents");
    expect(patch.body).toEqual({ agentId: "fraud-sentinel", config: { threshold: 0.9 } });
  });

  it("Run now once the access cookie has run out renews it and runs the agent", async () => {
    const session = fakeSession(admin);
    const api = fakeApi({
      "GET /api/v1/auth": [adminSession],
      "GET /api/v1/admin/agents": [agentList(fraudSentinel), agentList(fraudSentinel)],
      "GET /api/v1/csrf": [session.csrf],
      "POST /api/v1/admin/agents": times(2, session.signedIn(runReport)),
      "POST /api/v1/auth": [session.refresh],
    });
    await openPage(() => import("../agents/page"));

    const runNow = await screen.findByRole("button", { name: "Run now" });
    session.expire();
    fireEvent.click(runNow);

    await waitFor(() => expect(api.sent("GET /api/v1/admin/agents")).toHaveLength(2));
    const [run] = expectRenewedWrite(api, "POST /api/v1/admin/agents");
    expect(run.body).toEqual({ agentId: "fraud-sentinel", action: "run" });
  });
});

describe("/admin/fraud", () => {
  it("Run agent now once the access cookie has run out renews it and runs Fraud Sentinel", async () => {
    const session = fakeSession(admin);
    const api = fakeApi({
      "GET /api/v1/auth": [adminSession],
      "GET /api/v1/admin/agents": [agentList(fraudSentinel), agentList(fraudSentinel)],
      "GET /api/v1/csrf": [session.csrf],
      "POST /api/v1/admin/agents": times(2, session.signedIn(runReport)),
      "POST /api/v1/auth": [session.refresh],
    });
    await openPage(() => import("../fraud/page"));

    const runNow = await screen.findByRole("button", { name: "Run agent now" });
    session.expire();
    fireEvent.click(runNow);

    await waitFor(() => expect(api.sent("GET /api/v1/admin/agents")).toHaveLength(2));
    const [run] = expectRenewedWrite(api, "POST /api/v1/admin/agents");
    expect(run.body).toEqual({ agentId: "fraud-sentinel", action: "run" });
  });
});

describe("/admin/compliance", () => {
  it("Run scan once the access cookie has run out renews it and runs Compliance Watchdog", async () => {
    const session = fakeSession(admin);
    const api = fakeApi({
      "GET /api/v1/auth": [adminSession],
      "GET /api/v1/admin/agents": [agentList(complianceWatchdog), agentList(complianceWatchdog)],
      "GET /api/v1/csrf": [session.csrf],
      "POST /api/v1/admin/agents": times(2, session.signedIn(runReport)),
      "POST /api/v1/auth": [session.refresh],
    });
    await openPage(() => import("../compliance/page"));

    const runScan = await screen.findByRole("button", { name: "Run scan" });
    session.expire();
    fireEvent.click(runScan);

    await waitFor(() => expect(api.sent("GET /api/v1/admin/agents")).toHaveLength(2));
    const [run] = expectRenewedWrite(api, "POST /api/v1/admin/agents");
    expect(run.body).toEqual({ agentId: "compliance-watchdog", action: "run" });
  });
});

// ─── Flags, campaigns and keys ──────────────────────────────────────────────

describe("/admin/feature-flags", () => {
  it("a flag toggle once the access cookie has run out renews it before the toggle goes again", async () => {
    const session = fakeSession(admin);
    const api = fakeApi({
      "GET /api/v1/auth": [adminSession],
      "GET /api/v1/flags": [okWith({ "test-flag": true }), okWith({ "test-flag": true })],
      "GET /api/v1/csrf": [session.csrf],
      // The flags route answers 400 to this body today, because the toggle
      // sends no `action`. That is a separate bug; this checks the renewal.
      "POST /api/v1/flags": times(
        2,
        session.signedIn(errorWith(400, "INVALID_ACTION", "Action must be one of: create, update, delete, list, get"))
      ),
      "POST /api/v1/auth": [session.refresh],
    });
    await openPage(() => import("../feature-flags/page"));

    const disable = await screen.findByRole("button", { name: "Disable" });
    session.expire();
    fireEvent.click(disable);

    await waitFor(() => expect(api.sent("GET /api/v1/flags")).toHaveLength(2));
    const [toggle] = expectRenewedWrite(api, "POST /api/v1/flags");
    expect(toggle.body).toEqual({ flagId: "test-flag", value: false });
  });
});

const pausedCampaign = {
  ...testCampaign,
  state: "paused",
  transitions: [
    ...testCampaign.transitions,
    {
      from: "active",
      to: "paused",
      triggeredBy: `admin:${admin.id}`,
      reason: "Paused while the shop is closed",
      timestamp: "2026-03-02T10:00:00.000Z",
    },
  ],
};

describe("/admin/campaigns", () => {
  it("Pause once the access cookie has run out renews it and pauses the campaign", async () => {
    const session = fakeSession(admin);
    const api = fakeApi({
      "GET /api/v1/auth": [adminSession],
      "GET /api/v1/campaigns": [listOf("campaigns", [testCampaign]), listOf("campaigns", [pausedCampaign])],
      "GET /api/v1/csrf": [session.csrf],
      "POST /api/v1/admin/campaigns": times(2, session.signedIn(okWith({ campaign: pausedCampaign }))),
      "POST /api/v1/auth": [session.refresh],
    });
    await openPage(() => import("../campaigns/page"));

    fireEvent.click(await screen.findByRole("button", { name: /Manage/ }));
    fireEvent.change(screen.getByPlaceholderText("Reason (logged to audit)"), {
      target: { value: "Paused while the shop is closed" },
    });
    session.expire();
    fireEvent.click(screen.getByRole("button", { name: "Pause" }));

    await waitFor(() => expect(screen.getByRole("button", { name: "Resume" })).toBeEnabled());
    await waitFor(() => expect(api.sent("GET /api/v1/campaigns")).toHaveLength(2));
    expect(alerts).toEqual([]);
    const [pause] = expectRenewedWrite(api, "POST /api/v1/admin/campaigns");
    expect(pause.body).toEqual({ campaignId: "cmp_test_1", action: "pause", reason: "Paused while the shop is closed" });
  });
});

describe("/admin/api-keys", () => {
  const issuedKey = {
    id: "key_test_1",
    agentName: "Test Agent",
    keyPrefix: "sp_test_0123",
    env: "test",
    permissions: ["read"],
    active: true,
    lastUsedAt: null,
    createdAt: "2026-03-02T10:00:00.000Z",
    expiresAt: null,
  };

  /** `POST /api/v1/api-keys` once its checks pass: 201, with the key's plaintext in `key`, sent this once. */
  const keyCreated: Answer = () =>
    jsonResponse(201, {
      success: true,
      data: {
        key: "sp_test_0123456789abcdef0123456789abcdef",
        id: issuedKey.id,
        keyPrefix: issuedKey.keyPrefix,
        env: issuedKey.env,
        agentName: issuedKey.agentName,
        permissions: issuedKey.permissions,
        createdAt: issuedKey.createdAt,
        expiresAt: issuedKey.expiresAt,
        warning:
          "This is the only time this key will be shown. Store it securely (e.g. environment variable). If lost, revoke and create a new one.",
      },
    });

  async function issueKey(): Promise<void> {
    fireEvent.change(await screen.findByPlaceholderText("Agent / integration name"), {
      target: { value: "Test Agent" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Issue" }));
  }

  it("Issue once the access cookie has run out renews it, gets a new token and issues the key", async () => {
    const session = fakeSession(admin);
    const api = fakeApi({
      "GET /api/v1/auth": [adminSession],
      "GET /api/v1/api-keys": [okWith({ keys: [] }), okWith({ keys: [issuedKey] })],
      "GET /api/v1/csrf": times(2, session.csrf),
      "POST /api/v1/api-keys": times(3, session.csrfThenSignedIn(keyCreated)),
      "POST /api/v1/auth": [session.refresh],
    });
    await openPage(() => import("../api-keys/page"));
    await screen.findByPlaceholderText("Agent / integration name");
    session.expire();
    await issueKey();

    await waitFor(() => expect(api.sent("GET /api/v1/api-keys")).toHaveLength(2));
    expect(alerts).toEqual([]);
    expect(writeLog(api)).toEqual([
      "GET /api/v1/csrf", // issued while signed out
      `POST /api/v1/api-keys ${ANONYMOUS_CSRF}`, // the token passes (signed out both times), then 401
      "POST /api/v1/auth",
      `POST /api/v1/api-keys ${ANONYMOUS_CSRF}`, // 403: signed in now, so that token belongs to nobody
      "GET /api/v1/csrf",
      `POST /api/v1/api-keys ${SIGNED_IN_CSRF}`,
    ]);
    expect(api.sent("POST /api/v1/api-keys")[2].body).toMatchObject({ agentName: "Test Agent", permissions: ["read"] });
  });

  it("shows the new key's plaintext, which the route sends only this once", async () => {
    const session = fakeSession(admin);
    fakeApi({
      "GET /api/v1/auth": [adminSession],
      "GET /api/v1/api-keys": [okWith({ keys: [] }), okWith({ keys: [issuedKey] })],
      "GET /api/v1/csrf": [session.csrf],
      "POST /api/v1/api-keys": [session.csrfThenSignedIn(keyCreated)],
    });
    await openPage(() => import("../api-keys/page"));
    await issueKey();

    expect(await screen.findByText("sp_test_0123456789abcdef0123456789abcdef")).toBeInTheDocument();
  });
});

// ─── When the CSRF token cannot be had ──────────────────────────────────────

describe("a write whose CSRF token request is refused", () => {
  // apiFetch fetches a token before a tab's first write and throws when
  // GET /api/v1/csrf refuses, for example over its limit of 30 a minute per
  // address. The write is never sent. The page must not stay busy.
  const tokenRefused = errorWith(429, "RATE_LIMIT_EXCEEDED", "Too many requests");

  it("/admin/agents: Run now, a mode button and a slider are usable again, and the list is read again", async () => {
    const api = fakeApi({
      "GET /api/v1/auth": [adminSession],
      "GET /api/v1/admin/agents": times(4, agentList(fraudSentinel)),
      "GET /api/v1/csrf": times(3, tokenRefused),
    });
    await openPage(() => import("../agents/page"));

    const runNow = await screen.findByRole("button", { name: "Run now" });
    fireEvent.click(runNow);
    expect(runNow).toBeDisabled();
    await waitFor(() => expect(runNow).toBeEnabled());
    await waitFor(() => expect(api.sent("GET /api/v1/admin/agents")).toHaveLength(2));

    const live = screen.getByRole("button", { name: "live" });
    fireEvent.click(live);
    expect(live).toBeDisabled();
    await waitFor(() => expect(live).toBeEnabled());
    await waitFor(() => expect(api.sent("GET /api/v1/admin/agents")).toHaveLength(3));

    fireEvent.click(screen.getByRole("button", { name: "Configure" }));
    const threshold = screen.getAllByRole("slider")[0];
    fireEvent.change(threshold, { target: { value: "0.9" } });
    fireEvent.mouseUp(threshold);
    expect(threshold).toBeDisabled();
    await waitFor(() => expect(threshold).toBeEnabled());
    await waitFor(() => expect(api.sent("GET /api/v1/admin/agents")).toHaveLength(4));

    expect(writeLog(api)).toEqual(["GET /api/v1/csrf", "GET /api/v1/csrf", "GET /api/v1/csrf"]);
  });

  it("/admin/fraud: Run agent now is usable again and the agent is read again", async () => {
    const api = fakeApi({
      "GET /api/v1/auth": [adminSession],
      "GET /api/v1/admin/agents": times(2, agentList(fraudSentinel)),
      "GET /api/v1/csrf": [tokenRefused],
    });
    await openPage(() => import("../fraud/page"));

    const runNow = await screen.findByRole("button", { name: "Run agent now" });
    fireEvent.click(runNow);
    expect(runNow).toBeDisabled();
    await waitFor(() => expect(runNow).toBeEnabled());
    await waitFor(() => expect(api.sent("GET /api/v1/admin/agents")).toHaveLength(2));
    expect(api.sent("POST /api/v1/admin/agents")).toEqual([]);
  });

  it("/admin/compliance: Run scan is usable again and the agent is read again", async () => {
    const api = fakeApi({
      "GET /api/v1/auth": [adminSession],
      "GET /api/v1/admin/agents": times(2, agentList(complianceWatchdog)),
      "GET /api/v1/csrf": [tokenRefused],
    });
    await openPage(() => import("../compliance/page"));

    const runScan = await screen.findByRole("button", { name: "Run scan" });
    fireEvent.click(runScan);
    expect(runScan).toBeDisabled();
    await waitFor(() => expect(runScan).toBeEnabled());
    await waitFor(() => expect(api.sent("GET /api/v1/admin/agents")).toHaveLength(2));
    expect(api.sent("POST /api/v1/admin/agents")).toEqual([]);
  });

  it("/admin/campaigns: Pause says it failed and is usable again", async () => {
    const api = fakeApi({
      "GET /api/v1/auth": [adminSession],
      "GET /api/v1/campaigns": [listOf("campaigns", [testCampaign])],
      "GET /api/v1/csrf": [tokenRefused],
    });
    await openPage(() => import("../campaigns/page"));

    fireEvent.click(await screen.findByRole("button", { name: /Manage/ }));
    const pause = screen.getByRole("button", { name: "Pause" });
    fireEvent.click(pause);
    expect(pause).toBeDisabled();
    await waitFor(() => expect(pause).toBeEnabled());
    expect(alerts).toEqual(["Network error"]);
    expect(api.sent("POST /api/v1/admin/campaigns")).toEqual([]);
  });
});
