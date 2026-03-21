import { apiResponse } from "@/lib/api/middleware";
import { ensureDatabase } from "@/lib/db/init";

// Kick off DB init in the background — don't block health check
let dbInitStarted = false;
function startDbInit() {
  if (dbInitStarted) return;
  dbInitStarted = true;
  ensureDatabase().catch((err) => {
    console.error("[Health] Background DB init failed:", err);
    dbInitStarted = false;
  });
}

export async function GET() {
  startDbInit();

  return apiResponse({
    status: "healthy",
    version: process.env.npm_package_version ?? "0.1.0",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
}
