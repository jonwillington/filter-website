/**
 * Race a promise against a timeout. If the promise doesn't resolve
 * within `ms` milliseconds, return the `fallback` value instead.
 */
export function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>(resolve => setTimeout(() => resolve(fallback), ms)),
  ]);
}
