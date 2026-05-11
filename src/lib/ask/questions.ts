import { RESTAURANT_QUESTIONS } from "./restaurant";
import { SMALL_BUSINESS_QUESTIONS } from "./small-business";
import { INFLUENCER_QUESTIONS } from "./influencer";
import { REVIEWS_QUESTIONS } from "./reviews";
import type { AskCategory, AskQuestion } from "./types";

export const ASK_QUESTIONS: AskQuestion[] = [
  ...RESTAURANT_QUESTIONS,
  ...SMALL_BUSINESS_QUESTIONS,
  ...INFLUENCER_QUESTIONS,
  ...REVIEWS_QUESTIONS,
];

export function getAskQuestion(slug: string): AskQuestion | undefined {
  return ASK_QUESTIONS.find((q) => q.slug === slug);
}

export function groupByCategory(): Record<AskCategory, AskQuestion[]> {
  const grouped: Record<string, AskQuestion[]> = {};
  for (const q of ASK_QUESTIONS) {
    if (!grouped[q.category]) grouped[q.category] = [];
    grouped[q.category].push(q);
  }
  return grouped as Record<AskCategory, AskQuestion[]>;
}

export { ASK_CATEGORIES } from "./types";
export type { AskQuestion, AskCategory } from "./types";
