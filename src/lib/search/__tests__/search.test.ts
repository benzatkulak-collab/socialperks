import { describe, it, expect, beforeEach } from "vitest";
import { SearchEngine } from "../index";
import type { SearchDocument, SearchResult } from "../index";
import { tokenize, stem, editDistance } from "../tokenizer";

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeCampaign(
  id: string,
  name: string,
  description = "",
  boost?: number
): SearchDocument {
  return {
    id,
    type: "campaign",
    fields: { name, description },
    boost,
    metadata: { state: "active" },
  };
}

function makeBusiness(id: string, name: string, category = ""): SearchDocument {
  return {
    id,
    type: "business",
    fields: { name, category },
    metadata: { size: "small" },
  };
}

function makeInfluencer(
  id: string,
  name: string,
  bio = ""
): SearchDocument {
  return {
    id,
    type: "influencer",
    fields: { name, bio },
    metadata: { followers: 10000 },
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("SearchEngine", () => {
  let engine: SearchEngine;

  beforeEach(() => {
    engine = new SearchEngine();
  });

  // ── Tokenization integration ──────────────────────────────────────────

  describe("tokenization", () => {
    it("splits, lowercases, removes stopwords, and stems", () => {
      const tokens = tokenize("The Quick Marketing Campaign");
      expect(tokens).not.toContain("the");
      expect(tokens).toContain(stem("quick"));
      expect(tokens).toContain(stem("marketing"));
      expect(tokens).toContain(stem("campaign"));
    });
  });

  // ── Add and search ────────────────────────────────────────────────────

  describe("add and search documents", () => {
    it("finds documents matching the query", () => {
      engine.addDocument(makeCampaign("c1", "Summer Marketing Campaign"));
      engine.addDocument(makeCampaign("c2", "Winter Sale Promotion"));
      engine.addDocument(makeCampaign("c3", "Spring Review Drive"));

      const results = engine.search("marketing");
      expect(results.length).toBe(1);
      expect(results[0].id).toBe("c1");
    });

    it("finds documents across multiple fields", () => {
      engine.addDocument(
        makeCampaign("c1", "Social Review", "Get reviews on Google Maps")
      );
      engine.addDocument(makeCampaign("c2", "Share Campaign", "Share on social media"));

      const results = engine.search("social");
      expect(results.length).toBe(2);
    });

    it("returns empty for unmatched query", () => {
      engine.addDocument(makeCampaign("c1", "Summer Campaign"));
      const results = engine.search("winter");
      expect(results.length).toBe(0);
    });
  });

  // ── TF-IDF scoring ────────────────────────────────────────────────────

  describe("TF-IDF scoring", () => {
    it("scores documents with more term occurrences higher", () => {
      engine.addDocument(
        makeCampaign(
          "c1",
          "Marketing Campaign",
          "A great marketing plan for marketing teams"
        )
      );
      engine.addDocument(
        makeCampaign("c2", "Summer Sale", "A simple sale event")
      );

      const results = engine.search("marketing");
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results[0].id).toBe("c1");
    });

    it("applies IDF — rare terms are worth more", () => {
      // "yoga" appears in 1 doc, "campaign" in all 3
      engine.addDocument(
        makeCampaign("c1", "Yoga Campaign", "Yoga studio promotion campaign")
      );
      engine.addDocument(
        makeCampaign("c2", "Food Campaign", "Restaurant campaign")
      );
      engine.addDocument(
        makeCampaign("c3", "Gym Campaign", "Fitness campaign")
      );

      const results = engine.search("yoga campaign");
      expect(results.length).toBeGreaterThanOrEqual(1);
      // c1 should score highest because it matches the rarer "yoga" term
      expect(results[0].id).toBe("c1");
    });
  });

  // ── Multi-field search ────────────────────────────────────────────────

  describe("multi-field search", () => {
    it("finds matches across different fields", () => {
      engine.addDocument({
        id: "b1",
        type: "business",
        fields: {
          name: "Sunrise Bakery",
          category: "food and beverage",
          location: "Portland Oregon",
        },
      });

      expect(engine.search("bakery").length).toBe(1);
      expect(engine.search("portland").length).toBe(1);
      expect(engine.search("food").length).toBe(1);
    });
  });

  // ── Fuzzy matching ────────────────────────────────────────────────────

  describe("fuzzy matching", () => {
    it("finds documents with 1 edit distance", () => {
      engine.addDocument(makeCampaign("c1", "Marketing Campaign"));

      // "marketing" stems to "market", so "merket" is 1 edit from "market"
      const results = engine.search("merket", { fuzzyDistance: 1 });
      expect(results.length).toBe(1);
      expect(results[0].id).toBe("c1");
    });

    it("does not match when edit distance exceeds threshold", () => {
      engine.addDocument(makeCampaign("c1", "Marketing Campaign"));

      // "mrkting" is far from "marketing"
      const results = engine.search("mrkting", { fuzzyDistance: 1 });
      expect(results.length).toBe(0);
    });

    it("disables fuzzy when distance is 0", () => {
      engine.addDocument(makeCampaign("c1", "Marketing Campaign"));

      const exact = engine.search("marketing", { fuzzyDistance: 0 });
      expect(exact.length).toBe(1);

      const fuzzy = engine.search("marketng", { fuzzyDistance: 0 });
      expect(fuzzy.length).toBe(0);
    });
  });

  // ── Levenshtein distance ──────────────────────────────────────────────

  describe("Levenshtein distance", () => {
    it("returns 0 for identical strings", () => {
      expect(editDistance("test", "test")).toBe(0);
    });

    it("handles insertion", () => {
      expect(editDistance("cat", "cats")).toBe(1);
    });

    it("handles deletion", () => {
      expect(editDistance("cats", "cat")).toBe(1);
    });

    it("handles substitution", () => {
      expect(editDistance("cat", "bat")).toBe(1);
    });

    it("handles multiple edits", () => {
      expect(editDistance("kitten", "sitting")).toBe(3);
    });
  });

  // ── Document removal ──────────────────────────────────────────────────

  describe("document removal", () => {
    it("removes document from index", () => {
      engine.addDocument(makeCampaign("c1", "Marketing Campaign"));
      engine.addDocument(makeCampaign("c2", "Review Campaign"));

      expect(engine.search("marketing").length).toBe(1);

      engine.removeDocument("c1");

      expect(engine.search("marketing").length).toBe(0);
      expect(engine.getStats().documentCount).toBe(1);
    });

    it("updates token count after removal", () => {
      engine.addDocument(makeCampaign("c1", "Marketing Campaign"));
      const before = engine.getStats();
      engine.removeDocument("c1");
      const after = engine.getStats();

      expect(after.documentCount).toBe(before.documentCount - 1);
    });

    it("is safe to remove non-existent document", () => {
      engine.removeDocument("nonexistent");
      expect(engine.getStats().documentCount).toBe(0);
    });
  });

  // ── Type filtering ────────────────────────────────────────────────────

  describe("type filtering", () => {
    it("filters results by document type", () => {
      engine.addDocument(makeCampaign("c1", "Summer Marketing"));
      engine.addDocument(makeBusiness("b1", "Marketing Agency"));
      engine.addDocument(makeInfluencer("i1", "Marketing Maven"));

      const campaigns = engine.search("marketing", { types: ["campaign"] });
      expect(campaigns.length).toBe(1);
      expect(campaigns[0].type).toBe("campaign");

      const businesses = engine.search("marketing", { types: ["business"] });
      expect(businesses.length).toBe(1);
      expect(businesses[0].type).toBe("business");
    });

    it("supports multiple type filters", () => {
      engine.addDocument(makeCampaign("c1", "Summer Marketing"));
      engine.addDocument(makeBusiness("b1", "Marketing Agency"));
      engine.addDocument(makeInfluencer("i1", "Marketing Maven"));

      const results = engine.search("marketing", {
        types: ["campaign", "influencer"],
      });
      expect(results.length).toBe(2);
      expect(results.map((r) => r.type).sort()).toEqual([
        "campaign",
        "influencer",
      ]);
    });

    it("returns empty when type has no matches", () => {
      engine.addDocument(makeCampaign("c1", "Summer Marketing"));

      const results = engine.search("marketing", { types: ["business"] });
      expect(results.length).toBe(0);
    });
  });

  // ── Pagination ────────────────────────────────────────────────────────

  describe("pagination", () => {
    beforeEach(() => {
      for (let i = 0; i < 30; i++) {
        engine.addDocument(
          makeCampaign(`c${i}`, `Marketing Campaign ${i}`)
        );
      }
    });

    it("defaults to 20 results", () => {
      const results = engine.search("marketing");
      expect(results.length).toBe(20);
    });

    it("respects limit parameter", () => {
      const results = engine.search("marketing", { limit: 5 });
      expect(results.length).toBe(5);
    });

    it("respects offset parameter", () => {
      const all = engine.search("marketing", { limit: 30 });
      const page2 = engine.search("marketing", { limit: 10, offset: 10 });

      expect(page2.length).toBe(10);
      expect(page2[0].id).toBe(all[10].id);
    });

    it("returns empty when offset exceeds results", () => {
      const results = engine.search("marketing", { offset: 100 });
      expect(results.length).toBe(0);
    });
  });

  // ── Highlighting ──────────────────────────────────────────────────────

  describe("highlighting", () => {
    it("wraps matching terms in <mark> tags", () => {
      engine.addDocument(
        makeCampaign("c1", "Summer Marketing Campaign")
      );

      const results = engine.search("marketing");
      expect(results.length).toBe(1);
      expect(results[0].highlights.name).toContain("<mark>");
      expect(results[0].highlights.name).toContain("Marketing");
      expect(results[0].highlights.name).toContain("</mark>");
    });

    it("preserves non-matching words", () => {
      engine.addDocument(makeCampaign("c1", "Summer Marketing Event"));

      const results = engine.search("marketing");
      expect(results[0].highlights.name).toContain("Summer");
      expect(results[0].highlights.name).toContain("Event");
    });

    it("highlights multiple matching terms", () => {
      engine.addDocument(
        makeCampaign("c1", "Marketing Campaign for Marketing Teams")
      );

      const results = engine.search("marketing");
      const marks = results[0].highlights.name.match(/<mark>/g) ?? [];
      expect(marks.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ── Autocomplete ──────────────────────────────────────────────────────

  describe("autocomplete suggestions", () => {
    it("returns words matching prefix", () => {
      engine.addDocument(makeCampaign("c1", "Marketing Campaign"));
      engine.addDocument(makeBusiness("b1", "Market Research Firm"));

      const suggestions = engine.suggest("mark");
      expect(suggestions.length).toBeGreaterThanOrEqual(1);
      expect(suggestions.some((s) => s.startsWith("mark"))).toBe(true);
    });

    it("sorts by frequency", () => {
      engine.addDocument(
        makeCampaign("c1", "Marketing marketing marketing plan")
      );
      engine.addDocument(makeCampaign("c2", "March event"));

      const suggestions = engine.suggest("mar");
      // "marketing" should come before "march" due to frequency
      expect(suggestions[0]).toBe("marketing");
    });

    it("respects limit", () => {
      for (let i = 0; i < 20; i++) {
        engine.addDocument(makeCampaign(`c${i}`, `Campaign test${i} word`));
      }

      const suggestions = engine.suggest("test", 3);
      expect(suggestions.length).toBeLessThanOrEqual(3);
    });

    it("returns empty for empty prefix", () => {
      engine.addDocument(makeCampaign("c1", "Marketing Campaign"));
      expect(engine.suggest("")).toEqual([]);
    });

    it("returns empty for non-matching prefix", () => {
      engine.addDocument(makeCampaign("c1", "Marketing Campaign"));
      expect(engine.suggest("xyz")).toEqual([]);
    });
  });

  // ── Empty query ───────────────────────────────────────────────────────

  describe("empty query", () => {
    it("returns empty for empty string", () => {
      engine.addDocument(makeCampaign("c1", "Marketing Campaign"));
      expect(engine.search("")).toEqual([]);
    });

    it("returns empty for whitespace-only query", () => {
      engine.addDocument(makeCampaign("c1", "Marketing Campaign"));
      expect(engine.search("   ")).toEqual([]);
    });

    it("returns empty for stopwords-only query", () => {
      engine.addDocument(makeCampaign("c1", "Marketing Campaign"));
      expect(engine.search("the and or")).toEqual([]);
    });
  });

  // ── Special characters ────────────────────────────────────────────────

  describe("special characters", () => {
    it("handles punctuation in query", () => {
      engine.addDocument(makeCampaign("c1", "Marketing Campaign"));

      const results = engine.search("marketing!");
      expect(results.length).toBe(1);
    });

    it("handles special characters in documents", () => {
      engine.addDocument(
        makeCampaign("c1", "50% Off! Summer Sale <Best Deal>")
      );

      const results = engine.search("summer sale");
      expect(results.length).toBe(1);
    });

    it("handles unicode characters", () => {
      engine.addDocument(makeCampaign("c1", "Caf\u00e9 Marketing Campaign"));

      const results = engine.search("cafe");
      expect(results.length).toBe(1);
    });
  });

  // ── Large document set performance ────────────────────────────────────

  describe("performance", () => {
    it("handles 1000 documents efficiently", () => {
      const categories = [
        "marketing",
        "social",
        "review",
        "referral",
        "engagement",
        "branding",
        "content",
        "video",
        "photo",
        "story",
      ];

      for (let i = 0; i < 1000; i++) {
        const cat = categories[i % categories.length];
        engine.addDocument(
          makeCampaign(
            `c${i}`,
            `${cat} Campaign ${i}`,
            `A ${cat} focused initiative for business growth number ${i}`
          )
        );
      }

      const stats = engine.getStats();
      expect(stats.documentCount).toBe(1000);

      const start = performance.now();
      const results = engine.search("marketing campaign growth");
      const elapsed = performance.now() - start;

      expect(results.length).toBeGreaterThan(0);
      // Should complete well under 1 second
      expect(elapsed).toBeLessThan(1000);
    });
  });

  // ── Boost fields ──────────────────────────────────────────────────────

  describe("boost fields", () => {
    it("increases score for boosted fields", () => {
      engine.addDocument({
        id: "c1",
        type: "campaign",
        fields: {
          name: "Generic Event",
          description: "A marketing workshop",
        },
      });
      engine.addDocument({
        id: "c2",
        type: "campaign",
        fields: {
          name: "Marketing Workshop",
          description: "A generic event",
        },
      });

      // Boost name field — c2 has "marketing" in name
      const results = engine.search("marketing", {
        boostFields: { name: 5.0, description: 1.0 },
      });
      expect(results.length).toBe(2);
      expect(results[0].id).toBe("c2");
    });

    it("works with document-level boost", () => {
      engine.addDocument(
        makeCampaign("c1", "Marketing Campaign", "", 1.0)
      );
      engine.addDocument(
        makeCampaign("c2", "Marketing Event", "", 3.0)
      );

      const results = engine.search("marketing");
      expect(results.length).toBe(2);
      expect(results[0].id).toBe("c2");
    });
  });

  // ── Update document ───────────────────────────────────────────────────

  describe("updateDocument", () => {
    it("replaces existing document content", () => {
      engine.addDocument(makeCampaign("c1", "Summer Marketing Campaign"));

      // Should find "summer"
      expect(engine.search("summer").length).toBe(1);

      engine.updateDocument(makeCampaign("c1", "Winter Promotion Drive"));

      // Should no longer find "summer"
      expect(engine.search("summer").length).toBe(0);
      // Should find "winter"
      expect(engine.search("winter").length).toBe(1);
      // Doc count should still be 1
      expect(engine.getStats().documentCount).toBe(1);
    });
  });

  // ── Reindex ───────────────────────────────────────────────────────────

  describe("reindex", () => {
    it("rebuilds the index from stored documents", () => {
      engine.addDocument(makeCampaign("c1", "Marketing Campaign"));
      engine.addDocument(makeCampaign("c2", "Review Drive"));

      engine.reindex();

      expect(engine.getStats().documentCount).toBe(2);
      expect(engine.search("marketing").length).toBe(1);
      expect(engine.search("review").length).toBe(1);
    });
  });

  // ── getStats ──────────────────────────────────────────────────────────

  describe("getStats", () => {
    it("returns correct counts", () => {
      expect(engine.getStats().documentCount).toBe(0);

      engine.addDocument(makeCampaign("c1", "Marketing Campaign"));
      engine.addDocument(makeCampaign("c2", "Review Drive"));

      const stats = engine.getStats();
      expect(stats.documentCount).toBe(2);
      expect(stats.tokenCount).toBeGreaterThan(0);
      expect(stats.avgDocLength).toBeGreaterThan(0);
    });

    it("returns 0 avgDocLength when empty", () => {
      expect(engine.getStats().avgDocLength).toBe(0);
    });
  });

  // ── Metadata ──────────────────────────────────────────────────────────

  describe("metadata", () => {
    it("preserves metadata in search results", () => {
      engine.addDocument(makeCampaign("c1", "Marketing Campaign"));

      const results = engine.search("marketing");
      expect(results[0].metadata).toEqual({ state: "active" });
    });
  });
});
