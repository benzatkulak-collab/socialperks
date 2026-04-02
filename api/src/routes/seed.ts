import { Hono } from "hono";
import type { AppEnv } from "@api/env.js";
import { apiResponse, apiError } from "../helpers.js";
import { createSeedData } from "@social-perks/shared/seed";

const app = new Hono<AppEnv>();

app.post("/", (c) => {
  // Only allow in explicitly-set development mode
  if (process.env.NODE_ENV !== "development") {
    return apiError(c, "NOT_FOUND", "Not found", 404);
  }

  const seed = createSeedData();
  return apiResponse(c, seed);
});

export default app;
