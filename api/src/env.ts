import type { Env } from "hono";

/**
 * Shared Hono environment type.
 * All route-level Hono instances should use `new Hono<AppEnv>()` so that
 * `c.get("userId")` etc. are properly typed.
 */
export interface AppEnv extends Env {
  Variables: {
    userId: string | null;
    userRole: string | undefined;
    requestId: string;
  };
}
