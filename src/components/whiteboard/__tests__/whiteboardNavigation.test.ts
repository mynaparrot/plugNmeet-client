import { describe, expect, it, vi } from 'vitest';

/*
 * Navigation ownership tests: the real queue + guarded transition run; only the
 * canvas/CRDT/office-page steps are faked, so the assertions describe what a
 * superseded page switch or bootstrap is allowed to touch.
 */

import {
  findOfficePageFile,
  LatestNavigationQueue,
  runNavigationTransition,
  type NavigationTarget,
  type NavigationTransitionSteps,
} from '../helpers/navigationQueue';

const target = (page: number, fileId = 'file1'): NavigationTarget => ({ fileId, page });

const deferred = <T = void>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve: (value?: T) => resolve(value as T) };
};

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

interface Recorder {
  steps: (t: NavigationTarget) => NavigationTransitionSteps;
  syncs: number[];
  paints: number[];
  loads: number[];
  applied: number[];
  broadcasts: number[];
}

/**
 * Mirrors the production wiring: `sync` hydrates the controller, `paint` shows
 * the CRDT scene, `loadOfficePage` is a pure fetch and `applyOfficePage` is the
 * only step that may add files/paint the office page.
 */
const recorder = (gates: Partial<Record<number, Promise<void>>> = {}): Recorder => {
  const recorder: Recorder = {
    syncs: [],
    paints: [],
    loads: [],
    applied: [],
    broadcasts: [],
    steps: (t) => ({
      isPresenter: true,
      reset: () => undefined,
      sync: async () => {
        recorder.syncs.push(t.page);
        await gates[t.page];
      },
      paint: () => {
        recorder.paints.push(t.page);
      },
      loadOfficePage: async (next, isCurrent) => {
        recorder.loads.push(next.page);
        return isCurrent()
          ? {
              images: [{ id: `img-${next.page}` }] as never,
              elements: [{ id: `page-${next.page}` }] as never,
            }
          : null;
      },
      applyOfficePage: () => {
        recorder.applied.push(t.page);
      },
      broadcast: () => {
        recorder.broadcasts.push(t.page);
      },
    }),
  };
  return recorder;
};

const transitionWith = (rec: Recorder) => (t: NavigationTarget, isCurrent: () => boolean) =>
  runNavigationTransition(t, isCurrent, rec.steps(t));

