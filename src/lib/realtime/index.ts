// ==============================================================================
// Social Perks -- Real-time Event Bus
//
// In-memory pub/sub for real-time updates. Supports targeted events
// (specific user), business events, and broadcast events.
// Production: back with Redis Pub/Sub or SSE streams.
// ==============================================================================

// -- Types --------------------------------------------------------------------

export interface RealtimeEvent {
  type: string;
  payload: Record<string, unknown>;
  /** Target a specific user; if null, it is a broadcast. */
  targetUserId?: string | null;
  /** Target all users of a specific business. */
  targetBusinessId?: string | null;
  timestamp: string;
}

export type EventHandler = (event: RealtimeEvent) => void;

interface Subscription {
  id: string;
  eventType: string;
  handler: EventHandler;
  /** If set, only receive events for this user. */
  userId?: string;
  /** If set, only receive events for this business. */
  businessId?: string;
}

// -- Event Bus ----------------------------------------------------------------

export class EventBus {
  private subscriptions: Subscription[] = [];
  private nextId = 1;

  subscribe(
    eventType: string,
    handler: EventHandler,
    options?: { userId?: string; businessId?: string }
  ): string {
    const id = `sub_${this.nextId++}`;
    this.subscriptions.push({
      id,
      eventType,
      handler,
      userId: options?.userId,
      businessId: options?.businessId,
    });
    return id;
  }

  unsubscribe(subscriptionId: string): boolean {
    const before = this.subscriptions.length;
    this.subscriptions = this.subscriptions.filter((s) => s.id !== subscriptionId);
    return this.subscriptions.length < before;
  }

  publish(event: RealtimeEvent): void {
    for (const sub of this.subscriptions) {
      // Event type must match
      if (sub.eventType !== "*" && sub.eventType !== event.type) continue;

      // If subscription is for a specific user, only deliver if event targets them
      if (sub.userId && event.targetUserId && sub.userId !== event.targetUserId) continue;

      // If subscription is for a specific business, only deliver if event targets that business
      if (sub.businessId && event.targetBusinessId && sub.businessId !== event.targetBusinessId) continue;

      sub.handler(event);
    }
  }

  /** Remove all subscriptions. Useful for testing. */
  clear(): void {
    this.subscriptions = [];
    this.nextId = 1;
  }

  /** Current number of active subscriptions. */
  get size(): number {
    return this.subscriptions.length;
  }
}

// -- Default Instance ---------------------------------------------------------

export const eventBus = new EventBus();

// -- SSE Connection Manager ---------------------------------------------------

interface SSEConnection {
  userId: string;
  controller: ReadableStreamDefaultController;
  businessId?: string;
  connectedAt: number;
}

export class SSEManager {
  private connections = new Map<string, SSEConnection>();
  private encoder = new TextEncoder();
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  addConnection(
    userId: string,
    controller: ReadableStreamDefaultController,
    businessId?: string
  ): void {
    // Close existing connection for this user
    this.removeConnection(userId);

    this.connections.set(userId, {
      userId,
      controller,
      businessId,
      connectedAt: Date.now(),
    });

    // Start heartbeat if this is the first connection
    if (this.connections.size === 1 && !this.heartbeatInterval) {
      this.heartbeatInterval = setInterval(() => this.sendHeartbeat(), 30_000);
    }
  }

  removeConnection(userId: string): void {
    const conn = this.connections.get(userId);
    if (conn) {
      try { conn.controller.close(); } catch { /* already closed */ }
      this.connections.delete(userId);
    }

    // Stop heartbeat if no connections
    if (this.connections.size === 0 && this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  sendToUser(userId: string, event: RealtimeEvent): boolean {
    const conn = this.connections.get(userId);
    if (!conn) return false;
    return this.sendEvent(conn, event);
  }

  sendToBusiness(businessId: string, event: RealtimeEvent): number {
    let sent = 0;
    for (const conn of this.connections.values()) {
      if (conn.businessId === businessId) {
        if (this.sendEvent(conn, event)) sent++;
      }
    }
    return sent;
  }

  broadcast(event: RealtimeEvent): number {
    let sent = 0;
    for (const conn of this.connections.values()) {
      if (this.sendEvent(conn, event)) sent++;
    }
    return sent;
  }

  private sendEvent(conn: SSEConnection, event: RealtimeEvent): boolean {
    try {
      const data = JSON.stringify(event);
      conn.controller.enqueue(
        this.encoder.encode(`event: ${event.type}\ndata: ${data}\n\n`)
      );
      return true;
    } catch {
      // Connection broken — remove it
      this.connections.delete(conn.userId);
      return false;
    }
  }

  private sendHeartbeat(): void {
    const heartbeat = this.encoder.encode(": heartbeat\n\n");
    for (const [userId, conn] of this.connections) {
      try {
        conn.controller.enqueue(heartbeat);
      } catch {
        this.connections.delete(userId);
      }
    }
  }

  get connectionCount(): number {
    return this.connections.size;
  }

  getConnectedUserIds(): string[] {
    return Array.from(this.connections.keys());
  }
}

export const sseManager = new SSEManager();
