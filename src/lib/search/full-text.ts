/**
 * Full-Text Search Index — Generic in-memory search with TF-IDF scoring.
 *
 * A standalone generic class that can index any document type with
 * configurable text fields, TF-IDF relevance scoring, fuzzy matching
 * via Levenshtein distance, and result highlighting with <mark> tags.
 *
 * Used by the `/api/v1/search` endpoint to search across campaigns,
 * businesses, and influencers in a single unified query.
 */

import { tokenize, normalize, stem, editDistance } from "./tokenizer";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface SearchResult<T> {
  id: string;
  doc: T;
  score: number;
  highlights: Record<string, string>;
}

export interface SearchOptions {
  limit?: number;
  fuzzy?: boolean;
  fuzzyThreshold?: number;
}

// ─── Internal types ─────────────────────────────────────────────────────────

interface IndexedDocument<T> {
  doc: T;
  terms: Map<string, number>; // stemmed token -> frequency
  fieldTexts: Map<string, string>; // field name -> original text
  totalTokens: number;
}

// ─── FullTextIndex ──────────────────────────────────────────────────────────

export class FullTextIndex<T> {
  private documents: Map<string, IndexedDocument<T>> = new Map();

  /** Inverted index: stemmed term -> set of doc IDs containing it */
  private invertedIndex: Map<string, Set<string>> = new Map();

  /** Total number of tokens across all documents (for avg doc length) */
  private totalTokenCount = 0;

  // ── Add / Remove ────────────────────────────────────────────────────────

  /**
   * Add a document to the index.
   * @param id   Unique document ID
   * @param doc  The document object to store
   * @param fields Array of field names whose string values should be indexed.
   *              Each value is extracted from `doc` via `(doc as any)[field]`.
   */
  add(id: string, doc: T, fields: string[]): void {
    // Remove first if re-adding
    if (this.documents.has(id)) {
      this.remove(id);
    }

    const terms = new Map<string, number>();
    const fieldTexts = new Map<string, string>();
    let totalTokens = 0;

    for (const field of fields) {
      const value = (doc as Record<string, unknown>)[field];
      if (typeof value !== "string" || !value) continue;

      fieldTexts.set(field, value);
      const tokens = tokenize(value);
      totalTokens += tokens.length;

      for (const token of tokens) {
        terms.set(token, (terms.get(token) ?? 0) + 1);
      }
    }

    this.documents.set(id, { doc, terms, fieldTexts, totalTokens });
    this.totalTokenCount += totalTokens;

    // Update inverted index
    for (const term of terms.keys()) {
      if (!this.invertedIndex.has(term)) {
        this.invertedIndex.set(term, new Set());
      }
      this.invertedIndex.get(term)!.add(id);
    }
  }

  /**
   * Remove a document from the index.
   */
  remove(id: string): void {
    const entry = this.documents.get(id);
    if (!entry) return;

    // Remove from inverted index
    for (const term of entry.terms.keys()) {
      const docSet = this.invertedIndex.get(term);
      if (docSet) {
        docSet.delete(id);
        if (docSet.size === 0) {
          this.invertedIndex.delete(term);
        }
      }
    }

    this.totalTokenCount -= entry.totalTokens;
    this.documents.delete(id);
  }

  /**
   * Get the number of indexed documents.
   */
  get size(): number {
    return this.documents.size;
  }

  // ── Search ──────────────────────────────────────────────────────────────

  /**
   * Search the index for documents matching the query string.
   *
   * Scoring uses TF-IDF:
   *   TF(t,d) = frequency of term t in document d / total tokens in d
   *   IDF(t)  = log(1 + N / (1 + df)) where df = docs containing t
   *
   * Fuzzy matching uses Levenshtein distance with a configurable threshold
   * (default 2). Fuzzy matches are discounted by 0.6x.
   */
  search(query: string, options: SearchOptions = {}): SearchResult<T>[] {
    const {
      limit = 20,
      fuzzy = true,
      fuzzyThreshold = 2,
    } = options;

    if (!query || !query.trim()) return [];

    const queryTokens = tokenize(query);
    if (queryTokens.length === 0) return [];

    const N = this.documents.size;
    if (N === 0) return [];

    // For each query token, find matching index terms (exact + fuzzy)
    const tokenExpansions: Array<{ original: string; matches: Array<{ term: string; penalty: number }> }> = [];

    for (const qt of queryTokens) {
      const matches: Array<{ term: string; penalty: number }> = [];

      // Exact match
      if (this.invertedIndex.has(qt)) {
        matches.push({ term: qt, penalty: 1.0 });
      }

      // Fuzzy matches
      if (fuzzy && fuzzyThreshold > 0) {
        for (const indexTerm of this.invertedIndex.keys()) {
          if (indexTerm === qt) continue; // already added as exact
          if (Math.abs(indexTerm.length - qt.length) > fuzzyThreshold) continue;
          const dist = editDistance(qt, indexTerm);
          if (dist <= fuzzyThreshold) {
            matches.push({ term: indexTerm, penalty: 0.6 });
          }
        }
      }

      tokenExpansions.push({ original: qt, matches });
    }

    // Score each document
    const scores = new Map<string, number>();
    const matchedTermsByDoc = new Map<string, Set<string>>();

    for (const expansion of tokenExpansions) {
      for (const { term, penalty } of expansion.matches) {
        const docSet = this.invertedIndex.get(term);
        if (!docSet) continue;

        // IDF
        const df = docSet.size;
        const idf = Math.log(1 + N / (1 + df));

        for (const docId of docSet) {
          const entry = this.documents.get(docId);
          if (!entry) continue;

          // TF
          const freq = entry.terms.get(term) ?? 0;
          const tf = freq / Math.max(1, entry.totalTokens);

          const contribution = tf * idf * penalty;
          scores.set(docId, (scores.get(docId) ?? 0) + contribution);

          // Track which original query tokens matched for highlighting
          if (!matchedTermsByDoc.has(docId)) {
            matchedTermsByDoc.set(docId, new Set());
          }
          matchedTermsByDoc.get(docId)!.add(expansion.original);
        }
      }
    }

    // Sort by score descending
    const sorted = [...scores.entries()].sort((a, b) => b[1] - a[1]);

    // Build results with highlights
    return sorted.slice(0, limit).map(([docId, score]) => {
      const entry = this.documents.get(docId)!;
      const matchedTerms = matchedTermsByDoc.get(docId) ?? new Set();

      const highlights: Record<string, string> = {};
      for (const [field, text] of entry.fieldTexts) {
        const highlighted = this.highlight(text, matchedTerms);
        if (highlighted !== text) {
          highlights[field] = highlighted;
        }
      }

      return {
        id: docId,
        doc: entry.doc,
        score: Math.round(score * 10000) / 10000,
        highlights,
      };
    });
  }

  // ── Private helpers ───────────────────────────────────────────────────

  /**
   * Highlight matching terms in text by wrapping them in <mark> tags.
   * Compares stemmed forms of each word against the set of matched query stems.
   */
  private highlight(text: string, queryTerms: Set<string>): string {
    // Split preserving whitespace and punctuation as separate tokens
    const parts = text.split(/(\s+|[^\w]+)/);

    return parts
      .map((part) => {
        if (/^\s+$/.test(part) || /^[^\w]+$/.test(part)) return part;

        const normalized = normalize(part);
        const stemmed = stem(normalized);

        if (queryTerms.has(stemmed)) {
          return `<mark>${part}</mark>`;
        }
        return part;
      })
      .join("");
  }
}
