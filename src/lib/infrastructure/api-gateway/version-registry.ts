// ══════════════════════════════════════════════════════════════════════════════
// Social Perks — Pre-configured API Versions
// Registers all known API versions with their route manifests and changelogs.
// ══════════════════════════════════════════════════════════════════════════════

import { APIVersionManager } from "./version-manager";

export function createVersionManager(): APIVersionManager {
  const mgr = new APIVersionManager();

  mgr.registerVersion("1.0.0", {
    releaseDate: "2025-01-01",
    routes: [
      { path: "/campaigns", method: "GET", handler: "campaigns.list", addedIn: "1.0.0" },
      { path: "/campaigns", method: "POST", handler: "campaigns.create", addedIn: "1.0.0" },
      { path: "/influencers", method: "GET", handler: "influencers.search", addedIn: "1.0.0" },
      { path: "/influencers", method: "POST", handler: "influencers.register", addedIn: "1.0.0" },
      { path: "/submissions", method: "GET", handler: "submissions.list", addedIn: "1.0.0" },
      { path: "/submissions", method: "POST", handler: "submissions.create", addedIn: "1.0.0" },
      { path: "/pricing", method: "GET", handler: "pricing.query", addedIn: "1.0.0" },
      { path: "/actions", method: "GET", handler: "actions.list", addedIn: "1.0.0" },
      { path: "/benchmarks", method: "GET", handler: "benchmarks.query", addedIn: "1.0.0" },
      { path: "/auth", method: "POST", handler: "auth.login", addedIn: "1.0.0" },
      { path: "/ai/generate", method: "POST", handler: "ai.generate", addedIn: "1.0.0" },
      { path: "/ai/recommend", method: "POST", handler: "ai.recommend", addedIn: "1.0.0" },
      { path: "/billing", method: "GET", handler: "billing.get", addedIn: "1.0.0" },
      { path: "/billing", method: "POST", handler: "billing.update", addedIn: "1.0.0" },
      { path: "/events", method: "GET", handler: "events.list", addedIn: "1.0.0" },
      { path: "/health", method: "GET", handler: "health.check", addedIn: "1.0.0" },
    ],
  });

  mgr.registerVersion("2.0.0", {
    releaseDate: "2025-07-01",
    routes: [
      { path: "/campaigns", method: "GET", handler: "campaigns.list.v2", addedIn: "1.0.0", changelog: "Added cursor-based pagination" },
      { path: "/campaigns", method: "POST", handler: "campaigns.create.v2", addedIn: "1.0.0", changelog: "Added multi-platform campaign support" },
      { path: "/campaigns/{id}", method: "GET", handler: "campaigns.get", addedIn: "2.0.0", changelog: "New: Get single campaign by ID" },
      { path: "/campaigns/{id}", method: "PUT", handler: "campaigns.update", addedIn: "2.0.0", changelog: "New: Update campaign" },
      { path: "/campaigns/{id}", method: "DELETE", handler: "campaigns.delete", addedIn: "2.0.0", changelog: "New: Delete campaign" },
      { path: "/influencers", method: "GET", handler: "influencers.search.v2", addedIn: "1.0.0", changelog: "Added geo-search support" },
      { path: "/influencers", method: "POST", handler: "influencers.register", addedIn: "1.0.0" },
      { path: "/influencers/{id}", method: "GET", handler: "influencers.get", addedIn: "2.0.0", changelog: "New: Get influencer by ID" },
      { path: "/submissions", method: "GET", handler: "submissions.list", addedIn: "1.0.0" },
      { path: "/submissions", method: "POST", handler: "submissions.create", addedIn: "1.0.0" },
      { path: "/submissions/review", method: "POST", handler: "submissions.review", addedIn: "2.0.0", changelog: "New: Review submissions endpoint" },
      { path: "/pricing", method: "GET", handler: "pricing.query", addedIn: "1.0.0" },
      { path: "/actions", method: "GET", handler: "actions.list", addedIn: "1.0.0" },
      { path: "/benchmarks", method: "GET", handler: "benchmarks.query", addedIn: "1.0.0" },
      { path: "/auth", method: "POST", handler: "auth.login.v2", addedIn: "1.0.0", changelog: "Added OAuth2 support" },
      { path: "/ai/generate", method: "POST", handler: "ai.generate", addedIn: "1.0.0" },
      { path: "/ai/recommend", method: "POST", handler: "ai.recommend", addedIn: "1.0.0" },
      { path: "/ai/review", method: "POST", handler: "ai.review", addedIn: "2.0.0", changelog: "New: AI submission review" },
      { path: "/billing", method: "GET", handler: "billing.get", addedIn: "1.0.0" },
      { path: "/billing", method: "POST", handler: "billing.update", addedIn: "1.0.0" },
      { path: "/billing/webhook", method: "POST", handler: "billing.webhook", addedIn: "2.0.0", changelog: "New: Billing webhook handler" },
      { path: "/events", method: "GET", handler: "events.list", addedIn: "1.0.0" },
      { path: "/health", method: "GET", handler: "health.check", addedIn: "1.0.0" },
      { path: "/exchange/market", method: "GET", handler: "exchange.market", addedIn: "2.0.0", changelog: "New: Perk exchange market" },
      { path: "/exchange/trades", method: "POST", handler: "exchange.trades", addedIn: "2.0.0", changelog: "New: Execute perk trades" },
    ],
  });

  return mgr;
}
