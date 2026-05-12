"use client";

import { useState, useEffect, useRef, useCallback } from "react";

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
    case "submission.approved":
      return {
        id,
        type: eventType,
        message: `Your submission was approved! +$${(data.perkValue as number) ?? (data.value as number) ?? 0}`,
        value: (data.perkValue as number) ?? (data.value as number) ?? undefined,
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
const INITIAL_RETRY_MS = 1000;
const MAX_RETRY_MS = 30000;

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useNotificationsSSE(token: string | null): UseNotificationsSSEReturn {
  const [notifications, setNotifications] = useState<SSENotification[]>([]);
  const [connected, setConnected] = useState(false);
  const sourceRef = useRef<EventSource | null>(null);
  const retryRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  useEffect(() => {
    if (!token || typeof window === "undefined") return;

    function connect() {
      const params = new URLSearchParams({ token: token! });
      const source = new EventSource(`/api/v1/events?${params.toString()}`);
      sourceRef.current = source;

      source.addEventListener("connected", () => {
        setConnected(true);
        retryRef.current = 0;
      });

      // The SSE endpoint sends named events via `event: <type>`
      // We listen for the specific event types we care about
      const eventTypes = [
        "submission.created",
        "submission.approved",
        "submission.rejected",
        "campaign.created",
        "user.created",
      ];

      for (const type of eventTypes) {
        source.addEventListener(type, (e: MessageEvent) => {
          try {
            const data = JSON.parse(e.data) as Record<string, unknown>;
            const notification = eventToNotification(type, data);
            if (notification) {
              setNotifications((prev) =>
                [notification, ...prev].slice(0, MAX_NOTIFICATIONS)
              );
            }
          } catch {
            // Ignore malformed events
          }
        });
      }

      source.onerror = () => {
        setConnected(false);
        source.close();
        sourceRef.current = null;
        // EventSource swallows the HTTP status — cap retries at 5 so a bad
        // token doesn't put us in a hot loop hitting /api/v1/events.
        if (retryRef.current >= 5) return;
        // Exponential backoff: 1s, 2s, 4s, 8s... max 30s
        const delay = Math.min(
          INITIAL_RETRY_MS * Math.pow(2, retryRef.current),
          MAX_RETRY_MS
        );
        retryRef.current++;
        retryTimerRef.current = setTimeout(connect, delay);
      };
    }

    connect();

    return () => {
      sourceRef.current?.close();
      sourceRef.current = null;
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      setConnected(false);
    };
  }, [token]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return { notifications, unreadCount, markAsRead, markAllAsRead, connected };
}
