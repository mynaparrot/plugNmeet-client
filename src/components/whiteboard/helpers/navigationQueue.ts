import type { BinaryFileData } from '@excalidraw/excalidraw/types';
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types';

/** A whiteboard page/file destination. */
export interface NavigationTarget {
  fileId: string;
  page: number;
}

/** Office page content loaded for a navigation target; applied by the owner only. */
export interface OfficePageLoad {
  images: BinaryFileData[];
  elements: ExcalidrawElement[];
}

const sameTarget = (a: NavigationTarget, b: NavigationTarget) =>
  a.fileId === b.fileId && a.page === b.page;

/**
 * The page metadata for `page` of `fileId`, or null when the store describes a
 * different active document: page lists belong to one document and must never
 * be used to load another file's page.
 */
export const findOfficePageFile = <T extends { currentPage: number; isOfficeFile: boolean }>(
  pagesJson: string,
  fileId: string,
  activeFileId: string,
  page: number,
): T | null => {
  if (fileId !== activeFileId || pagesJson === '') {
    return null;
  }
  try {
    const pages = JSON.parse(pagesJson) as T[];
    return pages.find((p) => p.currentPage === page && p.isOfficeFile) ?? null;
  } catch (error) {
    console.error('[whiteboard] failed to parse office page data', error);
    return null;
  }
};

export type NavigationTransition = (
  target: NavigationTarget,
  /** False once a newer target owns navigation: stop before the next side effect. */
  isCurrent: () => boolean,
) => Promise<boolean>;

export interface NavigationTransitionSteps {
  isPresenter: boolean;
  /** Clear the canvas so the previous page never flashes during hydration. */
  reset: () => void;
  /** Point the CRDT at the target and hydrate it. */
  sync: (target: NavigationTarget) => Promise<void>;
  /** Paint the hydrated CRDT scene. */
  paint: () => void;
  /** Load the office page. Must not touch the canvas: stale loads are dropped. */
  loadOfficePage: (
    target: NavigationTarget,
    isCurrent: () => boolean,
  ) => Promise<OfficePageLoad | null>;
  /** Apply a loaded office page, or the current CRDT scene when null. */
  applyOfficePage: (load: OfficePageLoad | null) => void;
  /** Presenter-only: broadcast the full authoritative scene. */
  broadcast: () => void;
}

/**
 * One page/file switch. Every side effect after the first await is guarded, so a
 * superseded transition can never repaint, upload or broadcast over the newest
 * one. Returns false when it stopped early because it lost ownership.
 */
export const runNavigationTransition = async (
  target: NavigationTarget,
  isCurrent: () => boolean,
  steps: NavigationTransitionSteps,
): Promise<boolean> => {
  steps.reset();
  await steps.sync(target);
  if (!isCurrent()) {
    return false;
  }
  steps.paint();

  if (!steps.isPresenter) {
    return true;
  }

  // Office pages are presenter-only and idempotent: the CRDT already holding
  // content for this page means nothing needs to be inserted.
  const load = await steps.loadOfficePage(target, isCurrent);
  if (!isCurrent()) {
    return false;
  }
  steps.applyOfficePage(load);
  steps.broadcast();
  return true;
};

/** Work owned by the navigation lifecycle; `isCurrent` turns false once superseded. */
export type NavigationJob = (isCurrent: () => boolean) => Promise<void>;

interface QueuedTarget {
  token: number;
  target: NavigationTarget;
}

/**
 * Latest-request-wins ownership for whiteboard navigation: the bootstrap and
 * every page/file switch take a token here, and a newer request makes the older
 * owner's `isCurrent()` false so it stops before its next controller, canvas or
 * room side effect. `onIdle` (lock release) fires only when nothing is left, so
 * only the last owner unlocks.
 */
export class LatestNavigationQueue {
  private seq = 0;
  private latestToken = 0;
  private running: QueuedTarget | null = null;
  private bootstrapToken: number | null = null;
  private pending: QueuedTarget | null = null;
  private newestTarget: NavigationTarget | null = null;
  private activeDrain: Promise<void> | null = null;
  private supersedeWaiters = new Set<() => void>();
  private latestTransition: NavigationTransition | null = null;
  private latestOnIdle: (() => void) | undefined;