describe('latest navigation wins', () => {
  it('applies only the newest target when A→B→C overlap', async () => {
    const rec = recorder();
    const queue = new LatestNavigationQueue();
    const gateA = deferred<void>();
    const gateC = deferred<void>();
    // A hydrates then blocks; C (the newest) blocks until we let it finish.
    const base = rec.steps;
    rec.steps = (t) => {
      const steps = base(t);
      return {
        ...steps,
        sync: async () => {
          void steps.sync(t);
          await (t.page === 1 ? gateA.promise : t.page === 3 ? gateC.promise : undefined);
        },
      };
    };

    const onIdle = vi.fn();
    queue.request(target(1));
    const drain = queue.drain(transitionWith(rec), onIdle);

    queue.request(target(2));
    queue.request(target(3));

    gateA.resolve();
    await flush();
    // A finished but lost ownership: no paint, no office insert, no broadcast,
    // and it must not release the lock while C is still pending.
    expect(rec.paints).toEqual([]);
    expect(rec.applied).toEqual([]);
    expect(rec.broadcasts).toEqual([]);
    expect(queue.canRelease()).toBe(false);
    expect(onIdle).not.toHaveBeenCalled();

    gateC.resolve();
    await drain;

    expect(rec.syncs).toEqual([1, 3]); // B never started: already obsolete
    expect(rec.paints).toEqual([3]);
    expect(rec.loads).toEqual([3]);
    expect(rec.applied).toEqual([3]);
    expect(rec.broadcasts).toEqual([3]);
    expect(onIdle).toHaveBeenCalledTimes(1);
    expect(queue.canRelease()).toBe(true);
  });

  it('drops a late office-page result that lost ownership', async () => {
    const rec = recorder();
    const queue = new LatestNavigationQueue();
    const loading = deferred<void>();
    const base = rec.steps;
    rec.steps = (t) => {
      const steps = base(t);
      return {
        ...steps,
        loadOfficePage: async (next, isCurrent) => {
          await loading.promise;
          return steps.loadOfficePage(next, isCurrent);
        },
      };
    };

    queue.request(target(1));
    const drain = queue.drain(transitionWith(rec));
    await flush(); // page 1 is now waiting for its office page image
    queue.request(target(2));
    loading.resolve();
    await drain;

    // Page 1's late office result must not add files, paint, merge or broadcast.
    expect(rec.loads).toEqual([1, 2]);
    expect(rec.applied).toEqual([2]);
    expect(rec.broadcasts).toEqual([2]);
    expect(rec.paints).toEqual([1, 2]); // 1 painted while it still owned the switch
  });

  it('drops the broadcast when the switch is superseded while applying the office page', async () => {
    const rec = recorder();
    const queue = new LatestNavigationQueue();
    const applying = deferred<void>();
    const base = rec.steps;
    rec.steps = (t) => ({
      ...base(t),
      // Applying may await (the viewport restore reads IndexedDB).
      applyOfficePage: async () => {
        rec.applied.push(t.page);
        await applying.promise;
      },
    });

    queue.request(target(1));
    const drain = queue.drain(transitionWith(rec));
    await flush(); // page 1 is applying its office page
    queue.request(target(2));
    applying.resolve();
    await drain;

    // Page 1 lost ownership while applying: only page 2 reaches the room.
    expect(rec.applied).toEqual([1, 2]);
    expect(rec.broadcasts).toEqual([2]);
  });

  it('does not queue a redundant switch to the destination already in flight', async () => {
    const rec = recorder();
    const queue = new LatestNavigationQueue();
    const gate = deferred<void>();
    const base = rec.steps;
    rec.steps = (t) => ({
      ...base(t),
      sync: async () => {
        rec.syncs.push(t.page);
        await gate.promise;
      },
    });

    queue.request(target(1));
    const drain = queue.drain(transitionWith(rec));
    // Same destination requested again (e.g. a duplicated presenter message):
    // it must not become a second switch.
    queue.request(target(1));
    gate.resolve();
    await drain;

    expect(rec.syncs).toEqual([1]);
    expect(rec.applied).toEqual([1]);
    expect(queue.canRelease()).toBe(true);
  });

  it('keeps an in-flight transition as owner and drops the target it supersedes', async () => {
    const rec = recorder();
    const queue = new LatestNavigationQueue();
    const gate = deferred<void>();
    const base = rec.steps;
    rec.steps = (t) => ({
      ...base(t),
      sync: async () => {
        rec.syncs.push(t.page);
        if (t.page === 1) {
          await gate.promise;
        }
      },
    });

    queue.request(target(1));
    const drain = queue.drain(transitionWith(rec));
    queue.request(target(2)); // queued but never applied
    queue.request(target(1)); // back to the destination already in flight

    gate.resolve();
    await drain;

    expect(rec.syncs).toEqual([1]);
    expect(rec.paints).toEqual([1]);
    expect(rec.broadcasts).toEqual([1]);
    expect(queue.canRelease()).toBe(true);
  });

  it('keeps draining after a rejected transition', async () => {
    const rec = recorder();
    const queue = new LatestNavigationQueue();
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const gate = deferred<void>();
    const seen: number[] = [];
    const onIdle = vi.fn();

    queue.request(target(2));
    const drain = queue.drain(async (t, isCurrent) => {
      seen.push(t.page);
      if (t.page === 2) {
        await gate.promise;
        throw new Error('hydration failed');
      }
      return runNavigationTransition(t, isCurrent, rec.steps(t));
    }, onIdle);

    await flush();
    queue.request(target(3));
    gate.resolve();
    await drain;

    expect(seen).toEqual([2, 3]);
    expect(rec.applied).toEqual([3]);
    expect(onIdle).toHaveBeenCalledTimes(1);
    error.mockRestore();
  });

  it('switches again to a destination that is requested after it was applied', async () => {
    const rec = recorder();
    const queue = new LatestNavigationQueue();
    const loadingB = deferred<void>();
    const base = rec.steps;
    rec.steps = (t) => ({
      ...base(t),
      sync: async () => {
        rec.syncs.push(t.page);
        if (t.page === 2) {
          await loadingB.promise;
        }
      },
    });

    queue.request(target(1));
    await queue.drain(transitionWith(rec));
    expect(rec.paints).toEqual([1]);

    queue.request(target(2));
    const drain = queue.drain(transitionWith(rec));
    await flush(); // page 2 is hydrating
    queue.request(target(1)); // the user goes back to the page already applied
    loadingB.resolve();
    await drain;

    // The CRDT is at page 2 now, so page 1 must be synced and painted again.
    expect(rec.syncs).toEqual([1, 2, 1]);
    expect(rec.paints).toEqual([1, 1]);
    expect(rec.applied).toEqual([1, 1]);
    expect(rec.broadcasts).toEqual([1, 1]);
  });

  it('loads the office page of the queued target, not of the first request', async () => {
    const loaded: NavigationTarget[] = [];
    const queue = new LatestNavigationQueue();
    const hydratingFileA = deferred<void>();
    const steps = (t: NavigationTarget): NavigationTransitionSteps => ({
      isPresenter: true,
      reset: () => undefined,
      sync: async () => {
        if (t.fileId === 'fileA') {
          await hydratingFileA.promise;
        }
      },
      paint: () => undefined,
      loadOfficePage: async (next) => {
        loaded.push({ ...next });
        return null;
      },
      applyOfficePage: () => undefined,
      broadcast: () => undefined,
    });

    queue.request(target(1, 'fileA'));
    const drain = queue.drain((t, isCurrent) => runNavigationTransition(t, isCurrent, steps(t)));
    await flush();
    queue.request(target(2, 'fileB'));
    hydratingFileA.resolve();
    await drain;

    expect(loaded).toEqual([{ fileId: 'fileB', page: 2 }]);
  });
});

