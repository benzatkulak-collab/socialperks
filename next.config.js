/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  eslint: {
    // Lint runs separately in CI. Don't fail production builds on lint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // tsc runs separately in CI. Don't fail production builds on type errors.
    ignoreBuildErrors: true,
  },
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
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; script-src 'self' 'unsafe-inline' https://unpkg.com https://plausible.io https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline' https://unpkg.com; img-src 'self' data: blob: https:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https: https://cloudflareinsights.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; report-uri /api/v1/csp-report; report-to csp-endpoint",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
