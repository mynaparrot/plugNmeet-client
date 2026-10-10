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

type EpisodeRecord = {
  startedAtMs: number;
  endedAtMs: number;
  distressSamples: number;
};

const isFinitePositiveNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0;

export default class TurnFallbackCoordinator {
  private readonly config: TurnFallbackCoordinatorConfig = {
    fallbackTimerMs: DEFAULT_FALLBACK_TIMER_MS,
    flapping: { enabled: false, maxPoorConnCount: 3, checkDurationMs: 120_000 },
  };

  /** lifetime counter for logging; the recurring gate uses bounded history */
  private closedEpisodes = 0;

  private episodeStartedAtMs: number | null = null;
  private episodeDistressSamples = 0;
  private episodeTotalSamples = 0;
  /** bounded sliding window of the current episode's distress flags */
  private episodeWindow: boolean[] = [];
  /** consecutive full-media healthy samples used to close an episode */
  private fullHealthStreak = 0;
  /** the current episode is already represented in the recent history */
  private episodeRecorded = false;

  /** consecutive severe samples and the start of the current severe run */
  private severeStreak = 0;
  private severeFirstAtMs: number | null = null;

  /** bounded recent history of meaningful distress/adaptation episodes */
  private recentEpisodes: EpisodeRecord[] = [];
  private prevDegradedObserved = false;

  private lastSampleAtMs: number | null = null;
  private poorTimestamps: number[] = [];
  private poorSamplesInWindow = 0;

  public constructor(initialConfig?: TurnFallbackCoordinatorPartialConfig) {
    // sanitize the initial configuration the same way as later configure() calls
    if (initialConfig) {
      if (isFinitePositiveNumber(initialConfig.fallbackTimerMs)) {
        this.config.fallbackTimerMs = initialConfig.fallbackTimerMs;
      }
      this.sanitizeFlapping(initialConfig.flapping);
    }
  }

  private sanitizeFlapping(input: TurnFallbackCoordinatorPartialConfig['flapping']): void {
    if (!input) return;

    if (typeof input.enabled === 'boolean') {
      this.config.flapping.enabled = input.enabled;
    }
    if (isFinitePositiveNumber(input.maxPoorConnCount)) {
      this.config.flapping.maxPoorConnCount = input.maxPoorConnCount;
    }
    if (isFinitePositiveNumber(input.checkDurationMs)) {
      this.config.flapping.checkDurationMs = input.checkDurationMs;
    }
  }

  private pruneRecentHistory(atMs: number): void {
    this.recentEpisodes = this.recentEpisodes.filter(
      (record) => atMs - record.endedAtMs <= RECENT_EPISODE_HISTORY_WINDOW_MS,
    );
    while (this.recentEpisodes.length > RECENT_EPISODE_HISTORY_MAX) {
      this.recentEpisodes.shift();
    }
  }

  private recentMeaningfulEpisodes(): number {
    return this.recentEpisodes.filter(
      (record) => record.distressSamples >= EPISODE_RECORD_MIN_DISTRESS,
    ).length;
  }

  private resetEpisode(): void {
    this.episodeStartedAtMs = null;
    this.episodeDistressSamples = 0;
    this.episodeTotalSamples = 0;
    this.episodeWindow = [];
    this.fullHealthStreak = 0;
    this.episodeRecorded = false;
    this.severeStreak = 0;
    this.severeFirstAtMs = null;
  }

  /** clears all evidence (reconnect / hidden boundary / disconnect) */
  public reset = (): void => {
    this.resetEpisode();
    this.closedEpisodes = 0;
    this.recentEpisodes = [];
    this.prevDegradedObserved = false;
    this.lastSampleAtMs = null;
    this.poorTimestamps = [];
    this.poorSamplesInWindow = 0;
  };

  public configure = (partial: TurnFallbackCoordinatorPartialConfig): void => {
    if (isFinitePositiveNumber(partial.fallbackTimerMs)) {
      this.config.fallbackTimerMs = partial.fallbackTimerMs;
    }
    this.sanitizeFlapping(partial.flapping);
  };

  private emptyDecision(): CoordinatorDecision {
    return {
      shouldFireFallback: false,
      reason: null,
      closedEpisodes: this.closedEpisodes,
      episode: this.buildEpisodeSummary(),
      distressCleared: false,
      poorSamplesInWindow: this.poorSamplesInWindow,
    };
  }

  private buildEpisodeSummary(): CoordinatorDecision['episode'] {
    if (this.episodeStartedAtMs === null || this.lastSampleAtMs === null) return null;

    return {
      startedAtMs: this.episodeStartedAtMs,
      elapsedMs: this.lastSampleAtMs - this.episodeStartedAtMs,
      distressSamples: this.episodeDistressSamples,
      samples: this.episodeTotalSamples,
      severeStreak: this.severeStreak,
      severeElapsedMs:
        this.severeFirstAtMs === null
          ? null
          : Math.max(0, this.lastSampleAtMs - this.severeFirstAtMs),
    };
  }