describe('initial navigation ownership', () => {
  it('holds the switch lock until the initial navigation finishes', async () => {
    const queue = new LatestNavigationQueue();
    const onIdle = vi.fn();
    const gate = deferred<void>();
    let stillOwner: boolean | null = null;

    const boot = queue.startBootstrap(async (isCurrent) => {
      await gate.promise;
      stillOwner = isCurrent();
    }, onIdle);

    expect(queue.canRelease()).toBe(false);
    await flush();
    expect(onIdle).not.toHaveBeenCalled();

    gate.resolve();
    await boot;

    expect(stillOwner).toBe(true);
    expect(queue.canRelease()).toBe(true);
    expect(onIdle).toHaveBeenCalledTimes(1);
  });

  it('never switches the CRDT or reaches the room once superseded', async () => {
    const rec = recorder();
    const queue = new LatestNavigationQueue();
    const onIdle = vi.fn();
    const bootSteps: string[] = [];
    const controlSent = deferred<void>();

    const boot = queue.startBootstrap(async (isCurrent) => {
      bootSteps.push('control-broadcast');
      await controlSent.promise; // presenter control broadcast + settle delay
      if (!isCurrent()) {
        bootSteps.push('aborted');
        return;
      }
      bootSteps.push('sync');
    }, onIdle);

    // A presenter-driven page change arrives while the bootstrap is waiting.
    queue.request(target(2));
    const drain = queue.drain(transitionWith(rec), onIdle);
    await drain; // the winner completes before the stale bootstrap resumes
    controlSent.resolve();
    await boot;

    expect(bootSteps).toEqual(['control-broadcast', 'aborted']);
    expect(rec.syncs).toEqual([2]);
    expect(rec.broadcasts).toEqual([2]);
    expect(onIdle).toHaveBeenCalledTimes(1);
    expect(queue.canRelease()).toBe(true);
  });

  it('does not paint when a newer request lands during the initial sync', async () => {
    const rec = recorder();
    const queue = new LatestNavigationQueue();
    const syncing = deferred<void>();
    const painted: string[] = [];

    const boot = queue.startBootstrap(async (isCurrent) => {
      await syncing.promise; // the CRDT switch is in flight
      if (!isCurrent()) {
        return;
      }
      painted.push('init');
    });

    queue.request(target(3));
    const drain = queue.drain(transitionWith(rec));
    syncing.resolve();
    await boot;
    await drain;

    expect(painted).toEqual([]);
    expect(rec.paints).toEqual([3]);
  });

  it('does not invalidate a switch that is already loading its office page', async () => {
    const rec = recorder();
    const queue = new LatestNavigationQueue();
    const officeLoading = deferred<void>();
    const base = rec.steps;
    rec.steps = (t) => {
      const steps = base(t);
      return {
        ...steps,
        loadOfficePage: async (next, isCurrent) => {
          await officeLoading.promise;
          return steps.loadOfficePage(next, isCurrent);
        },
      };
    };
    const bootSteps: string[] = [];
    const onIdle = vi.fn();

    // The switch starts first (e.g. a PDF page change) and is waiting on the
    // office page fetch when the mount timer fires the bootstrap.
    queue.request(target(2));
    const drain = queue.drain(transitionWith(rec), onIdle);
    await flush();

    const boot = queue.startBootstrap(async (isCurrent) => {
      bootSteps.push(`boot:${isCurrent()}`);
    }, onIdle);
    await flush();
    expect(bootSteps).toEqual([]); // waits for the switch instead of superseding it

    officeLoading.resolve();
    await drain;

    // The switch kept ownership: its office page was applied and broadcast.
    expect(rec.applied).toEqual([2]);
    expect(rec.broadcasts).toEqual([2]);

    await boot;
    expect(bootSteps).toEqual(['boot:true']);
    expect(queue.canRelease()).toBe(true);
    expect(onIdle).toHaveBeenCalledTimes(2); // drain releases, then the bootstrap
  });

  it('does not claim over a drain that starts right after the running one settles', async () => {
    const queue = new LatestNavigationQueue();
    const gate = deferred();
    const secondGate = deferred();
    const bootSteps: string[] = [];
    const drainSteps: string[] = [];

    queue.request(target(2));
    const first = queue.drain(async () => {
      await gate.promise;
      return true;
    });

    const boot = queue.startBootstrap(async (isCurrent) => {
      bootSteps.push(`boot:${isCurrent()}`);
      await Promise.resolve();
      bootSteps.push(`boot:${isCurrent()}`);
    });

    // Registered after the bootstrap started waiting, so this continuation runs
    // right after the wait loop and can start a new drain before a later
    // `.then(claimBootstrap)` (the old shape) would have run.
    const second = first.then(() => {
      queue.request(target(3));
      return queue.drain(async (_t, isCurrent) => {
        await secondGate.promise;
        drainSteps.push(`drain:${isCurrent()}`);
        return true;
      });
    });

    gate.resolve();
    await flush();
    secondGate.resolve();
    await Promise.all([boot, second]);

    // The bootstrap starts as owner (the queue was idle when it observed it)
    // and is then superseded; it must not invalidate the new drain.
    expect(bootSteps).toEqual(['boot:true', 'boot:false']);
    expect(drainSteps).toEqual(['drain:true']);
    expect(queue.canRelease()).toBe(true);
  });

  it('starts as owner when the switch completed before the bootstrap timer fired', async () => {
    const rec = recorder();
    const queue = new LatestNavigationQueue();
    const seen: boolean[] = [];

    queue.request(target(2));
    await queue.drain(transitionWith(rec));
    expect(rec.applied).toEqual([2]);

    await queue.startBootstrap(async (isCurrent) => {
      seen.push(isCurrent());
    });

    expect(seen).toEqual([true]);
    expect(queue.canRelease()).toBe(true);
  });
});

describe('office page metadata', () => {
  const pagesOf = (fileId: string) =>
    JSON.stringify([{ id: `${fileId}-page1`, currentPage: 1, isOfficeFile: true }]);

  it('never uses another file page list for a page request', () => {
    expect(findOfficePageFile(pagesOf('fileA'), 'fileA', 'fileA', 1)).toEqual(
      expect.objectContaining({ id: 'fileA-page1' }),
    );
    // The store still describes file A while file B is being navigated.
    expect(findOfficePageFile(pagesOf('fileA'), 'fileB', 'fileA', 1)).toBeNull();
    expect(findOfficePageFile('', 'fileA', 'fileA', 1)).toBeNull();
  });
});
