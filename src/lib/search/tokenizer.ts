/**
 * Tokenizer — Text processing utilities for the search engine.
 *
 * Provides tokenization, stemming, normalization, and edit distance
 * computation. No external dependencies.
 */

// ─── Stopwords ──────────────────────────────────────────────────────────────

export const STOPWORDS = new Set([
  "a", "about", "above", "after", "again", "against", "all", "am", "an",
  "and", "any", "are", "aren't", "as", "at", "be", "because", "been",
  "before", "being", "below", "between", "both", "but", "by", "can",
  "can't", "cannot", "could", "couldn't", "did", "didn't", "do", "does",
  "doesn't", "doing", "don't", "down", "during", "each", "few", "for",
  "from", "further", "get", "got", "had", "hadn't", "has", "hasn't",
  "have", "haven't", "having", "he", "he'd", "he'll", "he's", "her",
  "here", "here's", "hers", "herself", "him", "himself", "his", "how",
  "how's", "i", "i'd", "i'll", "i'm", "i've", "if", "in", "into", "is",
  "isn't", "it", "it's", "its", "itself", "just", "let's", "may", "me",
  "might", "more", "most", "mustn't", "my", "myself", "no", "nor", "not",
  "of", "off", "on", "once", "only", "or", "other", "ought", "our",
  "ours", "ourselves", "out", "over", "own", "same", "shan't", "she",
  "she'd", "she'll", "she's", "should", "shouldn't", "so", "some", "such",
  "than", "that", "that's", "the", "their", "theirs", "them", "themselves",
  "then", "there", "there's", "these", "they", "they'd", "they'll",
  "they're", "they've", "this", "those", "through", "to", "too", "under",
  "until", "up", "upon", "us", "very", "was", "wasn't", "we", "we'd",
  "we'll", "we're", "we've", "were", "weren't", "what", "what's", "when",
  "when's", "where", "where's", "which", "while", "who", "who's", "whom",
  "why", "why's", "will", "with", "won't", "would", "wouldn't", "you",
  "you'd", "you'll", "you're", "you've", "your", "yours", "yourself",
  "yourselves",
]);

// ─── Normalization ──────────────────────────────────────────────────────────

/**
 * Remove accents/diacritics and lowercase.
 * Uses Unicode NFD decomposition to strip combining characters.
 */
export function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

// ─── Stemming ───────────────────────────────────────────────────────────────

/**
 * Simple suffix-stripping stemmer (80/20 rule — not full Porter).
 * Handles the most common English suffixes.
 */
export function stem(word: string): string {
  if (word.length < 4) return word;

  // Order matters — try longest/most specific suffixes first
  if (word.endsWith("ation") && word.length > 6) return word.slice(0, -5) + "e";
  if (word.endsWith("tion") && word.length > 5) return word.slice(0, -4) + "t";
  if (word.endsWith("ment") && word.length > 5) return word.slice(0, -4);
  if (word.endsWith("ness") && word.length > 5) return word.slice(0, -4);
  if (word.endsWith("ling") && word.length > 5) return word.slice(0, -4);
  if (word.endsWith("ally") && word.length > 5) return word.slice(0, -4);
  if (word.endsWith("ible") && word.length > 5) return word.slice(0, -4);
  if (word.endsWith("able") && word.length > 5) return word.slice(0, -4);
  if (word.endsWith("ful") && word.length > 4) return word.slice(0, -3);
  if (word.endsWith("ous") && word.length > 4) return word.slice(0, -3);
  if (word.endsWith("ive") && word.length > 4) return word.slice(0, -3);
  if (word.endsWith("ing") && word.length > 4) return word.slice(0, -3);
  if (word.endsWith("ies") && word.length > 4) return word.slice(0, -3) + "y";
  if (word.endsWith("ely") && word.length > 4) return word.slice(0, -3);
  if (word.endsWith("ly") && word.length > 4) return word.slice(0, -2);
  if (word.endsWith("ed") && word.length > 4) return word.slice(0, -2);
  if (word.endsWith("er") && word.length > 4) return word.slice(0, -2);
  if (word.endsWith("es") && word.length > 4) return word.slice(0, -2);
  if (word.endsWith("al") && word.length > 4) return word.slice(0, -2);
  if (word.endsWith("s") && !word.endsWith("ss") && word.length > 3) return word.slice(0, -1);

  return word;
}

// ─── Tokenization ───────────────────────────────────────────────────────────

/**
 * Full tokenization pipeline: normalize, split on whitespace/punctuation,
 * remove stopwords, and stem.
 */
export function tokenize(text: string): string[] {
  const normalized = normalize(text);

  // Split on non-alphanumeric characters
  const raw = normalized.split(/[^a-z0-9]+/).filter(Boolean);

  const tokens: string[] = [];
  for (const word of raw) {
    if (STOPWORDS.has(word)) continue;
    if (word.length < 2) continue;
    tokens.push(stem(word));
  }

  return tokens;
}

// ─── Edit Distance ──────────────────────────────────────────────────────────

/**
 * Compute Levenshtein edit distance between two strings.
 * Uses dynamic programming with O(min(m,n)) space.
 */
export function editDistance(a: string, b: string): number {
  // Ensure a is the shorter string for space optimization
  if (a.length > b.length) {
    [a, b] = [b, a];
  }

  const m = a.length;
  const n = b.length;

  // Use single row + previous value approach
  let prev = new Array(m + 1);
  let curr = new Array(m + 1);

  // Initialize first row
  for (let j = 0; j <= m; j++) {
    prev[j] = j;
  }

  for (let i = 1; i <= n; i++) {
    curr[0] = i;
    for (let j = 1; j <= m; j++) {
      if (b[i - 1] === a[j - 1]) {
        curr[j] = prev[j - 1];
      } else {
        curr[j] = 1 + Math.min(prev[j - 1], prev[j], curr[j - 1]);
      }
    }
    // Swap rows
    [prev, curr] = [curr, prev];
  }

  return prev[m];
}
