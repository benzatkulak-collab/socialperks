export type BlogCategory =
  | "Restaurants"
  | "Coffee Shops"
  | "Yoga & Fitness"
  | "Salons & Beauty"
  | "Retail & Boutique"
  | "Small Business"
  | "Tactics & Strategy";

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  category: BlogCategory;
  keyword: string;
  author: string;
  publishedAt: string; // ISO date
  updatedAt?: string;
  readingTimeMinutes: number;
  /**
   * Markdown-ish content. We use a tiny renderer so we don't pull in a
   * heavyweight markdown lib. Supported tokens:
   *  - lines starting with `## ` are h2
   *  - lines starting with `### ` are h3
   *  - lines starting with `- ` (consecutive) are <ul><li>
   *  - lines starting with `1. ` (numbered, consecutive) are <ol><li>
   *  - lines starting with `> ` are blockquotes
   *  - blank line = paragraph break
   *  - **bold** and *italic* inline
   *  - [text](url) inline links
   */
  content: string;
}

export interface BlogPostMeta {
  slug: string;
  title: string;
  description: string;
  category: BlogCategory;
  keyword: string;
  author: string;
  publishedAt: string;
  readingTimeMinutes: number;
}
