import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Nav } from "@/components/shared/nav";
import { Footer } from "@/components/shared/footer";
import { COURSES, getCourse } from "@/lib/courses/data";
import { CourseSignupForm } from "@/components/courses/course-signup-form";

export function generateStaticParams() {
  return COURSES.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const course = getCourse(slug);
  if (!course) return { title: "Course not found" };
  return {
    title: `${course.title} · Free email course · Social Perks`,
    description: course.subtitle,
    alternates: { canonical: `https://socialperks.io/courses/${course.slug}` },
    openGraph: {
      title: course.title,
      description: course.subtitle,
      url: `https://socialperks.io/courses/${course.slug}`,
      siteName: "Social Perks",
      type: "website",
    },
  };
}

function previewBullets(course: ReturnType<typeof getCourse>): string[] {
  if (!course) return [];
  return course.lessons.map(
    (lesson) => `Day ${lesson.day}: ${lesson.subject}`,
  );
}

function buildFaqs(course: NonNullable<ReturnType<typeof getCourse>>) {
  return [
    {
      q: `Is the ${course.title} course really free?`,
      a: "Yes. The full course — every lesson, every template, every script — is delivered free to your inbox. There is no payment step, ever. We hope you eventually try Social Perks, but the course is the course either way.",
    },
    {
      q: `How long does each lesson take to read?`,
      a: `Each of the ${course.lessons.length} lessons is a 5-8 minute read. You get one lesson per day, so the whole course takes about 30-50 minutes spread across ${course.duration}.`,
    },
    {
      q: "What if I miss a day?",
      a: "Nothing bad happens. The lessons live in your inbox and are also published on this site under each course page. You can catch up in your own time.",
    },
    {
      q: "Will you spam me with marketing emails afterward?",
      a: "No. After the course ends, you get one optional email from us inviting you to try Social Perks. After that, you only hear from us if you opt into our weekly newsletter. One-click unsubscribe is in every email.",
    },
    {
      q: "Who is this course for?",
      a: `This course is written for ${course.audience}. If you operate a different type of business, the principles still apply, but the examples may not be a perfect match.`,
    },
  ];
}

export default async function CoursePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const course = getCourse(slug);
  if (!course) notFound();

  const bullets = previewBullets(course);
  const faqs = buildFaqs(course);

  const courseJsonLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: course.title,
    description: course.subtitle,
    provider: {
      "@type": "Organization",
      name: "Social Perks",
      sameAs: "https://socialperks.io",
    },
    hasCourseInstance: {
      "@type": "CourseInstance",
      courseMode: "Online",
      courseWorkload: course.duration,
      instructor: {
        "@type": "Organization",
        name: "Social Perks",
      },
    },
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.a,
      },
    })),
  };

  return (
    <div className="min-h-screen overflow-x-hidden">
      <Nav />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(courseJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <main
        id="main-content"
        className="mx-auto max-w-4xl px-6 py-16 md:py-24"
      >
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--accent-cyan)]">
          Free email course · {course.duration}
        </p>
        <h1 className="mt-3 font-serif text-4xl italic leading-[1.05] md:text-6xl">
          {course.title}
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-[var(--text-secondary)] md:text-xl">
          {course.subtitle}
        </p>

        <section className="mt-12 grid gap-8 md:grid-cols-[1.5fr_1fr]">
          <div>
            <h2 className="font-serif text-2xl italic md:text-3xl">
              What you'll learn
            </h2>
            <ul className="mt-4 space-y-2 text-sm text-[var(--text-secondary)] md:text-base">
              {bullets.map((b) => (
                <li key={b} className="flex gap-3">
                  <span aria-hidden className="text-[var(--accent-cyan)]">
                    →
                  </span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>

            <h2 className="mt-10 font-serif text-2xl italic md:text-3xl">
              Who this is for
            </h2>
            <p className="mt-3 text-[var(--text-secondary)]">
              {course.audience} who want to {course.outcome.toLowerCase()}
            </p>

            <h2 className="mt-10 font-serif text-2xl italic md:text-3xl">
              The capstone
            </h2>
            <p className="mt-3 text-[var(--text-secondary)]">
              {course.capstone}
            </p>
          </div>

          <aside className="md:sticky md:top-24 md:self-start">
            <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 md:p-8">
              <h2 className="font-serif text-xl italic md:text-2xl">
                Get the course free
              </h2>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                Day 1 lands in your inbox in 60 seconds.
              </p>
              <div className="mt-4">
                <CourseSignupForm
                  courseSlug={course.slug}
                  source={`course-${course.slug}`}
                />
              </div>
              <p className="mt-3 text-xs text-[var(--text-tertiary)]">
                One lesson per day. One-click unsubscribe. No spam.
              </p>
            </div>
          </aside>
        </section>

        <section className="mt-20">
          <h2 className="font-serif text-2xl italic md:text-3xl">
            Day-by-day schedule
          </h2>
          <ol className="mt-6 divide-y divide-[var(--border-subtle)] overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)]">
            {course.lessons.map((lesson) => (
              <li
                key={lesson.day}
                className="flex items-start gap-4 p-5 md:gap-6 md:p-6"
              >
                <span className="font-mono text-xs uppercase tracking-[0.14em] text-[var(--accent-cyan)] md:text-sm">
                  Day {lesson.day}
                </span>
                <div className="flex-1">
                  <h3 className="font-serif text-lg italic md:text-xl">
                    {lesson.subject}
                  </h3>
                  <p className="mt-1 text-xs text-[var(--text-tertiary)] md:text-sm">
                    Action: {lesson.cta}
                  </p>
                  <p className="mt-2">
                    <Link
                      href={`/courses/${course.slug}/lesson/${lesson.day}`}
                      className="font-mono text-xs uppercase tracking-[0.14em] text-[var(--text-tertiary)] underline decoration-dotted underline-offset-4 hover:text-[var(--accent-cyan)] md:text-sm"
                    >
                      Read this lesson on the web →
                    </Link>
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-20">
          <h2 className="font-serif text-2xl italic md:text-3xl">
            Frequently asked questions
          </h2>
          <dl className="mt-6 divide-y divide-[var(--border-subtle)] rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)]">
            {faqs.map((f) => (
              <div key={f.q} className="p-5 md:p-6">
                <dt className="font-serif text-lg italic md:text-xl">{f.q}</dt>
                <dd className="mt-2 text-sm text-[var(--text-secondary)] md:text-base">
                  {f.a}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="mt-20 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-8 md:p-12">
          <h2 className="font-serif text-2xl italic md:text-3xl">
            Not into emails? Skip the course.
          </h2>
          <p className="mt-3 max-w-2xl text-sm text-[var(--text-secondary)] md:text-base">
            You can read every lesson on this site — no email required. Or skip
            ahead and try Social Perks free for 14 days. It runs the playbook in
            this course on autopilot.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={`/courses/${course.slug}/lesson/1`}
              className="rounded-full border border-[var(--border-subtle)] px-5 py-2 font-mono text-sm uppercase tracking-[0.14em] text-[var(--text-primary)] transition hover:border-[var(--accent-cyan)] hover:text-[var(--accent-cyan)]"
            >
              Read Day 1 →
            </Link>
            <Link
              href="/"
              className="rounded-full bg-[var(--accent-cyan)] px-5 py-2 font-mono text-sm uppercase tracking-[0.14em] text-[var(--bg-base)] transition hover:opacity-90"
            >
              Try Social Perks free
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
