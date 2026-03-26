import { serve } from "@hono/node-server";
import { app } from "./app.js";

const port = parseInt(process.env.API_PORT || "4000", 10);

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Social Perks API running on http://localhost:${info.port}`);
});
