import { describe, it, expect, beforeEach } from "vitest";
import {
  SearchEngine,
  CDCSync,
  type IndexConfig,
  type SearchQuery,
} from "../search";

// ── Helpers ───────────────────────────────────────────────────────────────────

const testIndex: IndexConfig = {
  name: "products",
  mappings: {
    title: {
      type: "text",
      analyzer: "standard",
      searchable: true,
      filterable: false,
      sortable: true,
      boost: 2,
    },
    description: {
      type: "text",
      analyzer: "standard",
      searchable: true,
      filterable: false,
      sortable: false,
      boost: 1,
    },
    category: {
      type: "keyword",
      searchable: true,
      filterable: true,
      sortable: true,
    },
    price: {
      type: "float",
      searchable: false,
      filterable: true,
      sortable: true,
    },
    tags: {
      type: "keyword",
      searchable: true,
      filterable: true,
      sortable: false,
    },
  },
  settings: {
    numberOfShards: 1,
    numberOfReplicas: 0,
    refreshInterval: "1s",
  },
};

function makeQuery(overrides: Partial<SearchQuery> = {}): SearchQuery {
  return {
    index: "products",
    query: "",
    filters: [],
    sort: [],
    pagination: { page: 1, perPage: 10 },
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SearchEngine
// ═══════════════════════════════════════════════════════════════════════════════

describe("SearchEngine", () => {
  let engine: SearchEngine;

  beforeEach(() => {
    engine = new SearchEngine();
    engine.createIndex(testIndex);
  });

  it("createIndex creates a new index", () => {
    // The index was created in beforeEach; verify by searching (no throw)
    const result = engine.search(makeQuery());
    expect(result.total).toBe(0);
    expect(result.hits).toHaveLength(0);
  });

  it("createIndex throws on duplicate index name", () => {
    expect(() => engine.createIndex(testIndex)).toThrow("already exists");
  });

  it("indexDocument adds a document to the index", () => {
    engine.indexDocument("products", "p1", {
      title: "Blue Widget",
      description: "A nice blue widget for your home",
      category: "widgets",
      price: 19.99,
      tags: ["home", "blue"],
    });

    const result = engine.search(makeQuery({ query: "blue widget" }));
    expect(result.total).toBe(1);
    expect(result.hits[0].id).toBe("p1");
  });

  it("search with BM25 scoring returns relevant results first", () => {
    engine.indexDocument("products", "p1", {
      title: "Blue Widget",
      description: "A basic widget",
      category: "widgets",
      price: 10,
    });
    engine.indexDocument("products", "p2", {
      title: "Widget Collection Blue Blue Blue",
      description: "Blue widgets everywhere blue blue",
      category: "widgets",
      price: 20,
    });
    engine.indexDocument("products", "p3", {
      title: "Red Gadget",
      description: "A red gadget",
      category: "gadgets",
      price: 30,
    });

    const result = engine.search(makeQuery({ query: "blue widget" }));
    // p1 and p2 should score, p3 should not (no matching terms)
    const scoredIds = result.hits.filter((h) => h.score > 0).map((h) => h.id);
    expect(scoredIds).toContain("p1");
    expect(scoredIds).toContain("p2");
  });

  it("search with filter works", () => {
    engine.indexDocument("products", "p1", {
      title: "Blue Widget",
      category: "widgets",
      price: 10,
    });
    engine.indexDocument("products", "p2", {
      title: "Red Gadget",
      category: "gadgets",
      price: 30,
    });
    engine.indexDocument("products", "p3", {
      title: "Green Widget",
      category: "widgets",
      price: 50,
    });

    const result = engine.search(
      makeQuery({
        filters: [{ field: "category", operator: "eq", value: "widgets" }],
      }),
    );
    expect(result.total).toBe(2);
    expect(result.hits.every((h) => (h.source as Record<string, unknown>).category === "widgets")).toBe(true);
  });

  it("search with numeric range filter", () => {
    engine.indexDocument("products", "p1", { title: "A", price: 10 });
    engine.indexDocument("products", "p2", { title: "B", price: 25 });
    engine.indexDocument("products", "p3", { title: "C", price: 50 });

    const result = engine.search(
      makeQuery({
        filters: [
          { field: "price", operator: "range", value: { min: 15, max: 30 } },
        ],
      }),
    );
    expect(result.total).toBe(1);
    expect(result.hits[0].id).toBe("p2");
  });

  it("facet aggregation groups documents by field", () => {
    engine.indexDocument("products", "p1", {
      title: "A",
      category: "widgets",
      price: 10,
    });
    engine.indexDocument("products", "p2", {
      title: "B",
      category: "widgets",
      price: 20,
    });
    engine.indexDocument("products", "p3", {
      title: "C",
      category: "gadgets",
      price: 30,
    });

    const result = engine.search(makeQuery({ facets: ["category"] }));
    expect(result.facets).toBeDefined();
    expect(result.facets.category).toBeDefined();
    expect(result.facets.category).toHaveLength(2);

    const widgetBucket = result.facets.category.find((b) => b.key === "widgets");
    expect(widgetBucket).toBeDefined();
    expect(widgetBucket!.count).toBe(2);
  });

  it("suggest returns autocomplete suggestions", () => {
    engine.indexDocument("products", "p1", {
      title: "Social Media Campaign",
      category: "campaigns",
      price: 0,
    });
    engine.indexDocument("products", "p2", {
      title: "Social Influencer Outreach",
      category: "campaigns",
      price: 0,
    });
    engine.indexDocument("products", "p3", {
      title: "Solitary Walk",
      category: "fitness",
      price: 0,
    });

    const suggestions = engine.suggest("products", "title", "soc");
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions.some((s) => s.text === "social")).toBe(true);
  });

  it("deleteDocument removes a document from the index", () => {
    engine.indexDocument("products", "p1", {
      title: "Widget",
      category: "widgets",
      price: 10,
    });

    const before = engine.search(makeQuery({ query: "widget" }));
    expect(before.total).toBe(1);

    engine.deleteDocument("products", "p1");

    const after = engine.search(makeQuery({ query: "widget" }));
    expect(after.total).toBe(0);
  });

  it("deleteDocument throws for non-existent document", () => {
    expect(() => engine.deleteDocument("products", "nonexistent")).toThrow(
      "not found",
    );
  });

  it("deleteIndex removes the index", () => {
    engine.deleteIndex("products");
    expect(() => engine.search(makeQuery())).toThrow("does not exist");
  });

  it("bulkIndex indexes multiple documents", () => {
    const result = engine.bulkIndex("products", [
      { id: "p1", document: { title: "A", price: 10 } },
      { id: "p2", document: { title: "B", price: 20 } },
      { id: "p3", document: { title: "C", price: 30 } },
    ]);
    expect(result.indexed).toBe(3);
    expect(result.errors).toHaveLength(0);
  });

  it("search pagination works correctly", () => {
    for (let i = 0; i < 15; i++) {
      engine.indexDocument("products", `p${i}`, {
        title: `Product ${i}`,
        price: i * 10,
      });
    }

    const page1 = engine.search(
      makeQuery({ pagination: { page: 1, perPage: 5 } }),
    );
    const page2 = engine.search(
      makeQuery({ pagination: { page: 2, perPage: 5 } }),
    );

    expect(page1.hits).toHaveLength(5);
    expect(page2.hits).toHaveLength(5);
    expect(page1.total).toBe(15);
    // No overlap between pages
    const page1Ids = new Set(page1.hits.map((h) => h.id));
    const page2Ids = new Set(page2.hits.map((h) => h.id));
    for (const id of page2Ids) {
      expect(page1Ids.has(id)).toBe(false);
    }
  });

  it("search with sort orders results correctly", () => {
    engine.indexDocument("products", "p1", { title: "A", price: 30 });
    engine.indexDocument("products", "p2", { title: "B", price: 10 });
    engine.indexDocument("products", "p3", { title: "C", price: 20 });

    const result = engine.search(
      makeQuery({ sort: [{ field: "price", order: "asc" }] }),
    );
    const prices = result.hits.map(
      (h) => (h.source as Record<string, unknown>).price as number,
    );
    expect(prices).toEqual([10, 20, 30]);
  });

  it("search with highlight marks matching terms", () => {
    engine.indexDocument("products", "p1", {
      title: "Blue Widget Deluxe",
      description: "The finest blue widget",
      category: "widgets",
      price: 50,
    });

    const result = engine.search(
      makeQuery({ query: "blue", highlight: true }),
    );
    expect(result.hits).toHaveLength(1);
    expect(result.hits[0].highlights).toBeDefined();
    // At least one field should have highlights
    const hasHighlight = Object.values(result.hits[0].highlights).some(
      (arr) => arr.length > 0 && arr.some((h) => h.includes("<em>")),
    );
    expect(hasHighlight).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// CDCSync
// ═══════════════════════════════════════════════════════════════════════════════

describe("CDCSync", () => {
  let engine: SearchEngine;
  let cdc: CDCSync;

  beforeEach(() => {
    engine = new SearchEngine();
    engine.createIndex(testIndex);
    cdc = new CDCSync(engine);
  });

  it("registerSource registers a CDC source", () => {
    cdc.registerSource("products", () => []);
    // No throw means it registered successfully
    expect(cdc.getLastSyncTime("products")).toBeNull();
  });

  it("sync indexes documents from fetch function into the engine", async () => {
    cdc.registerSource("products", () => [
      {
        id: "p1",
        data: { title: "Synced Widget", price: 15 },
        updatedAt: "2024-01-01T00:00:00Z",
      },
      {
        id: "p2",
        data: { title: "Synced Gadget", price: 25 },
        updatedAt: "2024-01-02T00:00:00Z",
      },
    ]);

    const result = await cdc.sync("products");
    expect(result.synced).toBe(2);
    expect(result.errors).toHaveLength(0);

    // Verify documents are searchable
    const search = engine.search(makeQuery({ query: "synced" }));
    expect(search.total).toBe(2);
  });

  it("sync updates lastSyncTime", async () => {
    cdc.registerSource("products", () => [
      {
        id: "p1",
        data: { title: "Widget" },
        updatedAt: "2024-06-15T12:00:00Z",
      },
    ]);

    await cdc.sync("products");
    expect(cdc.getLastSyncTime("products")).toBe("2024-06-15T12:00:00Z");
  });

  it("sync throws for unregistered source", async () => {
    await expect(cdc.sync("unknown")).rejects.toThrow("not registered");
  });
});
