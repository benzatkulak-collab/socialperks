import { Hono } from "hono";
import { cors } from "hono/cors";
import { tracing } from "./middleware/tracing.js";

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

export const app = new Hono();

// ─── Global middleware ───────────────────────────────────────────────────────
app.use("/*", cors({
  origin: (origin) => {
    if (process.env.NODE_ENV !== "production") {
      // Allow localhost in development
      if (origin.startsWith("http://localhost:")) return origin;
    }
    const allowed = (process.env.ALLOWED_ORIGINS ?? "").split(",").map((o) => o.trim()).filter(Boolean);
    return allowed.includes(origin) ? origin : "";
  },
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization", "X-API-Key"],
}));

app.use("/*", tracing);

// ─── Mount routes under /v1 ─────────────────────────────────────────────────
const v1 = new Hono();

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

app.route("/v1", v1);

// Root health check (for Docker healthcheck compatibility)
app.get("/", (c) => c.json({ service: "social-perks-api", status: "ok" }));
