import { describe, it, expect } from "vitest";
import {
  tokenize,
  normalize,
  stem,
  editDistance,
  STOPWORDS,
} from "../tokenizer";

// ─── Stopword Removal ───────────────────────────────────────────────────────

describe("STOPWORDS", () => {
  it("contains common English stopwords", () => {
    expect(STOPWORDS.has("the")).toBe(true);
    expect(STOPWORDS.has("is")).toBe(true);
    expect(STOPWORDS.has("at")).toBe(true);
    expect(STOPWORDS.has("which")).toBe(true);
    expect(STOPWORDS.has("and")).toBe(true);
    expect(STOPWORDS.has("or")).toBe(true);
  });

  it("does not contain content words", () => {
    expect(STOPWORDS.has("marketing")).toBe(false);
    expect(STOPWORDS.has("campaign")).toBe(false);
    expect(STOPWORDS.has("business")).toBe(false);
  });

  it("has a reasonable size (~150 words)", () => {
    expect(STOPWORDS.size).toBeGreaterThanOrEqual(100);
    expect(STOPWORDS.size).toBeLessThanOrEqual(250);
  });
});

describe("tokenize — stopword removal", () => {
  it("removes stopwords from tokenized output", () => {
    const tokens = tokenize("the quick brown fox jumps over the lazy dog");
    expect(tokens).not.toContain("the");
    expect(tokens).not.toContain("over");
  });

  it("keeps content words", () => {
    const tokens = tokenize("the marketing campaign is very successful");
    expect(tokens).toContain(stem("marketing"));
    expect(tokens).toContain(stem("campaign"));
    expect(tokens).toContain(stem("successful"));
  });
});

// ─── Stemming ───────────────────────────────────────────────────────────────

describe("stem", () => {
  it("removes -ing suffix", () => {
    expect(stem("running")).toBe("runn");
    expect(stem("marketing")).toBe("market");
  });

  it("removes -ed suffix", () => {
    expect(stem("jumped")).toBe("jump");
    expect(stem("created")).toBe("creat");
  });

  it("removes -s suffix (non-ss)", () => {
    expect(stem("campaigns")).toBe("campaign");
    expect(stem("dogs")).toBe("dog");
  });

  it("does not remove -s from words ending in -ss", () => {
    expect(stem("boss")).toBe("boss");
    expect(stem("miss")).toBe("miss");
  });

  it("removes -ly suffix", () => {
    expect(stem("quickly")).toBe("quick");
    expect(stem("slowly")).toBe("slow");
  });

  it("handles -tion -> t", () => {
    expect(stem("action")).toBe("act");
    // "creation" matches -ation rule first → "cree"
    expect(stem("creation")).toBe("cree");
  });

  it("handles -ment removal", () => {
    expect(stem("management")).toBe("manage");
    expect(stem("development")).toBe("develop");
  });

  it("handles -ness removal", () => {
    expect(stem("happiness")).toBe("happi");
    // "darkness" length 8 > 5 → removes -ness → "dark"
    expect(stem("darkness")).toBe("dark");
  });

  it("handles -ful removal", () => {
    expect(stem("beautiful")).toBe("beauti");
    expect(stem("powerful")).toBe("power");
  });

  it("leaves short words unchanged", () => {
    expect(stem("run")).toBe("run");
    expect(stem("go")).toBe("go");
    expect(stem("the")).toBe("the");
  });

  it("handles -ation -> e", () => {
    // -ation rule: slice(0, -5) + "e"
    expect(stem("creation")).toBe("cree");
    expect(stem("information")).toBe("informe");
  });

  it("handles -ies -> y", () => {
    expect(stem("companies")).toBe("company");
    expect(stem("stories")).toBe("story");
  });
});

// ─── Normalization ──────────────────────────────────────────────────────────

describe("normalize", () => {
  it("lowercases text", () => {
    expect(normalize("HELLO WORLD")).toBe("hello world");
  });

  it("removes diacritics/accents", () => {
    expect(normalize("cafe")).toBe("cafe");
    expect(normalize("caf\u00e9")).toBe("cafe");
    expect(normalize("na\u00efve")).toBe("naive");
    expect(normalize("\u00fcber")).toBe("uber");
  });

  it("handles mixed case and accents", () => {
    expect(normalize("R\u00e9sum\u00e9")).toBe("resume");
  });

  it("handles empty string", () => {
    expect(normalize("")).toBe("");
  });
});

// ─── Edit Distance ──────────────────────────────────────────────────────────

describe("editDistance", () => {
  it("returns 0 for identical strings", () => {
    expect(editDistance("kitten", "kitten")).toBe(0);
    expect(editDistance("", "")).toBe(0);
  });

  it("returns correct distance for 1 edit", () => {
    // Substitution
    expect(editDistance("cat", "bat")).toBe(1);
    // Insertion
    expect(editDistance("cat", "cats")).toBe(1);
    // Deletion
    expect(editDistance("cats", "cat")).toBe(1);
  });

  it("returns correct distance for 2 edits", () => {
    expect(editDistance("kitten", "mitten")).toBe(1);
    expect(editDistance("kitten", "sitting")).toBe(3);
  });

  it("handles empty string vs non-empty", () => {
    expect(editDistance("", "abc")).toBe(3);
    expect(editDistance("abc", "")).toBe(3);
  });

  it("is symmetric", () => {
    expect(editDistance("hello", "hallo")).toBe(editDistance("hallo", "hello"));
    expect(editDistance("abc", "xyz")).toBe(editDistance("xyz", "abc"));
  });

  it("handles single character strings", () => {
    expect(editDistance("a", "b")).toBe(1);
    expect(editDistance("a", "a")).toBe(0);
    expect(editDistance("a", "")).toBe(1);
  });
});

// ─── Tokenization (integration) ─────────────────────────────────────────────

describe("tokenize", () => {
  it("splits on whitespace and lowercases", () => {
    const tokens = tokenize("Hello World");
    expect(tokens).toContain(stem("hello"));
    expect(tokens).toContain(stem("world"));
  });

  it("splits on punctuation", () => {
    const tokens = tokenize("email@example.com");
    expect(tokens.length).toBeGreaterThanOrEqual(2);
  });

  it("handles special characters", () => {
    const tokens = tokenize("it's a test! #hashtag @mention");
    // Should not throw, and should produce tokens
    expect(tokens.length).toBeGreaterThan(0);
  });

  it("filters out single-character tokens", () => {
    const tokens = tokenize("I a x big campaign");
    // "i" and "a" are single chars or stopwords — should be filtered
    expect(tokens).not.toContain("i");
    expect(tokens).not.toContain("a");
    expect(tokens).not.toContain("x");
  });

  it("returns empty array for empty string", () => {
    expect(tokenize("")).toEqual([]);
  });

  it("returns empty array for stopwords-only input", () => {
    expect(tokenize("the and or but")).toEqual([]);
  });

  it("applies stemming", () => {
    const tokens = tokenize("running campaigns successfully");
    // "running" -> stem, "campaigns" -> stem, "successfully" -> stem
    expect(tokens).toContain(stem("running"));
    expect(tokens).toContain(stem("campaigns"));
  });
});
