// ══════════════════════════════════════════════════════════════════════════════
// Social Perks — Search Infrastructure
// In-memory full-text search engine with BM25 scoring, CDC sync, and
// pre-configured indexes for campaigns, influencers, and businesses.
// ══════════════════════════════════════════════════════════════════════════════

// ─── Types ──────────────────────────────────────────────────────────────────

export interface IndexConfig {
  name: string;
  mappings: Record<string, FieldMapping>;
  settings: {
    numberOfShards: number;
    numberOfReplicas: number;
    refreshInterval: string;
  };
}

export interface FieldMapping {
  type:
    | "text"
    | "keyword"
    | "integer"
    | "float"
    | "boolean"
    | "date"
    | "geo_point"
    | "nested";
  analyzer?: "standard" | "keyword" | "autocomplete";
  searchable: boolean;
  filterable: boolean;
  sortable: boolean;
  boost?: number;
}

export interface SearchQuery {
  index: string;
  query: string;
  filters: SearchFilter[];
  sort: { field: string; order: "asc" | "desc" }[];
  pagination: { page: number; perPage: number };
  facets?: string[];
  highlight?: boolean;
  geo?: { field: string; lat: number; lng: number; radiusKm: number };
}

export interface SearchFilter {
  field: string;
  operator:
    | "eq"
    | "neq"
    | "gt"
    | "gte"
    | "lt"
    | "lte"
    | "in"
    | "range"
    | "exists"
    | "prefix";
  value: unknown;
}

export interface SearchResult<T = Record<string, unknown>> {
  hits: SearchHit<T>[];
  total: number;
  facets: Record<string, FacetBucket[]>;
  took: number; // ms
  maxScore: number;
}

export interface SearchHit<T> {
  id: string;
  score: number;
  source: T;
  highlights: Record<string, string[]>;
}

export interface FacetBucket {
  key: string;
  count: number;
}

// ─── Internal Types ─────────────────────────────────────────────────────────

interface InternalDocument {
  id: string;
  source: Record<string, unknown>;
  tokens: Map<string, number[]>; // field -> token positions per field (flat)
  tokenCounts: Map<string, number>; // field -> total token count
  totalTokens: number;
}

interface InternalIndex {
  config: IndexConfig;
  documents: Map<string, InternalDocument>;
  /** Total tokens across all documents in each field. */
  fieldTokenTotals: Map<string, number>;
  /** Number of documents containing each term per field. */
  documentFrequency: Map<string, Map<string, number>>; // field -> term -> docCount
}

// ─── Tokenizer ──────────────────────────────────────────────────────────────

const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for",
  "of", "with", "by", "from", "is", "it", "this", "that", "are", "was",
  "were", "be", "been", "being", "have", "has", "had", "do", "does",
  "did", "will", "would", "could", "should", "may", "might", "shall",
  "can", "not", "no", "so", "if", "as", "up",
]);

function tokenize(text: string): string[] {
  if (typeof text !== "string") return [];
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 0 && !STOP_WORDS.has(t));
}

function autocompleteTokenize(text: string): string[] {
  if (typeof text !== "string") return [];
  const base = text.toLowerCase().replace(/[^\w\s]/g, " ").split(/\s+/).filter((t) => t.length > 0);
  const prefixes: string[] = [];
  for (const token of base) {
    for (let len = 1; len <= token.length; len++) {
      prefixes.push(token.slice(0, len));
    }
  }
  return prefixes;
}

// ─── Geo Helpers ────────────────────────────────────────────────────────────

function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Search Engine ──────────────────────────────────────────────────────────

export class SearchEngine {
  private indexes: Map<string, InternalIndex> = new Map();

  // BM25 parameters
  private readonly k1 = 1.2;
  private readonly b = 0.75;

  // ── Index Management ────────────────────────────────────────────────────

  createIndex(config: IndexConfig): void {
    if (this.indexes.has(config.name)) {
      throw new Error(`Index "${config.name}" already exists`);
    }
    this.indexes.set(config.name, {
      config,
      documents: new Map(),
      fieldTokenTotals: new Map(),
      documentFrequency: new Map(),
    });
  }

