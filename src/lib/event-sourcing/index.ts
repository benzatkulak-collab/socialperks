// ══════════════════════════════════════════════════════════════════════════════
// Social Perks — Production-Grade Event Sourcing Infrastructure
//
// Full CQRS/ES implementation: Event Store, Snapshot Store, Aggregate base,
// Projection Manager, and Saga Orchestrator. In-memory backing stores,
// structured for migration to EventStoreDB / Postgres.
// ══════════════════════════════════════════════════════════════════════════════

// ─── ID Generation ───────────────────────────────────────────────────────────

let idCounter = 0;

function generateId(prefix: string): string {
  idCounter += 1;
  return `${prefix}_${crypto.randomUUID()}_${idCounter}`;
}

// ═════════════════════════════════════════════════════════════════════════════
// 1. Event Store
// ═════════════════════════════════════════════════════════════════════════════

// ─── Core Event Types ────────────────────────────────────────────────────────

export interface EventMetadata {
  userId?: string;
  correlationId?: string;
  causationId?: string;
  timestamp: string;
}

export interface DomainEvent {
  readonly id: string;
  readonly aggregateId: string;
  readonly aggregateType: string;
  readonly eventType: string;
  readonly version: number;
  readonly payload: Record<string, unknown>;
  readonly metadata: EventMetadata;
  readonly createdAt: string;
}

export interface EventStream {
  readonly aggregateId: string;
  readonly events: DomainEvent[];
  readonly version: number;
}

// ─── Concurrency Error ──────────────────────────────────────────────────────

export class ConcurrencyError extends Error {
  constructor(
    public readonly aggregateId: string,
    public readonly expectedVersion: number,
    public readonly actualVersion: number
  ) {
    super(
      `Concurrency conflict on aggregate "${aggregateId}": ` +
        `expected version ${expectedVersion}, but current version is ${actualVersion}`
    );
    this.name = "ConcurrencyError";
  }
}

// ─── Subscription Types ─────────────────────────────────────────────────────

export type EventSubscriptionCallback = (event: DomainEvent) => void;

interface EventSubscription {
  id: string;
  eventType: string | "*";
  callback: EventSubscriptionCallback;
}

// ─── Pagination ─────────────────────────────────────────────────────────────

export interface PaginatedStreams {
  streams: EventStream[];
  total: number;
  offset: number;
  limit: number;
}

// ─── Event Store Class ──────────────────────────────────────────────────────

export class EventStore {
  /** Map from aggregateId to ordered list of events */
  private streams: Map<string, DomainEvent[]> = new Map();
  /** Map from aggregateId to current version */
  private versions: Map<string, number> = new Map();
  /** Active subscriptions */
  private subscriptions: EventSubscription[] = [];
  private subscriptionCounter = 0;

  /** Maximum number of events per stream before warning. */
  private readonly maxEventsPerStream = 10_000;
  /** Maximum number of aggregate streams before warning. */
  private readonly maxStreams = 50_000;

  // ── Append ──────────────────────────────────────────────────────────────

  /**
   * Append one or more events to a stream with optimistic concurrency control.
   * @param aggregateId - The aggregate this event belongs to
   * @param events - Events to append (id, version, createdAt are set automatically)
   * @param expectedVersion - The version the caller believes the stream is at.
   *   Use 0 for a new stream. Use -1 to skip the concurrency check.
   * @throws ConcurrencyError if the expected version does not match
   */
  append(
    aggregateId: string,
    events: Array<{
      aggregateType: string;
      eventType: string;
      payload: Record<string, unknown>;
      metadata?: Partial<EventMetadata>;
    }>,
    expectedVersion: number
  ): DomainEvent[] {
    const currentVersion = this.versions.get(aggregateId) ?? 0;

    // Optimistic concurrency check (skip if expectedVersion is -1)
    if (expectedVersion !== -1 && currentVersion !== expectedVersion) {
      throw new ConcurrencyError(aggregateId, expectedVersion, currentVersion);
    }

    const now = new Date().toISOString();
    const stream = this.streams.get(aggregateId) ?? [];
    const appended: DomainEvent[] = [];

    let nextVersion = currentVersion;

    for (const input of events) {
      nextVersion += 1;
      const domainEvent: DomainEvent = {
        id: generateId("evt"),
        aggregateId,
        aggregateType: input.aggregateType,
        eventType: input.eventType,
        version: nextVersion,
        payload: input.payload,
        metadata: {
          userId: input.metadata?.userId,
          correlationId: input.metadata?.correlationId,
          causationId: input.metadata?.causationId,
          timestamp: input.metadata?.timestamp ?? now,
        },
        createdAt: now,
      };
      stream.push(domainEvent);
      appended.push(domainEvent);
    }

    this.streams.set(aggregateId, stream);
    this.versions.set(aggregateId, nextVersion);

    // Bounds checking: warn on unbounded stream growth
    if (stream.length > this.maxEventsPerStream) {
      console.warn(
        `[EventSourcing] Stream "${aggregateId}" has ${stream.length} events (limit: ${this.maxEventsPerStream}). ` +
        `Consider snapshotting more frequently to reduce replay cost.`
      );
    }
    if (this.streams.size > this.maxStreams) {
      console.warn(
        `[EventSourcing] Total stream count (${this.streams.size}) exceeds limit (${this.maxStreams}). ` +
        `Consider archiving old streams to prevent memory exhaustion.`
      );
    }

    // Notify subscribers
    for (const event of appended) {
      this.notifySubscribers(event);
    }

    return appended;
  }

