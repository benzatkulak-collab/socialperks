import { Hono } from "hono";
import { cors } from "hono/cors";
import type { AppEnv } from "@api/env.js";
import { tracing } from "./middleware/tracing.js";
import { maxBodySize } from "./middleware/validation.js";
import { csrfProtection } from "./middleware/csrf.js";

// Route imports
import health from "./routes/health.js";
import auth from "./routes/auth.js";
import campaigns from "./routes/campaigns.js";
import submissions from "./routes/submissions.js";
import billing from "./routes/billing.js";
import programs from "./routes/programs/index.js";
import ai from "./routes/ai/index.js";
import exchange from "./routes/exchange/index.js";
import pricing from "./routes/pricing.js";
import actions from "./routes/actions.js";
import benchmarks from "./routes/benchmarks.js";
import influencers from "./routes/influencers.js";
import recommendations from "./routes/recommendations.js";
import legal from "./routes/legal.js";
import events from "./routes/events.js";
import oauth from "./routes/oauth.js";
import verification from "./routes/verification.js";
import seed from "./routes/seed.js";

export const app = new Hono<AppEnv>();

// ─── Global middleware ───────────────────────────────────────────────────────

// Request body size limit (1MB default) — prevents payload DoS
app.use("/*", maxBodySize(1_048_576));

app.use("/*", cors({
  origin: (origin) => {
    if (process.env.NODE_ENV === "development") {
      // Only allow localhost in explicitly-set development mode
      if (origin.startsWith("http://localhost:")) return origin;
    }
    const allowed = (process.env.ALLOWED_ORIGINS ?? "").split(",").map((o) => o.trim()).filter(Boolean);
    return allowed.includes(origin) ? origin : "";
  },
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization", "X-CSRF-Token"],
  exposeHeaders: ["X-CSRF-Token", "X-Request-Id", "X-Response-Time"],
  credentials: true,
}));

app.use("/*", tracing);

// CSRF protection — validates tokens on state-changing requests
app.use("/*", csrfProtection);

// ─── Mount routes under /v1 ─────────────────────────────────────────────────
const v1 = new Hono<AppEnv>();

v1.route("/health", health);
v1.route("/auth", auth);
v1.route("/campaigns", campaigns);
v1.route("/submissions", submissions);
v1.route("/billing", billing);
v1.route("/programs", programs);
v1.route("/ai", ai);
v1.route("/exchange", exchange);
v1.route("/pricing", pricing);
v1.route("/actions", actions);
v1.route("/benchmarks", benchmarks);
v1.route("/influencers", influencers);
v1.route("/recommendations", recommendations);
v1.route("/legal", legal);
v1.route("/events", events);
v1.route("/oauth", oauth);
v1.route("/verification", verification);
v1.route("/seed", seed);

// CSP violation reporting endpoint — receives browser reports
v1.post("/csp-report", async (c) => {
  try {
    const report = await c.req.json();
    console.info(JSON.stringify({ level: "warn", event: "csp.violation", report: report["csp-report"] ?? report, timestamp: new Date().toISOString() }));
  } catch { /* ignore malformed reports */ }
  return c.json({ received: true });
});

app.route("/v1", v1);

// Root health check (for Docker healthcheck compatibility)
app.get("/", (c) => c.json({ service: "social-perks-api", status: "ok" }));
