import Link from "next/link";
import type { Metadata } from "next";
import { ANSWERS } from "@/lib/answers/data";

export const metadata: Metadata = {
  title: "Quick Answers to Common Small Business Marketing Questions",
  description:
    "Snippet-friendly answers to the 50 most common small business marketing questions: ROI, reviews, Instagram, hashtags, costs, and more.",
};

export default function AnswersIndexPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <h1 className="font-serif text-4xl italic text-white">Quick Answers</h1>
      <p className="mt-4 text-gray-300">
        Short, snippet-friendly answers to the most-asked small business marketing questions.
      </p>
      <ul className="mt-10 grid gap-3">
        {ANSWERS.map((a) => (
          <li key={a.slug}>
            <Link
              href={`/answers/${a.slug}`}
              className="block rounded-lg border border-white/10 px-4 py-3 text-gray-200 transition hover:border-cyan-400/40 hover:bg-white/5"
            >
              {a.question}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
