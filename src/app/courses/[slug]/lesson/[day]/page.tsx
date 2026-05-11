import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Nav } from "@/components/shared/nav";
import { Footer } from "@/components/shared/footer";
import { COURSES, getCourse, getCourseLesson } from "@/lib/courses/data";

export function generateStaticParams() {
  const params: { slug: string; day: string }[] = [];
  for (const course of COURSES) {
    for (const lesson of course.lessons) {
      params.push({ slug: course.slug, day: String(lesson.day) });
    }
  }
  return params;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; day: string }>;
}): Promise<Metadata> {
  const { slug, day } = await params;
  const dayNum = parseInt(day, 10);
  const result = getCourseLesson(slug, dayNum);
  if (!result) return { title: "Lesson not found" };
  const { course, lesson } = result;
  return {
    title: `Day ${lesson.day}: ${lesson.subject} · ${course.title} · Social Perks`,
    description: lesson.subject,
    alternates: {
      canonical: `https://socialperks.io/courses/${course.slug}/lesson/${lesson.day}`,
    },
    openGraph: {
      title: `Day ${lesson.day}: ${lesson.subject}`,
      description: course.subtitle,
      url: `https://socialperks.io/courses/${course.slug}/lesson/${lesson.day}`,
      siteName: "Social Perks",
      type: "article",
    },
  };
}

export default async function LessonPage({
  params,
}: {
  params: Promise<{ slug: string; day: string }>;
}) {
  const { slug, day } = await params;
  const dayNum = parseInt(day, 10);
  if (Number.isNaN(dayNum)) notFound();
  const result = getCourseLesson(slug, dayNum);
  if (!result) notFound();
  const { course, lesson } = result;

  const totalDays = course.lessons.length;
  const nextLesson = course.lessons.find((l) => l.day === lesson.day + 1);
  const prevLesson = course.lessons.find((l) => l.day === lesson.day - 1);

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: lesson.subject,
    description: course.subtitle,
    isPartOf: {
      "@type": "Course",
      name: course.title,
      url: `https://socialperks.io/courses/${course.slug}`,
    },
    author: {
      "@type": "Organization",
      name: "Social Perks",
    },
    publisher: {
      "@type": "Organization",
      name: "Social Perks",
    },
    mainEntityOfPage: `https://socialperks.io/courses/${course.slug}/lesson/${lesson.day}`,
  };

  // Render the body as paragraphs preserving paragraph breaks.
  const paragraphs = lesson.body.split(/\n\n+/).map((p) => p.trim()).filter(
    Boolean,
  );

  return (
    <div className="min-h-screen overflow-x-hidden">
      <Nav />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <main
        id="main-content"
        className="mx-auto max-w-3xl px-6 py-16 md:py-24"
      >
        <nav
          aria-label="Breadcrumb"
          className="font-mono text-xs uppercase tracking-[0.14em] text-[var(--text-tertiary)]"
        >
          <Link
            href="/courses"
            className="hover:text-[var(--accent-cyan)]"
          >
            Courses
          </Link>
          <span aria-hidden> / </span>
          <Link
            href={`/courses/${course.slug}`}
            className="hover:text-[var(--accent-cyan)]"
          >
            {course.title}
          </Link>
        </nav>

        <p className="mt-6 font-mono text-xs uppercase tracking-[0.18em] text-[var(--accent-cyan)]">
          Day {lesson.day} of {totalDays}
        </p>
        <h1 className="mt-3 font-serif text-3xl italic leading-[1.1] md:text-5xl">
          {lesson.subject}
        </h1>

        <div className="mt-10 space-y-5 text-base leading-relaxed text-[var(--text-secondary)] md:text-lg md:leading-[1.7]">
          {paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>

        <aside
          className="mt-12 rounded-2xl border border-[var(--accent-cyan)]/40 bg-[var(--accent-cyan)]/10 p-6 md:p-8"
          aria-label="Today's action"
        >
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--accent-cyan)]">
            Today's action
          </p>
          <p className="mt-3 font-serif text-lg italic md:text-xl">
            {lesson.cta}
          </p>
        </aside>

        <nav
          aria-label="Course navigation"
          className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-[var(--border-subtle)] pt-8"
        >
          <div>
            {prevLesson ? (
              <Link
                href={`/courses/${course.slug}/lesson/${prevLesson.day}`}
                className="font-mono text-xs uppercase tracking-[0.14em] text-[var(--text-tertiary)] hover:text-[var(--accent-cyan)] md:text-sm"
              >
                ← Day {prevLesson.day}: {prevLesson.subject}
              </Link>
            ) : (
              <Link
                href={`/courses/${course.slug}`}
                className="font-mono text-xs uppercase tracking-[0.14em] text-[var(--text-tertiary)] hover:text-[var(--accent-cyan)] md:text-sm"
              >
                ← Back to course
              </Link>
            )}
          </div>
          <div>
            {nextLesson ? (
              <Link
                href={`/courses/${course.slug}/lesson/${nextLesson.day}`}
                className="font-mono text-xs uppercase tracking-[0.14em] text-[var(--accent-cyan)] md:text-sm"
              >
                Next: Day {nextLesson.day}: {nextLesson.subject} →
              </Link>
            ) : (
              <Link
                href={`/courses/${course.slug}`}
                className="font-mono text-xs uppercase tracking-[0.14em] text-[var(--accent-cyan)] md:text-sm"
              >
                You finished. Back to course →
              </Link>
            )}
          </div>
        </nav>

        <section className="mt-16 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 md:p-8">
          <h2 className="font-serif text-xl italic md:text-2xl">
            Want every lesson delivered to your inbox?
          </h2>
          <p className="mt-2 text-sm text-[var(--text-secondary)] md:text-base">
            Reading on the site is fine, but most people stick with the course
            when it lands in their inbox each morning.
          </p>
          <Link
            href={`/courses/${course.slug}`}
            className="mt-5 inline-block rounded-full bg-[var(--accent-cyan)] px-5 py-2 font-mono text-sm uppercase tracking-[0.14em] text-[var(--bg-base)] transition hover:opacity-90"
          >
            Get the full course free
          </Link>
        </section>
      </main>
      <Footer />
    </div>
  );
}
