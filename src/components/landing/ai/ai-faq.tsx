"use client";

import { useState } from "react";
import { AnimateOnScroll } from "@/components/shared/animate-on-scroll";

interface FaqItem {
  question: string;
  answer: string;
}

const FAQ: FaqItem[] = [
  {
    question: "Will it post on my behalf without permission?",
    answer:
      "No. The AI generates suggestions and submissions for your customers to post. You set the rules — it never posts to your accounts directly.",
  },
  {
    question: "Can I edit what the AI does?",
    answer:
      "Always. Every campaign has an \u201cedit\u201d button. You can review, tweak, or pause anything in one click.",
  },
  {
    question: "What if it makes a mistake?",
    answer:
      "Every campaign has spending caps and approval gates. The AI runs within guardrails you set. If something looks off, it flags it for your review instead of acting.",
  },
  {
    question: "How is this different from ChatGPT?",
    answer:
      "ChatGPT writes — our AI runs a real marketing system: matching influencers, sending perks, processing submissions, tracking ROI. It's an agent, not a chatbot.",
  },
  {
    question: "Does it work for my industry?",
    answer:
      "Yes — coffee shops, salons, restaurants, gyms, boutiques, wellness, services, e-commerce. The AI adapts to your category by reading your existing online presence.",
  },
  {
    question: "What if I just want to do it myself?",
    answer:
      "You can. The dashboard works manually too. Most owners turn the AI off for one week, try it manually, then turn it back on.",
  },
];

export function AiFaq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section
      className="relative bg-brand-bg py-20 sm:py-28 lg:py-32"
      aria-labelledby="ai-faq-heading"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-border to-transparent"
        aria-hidden="true"
      />

      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <AnimateOnScroll animation="fade-up" className="mb-12 text-center sm:mb-16">
          <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.15em] text-brand-cyan sm:text-xs">
            FAQ
          </p>
          <h2
            id="ai-faq-heading"
            className="font-heading text-[clamp(1.75rem,3vw,3rem)] italic text-brand-white leading-tight"
          >
            The AI questions everyone asks
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-brand-dim leading-relaxed sm:text-lg">
            Short answers. No marketing fluff.
          </p>
        </AnimateOnScroll>

        <AnimateOnScroll animation="fade-up" delay={100}>
          <ul className="space-y-3" role="list">
            {FAQ.map((item, idx) => {
              const isOpen = open === idx;
              return (
                <li
                  key={item.question}
                  className={`overflow-hidden rounded-xl border bg-brand-surface/30 backdrop-blur-sm transition-all duration-300 ${
                    isOpen
                      ? "border-brand-cyan/40 bg-brand-surface/50 shadow-lg shadow-brand-cyan/5"
                      : "border-brand-border/40 hover:border-brand-border/70"
                  }`}
                >
                  <button
                    onClick={() => setOpen(isOpen ? null : idx)}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/40 sm:px-6 sm:py-5"
                    aria-expanded={isOpen}
                    aria-controls={`faq-panel-${idx}`}
                  >
                    <span className="font-body text-base font-semibold text-brand-white sm:text-lg">
                      {item.question}
                    </span>
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-all ${
                        isOpen
                          ? "rotate-45 bg-brand-cyan/15 text-brand-cyan"
                          : "bg-brand-bg/60 text-brand-muted"
                      }`}
                      aria-hidden="true"
                    >
                      <svg
                        viewBox="0 0 16 16"
                        fill="none"
                        className="h-4 w-4"
                      >
                        <path
                          d="M8 3v10M3 8h10"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        />
                      </svg>
                    </span>
                  </button>
                  <div
                    id={`faq-panel-${idx}`}
                    className={`grid transition-all duration-300 ease-out ${
                      isOpen
                        ? "grid-rows-[1fr] opacity-100"
                        : "grid-rows-[0fr] opacity-0"
                    }`}
                  >
                    <div className="overflow-hidden">
                      <p className="px-5 pb-5 text-sm leading-relaxed text-brand-dim sm:px-6 sm:pb-6 sm:text-base">
                        {item.answer}
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </AnimateOnScroll>
      </div>
    </section>
  );
}
