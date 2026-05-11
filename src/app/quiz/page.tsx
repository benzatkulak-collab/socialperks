import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/shared/nav";
import { Footer } from "@/components/shared/footer";

export const metadata: Metadata = {
  title: "Free marketing quizzes for small business owners | Social Perks",
  description:
    "Five free, fast quizzes for small business owners — find your brand voice, the best social platforms, recommended perk values, and your marketing readiness.",
};

const QUIZZES = [
  {
    title: "Marketing Readiness Quiz",
    description: "Score where you are today across the 7 pillars of small business marketing.",
    href: "/quiz/marketing-readiness",
    estimate: "~3 min",
  },
  {
    title: "Influencer Rate Calculator",
    description: "Figure out what to pay (or charge) for influencer collaborations.",
    href: "/quiz/influencer-rate-calculator",
    estimate: "~3 min",
  },
  {
    title: "Perk Value Optimizer",
    description: "How much should you spend per customer post, review, or referral?",
    href: "/quiz/perk-value-optimizer",
    estimate: "~3 min",
  },
  {
    title: "Brand Voice Quiz",
    description: "Discover which of 5 archetypes matches your brand — and how to write like it.",
    href: "/quiz/brand-voice",
    estimate: "~3 min",
  },
  {
    title: "Best Platform Recommender",
    description: "Get your top 3 social platforms ranked for your specific business.",
    href: "/quiz/best-platform",
    estimate: "~3 min",
  },
];

export default function QuizIndexPage() {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Nav />
      <main className="max-w-5xl mx-auto px-6 py-16">
        <section className="mb-12 text-center">
          <h1 className="font-heading italic text-5xl mb-4">
            Free marketing quizzes for small business owners
          </h1>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto">
            Five quick, no-signup quizzes that give you a personalized marketing plan in under 5 minutes.
          </p>
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {QUIZZES.map((q) => (
            <Link
              key={q.href}
              href={q.href}
              className="block bg-gray-800/50 border border-gray-700 hover:border-cyan-500 rounded-xl p-6 transition group"
            >
              <h2 className="font-heading italic text-2xl mb-2 group-hover:text-cyan-300">
                {q.title}
              </h2>
              <p className="text-gray-300 mb-4">{q.description}</p>
              <div className="flex items-center justify-between text-sm">
                <span className="font-mono text-gray-400">{q.estimate}</span>
                <span className="text-cyan-400 group-hover:text-cyan-300">Take quiz →</span>
              </div>
            </Link>
          ))}
        </section>
      </main>
      <Footer />
    </div>
  );
}