  private fireDecision(reason: TurnFallbackReason): CoordinatorDecision {
    return {
      shouldFireFallback: true,
      reason,
      closedEpisodes: this.closedEpisodes,
      episode: this.buildEpisodeSummary(),
      distressCleared: false,
      poorSamplesInWindow: this.poorSamplesInWindow,
    };
  }

  private isDistressQuality(quality: CoordinatorQuality): boolean {
    return quality === QUALITY_POOR || quality === QUALITY_LOST;
  }

  private isHealthyQuality(quality: CoordinatorQuality): boolean {
    return quality === QUALITY_GOOD || quality === QUALITY_EXCELLENT;
  }

  private pushWindow(distress: boolean): void {
    this.episodeWindow.push(distress);
    if (this.episodeWindow.length > EVIDENCE_WINDOW_SIZE) {
      this.episodeWindow.shift();
    }
  }

  private windowPoorCount(): number {
    return this.episodeWindow.filter(Boolean).length;
  }

  private recordCurrentEpisode(endedAtMs: number): void {
    if (this.episodeRecorded) return;
    if (this.episodeStartedAtMs === null) return;
    if (this.episodeDistressSamples < EPISODE_RECORD_MIN_DISTRESS) return;

    this.recentEpisodes.push({
      startedAtMs: this.episodeStartedAtMs,
      endedAtMs,
      distressSamples: this.episodeDistressSamples,
    });
    while (this.recentEpisodes.length > RECENT_EPISODE_HISTORY_MAX) {
      this.recentEpisodes.shift();
    }
    this.episodeRecorded = true;
  }

  private evaluateFire(atMs: number): CoordinatorDecision {
    const elapsedMs = atMs - (this.episodeStartedAtMs ?? atMs);
    const windowCount = this.episodeWindow.length;
    const poorRatio = this.windowPoorCount() / windowCount;

    // severe needs its own consecutive-severe window so a late Lost sample
    // cannot inherit an ordinary-Poor episode
    const severeOk =
      this.severeStreak >= SEVERE_MIN_STREAK &&
      this.severeFirstAtMs !== null &&
      atMs - this.severeFirstAtMs >= SEVERE_FALLBACK_TIMER_MS &&
      windowCount >= 2;

    // recurring: prior meaningful episodes in bounded history plus a
    // repeated confirmed burst; the current burst counts at most once (its
    // own record is never a prior independent episode)
    const priorMeaningfulEpisodes = this.recentEpisodes.filter(
      (record) =>
        record.distressSamples >= EPISODE_RECORD_MIN_DISTRESS &&
        !(
          this.episodeRecorded &&
          this.episodeStartedAtMs !== null &&
          record.startedAtMs === this.episodeStartedAtMs
        ),
    ).length;

    const recurringOk =
      priorMeaningfulEpisodes + 1 >= RECURRING_EPISODE_THRESHOLD &&
      elapsedMs >= RECURRING_FALLBACK_TIMER_MS &&
      this.episodeDistressSamples >= RECURRING_MIN_DISTRESS_SAMPLES &&
      windowCount >= 2;

    const sustainedOk =
      elapsedMs >= this.config.fallbackTimerMs &&
      windowCount >= SUSTAINED_MIN_SAMPLES &&
      poorRatio >= SUSTAINED_MIN_POOR_RATIO;

    // severe and sustained take precedence; recurring only fires below the
    // sustained ratio bar
    if (severeOk) {
      return this.fireDecision('severe-connected-loss');
    }
    if (sustainedOk) {
      return this.fireDecision('sustained-poor');
    }
    if (recurringOk) {
      return this.fireDecision('recurring-distress');
    }

    return this.emptyDecision();
  }

  /**
   * Flapping scanner. Counts POOR UPLOAD samples (isMyConnectionPoor) inside
   * a sliding window; fires once when the threshold is reached and the
   * window is cleared. Deliberately independent of the newer paths.
   */
  private evaluateFlapping(atMs: number, uploadDistress: boolean): boolean {
    if (uploadDistress) {
      this.poorTimestamps.push(atMs);
    }

    this.poorTimestamps = this.poorTimestamps.filter(
      (timestamp) => atMs - timestamp <= this.config.flapping.checkDurationMs,
    );

    if (this.poorTimestamps.length >= this.config.flapping.maxPoorConnCount) {
      this.poorTimestamps = [];
      this.poorSamplesInWindow = 0;
      return true;
    }

    this.poorSamplesInWindow = this.poorTimestamps.length;
    return false;
  }

