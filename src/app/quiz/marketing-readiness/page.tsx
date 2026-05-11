"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Nav } from "@/components/shared/nav";
import { Footer } from "@/components/shared/footer";

interface Option {
  label: string;
  score: 0 | 1 | 2 | 3;
}

interface Question {
  id: string;
  category: "reviews" | "social" | "followup" | "budget" | "tracking";
  prompt: string;
  options: Option[];
}

const QUESTIONS: Question[] = [
  {
    id: "review-volume",
    category: "reviews",
    prompt: "How many Google reviews have you collected in the last 90 days?",
    options: [
      { label: "Zero — we don't really ask", score: 0 },
      { label: "1–5", score: 1 },
      { label: "6–20", score: 2 },
      { label: "20+ and growing", score: 3 },
    ],
  },
  {
    id: "review-rating",
    category: "reviews",
    prompt: "What's your current Google rating?",
    options: [
      { label: "Below 4.0 (or no reviews)", score: 0 },
      { label: "4.0 – 4.3", score: 1 },
      { label: "4.4 – 4.6", score: 2 },
      { label: "4.7+", score: 3 },
    ],
  },
  {
    id: "social-frequency",
    category: "social",
    prompt: "How often do you post on social media?",
    options: [
      { label: "Rarely or never", score: 0 },
      { label: "Once a month-ish", score: 1 },
      { label: "Weekly", score: 2 },
      { label: "3+ times a week on at least one platform", score: 3 },
    ],
  },
  {
    id: "social-platforms",
    category: "social",
    prompt: "Which platforms are you actively using?",
    options: [
      { label: "None or just one half-heartedly", score: 0 },
      { label: "One platform consistently", score: 1 },
      { label: "Two platforms consistently", score: 2 },
      { label: "Three or more, with intent for each", score: 3 },
    ],
  },
  {
    id: "followup-system",
    category: "followup",
    prompt: "Do you follow up with customers after a sale or service?",
    options: [
      { label: "No structured follow-up", score: 0 },
      { label: "Sometimes, when I remember", score: 1 },
      { label: "Yes — manual but consistent (email or SMS)", score: 2 },
      { label: "Yes — automated, every customer", score: 3 },
    ],
  },
  {
    id: "followup-ask",
    category: "followup",
    prompt: "Do you ask happy customers to share your business?",
    options: [
      { label: "Never feels right to ask", score: 0 },
      { label: "Occasionally, in person", score: 1 },
      { label: "Yes, with a script or template", score: 2 },
      { label: "Yes, and we offer a perk or incentive", score: 3 },
    ],
  },
  {
    id: "budget-allocation",
    category: "budget",
    prompt: "What share of your monthly marketing spend goes to existing customers (vs ads to strangers)?",
    options: [
      { label: "Zero — all ads", score: 0 },
      { label: "Less than 10%", score: 1 },
      { label: "10–30%", score: 2 },
      { label: "30%+ — we lean on customers and word-of-mouth", score: 3 },
    ],
  },
  {
    id: "budget-defined",
    category: "budget",
    prompt: "Do you have a defined monthly marketing budget?",
    options: [
      { label: "No, it's whatever's left over", score: 0 },
      { label: "Rough ballpark, not enforced", score: 1 },
      { label: "Yes — fixed monthly number", score: 2 },
      { label: "Yes — split across channels with targets", score: 3 },
    ],
  },
  {
    id: "tracking-attribution",
    category: "tracking",
    prompt: "When a new customer walks in, do you know how they found you?",
    options: [
      { label: "No idea, never tracked", score: 0 },
      { label: "We ask sometimes, don't write it down", score: 1 },
      { label: "We log it in a spreadsheet or POS", score: 2 },
      { label: "Yes — UTM links, source field, and reviewed monthly", score: 3 },
    ],
  },
  {
    id: "tracking-tools",
    category: "tracking",
    prompt: "Which analytics tools do you actually look at?",
    options: [
      { label: "None", score: 0 },
      { label: "Just whatever shows up in Instagram or Google Business", score: 1 },
      { label: "Google Analytics + platform insights, occasionally", score: 2 },
      { label: "GA4 + UTM tracking + monthly dashboards", score: 3 },
    ],
  },
];