  // ── Get Stream ──────────────────────────────────────────────────────────

  /**
   * Retrieve the full event stream for an aggregate.
   * Returns null if the aggregate does not exist.
   */
  getStream(aggregateId: string): EventStream | null {
    const events = this.streams.get(aggregateId);
    if (!events || events.length === 0) return null;
    const version = this.versions.get(aggregateId) ?? 0;
    return { aggregateId, events: [...events], version };
  }

  // ── Get Stream From Version ─────────────────────────────────────────────

  /**
   * Get events for an aggregate starting after a given version (catch-up).
   * Useful for loading events after a snapshot.
   */
  getStreamFromVersion(
    aggregateId: string,
    fromVersion: number
  ): EventStream | null {
    const events = this.streams.get(aggregateId);
    if (!events || events.length === 0) return null;
    const version = this.versions.get(aggregateId) ?? 0;
    const filtered = events.filter((e) => e.version > fromVersion);
    return { aggregateId, events: filtered, version };
  }

  // ── Get All Streams (paginated) ─────────────────────────────────────────

  /**
   * Paginated listing of all event streams.
   */
  getAllStreams(offset = 0, limit = 20): PaginatedStreams {
    const allAggregateIds = Array.from(this.streams.keys());
    const total = allAggregateIds.length;
    const pageIds = allAggregateIds.slice(offset, offset + limit);

    const streams: EventStream[] = pageIds.map((id) => ({
      aggregateId: id,
      events: [...(this.streams.get(id) ?? [])],
      version: this.versions.get(id) ?? 0,
    }));

    return { streams, total, offset, limit };
  }

  // ── Subscribe ───────────────────────────────────────────────────────────

  /**
   * Subscribe to new events. Pass a specific eventType or "*" for all.
   * Returns an unsubscribe function.
   */
  subscribe(
    eventType: string | "*",
    callback: EventSubscriptionCallback
  ): () => void {
    this.subscriptionCounter += 1;
    const id = `sub_${this.subscriptionCounter}`;
    const sub: EventSubscription = { id, eventType, callback };
    this.subscriptions.push(sub);

    return () => {
      this.subscriptions = this.subscriptions.filter((s) => s.id !== id);
    };
  }

  // ── Internals ───────────────────────────────────────────────────────────

  private notifySubscribers(event: DomainEvent): void {
    for (const sub of this.subscriptions) {
      if (sub.eventType === "*" || sub.eventType === event.eventType) {
        try {
          sub.callback(event);
        } catch (err) {
          console.error(
            `[EventSourcing] Subscriber "${sub.id}" (eventType: "${sub.eventType}") threw on event "${event.eventType}":`,
            err instanceof Error ? err.message : err
          );
          // Subscriber errors must never break the event pipeline.
        }
      }
    }
  }

  // ── Diagnostics ─────────────────────────────────────────────────────────

  /** Total number of aggregates tracked. */
  get aggregateCount(): number {
    return this.streams.size;
  }

  /** Total number of events across all streams. */
  get totalEventCount(): number {
    let count = 0;
    const allStreams = Array.from(this.streams.values());
    for (const events of allStreams) {
      count += events.length;
    }
    return count;
  }

  /** Collect all events across all streams, sorted by createdAt. */
  getAllEvents(): DomainEvent[] {
    const all: DomainEvent[] = [];
    const allStreams = Array.from(this.streams.values());
    for (const events of allStreams) {
      all.push(...events);
    }
    all.sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    return all;
  }