  public ingest = (sample: CoordinatorSample): CoordinatorDecision => {
    const atMs = sample.atMs;

    if (typeof atMs !== 'number' || !Number.isFinite(atMs) || atMs < 0) {
      // invalid sample: no evidence is created or invalidated
      return this.emptyDecision();
    }
    if (this.lastSampleAtMs !== null && atMs < this.lastSampleAtMs) {
      // out-of-order sample: ignore rather than corrupting time-based windows
      return this.emptyDecision();
    }

    this.pruneRecentHistory(atMs);

    // hidden-tab gap: prior evidence cannot mix with new samples
    if (this.lastSampleAtMs !== null && atMs - this.lastSampleAtMs > MAX_SAMPLE_GAP_MS) {
      this.resetEpisode();
    }
    this.lastSampleAtMs = atMs;

    if (!sample.connected) {
      // synthetic loss while reconnecting: never measured distress
      this.resetEpisode();
      return this.emptyDecision();
    }

    const uploadDistress =
      sample.isMyConnectionPoor || this.isDistressQuality(sample.uploadQuality);

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
      this.isHealthyQuality(sample.uploadQuality) &&
      this.isHealthyQuality(sample.receiveQuality) &&
      !sample.isUploadAudioStuck &&
      !degradedNow;

    // any non-distress sample breaks the severe run (no fake streaks across
    // intervening healthy samples)
    if (!distress) {
      this.severeStreak = 0;
      this.severeFirstAtMs = null;
    }

    // track the observed degraded state for the next transition detection
    const wasDegradedObserved = this.prevDegradedObserved;
    this.prevDegradedObserved = degradedNow;

    // flapping mode replaces the episode paths; counts only poor-upload samples
    if (this.config.flapping.enabled) {
      const triggered = this.evaluateFlapping(atMs, sample.isMyConnectionPoor);

      if (triggered) {
        const decision = this.emptyDecision();
        decision.shouldFireFallback = true;
        decision.reason = 'flapping';
        return decision;
      }

      return this.emptyDecision();
    }

    if (distress) {
      this.fullHealthStreak = 0;
      // any non-severe distress breaks the current severe confirmation run
      if (severe) {
        this.severeStreak += 1;
        if (this.severeFirstAtMs === null) this.severeFirstAtMs = atMs;
      } else {
        this.severeStreak = 0;
        this.severeFirstAtMs = null;
      }

      if (this.episodeStartedAtMs === null) {
        this.episodeStartedAtMs = atMs;
      }

      this.episodeDistressSamples += 1;
      this.episodeTotalSamples += 1;
      this.pushWindow(true);

      // full → degraded transition with real distress: recorded as an
      // adaptation cycle even without closure; a pre-degraded state never
      // counts
      if (degradedNow && !wasDegradedObserved) {
        this.recordCurrentEpisode(atMs);
      }

      // a burst that consumed the full sustained window without firing is
      // meaningful history for LATER bursts (never a trigger itself)
      if (atMs - (this.episodeStartedAtMs ?? atMs) >= this.config.fallbackTimerMs) {
        this.recordCurrentEpisode(atMs);
      }

      return this.evaluateFire(atMs);
    }

    if (this.episodeStartedAtMs === null) {
      return this.emptyDecision();
    }

    this.episodeTotalSamples += 1;
    this.pushWindow(false);

    if (fullMediaHealthy) {
      this.fullHealthStreak += 1;

      if (this.fullHealthStreak >= FULL_HEALTH_CLEAR_STREAK && this.episodeStartedAtMs !== null) {
        this.recordCurrentEpisode(atMs);
        this.closedEpisodes += 1;
        this.resetEpisode();

        return {
          shouldFireFallback: false,
          reason: null,
          closedEpisodes: this.closedEpisodes,
          episode: null,
          distressCleared: true,
          poorSamplesInWindow: this.poorSamplesInWindow,
        };
      }

      // brief full-media health does not instantly close the episode
      return this.emptyDecision();
    }

    // reduced media or unknown stats never fire (paused video alone never
    // forces relay) and break the recovery streak
    this.fullHealthStreak = 0;
    return this.emptyDecision();
  };

  /** bounded state snapshot for logging and tests */
  public getState = () => {
    return {
      closedEpisodes: this.closedEpisodes,
      episodeStartedAtMs: this.episodeStartedAtMs,
      episodeDistressSamples: this.episodeDistressSamples,
      episodeSamples: this.episodeTotalSamples,
      severeStreak: this.severeStreak,
      recentMeaningfulEpisodes: this.recentMeaningfulEpisodes(),
      poorSamplesInWindow: this.poorSamplesInWindow,
    };
  };
}
