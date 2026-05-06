/**
 * SearchEngine — In-memory full-text search with TF-IDF scoring.
 *
 * Features:
 * - Inverted index with positional information
 * - TF-IDF scoring with field and document boost
 * - Fuzzy matching via Levenshtein distance
 * - Highlighting with <mark> tags
 * - Autocomplete suggestions from vocabulary
 * - No external dependencies
 */

import { tokenize, normalize, stem, editDistance, STOPWORDS } from "./tokenizer";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface SearchDocument {
  id: string;
  type: "campaign" | "business" | "influencer" | "submission";
  fields: Record<string, string>;
  boost?: number;
  metadata?: Record<string, unknown>;
}

export interface SearchResult {
  id: string;
  type: string;
  score: number;
  highlights: Record<string, string>;
  metadata?: Record<string, unknown>;
}

export interface SearchOptions {
  types?: string[];
  limit?: number;
  offset?: number;
  fuzzyDistance?: number;
  boostFields?: Record<string, number>;
}

interface SearchStats {
  documentCount: number;
  tokenCount: number;
  avgDocLength: number;
}

// ─── Posting ────────────────────────────────────────────────────────────────

interface Posting {
  docId: string;
  field: string;
  position: number;
}

// ─── Search Engine ──────────────────────────────────────────────────────────

export class SearchEngine {
  /** Inverted index: stemmed token -> set of postings */
  private index: Map<string, Set<Posting>> = new Map();

  /** All stored documents keyed by ID */
  private documents: Map<string, SearchDocument> = new Map();

  /** Per-document token count (for TF-IDF) */
  private docLengths: Map<string, number> = new Map();

  /** Raw (unstemmed, lowercase) vocabulary for autocomplete */
  private vocabulary: Map<string, number> = new Map();

  /** Total tokens across all documents */
  private totalTokens = 0;

  // ── Document CRUD ───────────────────────────────────────────────────────

  addDocument(doc: SearchDocument): void {
    // Remove first if already exists (handles re-add)
    if (this.documents.has(doc.id)) {
      this.removeDocument(doc.id);
    }

    this.documents.set(doc.id, doc);

    let docTokenCount = 0;

    for (const [field, text] of Object.entries(doc.fields)) {
      if (!text) continue;

      // Build vocabulary from raw normalized words (pre-stem)
      const normalized = normalize(text);
      const rawWords = normalized.split(/[^a-z0-9]+/).filter(Boolean);
      for (const word of rawWords) {
        if (!STOPWORDS.has(word) && word.length >= 2) {
          this.vocabulary.set(word, (this.vocabulary.get(word) ?? 0) + 1);
        }
      }

      const tokens = tokenize(text);
      docTokenCount += tokens.length;

      for (let position = 0; position < tokens.length; position++) {
        const token = tokens[position];
        if (!this.index.has(token)) {
          this.index.set(token, new Set());
        }
        this.index.get(token)!.add({ docId: doc.id, field, position });
      }
    }

    this.docLengths.set(doc.id, docTokenCount);
    this.totalTokens += docTokenCount;
  }

  removeDocument(id: string): void {
    const doc = this.documents.get(id);
    if (!doc) return;

    // Remove from vocabulary
    for (const text of Object.values(doc.fields)) {
      if (!text) continue;
      const normalized = normalize(text);
      const rawWords = normalized.split(/[^a-z0-9]+/).filter(Boolean);
      for (const word of rawWords) {
        if (!STOPWORDS.has(word) && word.length >= 2) {
          const count = this.vocabulary.get(word) ?? 0;
          if (count <= 1) {
            this.vocabulary.delete(word);
          } else {
            this.vocabulary.set(word, count - 1);
          }
        }
      }
    }

    // Remove postings from index
    for (const [token, postings] of this.index) {
      const toRemove: Posting[] = [];
      for (const posting of postings) {
        if (posting.docId === id) toRemove.push(posting);
      }
      for (const posting of toRemove) {
        postings.delete(posting);
      }
      if (postings.size === 0) {
        this.index.delete(token);
      }
    }

    // Update totals
    const docLen = this.docLengths.get(id) ?? 0;
    this.totalTokens -= docLen;
    this.docLengths.delete(id);
    this.documents.delete(id);
  }

  updateDocument(doc: SearchDocument): void {
    this.removeDocument(doc.id);
    this.addDocument(doc);
  }

  // ── Search ──────────────────────────────────────────────────────────────

