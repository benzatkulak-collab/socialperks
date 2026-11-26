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
 * - every other console write failed with 401 once the tab had been open
 *   for 15 minutes.
 *
 * Each test renders the real page inside the real AdminGuard and answers its
 * requests from the fake API, with the bodies the real routes send. Where a
 * route checks a CSRF token today, its answer checks one too. Test data only.
 */
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ComponentType } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  type Answer,
  csrfToken,
  errorWith,
  expiredAccess,
  fakeApi,
  jsonResponse,
  listOf,
  okWith,
  requiresCsrf,
  testCampaign,
  testSubmission,
} from "@/__tests__/helpers/fake-api";

type FakeApi = ReturnType<typeof fakeApi>;

const CSRF = "csrf-test-1";

/**
 * The signed-in admin. It has a business of its own: the review route checks
 * the caller's business before it checks the CSRF token (see the review
 * tests below).
 */
const admin = { id: "usr_admin_test", email: "admin@example.test", role: "admin", businessId: "biz_usr_admin_test" };

/** `GET /api/v1/auth`: AdminGuard's session check. */
const adminSession = okWith({ user: admin, expiresAt: null });

/** `POST /api/v1/auth {action: "refresh"}` while the admin's 7-day refresh cookie is valid. */
const adminRefreshed = okWith({ user: admin, accessToken: "test.access.token" });

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

/**
 * A write sent on a tab older than 15 minutes: refused with 401, then one
 * refresh, then sent once more with the same body. Every attempt carried the
 * CSRF token. Returns the attempts.
 */
function expectRenewedWrite(api: FakeApi, route: string) {
  const order = api.requests.map((r) => `${r.method} ${r.path}`);
  const first = order.indexOf(route);
  const refresh = order.indexOf("POST /api/v1/auth");
  expect(first).toBeGreaterThanOrEqual(0);
  expect(refresh).toBeGreaterThan(first);
  expect(order.indexOf(route, first + 1)).toBeGreaterThan(refresh);
  expect(api.sent("POST /api/v1/auth").map((r) => r.body)).toEqual([{ action: "refresh" }]);

  const attempts = api.sent(route);
  expect(attempts).toHaveLength(2);
  expect(attempts[1].body).toEqual(attempts[0].body);
  expect(attempts.map((a) => a.headers.get("X-CSRF-Token"))).toEqual([CSRF, CSRF]);
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

/** `POST /api/v1/submissions/review`'s answer for one submission. */
function reviewed(submission: typeof pendingSubmission, status: "approved" | "rejected"): Answer {
  return okWith({
    submission: { ...submission, status, reviewedAt: "2026-03-02T10:00:00.000Z", reviewedBy: admin.id },
    perk: null,
  });
}

// These model a reviewer the review route lets through to its CSRF check:
// an account whose business owns the submission's campaign. The founder
// account has no business, so the route refuses it with 403 NO_TENANT before
// it looks at a token, and no change in the browser alters that.

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
    const api = fakeApi({
      ...homeReads(),
      "GET /api/v1/csrf": [csrfToken(CSRF)],
      "POST /api/v1/submissions/review": [requiresCsrf(CSRF, reviewed(pendingSubmission, "approved"))],
    });
    await openPage(() => import("../page"));

    const approve = await screen.findByRole("button", { name: "Approve" });
    const row = approve.closest("tr")!;
    fireEvent.click(approve);

    expect(await within(row).findByText("approved")).toBeInTheDocument();
    const [review] = api.sent("POST /api/v1/submissions/review");
    expect(review.headers.get("X-CSRF-Token")).toBe(CSRF);
    expect(review.body).toMatchObject({ submissionId: "sub_test_pending_1", decision: "approve" });
  });

  it("Reject on a tab older than 15 minutes renews the cookie and rejects", async () => {
    const api = fakeApi({
      ...homeReads(),
      "GET /api/v1/csrf": [csrfToken(CSRF)],
      "POST /api/v1/submissions/review": [expiredAccess, requiresCsrf(CSRF, reviewed(pendingSubmission, "rejected"))],
      "POST /api/v1/auth": [adminRefreshed],
    });
    await openPage(() => import("../page"));

    const reject = await screen.findByRole("button", { name: "Reject" });
    const row = reject.closest("tr")!;
    fireEvent.click(reject);

    expect(await within(row).findByText("rejected")).toBeInTheDocument();
    const [review] = expectRenewedWrite(api, "POST /api/v1/submissions/review");
    expect(review.body).toMatchObject({ submissionId: "sub_test_pending_1", decision: "reject" });
  });
});

