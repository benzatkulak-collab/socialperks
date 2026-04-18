"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export interface RealtimeEvent {
  type: string;
  payload: Record<string, unknown>;
  timestamp: string;
}

interface UseRealtimeOptions {
  businessId?: string;
  userId?: string;
  enabled?: boolean;
}

export function useRealtime(options: UseRealtimeOptions = {}) {
  const { businessId, userId, enabled = true } = options;
  const [connected, setConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<RealtimeEvent | null>(null);
  const sourceRef = useRef<EventSource | null>(null);
  const retryRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handlersRef = useRef<Map<string, Set<(event: RealtimeEvent) => void>>>(new Map());

  const subscribe = useCallback((type: string, handler: (event: RealtimeEvent) => void) => {
    const handlers = handlersRef.current;
    if (!handlers.has(type)) handlers.set(type, new Set());
    handlers.get(type)!.add(handler);
    return () => { handlers.get(type)?.delete(handler); };
  }, []);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    function connect() {
      const params = new URLSearchParams();
      // Pass identity context — the access token cookie is sent automatically via withCredentials
      if (businessId) {
        params.set("businessId", businessId);
      } else if (userId) {
        params.set("userId", userId);
      } else {
        return; // No identity, can't connect
      }

      const source = new EventSource(`/api/v1/events?${params.toString()}`);
      sourceRef.current = source;

      source.onopen = () => {
        setConnected(true);
        retryRef.current = 0;
      };

      source.onmessage = (e) => {
        try {
          const event: RealtimeEvent = JSON.parse(e.data);
          if (event.type === "heartbeat") return;
          setLastEvent(event);
          // Notify subscribers
          const handlers = handlersRef.current;
          const typeHandlers = handlers.get(event.type);
          if (typeHandlers) typeHandlers.forEach(h => h(event));
          const wildcardHandlers = handlers.get("*");
          if (wildcardHandlers) wildcardHandlers.forEach(h => h(event));
        } catch {
          // Ignore malformed events
        }
      };

      source.onerror = () => {
        setConnected(false);
        source.close();
        sourceRef.current = null;
        // Exponential backoff: 1s, 2s, 4s, 8s... max 30s
        const delay = Math.min(1000 * Math.pow(2, retryRef.current), 30000);
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
  }, [enabled, businessId, userId]);

  return { connected, lastEvent, subscribe };
}