  search(query: string, options: SearchOptions = {}): SearchResult[] {
    const {
      types,
      limit = 20,
      offset = 0,
      fuzzyDistance = 1,
      boostFields,
    } = options;

    if (!query || !query.trim()) return [];

    const queryTokens = tokenize(query);
    if (queryTokens.length === 0) return [];

    // Expand query tokens with fuzzy matches
    const expandedTokens = this.expandWithFuzzy(queryTokens, fuzzyDistance);

    // Score documents
    const scores = new Map<string, number>();
    const matchedFields = new Map<string, Set<string>>(); // docId -> set of matched fields
    const matchedTerms = new Map<string, Set<string>>(); // docId -> set of original query terms

    const N = this.documents.size;

    for (const { original, expanded } of expandedTokens) {
      for (const token of expanded) {
        const postings = this.index.get(token);
        if (!postings) continue;

        // IDF: log(N / df) where df = number of docs containing this token
        const docIds = new Set<string>();
        for (const p of postings) docIds.add(p.docId);
        const df = docIds.size;
        const idf = Math.log(1 + N / (1 + df));

        // Fuzzy penalty: exact matches score full, fuzzy matches are discounted
        const fuzzyPenalty = token === original ? 1.0 : 0.7;

        for (const posting of postings) {
          const doc = this.documents.get(posting.docId);
          if (!doc) continue;

          // Filter by type
          if (types && types.length > 0 && !types.includes(doc.type)) continue;

          const docLen = this.docLengths.get(posting.docId) ?? 1;

          // TF: token count in this doc/field / doc length (normalized)
          let tf = 0;
          for (const p of postings) {
            if (p.docId === posting.docId && p.field === posting.field) tf++;
          }
          tf = tf / Math.max(1, docLen);

          // Field boost
          const fieldBoost = boostFields?.[posting.field] ?? 1.0;

          // Document boost
          const docBoost = doc.boost ?? 1.0;

          // Final score contribution
          const contribution = tf * idf * fieldBoost * docBoost * fuzzyPenalty;

          const currentScore = scores.get(posting.docId) ?? 0;
          scores.set(posting.docId, currentScore + contribution);

          // Track matched fields for highlighting
          if (!matchedFields.has(posting.docId)) {
            matchedFields.set(posting.docId, new Set());
          }
          matchedFields.get(posting.docId)!.add(posting.field);

          // Track matched terms for highlighting
          if (!matchedTerms.has(posting.docId)) {
            matchedTerms.set(posting.docId, new Set());
          }
          matchedTerms.get(posting.docId)!.add(original);
        }
      }
    }

    // Sort by score descending
    const sorted = [...scores.entries()].sort((a, b) => b[1] - a[1]);

    // Apply pagination
    const page = sorted.slice(offset, offset + limit);

    // Build results with highlights
    return page.map(([docId, score]) => {
      const doc = this.documents.get(docId)!;
      const fields = matchedFields.get(docId) ?? new Set();
      const terms = matchedTerms.get(docId) ?? new Set();

      const highlights: Record<string, string> = {};
      for (const field of fields) {
        const text = doc.fields[field];
        if (text) {
          highlights[field] = this.highlight(text, terms);
        }
      }

      return {
        id: doc.id,
        type: doc.type,
        score: Math.round(score * 10000) / 10000,
        highlights,
        metadata: doc.metadata,
      };
    });
  }

  // ── Autocomplete ────────────────────────────────────────────────────────

  suggest(prefix: string, limit = 10): string[] {
    if (!prefix || !prefix.trim()) return [];

    const normalizedPrefix = normalize(prefix.trim());
    const results: Array<{ word: string; count: number }> = [];

    for (const [word, count] of this.vocabulary) {
      if (word.startsWith(normalizedPrefix)) {
        results.push({ word, count });
      }
    }

    // Sort by frequency descending, then alphabetically
    results.sort((a, b) => b.count - a.count || a.word.localeCompare(b.word));

    return results.slice(0, limit).map((r) => r.word);
  }

  // ── Reindex ─────────────────────────────────────────────────────────────

  reindex(): void {
    const docs = [...this.documents.values()];
    this.index.clear();
    this.docLengths.clear();
    this.vocabulary.clear();
    this.totalTokens = 0;
    this.documents.clear();

    for (const doc of docs) {
      this.addDocument(doc);
    }
  }

  // ── Stats ───────────────────────────────────────────────────────────────

  getStats(): SearchStats {
    const documentCount = this.documents.size;
    const tokenCount = this.index.size;
    const avgDocLength =
      documentCount > 0 ? this.totalTokens / documentCount : 0;

    return { documentCount, tokenCount, avgDocLength };
  }

  // ── Private helpers ─────────────────────────────────────────────────────

  /**
   * Expand each query token to include fuzzy matches from the vocabulary.
   * Returns original token paired with all expanded variants (including itself).
   */
  private expandWithFuzzy(
    tokens: string[],
    maxDistance: number
  ): Array<{ original: string; expanded: string[] }> {
    return tokens.map((token) => {
      const expanded = new Set<string>([token]);

      if (maxDistance > 0) {
        // Check all index keys for fuzzy matches
        for (const indexToken of this.index.keys()) {
          // Quick length check to prune obviously non-matching tokens
          if (Math.abs(indexToken.length - token.length) > maxDistance) continue;
          if (editDistance(token, indexToken) <= maxDistance) {
            expanded.add(indexToken);
          }
        }
      }

      return { original: token, expanded: [...expanded] };
    });
  }

  /**
   * Highlight matching terms in a text snippet by wrapping them in <mark> tags.
   * Operates on the original text, matching stemmed query terms against
   * stemmed versions of each word.
   *
   * SECURITY: HTML-escapes every part before emitting it. Previously
   * emitted raw user-controlled text (e.g. campaign names) and was
   * rendered via dangerouslySetInnerHTML — stored XSS vector. Now we
   * escape all output, so even non-matched parts are safe.
   */
  private highlight(text: string, queryTerms: Set<string>): string {
    // Split text preserving whitespace and punctuation
    const parts = text.split(/(\s+|[^\w]+)/);

    return parts
      .map((part) => {
        // Skip whitespace / punctuation parts (still escaped to be safe).
        if (/^\s+$/.test(part) || /^[^\w]+$/.test(part)) return escapeHtml(part);

        const normalized = normalize(part);
        const stemmed = stem(normalized);

        const safe = escapeHtml(part);
        if (queryTerms.has(stemmed)) {
          return `<mark>${safe}</mark>`;
        }
        return safe;
      })
      .join("");
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

// ─── Singleton ──────────────────────────────────────────────────────────────

export const searchEngine = new SearchEngine();

// Re-export tokenizer utilities for convenience
export { tokenize, normalize, stem, editDistance, STOPWORDS } from "./tokenizer";
