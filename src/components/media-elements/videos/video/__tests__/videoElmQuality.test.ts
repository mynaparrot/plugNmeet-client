/*
 * Effect-contract test: Redux roomVideoQuality -> VideoElm useEffect ->
 * RemoteTrackPublication.setVideoQuality. The real VideoElm render runs directly
 * (no react-dom); react is mocked via importOriginal, replacing only the hooks it
 * calls, with forwardRef unwrapped and useRef -> { current: null } so the unrelated
 * track-attach/NATS effects stay inert via their `if (!el)` guard. Only useEffect's
 * Object.is deps check is emulated. setVideoQuality is a mocked SDK boundary, so no
 * SFU bandwidth/layer/subscription or browser behaviour is claimed.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LocalTrackPublication, RemoteTrackPublication } from 'livekit-client';

import VideoElm from '../videoElm';

const HIGH = 2;
const LOW = 0;

/* Minimal hook stub: only useEffect tracks per-call previous deps under Object.is. */
const hooks = vi.hoisted(() => {
  type Deps = readonly unknown[];
  type EffectCb = () => void | (() => void);
  const previousDeps: (Deps | undefined)[] = [];
  let pending: { index: number; deps: Deps | undefined; cb: EffectCb }[] = [];
  let index = 0;
  const sameDeps = (a: Deps | undefined, b: Deps | undefined): boolean =>
    a !== undefined &&
    b !== undefined &&
    a.length === b.length &&
    a.every((value, i) => Object.is(value, b[i]));
  return {
    begin(): void {
      index = 0;
      pending = [];
    },
    reset(): void {
      previousDeps.length = 0;
      pending = [];
      index = 0;
    },
    useRef(): { current: null } {
      index++;
      return { current: null };
    },
    useState(): [boolean, () => void] {
      index++;
      return [false, () => {}];
    },
    useMemo<T>(factory: () => T): T {
      index++;
      return factory();
    },
    useCallback<T>(callback: T): T {
      index++;
      return callback;
    },
    useEffect(cb: EffectCb, deps: Deps | undefined): void {
      const slot = index++;
      if (!sameDeps(previousDeps[slot], deps)) {
        pending.push({ index: slot, deps, cb });
      }
    },
    commit(): void {
      const queued = pending;
      pending = [];
      for (const item of queued) {
        previousDeps[item.index] = item.deps;
        item.cb();
      }
    },
  };
});

/* Store snapshot read directly by the mocked selector (no subscription involved). */
const harness = vi.hoisted(() => ({
  state: {
    roomSettings: {
      roomVideoQuality: 2, // VideoQuality.HIGH
      videoObjectFit: 'cover',
      isNatsServerConnected: false,
    },
  },
}));

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  return {
    ...actual,
    forwardRef: (render: unknown) => render,
    useRef: hooks.useRef,
    useState: hooks.useState,
    useMemo: hooks.useMemo,
    useCallback: hooks.useCallback,
    useEffect: hooks.useEffect,
    useImperativeHandle: () => {},
  } as unknown as typeof actual;
});

vi.mock('livekit-client', () => {
  /* Shares setVideoQuality so removing the production instanceof guard makes the
   * "local publications are skipped" assertion fail loudly. */
  class PublicationStub {
    trackName: string;
    videoTrack = undefined;
    qualityCalls: number[] = [];

    constructor(trackName = 'camera') {
      this.trackName = trackName;
    }

    setVideoQuality(quality: number) {
      this.qualityCalls.push(quality);
    }
  }
  return {
    RemoteTrackPublication: class extends PublicationStub {},
    LocalTrackPublication: class extends PublicationStub {},
  };
});

vi.mock('../../../../../store', () => ({
  useAppSelector: (selector: (state: typeof harness.state) => unknown) => selector(harness.state),
}));

vi.mock('../../../../../assets/Icons/Loading', () => ({
  LoadingIcon: () => null,
}));

interface PublicationStub {
  trackName: string;
  qualityCalls: number[];
}

type PublicationCtor = new (trackName?: string) => PublicationStub;
const makeRemote = (trackName = 'camera'): PublicationStub =>
  new (RemoteTrackPublication as unknown as PublicationCtor)(trackName);
const makeLocal = (trackName = 'camera'): PublicationStub =>
  new (LocalTrackPublication as unknown as PublicationCtor)(trackName);

const renderVideoElm = VideoElm as unknown as (
  props: { track: PublicationStub },
  ref: unknown,
) => unknown;

/* One render pass of the real component plus its committed effects. */
function render(track: PublicationStub): void {
  hooks.begin();
  renderVideoElm({ track }, null);
  hooks.commit();
}

/* Simulate the room-settings UI committing a new quality to Redux. */
function changeQuality(quality: number): void {
  harness.state.roomSettings.roomVideoQuality = quality;
}

beforeEach(() => {
  hooks.reset();
  harness.state.roomSettings.roomVideoQuality = HIGH;
});

describe('VideoElm — Redux roomVideoQuality drives RemoteTrackPublication.setVideoQuality', () => {
  it('applies the current Redux quality to a remote publication on mount', () => {
    const remote = makeRemote();
    render(remote);
    expect(remote.qualityCalls).toEqual([HIGH]);
  });

  it('uses the live Redux value (not a hardcoded default) when it is not HIGH at mount', () => {
    changeQuality(LOW);
    const remote = makeRemote();
    render(remote);
    expect(remote.qualityCalls).toEqual([LOW]);
  });

  it('re-applies the quality across a HIGH -> LOW -> restored value change', () => {
    const remote = makeRemote();
    render(remote);
    expect(remote.qualityCalls).toEqual([HIGH]);
    changeQuality(LOW);
    render(remote);
    expect(remote.qualityCalls).toEqual([HIGH, LOW]);
    changeQuality(HIGH);
    render(remote);
    expect(remote.qualityCalls).toEqual([HIGH, LOW, HIGH]);
  });

  it('delivers the current quality to a replacement publication and skips identical rerenders', () => {
    const first = makeRemote();
    render(first);
    changeQuality(LOW);
    render(first);
    expect(first.qualityCalls).toEqual([HIGH, LOW]);
    const second = makeRemote();
    render(second);
    // new publication identity re-runs the effect with the *current* quality
    expect(second.qualityCalls).toEqual([LOW]);
    // the previous publication is not re-notified
    expect(first.qualityCalls).toEqual([HIGH, LOW]);

    // identical rerender (same track, same quality): deps unchanged -> no resend
    render(second);
    expect(second.qualityCalls).toEqual([LOW]);
    changeQuality(HIGH);
    render(second);
    expect(second.qualityCalls).toEqual([LOW, HIGH]);
  });

  it('never sends remote quality requests to a local publication', () => {
    const local = makeLocal();
    render(local);
    changeQuality(LOW);
    render(local);
    changeQuality(HIGH);
    render(local);
    render(local);
    expect(local.qualityCalls).toEqual([]);
  });
});
