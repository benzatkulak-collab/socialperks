const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  // Resolve "Next.js inferred your workspace root" warning by anchoring
  // file tracing to this project, not whatever sibling lockfile sits
  // higher up the tree.
  outputFileTracingRoot: path.join(__dirname),
  async rewrites() {
    // Only proxy to external API service when API_URL is explicitly set.
    // Otherwise use the built-in Next.js API routes in app/api/v1/.
    const apiUrl = process.env.API_URL;
    if (!apiUrl) return [];
    return [
      {
        source: "/api/v1/:path*",
        destination: `${apiUrl}/v1/:path*`,
      },
    ];
  },
  async headers() {
    const isDev = process.env.NODE_ENV !== "production";
    // Tracking pixel domains. Only emitted into CSP when the env var
    // for that integration is set, so the policy stays minimal when a
    // pixel isn't enabled.
    const metaPixelEnabled = !!process.env.NEXT_PUBLIC_META_PIXEL_ID;
    const gtagEnabled = !!process.env.NEXT_PUBLIC_GTAG_ID;
    const pixelScriptHosts = [
      metaPixelEnabled ? "https://connect.facebook.net" : null,
      gtagEnabled ? "https://www.googletagmanager.com" : null,
      gtagEnabled ? "https://www.google-analytics.com" : null,
    ]
      .filter((s) => s !== null)
      .join(" ");
    const pixelImgHosts = metaPixelEnabled ? "https://www.facebook.com" : "";
    const pixelConnectHosts = [
      metaPixelEnabled ? "https://www.facebook.com" : null,
      gtagEnabled ? "https://www.google-analytics.com" : null,
      // Vercel Analytics
      "https://va.vercel-scripts.com",
    ]
      .filter((s) => s !== null)
      .join(" ");

    // Dev needs 'unsafe-eval' for React Fast Refresh; prod stays locked down.
    // Google Fonts CSS loaded from layout.tsx → allow fonts.googleapis.com.
    const scriptSrc = [
      isDev
        ? "'self' 'unsafe-inline' 'unsafe-eval'"
        : "'self' 'unsafe-inline'",
      pixelScriptHosts,
      "https://va.vercel-scripts.com",
    ]
      .filter(Boolean)
      .join(" ");
    const styleSrc = "'self' 'unsafe-inline' https://fonts.googleapis.com";
    const imgSrc = ["'self'", "data:", "blob:", "https:", pixelImgHosts]
      .filter(Boolean)
      .join(" ");
    // SECURITY: connect-src was previously `https:` (any HTTPS origin),
    // which neutralized CSP's data-exfil protection — any successful
    // injection could exfiltrate to attacker-controlled HTTPS endpoints.
    // Now allowlisted to only the origins the app actually talks to.
    const connectSrc = [
      "'self'",
      "https://api.stripe.com",
      "https://va.vercel-scripts.com",
      "https://vitals.vercel-insights.com",
      pixelConnectHosts, // FB, GA when enabled
    ]
      .filter(Boolean)
      .join(" ");
    const csp = [
      "default-src 'self'",
      `script-src ${scriptSrc}`,
      `style-src ${styleSrc}`,
      `img-src ${imgSrc}`,
      "font-src 'self' data: https://fonts.gstatic.com",
      `connect-src ${connectSrc}`,
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      // SECURITY: Block <object>, <embed>, <applet> — common XSS vectors.
      "object-src 'none'",
      // Force HTTPS for any subresource that's accidentally http://.
      "upgrade-insecure-requests",
      "report-uri /api/v1/csp-report",
      "report-to csp-endpoint",
    ].join("; ");
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Report-To",
            value: '{"group":"csp-endpoint","max_age":86400,"endpoints":[{"url":"/api/v1/csp-report"}]}',
          },
          { key: "Content-Security-Policy", value: csp },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
