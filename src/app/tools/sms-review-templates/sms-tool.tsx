"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type Category = "purchase" | "service" | "event" | "meal";

interface Template {
  id: string;
  category: Category;
  text: string;
}

const TEMPLATES: Template[] = [
  // Post-purchase
  {
    id: "p1",
    category: "purchase",
    text: "Hi {Name}! Thanks for shopping with us today. If you have 30 sec, would you leave a quick Google review? {Link} — means the world.",
  },
  {
    id: "p2",
    category: "purchase",
    text: "Hey {Name}, hope you're loving your new {Item}! A quick review would help our small shop a ton: {Link}",
  },
  {
    id: "p3",
    category: "purchase",
    text: "Thanks for your order, {Name}! If we did right by you, would you mind leaving a star review? {Link}",
  },
  {
    id: "p4",
    category: "purchase",
    text: "{Name}, you made our day choosing us. Could you spare 30 seconds for a Google review? {Link}",
  },
  {
    id: "p5",
    category: "purchase",
    text: "Hi {Name}! Quick favor — a review helps other folks find us. {Link} 🙏 — {Business}",
  },
  {
    id: "p6",
    category: "purchase",
    text: "Hey {Name}, hope your purchase is everything you hoped for. Mind dropping a review? {Link}",
  },
  {
    id: "p7",
    category: "purchase",
    text: "Thanks {Name}! If you had a great experience, we'd love a review: {Link}. If not, just reply — we'll fix it.",
  },

  // Post-service
  {
    id: "s1",
    category: "service",
    text: "Hi {Name}! Hope your appointment went great. A quick review would help us out a ton: {Link} — thank you!",
  },
  {
    id: "s2",
    category: "service",
    text: "{Name}, thanks for trusting us today. If you have a sec, please leave a review: {Link}",
  },
  {
    id: "s3",
    category: "service",
    text: "Hey {Name}! Was great seeing you today. Mind leaving a quick Google review? {Link} 💛",
  },
  {
    id: "s4",
    category: "service",
    text: "Thanks for your visit, {Name}! Reviews help us keep our doors open: {Link}",
  },
  {
    id: "s5",
    category: "service",
    text: "Hi {Name} — hope you loved your service. A short review would mean a lot: {Link}",
  },
  {
    id: "s6",
    category: "service",
    text: "{Name}, thank you for choosing {Business}. We'd appreciate a Google review when you have a moment: {Link}",
  },
  {
    id: "s7",
    category: "service",
    text: "Hi {Name}! If today's visit hit the mark, a review helps a lot: {Link}. If not, please reply directly.",
  },

  // Post-event
  {
    id: "e1",
    category: "event",
    text: "Thanks for joining us, {Name}! Hope you had a blast. A review would mean a lot: {Link}",
  },
  {
    id: "e2",
    category: "event",
    text: "Hey {Name}! Was so great having you at {Event}. Mind sharing a quick review? {Link}",
  },
  {
    id: "e3",
    category: "event",
    text: "{Name}, thanks for being part of today. Reviews help us run more events like this: {Link}",
  },
  {
    id: "e4",
    category: "event",
    text: "Hi {Name}! If you enjoyed {Event}, a Google review would help others find us: {Link}",
  },
  {
    id: "e5",
    category: "event",
    text: "Thanks for coming out, {Name}! Drop us a review if you had fun: {Link} 🙌",
  },
  {
    id: "e6",
    category: "event",
    text: "Hey {Name}! Hope {Event} was everything you hoped for. We'd love a review: {Link}",
  },

  // Post-meal
  {
    id: "m1",
    category: "meal",
    text: "Hi {Name}! Hope you enjoyed your meal at {Business}. Quick review? {Link} — really helps us out 🙏",
  },
  {
    id: "m2",
    category: "meal",
    text: "{Name}, thanks for dining with us! A Google review would mean a lot to our team: {Link}",
  },
  {
    id: "m3",
    category: "meal",
    text: "Hey {Name}! Hope the {Dish} hit the spot. If yes — a review would be golden: {Link}",
  },
  {
    id: "m4",
    category: "meal",
    text: "Thanks for choosing us tonight, {Name}! Reviews keep small kitchens cooking: {Link}",
  },
  {
    id: "m5",
    category: "meal",
    text: "{Name}, was great having you in. A short review helps other foodies find us: {Link}",
  },
  {
    id: "m6",
    category: "meal",
    text: "Hi {Name}! If your meal was on point, drop us a review: {Link}. If not — please reply, we'll fix it.",
  },
  {
    id: "m7",
    category: "meal",
    text: "Hey {Name}, thanks for ordering from {Business}! A quick Google review would make our week: {Link}",
  },
];

