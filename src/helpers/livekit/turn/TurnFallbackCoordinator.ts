/*
 * TURN fallback coordinator (quality-fallback decision engine). Pure and
 * dependency-free; the controller feeds one sample per quality check and
 * fires one of:
 *   - severe: 2+ consecutive severe samples spanning 15s
 *   - sustained: >=70% distress over a window >=3 samples spanning the
 *     server-configured timer (default 30s)
 *   - recurring: prior meaningful episodes (<=120s old, >=2 distress
 *     samples) shorten the window to 15s
 *   - flapping: legacy `fallback_on_flapping` sample-count mode; replaces
 *     all paths above
 *
 * Full media health alone (no distress, good quality both ways, no adaptive
 * shedding) closes an episode; disconnected samples are not measured
 * distress; hidden-tab gaps invalidate episode evidence.
 */

export type CoordinatorQuality = string;

/**
 * Matches the values of PnmConnectionQuality ('excellent' | 'good' | 'poor' |
 * 'lost'); typed as plain strings so this module stays import-free.
 */
export const QUALITY_EXCELLENT = 'excellent';
export const QUALITY_GOOD = 'good';
export const QUALITY_POOR = 'poor';
export const QUALITY_LOST = 'lost';

/** Default consolidation window; mirrors the server's 30s default. */
export const DEFAULT_FALLBACK_TIMER_MS = 30_000;
/** Faster path for repeated confirmed severe loss / frozen audio. */
export const SEVERE_FALLBACK_TIMER_MS = 15_000;
/** Severe evidence must be confirmed by consecutive severe samples. */
export const SEVERE_MIN_STREAK = 2;
/** Shortened window once meaningful distress has recurred recently. */
export const RECURRING_FALLBACK_TIMER_MS = 15_000;
/** Real distress samples required inside the current burst before it fires. */
export const RECURRING_MIN_DISTRESS_SAMPLES = 2;
/** Prior recent meaningful episodes after which the recurring path activates. */
export const RECURRING_EPISODE_THRESHOLD = 2;
/** Minimum real distress samples making a recorded episode meaningful. */
export const EPISODE_RECORD_MIN_DISTRESS = 2;
/** Recent history window; older recorded episodes/cycles are pruned. */
export const RECENT_EPISODE_HISTORY_WINDOW_MS = 120_000;
/** History is bounded; the oldest entries are dropped beyond this count. */
export const RECENT_EPISODE_HISTORY_MAX = 8;

/** Samples older than this (hidden tab, stalled monitor) invalidate evidence. */
export const MAX_SAMPLE_GAP_MS = 20_000;
/** Sliding window of recent in-episode samples used for the distress ratio. */
export const EVIDENCE_WINDOW_SIZE = 8;
/** Minimum samples in the window before the sustained path fires. */
export const SUSTAINED_MIN_SAMPLES = 3;
/** Predominantly-poor ratio required by the sustained path. */
export const SUSTAINED_MIN_POOR_RATIO = 0.7;
/** Consecutive full-media healthy samples that close a distress episode. */
export const FULL_HEALTH_CLEAR_STREAK = 3;

export type TurnFallbackReason =
  | 'sustained-poor'
  | 'severe-connected-loss'
  | 'recurring-distress'
  | 'flapping';

export type MediaAdaptationSnapshot = {
  /** any adaptive pause active (incoming webcams/screenshare, own camera) */
  degradedMedia: boolean;
};

export type CoordinatorSample = {
  atMs: number;
  /** room state === Connected AND the sample was actually measured */
  connected: boolean;
  uploadQuality: CoordinatorQuality;
  receiveQuality: CoordinatorQuality;
  isMyConnectionPoor: boolean;
  isReceivingPoor: boolean;
  isLikelyDownloadIssue: boolean;
  isUploadAudioStuck: boolean;
  mediaSnapshot: MediaAdaptationSnapshot;
};

export type CoordinatorDecision = {
  shouldFireFallback: boolean;
  reason: TurnFallbackReason | null;
  /** episodes closed with sustained full-media recovery during the session */
  closedEpisodes: number;
  episode: {
    startedAtMs: number | null;
    elapsedMs: number;
    /** distress samples counted during the current episode */
    distressSamples: number;
    /** all samples seen during the current episode */
    samples: number;
    severeStreak: number;
    severeElapsedMs: number | null;
  } | null;
  /** true when this sample closed an episode via sustained full-media health */
  distressCleared: boolean;
  /** poor-upload sample count currently held by the flapping scanner */
  poorSamplesInWindow: number;
};

export type TurnFallbackCoordinatorConfig = {
  /** consolidation window in ms; only honored when finite positive */
  fallbackTimerMs: number;
  flapping: {
    enabled: boolean;
    maxPoorConnCount: number;
    checkDurationMs: number;
  };
};

