import { Hono } from "hono";
import { apiResponse, parsePagination, paginationMeta } from "../helpers.js";
import { rateLimit } from "../middleware/rate-limit.js";
import { ALL_ACTIONS as ACTIONS } from "@/lib/platforms";

const app = new Hono();

app.get("/", rateLimit("public"), (c) => {
  const params = c.req.query();
  const platformId = params.platformId;
  const type = params.type;
  const maxEffort = params.maxEffort ? parseInt(params.maxEffort) : undefined;
  const { page, perPage } = parsePagination(new URLSearchParams(params));

  let actions = [...ACTIONS];

  if (platformId) actions = actions.filter((a) => a.platformId === platformId);
  if (type) actions = actions.filter((a) => a.type === type);
  if (maxEffort !== undefined) actions = actions.filter((a) => a.effort <= maxEffort);

  const total = actions.length;
  const paginated = actions.slice((page - 1) * perPage, page * perPage);

  return apiResponse(c, {
    actions: paginated,
    pagination: paginationMeta(total, page, perPage),
  }, 200, { "Cache-Control": "public, max-age=3600" });
});

export default app;
