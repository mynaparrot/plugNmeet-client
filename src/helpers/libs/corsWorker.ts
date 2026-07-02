/**
 * A robust, self-contained utility for loading a Web Worker,
 * handling both same-origin and cross-origin scenarios.
 */
export class CorsWorker {
  // Cache for cross-origin worker URLs
  private static _workerUrlCache: Map<string, string> = new Map();

  // The constructor is now private to enforce creation via the static method.
  private constructor() {}

  /**
   * Asynchronously creates and returns a Worker instance, handling
   * same-origin and cross-origin loading automatically.
   * @param url The URL of the worker script.
   */
  public static async create(url: string): Promise<Worker> {
    const resolvedUrl = new URL(url, window.location.href);

    if (resolvedUrl.origin === window.location.origin) {
      return this._loadSameOrigin(resolvedUrl.href);
    }
    return this._loadCrossOrigin(resolvedUrl.href);
  }

  private static async _loadCrossOrigin(url: string): Promise<Worker> {
    if (this._workerUrlCache.has(url)) {
      const workerUrl = this._workerUrlCache.get(url)!;
      return new Worker(workerUrl, { type: 'module' });
    }

    const response = await fetch(url);
    const code = await response.text();
    const blob = new Blob([code], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(blob);

    this._workerUrlCache.set(url, workerUrl);

    return new Worker(workerUrl, { type: 'module' });
  }

  private static async _loadSameOrigin(url: string): Promise<Worker> {
    return new Worker(url, { type: 'module' });
  }
}
