// ══════════════════════════════════════════════════════════════════════════════
// Social Perks — Event Sourcing Foundation
//
// Every significant action is recorded as an immutable event.
// In-memory store now, ready for EventStoreDB / Postgres migration.
// Events are the single source of truth — all state is derived from them.
// ══════════════════════════════════════════════════════════════════════════════

// ─── Event Types ────────────────────────────────────────────────────────────

export type EventType =
  | "campaign.created"
  | "campaign.launched"
  | "campaign.paused"
  | "campaign.resumed"
  | "campaign.ended"
  | "campaign.expired"
  | "submission.created"
  | "submission.approved"
  | "submission.rejected"
  | "submission.expired"
  | "perk.awarded"
  | "perk.redeemed"
  | "perk.expired"
  | "user.signup"
  | "user.login"
  | "user.logout"
  | "influencer.applied"
  | "influencer.accepted"
  | "influencer.rejected"
  | "agent.query"
  | "agent.campaign_execute";

export type EventEntityType =
  | "campaign"
  | "submission"
  | "perk"
  | "user"
  | "influencer"
  | "agent";

export type EventActorType =
  | "business"
  | "customer"
  | "influencer"
  | "agent"
  | "system";

// ─── Core Event Interface ───────────────────────────────────────────────────

export interface PlatformEvent {
  readonly id: string;
  readonly type: EventType;
  readonly entityId: string;
  readonly entityType: EventEntityType;
  readonly actorId: string;
  readonly actorType: EventActorType;
  readonly data: Record<string, unknown>;
  readonly timestamp: string;
  /** Schema version for forward-compatible deserialization. */
  readonly version: number;
}

// ─── Query Filters ──────────────────────────────────────────────────────────

export interface EventQueryFilters {
  type?: EventType;
  entityId?: string;
  entityType?: EventEntityType;
  actorId?: string;
  actorType?: EventActorType;
  after?: string;
  before?: string;
  limit?: number;
}

// ─── Subscription Callback ──────────────────────────────────────────────────

export type EventCallback = (event: PlatformEvent) => void;

interface Subscription {
  id: string;
  type: EventType | "*";
  callback: EventCallback;
}

// ─── ID Generation ──────────────────────────────────────────────────────────

let eventCounter = 0;

function generateEventId(): string {
  eventCounter += 1;
  return `evt_${crypto.randomUUID()}_${eventCounter}`;
}

// ─── Event Store ────────────────────────────────────────────────────────────

/** Current event schema version. Bump when the PlatformEvent shape changes. */
const CURRENT_VERSION = 1;

class EventStore {
  private events: PlatformEvent[] = [];
  private subscriptions: Subscription[] = [];
  private subscriptionCounter = 0;
  private readonly maxEvents = 100_000;

  // ── Emit ────────────────────────────────────────────────────────────────

  /**
   * Create and store an immutable event. Returns the created event.
   * Synchronously notifies all matching subscribers.
   */
  emit(
    type: EventType,
    entityId: string,
    entityType: EventEntityType,
    actorId: string,
    actorType: EventActorType,
    data: Record<string, unknown> = {}
  ): PlatformEvent {
    const event: PlatformEvent = {
      id: generateEventId(),
      type,
      entityId,
      entityType,
      actorId,
      actorType,
      data,
      timestamp: new Date().toISOString(),
      version: CURRENT_VERSION,
    };

    this.events.push(event);

    if (this.events.length > this.maxEvents) {
      const keepCount = Math.floor(this.maxEvents * 0.8);
      const discardCount = this.events.length - keepCount;
      console.warn(
        `[EventStore] Capacity reached (${this.maxEvents}). Discarding ${discardCount} oldest events. ` +
        `Consider archiving events or increasing capacity.`
      );
      this.events = this.events.slice(-keepCount);
    }

    this.notifySubscribers(event);
    return event;
  }

  // ── Query ───────────────────────────────────────────────────────────────

  /**
   * Filter events by any combination of criteria.
   * Returns events in chronological order (oldest first).
   */
  query(filters: EventQueryFilters): PlatformEvent[] {
    let results = this.events;

    if (filters.type !== undefined) {
      results = results.filter((e) => e.type === filters.type);
    }
    if (filters.entityId !== undefined) {
      results = results.filter((e) => e.entityId === filters.entityId);
    }
    if (filters.entityType !== undefined) {
      results = results.filter((e) => e.entityType === filters.entityType);
    }
    if (filters.actorId !== undefined) {
      results = results.filter((e) => e.actorId === filters.actorId);
    }
    if (filters.actorType !== undefined) {
      results = results.filter((e) => e.actorType === filters.actorType);
    }
    if (filters.after !== undefined) {
      const afterMs = new Date(filters.after).getTime();
      if (!isNaN(afterMs)) {
        results = results.filter(
          (e) => new Date(e.timestamp).getTime() >= afterMs
        );
      }
    }
    if (filters.before !== undefined) {
      const beforeMs = new Date(filters.before).getTime();
      if (!isNaN(beforeMs)) {
        results = results.filter(
          (e) => new Date(e.timestamp).getTime() < beforeMs
        );
      }
    }
    if (filters.limit !== undefined && filters.limit > 0) {
      results = results.slice(-filters.limit);
    }

    return results;
  }

  // ── Entity History ──────────────────────────────────────────────────────

  /**
   * Return every event for a given entity, ordered chronologically.
   * Useful for reconstructing entity state via replay.
   */
  getEntityHistory(entityId: string): PlatformEvent[] {
    return this.events.filter((e) => e.entityId === entityId);
  }

