export interface AskQuestion {
  slug: string;
  category: AskCategory;
  question: string;
  h1: string;
  tldr: string;
  metaDescription: string;
  sections: AskSection[];
  keyFacts: string[];
  steps?: string[];
  mistakes: string[];
  tools: { name: string; description: string; href?: string }[];
  related: string[]; // slugs
  author?: string;
  datePublished: string;
  dateModified: string;
}

export type AskCategory =
  | "Restaurant marketing"
  | "Small business"
  | "Influencer marketing"
  | "Reviews & UGC";

export interface AskSection {
  heading: string;
  body: string; // can include paragraphs separated by \n\n
}

export const ASK_CATEGORIES: AskCategory[] = [
  "Restaurant marketing",
  "Small business",
  "Influencer marketing",
  "Reviews & UGC",
];
