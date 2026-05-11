import type { Course } from "./types";
import { REVIEWS_COURSE } from "./course-reviews";
import { INSTAGRAM_COURSE } from "./course-instagram";
import { LOYALTY_COURSE } from "./course-loyalty";
import { INFLUENCER_COURSE } from "./course-influencer";
import { TIKTOK_COURSE } from "./course-tiktok";

export const COURSES: Course[] = [
  REVIEWS_COURSE,
  INSTAGRAM_COURSE,
  LOYALTY_COURSE,
  INFLUENCER_COURSE,
  TIKTOK_COURSE,
];

export function getCourse(slug: string): Course | undefined {
  return COURSES.find((c) => c.slug === slug);
}

export function getCourseLesson(
  slug: string,
  day: number,
): { course: Course; lesson: Course["lessons"][number] } | undefined {
  const course = getCourse(slug);
  if (!course) return undefined;
  const lesson = course.lessons.find((l) => l.day === day);
  if (!lesson) return undefined;
  return { course, lesson };
}

export type { Course, Lesson } from "./types";