  // ── Count ───────────────────────────────────────────────────────────────

  /**
   * Count events matching optional type and/or since-timestamp filters.
   */
  getEventCount(type?: EventType, since?: string): number {
    let results: PlatformEvent[] = this.events;

    if (type !== undefined) {
      results = results.filter((e) => e.type === type);
    }
    if (since !== undefined) {
      const sinceMs = new Date(since).getTime();
      if (!isNaN(sinceMs)) {
        results = results.filter(
          (e) => new Date(e.timestamp).getTime() >= sinceMs
        );
      }
    }

    return results.length;
  }

  // ── Subscribe ───────────────────────────────────────────────────────────

  /**
   * Register a synchronous listener for a specific event type (or "*" for all).
   * Returns an unsubscribe function.
   *
   * Synchronous for now — when WebSocket support lands, subscribers will be
   * called asynchronously without changing the public API.
   */
  subscribe(
    type: EventType | "*",
    callback: EventCallback
  ): () => void {
    this.subscriptionCounter += 1;
    const id = `sub_${this.subscriptionCounter}`;
    const sub: Subscription = { id, type, callback };
    this.subscriptions.push(sub);

    return () => {
      this.subscriptions = this.subscriptions.filter((s) => s.id !== id);
    };
  }

  // ── Replay ──────────────────────────────────────────────────────────────

  /**
   * Replay all events for an entity in order.
   * Pass a reducer to fold events into state, or omit to get the raw list.
   */
  replay<T>(
    entityId: string,
    reducer?: (state: T, event: PlatformEvent) => T,
    initialState?: T
  ): T | PlatformEvent[] {
    const history = this.getEntityHistory(entityId);

    if (reducer !== undefined && initialState !== undefined) {
      return history.reduce(reducer, initialState);
    }

    return history;
  }

  // ── Internals ───────────────────────────────────────────────────────────

  private notifySubscribers(event: PlatformEvent): void {
    for (const sub of this.subscriptions) {
      if (sub.type === "*" || sub.type === event.type) {
        try {
          sub.callback(event);
        } catch {
          // Subscriber errors must not break the event pipeline.
          // In production, log to error tracking (Sentry, etc.).
        }
      }
    }
  }

  // ── Diagnostics ─────────────────────────────────────────────────────────

  /** Total number of stored events. Useful for monitoring / health checks. */
  get size(): number {
    return this.events.length;
  }

  /** Return all events (read-only snapshot). For debugging only. */
  snapshot(): readonly PlatformEvent[] {
    return [...this.events];
  }

  /** Clear all events. For testing only — never call in production. */
  _reset(): void {
    this.events = [];
    this.subscriptions = [];
  }
}

// ─── Singleton ──────────────────────────────────────────────────────────────

export const eventStore = new EventStore();

// ─── Helper Emitters ────────────────────────────────────────────────────────

/**
 * Shorthand for emitting campaign-related events.
 * actorType defaults to "business" since campaigns are business-owned.
 */
export function emitCampaignEvent(
  type: Extract<
    EventType,
    | "campaign.created"
    | "campaign.launched"
    | "campaign.paused"
    | "campaign.resumed"
    | "campaign.ended"
    | "campaign.expired"
  >,
  campaignId: string,
  actorId: string,
  data: Record<string, unknown> = {},
  actorType: EventActorType = "business"
): PlatformEvent {
  return eventStore.emit(type, campaignId, "campaign", actorId, actorType, data);
}

/**
 * Shorthand for emitting submission-related events.
 * actorType defaults to "customer" since submissions come from users.
 */
export function emitSubmissionEvent(
  type: Extract<
    EventType,
    | "submission.created"
    | "submission.approved"
    | "submission.rejected"
    | "submission.expired"
  >,
  submissionId: string,
  actorId: string,
  data: Record<string, unknown> = {},
  actorType: EventActorType = "customer"
): PlatformEvent {
  return eventStore.emit(
    type,
    submissionId,
    "submission",
    actorId,
    actorType,
    data
  );
}

/**
 * Shorthand for emitting perk-related events.
 */
export function emitPerkEvent(
  type: Extract<EventType, "perk.awarded" | "perk.redeemed" | "perk.expired">,
  perkId: string,
  actorId: string,
  data: Record<string, unknown> = {},
  actorType: EventActorType = "system"
): PlatformEvent {
  return eventStore.emit(type, perkId, "perk", actorId, actorType, data);
}

/**
 * Shorthand for emitting user lifecycle events.
 */
export function emitUserEvent(
  type: Extract<EventType, "user.signup" | "user.login" | "user.logout">,
  userId: string,
  data: Record<string, unknown> = {}
): PlatformEvent {
  return eventStore.emit(type, userId, "user", userId, "customer", data);
}

/**
 * Shorthand for emitting influencer-related events.
 */
export function emitInfluencerEvent(
  type: Extract<
    EventType,
    "influencer.applied" | "influencer.accepted" | "influencer.rejected"
  >,
  influencerId: string,
  actorId: string,
  data: Record<string, unknown> = {},
  actorType: EventActorType = "influencer"
): PlatformEvent {
  return eventStore.emit(
    type,
    influencerId,
    "influencer",
    actorId,
    actorType,
    data
  );
}

/**
 * Shorthand for emitting agent-related events.
 */
export function emitAgentEvent(
  type: Extract<EventType, "agent.query" | "agent.campaign_execute">,
  agentId: string,
  data: Record<string, unknown> = {}
): PlatformEvent {
  return eventStore.emit(type, agentId, "agent", agentId, "agent", data);
}
