import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/shared/nav";
import { Footer } from "@/components/shared/footer";
import { COURSES } from "@/lib/courses/data";

export const metadata: Metadata = {
  title: "Free email courses for small business marketing · Social Perks",
  description:
    "Five free email courses — short, daily lessons that teach you how to drive reviews, grow on Instagram and TikTok, build loyalty, and run influencer campaigns.",
  alternates: { canonical: "https://socialperks.io/courses" },
  openGraph: {
    title: "Free email courses for small business marketing",
    description:
      "Daily lessons sent straight to your inbox. Real tactics, no fluff. Done in 5-7 days.",
    url: "https://socialperks.io/courses",
    siteName: "Social Perks",
    type: "website",
  },
};

export default function CoursesIndexPage() {
  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Social Perks Free Email Courses",
    description:
      "Free multi-day email courses on small business marketing topics.",
    itemListElement: COURSES.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `https://socialperks.io/courses/${c.slug}`,
      name: c.title,
    })),
  };

  return (
    <div className="min-h-screen overflow-x-hidden">
      <Nav />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
      <main id="main-content" className="mx-auto max-w-6xl px-6 py-16 md:py-24">
        <header className="mb-12 md:mb-16">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--accent-cyan)]">
            Free email courses
          </p>
          <h1 className="mt-3 font-serif text-4xl italic leading-[1.05] md:text-6xl">
            Daily lessons. Real tactics.<br />
            Done in a week.
          </h1>
          <p className="mt-6 max-w-2xl text-base text-[var(--text-secondary)] md:text-lg">
            Five free email courses for small business owners. Each runs 5-7 days
            with one lesson per day. Drop your email, get the first lesson today.
            No fluff, no SaaS pitch in every paragraph.
          </p>
        </header>

        <div className="grid gap-6 md:grid-cols-2">
          {COURSES.map((course) => (
            <Link
              key={course.slug}
              href={`/courses/${course.slug}`}
              className="group block rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 transition hover:-translate-y-1 hover:border-[var(--accent-cyan)] hover:shadow-lg md:p-8"
            >
              <div className="flex items-center gap-3 font-mono text-xs uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
                <span>{course.duration}</span>
                <span>·</span>
                <span>{course.audience}</span>
              </div>
              <h2 className="mt-4 font-serif text-2xl italic leading-tight md:text-3xl">
                {course.title}
              </h2>
              <p className="mt-3 text-sm text-[var(--text-secondary)] md:text-base">
                {course.subtitle}
              </p>
              <p className="mt-4 text-sm text-[var(--text-tertiary)]">
                {course.lessons.length} lessons · You finish by day{" "}
                {course.lessons.length}
              </p>
              <p className="mt-6 inline-flex items-center gap-2 font-mono text-sm text-[var(--accent-cyan)] transition group-hover:gap-3">
                Start free <span aria-hidden>→</span>
              </p>
            </Link>
          ))}
        </div>

        <section className="mt-20 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-8 md:p-12">
          <h2 className="font-serif text-2xl italic md:text-3xl">
            How these courses work
          </h2>
          <ul className="mt-6 grid gap-4 text-sm text-[var(--text-secondary)] md:grid-cols-2 md:text-base">
            <li>
              <strong className="text-[var(--text-primary)]">
                One email per day.
              </strong>{" "}
              Each lesson is a 5-8 minute read with one concrete action to take that day.
            </li>
            <li>
              <strong className="text-[var(--text-primary)]">No fluff.</strong>{" "}
              We do not write 1,500 words to say what could be said in 200. Real
              numbers, real scripts, real templates.
            </li>
            <li>
              <strong className="text-[var(--text-primary)]">Unsubscribe anytime.</strong>{" "}
              One click. No "are you sure" pop-ups.
            </li>
            <li>
              <strong className="text-[var(--text-primary)]">No upsell pressure.</strong>{" "}
              We mention Social Perks at the end of each course. That's it. The
              content is the content whether you sign up or not.
            </li>
          </ul>
        </section>
      </main>
      <Footer />
    </div>
  );
}
