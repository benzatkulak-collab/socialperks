/**
 * Event Publisher — lightweight pub/sub singleton for wiring API routes
 * to the SSE endpoint and WebSocket clients.
 *
 * API routes call `eventPublisher.publish(type, data, businessId?)`.
 * The SSE endpoint subscribes and forwards events to connected streams.
 * Socket.io clients also receive events via broadcastEvent/broadcastToAll.
 */

// Lazy import to avoid build failure when socket.io is not installed
let _broadcastToAll: ((event: string, data: unknown) => void) | null = null;
let _broadcastEvent: ((room: string, event: string, data: unknown) => void) | null = null;
try {
  // eslint-disable-next-line no-eval
  const socketServer = eval('require')('./socket-server');
  _broadcastToAll = socketServer.broadcastToAll;
  _broadcastEvent = socketServer.broadcastEvent;
} catch {
  // socket-server module unavailable — no WebSocket broadcasting
}

export interface PublishedEvent {
  type: string;
  data: unknown;
  businessId?: string;
}

type EventCallback = (event: PublishedEvent) => void;

class EventPublisher {
  private listeners = new Set<EventCallback>();

  /**
   * Subscribe to all published events.
   * Returns an unsubscribe function.
   */
  subscribe(callback: EventCallback): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Publish an event to all current listeners (SSE) and WebSocket clients.
   */
  publish(type: string, data: unknown, businessId?: string): void {
    const event: PublishedEvent = { type, data, businessId };

    // Notify in-process SSE listeners
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // Never let a broken listener crash the publisher
      }
    }

    // Also broadcast to WebSocket clients via Socket.io
    try {
      if (businessId && _broadcastEvent) {
        _broadcastEvent(`business:${businessId}`, type, event);
      }
      if (_broadcastToAll) {
        _broadcastToAll('event', event);
      }
    } catch {
      // Socket.io may not be initialized — that's fine
    }
  }

  /** Current number of active SSE listeners. Useful for testing/monitoring. */
  get listenerCount(): number {
    return this.listeners.size;
  }
}

export const eventPublisher = new EventPublisher();
