import { describe, expect, it } from 'vitest';

import TurnFallbackCoordinator, {
  DEFAULT_FALLBACK_TIMER_MS,
  FULL_HEALTH_CLEAR_STREAK,
  RECENT_EPISODE_HISTORY_WINDOW_MS,
  RECURRING_FALLBACK_TIMER_MS,
  SEVERE_FALLBACK_TIMER_MS,
  SUSTAINED_MIN_POOR_RATIO,
  type CoordinatorSample,
  type MediaAdaptationSnapshot,
} from '../TurnFallbackCoordinator';

const FULL_MEDIA: MediaAdaptationSnapshot = {
  degradedMedia: false,
};

const REDUCED_MEDIA: MediaAdaptationSnapshot = {
  degradedMedia: true,
};

/** deterministic 5s monitor cadence */
const MONITOR_INTERVAL_MS = 5000;

type SampleOverrides = Partial<Omit<CoordinatorSample, 'mediaSnapshot'>> & {
  mediaSnapshot?: MediaAdaptationSnapshot;
};

function createFeeder(coordinator: TurnFallbackCoordinator, startAtMs = 1000) {
  let now = startAtMs;
  return {
    feed(overrides: SampleOverrides = {}) {
      const atMs = overrides.atMs ?? (now += MONITOR_INTERVAL_MS);
      now = atMs;
      const sample: CoordinatorSample = {
        atMs,
        connected: true,
        uploadQuality: 'excellent',
        receiveQuality: 'excellent',
        isMyConnectionPoor: false,
        isReceivingPoor: false,
        isLikelyDownloadIssue: false,
        isUploadAudioStuck: false,
        mediaSnapshot: FULL_MEDIA,
        ...overrides,
      };
      return coordinator.ingest(sample);
    },
    current: () => now,
    skipTo: (atMs: number) => {
      now = atMs;
    },
  };
}

const POOR = { uploadQuality: 'poor', isMyConnectionPoor: true } as const;

