/**
 * Load Test Runner — Node.js-based load testing engine
 *
 * Features:
 * - Weighted random scenario selection
 * - Configurable concurrency with semaphore
 * - Gradual ramp-up
 * - Per-request latency tracking with percentile calculation
 * - Real-time progress reporting every 5 seconds
 * - Final report with ASCII chart
 */

// ─── Types ─────────────────────────────────────────────────────────────────

export interface LoadTestConfig {
  name: string;
  baseUrl: string;
  duration: number;          // seconds
  concurrency: number;       // concurrent virtual users
  rampUp?: number;           // seconds to ramp to full concurrency
  scenarios: Scenario[];
}

export interface Scenario {
  name: string;
  weight: number;            // relative weight (higher = more frequent)
  steps: Step[];
}

export interface Step {
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  body?: unknown;
  headers?: Record<string, string>;
  expect?: { status?: number; maxLatency?: number };
  /** Capture a value from the JSON response for use in later steps */
  capture?: { field: string; as: string };
}

export interface ScenarioResult {
  name: string;
  totalRequests: number;
  successCount: number;
  failureCount: number;
  latencies: number[];
  errors: Map<string, number>;
}

export interface LoadTestResult {
  name: string;
  duration: number;
  totalRequests: number;
  successCount: number;
  failureCount: number;
  latency: {
    p50: number;
    p75: number;
    p90: number;
    p95: number;
    p99: number;
    avg: number;
    max: number;
    min: number;
  };
  throughput: number;        // requests per second
  errorRate: number;
  scenarioResults: Record<string, ScenarioResult>;
}

// ─── Semaphore ─────────────────────────────────────────────────────────────

class Semaphore {
  private current = 0;
  private queue: (() => void)[] = [];

  constructor(private max: number) {}

  async acquire(): Promise<void> {
    if (this.current < this.max) {
      this.current++;
      return;
    }
    return new Promise<void>((resolve) => {
      this.queue.push(() => {
        this.current++;
        resolve();
      });
    });
  }

  release(): void {
    this.current--;
    const next = this.queue.shift();
    if (next) next();
  }

  setMax(newMax: number): void {
    const diff = newMax - this.max;
    this.max = newMax;
    // If we increased capacity, drain waiting tasks
    for (let i = 0; i < diff && this.queue.length > 0; i++) {
      const next = this.queue.shift();
      if (next) next();
    }
  }
}

// ─── Weighted Random Selection ─────────────────────────────────────────────

function selectScenario(scenarios: Scenario[]): Scenario {
  const totalWeight = scenarios.reduce((sum, s) => sum + s.weight, 0);
  let rand = Math.random() * totalWeight;
  for (const scenario of scenarios) {
    rand -= scenario.weight;
    if (rand <= 0) return scenario;
  }
  return scenarios[scenarios.length - 1];
}

// ─── Percentile Calculation ────────────────────────────────────────────────

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

function computeLatencyStats(latencies: number[]): LoadTestResult["latency"] {
  if (latencies.length === 0) {
    return { p50: 0, p75: 0, p90: 0, p95: 0, p99: 0, avg: 0, max: 0, min: 0 };
  }
  const sorted = [...latencies].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  return {
    p50: percentile(sorted, 50),
    p75: percentile(sorted, 75),
    p90: percentile(sorted, 90),
    p95: percentile(sorted, 95),
    p99: percentile(sorted, 99),
    avg: sum / sorted.length,
    max: sorted[sorted.length - 1],
    min: sorted[0],
  };
}

// ─── Request Execution ─────────────────────────────────────────────────────

interface RequestResult {
  success: boolean;
  status: number;
  latency: number;
  error?: string;
  body?: Record<string, unknown>;
}