  /** Clear everything. For testing only. */
  _reset(): void {
    this.streams.clear();
    this.versions.clear();
    this.subscriptions = [];
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// 2. Snapshot Store
// ═════════════════════════════════════════════════════════════════════════════

export interface Snapshot<T = Record<string, unknown>> {
  readonly aggregateId: string;
  readonly aggregateType: string;
  readonly version: number;
  readonly state: T;
  readonly createdAt: string;
}

export class SnapshotStore {
  /** Map from aggregateId to the latest snapshot */
  private snapshots: Map<string, Snapshot> = new Map();

  /**
   * How often to take a snapshot (in number of events).
   * E.g., 100 means snapshot every 100 events.
   */
  public readonly frequency: number;

  constructor(frequency = 100) {
    this.frequency = frequency;
  }

  // ── Save ────────────────────────────────────────────────────────────────

  /**
   * Save a snapshot of an aggregate's state at a specific version.
   */
  save<T = Record<string, unknown>>(
    aggregateId: string,
    aggregateType: string,
    version: number,
    state: T
  ): Snapshot<T> {
    const snapshot: Snapshot<T> = {
      aggregateId,
      aggregateType,
      version,
      state,
      createdAt: new Date().toISOString(),
    };
    // Store as the generic Snapshot type
    this.snapshots.set(aggregateId, snapshot as Snapshot);
    return snapshot;
  }

  // ── Load ────────────────────────────────────────────────────────────────

  /**
   * Load the latest snapshot for an aggregate. Returns null if none exists.
   */
  load<T = Record<string, unknown>>(aggregateId: string): Snapshot<T> | null {
    const snapshot = this.snapshots.get(aggregateId);
    if (!snapshot) return null;
    return snapshot as Snapshot<T>;
  }

  // ── Should Snapshot ─────────────────────────────────────────────────────

  /**
   * Check if a snapshot should be taken based on the frequency setting.
   * @param currentVersion - The current version of the aggregate
   * @param lastSnapshotVersion - The version at which the last snapshot was taken (0 if none)
   */
  shouldSnapshot(currentVersion: number, lastSnapshotVersion = 0): boolean {
    return currentVersion - lastSnapshotVersion >= this.frequency;
  }

  // ── Diagnostics ─────────────────────────────────────────────────────────

  get size(): number {
    return this.snapshots.size;
  }

  /** Clear everything. For testing only. */
  _reset(): void {
    this.snapshots.clear();
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// 3. Aggregate Base
// ═════════════════════════════════════════════════════════════════════════════

export abstract class Aggregate<TState> {
  abstract readonly aggregateType: string;

  protected state: TState;
  private uncommittedEvents: DomainEvent[] = [];
  private _version = 0;
  private _aggregateId: string;

  constructor(aggregateId: string) {
    this._aggregateId = aggregateId;
    this.state = this.getInitialState();
  }

  // ── Abstract Methods ────────────────────────────────────────────────────

  /**
   * Apply a domain event to the current state, returning the new state.
   * Must be a pure function (no side effects).
   */
  protected abstract apply(event: DomainEvent): TState;

  /**
   * Return the initial state for a fresh aggregate.
   */
  protected abstract getInitialState(): TState;

  // ── Public API ──────────────────────────────────────────────────────────

  /** The aggregate's unique identifier. */
  get aggregateId(): string {
    return this._aggregateId;
  }

  /** The current version (number of committed events applied). */
  get version(): number {
    return this._version;
  }

  /** Read-only access to the current state. */
  getState(): Readonly<TState> {
    return this.state;
  }

  /**
   * Reconstitute this aggregate from a historical event stream.
   * Typically called after loading events from the EventStore.
   */
  loadFromHistory(events: DomainEvent[]): void {
    for (const event of events) {
      this.state = this.apply(event);
      this._version = event.version;
    }
  }

  /**
   * Reconstitute from a snapshot plus any events that occurred after it.
   */
  loadFromSnapshot(snapshot: Snapshot<TState>, events: DomainEvent[]): void {
    this.state = snapshot.state;
    this._version = snapshot.version;

    for (const event of events) {
      this.state = this.apply(event);
      this._version = event.version;
    }
  }

  /**
   * Get uncommitted events (events raised but not yet persisted).
   */
  getUncommittedEvents(): DomainEvent[] {
    return [...this.uncommittedEvents];
  }

  /**
   * Clear uncommitted events (called after successful persistence).
   */
  clearUncommittedEvents(): void {
    this.uncommittedEvents = [];
  }

  // ── Protected Helpers ───────────────────────────────────────────────────

  /**
   * Raise a new domain event. Used by command methods in concrete aggregates.
   * The event is applied immediately and queued for persistence.
   */
  protected raise(
    eventType: string,
    payload: Record<string, unknown>,
    metadata?: Partial<EventMetadata>
  ): void {
    const nextVersion = this._version + this.uncommittedEvents.length + 1;
    const now = new Date().toISOString();

    const event: DomainEvent = {
      id: generateId("evt"),
      aggregateId: this._aggregateId,
      aggregateType: this.aggregateType,
      eventType,
      version: nextVersion,
      payload,
      metadata: {
        userId: metadata?.userId,
        correlationId: metadata?.correlationId,
        causationId: metadata?.causationId,
        timestamp: metadata?.timestamp ?? now,
      },
      createdAt: now,
    };

    this.state = this.apply(event);
    this.uncommittedEvents.push(event);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// 4. CQRS Projections
// ═════════════════════════════════════════════════════════════════════════════

// ─── Projection Interface ────────────────────────────────────────────────────

export interface Projection {
  readonly name: string;
  version: number;
  handleEvent(event: DomainEvent): Promise<void>;
  rebuild(events: DomainEvent[]): Promise<void>;
}

// ─── Projection Status ──────────────────────────────────────────────────────

export interface ProjectionStatus {
  name: string;
  version: number;
  eventsProcessed: number;
}

// ─── Projection Manager ─────────────────────────────────────────────────────

export class ProjectionManager {
  private projections: Map<string, Projection> = new Map();
  private eventCounts: Map<string, number> = new Map();

  /**
   * Register a projection with the manager.
   */
  register(projection: Projection): void {
    this.projections.set(projection.name, projection);
    this.eventCounts.set(projection.name, 0);
  }

  /**
   * Route an event to all registered projections.
   */
  async processEvent(event: DomainEvent): Promise<void> {
    const promises: Promise<void>[] = [];
    const entries = Array.from(this.projections.entries());
    for (const [name, projection] of entries) {
      promises.push(
        projection
          .handleEvent(event)
          .then(() => {
            projection.version = event.version;
            const count = this.eventCounts.get(name) ?? 0;
            this.eventCounts.set(name, count + 1);
          })
          .catch((err) => {
            // Projection errors should not break the pipeline.
            console.warn("[EventSourcing] Projection apply failed:", err);
          })
      );
    }
    await Promise.all(promises);
  }

  /**
   * Rebuild a specific projection by replaying all events.
   */
  async rebuildProjection(
    projectionName: string,
    events: DomainEvent[]
  ): Promise<void> {
    const projection = this.projections.get(projectionName);
    if (!projection) {
      throw new Error(`Projection "${projectionName}" not found`);
    }

    projection.version = 0;
    this.eventCounts.set(projectionName, 0);

    await projection.rebuild(events);

    if (events.length > 0) {
      projection.version = events[events.length - 1].version;
      this.eventCounts.set(projectionName, events.length);
    }
  }

  /**
   * Get the status of all registered projections.
   */
  getProjectionStatus(): ProjectionStatus[] {
    const statuses: ProjectionStatus[] = [];
    const entries = Array.from(this.projections.entries());
    for (const [name, projection] of entries) {
      statuses.push({
        name,
        version: projection.version,
        eventsProcessed: this.eventCounts.get(name) ?? 0,
      });
    }
    return statuses;
  }

  /**
   * Get a registered projection by name.
   */
  getProjection<T extends Projection>(name: string): T | null {
    return (this.projections.get(name) as T) ?? null;
  }
}

// ─── Concrete Projection: Campaign Summary ──────────────────────────────────

export interface CampaignSummaryReadModel {
  campaignId: string;
  status: string;
  totalSubmissions: number;
  approvedSubmissions: number;
  rejectedSubmissions: number;
  totalPerksAwarded: number;
  totalPerksRedeemed: number;
  lastUpdated: string;
}

export class CampaignSummaryProjection implements Projection {
  readonly name = "campaign-summary";
  version = 0;

  /** Read model: campaignId -> summary */
  private summaries: Map<string, CampaignSummaryReadModel> = new Map();

  async handleEvent(event: DomainEvent): Promise<void> {
    this.applyEvent(event);
  }

  async rebuild(events: DomainEvent[]): Promise<void> {
    this.summaries.clear();
    for (const event of events) {
      this.applyEvent(event);
    }
  }

  /** Query the read model */
  getSummary(campaignId: string): CampaignSummaryReadModel | null {
    return this.summaries.get(campaignId) ?? null;
  }

  /** Get all summaries */
  getAllSummaries(): CampaignSummaryReadModel[] {
    return Array.from(this.summaries.values());
  }

  private applyEvent(event: DomainEvent): void {
    const now = new Date().toISOString();

    switch (event.eventType) {
      case "campaign.created": {
        this.summaries.set(event.aggregateId, {
          campaignId: event.aggregateId,
          status: "draft",
          totalSubmissions: 0,
          approvedSubmissions: 0,
          rejectedSubmissions: 0,
          totalPerksAwarded: 0,
          totalPerksRedeemed: 0,
          lastUpdated: now,
        });
        break;
      }
      case "campaign.launched": {
        const summary = this.summaries.get(event.aggregateId);
        if (summary) {
          summary.status = "active";
          summary.lastUpdated = now;
        }
        break;
      }
      case "campaign.paused": {
        const summary = this.summaries.get(event.aggregateId);
        if (summary) {
          summary.status = "paused";
          summary.lastUpdated = now;
        }
        break;
      }
      case "campaign.resumed": {
        const summary = this.summaries.get(event.aggregateId);
        if (summary) {
          summary.status = "active";
          summary.lastUpdated = now;
        }
        break;
      }
      case "campaign.ended":
      case "campaign.expired": {
        const summary = this.summaries.get(event.aggregateId);
        if (summary) {
          summary.status = "ended";
          summary.lastUpdated = now;
        }
        break;
      }
      case "submission.created": {
        const campaignId =
          (event.payload.campaignId as string) ?? event.aggregateId;
        const summary = this.summaries.get(campaignId);
        if (summary) {
          summary.totalSubmissions += 1;
          summary.lastUpdated = now;
        }
        break;
      }
      case "submission.approved": {
        const campaignId =
          (event.payload.campaignId as string) ?? event.aggregateId;
        const summary = this.summaries.get(campaignId);
        if (summary) {
          summary.approvedSubmissions += 1;
          summary.lastUpdated = now;
        }
        break;
      }
      case "submission.rejected": {
        const campaignId =
          (event.payload.campaignId as string) ?? event.aggregateId;
        const summary = this.summaries.get(campaignId);
        if (summary) {
          summary.rejectedSubmissions += 1;
          summary.lastUpdated = now;
        }
        break;
      }
      case "perk.awarded": {
        const campaignId = event.payload.campaignId as string | undefined;
        if (campaignId) {
          const summary = this.summaries.get(campaignId);
          if (summary) {
            summary.totalPerksAwarded += 1;
            summary.lastUpdated = now;
          }
        }
        break;
      }
      case "perk.redeemed": {
        const campaignId = event.payload.campaignId as string | undefined;
        if (campaignId) {
          const summary = this.summaries.get(campaignId);
          if (summary) {
            summary.totalPerksRedeemed += 1;
            summary.lastUpdated = now;
          }
        }
        break;
      }
      default:
        // Unknown event types are silently ignored by projections.
        break;
    }
  }
}

// ─── Concrete Projection: Business Analytics ────────────────────────────────

export interface BusinessAnalyticsReadModel {
  businessId: string;
  totalCampaigns: number;
  activeCampaigns: number;
  totalSubmissions: number;
  approvalRate: number;
  totalPerksAwarded: number;
  totalPerksRedeemed: number;
  redemptionRate: number;
  lastUpdated: string;
}

export class BusinessAnalyticsProjection implements Projection {
  readonly name = "business-analytics";
  version = 0;

  /** Read model: businessId -> analytics */
  private analytics: Map<string, BusinessAnalyticsReadModel> = new Map();

  async handleEvent(event: DomainEvent): Promise<void> {
    this.applyEvent(event);
  }

  async rebuild(events: DomainEvent[]): Promise<void> {
    this.analytics.clear();
    for (const event of events) {
      this.applyEvent(event);
    }
  }

  /** Query the read model */
  getAnalytics(businessId: string): BusinessAnalyticsReadModel | null {
    return this.analytics.get(businessId) ?? null;
  }

  /** Get all analytics */
  getAllAnalytics(): BusinessAnalyticsReadModel[] {
    return Array.from(this.analytics.values());
  }

  private ensureBusiness(businessId: string): BusinessAnalyticsReadModel {
    let record = this.analytics.get(businessId);
    if (!record) {
      record = {
        businessId,
        totalCampaigns: 0,
        activeCampaigns: 0,
        totalSubmissions: 0,
        approvalRate: 0,
        totalPerksAwarded: 0,
        totalPerksRedeemed: 0,
        redemptionRate: 0,
        lastUpdated: new Date().toISOString(),
      };
      this.analytics.set(businessId, record);
    }
    return record;
  }

  private applyEvent(event: DomainEvent): void {
    const now = new Date().toISOString();

    switch (event.eventType) {
      case "campaign.created": {
        const businessId = event.payload.businessId as string | undefined;
        if (businessId) {
          const record = this.ensureBusiness(businessId);
          record.totalCampaigns += 1;
          record.lastUpdated = now;
        }
        break;
      }
      case "campaign.launched": {
        const businessId = event.payload.businessId as string | undefined;
        if (businessId) {
          const record = this.ensureBusiness(businessId);
          record.activeCampaigns += 1;
          record.lastUpdated = now;
        }
        break;
      }
      case "campaign.paused":
      case "campaign.ended":
      case "campaign.expired": {
        const businessId = event.payload.businessId as string | undefined;
        if (businessId) {
          const record = this.ensureBusiness(businessId);
          record.activeCampaigns = Math.max(0, record.activeCampaigns - 1);
          record.lastUpdated = now;
        }
        break;
      }
      case "campaign.resumed": {
        const businessId = event.payload.businessId as string | undefined;
        if (businessId) {
          const record = this.ensureBusiness(businessId);
          record.activeCampaigns += 1;
          record.lastUpdated = now;
        }
        break;
      }
      case "submission.created": {
        const businessId = event.payload.businessId as string | undefined;
        if (businessId) {
          const record = this.ensureBusiness(businessId);
          record.totalSubmissions += 1;
          record.lastUpdated = now;
        }
        break;
      }
      case "submission.approved": {
        const businessId = event.payload.businessId as string | undefined;
        if (businessId) {
          const record = this.ensureBusiness(businessId);
          // Recalculate approval rate
          if (record.totalSubmissions > 0) {
            // We need a running approved count; derive from rate * total, then add 1
            const previousApproved = Math.round(
              record.approvalRate * record.totalSubmissions
            );
            record.approvalRate =
              (previousApproved + 1) / record.totalSubmissions;
          }
          record.lastUpdated = now;
        }
        break;
      }
      case "perk.awarded": {
        const businessId = event.payload.businessId as string | undefined;
        if (businessId) {
          const record = this.ensureBusiness(businessId);
          record.totalPerksAwarded += 1;
          if (record.totalPerksAwarded > 0) {
            record.redemptionRate =
              record.totalPerksRedeemed / record.totalPerksAwarded;
          }
          record.lastUpdated = now;
        }
        break;
      }
      case "perk.redeemed": {
        const businessId = event.payload.businessId as string | undefined;
        if (businessId) {
          const record = this.ensureBusiness(businessId);
          record.totalPerksRedeemed += 1;
          if (record.totalPerksAwarded > 0) {
            record.redemptionRate =
              record.totalPerksRedeemed / record.totalPerksAwarded;
          }
          record.lastUpdated = now;
        }
        break;
      }
      default:
        break;
    }
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// 5. Saga Orchestrator
// ═════════════════════════════════════════════════════════════════════════════

// ─── Saga Types ─────────────────────────────────────────────────────────────

export interface SagaStep {
  name: string;
  execute: (
    context: Record<string, unknown>
  ) => Promise<Record<string, unknown>>;
  compensate: (context: Record<string, unknown>) => Promise<void>;
}

export interface SagaDefinition {
  name: string;
  steps: SagaStep[];
}

export type SagaStatus = "running" | "completed" | "compensating" | "failed";

export interface SagaInstance {
  readonly id: string;
  readonly definitionName: string;
  status: SagaStatus;
  currentStep: number;
  context: Record<string, unknown>;
  completedSteps: string[];
  error?: string;
  startedAt: string;
  completedAt?: string;
}

// ─── Saga Orchestrator Class ────────────────────────────────────────────────

export class SagaOrchestrator {
  private definitions: Map<string, SagaDefinition> = new Map();
  private instances: Map<string, SagaInstance> = new Map();

  /**
   * Register a saga definition.
   */
  define(definition: SagaDefinition): void {
    this.definitions.set(definition.name, definition);
  }

  /**
   * Start a new saga instance with an initial context.
   * Executes all steps sequentially; if any step fails, triggers compensation.
   */
  async start(
    definitionName: string,
    initialContext: Record<string, unknown> = {}
  ): Promise<SagaInstance> {
    const definition = this.definitions.get(definitionName);
    if (!definition) {
      throw new Error(`Saga definition "${definitionName}" not found`);
    }

    const instance: SagaInstance = {
      id: generateId("saga"),
      definitionName,
      status: "running",
      currentStep: 0,
      context: { ...initialContext },
      completedSteps: [],
      startedAt: new Date().toISOString(),
    };

    this.instances.set(instance.id, instance);

    // Execute steps sequentially
    for (let i = 0; i < definition.steps.length; i++) {
      const step = definition.steps[i];
      instance.currentStep = i;

      try {
        const result = await step.execute(instance.context);
        // Merge step result into context
        instance.context = { ...instance.context, ...result };
        instance.completedSteps.push(step.name);
      } catch (err: unknown) {
        const errorMessage =
          err instanceof Error ? err.message : String(err);
        instance.error = `Step "${step.name}" failed: ${errorMessage}`;
        instance.status = "compensating";

        // Compensate completed steps in reverse order
        await this.compensate(instance, definition);

        this.instances.set(instance.id, instance);
        return instance;
      }
    }

    instance.status = "completed";
    instance.completedAt = new Date().toISOString();
    this.instances.set(instance.id, instance);
    return instance;
  }

  /**
   * Get the status of a saga instance.
   */
  getStatus(sagaId: string): SagaInstance | null {
    return this.instances.get(sagaId) ?? null;
  }

  /**
   * Get all saga instances, optionally filtered by status.
   */
  getAllInstances(statusFilter?: SagaStatus): SagaInstance[] {
    const all = Array.from(this.instances.values());
    if (statusFilter) {
      return all.filter((i) => i.status === statusFilter);
    }
    return all;
  }

  // ── Compensation ────────────────────────────────────────────────────────

  private async compensate(
    instance: SagaInstance,
    definition: SagaDefinition
  ): Promise<void> {
    // Compensate in reverse order of completed steps
    const stepsToCompensate = [...instance.completedSteps].reverse();

    for (const stepName of stepsToCompensate) {
      const step = definition.steps.find((s) => s.name === stepName);
      if (!step) continue;

      try {
        await step.compensate(instance.context);
      } catch (err) {
        console.error(
          `[EventSourcing] Saga "${instance.definitionName}" compensation step "${stepName}" failed:`,
          err instanceof Error ? err.message : err
        );
        // Compensation failure is logged but does not stop other compensations.
        // In production, this would trigger an alert for manual intervention.
      }
    }

    instance.status = "failed";
    instance.completedAt = new Date().toISOString();
  }

  /** Clear all instances. For testing only. */
  _reset(): void {
    this.instances.clear();
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// 6. Concrete Saga: Campaign Launch
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Campaign Launch Saga
 * Orchestrates: validate -> escrow funds -> create campaign -> notify influencers
 *
 * Each step can be customized by providing handler functions, but this provides
 * a default definition that can be registered with the SagaOrchestrator.
 */
export function createCampaignLaunchSaga(): SagaDefinition {
  return {
    name: "campaign-launch",
    steps: [
      {
        name: "validate",
        execute: async (
          context: Record<string, unknown>
        ): Promise<Record<string, unknown>> => {
          const campaignId = context.campaignId as string | undefined;
          const businessId = context.businessId as string | undefined;
          const budget = context.budget as number | undefined;

          if (!campaignId) throw new Error("campaignId is required");
          if (!businessId) throw new Error("businessId is required");
          if (!budget || budget <= 0)
            throw new Error("budget must be positive");

          return { validated: true, validatedAt: new Date().toISOString() };
        },
        compensate: async (): Promise<void> => {
          // Validation has no side effects to compensate.
        },
      },
      {
        name: "escrow-funds",
        execute: async (
          context: Record<string, unknown>
        ): Promise<Record<string, unknown>> => {
          const businessId = context.businessId as string;
          const budget = context.budget as number;

          // In production, this would call the financial ledger to hold funds.
          // For now, simulate the escrow operation.
          const escrowId = generateId("escrow");

          return {
            escrowId,
            escrowAmount: budget,
            escrowBusinessId: businessId,
            escrowedAt: new Date().toISOString(),
          };
        },
        compensate: async (
          context: Record<string, unknown>
        ): Promise<void> => {
          // Release escrowed funds back to the business.
          const _escrowId = context.escrowId as string | undefined;
          // In production: await financialLedger.releaseEscrow(escrowId);
          void _escrowId;
        },
      },
      {
        name: "create-campaign",
        execute: async (
          context: Record<string, unknown>
        ): Promise<Record<string, unknown>> => {
          const campaignId = context.campaignId as string;

          // In production, this would persist the campaign and emit
          // a domain event through the EventStore.
          return {
            campaignCreated: true,
            campaignCreatedId: campaignId,
            campaignCreatedAt: new Date().toISOString(),
          };
        },
        compensate: async (
          context: Record<string, unknown>
        ): Promise<void> => {
          // Mark the campaign as cancelled / roll back creation.
          const _campaignId = context.campaignCreatedId as string | undefined;
          // In production: await campaignRepository.cancel(campaignId);
          void _campaignId;
        },
      },
      {
        name: "notify-influencers",
        execute: async (
          context: Record<string, unknown>
        ): Promise<Record<string, unknown>> => {
          const campaignId = context.campaignId as string;
          const targetInfluencers = (context.targetInfluencers as string[]) ?? [];

          // In production, this would send notifications via the
          // notification system to matched influencers.
          return {
            notificationsSent: targetInfluencers.length,
            notifiedCampaignId: campaignId,
            notifiedAt: new Date().toISOString(),
          };
        },
        compensate: async (
          context: Record<string, unknown>
        ): Promise<void> => {
          // Send cancellation notifications if campaign launch is rolled back.
          const _campaignId = context.notifiedCampaignId as string | undefined;
          // In production: await notificationService.sendCancellations(campaignId);
          void _campaignId;
        },
      },
    ],
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// 7. Repository Helper
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Generic repository that combines EventStore + SnapshotStore to load
 * and save aggregates. Handles snapshot creation automatically.
 */
export class AggregateRepository<
  TState,
  TAggregate extends Aggregate<TState>
> {
  constructor(
    private readonly eventStore: EventStore,
    private readonly snapshotStore: SnapshotStore,
    private readonly factory: (id: string) => TAggregate
  ) {}

  /**
   * Load an aggregate by ID.
   * Uses snapshot if available, then replays remaining events.
   */
  load(aggregateId: string): TAggregate {
    const aggregate = this.factory(aggregateId);

    // Try to load from snapshot first
    const snapshot = this.snapshotStore.load<TState>(aggregateId);

    if (snapshot) {
      // Load remaining events after the snapshot
      const remainingStream = this.eventStore.getStreamFromVersion(
        aggregateId,
        snapshot.version
      );
      aggregate.loadFromSnapshot(
        snapshot,
        remainingStream?.events ?? []
      );
    } else {
      // Load full event history
      const stream = this.eventStore.getStream(aggregateId);
      if (stream) {
        aggregate.loadFromHistory(stream.events);
      }
    }

    return aggregate;
  }

  /**
   * Save an aggregate's uncommitted events to the EventStore.
   * Automatically creates snapshots based on the SnapshotStore's frequency.
   */
  save(aggregate: TAggregate): DomainEvent[] {
    const uncommitted = aggregate.getUncommittedEvents();
    if (uncommitted.length === 0) return [];

    // Build the input events for the EventStore
    const eventsToAppend = uncommitted.map((e) => ({
      aggregateType: e.aggregateType,
      eventType: e.eventType,
      payload: e.payload,
      metadata: e.metadata,
    }));

    // Determine expected version (current version before uncommitted events)
    const expectedVersion =
      aggregate.version - uncommitted.length;

    const appended = this.eventStore.append(
      aggregate.aggregateId,
      eventsToAppend,
      expectedVersion >= 0 ? expectedVersion : 0
    );

    // Check if we should snapshot
    const lastSnapshot = this.snapshotStore.load<TState>(
      aggregate.aggregateId
    );
    const lastSnapshotVersion = lastSnapshot?.version ?? 0;

    if (this.snapshotStore.shouldSnapshot(aggregate.version, lastSnapshotVersion)) {
      this.snapshotStore.save(
        aggregate.aggregateId,
        aggregate.aggregateType,
        aggregate.version,
        aggregate.getState()
      );
    }

    aggregate.clearUncommittedEvents();
    return appended;
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// 8. Singleton Instances
// ═════════════════════════════════════════════════════════════════════════════

/** Shared event store instance for the application. */
export const domainEventStore = new EventStore();

/** Shared snapshot store instance (snapshot every 100 events). */
export const snapshotStore = new SnapshotStore(100);

/** Shared projection manager. */
export const projectionManager = new ProjectionManager();

/** Shared saga orchestrator. */
export const sagaOrchestrator = new SagaOrchestrator();

// ─── Bootstrap ──────────────────────────────────────────────────────────────

// Register built-in projections
const campaignSummaryProjection = new CampaignSummaryProjection();
const businessAnalyticsProjection = new BusinessAnalyticsProjection();

projectionManager.register(campaignSummaryProjection);
projectionManager.register(businessAnalyticsProjection);

// Register the campaign launch saga
sagaOrchestrator.define(createCampaignLaunchSaga());

// Wire up the event store to automatically feed projections
domainEventStore.subscribe("*", (event: DomainEvent) => {
  // Fire-and-forget: projections process asynchronously but we don't await here
  // because the EventStore subscribe callback is synchronous.
  void projectionManager.processEvent(event);
});

// ─── Convenience Exports ────────────────────────────────────────────────────

export { campaignSummaryProjection, businessAnalyticsProjection };
