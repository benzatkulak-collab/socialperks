/**
 * GET /.well-known/ai-plugin.json — OpenAI-style plugin manifest
 *
 * Serves a plugin manifest that AI agents and LLMs check for
 * capability discovery. Even though Social Perks is not an OpenAI
 * plugin, many agent frameworks probe this path.
 * Public endpoint, cached for 1 hour.
 */

export function GET() {
  const manifest = {
    schema_version: "v1",
    name_for_human: "Social Perks",
    name_for_model: "social_perks",
    description_for_human:
      "Turn customers into your marketing team with social media perks. Create campaigns, track submissions, and reward customers for posts, reviews, and shares.",
    description_for_model:
      "API for managing social media marketing campaigns where businesses offer perks (discounts, rewards) to customers in exchange for marketing actions (posts, reviews, shares) across 15 platforms. Supports campaign CRUD, submission management with proof verification, AI-powered campaign generation and recommendations, perk programs, an exchange marketplace, influencer search, and real-time analytics. 35+ RESTful endpoints under /api/v1 with consistent JSON envelope responses. Authenticate via Bearer token (JWT from POST /api/v1/auth) or API key.",
    auth: {
      type: "service_http",
      authorization_type: "bearer",
      verification_tokens: {},
    },
    api: {
      type: "openapi",
      url: "https://socialperks.io/api/v1/docs",
      is_user_authenticated: false,
    },
    logo_url: "https://socialperks.io/favicon.svg",
    contact_email: "developers@socialperks.io",
    legal_info_url: "https://socialperks.io/terms",
  };

  return Response.json(manifest, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=3600",
      "Content-Type": "application/json",
    },
  });
}