async function executeRequest(
  baseUrl: string,
  step: Step,
  captures: Record<string, string>,
): Promise<RequestResult> {
  // Interpolate captured values into path (e.g., {{token}} -> actual value)
  let path = step.path;
  for (const [key, value] of Object.entries(captures)) {
    path = path.replace(`{{${key}}}`, value);
  }

  const url = `${baseUrl}${path}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...step.headers,
  };

  // Interpolate captures into headers
  for (const [hk, hv] of Object.entries(headers)) {
    for (const [ck, cv] of Object.entries(captures)) {
      headers[hk] = hv.replace(`{{${ck}}}`, cv);
    }
  }

  const fetchOptions: RequestInit = {
    method: step.method,
    headers,
  };

  if (step.body && (step.method === "POST" || step.method === "PUT")) {
    let bodyStr = JSON.stringify(step.body);
    // Interpolate captures into body
    for (const [ck, cv] of Object.entries(captures)) {
      bodyStr = bodyStr.replace(`{{${ck}}}`, cv);
    }
    fetchOptions.body = bodyStr;
  }

  const start = performance.now();
  try {
    const response = await fetch(url, fetchOptions);
    const latency = performance.now() - start;

    let responseBody: Record<string, unknown> | undefined;
    try {
      responseBody = await response.json() as Record<string, unknown>;
    } catch {
      // Non-JSON response, ignore
    }

    const expectedStatus = step.expect?.status ?? 200;
    const statusOk = response.status === expectedStatus;
    const latencyOk = step.expect?.maxLatency
      ? latency <= step.expect.maxLatency
      : true;

    return {
      success: statusOk && latencyOk,
      status: response.status,
      latency,
      error: !statusOk
        ? `Expected ${expectedStatus}, got ${response.status}`
        : !latencyOk
          ? `Latency ${latency.toFixed(0)}ms exceeded max ${step.expect!.maxLatency}ms`
          : undefined,
      body: responseBody,
    };
  } catch (e) {
    const latency = performance.now() - start;
    const errorMsg = e instanceof Error ? e.message : String(e);
    return {
      success: false,
      status: 0,
      latency,
      error: `Network error: ${errorMsg}`,
    };
  }
}

// ─── Scenario Execution ────────────────────────────────────────────────────

async function executeScenario(
  baseUrl: string,
  scenario: Scenario,
  scenarioResult: ScenarioResult,
): Promise<void> {
  const captures: Record<string, string> = {};

  for (const step of scenario.steps) {
    const result = await executeRequest(baseUrl, step, captures);
    scenarioResult.totalRequests++;
    scenarioResult.latencies.push(result.latency);

    if (result.success) {
      scenarioResult.successCount++;
    } else {
      scenarioResult.failureCount++;
      const errKey = result.error ?? `HTTP ${result.status}`;
      scenarioResult.errors.set(errKey, (scenarioResult.errors.get(errKey) ?? 0) + 1);
    }

    // Capture values for subsequent steps
    if (step.capture && result.body) {
      const value = getNestedValue(result.body, step.capture.field);
      if (value !== undefined) {
        captures[step.capture.as] = String(value);
      }
    }
  }
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

// ─── Progress Reporter ─────────────────────────────────────────────────────

function printProgress(
  elapsed: number,
  duration: number,
  scenarioResults: Record<string, ScenarioResult>,
  currentConcurrency: number,
): void {
  let total = 0;
  let success = 0;
  let failures = 0;
  const allLatencies: number[] = [];

  for (const sr of Object.values(scenarioResults)) {
    total += sr.totalRequests;
    success += sr.successCount;
    failures += sr.failureCount;
    allLatencies.push(...sr.latencies);
  }

  const rps = elapsed > 0 ? total / elapsed : 0;
  const sorted = [...allLatencies].sort((a, b) => a - b);
  const p50 = sorted.length > 0 ? percentile(sorted, 50) : 0;
  const p95 = sorted.length > 0 ? percentile(sorted, 95) : 0;
  const errorRate = total > 0 ? (failures / total) * 100 : 0;
  const pct = Math.min(100, (elapsed / duration) * 100);

  // Progress bar
  const barWidth = 30;
  const filled = Math.round((pct / 100) * barWidth);
  const bar = "=".repeat(filled) + (filled < barWidth ? ">" : "") + " ".repeat(Math.max(0, barWidth - filled - 1));

  process.stdout.write(
    `\r  [${bar}] ${pct.toFixed(0).padStart(3)}%  |  ` +
    `VUs: ${currentConcurrency}  |  ` +
    `Reqs: ${total}  |  ` +
    `RPS: ${rps.toFixed(1)}  |  ` +
    `p50: ${p50.toFixed(0)}ms  |  ` +
    `p95: ${p95.toFixed(0)}ms  |  ` +
    `Err: ${errorRate.toFixed(1)}%` +
    "   " // trailing spaces to clear any leftover chars
  );
}

// ─── Main Runner ───────────────────────────────────────────────────────────

export async function runLoadTest(config: LoadTestConfig): Promise<LoadTestResult> {
  const { name, baseUrl, duration, concurrency, rampUp = 0, scenarios } = config;

  console.log("");
  console.log("  =============================================");
  console.log(`  LOAD TEST: ${name}`);
  console.log("  =============================================");
  console.log(`  Target:      ${baseUrl}`);
  console.log(`  Duration:    ${duration}s`);
  console.log(`  Concurrency: ${concurrency} virtual users`);
  if (rampUp > 0) console.log(`  Ramp-up:     ${rampUp}s`);
  console.log(`  Scenarios:   ${scenarios.length}`);
  for (const s of scenarios) {
    console.log(`    - ${s.name} (weight: ${s.weight})`);
  }
  console.log("  ---------------------------------------------");
  console.log("");

  // Initialize scenario results
  const scenarioResults: Record<string, ScenarioResult> = {};
  for (const s of scenarios) {
    scenarioResults[s.name] = {
      name: s.name,
      totalRequests: 0,
      successCount: 0,
      failureCount: 0,
      latencies: [],
      errors: new Map(),
    };
  }

  const semaphore = new Semaphore(rampUp > 0 ? 1 : concurrency);
  const startTime = performance.now();
  const endTime = startTime + duration * 1000;
  let currentConcurrency = rampUp > 0 ? 1 : concurrency;
  let running = true;

  // Ramp-up timer
  let rampInterval: ReturnType<typeof setInterval> | null = null;
  if (rampUp > 0) {
    const rampStepMs = (rampUp * 1000) / concurrency;
    rampInterval = setInterval(() => {
      if (currentConcurrency < concurrency) {
        currentConcurrency++;
        semaphore.setMax(currentConcurrency);
      } else if (rampInterval) {
        clearInterval(rampInterval);
        rampInterval = null;
      }
    }, rampStepMs);
  }

  // Progress reporter
  const progressInterval = setInterval(() => {
    const elapsed = (performance.now() - startTime) / 1000;
    printProgress(elapsed, duration, scenarioResults, currentConcurrency);
  }, 5000);

  // Worker loop: each "virtual user" continuously runs scenarios
  const workers: Promise<void>[] = [];

  for (let i = 0; i < concurrency; i++) {
    const worker = (async () => {
      while (running && performance.now() < endTime) {
        await semaphore.acquire();
        try {
          if (!running || performance.now() >= endTime) break;

          const scenario = selectScenario(scenarios);
          await executeScenario(baseUrl, scenario, scenarioResults[scenario.name]);
        } finally {
          semaphore.release();
        }
      }
    })();
    workers.push(worker);
  }

  // Wait for duration to elapse, then signal stop
  await new Promise<void>((resolve) => {
    setTimeout(() => {
      running = false;
      resolve();
    }, duration * 1000);
  });

  // Wait for in-flight requests to finish (with a safety timeout)
  await Promise.race([
    Promise.allSettled(workers),
    new Promise<void>((resolve) => setTimeout(resolve, 10000)),
  ]);

  // Cleanup timers
  if (rampInterval) clearInterval(rampInterval);
  clearInterval(progressInterval);

  // Clear the progress line
  process.stdout.write("\r" + " ".repeat(120) + "\r");

  // Aggregate results
  const allLatencies: number[] = [];
  let totalRequests = 0;
  let successCount = 0;
  let failureCount = 0;

  for (const sr of Object.values(scenarioResults)) {
    totalRequests += sr.totalRequests;
    successCount += sr.successCount;
    failureCount += sr.failureCount;
    allLatencies.push(...sr.latencies);
  }

  const actualDuration = (performance.now() - startTime) / 1000;

  return {
    name,
    duration: actualDuration,
    totalRequests,
    successCount,
    failureCount,
    latency: computeLatencyStats(allLatencies),
    throughput: totalRequests / actualDuration,
    errorRate: totalRequests > 0 ? (failureCount / totalRequests) * 100 : 0,
    scenarioResults,
  };
}
