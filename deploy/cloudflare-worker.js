/**
 * Social Perks — Cloudflare Worker Router
 * Routes /api/v1/* to the API service, everything else to Next.js.
 *
 * Environment variables (set in Cloudflare dashboard):
 *   API_ORIGIN  = https://api.socialperks.app  (Hono service)
 *   WEB_ORIGIN  = https://web.socialperks.app  (Next.js service)
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Route API requests to Hono service
    if (url.pathname.startsWith("/api/v1/")) {
      const apiPath = url.pathname.replace("/api/v1/", "/v1/");
      const apiUrl = new URL(apiPath + url.search, env.API_ORIGIN);

      const apiRequest = new Request(apiUrl, {
        method: request.method,
        headers: request.headers,
        body: request.body,
        redirect: "follow",
      });

      // Forward client IP
      apiRequest.headers.set("X-Forwarded-For", request.headers.get("CF-Connecting-IP") || "");
      apiRequest.headers.set("X-Forwarded-Proto", "https");

      const response = await fetch(apiRequest);

      // Add CORS headers for API responses
      const corsHeaders = new Headers(response.headers);
      corsHeaders.set("Access-Control-Allow-Origin", url.origin);
      corsHeaders.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
      corsHeaders.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-API-Key");

      return new Response(response.body, {
        status: response.status,
        headers: corsHeaders,
      });
    }

    // Handle CORS preflight for API routes
    if (request.method === "OPTIONS" && url.pathname.startsWith("/api/")) {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": url.origin,
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    // Everything else → Next.js
    const webUrl = new URL(url.pathname + url.search, env.WEB_ORIGIN);
    return fetch(new Request(webUrl, request));
  },
};