const MAX_SCORE = QUESTIONS.length * 3;
const STORAGE_KEY = "social-perks:marketing-readiness-quiz";

interface SavedResult {
  answers: Record<string, number>;
  score: number;
  tier: "Beginner" | "Intermediate" | "Advanced";
  completedAt: number;
}

function getTier(score: number): "Beginner" | "Intermediate" | "Advanced" {
  const pct = score / MAX_SCORE;
  if (pct < 0.4) return "Beginner";
  if (pct < 0.75) return "Intermediate";
  return "Advanced";
}

function getCategoryScores(answers: Record<string, number>) {
  const buckets: Record<Question["category"], { score: number; max: number }> = {
    reviews: { score: 0, max: 0 },
    social: { score: 0, max: 0 },
    followup: { score: 0, max: 0 },
    budget: { score: 0, max: 0 },
    tracking: { score: 0, max: 0 },
  };
  for (const q of QUESTIONS) {
    buckets[q.category].max += 3;
    buckets[q.category].score += answers[q.id] ?? 0;
  }
  return buckets;
}

const CATEGORY_LABELS: Record<Question["category"], string> = {
  reviews: "Reviews & reputation",
  social: "Social media presence",
  followup: "Customer follow-up",
  budget: "Marketing budget discipline",
  tracking: "Tracking & attribution",
};

const CATEGORY_RECS: Record<Question["category"], string> = {
  reviews:
    "You're leaving reviews on the table. Set up an automatic SMS or email after every customer interaction asking for a Google review. One restaurant we work with went from 12 reviews to 180 in 6 months doing only this.",
  social:
    "Pick ONE platform you can post on 3x per week and double down. Spreading thin across five platforms is worse than dominating one. Instagram for visual, LinkedIn for B2B, Facebook for local.",
  followup:
    "Customer follow-up is where most small businesses lose money. The customer just bought from you — they're the warmest audience you'll ever have. Send a thank-you within 24 hours and a perk offer within 7 days.",
  budget:
    "If you can't see your marketing spend by channel, you can't optimize it. Set a fixed monthly budget and split it: 40% ads, 20% content, 20% tools, 20% customer perks. Adjust based on what's working.",
  tracking:
    "You can't improve what you don't measure. Start with UTM links on every campaign and a 'how did you hear about us?' field at checkout. That's 80% of attribution for 5 minutes of setup.",
};

const TIER_COPY: Record<
  "Beginner" | "Intermediate" | "Advanced",
  { headline: string; subhead: string; cta: string }
> = {
  Beginner: {
    headline: "You're at the starting line — and that's a huge opportunity.",
    subhead:
      "The good news: most growth gains come from doing the basics consistently. You don't need fancy tools yet. You need a system for reviews, follow-ups, and one good social channel.",
    cta: "Start your free Social Perks trial — we'll automate reviews + perks for you",
  },
  Intermediate: {
    headline: "You're doing the work — let's compound it.",
    subhead:
      "You've got the fundamentals. The next leap is consistency and automation. Stop manually nudging people for reviews. Stop guessing on budget. Tighten the loops you already have.",
    cta: "Try Social Perks free — turn one-off wins into a flywheel",
  },
  Advanced: {
    headline: "You're ahead of 90% of small businesses.",
    subhead:
      "At this level, growth is about scale and leverage. Customer-powered marketing (referrals, UGC, reviews) is the highest-leverage channel left. That's what Social Perks does on autopilot.",
    cta: "See how Social Perks scales customer marketing for advanced operators",
  },
};

