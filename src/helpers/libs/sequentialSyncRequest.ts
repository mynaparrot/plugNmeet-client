export const SYNC_TARGET_TIMEOUT_MS = 1000;
export const SYNC_ROUND_RETRY_MS = 2000;
export const MAX_SYNC_ROUNDS = 3;

interface Options {
  /** Ordered best-first peer ids; the caller caps the list. */
  getTargets: () => string[];
  send: (toUserId: string, requestId: string) => void;
}

/**
 * Asks peers for the missing state one at a time instead of broadcasting: each
 * target gets SYNC_TARGET_TIMEOUT_MS, a fresh round starts after
 * SYNC_ROUND_RETRY_MS, and the run gives up after MAX_SYNC_ROUNDS.
 */
export class SequentialSyncRequest {
  private pendingIds = new Set<string>();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private round = 0;
  private targets: string[] = [];
  private index = 0;

  constructor(private readonly opts: Options) {}

  get active(): boolean {
    return this.round > 0;
  }

  /** Start a run; no-op while one is already in progress. */
  start() {
    if (this.active) {
      return;
    }
    this.round = 0;
    this.beginRound();
  }

  /** True for any id sent during the current run, including earlier rounds. */
  isPending(requestId: string): boolean {
    return this.pendingIds.has(requestId);
  }

  /** Stop the run if `requestId` belongs to it. */
  complete(requestId: string): boolean {
    if (!this.pendingIds.has(requestId)) {
      return false;
    }
    this.reset();
    return true;
  }

  /** Skip the target being waited on (e.g. its answer was unusable). */
  next() {
    if (!this.active) {
      return;
    }
    this.clearTimer();
    this.advance();
  }

  cancel() {
    this.reset();
  }

  private beginRound() {
    this.round += 1;
    if (this.round > MAX_SYNC_ROUNDS) {
      this.reset();
      return;
    }
    this.targets = this.opts.getTargets();
    this.index = 0;
    if (this.targets.length === 0) {
      this.reset();
      return;
    }
    this.sendCurrent();
  }

  private sendCurrent() {
    const toUserId = this.targets[this.index];
    const requestId = crypto.randomUUID();
    this.pendingIds.add(requestId);
    this.opts.send(toUserId, requestId);
    this.arm(SYNC_TARGET_TIMEOUT_MS, () => this.advance());
  }

  private advance() {
    this.index += 1;
    if (this.index < this.targets.length) {
      this.sendCurrent();
      return;
    }
    // Round exhausted: wait before asking everyone again.
    this.arm(SYNC_ROUND_RETRY_MS, () => this.beginRound());
  }

  private arm(ms: number, run: () => void) {
    this.clearTimer();
    this.timer = setTimeout(() => {
      this.timer = null;
      run();
    }, ms);
  }

  private clearTimer() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private reset() {
    this.clearTimer();
    this.pendingIds.clear();
    this.targets = [];
    this.index = 0;
    this.round = 0;
  }
}
