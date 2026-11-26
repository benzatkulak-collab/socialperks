/**
 * useRealtime hears only the event types REALTIME_EVENT_TYPES lists (an
 * EventSource passes a named event only to a listener for that name), so a
 * type a route publishes but the list leaves out never reaches a "*"
 * subscriber. This reads every route file that publishes and checks each
 * event name written in it against the list.
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { expect, it } from "vitest";
import { REALTIME_EVENT_TYPES } from "../event-types";

const API = path.join(process.cwd(), "src", "app", "api");

function routeFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === "__tests__" ? [] : routeFiles(full);
    return /\.ts$/.test(entry.name) ? [full] : [];
  });
}

/** Event names as the routes write them: "submission.created", "campaign.paused", … */
const EVENT_NAME = /["'`]((?:user|submission|campaign)\.[a-z_]+)["'`]/g;

it("lists every event type a route publishes", () => {
  const publishing = routeFiles(API).filter((file) => readFileSync(file, "utf8").includes("eventPublisher.publish("));
  expect(publishing.length).toBeGreaterThanOrEqual(4);

  const published = new Set<string>();
  for (const file of publishing) {
    for (const match of readFileSync(file, "utf8").matchAll(EVENT_NAME)) published.add(match[1]);
  }

  expect(published.size).toBeGreaterThan(0);
  const missing = [...published].filter((type) => !(REALTIME_EVENT_TYPES as readonly string[]).includes(type));
  expect(missing).toEqual([]);
});