/** accepts partial flapping settings for configure()/initial config */
export type TurnFallbackCoordinatorPartialConfig = Partial<
  Omit<TurnFallbackCoordinatorConfig, 'flapping'>
> & {
  flapping?: Partial<TurnFallbackCoordinatorConfig['flapping']>;
};

export type TurnFallbackCoordinator = {
  configure: (config: TurnFallbackCoordinatorPartialConfig) => void;
  ingest: (sample: CoordinatorSample) => CoordinatorDecision;
  /** clears all evidence (reconnect / hidden boundary / disconnect) */
  reset: () => void;
  /** bounded state snapshot for logging and tests */
  getState: () => {
    closedEpisodes: number;
    episodeStartedAtMs: number | null;
    episodeDistressSamples: number;
    episodeSamples: number;
    severeStreak: number;
    recentMeaningfulEpisodes: number;
    poorSamplesInWindow: number;
  };
};

type EpisodeRecord = {
  startedAtMs: number;
  endedAtMs: number;
  distressSamples: number;
};

const isFinitePositiveNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0;

export function createTurnFallbackCoordinator(
  initialConfig?: TurnFallbackCoordinatorPartialConfig,
): TurnFallbackCoordinator {
  const config: TurnFallbackCoordinatorConfig = {
    fallbackTimerMs: DEFAULT_FALLBACK_TIMER_MS,
    flapping: { enabled: false, maxPoorConnCount: 3, checkDurationMs: 120_000 },
  };

  /** lifetime counter for logging; the recurring gate uses bounded history */
  let closedEpisodes = 0;

  let episodeStartedAtMs: number | null = null;
  let episodeDistressSamples = 0;
  let episodeTotalSamples = 0;
  /** bounded sliding window of the current episode's distress flags */
  let episodeWindow: boolean[] = [];
  /** consecutive full-media healthy samples used to close an episode */
  let fullHealthStreak = 0;
  /** the current episode is already represented in the recent history */
  let episodeRecorded = false;

  /** consecutive severe samples and the start of the current severe run */
  let severeStreak = 0;
  let severeFirstAtMs: number | null = null;

  /** bounded recent history of meaningful distress/adaptation episodes */
  let recentEpisodes: EpisodeRecord[] = [];
  let prevDegradedObserved = false;

  let lastSampleAtMs: number | null = null;
  let poorTimestamps: number[] = [];
  let poorSamplesInWindow = 0;

  const sanitizeFlapping = (input: TurnFallbackCoordinatorPartialConfig['flapping']): void => {
    if (!input) return;

    if (typeof input.enabled === 'boolean') {
      config.flapping.enabled = input.enabled;
    }
    if (isFinitePositiveNumber(input.maxPoorConnCount)) {
      config.flapping.maxPoorConnCount = input.maxPoorConnCount;
    }
    if (isFinitePositiveNumber(input.checkDurationMs)) {
      config.flapping.checkDurationMs = input.checkDurationMs;
    }
  };

  // sanitize the initial configuration the same way as later configure() calls
  if (initialConfig) {
    if (isFinitePositiveNumber(initialConfig.fallbackTimerMs)) {
      config.fallbackTimerMs = initialConfig.fallbackTimerMs;
    }
    sanitizeFlapping(initialConfig.flapping);
  }

  const pruneRecentHistory = (atMs: number): void => {
    recentEpisodes = recentEpisodes.filter(
      (record) => atMs - record.endedAtMs <= RECENT_EPISODE_HISTORY_WINDOW_MS,
    );
    while (recentEpisodes.length > RECENT_EPISODE_HISTORY_MAX) {
      recentEpisodes.shift();
    }
  };

  const recentMeaningfulEpisodes = (): number =>
    recentEpisodes.filter((record) => record.distressSamples >= EPISODE_RECORD_MIN_DISTRESS).length;

  const resetEpisode = (): void => {
    episodeStartedAtMs = null;
    episodeDistressSamples = 0;
    episodeTotalSamples = 0;
    episodeWindow = [];
    fullHealthStreak = 0;
    episodeRecorded = false;
    severeStreak = 0;
    severeFirstAtMs = null;
  };

  const reset = (): void => {
    resetEpisode();
    closedEpisodes = 0;
    recentEpisodes = [];
    prevDegradedObserved = false;
    lastSampleAtMs = null;
    poorTimestamps = [];
    poorSamplesInWindow = 0;
  };

  const configure = (partial: TurnFallbackCoordinatorPartialConfig): void => {
    if (isFinitePositiveNumber(partial.fallbackTimerMs)) {
      config.fallbackTimerMs = partial.fallbackTimerMs;
    }
    sanitizeFlapping(partial.flapping);
  };

  const emptyDecision = (): CoordinatorDecision => ({
    shouldFireFallback: false,
    reason: null,
    closedEpisodes,
    episode: buildEpisodeSummary(),
    distressCleared: false,
    poorSamplesInWindow,
  });

  const buildEpisodeSummary = (): CoordinatorDecision['episode'] => {
    if (episodeStartedAtMs === null || lastSampleAtMs === null) return null;

    return {
      startedAtMs: episodeStartedAtMs,
      elapsedMs: lastSampleAtMs - episodeStartedAtMs,
      distressSamples: episodeDistressSamples,
      samples: episodeTotalSamples,
      severeStreak,
      severeElapsedMs:
        severeFirstAtMs === null ? null : Math.max(0, lastSampleAtMs - severeFirstAtMs),
    };
  };

  const fireDecision = (reason: TurnFallbackReason): CoordinatorDecision => ({
    shouldFireFallback: true,
    reason,
    closedEpisodes,
    episode: buildEpisodeSummary(),
    distressCleared: false,
    poorSamplesInWindow,
  });

  const isDistressQuality = (quality: CoordinatorQuality): boolean =>
    quality === QUALITY_POOR || quality === QUALITY_LOST;

  const isHealthyQuality = (quality: CoordinatorQuality): boolean =>
    quality === QUALITY_GOOD || quality === QUALITY_EXCELLENT;

  const pushWindow = (distress: boolean): void => {
    episodeWindow.push(distress);
    if (episodeWindow.length > EVIDENCE_WINDOW_SIZE) {
      episodeWindow.shift();
    }
  };

  const windowPoorCount = (): number => episodeWindow.filter(Boolean).length;

  const recordCurrentEpisode = (endedAtMs: number): void => {
    if (episodeRecorded) return;
    if (episodeStartedAtMs === null) return;
    if (episodeDistressSamples < EPISODE_RECORD_MIN_DISTRESS) return;

    recentEpisodes.push({
      startedAtMs: episodeStartedAtMs,
      endedAtMs,
      distressSamples: episodeDistressSamples,
    });
    while (recentEpisodes.length > RECENT_EPISODE_HISTORY_MAX) {
      recentEpisodes.shift();
    }
    episodeRecorded = true;
  };

  const evaluateFire = (atMs: number): CoordinatorDecision => {
    const elapsedMs = atMs - (episodeStartedAtMs ?? atMs);
    const windowCount = episodeWindow.length;
    const poorRatio = windowPoorCount() / windowCount;

    // severe needs its own consecutive-severe window so a late Lost sample
    // cannot inherit an ordinary-Poor episode
    const severeOk =
      severeStreak >= SEVERE_MIN_STREAK &&
      severeFirstAtMs !== null &&
      atMs - severeFirstAtMs >= SEVERE_FALLBACK_TIMER_MS &&
      windowCount >= 2;

    // recurring: prior meaningful episodes in bounded history plus a
    // repeated confirmed burst; the current burst counts at most once (its
    // own record is never a prior independent episode)
    const priorMeaningfulEpisodes = recentEpisodes.filter(
      (record) =>
        record.distressSamples >= EPISODE_RECORD_MIN_DISTRESS &&
        !(
          episodeRecorded &&
          episodeStartedAtMs !== null &&
          record.startedAtMs === episodeStartedAtMs
        ),
    ).length;

    const recurringOk =
      priorMeaningfulEpisodes + 1 >= RECURRING_EPISODE_THRESHOLD &&
      elapsedMs >= RECURRING_FALLBACK_TIMER_MS &&
      episodeDistressSamples >= RECURRING_MIN_DISTRESS_SAMPLES &&
      windowCount >= 2;

    const sustainedOk =
      elapsedMs >= config.fallbackTimerMs &&
      windowCount >= SUSTAINED_MIN_SAMPLES &&
      poorRatio >= SUSTAINED_MIN_POOR_RATIO;

    // severe and sustained take precedence; recurring only fires below the
    // sustained ratio bar
    if (severeOk) {
      return fireDecision('severe-connected-loss');
    }
    if (sustainedOk) {
      return fireDecision('sustained-poor');
    }
    if (recurringOk) {
      return fireDecision('recurring-distress');
    }

    return emptyDecision();
  };

  /**
   * Flapping scanner. Counts POOR UPLOAD samples (isMyConnectionPoor) inside
   * a sliding window; fires once when the threshold is reached and the
   * window is cleared. Deliberately independent of the newer paths.
   */
  const evaluateFlapping = (atMs: number, uploadDistress: boolean): boolean => {
    if (uploadDistress) {
      poorTimestamps.push(atMs);
    }

    poorTimestamps = poorTimestamps.filter(
      (timestamp) => atMs - timestamp <= config.flapping.checkDurationMs,
    );

    if (poorTimestamps.length >= config.flapping.maxPoorConnCount) {
      poorTimestamps = [];
      poorSamplesInWindow = 0;
      return true;
    }

    poorSamplesInWindow = poorTimestamps.length;
    return false;
  };

  const ingest = (sample: CoordinatorSample): CoordinatorDecision => {
    const atMs = sample.atMs;

    if (typeof atMs !== 'number' || !Number.isFinite(atMs) || atMs < 0) {
      // invalid sample: no evidence is created or invalidated
      return emptyDecision();
    }
    if (lastSampleAtMs !== null && atMs < lastSampleAtMs) {
      // out-of-order sample: ignore rather than corrupting time-based windows
      return emptyDecision();
    }

    pruneRecentHistory(atMs);

    // hidden-tab gap: prior evidence cannot mix with new samples
    if (lastSampleAtMs !== null && atMs - lastSampleAtMs > MAX_SAMPLE_GAP_MS) {
      resetEpisode();
    }
    lastSampleAtMs = atMs;

    if (!sample.connected) {
      // synthetic loss while reconnecting: never measured distress
      resetEpisode();
      return emptyDecision();
    }

    const uploadDistress = sample.isMyConnectionPoor || isDistressQuality(sample.uploadQuality);

    const confirmedDownlinkDistress = sample.isReceivingPoor && sample.isLikelyDownloadIssue;

    // outbound audio stuck is independent distress evidence
    const distress = uploadDistress || confirmedDownlinkDistress || sample.isUploadAudioStuck;

    const severe =
      distress &&
      (sample.uploadQuality === QUALITY_LOST ||
        (confirmedDownlinkDistress && sample.receiveQuality === QUALITY_LOST) ||
        sample.isUploadAudioStuck);

    const degradedNow = sample.mediaSnapshot.degradedMedia;

    const fullMediaHealthy =
      !distress &&
      isHealthyQuality(sample.uploadQuality) &&
      isHealthyQuality(sample.receiveQuality) &&
      !sample.isUploadAudioStuck &&
      !degradedNow;

    // any non-distress sample breaks the severe run (no fake streaks across
    // intervening healthy samples)
    if (!distress) {
      severeStreak = 0;
      severeFirstAtMs = null;
    }

    // track the observed degraded state for the next transition detection
    const wasDegradedObserved = prevDegradedObserved;
    prevDegradedObserved = degradedNow;

    // flapping mode replaces the episode paths; counts only poor-upload samples
    if (config.flapping.enabled) {
      const triggered = evaluateFlapping(atMs, sample.isMyConnectionPoor);

      if (triggered) {
        const decision = emptyDecision();
        decision.shouldFireFallback = true;
        decision.reason = 'flapping';
        return decision;
      }

      return emptyDecision();
    }

    if (distress) {
      fullHealthStreak = 0;
      // any non-severe distress breaks the current severe confirmation run
      if (severe) {
        severeStreak += 1;
        if (severeFirstAtMs === null) severeFirstAtMs = atMs;
      } else {
        severeStreak = 0;
        severeFirstAtMs = null;
      }

      if (episodeStartedAtMs === null) {
        episodeStartedAtMs = atMs;
      }

      episodeDistressSamples += 1;
      episodeTotalSamples += 1;
      pushWindow(true);

      // full → degraded transition with real distress: recorded as an
      // adaptation cycle even without closure; a pre-degraded state never
      // counts
      if (degradedNow && !wasDegradedObserved) {
        recordCurrentEpisode(atMs);
      }

      // a burst that consumed the full sustained window without firing is
      // meaningful history for LATER bursts (never a trigger itself)
      if (atMs - (episodeStartedAtMs ?? atMs) >= config.fallbackTimerMs) {
        recordCurrentEpisode(atMs);
      }

      return evaluateFire(atMs);
    }

    if (episodeStartedAtMs === null) {
      return emptyDecision();
    }

    episodeTotalSamples += 1;
    pushWindow(false);

    if (fullMediaHealthy) {
      fullHealthStreak += 1;

      if (fullHealthStreak >= FULL_HEALTH_CLEAR_STREAK && episodeStartedAtMs !== null) {
        recordCurrentEpisode(atMs);
        closedEpisodes += 1;
        resetEpisode();

        return {
          shouldFireFallback: false,
          reason: null,
          closedEpisodes,
          episode: null,
          distressCleared: true,
          poorSamplesInWindow,
        };
      }

      // brief full-media health does not instantly close the episode
      return emptyDecision();
    }

    // reduced media or unknown stats never fire (paused video alone never
    // forces relay) and break the recovery streak
    fullHealthStreak = 0;
    return emptyDecision();
  };

  const getState = () => ({
    closedEpisodes,
    episodeStartedAtMs,
    episodeDistressSamples,
    episodeSamples: episodeTotalSamples,
    severeStreak,
    recentMeaningfulEpisodes: recentMeaningfulEpisodes(),
    poorSamplesInWindow,
  });

  return { configure, ingest, reset, getState };
}