  deleteIndex(index: string): void {
    if (!this.indexes.has(index)) {
      throw new Error(`Index "${index}" does not exist`);
    }
    this.indexes.delete(index);
  }

  // ── Document Operations ─────────────────────────────────────────────────

  indexDocument(
    index: string,
    id: string,
    document: Record<string, unknown>,
  ): void {
    const idx = this.getIndex(index);

    // Remove old doc if updating
    if (idx.documents.has(id)) {
      this.removeDocumentStats(idx, id);
    }

    const tokens = new Map<string, number[]>();
    const tokenCounts = new Map<string, number>();
    let totalTokens = 0;

    for (const [field, mapping] of Object.entries(idx.config.mappings)) {
      if (!mapping.searchable && mapping.type !== "text") continue;
      const value = this.resolveField(document, field);
      if (value === undefined || value === null) continue;

      const text = Array.isArray(value) ? value.join(" ") : String(value);
      const useAutocomplete = mapping.analyzer === "autocomplete";
      const fieldTokens = useAutocomplete
        ? autocompleteTokenize(text)
        : tokenize(text);

      tokens.set(field, fieldTokens.map((_, i) => i));
      tokenCounts.set(field, fieldTokens.length);
      totalTokens += fieldTokens.length;

      // Update document frequency
      if (!idx.documentFrequency.has(field)) {
        idx.documentFrequency.set(field, new Map());
      }
      const dfMap = idx.documentFrequency.get(field)!;
      const uniqueTerms = Array.from(new Set(fieldTokens));
      for (const term of uniqueTerms) {
        dfMap.set(term, (dfMap.get(term) ?? 0) + 1);
      }

      // Update field token totals
      idx.fieldTokenTotals.set(
        field,
        (idx.fieldTokenTotals.get(field) ?? 0) + fieldTokens.length,
      );
    }

    idx.documents.set(id, { id, source: document, tokens, tokenCounts, totalTokens });
  }