describe('turn fallback coordinator — episode policy', () => {
  it('transient poor sample never fires and full-media recovery closes the episode', () => {
    const coordinator = new TurnFallbackCoordinator();
    const feeder = createFeeder(coordinator);

    expect(feeder.feed(POOR).shouldFireFallback).toBe(false);

    let cleared = false;
    for (let i = 0; i < FULL_HEALTH_CLEAR_STREAK; i += 1) {
      const decision = feeder.feed();
      expect(decision.shouldFireFallback).toBe(false);
      if (decision.distressCleared) {
        cleared = true;
        expect(decision.closedEpisodes).toBe(1);
      }
    }

    expect(cleared).toBe(true);
  });

  it('fires sustained-poor at the default 30s window with predominantly poor samples', () => {
    const coordinator = new TurnFallbackCoordinator();
    const feeder = createFeeder(coordinator);

    let fired: Awaited<ReturnType<TurnFallbackCoordinator['ingest']>> | null = null;
    for (let i = 0; i < 8; i += 1) {
      const decision = feeder.feed({
        uploadQuality: 'poor',
        isMyConnectionPoor: true,
        isUploadAudioStuck: false,
      });
      if (decision.shouldFireFallback) {
        fired = decision;
        break;
      }
    }

    expect(fired).not.toBeNull();
    expect(fired?.reason).toBe('sustained-poor');
    expect(fired?.episode?.elapsedMs).toBe(DEFAULT_FALLBACK_TIMER_MS);
  });

  it('a brief healthy blip neither clears evidence nor resets the episode start', () => {
    const coordinator = new TurnFallbackCoordinator();
    const feeder = createFeeder(coordinator);

    feeder.feed(POOR);
    feeder.feed(POOR);

    const blip = feeder.feed();
    expect(blip.shouldFireFallback).toBe(false);
    expect(blip.distressCleared).toBe(false);
    expect(blip.episode?.startedAtMs).not.toBeNull();

    // subsequent poor samples keep accumulating against the same start
    let fired = false;
    for (let i = 0; i < 6; i += 1) {
      const decision = feeder.feed(POOR);
      if (decision.shouldFireFallback) {
        fired = true;
        expect(decision.reason).toBe('sustained-poor');
        break;
      }
    }
    expect(fired).toBe(true);
  });

  it('reduced-media health neither fires nor wipes distress evidence', () => {
    const coordinator = new TurnFallbackCoordinator();
    const feeder = createFeeder(coordinator);

    feeder.feed(POOR);
    feeder.feed(POOR);

    // adaptive controller has shed media; quality looks fine but is reduced
    for (let i = 0; i < 4; i += 1) {
      const decision = feeder.feed({ mediaSnapshot: REDUCED_MEDIA });
      expect(decision.shouldFireFallback).toBe(false);
      expect(decision.distressCleared).toBe(false);
      expect(decision.episode).not.toBeNull();
    }

    const resumed = feeder.feed(POOR);
    // episode continuity preserved: elapsed counts from the original start
    expect(resumed.episode?.startedAtMs).toBe(6000);
  });

  it('mere paused video never forces relay', () => {
    const coordinator = new TurnFallbackCoordinator();
    const feeder = createFeeder(coordinator);

    let fired = false;
    for (let i = 0; i < 30; i += 1) {
      const decision = feeder.feed({ mediaSnapshot: REDUCED_MEDIA });
      if (decision.shouldFireFallback) {
        fired = true;
        break;
      }
    }

    expect(fired).toBe(false);
  });

  it('runs a realistic repeated shed → healthy-reduced → restore → poor shed cycle and fires recurring during alternating Poor/Good', () => {
    const coordinator = new TurnFallbackCoordinator();
    const feeder = createFeeder(coordinator);

    // burst 1: two distress samples, then the adaptive controller sheds media
    feeder.feed(POOR);
    feeder.feed(POOR);
    // full → system-degraded transition correlated with real distress:
    // recorded as an adaptation cycle even without full-media closure
    const cycleSample = feeder.feed({
      uploadQuality: 'poor',
      isMyConnectionPoor: true,
      mediaSnapshot: REDUCED_MEDIA,
    });
    expect(cycleSample.shouldFireFallback).toBe(false);
    expect(coordinator.getState().recentMeaningfulEpisodes).toBe(1);

    // healthy while media is still reduced: no recovery, no wipe
    feeder.feed({ mediaSnapshot: REDUCED_MEDIA });
    feeder.feed({ mediaSnapshot: REDUCED_MEDIA });

    // restore: three consecutive full-media healthy samples close the episode
    expect(feeder.feed().distressCleared).toBe(false);
    expect(feeder.feed().distressCleared).toBe(false);
    const cleared = feeder.feed();
    expect(cleared.distressCleared).toBe(true);
    expect(cleared.closedEpisodes).toBe(1);
    // the recorded cycle keeps the recent history bounded to ONE entry
    expect(coordinator.getState().recentMeaningfulEpisodes).toBe(1);

    // burst 2: alternating Poor/Good (overall ratio < 70%) — the recurring
    // path must still fire from the recent meaningful episode history
    let fired: Awaited<ReturnType<TurnFallbackCoordinator['ingest']>> | null = null;
    let elapsed = 0;
    for (let i = 0; i < 8; i += 1) {
      const decision = feeder.feed(i % 2 === 0 ? POOR : {});
      if (decision.shouldFireFallback) {
        fired = decision;
        elapsed = decision.episode?.elapsedMs ?? 0;
        break;
      }
    }

    expect(fired?.reason).toBe('recurring-distress');
    expect(elapsed).toBeGreaterThanOrEqual(RECURRING_FALLBACK_TIMER_MS);
    expect(elapsed).toBeLessThan(DEFAULT_FALLBACK_TIMER_MS);
    // the window's poor ratio is below the sustained bar (alternating)
    const windowLength = fired?.episode?.samples ?? 0;
    expect(windowLength).toBeGreaterThan(0);
  });

  it('alternating Poor/Good without any prior burst stays silent until the burst itself has consumed the sustained window', () => {
    const coordinator = new TurnFallbackCoordinator();
    const feeder = createFeeder(coordinator);

    // within the first 30s of the burst: no accelerated path exists at all
    for (let i = 0; i < 6; i += 1) {
      const decision = feeder.feed(i % 2 === 0 ? POOR : {});
      expect(decision.shouldFireFallback).toBe(false);
    }

    // a 30s+ alternating distress burst IS recorded as a meaningful episode
    // for later bursts — but the SAME burst must never self-accelerate: its
    // own record does not count as a prior independent episode, so the
    // recurring path stays silent through the whole alternating burst
    for (let i = 0; i < 10; i += 1) {
      const decision = feeder.feed(i % 2 === 0 ? POOR : {});
      expect(decision.shouldFireFallback).toBe(false);
    }
    expect(coordinator.getState().recentMeaningfulEpisodes).toBe(1);

    // close the burst with genuine full-media recovery…
    for (let i = 0; i < FULL_HEALTH_CLEAR_STREAK; i += 1) {
      feeder.feed();
    }
    expect(coordinator.getState().closedEpisodes).toBe(1);

    // …then the NEXT independent alternating cycle fires the recurring
    // acceleration: the prior recorded episode is real independent history
    let fired: Awaited<ReturnType<TurnFallbackCoordinator['ingest']>> | null = null;
    for (let i = 0; i < 8; i += 1) {
      const decision = feeder.feed(i % 2 === 0 ? POOR : {});
      if (decision.shouldFireFallback) {
        fired = decision;
        break;
      }
    }
    expect(fired).not.toBeNull();
    expect(fired?.reason).toBe('recurring-distress');
  });

  it('a static pre-paused state never records an adaptation cycle for its distress', () => {
    const coordinator = new TurnFallbackCoordinator();
    const feeder = createFeeder(coordinator);

    // media was already degraded before any distress appeared
    feeder.feed({ mediaSnapshot: REDUCED_MEDIA });
    feeder.feed({ mediaSnapshot: REDUCED_MEDIA });
    expect(coordinator.getState().recentMeaningfulEpisodes).toBe(0);

    // distress while the media is still reduced: there is NO full→degraded
    // transition correlated with distress, so no cycle is recorded and the
    // recurring path cannot fire while the burst is younger than the
    // sustained window
    let fired = false;
    for (let i = 0; i < 5; i += 1) {
      const decision = feeder.feed({
        ...(i % 2 === 0 ? POOR : ({} as SampleOverrides)),
        mediaSnapshot: REDUCED_MEDIA,
      });
      if (decision.shouldFireFallback) {
        fired = true;
      }
    }
    expect(fired).toBe(false);
    expect(coordinator.getState().recentMeaningfulEpisodes).toBe(0);
  });

  it('two isolated single-sample spikes never trigger any path', () => {
    const coordinator = new TurnFallbackCoordinator();
    const feeder = createFeeder(coordinator);

    feeder.feed(POOR);
    for (let i = 0; i < FULL_HEALTH_CLEAR_STREAK; i += 1) {
      feeder.feed();
    }
    // a single distress sample per episode is NOT a meaningful episode
    expect(coordinator.getState().recentMeaningfulEpisodes).toBe(0);

    feeder.feed(POOR);
    for (let i = 0; i < FULL_HEALTH_CLEAR_STREAK; i += 1) {
      feeder.feed();
    }
    expect(coordinator.getState().recentMeaningfulEpisodes).toBe(0);

    // no accelerated path exists for later isolated spikes: with meaningful
    // history the recurring window would have fired by ~15-20s elapsed; the
    // absence of it keeps the burst silent here
    for (let i = 0; i < 4; i += 1) {
      const decision = feeder.feed(i % 2 === 0 ? POOR : {});
      expect(decision.shouldFireFallback).toBe(false);
    }
  });

  it('distant unrelated transients expire from the bounded history and never accelerate later bursts', () => {
    const coordinator = new TurnFallbackCoordinator();
    const feeder = createFeeder(coordinator);

    // a meaningful episode: two distress samples then full recovery
    feeder.feed(POOR);
    feeder.feed(POOR);
    for (let i = 0; i < FULL_HEALTH_CLEAR_STREAK; i += 1) {
      feeder.feed();
    }
    expect(coordinator.getState().recentMeaningfulEpisodes).toBe(1);

    // hidden gap far beyond the recurrence history window: the episode
    // record has expired when the next burst starts
    const nextBurstAt = 1000 + RECENT_EPISODE_HISTORY_WINDOW_MS + 100_000;
    feeder.skipTo(nextBurstAt);
    const first = feeder.feed({ ...POOR, atMs: nextBurstAt });
    expect(first.shouldFireFallback).toBe(false);
    expect(coordinator.getState().recentMeaningfulEpisodes).toBe(0);

    // even with a fresh current make-up burst the accelerated path stays off
    for (let i = 1; i <= 6; i += 1) {
      const decision = feeder.feed({
        ...(i % 2 === 1 ? POOR : ({} as SampleOverrides)),
        atMs: nextBurstAt + i * MONITOR_INTERVAL_MS,
      });
      expect(decision.shouldFireFallback).toBe(false);
    }
  });

  it('a healthy sample between severe samples resets the severe run (Lost/Good/Lost)', () => {
    const coordinator = new TurnFallbackCoordinator();
    const feeder = createFeeder(coordinator, 0);

    const severeSample = (atMs: number) => ({
      uploadQuality: 'lost',
      isMyConnectionPoor: true,
      atMs,
    });

    // first severe sample
    feeder.feed(severeSample(1000));
    expect(coordinator.getState().severeStreak).toBe(1);

    // a healthy sample in between MUST break the consecutive severe run
    feeder.feed({ atMs: 6000 });
    expect(coordinator.getState().severeStreak).toBe(0);

    // the severe confirmation restarts from the second Lost: never a run
    // spanning the healthy gap (Lost/Good/Lost cannot inherit Lost@1s)
    feeder.feed(severeSample(11000));
    expect(coordinator.getState().severeStreak).toBe(1);

    // 15s after the FIRST Lost (t<=16s) must not fire via the gap
    for (const atMs of [16000, 21000]) {
      const decision = feeder.feed(severeSample(atMs));
      expect(decision.shouldFireFallback).toBe(false);
    }

    // only ~15s of CONSECUTIVE severe evidence after the last healthy sample
    // (first severe at 11s → fires at >= 26s) qualifies
    const decision = feeder.feed(severeSample(26000));
    expect(decision.shouldFireFallback).toBe(true);
    expect(decision.reason).toBe('severe-connected-loss');
    expect(decision.episode?.severeElapsedMs).toBe(SEVERE_FALLBACK_TIMER_MS);
  });

  it('a healthy sample between frozen-audio distresses resets the severe run (stuck/healthy/stuck)', () => {
    const coordinator = new TurnFallbackCoordinator();
    const feeder = createFeeder(coordinator, 0);

    const stuckSample = (atMs: number) => ({
      uploadQuality: 'excellent',
      isMyConnectionPoor: false,
      isUploadAudioStuck: true,
      atMs,
    });

    feeder.feed(stuckSample(1000));
    expect(coordinator.getState().severeStreak).toBe(1);

    // healthy in between: severe run reset (excellent/no-stuck sample)
    feeder.feed({ atMs: 6000 });
    expect(coordinator.getState().severeStreak).toBe(0);

    feeder.feed(stuckSample(11000));
    expect(coordinator.getState().severeStreak).toBe(1);

    // no fake 15s run across the healthy gap: 11s+15s = 26s, not 1s+15s
    for (const atMs of [16000, 21000]) {
      const decision = feeder.feed(stuckSample(atMs));
      expect(decision.shouldFireFallback).toBe(false);
    }

    const decision = feeder.feed(stuckSample(26000));
    expect(decision.shouldFireFallback).toBe(true);
    expect(decision.reason).toBe('severe-connected-loss');
  });

  it('a first adaptation degradation (at 10s) never enables the recurring path for its own burst', () => {
    const coordinator = new TurnFallbackCoordinator();
    const feeder = createFeeder(coordinator, 0);

    // distress starts; the adaptive controller sheds media at the ~10s mark
    feeder.feed({ ...POOR, atMs: 5000 });
    const degrading = feeder.feed({
      ...POOR,
      atMs: 10000,
      mediaSnapshot: REDUCED_MEDIA,
    });
    expect(degrading.shouldFireFallback).toBe(false);

    // the transition recorded the CURRENT episode as history…
    expect(coordinator.getState().recentMeaningfulEpisodes).toBe(1);

    // …yet the SAME burst may not fire recurring at the 15s window: its own
    // record is not a PRIOR independent episode
    for (const atMs of [15000, 20000, 25000]) {
      const decision = feeder.feed({ ...POOR, atMs, mediaSnapshot: REDUCED_MEDIA });
      expect(decision.shouldFireFallback).toBe(false);
    }

    // the burst eventually falls through to the sustained path (all-poor):
    // the sustained window completes 30s after the episode start (5s), i.e. at 35s
    const decision = feeder.feed({ ...POOR, atMs: 35000, mediaSnapshot: REDUCED_MEDIA });
    expect(decision.shouldFireFallback).toBe(true);
    expect(decision.reason).toBe('sustained-poor');
  });

  it('a burst that consumed its full sustained window still stays silent on alternating quality', () => {
    const coordinator = new TurnFallbackCoordinator();
    const feeder = createFeeder(coordinator);

    /*
     * Compressed 2.5s cadence: the alternating burst still CONSUMES the full
     * 30s sustained window (same sample counts and behavior at the 5s
     * cadence), but the whole scenario stays inside the bounded 120s
     * recent-history window, which is exactly what the next assertion uses.
     */
    const CADENCE_MS = 2500;
    let nextAtMs = 1000;
    const feedAt = (overrides: SampleOverrides = {}) =>
      feeder.feed({ ...overrides, atMs: (nextAtMs += CADENCE_MS) });

    // alternating Poor/Good stays below the sustained 70% ratio forever
    for (let i = 0; i < 16; i += 1) {
      const decision = feedAt(i % 2 === 0 ? POOR : {});
      expect(decision.shouldFireFallback).toBe(false);
    }

    // past the 30s window the burst is recorded as meaningful history…
    expect(coordinator.getState().recentMeaningfulEpisodes).toBe(1);

    // …but never fires within its own episode: no prior independent cycle
    for (let i = 0; i < 10; i += 1) {
      const decision = feedAt(i % 2 === 0 ? POOR : {});
      expect(decision.shouldFireFallback).toBe(false);
    }

    // genuine full-media recovery closes and records the burst…
    for (let i = 0; i < FULL_HEALTH_CLEAR_STREAK; i += 1) {
      feedAt();
    }
    expect(coordinator.getState().closedEpisodes).toBe(1);

    // …and the NEXT independent alternating cycle fires recurring from the
    // prior recorded episode (well after the 15s shortened window)
    let fired: Awaited<ReturnType<TurnFallbackCoordinator['ingest']>> | null = null;
    for (let i = 0; i < 8; i += 1) {
      const decision = feedAt(i % 2 === 0 ? POOR : {});
      if (decision.shouldFireFallback) {
        fired = decision;
        break;
      }
    }
    expect(fired).not.toBeNull();
    expect(fired?.reason).toBe('recurring-distress');
  });

  it('severe connected loss fires on the faster ~15s path, only with repeated confirmation', () => {
    const coordinator = new TurnFallbackCoordinator();
    const feeder = createFeeder(coordinator, 0);

    const severeSample = (atMs: number) => ({
      uploadQuality: 'lost',
      isMyConnectionPoor: true,
      atMs,
    });

    let decision = feeder.feed(severeSample(1000));
    expect(decision.shouldFireFallback).toBe(false);

    decision = feeder.feed(severeSample(6000));
    expect(decision.shouldFireFallback).toBe(false);

    decision = feeder.feed(severeSample(11000));
    expect(decision.shouldFireFallback).toBe(false);

    // 15s elapsed with still-fresh severe evidence qualifies
    decision = feeder.feed(severeSample(16000));
    expect(decision.shouldFireFallback).toBe(true);
    expect(decision.reason).toBe('severe-connected-loss');
    expect(decision.episode?.elapsedMs).toBe(SEVERE_FALLBACK_TIMER_MS);
  });

  it('a single late Lost sample after ordinary Poor does NOT immediately fire severe', () => {
    const coordinator = new TurnFallbackCoordinator();
    const feeder = createFeeder(coordinator, 0);

    // ordinary poor for 10s...
    feeder.feed({ uploadQuality: 'poor', isMyConnectionPoor: true, atMs: 5000 });
    feeder.feed({ uploadQuality: 'poor', isMyConnectionPoor: true, atMs: 10000 });

    // ...one late Lost inherits none of it: severe run has just started
    const lateLost = feeder.feed({ uploadQuality: 'lost', isMyConnectionPoor: true, atMs: 15000 });
    expect(lateLost.shouldFireFallback).toBe(false);
    expect(lateLost.reason).toBeNull();

    // second severe sample only 5s into the severe run: still not enough
    const second = feeder.feed({ uploadQuality: 'lost', isMyConnectionPoor: true, atMs: 20000 });
    expect(second.shouldFireFallback).toBe(false);

    // only when the severe run itself spans 15s does the severe path fire
    const fired = feeder.feed({ uploadQuality: 'lost', isMyConnectionPoor: true, atMs: 30000 });
    expect(fired.shouldFireFallback).toBe(true);
    expect(fired.reason).toBe('severe-connected-loss');
    expect(fired.episode?.severeElapsedMs).toBe(SEVERE_FALLBACK_TIMER_MS);
  });

  it('a non-severe distress sample breaks the severe confirmation streak', () => {
    const coordinator = new TurnFallbackCoordinator();
    const feeder = createFeeder(coordinator, 0);

    const lost = (atMs: number) => ({ uploadQuality: 'lost', isMyConnectionPoor: true, atMs });
    const poor = (atMs: number) => ({ uploadQuality: 'poor', isMyConnectionPoor: true, atMs });

    feeder.feed(lost(5000));
    feeder.feed(lost(10000));

    // ordinary poor resets the severe run
    feeder.feed(poor(15000));

    feeder.feed(lost(20000));
    const before = feeder.feed(lost(25000));
    expect(before.shouldFireFallback).toBe(false);

    // severe run restarted at 20000: fires once it spans 15s
    const fired = feeder.feed(lost(35000));
    expect(fired.shouldFireFallback).toBe(true);
    expect(fired.reason).toBe('severe-connected-loss');
  });

  it('frozen outbound audio is treated as severe evidence', () => {
    const coordinator = new TurnFallbackCoordinator();
    const feeder = createFeeder(coordinator);

    feeder.feed({ uploadQuality: 'poor', isMyConnectionPoor: true, isUploadAudioStuck: true });

    let fired: Awaited<ReturnType<TurnFallbackCoordinator['ingest']>> | null = null;
    for (let i = 0; i < 8; i += 1) {
      const decision = feeder.feed({
        uploadQuality: 'poor',
        isMyConnectionPoor: true,
        isUploadAudioStuck: true,
      });
      if (decision.shouldFireFallback) {
        fired = decision;
        break;
      }
    }

    expect(fired?.reason).toBe('severe-connected-loss');
  });

  it('outbound audio stuck with excellent upload quality is independent distress and fires the severe path', () => {
    const coordinator = new TurnFallbackCoordinator();
    const feeder = createFeeder(coordinator, 0);

    // upload RTT/loss look great; audio is dead
    const stuck = (atMs: number) => ({
      uploadQuality: 'excellent',
      receiveQuality: 'excellent',
      isMyConnectionPoor: false,
      isUploadAudioStuck: true,
      atMs,
    });

    const a = feeder.feed(stuck(5000));
    expect(a.shouldFireFallback).toBe(false);
    expect(a.episode?.startedAtMs).not.toBeNull();

    const b = feeder.feed(stuck(10000));
    expect(b.shouldFireFallback).toBe(false);

    const c = feeder.feed(stuck(15000));
    expect(c.shouldFireFallback).toBe(false);

    const fired = feeder.feed(stuck(20000));
    expect(fired.shouldFireFallback).toBe(true);
    expect(fired.reason).toBe('severe-connected-loss');
  });

  it('confirmed local downlink distress requires BOTH receive-poor and download-issue', () => {
    const coordinator = new TurnFallbackCoordinator();
    const feeder = createFeeder(coordinator);

    // unconfirmed remote receive issue: never a local transport distress
    for (let i = 0; i < 30; i += 1) {
      const decision = feeder.feed({
        receiveQuality: 'poor',
        isReceivingPoor: true,
        isLikelyDownloadIssue: false,
      });
      expect(decision.shouldFireFallback).toBe(false);
    }

    // confirmed downlink distress accumulates and fires
    for (let i = 0; i < 8; i += 1) {
      const decision = feeder.feed({
        receiveQuality: 'poor',
        isReceivingPoor: true,
        isLikelyDownloadIssue: true,
      });
      if (decision.shouldFireFallback) {
        expect(['recurring-distress', 'sustained-poor', 'severe-connected-loss']).toContain(
          decision.reason,
        );
        return;
      }
    }

    expect.unreachable('confirmed downlink distress should eventually fire');
  });

  it('disconnected samples are not measured and reset pending evidence', () => {
    const coordinator = new TurnFallbackCoordinator();
    const feeder = createFeeder(coordinator);

    feeder.feed(POOR);

    const syntheticLost = feeder.feed({
      connected: false,
      uploadQuality: 'lost',
      receiveQuality: 'lost',
      isMyConnectionPoor: true,
      isReceivingPoor: true,
      isLikelyDownloadIssue: true,
    });
    expect(syntheticLost.shouldFireFallback).toBe(false);
    expect(syntheticLost.episode).toBeNull();

    // evidence must restart from scratch: not 2 samples before requalification
    expect(feeder.feed(POOR).shouldFireFallback).toBe(false);
    expect(feeder.feed(POOR).shouldFireFallback).toBe(false);

    // only after a fresh full window does any path qualify
    let firedAt = 0;
    for (let i = 0; i < 10; i += 1) {
      const decision = feeder.feed(POOR);
      if (decision.shouldFireFallback) {
        firedAt = decision.episode?.elapsedMs ?? 0;
        expect(decision.episode?.distressSamples).toBeGreaterThanOrEqual(3);
        break;
      }
    }
    expect(firedAt).toBeGreaterThanOrEqual(RECURRING_FALLBACK_TIMER_MS);
  });

  it('a hidden gap invalidates prior evidence and restarts the elapsed baseline', () => {
    const coordinator = new TurnFallbackCoordinator();
    const startAtMs = 1000;
    const feeder = createFeeder(coordinator, startAtMs);

    feeder.feed(POOR);

    // simulate hidden tab: one interval-skip of 40s (> MAX_SAMPLE_GAP_MS)
    feeder.skipTo(startAtMs + 40_000);

    const decision = feeder.feed({
      uploadQuality: 'poor',
      isMyConnectionPoor: true,
      atMs: startAtMs + 40_000 + MONITOR_INTERVAL_MS,
    });

    expect(decision.episode?.startedAtMs).toBe(startAtMs + 40_000 + MONITOR_INTERVAL_MS);
    expect(decision.shouldFireFallback).toBe(false);
  });

  it('recurring distress fires on the shortened ~15s window after a recent meaningful episode', () => {
    const coordinator = new TurnFallbackCoordinator();
    const feeder = createFeeder(coordinator);

    // episode 1: two poor samples, then full-media health closes it
    feeder.feed(POOR);
    feeder.feed(POOR);
    for (let i = 0; i < FULL_HEALTH_CLEAR_STREAK; i += 1) {
      feeder.feed();
    }
    expect(coordinator.getState().closedEpisodes).toBe(1);
    expect(coordinator.getState().recentMeaningfulEpisodes).toBe(1);

    // episode 2: 3 distress samples ≈ 10-15s → not yet at 10s elapsed
    feeder.feed(POOR);
    feeder.feed(POOR);
    const before = feeder.feed(POOR);
    expect(before.shouldFireFallback).toBe(false);

    const decision = feeder.feed(POOR);
    expect(decision.shouldFireFallback).toBe(true);
    expect(decision.reason).toBe('recurring-distress');
  });

  it('brief (1-2 sample) full-media recovery does not close the episode', () => {
    const coordinator = new TurnFallbackCoordinator();
    const feeder = createFeeder(coordinator);

    feeder.feed(POOR);
    feeder.feed();
    feeder.feed();
    feeder.feed(POOR);

    expect(coordinator.getState().closedEpisodes).toBe(0);
    expect(coordinator.getState().episodeStartedAtMs).not.toBeNull();
  });

  it('unknown/missing quality stats are not definitive recovery evidence', () => {
    const coordinator = new TurnFallbackCoordinator();
    const feeder = createFeeder(coordinator);

    feeder.feed(POOR);

    for (let i = 0; i < 6; i += 1) {
      const decision = feeder.feed({ uploadQuality: '', receiveQuality: '' });
      expect(decision.distressCleared).toBe(false);
    }

    expect(coordinator.getState().closedEpisodes).toBe(0);
  });

  it('full-health streak resets on unknown and reduced-media samples (consecutive recovery required)', () => {
    const coordinator = new TurnFallbackCoordinator();
    const feeder = createFeeder(coordinator);

    feeder.feed(POOR);

    // full health #1...
    expect(feeder.feed().distressCleared).toBe(false);
    // ...broken by an unknown sample
    feeder.feed({ uploadQuality: '', receiveQuality: '' });
    // full health #2...
    expect(feeder.feed().distressCleared).toBe(false);
    // ...broken again by a REDUCED-media healthy sample
    feeder.feed({ mediaSnapshot: REDUCED_MEDIA });

    // only 3 CONSECUTIVE full-media healthy samples close the episode
    expect(feeder.feed().distressCleared).toBe(false);
    expect(feeder.feed().distressCleared).toBe(false);
    const closed = feeder.feed();

    expect(closed.distressCleared).toBe(true);
    expect(closed.closedEpisodes).toBe(1);
  });

  it('ignores invalid and out-of-order sample timestamps', () => {
    const coordinator = new TurnFallbackCoordinator();
    const feeder = createFeeder(coordinator, 0);

    feeder.feed({ ...POOR, atMs: 10000 });

    const outOfOrder = feeder.feed({ ...POOR, atMs: 5000 });
    expect(outOfOrder.shouldFireFallback).toBe(false);
    // the earlier sample did not reset or corrupt the episode
    expect(coordinator.getState().episodeStartedAtMs).toBe(10000);

    const invalid = feeder.feed({ ...POOR, atMs: Number.NaN });
    expect(invalid.shouldFireFallback).toBe(false);
    expect(coordinator.getState().episodeStartedAtMs).toBe(10000);
  });

  it('honors a valid positive server-provided timer override', () => {
    const coordinator = new TurnFallbackCoordinator();
    coordinator.configure({ fallbackTimerMs: 10_000 });
    const feeder = createFeeder(coordinator);

    let decision = feeder.feed(POOR);
    decision = feeder.feed(POOR);
    expect(decision.shouldFireFallback).toBe(false);

    decision = feeder.feed(POOR);
    expect(decision.shouldFireFallback).toBe(true);
    expect(['sustained-poor', 'severe-connected-loss', 'recurring-distress']).toContain(
      decision.reason,
    );
  });

  it('rejects non-finite or non-positive timer overrides and keeps the default', () => {
    const coordinator = new TurnFallbackCoordinator();
    coordinator.configure({ fallbackTimerMs: 0 });
    coordinator.configure({ fallbackTimerMs: -5_000 });
    coordinator.configure({ fallbackTimerMs: Number.NaN });
    coordinator.configure({ fallbackTimerMs: Number.POSITIVE_INFINITY });

    const feeder = createFeeder(coordinator);

    // at 10s elapsed with the default window: no sustained fire
    feeder.feed(POOR);
    feeder.feed(POOR);
    expect(feeder.feed(POOR).shouldFireFallback).toBe(false);
  });

  it('sanitizes a non-finite initial configuration', () => {
    // the constructor must apply the same sanitization as configure()
    const coordinator = new TurnFallbackCoordinator({
      fallbackTimerMs: Number.NaN,
      flapping: { maxPoorConnCount: Number.NaN, checkDurationMs: Number.NaN },
    });

    // defaults survive: the 30s window is still required
    const feeder = createFeeder(coordinator);
    feeder.feed(POOR);
    feeder.feed(POOR);
    expect(feeder.feed(POOR).shouldFireFallback).toBe(false);

    // flapping still uses the default maxPoorConnCount of 3
    coordinator.configure({ flapping: { enabled: true } });
    // continue AFTER the first phase's timestamps (monotonic samples)
    const flappingFeeder = createFeeder(coordinator, 20_000);
    flappingFeeder.feed(POOR);
    flappingFeeder.feed(POOR);
    const flappingDecision = flappingFeeder.feed(POOR);
    expect(flappingDecision.shouldFireFallback).toBe(true);
    expect(flappingDecision.reason).toBe('flapping');
  });

  it('flapping keeps sample-count maxPoor/window semantics', () => {
    const coordinator = new TurnFallbackCoordinator();
    coordinator.configure({
      flapping: { enabled: true, maxPoorConnCount: 3, checkDurationMs: 120_000 },
    });
    const feeder = createFeeder(coordinator);

    expect(feeder.feed(POOR).shouldFireFallback).toBe(false);
    expect(feeder.feed(POOR).shouldFireFallback).toBe(false);

    const decision = feeder.feed(POOR);
    expect(decision.shouldFireFallback).toBe(true);
    expect(decision.reason).toBe('flapping');
    // window restarted after the trigger
    expect(coordinator.getState().poorSamplesInWindow).toBe(0);
  });

  it('flapping counts only isMyConnectionPoor and trims by window', () => {
    const coordinator = new TurnFallbackCoordinator();
    coordinator.configure({
      flapping: { enabled: true, maxPoorConnCount: 3, checkDurationMs: 120_000 },
    });
    const feeder = createFeeder(coordinator);

    // confirmed downlink distress alone does NOT count in flapping mode
    feeder.feed({ receiveQuality: 'poor', isReceivingPoor: true, isLikelyDownloadIssue: true });
    expect(coordinator.getState().poorSamplesInWindow).toBe(0);

    feeder.feed(POOR);
    feeder.feed(POOR);

    // far outside the 120s window: trimmed, no fire
    feeder.skipTo(1000 + 200_000);
    const decision = feeder.feed({
      uploadQuality: 'poor',
      isMyConnectionPoor: true,
      atMs: 1000 + 200_000,
    });
    expect(decision.shouldFireFallback).toBe(false);
    expect(coordinator.getState().poorSamplesInWindow).toBe(1);
  });

  it('flapping poor timestamps survive disconnected and short hidden gaps', () => {
    const coordinator = new TurnFallbackCoordinator();
    coordinator.configure({
      flapping: { enabled: true, maxPoorConnCount: 4, checkDurationMs: 120_000 },
    });
    const feeder = createFeeder(coordinator);

    feeder.feed(POOR);

    // a disconnected synthetic sample does not count and does not wipe flapping
    feeder.feed({ connected: false, uploadQuality: 'lost', isMyConnectionPoor: true });
    expect(feeder.feed(POOR).shouldFireFallback).toBe(false);
    expect(feeder.feed(POOR).shouldFireFallback).toBe(false);

    // the three real poor samples are still in the window
    expect(coordinator.getState().poorSamplesInWindow).toBe(3);

    // short hidden gap inside the flapping window (5s cadence resumes 25s later)
    feeder.skipTo(1000 + 45_000);
    const decision = feeder.feed({ ...POOR, atMs: 1000 + 45_000 });
    expect(decision.shouldFireFallback).toBe(true);
    expect(decision.reason).toBe('flapping');
  });

  it('reset() clears all evidence including the recent episode history', () => {
    const coordinator = new TurnFallbackCoordinator();
    const feeder = createFeeder(coordinator);

    feeder.feed(POOR);
    feeder.feed(POOR);
    for (let i = 0; i < FULL_HEALTH_CLEAR_STREAK; i += 1) {
      feeder.feed();
    }
    expect(coordinator.getState().recentMeaningfulEpisodes).toBe(1);

    coordinator.reset();

    const state = coordinator.getState();
    expect(state.closedEpisodes).toBe(0);
    expect(state.episodeStartedAtMs).toBeNull();
    expect(state.episodeSamples).toBe(0);
    expect(state.recentMeaningfulEpisodes).toBe(0);

    // after reset the next burst within the recurrence window cannot use an
    // accelerated path (history/episodes are gone)
    const feeder2 = createFeeder(coordinator);
    for (let i = 0; i < 6; i += 1) {
      const decision = feeder2.feed(i % 2 === 0 ? POOR : {});
      expect(decision.shouldFireFallback).toBe(false);
    }
  });

  it('keeps the sustained poor ratio at the documented threshold', () => {
    expect(SUSTAINED_MIN_POOR_RATIO).toBe(0.7);
  });

  it('instances keep evidence, decisions, and configuration independent', () => {
    // regression for the class refactor: coordinator state must be strictly
    // per instance, with no shared or leaking module-level state
    const firstCoordinator = new TurnFallbackCoordinator();
    const secondCoordinator = new TurnFallbackCoordinator();
    const first = createFeeder(firstCoordinator);
    const second = createFeeder(secondCoordinator);

    // only the first instance accumulates and fires a severe episode
    const severeSample = (atMs: number) => ({
      uploadQuality: 'lost',
      isMyConnectionPoor: true,
      atMs,
    });
    let firstFired = false;
    for (const atMs of [1000, 6000, 11000, 16000]) {
      if (first.feed(severeSample(atMs)).shouldFireFallback) firstFired = true;
    }
    expect(firstFired).toBe(true);

    // the sibling instance holds no evidence from the other's samples
    expect(secondCoordinator.getState()).toEqual({
      closedEpisodes: 0,
      episodeStartedAtMs: null,
      episodeDistressSamples: 0,
      episodeSamples: 0,
      severeStreak: 0,
      recentMeaningfulEpisodes: 0,
      poorSamplesInWindow: 0,
    });
    expect(second.feed(POOR).shouldFireFallback).toBe(false);

    // configuration is applied per instance as well
    firstCoordinator.configure({
      flapping: { enabled: true, maxPoorConnCount: 2, checkDurationMs: 60_000 },
    });
    expect(first.feed({ ...POOR, atMs: 21_000 }).shouldFireFallback).toBe(false);
    expect(first.feed({ ...POOR, atMs: 26_000 }).shouldFireFallback).toBe(true);
    // the second instance still follows the unchanged default episode policy
    expect(second.feed(POOR).shouldFireFallback).toBe(false);
  });
});
