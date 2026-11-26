/**
 * A stand-in for the browser's EventSource, for tests: happy-dom has none.
 * Test-only.
 *
 * It keeps the parts of the browser's behaviour the realtime client relies on:
 * - an event the server names (`event: submission.created`) reaches only
 *   addEventListener("submission.created") listeners. `onmessage` gets only
 *   unnamed events, so a client that waits on `onmessage` sees nothing of a
 *   stream whose events are all named, as /api/v1/events's are.
 * - after close(), nothing more is dispatched.
 *
 * The test drives it: `emit(type, data)` delivers one event, `fail()` is the
 * connection dropping (or never opening).
 */
type Listener = (event: MessageEvent) => void;

export class FakeEventSource {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSED = 2;

  /** Every source made since the last reset(), oldest first. */
  static instances: FakeEventSource[] = [];

  static reset(): void {
    FakeEventSource.instances = [];
  }

  /** The source made last. Throws when there is none. */
  static latest(): FakeEventSource {
    const source = FakeEventSource.instances.at(-1);
    if (!source) throw new Error("no EventSource was opened");
    return source;
  }

  readonly url: string;
  readonly withCredentials: boolean;
  readyState = FakeEventSource.CONNECTING;
  onopen: ((event: Event) => void) | null = null;
  onmessage: Listener | null = null;
  onerror: ((event: Event) => void) | null = null;
  private readonly listeners = new Map<string, Set<Listener>>();

  constructor(url: string | URL, init?: EventSourceInit) {
    this.url = String(url);
    this.withCredentials = init?.withCredentials ?? false;
    FakeEventSource.instances.push(this);
  }

  addEventListener(type: string, listener: Listener): void {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type)!.add(listener);
  }

  removeEventListener(type: string, listener: Listener): void {
    this.listeners.get(type)?.delete(listener);
  }

  close(): void {
    this.readyState = FakeEventSource.CLOSED;
  }

  get closed(): boolean {
    return this.readyState === FakeEventSource.CLOSED;
  }

  /** The server sends one event: `event: <type>` and `data: <JSON of data>`. */
  emit(type: string, data: unknown): void {
    this.emitRaw(type, JSON.stringify(data));
  }

  /** The server sends one event whose `data:` is this text, as it is. */
  emitRaw(type: string, data: string): void {
    if (this.closed) return;
    if (this.readyState === FakeEventSource.CONNECTING) {
      this.readyState = FakeEventSource.OPEN;
      this.onopen?.(new Event("open"));
    }
    const event = new MessageEvent(type, { data });
    if (type === "message") this.onmessage?.(event);
    for (const listener of this.listeners.get(type) ?? []) listener(event);
  }

  /** The connection drops, or never opens. A browser fires `error` and, unless told otherwise, tries again itself. */
  fail(): void {
    if (this.closed) return;
    this.readyState = FakeEventSource.CONNECTING;
    this.onerror?.(new Event("error"));
  }
}
