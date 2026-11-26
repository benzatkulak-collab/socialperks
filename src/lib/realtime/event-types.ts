/**
 * The events the server publishes to /api/v1/events: every
 * eventPublisher.publish call under src/app/api/v1. useRealtime listens for
 * all of them, so a "*" subscriber hears each one. The stream names every
 * event (`event: submission.created`), and an EventSource passes a named
 * event only to a listener for that name.
 *
 * event-types.test.ts fails when a publisher sends a type missing here.
 */
export const REALTIME_EVENT_TYPES = [
  "user.created",
  "submission.created",
  "submission.approved",
  "submission.rejected",
  "campaign.created",
  "campaign.updated",
  "campaign.paused",
  "campaign.resumed",
  "campaign.ended",
] as const;

export type RealtimeEventType = (typeof REALTIME_EVENT_TYPES)[number];
