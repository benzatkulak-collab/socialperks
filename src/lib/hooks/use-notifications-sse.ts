"use client";

import { useState, useEffect, useCallback } from "react";
import { openEventStream } from "@/lib/realtime/event-stream";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface SSENotification {
  id: string;
  type: string;
  message: string;
  value?: number;
  campaignName?: string;
  timestamp: string;
  read: boolean;
}

interface UseNotificationsSSEReturn {
  notifications: SSENotification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  connected: boolean;
}

// ─── Event-to-notification mapping ──────────────────────────────────────────

function eventToNotification(eventType: string, data: Record<string, unknown>): SSENotification | null {
  const id = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  const timestamp = new Date().toISOString();

  switch (eventType) {
    case "submission.created":
      return {
        id,
        type: eventType,
        message: `New submission for ${(data.campaignName as string) || "a campaign"}`,
        campaignName: (data.campaignName as string) || undefined,
        timestamp,
        read: false,
      };
    // Only a business (and the founder) receives events since #250, so the
    // bell speaks to the business: an approval is its own decision on a
    // customer's submission, and the event carries no perk amount.
    case "submission.approved":
      return {
        id,
        type: eventType,
        message: `Submission approved for ${(data.campaignName as string) || "a campaign"}`,
        campaignName: (data.campaignName as string) || undefined,
        timestamp,
        read: false,
      };
    case "submission.rejected":
      return {
        id,
        type: eventType,
        message: `Submission for ${(data.campaignName as string) || "a campaign"} was not approved`,
        campaignName: (data.campaignName as string) || undefined,
        timestamp,
        read: false,
      };
    case "campaign.created":
      return {
        id,
        type: eventType,
        message: `Campaign ${(data.name as string) || (data.campaignName as string) || ""} is now live`,
        campaignName: (data.name as string) || (data.campaignName as string) || undefined,
        timestamp,
        read: false,
      };
    case "user.created":
      return {
        id,
        type: eventType,
        message: "Welcome to Social Perks!",
        timestamp,
        read: false,
      };
    default:
      return null;
  }
}

// ─── Constants ──────────────────────────────────────────────────────────────

const MAX_NOTIFICATIONS = 20;

/** The events the bell turns into notifications. */
const NOTIFICATION_EVENT_TYPES = [
  "submission.created",
  "submission.approved",
  "submission.rejected",
  "campaign.created",
  "user.created",
] as const;

// ─── Hook ───────────────────────────────────────────────────────────────────

interface UseNotificationsSSEOptions {
  /**
   * The business whose events to show. Name the same business as the page's
   * useRealtime, so the two share one connection; a business receives its own
   * events whatever it names.
   */
  businessId?: string;
  enabled?: boolean;
}

/**
 * The signed-in account's notifications, from GET /api/v1/events. It signs
 * in with the HttpOnly access cookie, which the browser sends by itself;
 * src/lib/realtime/event-stream.ts says how it connects, renews the cookie
 * and reconnects. It used to take a token the portals read from
 * `document.cookie`, which never holds an HttpOnly cookie, so it never
 * connected.
 */
export function useNotificationsSSE(options: UseNotificationsSSEOptions = {}): UseNotificationsSSEReturn {
  const { businessId, enabled = true } = options;
  const [notifications, setNotifications] = useState<SSENotification[]>([]);
  const [connected, setConnected] = useState(false);

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    const stream = openEventStream({
      businessId,
      eventTypes: NOTIFICATION_EVENT_TYPES,
      onConnectedChange: setConnected,
      onEvent: (type, data) => {
        const notification = eventToNotification(
          type,
          data && typeof data === "object" ? (data as Record<string, unknown>) : {}
        );
        if (notification) {
          setNotifications((prev) => [notification, ...prev].slice(0, MAX_NOTIFICATIONS));
        }
      },
    });

    return () => {
      stream.close();
      setConnected(false);
    };
  }, [enabled, businessId]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return { notifications, unreadCount, markAsRead, markAllAsRead, connected };
}
