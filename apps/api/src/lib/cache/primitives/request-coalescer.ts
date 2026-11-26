/**
 * Shares one running call between concurrent callers with the same key, so a burst of
 * identical requests (for example cache misses) runs the work once.
 *
 * Also known as "singleFlight") or request deduplication.
 */
export class RequestCoalescer<V> {
  private readonly inFlight = new Map<string, Promise<V>>();

  /** Runs `load` unless a call for `key` is already running, in which case its result is shared. */
  run(key: string, load: () => Promise<V>): Promise<V> {
    // No `await` between the check and the set below, so two callers can't both start `load`.
    const pending = this.inFlight.get(key);
    if (pending) return pending;

    // Removed on success and on failure, so a failed call isn't handed to later callers.
    const promise = load().finally(() => this.inFlight.delete(key));
    this.inFlight.set(key, promise);
    return promise;
  }
}
