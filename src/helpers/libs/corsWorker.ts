/**
 * A robust, self-contained utility for loading a Web Worker,
 * handling both same-origin and cross-origin scenarios.
 */
export class CorsWorker {
  // The constructor is now private to enforce creation via the static method.
  private constructor() {}

  /**
   * Asynchronously creates and returns a Worker instance, handling
   * same-origin and cross-origin loading automatically.
   * @param url The URL of the worker script.
   */
  public static async create(url: string): Promise<Worker> {
    if (!/:\/\//.test(url) || url.startsWith(window.location.origin)) {
      return this._loadSameOrigin(url);
    }
    return this._loadCrossOrigin(url);
  }

  private static async _loadCrossOrigin(url: string): Promise<Worker> {
    const response = await fetch(url);
    const code = await response.text();
    const blob = new Blob([code], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(blob);
    return new Worker(workerUrl, { type: 'module' });
  }

  private static async _loadSameOrigin(url: string): Promise<Worker> {
    return new Worker(url, { type: 'module' });
  }
}
