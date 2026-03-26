import { Hono } from "hono";
import { apiResponse, apiError } from "../helpers.js";
import { createSeedData } from "@social-perks/shared/seed";

const app = new Hono();

app.post("/", (c) => {
  if (process.env.NODE_ENV === "production") {
    return apiError(c, "NOT_FOUND", "Not found", 404);
  }

  const seed = createSeedData();
  return apiResponse(c, seed);
});

export default app;