  /** Record a navigation request; every older target is now obsolete. */
  request(target: NavigationTarget, options: { force?: boolean } = {}): void {
    if (!options.force) {
      // Already switching to that very page: keep that transition as the owner
      // and forget whatever was queued in between (it is obsolete).
      if (this.running && sameTarget(this.running.target, target)) {
        this.latestToken = this.running.token;
        this.newestTarget = this.running.target;
        this.pending = null;
        return;
      }
      if (this.pending && sameTarget(this.pending.target, target)) {
        return;
      }
    }

    const token = ++this.seq;
    this.latestToken = token;
    this.newestTarget = target;
    this.pending = { token, target };
    this.notifySuperseded();
  }

  /**
   * Start the initial navigation. A switch that already owns navigation is not
   * invalidated here: its office-page load would be dropped, so the bootstrap
   * waits for it and then takes ownership itself (it resolves its scope from
   * live state anyway). Every later request still supersedes the bootstrap.
   */
  startBootstrap(run: NavigationJob, onIdle?: () => void): Promise<void> {
    if (!this.activeDrain) {
      return this.claimBootstrap(run, onIdle);
    }
    return this.waitAndStartBootstrap(run, onIdle);
  }

  /**
   * Claims in the same continuation that saw an idle queue, so a microtask
   * cannot start a new drain between the wait and the claim.
   */
  private async waitAndStartBootstrap(run: NavigationJob, onIdle?: () => void): Promise<void> {
    while (this.activeDrain) {
      await this.activeDrain;
    }
    return this.claimBootstrap(run, onIdle);
  }

  private claimBootstrap(run: NavigationJob, onIdle?: () => void): Promise<void> {
    const token = ++this.seq;
    this.latestToken = token;
    this.bootstrapToken = token;
    this.notifySuperseded();

    return (async () => {
      try {
        await run(() => token === this.latestToken);
      } catch (error) {
        console.error('[whiteboard] initial navigation failed', error);
      } finally {
        if (this.bootstrapToken === token) {
          this.bootstrapToken = null;
        }
        // The job is over: the abortable waits it raced with cannot settle.
        this.supersedeWaiters.clear();
        if (this.canRelease()) {
          onIdle?.();
        }
      }
    })();
  }

  /** Newest requested target, or null before the first request. */
  get target(): NavigationTarget | null {
    return this.newestTarget;
  }

  /** Resolves as soon as a newer request supersedes the current owner. */
  waitForSupersede(): Promise<void> {
    return new Promise((resolve) => {
      const done = () => {
        this.supersedeWaiters.delete(done);
        resolve();
      };
      this.supersedeWaiters.add(done);
    });
  }

  /** Nothing is running or queued: the transition lock may be released. */
  canRelease(): boolean {
    return this.activeDrain === null && this.pending === null && this.bootstrapToken === null;
  }

  /** Run queued targets one at a time until nothing is left. */
  drain(transition: NavigationTransition, onIdle?: () => void): Promise<void> {
    // The queue outlives a render: always use the newest callbacks.
    this.latestTransition = transition;
    this.latestOnIdle = onIdle;
    if (this.activeDrain) {
      return this.activeDrain;
    }

    // Claim ownership before the loop can run (it may finish synchronously).
    let settle!: () => void;
    const finished = new Promise<void>((resolve) => {
      settle = resolve;
    });
    this.activeDrain = finished;

    void (async () => {
      try {
        do {
          for (let next = this.take(); next; next = this.take()) {
            try {
              await this.latestTransition!(next.target, () => next.token === this.latestToken);
            } catch (error) {
              // A rejected transition must not poison the queue: newer work
              // still runs.
              console.error('[whiteboard] navigation transition failed', error);
            }
            this.running = null;
          }
        } while (this.pending);
      } finally {
        this.activeDrain = null;
        settle();
        if (this.canRelease()) {
          this.latestOnIdle?.();
        }
      }
    })();

    return finished;
  }

  private take(): QueuedTarget | null {
    const next = this.pending;
    if (!next) {
      return null;
    }
    this.pending = null;
    this.running = next;
    return next;
  }

  private notifySuperseded(): void {
    for (const waiter of this.supersedeWaiters) {
      waiter();
    }
  }
}