describe("/admin/submissions", () => {
  it("the drawer's Reject sends the CSRF token and the note", async () => {
    const api = fakeApi({
      "GET /api/v1/auth": [adminSession],
      "GET /api/v1/submissions": [listOf("submissions", [pendingSubmission])],
      "GET /api/v1/csrf": [csrfToken(CSRF)],
      "POST /api/v1/submissions/review": [requiresCsrf(CSRF, reviewed(pendingSubmission, "rejected"))],
    });
    await openPage(() => import("../submissions/page"));

    fireEvent.click(await screen.findByText(/^sub_test_pending/));
    fireEvent.change(screen.getByPlaceholderText("Note (optional, logged to audit)"), {
      target: { value: "The proof link shows no tag" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Reject" }));

    expect(await screen.findByText("Override prior decision")).toBeInTheDocument();
    expect(alerts).toEqual([]);
    const [review] = api.sent("POST /api/v1/submissions/review");
    expect(review.headers.get("X-CSRF-Token")).toBe(CSRF);
    expect(review.body).toMatchObject({
      submissionId: "sub_test_pending_1",
      decision: "reject",
      note: "The proof link shows no tag",
    });
  });

  it("bulk Approve sends every selected submission with the one CSRF token", async () => {
    const api = fakeApi({
      "GET /api/v1/auth": [adminSession],
      "GET /api/v1/submissions": [
        listOf("submissions", [pendingSubmission, secondPendingSubmission]),
        listOf("submissions", []),
      ],
      "GET /api/v1/csrf": [csrfToken(CSRF)],
      "POST /api/v1/submissions/review": [
        requiresCsrf(CSRF, reviewed(pendingSubmission, "approved")),
        requiresCsrf(CSRF, reviewed(secondPendingSubmission, "approved")),
      ],
    });
    await openPage(() => import("../submissions/page"));

    fireEvent.click(await screen.findByRole("button", { name: "Select all pending (2)" }));
    fireEvent.click(screen.getByRole("button", { name: "Approve 2" }));

    await waitFor(() => expect(alerts).toEqual(["Approved 2 / 2"]));
    await waitFor(() => expect(api.sent("GET /api/v1/submissions")).toHaveLength(2));
    const reviews = api.sent("POST /api/v1/submissions/review");
    expect(reviews.map((r) => (r.body as { submissionId: string }).submissionId).sort()).toEqual([
      "sub_test_pending_1",
      "sub_test_pending_2",
    ]);
    expect(reviews.map((r) => r.headers.get("X-CSRF-Token"))).toEqual([CSRF, CSRF]);
    expect(api.sent("GET /api/v1/csrf")).toHaveLength(1);
  });

  it("bulk Approve on a tab older than 15 minutes renews the cookie once for the whole batch", async () => {
    const api = fakeApi({
      "GET /api/v1/auth": [adminSession],
      "GET /api/v1/submissions": [
        listOf("submissions", [pendingSubmission, secondPendingSubmission]),
        listOf("submissions", []),
      ],
      "GET /api/v1/csrf": [csrfToken(CSRF)],
      "POST /api/v1/submissions/review": [
        expiredAccess,
        requiresCsrf(CSRF, reviewed(pendingSubmission, "approved")),
        requiresCsrf(CSRF, reviewed(secondPendingSubmission, "approved")),
      ],
      "POST /api/v1/auth": [adminRefreshed],
    });
    await openPage(() => import("../submissions/page"));

    fireEvent.click(await screen.findByRole("button", { name: "Select all pending (2)" }));
    fireEvent.click(screen.getByRole("button", { name: "Approve 2" }));

    await waitFor(() => expect(alerts).toEqual(["Approved 2 / 2"]));
    await waitFor(() => expect(api.sent("GET /api/v1/submissions")).toHaveLength(2));
    expect(api.sent("POST /api/v1/auth")).toHaveLength(1);
    expect(api.sent("POST /api/v1/submissions/review")).toHaveLength(3);
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

  it("Suspend on a tab older than 15 minutes renews the cookie and suspends the account", async () => {
    const api = fakeApi({
      "GET /api/v1/auth": [adminSession],
      "GET /api/v1/admin/users": [userList([member]), userList([suspendedMember])],
      "GET /api/v1/csrf": [csrfToken(CSRF)],
      "PATCH /api/v1/admin/users": [expiredAccess, okWith({ user: suspendedMember })],
      "POST /api/v1/auth": [adminRefreshed],
    });
    await openPage(() => import("../users/page"));

    fireEvent.click(await screen.findByText("member@example.test"));
    fireEvent.change(screen.getByPlaceholderText("Reason for suspension (logged to audit)"), {
      target: { value: "Repeated fake proofs" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Suspend account" }));

    expect(await screen.findByRole("button", { name: "Unsuspend" })).toBeInTheDocument();
    await waitFor(() => expect(api.sent("GET /api/v1/admin/users")).toHaveLength(2));
    expect(alerts).toEqual([]);
    const [patch] = expectRenewedWrite(api, "PATCH /api/v1/admin/users");
    expect(patch.body).toEqual({ email: "member@example.test", action: "suspend", reason: "Repeated fake proofs" });
  });

  it("Sign in as on a tab older than 15 minutes renews the cookie and signs in as the account", async () => {
    const location = { href: "http://localhost:3000/admin/users" };
    vi.stubGlobal("location", location);
    const api = fakeApi({
      "GET /api/v1/auth": [adminSession],
      "GET /api/v1/admin/users": [userList([member])],
      "GET /api/v1/csrf": [csrfToken(CSRF)],
      "POST /api/v1/admin/impersonate": [
        expiredAccess,
        okWith({
          impersonating: { id: member.id, email: member.email, role: member.role, businessId: member.businessId },
        }),
      ],
      "POST /api/v1/auth": [adminRefreshed],
    });
    await openPage(() => import("../users/page"));

    fireEvent.click(await screen.findByText("member@example.test"));
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
  it("switching an agent's mode on a tab older than 15 minutes renews the cookie and switches it", async () => {
    const api = fakeApi({
      "GET /api/v1/auth": [adminSession],
      "GET /api/v1/admin/agents": [agentList(fraudSentinel), agentList({ ...fraudSentinel, mode: "live" })],
      "GET /api/v1/csrf": [csrfToken(CSRF)],
      "PATCH /api/v1/admin/agents": [expiredAccess, okWith({ mode: "live", config: fraudSentinel.config })],
      "POST /api/v1/auth": [adminRefreshed],
    });
    await openPage(() => import("../agents/page"));

    fireEvent.click(await screen.findByRole("button", { name: "live" }));

    await waitFor(() => expect(screen.getByRole("button", { name: "live" })).toBeDisabled());
    const [patch] = expectRenewedWrite(api, "PATCH /api/v1/admin/agents");
    expect(patch.body).toEqual({ agentId: "fraud-sentinel", mode: "live" });
  });

  it("moving a config slider on a tab older than 15 minutes renews the cookie and saves the value", async () => {
    const tuned = { ...fraudSentinel.config, threshold: 0.9 };
    const api = fakeApi({
      "GET /api/v1/auth": [adminSession],
      "GET /api/v1/admin/agents": [agentList(fraudSentinel), agentList({ ...fraudSentinel, config: tuned })],
      "GET /api/v1/csrf": [csrfToken(CSRF)],
      "PATCH /api/v1/admin/agents": [expiredAccess, okWith({ mode: "dry-run", config: tuned })],
      "POST /api/v1/auth": [adminRefreshed],
    });
    await openPage(() => import("../agents/page"));

    fireEvent.click(await screen.findByRole("button", { name: "Configure" }));
    const threshold = screen.getAllByRole("slider")[0];
    fireEvent.change(threshold, { target: { value: "0.9" } });
    fireEvent.mouseUp(threshold);

    await waitFor(() => expect(api.sent("GET /api/v1/admin/agents")).toHaveLength(2));
    const [patch] = expectRenewedWrite(api, "PATCH /api/v1/admin/agents");
    expect(patch.body).toEqual({ agentId: "fraud-sentinel", config: { threshold: 0.9 } });
  });

  it("Run now on a tab older than 15 minutes renews the cookie and runs the agent", async () => {
    const api = fakeApi({
      "GET /api/v1/auth": [adminSession],
      "GET /api/v1/admin/agents": [agentList(fraudSentinel), agentList(fraudSentinel)],
      "GET /api/v1/csrf": [csrfToken(CSRF)],
      "POST /api/v1/admin/agents": [expiredAccess, runReport],
      "POST /api/v1/auth": [adminRefreshed],
    });
    await openPage(() => import("../agents/page"));

    fireEvent.click(await screen.findByRole("button", { name: "Run now" }));

    await waitFor(() => expect(api.sent("GET /api/v1/admin/agents")).toHaveLength(2));
    const [run] = expectRenewedWrite(api, "POST /api/v1/admin/agents");
    expect(run.body).toEqual({ agentId: "fraud-sentinel", action: "run" });
  });
});

describe("/admin/fraud", () => {
  it("Run agent now on a tab older than 15 minutes renews the cookie and runs Fraud Sentinel", async () => {
    const api = fakeApi({
      "GET /api/v1/auth": [adminSession],
      "GET /api/v1/admin/agents": [agentList(fraudSentinel), agentList(fraudSentinel)],
      "GET /api/v1/csrf": [csrfToken(CSRF)],
      "POST /api/v1/admin/agents": [expiredAccess, runReport],
      "POST /api/v1/auth": [adminRefreshed],
    });
    await openPage(() => import("../fraud/page"));

    fireEvent.click(await screen.findByRole("button", { name: "Run agent now" }));

    await waitFor(() => expect(api.sent("GET /api/v1/admin/agents")).toHaveLength(2));
    const [run] = expectRenewedWrite(api, "POST /api/v1/admin/agents");
    expect(run.body).toEqual({ agentId: "fraud-sentinel", action: "run" });
  });
});

describe("/admin/compliance", () => {
  it("Run scan on a tab older than 15 minutes renews the cookie and runs Compliance Watchdog", async () => {
    const api = fakeApi({
      "GET /api/v1/auth": [adminSession],
      "GET /api/v1/admin/agents": [agentList(complianceWatchdog), agentList(complianceWatchdog)],
      "GET /api/v1/csrf": [csrfToken(CSRF)],
      "POST /api/v1/admin/agents": [expiredAccess, runReport],
      "POST /api/v1/auth": [adminRefreshed],
    });
    await openPage(() => import("../compliance/page"));

    fireEvent.click(await screen.findByRole("button", { name: "Run scan" }));

    await waitFor(() => expect(api.sent("GET /api/v1/admin/agents")).toHaveLength(2));
    const [run] = expectRenewedWrite(api, "POST /api/v1/admin/agents");
    expect(run.body).toEqual({ agentId: "compliance-watchdog", action: "run" });
  });
});

// ─── Flags, campaigns and keys ──────────────────────────────────────────────

describe("/admin/feature-flags", () => {
  it("a flag toggle on a tab older than 15 minutes renews the cookie before it is sent again", async () => {
    const api = fakeApi({
      "GET /api/v1/auth": [adminSession],
      "GET /api/v1/flags": [okWith({ "test-flag": true }), okWith({ "test-flag": true })],
      "GET /api/v1/csrf": [csrfToken(CSRF)],
      // The flags route answers 400 to this body today: the toggle sends no
      // `action`. That is a separate bug; here only the renewal is checked.
      "POST /api/v1/flags": [
        expiredAccess,
        errorWith(400, "INVALID_ACTION", "Action must be one of: create, update, delete, list, get"),
      ],
      "POST /api/v1/auth": [adminRefreshed],
    });
    await openPage(() => import("../feature-flags/page"));

    fireEvent.click(await screen.findByRole("button", { name: "Disable" }));

    await waitFor(() => expect(api.sent("GET /api/v1/flags")).toHaveLength(2));
    const [toggle] = expectRenewedWrite(api, "POST /api/v1/flags");
    expect(toggle.body).toEqual({ flagId: "test-flag", value: false });
  });
});

describe("/admin/campaigns", () => {
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

  it("Pause on a tab older than 15 minutes renews the cookie and pauses the campaign", async () => {
    const api = fakeApi({
      "GET /api/v1/auth": [adminSession],
      "GET /api/v1/campaigns": [listOf("campaigns", [testCampaign]), listOf("campaigns", [pausedCampaign])],
      "GET /api/v1/csrf": [csrfToken(CSRF)],
      "POST /api/v1/admin/campaigns": [expiredAccess, okWith({ campaign: pausedCampaign })],
      "POST /api/v1/auth": [adminRefreshed],
    });
    await openPage(() => import("../campaigns/page"));

    fireEvent.click(await screen.findByRole("button", { name: /Manage/ }));
    fireEvent.change(screen.getByPlaceholderText("Reason (logged to audit)"), {
      target: { value: "Paused while the shop is closed" },
    });
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

  /** `POST /api/v1/api-keys`: 201, with the key's plaintext in `key`, shown this once. */
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

  /** The route checks the CSRF token before the sign-in, so even the 401 needs a token. */
  function issueRoutes(): Record<string, Answer[]> {
    return {
      "GET /api/v1/auth": [adminSession],
      "GET /api/v1/api-keys": [okWith({ keys: [] }), okWith({ keys: [issuedKey] })],
      "GET /api/v1/csrf": [csrfToken(CSRF)],
      "POST /api/v1/api-keys": [requiresCsrf(CSRF, expiredAccess), requiresCsrf(CSRF, keyCreated)],
      "POST /api/v1/auth": [adminRefreshed],
    };
  }

  async function issueKey(): Promise<void> {
    await openPage(() => import("../api-keys/page"));
    fireEvent.change(await screen.findByPlaceholderText("Agent / integration name"), {
      target: { value: "Test Agent" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Issue" }));
  }

  it("Issue on a tab older than 15 minutes sends the CSRF token, renews the cookie and issues the key", async () => {
    const api = fakeApi(issueRoutes());
    await issueKey();

    await waitFor(() => expect(api.sent("GET /api/v1/api-keys")).toHaveLength(2));
    expect(alerts).toEqual([]);
    const [issue] = expectRenewedWrite(api, "POST /api/v1/api-keys");
    expect(issue.body).toMatchObject({ agentName: "Test Agent", permissions: ["read"] });
  });
});
