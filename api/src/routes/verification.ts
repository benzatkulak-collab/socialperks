import crypto from "crypto";
import { Hono } from "hono";
import type { AppEnv } from "@api/env.js";
import { rateLimit } from "../middleware/rate-limit.js";
import { eventBus } from "@lib/realtime";
import { logger } from "@lib/logging";

const app = new Hono<AppEnv>();

const WEBHOOK_SECRET = (() => {
  const secret = process.env.VERIFICATION_WEBHOOK_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("FATAL: VERIFICATION_WEBHOOK_SECRET must be set in production");
  }
  console.warn("[VERIFICATION] WARNING: Using default dev webhook secret.");
  return "dev-only-webhook-secret";
})();

// GET /v1/verification/webhook — Webhook challenge verification
app.get("/webhook", rateLimit("relaxed"), (c) => {
  const challenge = c.req.query("hub.challenge") ?? c.req.query("challenge");
  const verifyToken = c.req.query("hub.verify_token") ?? c.req.query("verify_token");

  if (challenge && verifyToken === "socialperks_verify") {
    return c.text(challenge);
  }

  return c.json({ error: "Invalid verification request" }, 403);
});

// POST /v1/verification/webhook — Receive platform webhooks
app.post("/webhook", rateLimit("standard"), async (c) => {
  try {
    const rawBody = await c.req.text();
    const signature = c.req.header("x-hub-signature-256") ?? c.req.header("x-signature");

    // Verify HMAC signature if present
    if (signature) {
      const expectedSig = crypto.createHmac("sha256", WEBHOOK_SECRET).update(rawBody).digest("hex");
      const sigValue = signature.replace("sha256=", "");
      try {
        if (expectedSig.length !== sigValue.length || !crypto.timingSafeEqual(Buffer.from(expectedSig, "hex"), Buffer.from(sigValue, "hex"))) {
          return c.json({ error: "Invalid signature" }, 401);
        }
      } catch {
        return c.json({ error: "Invalid signature" }, 401);
      }
    }

    const event = JSON.parse(rawBody);
    const platform = event.platform ?? event.source ?? "unknown";

    // Normalize and publish event
    const normalized = {
      type: `verification.${event.type ?? event.event ?? "unknown"}`,
      platform,
      payload: event.data ?? event.payload ?? event,
      receivedAt: new Date().toISOString(),
    };

    eventBus.publish({
      type: normalized.type,
      payload: normalized,
      timestamp: normalized.receivedAt,
    });

    logger.info("Verification webhook received", { platform, eventType: event.type ?? event.event });
    return c.json({ received: true, platform, eventType: normalized.type });
  } catch (err) {
    logger.error("Verification webhook failed", err);
    return c.json({ error: "Webhook processing failed" }, 500);
  }
});

export default app;