export default function MarketingReadinessQuizPage() {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as SavedResult;
      if (saved && saved.answers) {
        setAnswers(saved.answers);
        setShowResult(true);
      }
    } catch {}
  }, []);

  const score = useMemo(
    () => Object.values(answers).reduce((sum, v) => sum + v, 0),
    [answers],
  );
  const tier = useMemo(() => getTier(score), [score]);
  const categoryScores = useMemo(() => getCategoryScores(answers), [answers]);

  const weakAreas = useMemo(() => {
    return (Object.keys(categoryScores) as Question["category"][])
      .map((c) => ({ category: c, ...categoryScores[c] }))
      .sort((a, b) => a.score / a.max - b.score / b.max)
      .slice(0, 3);
  }, [categoryScores]);

  function selectAnswer(questionId: string, value: number) {
    const next = { ...answers, [questionId]: value };
    setAnswers(next);
    if (currentIndex < QUESTIONS.length - 1) {
      setTimeout(() => setCurrentIndex(currentIndex + 1), 180);
    } else {
      finish(next);
    }
  }

  function finish(finalAnswers: Record<string, number>) {
    const total = Object.values(finalAnswers).reduce((s, v) => s + v, 0);
    const result: SavedResult = {
      answers: finalAnswers,
      score: total,
      tier: getTier(total),
      completedAt: Date.now(),
    };
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(result));
      } catch {}
    }
    setShowResult(true);
  }

  function restart() {
    setAnswers({});
    setCurrentIndex(0);
    setShowResult(false);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {}
    }
  }

  async function copyShareLink() {
    if (typeof window === "undefined") return;
    const text = `I scored ${score}/${MAX_SCORE} on the Social Perks Marketing Readiness Quiz — ${tier} tier. Take it: ${window.location.href}`;
    try {
      await navigator.clipboard.writeText(text);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 1800);
    } catch {}
  }

  function shareTwitter() {
    if (typeof window === "undefined") return;
    const text = `I scored ${score}/${MAX_SCORE} on the @socialperks Marketing Readiness Quiz — ${tier} tier. How marketing-ready is your small business?`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(window.location.href)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  const current = QUESTIONS[currentIndex];
  const progressPct = ((currentIndex + (showResult ? 1 : 0)) / QUESTIONS.length) * 100;
  const tierCopy = TIER_COPY[tier];

  return (
    <div className="min-h-screen overflow-x-hidden bg-brand-bg">
      <Nav />
      <main id="main-content">
        <section className="relative pt-32 pb-12 sm:pt-40">
          <div
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(34,211,238,0.05),transparent_60%)]"
            aria-hidden="true"
          />
          <div className="relative z-10 mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
            <Link
              href="/quiz"
              className="inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.15em] text-brand-muted transition-colors hover:text-brand-cyan"
            >
              ← All quizzes
            </Link>
            <h1 className="mt-5 font-heading text-[clamp(2rem,4.5vw,3.5rem)] italic leading-[1.05] tracking-tight text-brand-white">
              Marketing{" "}
              <span className="bg-gradient-to-r from-brand-cyan to-brand-green bg-clip-text text-transparent">
                Readiness Quiz
              </span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-brand-dim sm:text-lg">
              10 honest questions. See where your small business actually stands — and what to fix first. Takes 2 minutes.
            </p>
          </div>
        </section>

        <section className="pb-24">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            {!showResult ? (
              <div className="rounded-2xl border border-brand-border bg-brand-surface/50 p-6 sm:p-10">
                <div className="mb-6 flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.15em] text-brand-muted">
                  <span>
                    Question {currentIndex + 1} of {QUESTIONS.length}
                  </span>
                  <span>{Math.round(progressPct)}%</span>
                </div>
                <div className="mb-8 h-1.5 w-full overflow-hidden rounded-full bg-brand-border">
                  <div
                    className="h-full bg-gradient-to-r from-brand-cyan to-brand-green transition-all duration-300"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>

                <h2 className="font-heading text-2xl italic leading-snug text-brand-white sm:text-3xl">
                  {current.prompt}
                </h2>

                <div className="mt-8 space-y-3">
                  {current.options.map((opt) => (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => selectAnswer(current.id, opt.score)}
                      className="group w-full rounded-xl border border-brand-border bg-brand-surface/30 p-4 text-left transition-all hover:-translate-y-0.5 hover:border-brand-cyan/40 hover:bg-brand-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/40"
                    >
                      <span className="text-sm leading-relaxed text-brand-text group-hover:text-brand-white sm:text-base">
                        {opt.label}
                      </span>
                    </button>
                  ))}
                </div>

                {currentIndex > 0 && (
                  <button
                    type="button"
                    onClick={() => setCurrentIndex(currentIndex - 1)}
                    className="mt-6 font-mono text-[11px] uppercase tracking-[0.15em] text-brand-muted hover:text-brand-cyan"
                  >
                    ← Back
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                <div className="rounded-2xl border border-brand-border bg-brand-surface/50 p-6 text-center sm:p-10">
                  <div className="font-mono text-[11px] uppercase tracking-[0.15em] text-brand-muted">
                    Your result
                  </div>
                  <div className="mt-4 font-heading text-6xl italic leading-none text-brand-white sm:text-7xl">
                    {score}
                    <span className="text-brand-muted">/{MAX_SCORE}</span>
                  </div>
                  <div className="mt-3 inline-flex items-center rounded-full border border-brand-cyan/30 bg-brand-cyan/10 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.15em] text-brand-cyan">
                    {tier} tier
                  </div>
                  <h2 className="mt-6 font-heading text-2xl italic leading-snug text-brand-white sm:text-3xl">
                    {tierCopy.headline}
                  </h2>
                  <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-brand-dim sm:text-base">
                    {tierCopy.subhead}
                  </p>

                  <div className="mt-6 flex flex-col items-center justify-center gap-2 sm:flex-row sm:gap-3">
                    <button
                      type="button"
                      onClick={shareTwitter}
                      className="rounded-xl border border-brand-border bg-brand-surface/50 px-5 py-2.5 text-sm font-medium text-brand-text hover:border-brand-cyan/40"
                    >
                      Share on Twitter
                    </button>
                    <button
                      type="button"
                      onClick={copyShareLink}
                      className="rounded-xl border border-brand-border bg-brand-surface/50 px-5 py-2.5 text-sm font-medium text-brand-text hover:border-brand-cyan/40"
                    >
                      {shareCopied ? "Copied!" : "Copy result"}
                    </button>
                    <button
                      type="button"
                      onClick={restart}
                      className="font-mono text-[11px] uppercase tracking-[0.15em] text-brand-muted hover:text-brand-cyan"
                    >
                      Retake quiz
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border border-brand-border bg-brand-surface/50 p-6 sm:p-8">
                  <h3 className="font-heading text-xl italic text-brand-white">
                    Where you stand, category by category
                  </h3>
                  <div className="mt-5 space-y-4">
                    {(Object.keys(categoryScores) as Question["category"][]).map((cat) => {
                      const { score: s, max } = categoryScores[cat];
                      const pct = (s / max) * 100;
                      return (
                        <div key={cat}>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-brand-text">{CATEGORY_LABELS[cat]}</span>
                            <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-brand-muted">
                              {s}/{max}
                            </span>
                          </div>
                          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-brand-border">
                            <div
                              className={`h-full transition-all ${
                                pct >= 75
                                  ? "bg-brand-green"
                                  : pct >= 40
                                    ? "bg-brand-cyan"
                                    : "bg-brand-amber"
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-2xl border border-brand-border bg-brand-surface/50 p-6 sm:p-8">
                  <h3 className="font-heading text-xl italic text-brand-white">
                    Your top 3 areas to fix
                  </h3>
                  <p className="mt-2 text-sm text-brand-dim">
                    Based on your weakest categories. Do these in order.
                  </p>
                  <div className="mt-5 space-y-4">
                    {weakAreas.map((area, idx) => (
                      <div
                        key={area.category}
                        className="rounded-xl border border-brand-border bg-brand-surface/30 p-4"
                      >
                        <div className="flex items-center gap-3">
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-cyan/10 font-mono text-xs text-brand-cyan">
                            {idx + 1}
                          </span>
                          <span className="text-sm font-semibold text-brand-white">
                            {CATEGORY_LABELS[area.category]}
                          </span>
                        </div>
                        <p className="mt-3 text-sm leading-relaxed text-brand-dim">
                          {CATEGORY_RECS[area.category]}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-brand-cyan/30 bg-gradient-to-br from-brand-cyan/10 to-brand-green/5 p-8 text-center sm:p-10">
                  <h3 className="font-heading text-2xl italic leading-snug text-brand-white sm:text-3xl">
                    {tierCopy.headline}
                  </h3>
                  <Link
                    href="/pricing"
                    className="mt-6 inline-block rounded-xl bg-brand-cyan px-7 py-3 text-sm font-semibold text-brand-bg transition-all hover:bg-cyan-300 hover:shadow-lg hover:shadow-brand-cyan/20"
                  >
                    {tierCopy.cta} →
                  </Link>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
