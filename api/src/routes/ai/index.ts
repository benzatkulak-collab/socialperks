import { Hono } from "hono";
import { requireAuth } from "../../middleware/auth.js";
import { rateLimit } from "../../middleware/rate-limit.js";
import generate from "./generate.js";
import recommend from "./recommend.js";
import review from "./review.js";
import campaignAgent from "./campaign-agent.js";
import quickStart from "./quick-start.js";

const ai = new Hono();

// All AI routes require auth + standard rate limit
ai.use("/*", requireAuth);
ai.use("/*", rateLimit("standard"));

ai.route("/generate", generate);
ai.route("/recommend", recommend);
ai.route("/review", review);
ai.route("/campaign-agent", campaignAgent);
ai.route("/quick-start", quickStart);

export default ai;
