import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ANSWERS } from "@/lib/answers/data";

export const dynamicParams = true;
export const revalidate = 86400;

export function generateStaticParams() {
  return ANSWERS.slice(0, 10).map((a) => ({ slug: a.slug }));
}

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const answer = ANSWERS.find((a) => a.slug === slug);
  if (!answer) return { title: "Answer Not Found" };
  return {
    title: `${answer.question} — Social Perks`,
    description: answer.tldr,
    openGraph: {
      title: answer.question,
      description: answer.tldr,
      type: "article",
    },
  };
}

export default async function AnswerPage({ params }: Params) {
  const { slug } = await params;
  const answer = ANSWERS.find((a) => a.slug === slug);
  if (!answer) return notFound();

  const qaSchema = {
    "@context": "https://schema.org",
    "@type": "QAPage",
    mainEntity: {
      "@type": "Question",
      name: answer.question,
      answerCount: 1,
      acceptedAnswer: {
        "@type": "Answer",
        text: answer.tldr,
      },
    },
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: answer.question,
        acceptedAnswer: { "@type": "Answer", text: answer.tldr },
      },
    ],
  };

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(qaSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <nav className="mb-6 text-sm text-gray-400">
        <Link href="/answers" className="hover:text-cyan-300">
          ← All answers
        </Link>
      </nav>

      <h1 className="font-serif text-3xl italic text-white">{answer.question}</h1>

      <section className="mt-6 rounded-lg border border-cyan-400/30 bg-cyan-400/5 p-5">
        <p className="text-xs font-mono uppercase tracking-wider text-cyan-300">TL;DR</p>
        <p className="mt-2 text-gray-100">{answer.tldr}</p>
      </section>

      <section className="mt-10">
        <h2 className="font-serif text-2xl italic text-white">Detailed answer</h2>
        <ul className="mt-4 space-y-2">
          {answer.detailed.map((line, i) => (
            <li key={i} className="flex gap-3 text-gray-300">
              <span className="font-mono text-cyan-300">{i + 1}.</span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="font-serif text-2xl italic text-white">Common mistakes</h2>
        <ul className="mt-4 space-y-3">
          {answer.mistakes.map((m, i) => (
            <li key={i} className="rounded-lg border border-amber-400/20 bg-amber-400/5 p-4 text-gray-200">
              <span className="font-mono text-amber-300">{i + 1}.</span> {m}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="font-serif text-2xl italic text-white">What to do instead</h2>
        {answer.doInstead.map((p, i) => (
          <p key={i} className="mt-4 text-gray-300">
            {p}
          </p>
        ))}
      </section>

      <section className="mt-12 rounded-lg border border-green-400/30 bg-green-400/5 p-6 text-center">
        <p className="text-gray-200">Get help with this — start your free trial.</p>
        <Link
          href="/?signup=1"
          className="mt-4 inline-block rounded-md bg-cyan-400 px-5 py-2.5 text-sm font-semibold text-gray-900 hover:bg-cyan-300"
        >
          Start free trial
        </Link>
      </section>

      <section className="mt-12">
        <h2 className="font-serif text-xl italic text-white">More questions</h2>
        <ul className="mt-4 grid gap-2">
          {ANSWERS.filter((a) => a.slug !== answer.slug)
            .slice(0, 6)
            .map((a) => (
              <li key={a.slug}>
                <Link href={`/answers/${a.slug}`} className="text-sm text-cyan-300 hover:underline">
                  {a.question}
                </Link>
              </li>
            ))}
        </ul>
      </section>
    </main>
  );
}
