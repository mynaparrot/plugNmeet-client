export const SYNC_TARGET_TIMEOUT_MS = 1000;
export const SYNC_ROUND_RETRY_MS = 2000;
export const MAX_SYNC_ROUNDS = 3;

interface Options {
  /** Ordered best-first peer ids; the caller caps the list. */
  getTargets: () => string[];
  send: (toUserId: string, requestId: string) => void;
}

/**
 * Asks every ranked peer in turn, one at a time. Each request carries the state
 * vector taken at send time, so an answer only returns what is still missing and
 * the run ends once every target has answered. Silent targets are retried after
 * SYNC_ROUND_RETRY_MS; the run gives up after MAX_SYNC_ROUNDS.
 */
export class SequentialSyncRequest {
  private requests = new Map<string, string>();
  private answered = new Set<string>();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private round = 0;
  /** Peers of the original run: fixed for its whole lifetime. */
  private runTargets: string[] = [];
  private targets: string[] = [];
  private index = 0;
  private currentId: string | null = null;

  constructor(private readonly opts: Options) {}

  get active(): boolean {
    return this.round > 0;
  }

  /** Start a run over the current targets; no-op while one is in progress. */
  start(maxTargets?: number) {
    if (this.active) {
      return;
    }
    this.reset();
    const targets = this.opts.getTargets();
    this.runTargets = maxTargets === undefined ? targets : targets.slice(0, maxTargets);
    if (this.runTargets.length === 0) {
      return;
    }
    this.round = 1;
    this.targets = this.runTargets;
    this.askFrom(0);
  }

  /** True for any id sent during the current run, including earlier rounds. */
  isPending(requestId: string): boolean {
    return this.requests.has(requestId);
  }

  /** An answer arrived: its sender is done and the wait on it ends at once. */
  complete(requestId: string): boolean {
    const userId = this.requests.get(requestId);
    if (userId === undefined) {
      return false;
    }
    this.requests.delete(requestId);
    this.answered.add(userId);
    if (requestId === this.currentId) {
      this.advance();
    }
    return true;
  }

  /** Skip the target being waited on (e.g. its answer was unusable). */
  fail(requestId: string) {
    if (!this.requests.delete(requestId)) {
      return;
    }
    if (requestId === this.currentId) {
      this.advance();
    }
  }

  cancel() {
    this.reset();
  }

  /** Ask the next unanswered target of this round, or end the round. */
  private askFrom(from: number) {
    for (let i = from; i < this.targets.length; i++) {
      const userId = this.targets[i];
      if (this.answered.has(userId)) {
        continue;
      }
      this.index = i;
      const requestId = crypto.randomUUID();
      this.requests.set(requestId, userId);
      this.currentId = requestId;
      this.opts.send(userId, requestId);
      this.arm(SYNC_TARGET_TIMEOUT_MS, () => this.advance());
      return;
    }
    this.endRound();
  }

  private advance() {
    this.clearTimer();
    this.currentId = null;
    this.askFrom(this.index + 1);
  }

  private endRound() {
    this.clearTimer();
    this.currentId = null;
    if (this.runTargets.every((userId) => this.answered.has(userId))) {
      this.reset();
      return;
    }
    // Round exhausted: wait, then retry only the peers that never answered.
    this.arm(SYNC_ROUND_RETRY_MS, () => this.beginRound());
  }

  private beginRound() {
    this.round += 1;
    if (this.round > MAX_SYNC_ROUNDS) {
      this.reset();
      return;
    }
    // Peers that left are dropped; no new peer joins a running run.
    const present = new Set(this.opts.getTargets());
    this.targets = this.runTargets.filter(
      (userId) => present.has(userId) && !this.answered.has(userId),
    );
    this.index = 0;
    if (this.targets.length === 0) {
      this.reset();
      return;
    }
    this.askFrom(0);
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
    this.requests.clear();
    this.answered.clear();
    this.runTargets = [];
    this.targets = [];
    this.index = 0;
    this.currentId = null;
    this.round = 0;
  }
}