const CATEGORIES: { id: Category | "all"; label: string; description: string }[] = [
  { id: "all", label: "All", description: "Every template" },
  {
    id: "purchase",
    label: "Post-purchase",
    description: "After they buy something",
  },
  {
    id: "service",
    label: "Post-service",
    description: "After an appointment or visit",
  },
  {
    id: "event",
    label: "Post-event",
    description: "After a class, show, or event",
  },
  { id: "meal", label: "Post-meal", description: "After dining or takeout" },
];

const SMS_LIMIT = 160;

export function SmsTool() {
  const [activeCategory, setActiveCategory] = useState<Category | "all">(
    "all",
  );
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const visible = useMemo(() => {
    if (activeCategory === "all") return TEMPLATES;
    return TEMPLATES.filter((t) => t.category === activeCategory);
  }, [activeCategory]);

  async function handleCopy(template: Template) {
    try {
      await navigator.clipboard.writeText(template.text);
      setCopiedId(template.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // ignore
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
      {/* Filter tabs */}
      <div
        className="flex flex-wrap gap-2"
        role="tablist"
        aria-label="SMS template categories"
      >
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            role="tab"
            aria-selected={activeCategory === c.id}
            onClick={() => setActiveCategory(c.id)}
            className={`rounded-lg border px-4 py-2 text-sm font-medium transition-all ${
              activeCategory === c.id
                ? "border-brand-cyan bg-brand-cyan/10 text-brand-cyan"
                : "border-brand-border bg-brand-surface/40 text-brand-dim hover:border-brand-subtle hover:text-brand-text"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Helper text */}
      <p className="mt-4 text-sm text-brand-dim">
        Replace{" "}
        <span className="font-mono text-brand-text">{`{Name}`}</span>,{" "}
        <span className="font-mono text-brand-text">{`{Business}`}</span>,{" "}
        <span className="font-mono text-brand-text">{`{Link}`}</span>, etc.
        with your details before sending. SMS limit is 160 characters.
      </p>

      {/* Templates */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {visible.map((template) => {
          const length = template.text.length;
          const overLimit = length > SMS_LIMIT;
          const isCopied = copiedId === template.id;
          return (
            <div
              key={template.id}
              className="flex flex-col rounded-2xl border border-brand-border bg-brand-surface/40 p-5"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-brand-muted">
                  {CATEGORIES.find((c) => c.id === template.category)?.label}
                </span>
                <span
                  className={`font-mono text-[11px] ${
                    overLimit ? "text-brand-amber" : "text-brand-muted"
                  }`}
                >
                  {length}/{SMS_LIMIT}
                </span>
              </div>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-brand-text">
                {template.text}
              </p>
              <button
                type="button"
                onClick={() => handleCopy(template)}
                className={`mt-4 self-start rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
                  isCopied
                    ? "bg-brand-green/20 text-brand-green"
                    : "bg-brand-cyan text-brand-bg hover:bg-cyan-300"
                }`}
              >
                {isCopied ? "Copied ✓" : "Copy"}
              </button>
            </div>
          );
        })}
      </div>

      {/* CTA */}
      <div className="mt-12 rounded-2xl border border-brand-border bg-gradient-to-br from-brand-amber/[0.05] via-brand-surface/30 to-brand-surface/30 p-8 text-center sm:p-10">
        <h3 className="font-heading text-2xl italic leading-tight text-brand-white sm:text-3xl">
          Send these automatically with Social Perks
        </h3>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-brand-dim sm:text-base">
          Why copy-paste when Social Perks can text every customer at the
          right moment, track who replied, and reward them with perks for
          posting?
        </p>
        <Link
          href="/ai"
          className="mt-6 inline-flex items-center gap-1.5 rounded-xl bg-brand-cyan px-7 py-3 text-sm font-semibold text-brand-bg transition-all hover:bg-cyan-300 hover:shadow-lg hover:shadow-brand-cyan/20"
        >
          See how it works →
        </Link>
      </div>
    </div>
  );
}
