import { COURSES, getCourseLesson } from "./data";
import type { Course, Lesson } from "./types";

export interface DripSubscriber {
  email: string;
  courseSlug: string;
  subscribedAt: string;
  currentDay: number;
  lastSentAt?: string;
  unsubscribedAt?: string;
}

const subscribers = new Map<string, DripSubscriber>();

function key(email: string, courseSlug: string): string {
  return `${email.toLowerCase()}::${courseSlug}`;
}

export function enrollInCourse(
  email: string,
  courseSlug: string,
): DripSubscriber {
  const course = COURSES.find((c) => c.slug === courseSlug);
  if (!course) {
    throw new Error(`Unknown course slug: ${courseSlug}`);
  }
  const k = key(email, courseSlug);
  const existing = subscribers.get(k);
  if (existing && !existing.unsubscribedAt) {
    return existing;
  }
  const subscriber: DripSubscriber = {
    email: email.toLowerCase(),
    courseSlug,
    subscribedAt: new Date().toISOString(),
    currentDay: 0,
  };
  subscribers.set(k, subscriber);
  return subscriber;
}

export function unsubscribe(email: string, courseSlug: string): void {
  const k = key(email, courseSlug);
  const sub = subscribers.get(k);
  if (!sub) return;
  sub.unsubscribedAt = new Date().toISOString();
  subscribers.set(k, sub);
}

export function getSubscriber(
  email: string,
  courseSlug: string,
): DripSubscriber | undefined {
  return subscribers.get(key(email, courseSlug));
}

export function listSubscribers(courseSlug?: string): DripSubscriber[] {
  const all = Array.from(subscribers.values());
  return courseSlug ? all.filter((s) => s.courseSlug === courseSlug) : all;
}

/**
 * A subscriber is "due" for a lesson when:
 * - they are not unsubscribed
 * - they have not completed all lessons in the course
 * - at least 24 hours have elapsed since the last lesson was sent (or since subscription, for day 1)
 */
export function getDueLessons(now: Date = new Date()): {
  subscriber: DripSubscriber;
  course: Course;
  lesson: Lesson;
}[] {
  const due: { subscriber: DripSubscriber; course: Course; lesson: Lesson }[] = [];
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;

  for (const subscriber of subscribers.values()) {
    if (subscriber.unsubscribedAt) continue;

    const course = COURSES.find((c) => c.slug === subscriber.courseSlug);
    if (!course) continue;

    const nextDay = subscriber.currentDay + 1;
    if (nextDay > course.lessons.length) continue;

    const referenceTime = subscriber.lastSentAt
      ? new Date(subscriber.lastSentAt).getTime()
      : new Date(subscriber.subscribedAt).getTime();

    // Day 1 sends immediately; subsequent lessons wait at least 24 hours.
    const requiredGap = subscriber.currentDay === 0 ? 0 : ONE_DAY_MS;
    if (now.getTime() - referenceTime < requiredGap) continue;

    const lesson = course.lessons.find((l) => l.day === nextDay);
    if (!lesson) continue;

    due.push({ subscriber, course, lesson });
  }

  return due;
}

export function markLessonSent(
  email: string,
  courseSlug: string,
  day: number,
  now: Date = new Date(),
): void {
  const k = key(email, courseSlug);
  const sub = subscribers.get(k);
  if (!sub) return;
  if (day !== sub.currentDay + 1) {
    // Out-of-order send; ignore to keep state consistent.
    return;
  }
  sub.currentDay = day;
  sub.lastSentAt = now.toISOString();
  subscribers.set(k, sub);
}

/** Test-only / dev helper: wipe in-memory subscriber state. */
export function _resetSubscribersForTests(): void {
  subscribers.clear();
}

/** Convenience: peek at the next lesson without sending. */
export function peekNextLesson(
  email: string,
  courseSlug: string,
): Lesson | undefined {
  const sub = getSubscriber(email, courseSlug);
  if (!sub) return undefined;
  const result = getCourseLesson(courseSlug, sub.currentDay + 1);
  return result?.lesson;
}
