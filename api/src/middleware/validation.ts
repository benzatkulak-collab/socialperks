import { createMiddleware } from "hono/factory";

/**
 * Require Content-Type: application/json on the request.
 */
export const requireJson = createMiddleware(async (c, next) => {
  const contentType = c.req.header("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return c.json(
      { success: false, error: { code: "UNSUPPORTED_MEDIA_TYPE", message: "Content-Type must be application/json" } },
      415
    );
  }
  await next();
});

/**
 * Check that Content-Length does not exceed maxBytes.
 */
export function maxBodySize(maxBytes: number = 1_048_576) {
  return createMiddleware(async (c, next) => {
    const contentLength = c.req.header("content-length");
    if (contentLength && parseInt(contentLength, 10) > maxBytes) {
      return c.json(
        { success: false, error: { code: "PAYLOAD_TOO_LARGE", message: `Request body must not exceed ${Math.round(maxBytes / 1024)}KB` } },
        413
      );
    }
    await next();
  });
}
