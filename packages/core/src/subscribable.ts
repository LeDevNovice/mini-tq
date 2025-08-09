/**
 * Subscribable : minimal notification primitive.
 * A tiny framework-agnostic observable that other core entities can extend.
 *
 * Mapping to TanStack Query v5 :
 * - Tanstack Query has a Subscribable base and a NotifyManager to batch UI updates.
 * - I keep it intentionally smaller. Batching is made via queueMicrotask.
 */

export type Listener<T> = (value: T) => void;

export class Subscribable<T = void> {
  private readonly listeners = new Set<Listener<T>>();

  // Batching flags and storage
  private pendingFlush = false; // Indicates if a flush is already scheduled
  private hasQueuedValue = false; // Indicates if there is a value to flush
  private lastValue!: T; // the most recent payload to deliver

  /**
   * Subscribe to batched notifications. Returns an unsubscribe function.
   * Listener is called at most once per microtask, with the latest queued value.
   */
  subscribe(listener: Listener<T>): () => void {
    this.listeners.add(listener);
    this.onSubscribe();
    let unsubscribed = false;

    return () => {
      if (unsubscribed) return;
      unsubscribed = true;
      const existed = this.listeners.delete(listener);
      if (existed) this.onUnsubscribe();
    };
  }

  /**
   * Protected hook invoked when a new listener is added.
   * Subclasses can override this to initiate work on first subscriber.
   */
  protected onSubscribe(): void { }

  /**
   * Protected hook invoked when a listener is removed.
   * Subclasses can override this to tear down work when the last subscriber leaves.
   */
  protected onUnsubscribe(): void { }

  /**
   * Protected hook invoked when a subscriber threw during flush.
   * The program report but do not crash. Libraries should not let one consumer kill the pipeline.
   * Default behavior logs an error. Subclasses may override to aggregate/report differently.
   */
  protected onNotifyError(error: unknown): void {
    console.error('[Subscribable] listener error:', error);
  }

  /**
   * Schedule a batched notification with the provided value.
   * Multiple calls within the same microtask coalesce to a single flush,
   * and only the latest value is delivered to subscribers.
   */
  protected notify(value: T): void {
    this.lastValue = value;
    this.hasQueuedValue = true;

    if (this.pendingFlush) return;
    this.pendingFlush = true;

    queueMicrotask(() => {
      this.pendingFlush = false;
      if (!this.hasQueuedValue) return;

      const payload = this.lastValue;
      this.hasQueuedValue = false;

      const listeners = Array.from(this.listeners);
      for (const fn of listeners) {
        try {
          fn(payload);
        } catch (err) {
          this.onNotifyError(err);
        }
      }
    });
  }

  get listenerCount(): number {
    return this.listeners.size;
  }

  hasListeners(): boolean {
    return this.listeners.size > 0;
  }
}
