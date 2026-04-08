/**
 * Event Publisher — lightweight pub/sub singleton for wiring API routes
 * to the SSE endpoint.
 *
 * API routes call `eventPublisher.publish(type, data, businessId?)`.
 * The SSE endpoint subscribes and forwards events to connected streams.
 */

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
   * Publish an event to all current listeners.
   */
  publish(type: string, data: unknown, businessId?: string): void {
    const event: PublishedEvent = { type, data, businessId };
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // Never let a broken listener crash the publisher
      }
    }
  }

  /** Current number of active listeners. Useful for testing/monitoring. */
  get listenerCount(): number {
    return this.listeners.size;
  }
}

export const eventPublisher = new EventPublisher();
