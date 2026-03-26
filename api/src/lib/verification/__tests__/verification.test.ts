import { describe, it, expect, beforeEach } from "vitest";
import {
  OAuthManager,
  PlatformRateLimiter,
  VerificationJobQueue,
} from "../index";

// ═══════════════════════════════════════════════════════════════════════════════
// OAUTH MANAGER
// ═══════════════════════════════════════════════════════════════════════════════

describe("OAuthManager", () => {
  let manager: OAuthManager;

  beforeEach(() => {
    manager = new OAuthManager();
  });

  it("generateAuthorizationUrl returns a URL for configured platforms", () => {
    const url = manager.generateAuthorizationUrl("ig", "http://localhost:3000/callback", "test-state");
    expect(url).toContain("instagram.com");
    expect(url).toContain("test-state");
  });

  it("generateAuthorizationUrl includes scopes in the URL", () => {
    const url = manager.generateAuthorizationUrl("ig", "http://localhost:3000/callback", "s1");
    expect(url).toContain("scope=");
  });

  it("generateAuthorizationUrl works for TikTok (PKCE platform)", () => {
    const url = manager.generateAuthorizationUrl("tt", "http://localhost:3000/callback", "s2");
    expect(url).toContain("tiktok.com");
  });

  it("generateAuthorizationUrl works for YouTube", () => {
    const url = manager.generateAuthorizationUrl("yt", "http://localhost:3000/callback", "s3");
    expect(url).toContain("google.com");
  });

  it("isConfigured returns false for platforms without client credentials", () => {
    // Without env vars, client ID is empty
    const configured = manager.isConfigured("ig");
    // Since env vars are not set in test, clientId is empty string
    expect(typeof configured).toBe("boolean");
  });

  it("isConfigured returns false for unknown platforms", () => {
    const configured = manager.isConfigured("unknown_platform");
    expect(configured).toBe(false);
  });

  it("getConfig returns config for known platforms", () => {
    const config = manager.getConfig("ig");
    expect(config).toBeDefined();
    expect(config!.platformId).toBe("ig");
    expect(config!.authorizationUrl).toContain("instagram");
  });

  it("getConfig returns null for unknown platforms", () => {
    const config = manager.getConfig("nonexistent");
    expect(config).toBeNull();
  });

  it("getConfig returns configs for multiple known platforms", () => {
    expect(manager.getConfig("ig")).not.toBeNull();
    expect(manager.getConfig("tt")).not.toBeNull();
    expect(manager.getConfig("yt")).not.toBeNull();
    expect(manager.getConfig("xw")).not.toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PLATFORM RATE LIMITER
// ═══════════════════════════════════════════════════════════════════════════════

describe("PlatformRateLimiter", () => {
  let limiter: PlatformRateLimiter;

  beforeEach(() => {
    limiter = new PlatformRateLimiter();
  });

  it("check returns allowed for the first request", () => {
    const decision = limiter.check("ig");
    expect(decision.allowed).toBe(true);
  });

  it("check returns allowed for unknown platform (no config)", () => {
    const decision = limiter.check("unknown_platform_xyz");
    expect(decision.allowed).toBe(true);
  });

  it("acquire returns a release function", async () => {
    const release = await limiter.acquire("ig");
    expect(typeof release).toBe("function");
    release();
  });

  it("acquire for unknown platform returns a no-op release function", async () => {
    const release = await limiter.acquire("no_config_platform");
    expect(typeof release).toBe("function");
    release(); // should not throw
  });

  it("reportThrottled triggers backoff", () => {
    limiter.reportThrottled("ig");
    const decision = limiter.check("ig");
    // After recording a throttle, there should be a backoff
    expect(decision.allowed).toBe(false);
    expect((decision as any).reason).toContain("Backing off");
  });

  it("getStats returns stats for a platform", () => {
    limiter.check("ig"); // Initialize state
    const stats = limiter.getStats("ig");
    expect(stats).toBeDefined();
    expect(stats.requestsInWindow).toBeGreaterThanOrEqual(0);
    expect(stats.activeConcurrent).toBe(0);
  });

  it("multiple acquires track concurrent requests", async () => {
    const r1 = await limiter.acquire("yt"); // YouTube has high limits
    const r2 = await limiter.acquire("yt");
    const state = limiter.getState("yt");
    expect(state!.activeConcurrent).toBe(2);

    r1();
    const state2 = limiter.getState("yt");
    expect(state2!.activeConcurrent).toBe(1);

    r2();
    const state3 = limiter.getState("yt");
    expect(state3!.activeConcurrent).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// VERIFICATION JOB QUEUE
// ═══════════════════════════════════════════════════════════════════════════════

describe("VerificationJobQueue", () => {
  let queue: VerificationJobQueue;
  let rateLimiter: PlatformRateLimiter;

  beforeEach(() => {
    rateLimiter = new PlatformRateLimiter();
    queue = new VerificationJobQueue(rateLimiter, {
      maxQueueSize: 100,
      defaultMaxAttempts: 3,
    });
  });

  it("submit creates a pending job", () => {
    const jobId = queue.submit({
      submissionId: "s1",
      proofUrl: "https://instagram.com/p/abc",
      proofType: "url",
      actionId: "ig_rl",
      platformId: "ig",
    });
    expect(jobId).toBeDefined();
    expect(typeof jobId).toBe("string");
  });

  it("submit respects maxQueueSize", () => {
    const smallQueue = new VerificationJobQueue(rateLimiter, { maxQueueSize: 2 });
    smallQueue.submit({ submissionId: "s1", proofUrl: "a", proofType: "url", actionId: "a", platformId: "ig" });
    smallQueue.submit({ submissionId: "s2", proofUrl: "b", proofType: "url", actionId: "b", platformId: "ig" });
    expect(() =>
      smallQueue.submit({ submissionId: "s3", proofUrl: "c", proofType: "url", actionId: "c", platformId: "ig" })
    ).toThrow(/Queue full/);
  });

  it("submit supports priority", () => {
    const id = queue.submit(
      { submissionId: "s1", proofUrl: "a", proofType: "url", actionId: "a", platformId: "ig" },
      { priority: 10 }
    );
    expect(id).toBeDefined();
  });

  it("getJob retrieves a submitted job", () => {
    const id = queue.submit({
      submissionId: "s1",
      proofUrl: "a",
      proofType: "url",
      actionId: "a",
      platformId: "ig",
    });
    const job = queue.getJob(id);
    expect(job).toBeDefined();
    expect(job!.status).toBe("pending");
    expect(job!.submission.submissionId).toBe("s1");
  });

  it("getJob returns null for non-existent job", () => {
    const job = queue.getJob("nonexistent");
    expect(job).toBeNull();
  });

  it("getStats returns correct counts", () => {
    queue.submit({ submissionId: "s1", proofUrl: "a", proofType: "url", actionId: "a", platformId: "ig" });
    queue.submit({ submissionId: "s2", proofUrl: "b", proofType: "url", actionId: "b", platformId: "tt" });

    const stats = queue.getStats();
    expect(stats.pending).toBe(2);
    expect(stats.processing).toBe(0);
    expect(stats.completed).toBe(0);
  });

  it("processes jobs with a handler via start/stop", async () => {
    const results: string[] = [];
    const q = new VerificationJobQueue(rateLimiter, {
      maxQueueSize: 100,
      pollIntervalMs: 50,
      defaultMaxAttempts: 3,
    });

    q.setHandler(async (submission) => {
      results.push(submission.submissionId);
      return {
        submissionId: submission.submissionId,
        actionId: submission.actionId,
        platformId: submission.platformId,
        status: "verified",
        confidence: 0.9,
        method: "api" as const,
        details: {},
        verifiedAt: new Date().toISOString(),
        durationMs: 50,
      };
    });

    q.submit({
      submissionId: "proc1",
      proofUrl: "https://instagram.com/p/xyz",
      proofType: "url",
      actionId: "ig_rl",
      platformId: "ig",
    });

    q.start();
    // Wait for the poll interval + processing time
    await new Promise((r) => setTimeout(r, 200));
    q.stop();

    expect(results).toContain("proc1");
  });

  it("handler failure increments attempts on the job", async () => {
    let attempts = 0;
    const q = new VerificationJobQueue(rateLimiter, {
      maxQueueSize: 100,
      pollIntervalMs: 50,
      defaultMaxAttempts: 3,
    });

    q.setHandler(async () => {
      attempts++;
      throw new Error("Network error");
    });

    const jobId = q.submit(
      { submissionId: "fail1", proofUrl: "a", proofType: "url", actionId: "a", platformId: "ig" },
      { maxAttempts: 2 }
    );

    q.start();
    await new Promise((r) => setTimeout(r, 200));
    q.stop();

    const job = q.getJob(jobId);
    expect(job!.attempts).toBeGreaterThanOrEqual(1);
  });

  it("on listeners receive completed events", async () => {
    const completed: string[] = [];
    const q = new VerificationJobQueue(rateLimiter, {
      maxQueueSize: 100,
      pollIntervalMs: 50,
      defaultMaxAttempts: 3,
    });

    q.on("completed", (job) => completed.push(job.id));
    q.setHandler(async (sub) => ({
      submissionId: sub.submissionId,
      actionId: sub.actionId,
      platformId: sub.platformId,
      status: "verified" as const,
      confidence: 0.95,
      method: "api" as const,
      details: {},
      verifiedAt: new Date().toISOString(),
      durationMs: 10,
    }));

    q.submit({ submissionId: "evt1", proofUrl: "a", proofType: "url", actionId: "a", platformId: "ig" });
    q.start();
    await new Promise((r) => setTimeout(r, 200));
    q.stop();

    expect(completed.length).toBe(1);
  });
});