  bulkIndex(
    index: string,
    documents: { id: string; document: Record<string, unknown> }[],
  ): { indexed: number; errors: string[] } {
    const errors: string[] = [];
    let indexed = 0;
    for (const doc of documents) {
      try {
        this.indexDocument(index, doc.id, doc.document);
        indexed++;
      } catch (err) {
        errors.push(`${doc.id}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    return { indexed, errors };
  }

  deleteDocument(index: string, id: string): void {
    const idx = this.getIndex(index);
    if (!idx.documents.has(id)) {
      throw new Error(`Document "${id}" not found in index "${index}"`);
    }
    this.removeDocumentStats(idx, id);
    idx.documents.delete(id);
  }

  // ── Search ──────────────────────────────────────────────────────────────

  search<T = Record<string, unknown>>(query: SearchQuery): SearchResult<T> {
    const start = Date.now();
    const idx = this.getIndex(query.index);
    const N = idx.documents.size;

    // 1. Compute BM25 scores for the query
    const queryTokens = tokenize(query.query);
    const scored: { id: string; score: number; doc: InternalDocument }[] = [];

    for (const [docId, doc] of Array.from(idx.documents.entries())) {
      let totalScore = 0;

      if (queryTokens.length > 0) {
        for (const [field, mapping] of Object.entries(idx.config.mappings)) {
          if (!mapping.searchable) continue;

          const value = this.resolveField(doc.source, field);
          if (value === undefined || value === null) continue;

          const text = Array.isArray(value) ? value.join(" ") : String(value);
          const useAutocomplete = mapping.analyzer === "autocomplete";
          const docTokens = useAutocomplete
            ? autocompleteTokenize(text)
            : tokenize(text);
          const docLen = docTokens.length;

          const fieldTotal = idx.fieldTokenTotals.get(field) ?? 0;
          const fieldDocCount = this.countDocsWithField(idx, field);
          const avgDocLen = fieldDocCount > 0 ? fieldTotal / fieldDocCount : 0;
          const boost = mapping.boost ?? 1;

          const dfMap = idx.documentFrequency.get(field);

          for (const term of queryTokens) {
            // Term frequency in this document's field
            const tf = docTokens.filter((t) => t === term).length;
            if (tf === 0) continue;

            // Document frequency for IDF
            const df = dfMap?.get(term) ?? 0;

            // BM25 IDF: log((N - df + 0.5) / (df + 0.5) + 1)
            const idf = Math.log((N - df + 0.5) / (df + 0.5) + 1);

            // BM25 score component
            const tfNorm =
              (tf * (this.k1 + 1)) /
              (tf + this.k1 * (1 - this.b + this.b * (docLen / (avgDocLen || 1))));

            totalScore += idf * tfNorm * boost;
          }
        }
      } else {
        // Empty query — score all documents equally
        totalScore = 1;
      }

      scored.push({ id: docId, score: totalScore, doc });
    }

    // 2. Apply filters
    let filtered = scored;
    for (const filter of query.filters) {
      filtered = filtered.filter((item) =>
        this.applyFilter(item.doc.source, filter, idx.config.mappings),
      );
    }

    // 3. Apply geo filter
    if (query.geo) {
      const { field, lat, lng, radiusKm } = query.geo;
      filtered = filtered.filter((item) => {
        const geoValue = this.resolveField(item.doc.source, field) as
          | { lat: number; lng: number }
          | undefined;
        if (!geoValue || typeof geoValue.lat !== "number") return false;
        return haversineKm(lat, lng, geoValue.lat, geoValue.lng) <= radiusKm;
      });
    }

    const total = filtered.length;

    // 4. Sort
    if (query.sort.length > 0) {
      filtered.sort((a, b) => {
        for (const s of query.sort) {
          const aVal = this.resolveField(a.doc.source, s.field);
          const bVal = this.resolveField(b.doc.source, s.field);
          const cmp = this.compareValues(aVal, bVal);
          if (cmp !== 0) return s.order === "asc" ? cmp : -cmp;
        }
        return 0;
      });
    } else {
      // Sort by score descending
      filtered.sort((a, b) => b.score - a.score);
    }

    // 5. Pagination
    const { page, perPage } = query.pagination;
    const startIdx = (page - 1) * perPage;
    const pageItems = filtered.slice(startIdx, startIdx + perPage);

    // 6. Build hits with highlights
    const maxScore = filtered.length > 0 ? Math.max(...filtered.map((f) => f.score)) : 0;
    const hits: SearchHit<T>[] = pageItems.map((item) => ({
      id: item.id,
      score: item.score,
      source: item.doc.source as T,
      highlights: query.highlight
        ? this.computeHighlights(item.doc.source, queryTokens, idx.config.mappings)
        : {},
    }));

    // 7. Compute facets
    const facets: Record<string, FacetBucket[]> = {};
    if (query.facets) {
      for (const facetField of query.facets) {
        const bucketMap = new Map<string, number>();
        for (const item of filtered) {
          const val = this.resolveField(item.doc.source, facetField);
          if (val === undefined || val === null) continue;
          const keys = Array.isArray(val) ? val.map(String) : [String(val)];
          for (const key of keys) {
            bucketMap.set(key, (bucketMap.get(key) ?? 0) + 1);
          }
        }
        facets[facetField] = Array.from(bucketMap.entries())
          .map(([key, count]) => ({ key, count }))
          .sort((a, b) => b.count - a.count);
      }
    }

    return {
      hits,
      total,
      facets,
      took: Date.now() - start,
      maxScore,
    };
  }

  // ── Autocomplete Suggestions ────────────────────────────────────────────

  suggest(
    index: string,
    field: string,
    prefix: string,
    limit: number = 10,
  ): { text: string; score: number }[] {
    const idx = this.getIndex(index);
    const lowerPrefix = prefix.toLowerCase();
    const seen = new Map<string, number>();

    for (const doc of Array.from(idx.documents.values())) {
      const value = this.resolveField(doc.source, field);
      if (value === undefined || value === null) continue;

      const text = Array.isArray(value) ? value.join(" ") : String(value);
      const tokens = text
        .toLowerCase()
        .replace(/[^\w\s]/g, " ")
        .split(/\s+/)
        .filter((t) => t.length > 0);

      for (const token of tokens) {
        if (token.startsWith(lowerPrefix)) {
          seen.set(token, (seen.get(token) ?? 0) + 1);
        }
      }
    }

    return Array.from(seen.entries())
      .map(([text, score]) => ({ text, score }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  // ── Private Helpers ─────────────────────────────────────────────────────

  private getIndex(name: string): InternalIndex {
    const idx = this.indexes.get(name);
    if (!idx) throw new Error(`Index "${name}" does not exist`);
    return idx;
  }

  private removeDocumentStats(idx: InternalIndex, id: string): void {
    const doc = idx.documents.get(id);
    if (!doc) return;

    for (const [field, mapping] of Object.entries(idx.config.mappings)) {
      if (!mapping.searchable && mapping.type !== "text") continue;
      const value = this.resolveField(doc.source, field);
      if (value === undefined || value === null) continue;

      const text = Array.isArray(value) ? value.join(" ") : String(value);
      const useAutocomplete = mapping.analyzer === "autocomplete";
      const fieldTokens = useAutocomplete
        ? autocompleteTokenize(text)
        : tokenize(text);

      // Decrement field token totals
      const currentTotal = idx.fieldTokenTotals.get(field) ?? 0;
      idx.fieldTokenTotals.set(field, Math.max(0, currentTotal - fieldTokens.length));

      // Decrement document frequency
      const dfMap = idx.documentFrequency.get(field);
      if (dfMap) {
        const uniqueTerms = Array.from(new Set(fieldTokens));
        for (const term of uniqueTerms) {
          const count = dfMap.get(term) ?? 0;
          if (count <= 1) {
            dfMap.delete(term);
          } else {
            dfMap.set(term, count - 1);
          }
        }
      }
    }
  }

  private countDocsWithField(idx: InternalIndex, field: string): number {
    let count = 0;
    for (const doc of Array.from(idx.documents.values())) {
      const val = this.resolveField(doc.source, field);
      if (val !== undefined && val !== null) count++;
    }
    return count;
  }

  private resolveField(
    obj: Record<string, unknown>,
    path: string,
  ): unknown {
    const parts = path.split(".");
    let current: unknown = obj;
    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      if (typeof current !== "object") return undefined;
      current = (current as Record<string, unknown>)[part];
    }
    return current;
  }

  private applyFilter(
    source: Record<string, unknown>,
    filter: SearchFilter,
    _mappings: Record<string, FieldMapping>,
  ): boolean {
    const value = this.resolveField(source, filter.field);

    switch (filter.operator) {
      case "eq":
        return value === filter.value;
      case "neq":
        return value !== filter.value;
      case "gt":
        return typeof value === "number" && value > (filter.value as number);
      case "gte":
        return typeof value === "number" && value >= (filter.value as number);
      case "lt":
        return typeof value === "number" && value < (filter.value as number);
      case "lte":
        return typeof value === "number" && value <= (filter.value as number);
      case "in": {
        const arr = filter.value as unknown[];
        if (Array.isArray(value)) {
          return value.some((v) => arr.includes(v));
        }
        return arr.includes(value);
      }
      case "range": {
        const range = filter.value as { min?: number; max?: number };
        if (typeof value !== "number") return false;
        if (range.min !== undefined && value < range.min) return false;
        if (range.max !== undefined && value > range.max) return false;
        return true;
      }
      case "exists":
        return filter.value
          ? value !== undefined && value !== null
          : value === undefined || value === null;
      case "prefix": {
        if (typeof value !== "string") return false;
        return value.toLowerCase().startsWith(String(filter.value).toLowerCase());
      }
      default:
        return true;
    }
  }

  private compareValues(a: unknown, b: unknown): number {
    if (a === b) return 0;
    if (a === undefined || a === null) return -1;
    if (b === undefined || b === null) return 1;
    if (typeof a === "number" && typeof b === "number") return a - b;
    return String(a).localeCompare(String(b));
  }

  private computeHighlights(
    source: Record<string, unknown>,
    queryTokens: string[],
    mappings: Record<string, FieldMapping>,
  ): Record<string, string[]> {
    const highlights: Record<string, string[]> = {};
    if (queryTokens.length === 0) return highlights;

    for (const [field, mapping] of Object.entries(mappings)) {
      if (!mapping.searchable) continue;
      const value = this.resolveField(source, field);
      if (value === undefined || value === null) continue;

      const text = Array.isArray(value) ? value.join(" ") : String(value);
      const fieldHighlights: string[] = [];

      for (const term of queryTokens) {
        const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
        if (regex.test(text)) {
          fieldHighlights.push(text.replace(regex, "<em>$1</em>"));
        }
      }

      if (fieldHighlights.length > 0) {
        highlights[field] = fieldHighlights;
      }
    }

    return highlights;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CDC (Change Data Capture) Sync
// ═══════════════════════════════════════════════════════════════════════════════

export interface CDCRecord {
  id: string;
  data: Record<string, unknown>;
  updatedAt: string; // ISO timestamp
}

type FetchFn = (since?: string) => CDCRecord[] | Promise<CDCRecord[]>;

interface CDCSource {
  entityType: string;
  fetchFn: FetchFn;
  indexName: string;
  lastSyncTime: string | null;
}

export class CDCSync {
  private sources: Map<string, CDCSource> = new Map();
  private engine: SearchEngine;
  private periodicTimer: ReturnType<typeof setInterval> | null = null;

  constructor(engine: SearchEngine) {
    this.engine = engine;
  }

  registerSource(
    entityType: string,
    fetchFn: FetchFn,
    indexName?: string,
  ): void {
    this.sources.set(entityType, {
      entityType,
      fetchFn,
      indexName: indexName ?? entityType,
      lastSyncTime: null,
    });
  }

  async sync(entityType: string): Promise<{ synced: number; errors: string[] }> {
    const source = this.getSource(entityType);
    const records = await source.fetchFn();
    const result = this.engine.bulkIndex(
      source.indexName,
      records.map((r) => ({ id: r.id, document: r.data })),
    );

    // Update last sync time to the most recent record
    if (records.length > 0) {
      const latest = records.reduce((max, r) =>
        r.updatedAt > (max.updatedAt ?? "") ? r : max,
      );
      source.lastSyncTime = latest.updatedAt;
    }

    return { synced: result.indexed, errors: result.errors };
  }

  async incrementalSync(
    entityType: string,
    since?: string,
  ): Promise<{ synced: number; errors: string[] }> {
    const source = this.getSource(entityType);
    const cutoff = since ?? source.lastSyncTime ?? undefined;
    const records = await source.fetchFn(cutoff);

    const result = this.engine.bulkIndex(
      source.indexName,
      records.map((r) => ({ id: r.id, document: r.data })),
    );

    if (records.length > 0) {
      const latest = records.reduce((max, r) =>
        r.updatedAt > (max.updatedAt ?? "") ? r : max,
      );
      source.lastSyncTime = latest.updatedAt;
    }

    return { synced: result.indexed, errors: result.errors };
  }

  getLastSyncTime(entityType: string): string | null {
    return this.getSource(entityType).lastSyncTime;
  }

  startPeriodicSync(intervalMs: number): void {
    this.stopPeriodicSync();
    this.periodicTimer = setInterval(async () => {
      for (const source of Array.from(this.sources.values())) {
        try {
          await this.incrementalSync(source.entityType);
        } catch {
          // Swallow errors in periodic sync to keep the loop running
        }
      }
    }, intervalMs);
  }

  stopPeriodicSync(): void {
    if (this.periodicTimer) {
      clearInterval(this.periodicTimer);
      this.periodicTimer = null;
    }
  }

  private getSource(entityType: string): CDCSource {
    const source = this.sources.get(entityType);
    if (!source) {
      throw new Error(`CDC source "${entityType}" is not registered`);
    }
    return source;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Pre-configured Indexes
// ═══════════════════════════════════════════════════════════════════════════════

export const CAMPAIGN_INDEX_CONFIG: IndexConfig = {
  name: "campaigns",
  mappings: {
    name: {
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
    businessType: {
      type: "keyword",
      searchable: true,
      filterable: true,
      sortable: true,
    },
    platform: {
      type: "keyword",
      searchable: true,
      filterable: true,
      sortable: false,
    },
    tier: {
      type: "keyword",
      searchable: false,
      filterable: true,
      sortable: true,
    },
    status: {
      type: "keyword",
      searchable: false,
      filterable: true,
      sortable: false,
    },
    location: {
      type: "text",
      analyzer: "standard",
      searchable: true,
      filterable: true,
      sortable: true,
    },
    businessId: {
      type: "keyword",
      searchable: false,
      filterable: true,
      sortable: false,
    },
    discountValue: {
      type: "float",
      searchable: false,
      filterable: true,
      sortable: true,
    },
    createdAt: {
      type: "date",
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
    geoLocation: {
      type: "geo_point",
      searchable: false,
      filterable: true,
      sortable: false,
    },
  },
  settings: {
    numberOfShards: 3,
    numberOfReplicas: 1,
    refreshInterval: "1s",
  },
};

export const INFLUENCER_INDEX_CONFIG: IndexConfig = {
  name: "influencers",
  mappings: {
    displayName: {
      type: "text",
      analyzer: "autocomplete",
      searchable: true,
      filterable: false,
      sortable: true,
      boost: 3,
    },
    bio: {
      type: "text",
      analyzer: "standard",
      searchable: true,
      filterable: false,
      sortable: false,
      boost: 1,
    },
    niches: {
      type: "keyword",
      searchable: true,
      filterable: true,
      sortable: false,
      boost: 2,
    },
    location: {
      type: "text",
      analyzer: "standard",
      searchable: true,
      filterable: true,
      sortable: true,
    },
    tier: {
      type: "keyword",
      searchable: false,
      filterable: true,
      sortable: true,
    },
    followerCount: {
      type: "integer",
      searchable: false,
      filterable: true,
      sortable: true,
    },
    engagementRate: {
      type: "float",
      searchable: false,
      filterable: true,
      sortable: true,
    },
    platforms: {
      type: "nested",
      searchable: false,
      filterable: true,
      sortable: false,
    },
    geoLocation: {
      type: "geo_point",
      searchable: false,
      filterable: true,
      sortable: false,
    },
  },
  settings: {
    numberOfShards: 2,
    numberOfReplicas: 1,
    refreshInterval: "5s",
  },
};

export const BUSINESS_INDEX_CONFIG: IndexConfig = {
  name: "businesses",
  mappings: {
    name: {
      type: "text",
      analyzer: "autocomplete",
      searchable: true,
      filterable: false,
      sortable: true,
      boost: 3,
    },
    type: {
      type: "keyword",
      searchable: true,
      filterable: true,
      sortable: true,
      boost: 1.5,
    },
    industry: {
      type: "keyword",
      searchable: true,
      filterable: true,
      sortable: true,
    },
    location: {
      type: "text",
      analyzer: "standard",
      searchable: true,
      filterable: true,
      sortable: true,
    },
    plan: {
      type: "keyword",
      searchable: false,
      filterable: true,
      sortable: true,
    },
    size: {
      type: "keyword",
      searchable: false,
      filterable: true,
      sortable: true,
    },
    geoLocation: {
      type: "geo_point",
      searchable: false,
      filterable: true,
      sortable: false,
    },
  },
  settings: {
    numberOfShards: 2,
    numberOfReplicas: 1,
    refreshInterval: "5s",
  },
};

// ─── Factory ────────────────────────────────────────────────────────────────

/**
 * Create a SearchEngine pre-loaded with the campaigns, influencers, and
 * businesses indexes.
 */
export function createSearchEngine(): SearchEngine {
  const engine = new SearchEngine();
  engine.createIndex(CAMPAIGN_INDEX_CONFIG);
  engine.createIndex(INFLUENCER_INDEX_CONFIG);
  engine.createIndex(BUSINESS_INDEX_CONFIG);
  return engine;
}

/**
 * Create a CDCSync instance pre-wired to the given search engine.
 */
export function createCDCSync(engine: SearchEngine): CDCSync {
  return new CDCSync(engine);
}
