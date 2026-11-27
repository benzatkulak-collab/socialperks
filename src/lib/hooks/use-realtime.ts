"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { openEventStream } from "@/lib/realtime/event-stream";
import { REALTIME_EVENT_TYPES } from "@/lib/realtime/event-types";

export interface RealtimeEvent {
  type: string;
  payload: Record<string, unknown>;
  /** When this browser received it. */
  timestamp: string;
}

interface UseRealtimeOptions {
  /**
   * The business whose events to receive. The stream signs in with the
   * access cookie, and a business receives its own events whatever it names;
   * only the founder may choose.
   */
  businessId?: string;
  enabled?: boolean;
}

/**
 * The signed-in account's realtime events (GET /api/v1/events). See
 * src/lib/realtime/event-stream.ts for how it connects, renews the cookie and
 * reconnects. `subscribe(type, handler)` hears one event type; "*" hears
 * every type in REALTIME_EVENT_TYPES.
 */
export function useRealtime(options: UseRealtimeOptions = {}) {
  const { businessId, enabled = true } = options;
  const [connected, setConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<RealtimeEvent | null>(null);
  const handlersRef = useRef<Map<string, Set<(event: RealtimeEvent) => void>>>(new Map());

  const subscribe = useCallback((type: string, handler: (event: RealtimeEvent) => void) => {
    const handlers = handlersRef.current;
    if (!handlers.has(type)) handlers.set(type, new Set());
    handlers.get(type)!.add(handler);
    return () => { handlers.get(type)?.delete(handler); };
  }, []);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    const stream = openEventStream({
      businessId,
      eventTypes: REALTIME_EVENT_TYPES,
      onConnectedChange: setConnected,
      onEvent: (type, data) => {
        const event: RealtimeEvent = {
          type,
          payload: data && typeof data === "object" ? (data as Record<string, unknown>) : {},
          timestamp: new Date().toISOString(),
        };
        setLastEvent(event);
        // Notify subscribers
        const handlers = handlersRef.current;
        handlers.get(type)?.forEach((h) => h(event));
        handlers.get("*")?.forEach((h) => h(event));
      },
    });

    return () => {
      stream.close();
      setConnected(false);
    };
  }, [enabled, businessId]);

  return { connected, lastEvent, subscribe };
}
