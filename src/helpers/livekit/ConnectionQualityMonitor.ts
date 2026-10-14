import { ConnectionState, Room, Track, type LocalTrackPublication } from 'livekit-client';

import { store } from '../../store';
import { addUserNotification } from '../../store/slices/roomSettingsSlice';
import i18n from '../i18n';

export enum PnmConnectionQuality {
  Excellent = 'excellent',
  Good = 'good',
  Poor = 'poor',
  Lost = 'lost',
}

/**
 * Coarse severity ordering for `PnmConnectionQuality` (higher = healthier).
 * Used by the overall-status hysteresis (comparing window/displayed quality) and
 * by the broadcast-side degradation confirmation (ConnectLivekit) so both agree
 * on what "better"/"worse" means.
 */
export const qualityToScore = (quality: PnmConnectionQuality): number => {
  switch (quality) {
    case PnmConnectionQuality.Excellent:
      return 100;
    case PnmConnectionQuality.Good:
      return 75;
    case PnmConnectionQuality.Poor:
      return 40;
    case PnmConnectionQuality.Lost:
      return 20;
    default:
      return 100;
  }
};

const EXCELLENT_PACKET_LOSS_THRESHOLD = 3;
const GOOD_PACKET_LOSS_THRESHOLD = 10;
export const LOST_PACKET_LOSS_THRESHOLD = 20;

const EXCELLENT_RTT_THRESHOLD = 250;
const GOOD_RTT_THRESHOLD = 500;
const LOST_RTT_THRESHOLD = 1000;

const COMPOUND_POOR_PACKET_LOSS_THRESHOLD = 5;
const COMPOUND_POOR_RTT_THRESHOLD = 350;

const MAX_SANE_RTT = 10_000;

const HISTORY_WINDOW_SIZE = 5;
const POOR_WINDOW_THRESHOLD = 3;
const GOOD_RECOVERY_THRESHOLD = 3;

const INTERVAL = 5000;
const NOTIFICATION_COOLDOWN = 5 * 60_000; // 5 minutes
const MAX_POOR_CONNECTION_NOTIFICATIONS = 3;

/**
 * Consecutive measured samples the overall status must survive before it may
 * change. Only a full window that is uniformly worse (or uniformly better)
 * than the displayed status moves it, so a single-sample spike cannot.
 */
const MIN_CONSECUTIVE_SAMPLES_FOR_STATUS_CHANGE = 2;

/**
 * A direction's Lost that came only from RTT (its packet loss stayed below
 * LOST_PACKET_LOSS_THRESHOLD) must persist for this many consecutive measured
 * samples before it is reported Lost: one slow round-trip may be Poor but never
 * Lost. Loss-backed Lost is never delayed (see createStats). Trade-off: a
 * genuine RTT-only Lost is surfaced ~one sample (5s) later.
 */
const MIN_CONSECUTIVE_RTT_LOST_SAMPLES = 2;

/**
 * Minimum packets an interval must carry before its loss ratio is trusted, in
 * both directions: a receive-loss ratio from an inbound-rtp delta (below) and an
 * upload-loss ratio from a remote-inbound-rtp fractionLost (gated by the packet
 * count the matching outbound-rtp actually sent in the same interval). A tiny
 * interval (1 lost of 4) would otherwise dominate a worst-of aggregate as 25%.
 */
const MIN_ACTIVE_PACKETS_FOR_LOSS_ANALYSIS = 20;
const MIN_PUBLISHERS_FOR_DOWNLOAD_ISSUE = 2;
const DOWNLOAD_ISSUE_POOR_STREAM_RATIO = 0.6;

/**
 * Shared grouping key for every remote stream whose publisher could not be
 * mapped to a LiveKit identity (no trackIdentifier, or the track belongs to no
 * subscribed remote publication). The leading NUL makes a collision with a real
 * LiveKit identity impossible. All unmapped streams share one bucket on purpose:
 * per-SSRC grouping made a single publisher's audio + video look like two
 * independent publishers, which satisfied the >= MIN_PUBLISHERS corroboration
 * and bypassed the self-report exclusion. A shared bucket can only make
 * attribution stricter (never more permissive).
 */
const UNKNOWN_PUBLISHER_KEY = '\u0000unknown-publisher';

/**
 * A lone remote publisher's poor stream may be its own bad uplink relayed by the
 * SFU, so a single poor publisher is not sufficient to blame my download. Below
 * MIN_PUBLISHERS_FOR_DOWNLOAD_ISSUE the poor condition must be corroborated by
 * either this many consecutive measured samples of poorness (a persisting local
 * condition, not a one-off burst) or a receive-side RTT that is itself Poor-grade
 * (GOOD_RTT_THRESHOLD, the same threshold `classify` uses for Poor). Trade-off:
 * a genuine 1:1 downlink issue is consequently flagged ~one measured sample
 * later, unless the receive RTT already confirms it.
 */
const MIN_CONSECUTIVE_POOR_SAMPLES_FOR_DOWNLOAD_ISSUE = 2;

/**
 * Track-level stuck detection limits (see resolveAudioOutboundStuck /
 * resolveVideoOutboundStuck):
 *   - Camera stuck is a publication property: it matures only when every
 *     non-idle layer of the same camera publication is stagnant, so one idle
 *     simulcast/dynacast layer can never flag a camera that its sibling layer
 *     still encodes.
 *   - Microphone stuck additionally needs spec-backed capture evidence for the
 *     same interval: an RTCAudioSourceStats media-source delta proving a
 *     meaningful captured signal (see resolveAudioSourceActivity), not merely
 *     that the energy counter advanced. Silence with Opus DTX legitimately
 *     sends nothing, so a stalled counter alone is never a verified send
 *     failure; without usable audio-source stats the audio fast path stays
 *     closed instead of guessing. Such a mic send stall is still caught by the
 *     transport paths (upload quality / Lost / receive).
 *   - Screen-share audio and video never feed either flag: their sources must
 *     not drive camera/audio-critical adaptation actions.
 *   - An inactive (spec active === false) outbound stream is never a stall: it
 *     is not expected to progress and must not accumulate stall intervals that
 *     would otherwise fire the moment it reactivates.
 */
const OUTBOUND_STUCK_INTERVAL_THRESHOLD = 2;

/**
 * Microphone capture-verification policy (resolveAudioSourceActivity).
 *
 * RTCAudioSourceStats.totalAudioEnergy is the accumulated energy of the
 * captured samples and totalSamplesDuration is the cumulative produced duration
 * in seconds. Per spec the energy is already duration-weighted (each sample's
 * squared amplitude times that sample's duration), so the produced duration
 * cancels out of the interval's RMS-like amplitude: an interval's captured
 * amplitude is sqrt(deltaEnergy / deltaDuration), with no explicit sample rate.
 * A raw "energy advanced" test is not sufficient proof of speech: a live
 * microphone's background noise floor has positive energy and a DTX-suppressed
 * mic keeps the counter creeping, so the energy delta is normalised by the
 * produced sample duration and required to clear a conservative floor.
 *
 * MIN_MEANINGFUL_CAPTURE_RMS is a deliberate policy heuristic (~ -40 dBFS: below
 * it the captured RMS amplitude is treated as noise/silence) that separates an
 * obviously meaningful signal from the noise floor. It is not a speech/VAD
 * guarantee and makes no claim about identifiable browser behaviour.
 */
const MIN_MEANINGFUL_CAPTURE_RMS = 0.01;

type PrevInboundStats = {
  lost: number;
  received: number;
};

type PrevOutboundStats = {
  bytesSent: number;
  framesSent: number;
  /** outbound-rtp: cumulative RTP packets sent; a packetsSent delta gates RR loss */
  packetsSent?: number;
  stagnantCount: number;
  /** publication/transceiver/sender identity that owned this SSRC */
  groupKey: string;
  /** MediaStreamTrack.id the SSRC was resolved to, when resolvable */
  senderTrackId?: string;
};

/** Capture-activity counters of one RTCAudioSourceStats (media-source) object. */
type PrevAudioSourceStats = {
  totalAudioEnergy?: number;
  totalSamplesDuration?: number;
};

/** One outbound-rtp observation, aggregated per publication after the report. */
type OutboundStreamRecord = {
  kind: 'audio' | 'video';
  groupKey: string;
  /** publication source; undefined when the sender could not be resolved */
  source: Track.Source | undefined;
  /** spec RTCOutboundRtpStreamStats.active; undefined when not reported */
  active: boolean | undefined;
  stagnantCount: number;
  /** an active, non-placeholder publication whose counters were comparable */
  eligible: boolean;
};

export type RemoteReceiveStats = {
  ssrc: string;
  kind: 'audio' | 'video';
  packetLoss: number;
  packetsLostDelta: number;
  packetsReceivedDelta: number;
  quality: PnmConnectionQuality;
  /**
   * LiveKit identity of the remote publisher this stream belongs to, when the
   * inbound track could be mapped to one. Undefined when unmappable.
   */
  publisherIdentity?: string;
};

export type QualityStats = {
  /**
   * False for synthetic samples that never measured a real connection;
   * consumers must neither treat these as distress nor as full-health
   * recovery evidence.
   */
  measured: boolean;

  /**
   * Directional usability of this generation, additive to `measured`. True only
   * when that direction (aggregated across both reports, since a direction is
   * not a report) produced genuinely usable health evidence (see
   * `ReportEvidence.uploadUsable`/`receiveUsable`); false for synthetic samples
   * and for a direction whose evidence was missing/empty/proofless. `measured`
   * is true only when every expected direction is usable, so a partial sample
   * (one direction unknown) can still carry a true directional flag. Consumers
   * may act on such a flag only for that direction's independently verified
   * evidence — never as global health.
   */
  uploadMeasured?: boolean;
  receiveMeasured?: boolean;

  rawPacketLoss: number;
  rtt: number | null;
  /** Upload-path RTT only (selected publisher candidate pair). */
  uploadRtt: number | null;
  /**
   * Receive-path RTT (subscriber candidate pair). In a single-PC publisher-only
   * session the one transport owns both directions, so its selected-pair RTT is
   * legitimately the receive RTT too; it is never borrowed from a dual-PC
   * publisher transport otherwise.
   */
  receiveRtt: number | null;

  uploadQuality: PnmConnectionQuality;
  receiveQuality: PnmConnectionQuality;
  overallQuality: PnmConnectionQuality;

  score: number;

  myPacketLoss: number;
  myRtt: number | null;
  receivePacketLoss: number;

  remoteReceiveStats: RemoteReceiveStats[];
  isLikelyDownloadIssue: boolean;

  isMyConnectionPoor: boolean;
  isReceivingPoor: boolean;

  isUploadAudioStuck: boolean;
  isUploadVideoStuck: boolean;
};

type WebRTCStat = {
  id?: string;
  type?: string;
  kind?: string;
  mediaType?: string;
  ssrc?: number | string;
  mid?: string;
  packetsLost?: number;
  packetsReceived?: number;
  fractionLost?: number;
  state?: string;
  selected?: boolean;
  nominated?: boolean;
  selectedCandidatePairId?: string;
  currentRoundTripTime?: number;
  /** RTCStats base field; for remote-inbound-rtp it is the RR arrival time */
  timestamp?: number;
  bytesSent?: number;
  framesSent?: number;
  /** outbound-rtp: cumulative RTP packets sent */
  packetsSent?: number;
  /** outbound-rtp: whether the RTP stream is configured to be sent */
  active?: boolean;
  /** outbound-rtp: id of the media-source stats object of its sender's track */
  mediaSourceId?: string;
  /** media-source: id of the MediaStreamTrack behind the source */
  trackIdentifier?: string;
  /** media-source audio: cumulative audio energy (0 while silent) */
  totalAudioEnergy?: number;
  /** media-source audio: cumulative produced sample duration */
  totalSamplesDuration?: number;
};

type QualityCheckState = {
  maxPacketLoss: number;

  /** upload-path RTT (selected publisher candidate pair) */
  uploadRtt: number | null;
  /** receive-path RTT (subscriber candidate pair) */
  receiveRtt: number | null;

  myPacketLoss: number;

  inboundPacketLoss: number;
  remoteReceiveStats: RemoteReceiveStats[];

  hasAudioOutbound: boolean;
  hasVideoOutbound: boolean;
  isAudioOutboundStuck: boolean;
  isVideoOutboundStuck: boolean;

  activeInboundSsrcs: Set<string>;
  activeOutboundSsrcs: Set<string>;
  activeRemoteInboundSsrcs: Set<string>;
  activeAudioSourceTracks: Set<string>;
};

/**
 * Last-seen RR arrival timestamp per outbound SSRC, used as freshness proof.
 * `RTCStats.timestamp` on a remote-inbound-rtp object is spec-defined as the
 * time the corresponding RTCP RR was received (W3C webrtc-stats), so it is the
 * one standard marker of a new receiver report.
 */
type RemoteInboundFreshness = {
  timestamp?: number;
};

/** Which RTP directions a single stats report proved anything usable about. */
type ReportEvidence = {
  /** the getStats() promise resolved and returned a report */
  present: boolean;
  /**
   * The report yielded genuine upload health evidence: an authoritative
   * (selected) candidate-pair RTT routed to this report's upload path, a fresh
   * remote-inbound receiver report (an RR always reports on our outbound RTP,
   * so it is upload evidence no matter which report carries it), or a matured
   * verified outbound stall. Structural entries (unselected candidate pairs,
   * bare outbound byte/frame counters) and unchanged/stale receiver reports
   * never set this.
   */
  uploadUsable: boolean;
  /**
   * The report yielded genuine receive health evidence: an authoritative
   * (selected) candidate-pair RTT routed to this report's receive path, or a
   * real inbound-rtp delta (inbound RTP always proves the download direction is
   * delivering, on whichever report carries it). Report identity is not a
   * direction: a single-PC publisher-only session carries both directions'
   * evidence in its one publisher report and has no subscriber report at all.
   */
  receiveUsable: boolean;
};

export default class ConnectionQualityMonitor {
  private room: Room | undefined;

  /**
   * Injected by the caller: does this remote publisher currently report its own
   * upload as Poor/Lost? Their loss reaches me through the SFU, so it must not
   * be read as my download problem.
   */
  private isPublisherUplinkPoor: ((identity: string) => boolean) | undefined;

  private poorConnectionHistory: boolean[] = [];
  private lastPoorConnectionNotificationAt = 0;
  private poorConnectionNotificationCount = 0;

  /**
   * Consecutive measured samples in which a lone remaining publisher looked poor
   * (see resolveSinglePublisherDownloadIssue). Advanced only by measured samples,
   * reset by a non-poor sample and by every baseline/stop boundary.
   */
  private singlePublisherPoorStreak = 0;
  private qualityCheckTimeout: ReturnType<typeof setTimeout> | null = null;
  private isConnectionCurrentlyPoor = false;
  private isCheckingQuality = false;
  private isStopped = true;

  private currentQuality: PnmConnectionQuality = PnmConnectionQuality.Excellent;

  /**
   * User-visible overall status. Moves only when a full
   * MIN_CONSECUTIVE_SAMPLES_FOR_STATUS_CHANGE window of measured samples is
   * uniformly worse (→ least severe of them) or uniformly better (→ most severe
   * of them) than the current value; synthetic samples never enter the window
   * (see resolveDisplayedQuality).
   */
  private displayedQuality: PnmConnectionQuality = PnmConnectionQuality.Excellent;

  /** Sliding window of the last measured worstQuality values (≤ window size). */
  private measuredQualityWindow: PnmConnectionQuality[] = [];

  /** Consecutive RTT-only-Lost measured samples, per direction. */
  private uploadRttLostStreak = 0;
  private receiveRttLostStreak = 0;

  private prevInboundStats: Record<string, PrevInboundStats> = {};
  private prevOutboundStats: Record<string, PrevOutboundStats> = {};
  private prevRemoteInboundStats: Record<string, RemoteInboundFreshness> = {};
  private prevAudioSourceStats: Record<string, PrevAudioSourceStats> = {};
  private lastStats: QualityStats | null = null;

  /** UI subscribers notified whenever the public stats snapshot changes. */
  private statsListeners = new Set<() => void>();

  /** bumped on baseline reset; in-flight stats of a previous generation are discarded */
  private measurementGeneration = 0;

  /** identifies the active sampling loop; a superseded loop must never touch state */
  private samplingLoopToken = 0;

  public start = (
    room: Room,
    onQualityUpdate?: (stats: QualityStats) => void,
    isPublisherUplinkPoor?: (identity: string) => boolean,
  ) => {
    this.stop();
    this.room = room;
    this.isPublisherUplinkPoor = isPublisherUplinkPoor;
    this.isStopped = false;

    document.addEventListener('visibilitychange', this.handleVisibilityChange);

    const loopToken = this.samplingLoopToken;

    const checkQuality = async () => {
      if (this.isStopped || loopToken !== this.samplingLoopToken || this.isCheckingQuality) return;

      // hidden-tab stats are unreliable (throttled timers, adaptive-paused
      // video): skip measurement but keep rescheduling
      if (document.hidden) {
        this.qualityCheckTimeout = setTimeout(checkQuality, INTERVAL);
        return;
      }

      this.isCheckingQuality = true;

      try {
        const generation = this.measurementGeneration;
        const stats = await this.collectQualityStats();

        // a baseline reset during collection invalidates the stale sample
        // (neither distress nor recovery evidence)
        if (this.isStopped || generation !== this.measurementGeneration || document.hidden) {
          return;
        }

        // only a genuinely measured sample may back the diagnostics panel;
        // a synthetic/unmeasured sample must not move score, history,
        // notifications or getStats(), but is still emitted for TURN
        // diagnostics/adaptation
        if (stats.measured) {
          this.lastStats = stats;
          this.handleQualityState(stats);
          this.notifyStatsListeners();
        }
        onQualityUpdate?.(stats);
      } finally {
        // a superseded loop (stop + restart) must neither release the new
        // loop's in-flight lock nor reschedule its own stale callback; never
        // `return` here (no-unsafe-finally), wrap the cleanup instead
        if (loopToken === this.samplingLoopToken) {
          this.isCheckingQuality = false;

          if (!this.isStopped) {
            this.qualityCheckTimeout = setTimeout(checkQuality, INTERVAL);
          }
        }
      }
    };

    void checkQuality();
  };

  public stop = () => {
    this.isStopped = true;

    document.removeEventListener('visibilitychange', this.handleVisibilityChange);

    if (this.qualityCheckTimeout) {
      clearTimeout(this.qualityCheckTimeout);
      this.qualityCheckTimeout = null;
    }

    this.poorConnectionHistory = [];
    this.lastPoorConnectionNotificationAt = 0;
    this.poorConnectionNotificationCount = 0;
    this.singlePublisherPoorStreak = 0;
    this.isConnectionCurrentlyPoor = false;
    this.isCheckingQuality = false;
    this.currentQuality = PnmConnectionQuality.Excellent;
    this.displayedQuality = PnmConnectionQuality.Excellent;
    this.measuredQualityWindow = [];
    this.uploadRttLostStreak = 0;
    this.receiveRttLostStreak = 0;

    // no delta/stuck/capture baseline (incl. prevAudioSourceStats) may survive
    // the stop boundary, so a later start on the same track id re-baselines
    this.clearDeltaBaselines();
    this.lastStats = null;
    this.notifyStatsListeners();
    // outstanding async measurements must never survive a stop boundary
    this.measurementGeneration += 1;
    // a superseded loop must never reschedule or release a newer loop's lock
    this.samplingLoopToken += 1;
  };

  public getStats = () => {
    return this.lastStats;
  };

  /** Subscribe to public stats-snapshot changes (a new measured sample or a clear). */
  public subscribeStats = (listener: () => void) => {
    this.statsListeners.add(listener);
    return () => {
      this.statsListeners.delete(listener);
    };
  };

  private notifyStatsListeners = () => {
    this.statsListeners.forEach((listener) => listener());
  };

  /**
   * Drops stale stat deltas/history at any boundary and discards (instead
   * of consuming) an in-flight stats collection.
   */
  public resetMeasurementBaseline = (options?: { resetScore?: boolean }) => {
    this.measurementGeneration += 1;
    this.clearDeltaBaselines();
    this.poorConnectionHistory = [];
    this.singlePublisherPoorStreak = 0;
    this.uploadRttLostStreak = 0;
    this.receiveRttLostStreak = 0;
    // the hysteresis window is baseline-local evidence: any baseline reset
    // clears it, but a visibility reset on the same transport keeps the
    // displayed status
    this.measuredQualityWindow = [];
    // getStats() must never show a sample from the old baseline/generation
    this.lastStats = null;
    this.notifyStatsListeners();

    // a fresh transport (connect/reconnect) must not inherit the old status
    if (options?.resetScore) {
      this.displayedQuality = PnmConnectionQuality.Excellent;
      this.currentQuality = PnmConnectionQuality.Excellent;
    }
  };

  // pre-hide baselines are stale (throttled timers, adaptive-paused video);
  // both transitions drop them so old evidence is never mixed with new
  private handleVisibilityChange = () => {
    this.resetMeasurementBaseline();
  };

  public getOverallQuality = () => this.currentQuality;

  /**
   * Processes one report and reports which directions it proved anything for.
   * `uploadUsable`/`receiveUsable` are set only by genuine health evidence: an
   * authoritative (selected) candidate-pair RTT (upload, receive or both per
   * `rttTarget`), a fresh remote-inbound receiver report (always upload), a
   * real inbound-rtp delta (always receive), or a matured verified outbound
   * stall (always upload). Structural entries (unselected candidate pairs, bare
   * outbound byte/frame counters) and unchanged/stale receiver reports prove
   * nothing and must never count as a measurement. `rttTarget` routes the
   * selected candidate pair's RTT to the upload, the receive, or both paths:
   * 'both' is used only for the publisher report of a confirmed single-PC
   * `publisher-only` session, whose one transport carries both RTP directions.
   * In every other mode the publisher report is upload and the subscriber
   * report is receive, so a subscriber's receive quality can never inherit the
   * publisher's RTP/candidate RTT.
   */
  private _processStatsReport(
    statsReport: RTCStatsReport | undefined,
    state: QualityCheckState,
    rttTarget: 'upload' | 'receive' | 'both',
    publisherIdentityByTrackId: Map<string, string>,
  ): ReportEvidence {
    if (!statsReport) return { present: false, uploadUsable: false, receiveUsable: false };

    /*
     * The transport's selected candidate pair is authoritative when present:
     * a stale `nominated` pair from an earlier attempt must never supply RTT.
     * The selected/nominated flags are only a fallback without that metadata.
     */
    const selectedPairIds = new Set<string>();
    /*
     * Capture activity is read in this pre-pass so that an outbound-rtp entry
     * can be judged no matter which order the report enumerates its entries
     * (the iteration order of an RTCStatsReport is not meaningful).
     */
    const captureActivityByTrack = new Map<string, boolean>();
    const captureActivityByStatId = new Map<string, boolean>();
    /*
     * media-source stat id -> its trackIdentifier. Used to prove that an
     * outbound-rtp's mediaSourceId actually references the SENDER's own capture
     * track, so an unrelated active source can never verify a mic stall.
     */
    const captureTrackIdByStatId = new Map<string, string>();

    statsReport.forEach((rawStat) => {
      const stat = rawStat as WebRTCStat;

      if (stat.type === 'transport' && typeof stat.selectedCandidatePairId === 'string') {
        selectedPairIds.add(stat.selectedCandidatePairId);
      }

      if (stat.type !== 'media-source') return;

      const sourceKind = stat.kind ?? stat.mediaType;
      const trackIdentifier = stat.trackIdentifier;

      if (sourceKind !== 'audio' || typeof trackIdentifier !== 'string' || !trackIdentifier) return;

      state.activeAudioSourceTracks.add(trackIdentifier);

      const captureActive = this.resolveAudioSourceActivity(trackIdentifier, stat);

      // an unknown (no usable counter or no baseline yet) source is never
      // dropped silently: it must not be mistaken for verified activity later
      if (typeof stat.id === 'string') {
        captureActivityByStatId.set(stat.id, captureActive === true);
        captureTrackIdByStatId.set(stat.id, trackIdentifier);
      }
      captureActivityByTrack.set(trackIdentifier, captureActive === true);
    });

    let uploadUsable = false;
    let receiveUsable = false;

    const outboundRecords: OutboundStreamRecord[] = [];

    /*
     * Fresh receiver-report loss, keyed by the outbound SSRC it reports on. The
     * enumeration order of an RTCStatsReport is not meaningful: a
     * remote-inbound-rtp may be listed before the outbound-rtp it reports on, so
     * the loss cannot be applied inline. It is collected here and applied after
     * the whole report is walked, once the per-SSRC packetsSent delta is known.
     */
    const freshRemoteInboundLoss = new Map<string, number>();
    /*
     * Raw packetsSent delta of this report's outbound-rtp streams, keyed by
     * SSRC. Only set when a same-generation previous baseline exists and the
     * delta is non-negative (a counter regression proves nothing).
     */
    const outboundPacketsSentDelta = new Map<string, number>();

    statsReport.forEach((rawStat) => {
      const stat = rawStat as WebRTCStat;

      if (
        stat.type === 'candidate-pair' &&
        stat.state === 'succeeded' &&
        typeof stat.currentRoundTripTime === 'number'
      ) {
        const isSelectedPair =
          selectedPairIds.size > 0
            ? stat.id !== undefined && selectedPairIds.has(String(stat.id))
            : Boolean(stat.selected || stat.nominated);

        const rttMs = stat.currentRoundTripTime * 1000;

        // an authoritative selected-pair RTT is usable directional evidence.
        // A finite numeric zero is accepted by policy as a real reading, which
        // is distinct from an absent RTT (null) that proves nothing.
        // It is routed to the direction(s) the caller declares for this report:
        // 'both' only for the single-PC publisher-only transport that owns RTP
        // in both directions.
        if (isSelectedPair && this.isSaneRtt(rttMs)) {
          if (rttTarget === 'upload' || rttTarget === 'both') {
            state.uploadRtt = this.updateMaxRtt(state.uploadRtt, rttMs);
            uploadUsable = true;
          }
          if (rttTarget === 'receive' || rttTarget === 'both') {
            state.receiveRtt = this.updateMaxRtt(state.receiveRtt, rttMs);
            receiveUsable = true;
          }
        }
      }

      if (stat.type === 'remote-inbound-rtp') {
        const ssrc = String(stat.ssrc ?? stat.id);
        state.activeRemoteInboundSsrcs.add(ssrc);

        const prev = this.prevRemoteInboundStats[ssrc];
        const timestamp = typeof stat.timestamp === 'number' ? stat.timestamp : undefined;

        /*
         * Only a new receiver report may count. For remote-inbound-rtp the spec
         * defines RTCStats.timestamp as the time the corresponding RTCP RR was
         * received, so a strictly advancing timestamp is the one standard
         * freshness proof. An unchanged (or absent) timestamp proves nothing,
         * so a stale fractionLost is never re-counted as fresh distress and
         * never counts as healthy recovery.
         */
        const hasFreshReport = this.resolveFreshness(timestamp, prev?.timestamp) ?? false;

        const fractionLost = stat.fractionLost;

        /*
         * Only a finite fractionLost is evidence. A NaN reading must never
         * poison myPacketLoss (and with it the score and the adaptation
         * decision) nor count as a usable health signal.
         */
        if (hasFreshReport && typeof fractionLost === 'number' && Number.isFinite(fractionLost)) {
          // browsers report fractionLost already normalised (raw byte / 256, so
          // 0..~0.996); * 100 yields 0..~100. The 0..100 clamp is defensive only
          // and must not be read as a 0..255 normalisation.
          const loss = Math.min(100, Math.max(0, fractionLost * 100));
          // deferred: only contributes once the matching outbound-rtp's packetsSent
          // delta passes the packet-count gate (see the forEach below)
          freshRemoteInboundLoss.set(ssrc, loss);
          // a receiver report is always about our outbound RTP, so it is
          // upload evidence no matter which report carries it — independent of
          // the packet-count gate (mirrors the receive-side low-packet rule): a
          // low-packet RR still proves upload works, it just carries no loss.
          uploadUsable = true;
        }

        /*
         * remote-inbound-rtp.roundTripTime is deliberately ignored: the SFU RR
         * DLSR mixes monotonic-anchored arrival with wall-clock now, so the
         * browser RTT carries a constant bogus offset (~2535ms observed vs ~1ms
         * pair RTT). Upload RTT comes only from the selected candidate pair.
         */

        this.prevRemoteInboundStats[ssrc] = { timestamp };

        return;
      }

      if (stat.type === 'outbound-rtp') {
        const ssrc = String(stat.ssrc ?? stat.id);
        const outboundKind = stat.kind ?? stat.mediaType;

        if (outboundKind !== 'audio' && outboundKind !== 'video') return;

        state.activeOutboundSsrcs.add(ssrc);

        /*
         * An absent counter is not a zero: bytesSent/framesSent are optional in
         * the spec, so a missing one is an unmeasurable interval — it must
         * neither mature a stall nor overwrite the last known counter with 0.
         */
        const currentBytes =
          typeof stat.bytesSent === 'number' && Number.isFinite(stat.bytesSent)
            ? stat.bytesSent
            : undefined;
        const currentFrames =
          typeof stat.framesSent === 'number' && Number.isFinite(stat.framesSent)
            ? stat.framesSent
            : undefined;
        const currentPacketsSent =
          typeof stat.packetsSent === 'number' && Number.isFinite(stat.packetsSent)
            ? stat.packetsSent
            : undefined;

        const prev = this.prevOutboundStats[ssrc];

        /*
         * Packets sent in this interval, for the upload-loss gate. A comparable
         * previous baseline in the same generation (prevOutboundStats is cleared
         * on every baseline reset) is required; a missing counter or a regression
         * proves nothing and leaves the interval unmeasurable (no loss value at
         * all, never a zero).
         */
        if (
          prev !== undefined &&
          prev.packetsSent !== undefined &&
          currentPacketsSent !== undefined &&
          currentPacketsSent >= prev.packetsSent
        ) {
          outboundPacketsSentDelta.set(ssrc, currentPacketsSent - prev.packetsSent);
        }

        const senderTrack = this.findSenderTrackByMid(stat.mid);

        // Detect empty blank canvas tracks to avoid false reports
        const isCanvasTrack =
          senderTrack &&
          ((senderTrack as any).isPlaceholderCanvas ||
            senderTrack.label === 'canvas' ||
            (typeof HTMLCanvasElement !== 'undefined' &&
              (senderTrack as any).canvas instanceof HTMLCanvasElement));

        const matchingPub = this.findActiveLocalPublication(outboundKind, senderTrack);
        const senderTrackId =
          senderTrack?.id || matchingPub?.track?.mediaStreamTrack?.id || undefined;
        const groupKey = this.resolveOutboundGroupKey(
          outboundKind,
          matchingPub,
          senderTrack,
          stat,
          ssrc,
        );

        /*
         * Muted/disabled/ended/placeholder/published-elsewhere tracks have no
         * active publication, so they can never be a stalled send.
         */
        const baseEligible = matchingPub !== undefined && !isCanvasTrack;

        /*
         * A stall is a property of the publication interval, not of an SSRC:
         * counters reset whenever the sender/publication identity or the
         * counter itself changes (SSRC reuse, track replacement, encoder
         * restart), so a new stream never inherits a matured stall.
         */
        const identityChanged =
          prev !== undefined &&
          (prev.groupKey !== groupKey ||
            (senderTrackId !== undefined &&
              prev.senderTrackId !== undefined &&
              prev.senderTrackId !== senderTrackId));

        /*
         * Audio matures an interval only when capture is verified for it: the
         * spec media-source energy delta proves the microphone produced audio
         * while nothing was sent (a real send stall). Silence/Opus DTX leaves
         * energy flat, and no audio-source stats at all leaves capture unknown,
         * so both stay not-stuck instead of pausing video for user silence.
         */
        const audioCaptureVerified =
          outboundKind === 'audio' &&
          this.resolveVerifiedAudioCapture({
            mediaSourceId: typeof stat.mediaSourceId === 'string' ? stat.mediaSourceId : undefined,
            senderTrackId,
            activityByStatId: captureActivityByStatId,
            activityByTrack: captureActivityByTrack,
            trackIdByStatId: captureTrackIdByStatId,
          });

        /*
         * An inactive stream (spec active === false) is not expected to send,
         * so its frozen counters must neither mature a stall nor accumulate
         * stall intervals that the next active interval would inherit.
         */
        const isInactive = stat.active === false;

        let stagnantCount = 0;

        if (
          baseEligible &&
          !identityChanged &&
          !isInactive &&
          prev !== undefined &&
          prev.bytesSent > 0 &&
          currentBytes !== undefined &&
          currentBytes > 0
        ) {
          // identical counters for the interval; video additionally compares
          // framesSent (absent framesSent can never read as an unchanged 0)
          const countersStagnant =
            currentBytes === prev.bytesSent &&
            (outboundKind === 'audio' || currentFrames === prev.framesSent);

          /*
           * Video stagnation is verified by its own counters (both bytes and
           * frames frozen); audio additionally needs the capture proof above,
           * so a silent microphone can never mature one.
           */
          const stagnationIsVerified = outboundKind === 'video' || audioCaptureVerified;

          if (countersStagnant && stagnationIsVerified) {
            stagnantCount = (prev.stagnantCount ?? 0) + 1;
          }
        }

        if (outboundKind === 'audio') {
          state.hasAudioOutbound = true;
        }

        if (outboundKind === 'video') {
          state.hasVideoOutbound = true;
        }

        outboundRecords.push({
          kind: outboundKind,
          groupKey,
          source: matchingPub?.source,
          active: typeof stat.active === 'boolean' ? stat.active : undefined,
          stagnantCount,
          eligible: baseEligible,
        });

        this.prevOutboundStats[ssrc] = {
          bytesSent: currentBytes ?? prev?.bytesSent ?? 0,
          framesSent: currentFrames ?? prev?.framesSent ?? 0,
          // keep the raw counter (or none when unreported); never bridge a gap
          packetsSent: currentPacketsSent,
          stagnantCount,
          groupKey,
          senderTrackId,
        };

        return;
      }

      const kind = stat.kind ?? stat.mediaType;
      if (kind !== 'video' && kind !== 'audio') return;

      if (stat.type === 'inbound-rtp') {
        const ssrc = String(stat.ssrc ?? stat.id);
        state.activeInboundSsrcs.add(ssrc);

        // inbound-rtp is keyed by trackIdentifier; attribute it to the remote
        // publisher that owns that track so its loss can be told apart from mine
        const publisherIdentity =
          typeof stat.trackIdentifier === 'string'
            ? publisherIdentityByTrackId.get(stat.trackIdentifier)
            : undefined;

        const currentLost = Math.max(0, stat.packetsLost || 0);
        const currentReceived = Math.max(0, stat.packetsReceived || 0);

        const prev = this.prevInboundStats[ssrc];

        if (prev) {
          const lostDelta = currentLost - prev.lost;
          const receivedDelta = currentReceived - prev.received;

          if (lostDelta >= 0 && receivedDelta >= 0) {
            const total = lostDelta + receivedDelta;

            if (total > 0) {
              const loss = (lostDelta / total) * 100;

              /*
               * A remote publisher's own bad uplink propagates to every
               * subscriber through the SFU, so its loss is theirs: keep it out
               * of my receive-loss diagnostics (receivePacketLoss/rawPacketLoss).
               */
              const selfReportedPoorUplink =
                publisherIdentity !== undefined &&
                this.isPublisherUplinkPoor?.(publisherIdentity) === true;

              /*
               * Both diagnostics are per-stream worst-of aggregates (max), so a
               * low-packet interval must be excluded from both instead of
               * letting a single 1-of-4 lost packet dominate the sample as 25%
               * loss. inboundPacketLoss/receivePacketLoss therefore share the
               * rawPacketLoss minimum (MIN_ACTIVE_PACKETS_FOR_LOSS_ANALYSIS):
               * when no stream reaches it, the sample carries no loss evidence
               * and receivePacketLoss stays 0.
               */
              if (!selfReportedPoorUplink && total >= MIN_ACTIVE_PACKETS_FOR_LOSS_ANALYSIS) {
                state.inboundPacketLoss = Math.max(state.inboundPacketLoss, loss);
                state.maxPacketLoss = Math.max(state.maxPacketLoss, loss);
              }

              /*
               * A real delta over a known interval proves the download direction
               * is delivering (even at zero loss), so it is genuine receive
               * evidence on whichever report carries it. This is independent of
               * the packet-count gate above: a low-packet delta is still proof
               * that receive works, it simply must not supply a loss value, so
               * it must never flip receiveMeasured/measured to false when RTT
               * evidence already justifies them.
               */
              receiveUsable = true;

              state.remoteReceiveStats.push({
                ssrc,
                kind,
                packetLoss: loss,
                packetsLostDelta: lostDelta,
                packetsReceivedDelta: receivedDelta,
                quality: this.classify({
                  packetLoss: loss,
                  rtt: null,
                }),
                publisherIdentity,
              });
            }
          }
        }

        this.prevInboundStats[ssrc] = {
          lost: currentLost,
          received: currentReceived,
        };
      }
    });

    /*
     * Upload-loss gate (see MIN_ACTIVE_PACKETS_FOR_LOSS_ANALYSIS). A fresh
     * receiver report's fractionLost may only supply a loss value when the
     * outbound stream it reports on (same SSRC) actually sent at least
     * MIN_ACTIVE_PACKETS_FOR_LOSS_ANALYSIS packets in this interval. Quiet/DTX
     * audio or a briefly-active simulcast layer can lose 1 of 4 packets, which
     * fractionLost reports as 25% and would classify the upload as Lost — a
     * false positive. With no comparable outbound delta (missing/regressed
     * counters, first sample after a baseline reset, or the outbound-rtp carried
     * by the other report) the interval is unknown and yields no loss value; the
     * RR's upload evidence above is unaffected. Mirrors the receive-side gate.
     */
    freshRemoteInboundLoss.forEach((loss, ssrc) => {
      const packetsSentDelta = outboundPacketsSentDelta.get(ssrc);
      if (
        packetsSentDelta !== undefined &&
        packetsSentDelta >= MIN_ACTIVE_PACKETS_FOR_LOSS_ANALYSIS
      ) {
        state.myPacketLoss = Math.max(state.myPacketLoss, loss);
        state.maxPacketLoss = Math.max(state.maxPacketLoss, loss);
      }
    });

    /*
     * Report-local source calculation only: this report's outbound records are
     * judged here, but the shared flags are aggregated across reports because
     * both PeerConnections write into the same state. A publisher report that
     * matured a stall must survive the subscriber report that is processed next
     * (and vice versa); a later empty/outbound-free report must never clear it.
     * Capture baselines are pruned once, after both reports, in the caller.
     */
    const audioOutboundStuck = this.resolveAudioOutboundStuck(outboundRecords);
    const videoOutboundStuck = this.resolveVideoOutboundStuck(outboundRecords);

    state.isAudioOutboundStuck = state.isAudioOutboundStuck || audioOutboundStuck;
    state.isVideoOutboundStuck = state.isVideoOutboundStuck || videoOutboundStuck;

    /*
     * A matured, verified outbound stall is genuine distress evidence: it keeps
     * an uplink that produces no receiver reports from being read as unknown
     * (which would otherwise suppress stuck/distress protection).
     */
    if (audioOutboundStuck || videoOutboundStuck) {
      uploadUsable = true;
    }

    return { present: true, uploadUsable, receiveUsable };
  }

  /**
   * Publication/sender identity of one outbound stream. Every simulcast layer
   * of the same publication shares it, which is what lets the flags below
   * aggregate layers instead of judging one SSRC at a time. Falls back to the
   * sender track, then to the transceiver mid (shared by all layers of one
   * sender), and only as a last resort to the SSRC itself.
   */
  private resolveOutboundGroupKey(
    kind: 'audio' | 'video',
    publication: LocalTrackPublication | undefined,
    senderTrack: MediaStreamTrack | null,
    stat: WebRTCStat,
    ssrc: string,
  ): string {
    if (publication?.trackSid) return `pub:${publication.trackSid}`;
    if (senderTrack?.id) return `track:${senderTrack.id}`;
    if (typeof stat.mid === 'string' && stat.mid) return `mid:${stat.mid}`;
    return `${kind}:ssrc:${ssrc}`;
  }

  /**
   * Whether capture activity is verified for one outbound audio stream. The
   * sender's track is matched through the spec's outbound-rtp `mediaSourceId`
   * link, or through the source's `trackIdentifier`. The `mediaSourceId` link is
   * only trusted when the referenced source actually belongs to the sender: its
   * `trackIdentifier` must equal the resolved sender track id, otherwise an
   * unrelated active capture track (a different publication's source) could
   * falsely verify the mic. Anything unprovable stays unverified and therefore
   * never matures an audio stall.
   */
  private resolveVerifiedAudioCapture(input: {
    mediaSourceId?: string;
    senderTrackId?: string;
    activityByStatId: Map<string, boolean>;
    activityByTrack: Map<string, boolean>;
    trackIdByStatId: Map<string, string>;
  }): boolean {
    if (
      input.mediaSourceId !== undefined &&
      input.senderTrackId !== undefined &&
      input.activityByStatId.get(input.mediaSourceId) === true &&
      input.trackIdByStatId.get(input.mediaSourceId) === input.senderTrackId
    ) {
      return true;
    }

    if (input.senderTrackId && input.activityByTrack.get(input.senderTrackId) === true) {
      return true;
    }

    return false;
  }

  /**
   * Spec-backed capture-activity delta of one audio media source
   * (RTCAudioSourceStats). `totalAudioEnergy` is the accumulated energy of the
   * captured samples and `totalSamplesDuration` is the cumulative produced
   * duration in seconds. The energy is duration-weighted (each sample's squared
   * amplitude times its duration), so the produced duration cancels out and an
   * interval's RMS-like amplitude is sqrt(deltaEnergy / deltaDuration) with no
   * explicit sample rate. A raw "energy advanced" test is not sufficient:
   * background noise has positive energy and a DTX-suppressed mic keeps the
   * counter creeping, so the delta is normalised by the produced sample
   * duration and required to clear a conservative floor
   * (MIN_MEANINGFUL_CAPTURE_RMS - a policy heuristic, not a VAD/speech proof).
   *
   * Returns:
   *   - `undefined` when any counter (or its baseline) is unavailable: the
   *     interval is unknown and must never be read as verified activity. There
   *     is deliberately no fallback to "any positive energy" — the produced
   *     sample duration is required to interpret the energy.
   *   - `false` for a counter regression or a nonpositive produced duration:
   *     such an interval cannot prove new meaningful capture.
   *   - the RMS floor decision otherwise.
   */
  private resolveAudioSourceActivity(
    trackIdentifier: string,
    stat: WebRTCStat,
  ): boolean | undefined {
    const prev = this.prevAudioSourceStats[trackIdentifier];

    const energy =
      typeof stat.totalAudioEnergy === 'number' && Number.isFinite(stat.totalAudioEnergy)
        ? stat.totalAudioEnergy
        : undefined;
    const samples =
      typeof stat.totalSamplesDuration === 'number' && Number.isFinite(stat.totalSamplesDuration)
        ? stat.totalSamplesDuration
        : undefined;

    this.prevAudioSourceStats[trackIdentifier] = {
      totalAudioEnergy: energy,
      totalSamplesDuration: samples,
    };

    if (
      energy === undefined ||
      samples === undefined ||
      prev?.totalAudioEnergy === undefined ||
      prev?.totalSamplesDuration === undefined
    ) {
      return undefined;
    }

    const deltaEnergy = energy - prev.totalAudioEnergy;
    const deltaDuration = samples - prev.totalSamplesDuration;

    // a regressed counter cannot prove capture over a real interval
    if (deltaEnergy < 0 || deltaDuration < 0) return false;
    // no newly produced sample duration means there is nothing to interpret
    if (deltaDuration <= 0) return false;

    // totalAudioEnergy is duration-weighted, so the interval's RMS-like
    // amplitude is simply the energy delta over the produced duration
    const rms = Math.sqrt(deltaEnergy / deltaDuration);

    return rms >= MIN_MEANINGFUL_CAPTURE_RMS;
  }

  /**
   * Microphone stall: only a verified-capture stagnation of an active
   * microphone publication counts. Screen-share audio is deliberately excluded
   * (it must never drive audio-critical adaptation) and so is any audio that
   * could not be linked to an active publication. A stream the spec reports
   * inactive (active === false) is not sending and can never count either.
   */
  private resolveAudioOutboundStuck(records: OutboundStreamRecord[]): boolean {
    return records.some(
      (record) =>
        record.kind === 'audio' &&
        record.source === Track.Source.Microphone &&
        record.eligible &&
        record.active !== false &&
        record.stagnantCount >= OUTBOUND_STUCK_INTERVAL_THRESHOLD,
    );
  }

  /**
   * Camera stall: every non-idle layer of one active camera publication must be
   * stagnant. A layer the SDK reports as inactive (spec `active === false`, e.g.
   * a dynacast-paused simulcast layer) is not expected to progress, so it
   * neither proves nor disproves a stall; a publication whose layers are all
   * reported inactive is a paused camera, not a stalled encoder. Screen-share
   * video never counts (it must never drive camera-critical adaptation).
   */
  private resolveVideoOutboundStuck(records: OutboundStreamRecord[]): boolean {
    const groups = new Map<string, OutboundStreamRecord[]>();

    records.forEach((record) => {
      if (record.kind !== 'video' || record.source !== Track.Source.Camera || !record.eligible) {
        return;
      }

      const members = groups.get(record.groupKey);

      if (members) {
        members.push(record);
      } else {
        groups.set(record.groupKey, [record]);
      }
    });

    for (const members of groups.values()) {
      const considered = members.filter((member) => member.active !== false);

      if (considered.length === 0) continue;

      if (considered.every((member) => member.stagnantCount >= OUTBOUND_STUCK_INTERVAL_THRESHOLD)) {
        return true;
      }
    }

    return false;
  }

  private async collectQualityStats(): Promise<QualityStats> {
    const generation = this.measurementGeneration;

    // an unknown interval must not be diffed against pre-gap counters or
    // mature a phantom outbound-stuck on the next sample
    if (!this.room || this.room.state !== ConnectionState.Connected) {
      this.clearDeltaBaselines();
      return this.createStatsForSyntheticState();
    }

    const pcManager = this.room.engine?.pcManager;

    if (!pcManager) {
      this.clearDeltaBaselines();
      return this.createStatsForSyntheticState();
    }

    const [pub, sub] = await Promise.allSettled([
      pcManager.publisher?.getStats(),
      pcManager.subscriber?.getStats(),
    ]);

    /*
     * A generation bump during the getStats() awaits makes this superseded
     * collection entirely inert: it must process nothing and mutate nothing.
     * The reset that bumped the generation already cleared the delta maps
     * (resetMeasurementBaseline/stop), so clearing again here would erase the
     * freshly established baselines of the new generation. The caller discards
     * this result via its own generation check.
     */
    if (generation !== this.measurementGeneration) {
      return this.createStatsForSyntheticState();
    }

    const state: QualityCheckState = {
      maxPacketLoss: 0,
      uploadRtt: null,
      receiveRtt: null,
      myPacketLoss: 0,
      inboundPacketLoss: 0,
      remoteReceiveStats: [],
      hasAudioOutbound: false,
      hasVideoOutbound: false,
      isAudioOutboundStuck: false,
      isVideoOutboundStuck: false,
      activeInboundSsrcs: new Set(),
      activeOutboundSsrcs: new Set(),
      activeRemoteInboundSsrcs: new Set(),
      activeAudioSourceTracks: new Set(),
    };

    // note: the generic check above already rejects reports whose awaits
    // straddled a generation bump; what remains here is guaranteed to be
    // same-generation data
    const publisherReport = pub.status === 'fulfilled' ? pub.value : undefined;
    const subscriberReport = sub.status === 'fulfilled' ? sub.value : undefined;

    /*
     * Report identity is not a direction. `pcManager.mode` is the one public,
     * authoritative topology signal: current LiveKit V1 single-PC sessions use
     * `publisher-only`, where the publisher PC carries both send and receive and
     * no subscriber PC exists, so its single report is judged for upload and
     * receive. Topology is therefore determined from the mode alone — never from
     * the `needsPublisher`/`needsSubscriber` role flags or report presence,
     * which a dual-PC publisher-primary session can equally exhibit despite
     * having a separate subscriber. Dual-PC modes remain fully supported, and
     * their RTT must not cross transports: only this publisher-only transport
     * routes to 'both', every other mode keeps the publisher report on upload.
     */
    const publisherIsSinglePc = pcManager.mode === 'publisher-only';

    // built once per collection (not per inbound stat) so publisher attribution
    // is cheap and consistent across both reports
    const publisherIdentityByTrackId = this.buildPublisherIdentityByTrackId();

    const publisherEvidence = this._processStatsReport(
      publisherReport,
      state,
      publisherIsSinglePc ? 'both' : 'upload',
      publisherIdentityByTrackId,
    );
    const subscriberEvidence = this._processStatsReport(
      subscriberReport,
      state,
      'receive',
      publisherIdentityByTrackId,
    );

    this.pruneStaleKeys(this.prevInboundStats, state.activeInboundSsrcs);
    this.pruneStaleKeys(this.prevOutboundStats, state.activeOutboundSsrcs);
    this.pruneStaleKeys(this.prevRemoteInboundStats, state.activeRemoteInboundSsrcs);

    /*
     * Capture baselines are pruned once here, against the union of both
     * reports' media-source tracks, exactly like the baselines above. Pruning
     * inside a single report would judge the publisher's capture baselines
     * against only that report's tracks (or a subscriber-only snapshot), which
     * could wrongly erase a still-live publisher baseline between the reports.
     */
    this.pruneStaleKeys(this.prevAudioSourceStats, state.activeAudioSourceTracks);

    /*
     * This generation's directional usability: whether each direction produced
     * real health evidence, aggregated across both reports. A direction is not a
     * report — a single-PC publisher-only session proves its receive direction
     * through the publisher report's inbound deltas and selected-pair RTT, and
     * an RR/inbound delta carried by the "other" report still counts for its own
     * direction. It travels on the sample as uploadMeasured/receiveMeasured so a
     * partial sample (one direction unknown) can still expose the direction it
     * did verify, without ever claiming global health — `measured` still
     * requires every expected direction. A report's two flags are never blindly
     * merged into both directions.
     */
    const uploadUsable = publisherEvidence.uploadUsable || subscriberEvidence.uploadUsable;
    const receiveUsable = publisherEvidence.receiveUsable || subscriberEvidence.receiveUsable;

    return this.createStats({
      measured: this.resolveMeasured({
        /*
         * `needsPublisher`/`needsSubscriber` are only the SDK's
         * required-connectivity role flags (subscriber-primary flips them) and
         * neither proves the direction is idle: LiveKit allocates both
         * PeerConnections in every non-publisher-only mode, and a role that
         * does not need a direction can still carry active media. So a
         * direction is expected when it is required or when it genuinely has
         * active media/subscriptions; otherwise a failed report on a direction
         * with real RTP would be read as manufactured recovery.
         */
        uploadExpected: (pcManager.needsPublisher ?? true) || this.hasActivePublisherMedia(),
        receiveExpected: (pcManager.needsSubscriber ?? false) || this.hasActiveSubscriberMedia(),
        uploadUsable,
        receiveUsable,
      }),
      uploadMeasured: uploadUsable,
      receiveMeasured: receiveUsable,
      rawPacketLoss: state.maxPacketLoss,
      uploadRtt: state.uploadRtt,
      receiveRtt: state.receiveRtt,
      myPacketLoss: state.myPacketLoss,
      receivePacketLoss: state.inboundPacketLoss,
      remoteReceiveStats: state.remoteReceiveStats,
      isUploadAudioStuck: state.hasAudioOutbound && state.isAudioOutboundStuck,
      isUploadVideoStuck: state.hasVideoOutbound && state.isVideoOutboundStuck,
    });
  }

  /**
   * Conservative `measured` semantics: a sample counts as measured only when
   * every expected direction produced genuinely usable evidence (see
   * `ReportEvidence.uploadUsable`/`receiveUsable`). A missing/failed report, or
   * a report that proves nothing (stale receiver report, unselected candidate
   * pairs, bare outbound counters), leaves its direction unknown — never healthy
   * recovery. A direction is expected when its connection is required
   * (`needsPublisher`/`needsSubscriber`) or when it has active
   * media/subscriptions, so a direction that carries real RTP is always required
   * even if its role flag is false; a direction with neither is never required.
   *
   * `uploadUsable`/`receiveUsable` are the per-direction usability values, not
   * per-report "known" flags: a single-PC publisher-only session proves both
   * directions through its one publisher report. The caller also publishes them
   * as uploadMeasured/receiveMeasured, so a partial sample still exposes the
   * direction it did verify without claiming global health.
   */
  private resolveMeasured(input: {
    uploadExpected: boolean;
    receiveExpected: boolean;
    uploadUsable: boolean;
    receiveUsable: boolean;
  }): boolean {
    if (!input.uploadExpected && !input.receiveExpected) return false;
    if (input.uploadExpected && !input.uploadUsable) return false;
    if (input.receiveExpected && !input.receiveUsable) return false;

    return true;
  }

  /**
   * Freshness of the receiver-report arrival timestamp. Returns undefined when
   * the field is absent so the caller degrades to "unknown" (never healthy). A
   * first-ever non-zero value proves at least one report has been received; a
   * first-ever zero proves nothing. A non-increasing value means no new report
   * (or a reset) and must never count as fresh evidence.
   */
  private resolveFreshness(current?: number, previous?: number): boolean | undefined {
    if (current === undefined) return undefined;
    if (previous === undefined) return current > 0;
    return current > previous;
  }

  /**
   * Drops the delta/stuck baselines without touching score or history: an
   * unknown interval (disconnected room, missing PC manager) must never be
   * diffed against pre-gap counters or mature a phantom outbound-stuck on the
   * next sample. A mid-flight generation bump does not call this: the
   * superseded await is inert (it processes nothing and mutates nothing), and
   * the reset that bumped the generation already cleared these baselines.
   */
  private clearDeltaBaselines = () => {
    this.prevInboundStats = {};
    this.prevOutboundStats = {};
    this.prevRemoteInboundStats = {};
    this.prevAudioSourceStats = {};
  };

  /**
   * Drops every entry of a per-key baseline map whose key did not appear in the
   * latest sample, so a stale SSRC/track baseline can never be diffed against a
   * later reappearance.
   */
  private pruneStaleKeys<T>(map: Record<string, T>, activeKeys: Set<string>): void {
    Object.keys(map).forEach((key) => {
      if (!activeKeys.has(key)) {
        delete map[key];
      }
    });
  }

  private findSenderTrackByMid(mid?: string): MediaStreamTrack | null {
    if (!this.room || !mid) return null;

    const transceivers = this.room.engine?.pcManager?.publisher?.getTransceivers?.();

    if (!transceivers) return null;

    const transceiver = transceivers.find(
      (item) => item.mid === mid && item.direction !== 'stopped',
    );

    return transceiver?.sender.track ?? null;
  }

  private findActiveLocalPublication(
    kind: 'audio' | 'video',
    senderTrack?: MediaStreamTrack | null,
  ): LocalTrackPublication | undefined {
    if (!this.room) {
      return undefined;
    }

    for (const pub of this.room.localParticipant.trackPublications.values()) {
      const mediaStreamTrack = pub.track?.mediaStreamTrack;

      if (
        pub.kind !== kind ||
        !pub.track ||
        !mediaStreamTrack ||
        pub.isMuted ||
        !mediaStreamTrack.enabled ||
        mediaStreamTrack.readyState === 'ended'
      ) {
        continue;
      }

      if (senderTrack && mediaStreamTrack === senderTrack) {
        return pub;
      }
    }
  }

  /**
   * True when a live, unmuted local audio/video track is actually being
   * published, i.e. the upload direction carries real media even when the SDK
   * does not require a publisher connection (subscriber-primary that later
   * publishes).
   */
  private hasActivePublisherMedia(): boolean {
    const publications = this.room?.localParticipant?.trackPublications;
    if (!publications) return false;

    for (const publication of publications.values()) {
      const mediaStreamTrack = publication.track?.mediaStreamTrack;

      if (
        publication.track &&
        mediaStreamTrack &&
        !publication.isMuted &&
        mediaStreamTrack.enabled &&
        mediaStreamTrack.readyState !== 'ended'
      ) {
        return true;
      }
    }

    return false;
  }

  /**
   * True when this client holds at least one live subscribed remote track, i.e.
   * the download direction genuinely receives media even when `needsSubscriber`
   * is false (publisher-primary sessions still subscribe to others). Uses the
   * room publication API rather than the mere existence of the subscriber
   * PeerConnection, which LiveKit always allocates.
   */
  private hasActiveSubscriberMedia(): boolean {
    const participants = this.room?.remoteParticipants;
    if (!participants) return false;

    for (const participant of participants.values()) {
      for (const publication of participant.trackPublications.values()) {
        if (!publication.isSubscribed) continue;
        if (publication.track?.mediaStreamTrack?.readyState === 'ended') continue;

        return true;
      }
    }

    return false;
  }

  /**
   * Maps each subscribed remote track's MediaStreamTrack.id to its publisher's
   * LiveKit identity, so an inbound-rtp entry (keyed by trackIdentifier) can be
   * attributed to the publisher that owns it. Built once per collection;
   * unmappable tracks are simply absent from the map.
   */
  private buildPublisherIdentityByTrackId(): Map<string, string> {
    const identityByTrackId = new Map<string, string>();
    const participants = this.room?.remoteParticipants;
    if (!participants) return identityByTrackId;

    for (const participant of participants.values()) {
      for (const publication of participant.trackPublications.values()) {
        const trackId = publication.track?.mediaStreamTrack?.id;
        if (trackId) {
          identityByTrackId.set(trackId, participant.identity);
        }
      }
    }

    return identityByTrackId;
  }

  private classify({
    packetLoss,
    rtt,
  }: {
    packetLoss: number;
    rtt: number | null;
  }): PnmConnectionQuality {
    if (packetLoss >= LOST_PACKET_LOSS_THRESHOLD || (rtt !== null && rtt >= LOST_RTT_THRESHOLD)) {
      return PnmConnectionQuality.Lost;
    }

    const isCompoundingPoor =
      packetLoss >= COMPOUND_POOR_PACKET_LOSS_THRESHOLD &&
      rtt !== null &&
      rtt >= COMPOUND_POOR_RTT_THRESHOLD;

    if (
      isCompoundingPoor ||
      packetLoss >= GOOD_PACKET_LOSS_THRESHOLD ||
      (rtt !== null && rtt >= GOOD_RTT_THRESHOLD)
    ) {
      return PnmConnectionQuality.Poor;
    }

    if (
      packetLoss >= EXCELLENT_PACKET_LOSS_THRESHOLD ||
      (rtt !== null && rtt >= EXCELLENT_RTT_THRESHOLD)
    ) {
      return PnmConnectionQuality.Good;
    }

    return PnmConnectionQuality.Excellent;
  }

  /**
   * Synthetic quality marked `measured: false`: no distress, no recovery
   * evidence and no directional validity — no direction was measured.
   */
  private createStatsForSyntheticState(): QualityStats {
    return this.createStats({
      measured: false,
      uploadMeasured: false,
      receiveMeasured: false,
      rawPacketLoss: 100,
      uploadRtt: LOST_RTT_THRESHOLD,
      receiveRtt: LOST_RTT_THRESHOLD,
      myPacketLoss: 100,
      receivePacketLoss: 100,
      isUploadAudioStuck: false,
      isUploadVideoStuck: false,
      remoteReceiveStats: [],
    });
  }

  private createStats(input: {
    measured: boolean;
    uploadMeasured: boolean;
    receiveMeasured: boolean;
    rawPacketLoss: number;
    uploadRtt: number | null;
    receiveRtt: number | null;
    myPacketLoss: number;
    receivePacketLoss: number;
    isUploadAudioStuck: boolean;
    isUploadVideoStuck: boolean;
    remoteReceiveStats: RemoteReceiveStats[];
  }): QualityStats {
    const hasUploadSignal = input.uploadRtt !== null || input.myPacketLoss > 0;

    const rawUploadQuality = hasUploadSignal
      ? this.classify({
          packetLoss: input.myPacketLoss,
          rtt: input.uploadRtt,
        })
      : PnmConnectionQuality.Excellent;

    const isLikelyDownloadIssue = this.isLikelyMyDownloadIssue(
      input.remoteReceiveStats,
      input.measured,
      input.receiveRtt,
    );

    // receive quality is judged on the subscriber's own RTT only: it must
    // never inherit the publisher-only upload RTT
    const receiveLossForClassification = isLikelyDownloadIssue ? input.receivePacketLoss : 0;
    const rawReceiveQuality = this.classify({
      packetLoss: receiveLossForClassification,
      rtt: input.receiveRtt,
    });

    /*
     * RTT-only Lost hysteresis, per direction. A direction is "RTT-only Lost"
     * when classify returned Lost while its packet loss stayed below
     * LOST_PACKET_LOSS_THRESHOLD, i.e. the Lost came purely from
     * rtt >= LOST_RTT_THRESHOLD. A single RTT spike may be Poor but never Lost:
     * only MIN_CONSECUTIVE_RTT_LOST_SAMPLES consecutive measured samples
     * escalate to Lost. Loss-backed Lost is never delayed. The streak only
     * advances/resets on measured samples (unmeasured samples are ignored by
     * consumers); on an unmeasured sample the streak is left untouched, so a
     * pending (streak < MIN) RTT-only Lost is reported Poor, never Lost. The
     * downgraded value is computed once here and feeds worstQuality,
     * videoFreezeIsBenign, isMyConnectionPoor, isReceivingPoor and the emitted
     * uploadQuality/receiveQuality, so they can never disagree. Trade-off: a
     * genuine RTT-only Lost is surfaced ~one sample (5s) later; the adaptive
     * controller's own 2-sample Lost streak still applies on top.
     */
    const uploadRttOnlyLost =
      rawUploadQuality === PnmConnectionQuality.Lost &&
      input.myPacketLoss < LOST_PACKET_LOSS_THRESHOLD;
    const receiveRttOnlyLost =
      rawReceiveQuality === PnmConnectionQuality.Lost &&
      receiveLossForClassification < LOST_PACKET_LOSS_THRESHOLD;

    if (input.measured) {
      this.uploadRttLostStreak = uploadRttOnlyLost ? this.uploadRttLostStreak + 1 : 0;
      this.receiveRttLostStreak = receiveRttOnlyLost ? this.receiveRttLostStreak + 1 : 0;
    }

    const uploadQuality =
      uploadRttOnlyLost && this.uploadRttLostStreak < MIN_CONSECUTIVE_RTT_LOST_SAMPLES
        ? PnmConnectionQuality.Poor
        : rawUploadQuality;
    const receiveQuality =
      receiveRttOnlyLost && this.receiveRttLostStreak < MIN_CONSECUTIVE_RTT_LOST_SAMPLES
        ? PnmConnectionQuality.Poor
        : rawReceiveQuality;

    /*
     * A frozen outbound video stream on a healthy transport is usually a
     * consumption pause (dynacast stops encoding with no viewers): report
     * stuck only when transport distress or an audio freeze confirms a real
     * uplink problem. This is only a second gate — the stall itself already
     * requires every non-idle layer of the camera publication to be stagnant.
     * Audio stuck is never suppressed here, but it is only ever reported when
     * capture activity was verified for the stalled interval. Uses the final
     * (post-hysteresis) upload quality, so a downgraded RTT-only Lost still
     * suppresses the benign-freeze path exactly like a Poor does.
     */
    const videoFreezeIsBenign =
      uploadQuality !== PnmConnectionQuality.Poor &&
      uploadQuality !== PnmConnectionQuality.Lost &&
      !input.isUploadAudioStuck;

    const worstQuality =
      uploadQuality === PnmConnectionQuality.Lost || receiveQuality === PnmConnectionQuality.Lost
        ? PnmConnectionQuality.Lost
        : uploadQuality === PnmConnectionQuality.Poor ||
            receiveQuality === PnmConnectionQuality.Poor
          ? PnmConnectionQuality.Poor
          : uploadQuality === PnmConnectionQuality.Good ||
              receiveQuality === PnmConnectionQuality.Good
            ? PnmConnectionQuality.Good
            : PnmConnectionQuality.Excellent;

    /*
     * Overall status by consecutive-sample hysteresis (see
     * resolveDisplayedQuality). Only measured worstQuality values enter the
     * window (synthetic samples never move the user-visible status); the status
     * changes only when the whole window is uniformly worse or uniformly better
     * than it. A single spike therefore never changes it, sustained Poor shows
     * Poor, sustained Lost shows Lost, and recovery needs two consecutive
     * better samples.
     */
    if (input.measured) {
      this.measuredQualityWindow.push(worstQuality);
      if (this.measuredQualityWindow.length > MIN_CONSECUTIVE_SAMPLES_FOR_STATUS_CHANGE) {
        this.measuredQualityWindow.shift();
      }

      this.displayedQuality = this.resolveDisplayedQuality();
    }

    const overallQuality = this.displayedQuality;

    const isMyConnectionPoor =
      uploadQuality === PnmConnectionQuality.Poor || uploadQuality === PnmConnectionQuality.Lost;

    return {
      measured: input.measured,
      uploadMeasured: input.uploadMeasured,
      receiveMeasured: input.receiveMeasured,

      rawPacketLoss: input.rawPacketLoss,
      rtt: this.pickMaxRtt(input.uploadRtt, input.receiveRtt),
      uploadRtt: input.uploadRtt,
      receiveRtt: input.receiveRtt,

      uploadQuality,
      receiveQuality,
      overallQuality,

      // coarse severity of the displayed status (100/75/40/20), kept for the
      // diagnostics tooltip
      score: qualityToScore(overallQuality),

      myPacketLoss: input.myPacketLoss,
      myRtt: input.uploadRtt,
      receivePacketLoss: input.receivePacketLoss,

      remoteReceiveStats: input.remoteReceiveStats,
      isLikelyDownloadIssue,

      isMyConnectionPoor,

      isReceivingPoor:
        receiveQuality === PnmConnectionQuality.Poor ||
        receiveQuality === PnmConnectionQuality.Lost,

      isUploadAudioStuck: input.isUploadAudioStuck,
      isUploadVideoStuck: input.isUploadVideoStuck && !videoFreezeIsBenign,
    };
  }

  /**
   * A remote publisher's uplink loss propagates to every subscriber, so one
   * lossy publisher must not read as my download problem — counting streams
   * would even double-count its audio+video. Group active streams by publisher
   * and drop any already self-reporting a poor uplink: a lone remaining
   * publisher counts only once it has passed that filter, while with several at
   * least MIN_PUBLISHERS_FOR_DOWNLOAD_ISSUE must be poor and the poor ratio must
   * be met.
   */
  private isLikelyMyDownloadIssue(
    remoteReceiveStats: RemoteReceiveStats[],
    measured: boolean,
    receiveRtt: number | null,
  ): boolean {
    const publisherIsPoor = new Map<string, boolean>();

    for (const stat of remoteReceiveStats) {
      const total = stat.packetsLostDelta + stat.packetsReceivedDelta;
      if (total < MIN_ACTIVE_PACKETS_FOR_LOSS_ANALYSIS) continue;

      // their uplink, not my download (see the injected predicate)
      if (stat.publisherIdentity && this.isPublisherUplinkPoor?.(stat.publisherIdentity)) {
        continue;
      }

      // Every stream without a mapped publisher shares one bucket (see
      // UNKNOWN_PUBLISHER_KEY): per-SSRC grouping would split one publisher's
      // audio + video into two "publishers" and could satisfy the
      // >= MIN_PUBLISHERS corroboration, which is strictly more permissive.
      const key = stat.publisherIdentity ?? UNKNOWN_PUBLISHER_KEY;
      const poor =
        stat.quality === PnmConnectionQuality.Poor || stat.quality === PnmConnectionQuality.Lost;

      publisherIsPoor.set(key, (publisherIsPoor.get(key) ?? false) || poor);
    }

    // no poor publisher at all is a clean (non-poor) sample: the lone-publisher
    // corroboration streak must not survive it
    if (publisherIsPoor.size === 0) {
      this.singlePublisherPoorStreak = 0;
      return false;
    }

    const poorPublishers = [...publisherIsPoor.values()].filter(Boolean).length;

    if (publisherIsPoor.size < MIN_PUBLISHERS_FOR_DOWNLOAD_ISSUE) {
      return this.resolveSinglePublisherDownloadIssue(poorPublishers > 0, measured, receiveRtt);
    }

    // a multi-publisher sample is judged by the ratio rule; the lone-publisher
    // streak does not apply here and must not leak into a later single-publisher one
    this.singlePublisherPoorStreak = 0;

    return (
      poorPublishers >= MIN_PUBLISHERS_FOR_DOWNLOAD_ISSUE &&
      poorPublishers / publisherIsPoor.size >= DOWNLOAD_ISSUE_POOR_STREAM_RATIO
    );
  }

  /**
   * Below MIN_PUBLISHERS_FOR_DOWNLOAD_ISSUE the single remaining publisher's
   * poorness is not enough on its own: it may be that publisher's own bad uplink
   * relayed through the SFU. It is accepted only when corroborated by either
   *   (a) the poor condition persisted for
   *       MIN_CONSECUTIVE_POOR_SAMPLES_FOR_DOWNLOAD_ISSUE consecutive measured
   *       samples (a local, lasting condition rather than a one-off burst), or
   *   (b) the receive-side RTT is itself Poor-grade (GOOD_RTT_THRESHOLD) — a
   *       local path problem independent of the publisher.
   * The streak resets on a non-poor sample and at every baseline/stop boundary;
   * synthetic (measured === false) samples never advance it. Trade-off: a real
   * 1:1 downlink issue is flagged ~one measured sample later unless the RTT
   * already confirms it. The multi-publisher path instead applies the ratio rule.
   */
  private resolveSinglePublisherDownloadIssue(
    isPoor: boolean,
    measured: boolean,
    receiveRtt: number | null,
  ): boolean {
    if (!isPoor) {
      this.singlePublisherPoorStreak = 0;
      return false;
    }

    // only a measured sample may confirm a lasting condition
    if (measured) {
      this.singlePublisherPoorStreak += 1;
    }

    const rttCorroborates = receiveRtt !== null && receiveRtt >= GOOD_RTT_THRESHOLD;

    return (
      this.singlePublisherPoorStreak >= MIN_CONSECUTIVE_POOR_SAMPLES_FOR_DOWNLOAD_ISSUE ||
      rttCorroborates
    );
  }

  /**
   * The "your connection is unstable" toast is loss-backed. A Poor/Lost upload
   * caused only by a high upload RTT (>= GOOD_RTT_THRESHOLD with zero loss) must
   * not blame the user's uplink: RTT alone cannot attribute the side (a slow
   * server or a congested return path looks identical). The one signal
   * attributable to my uplink is the remote-inbound-rtp loss ratio, already
   * restricted by the packet-count gate to a >= MIN_ACTIVE_PACKETS_FOR_LOSS_ANALYSIS
   * packetsSent delta, so a mildly Poor upload needs myPacketLoss >=
   * GOOD_PACKET_LOSS_THRESHOLD. Loss-backed Lost is included by the same
   * threshold, and a confirmed RTT-only Lost also counts (`uploadQuality ===
   * Lost` alone qualifies): the RTT-only downgrade only reports Lost after
   * MIN_CONSECUTIVE_RTT_LOST_SAMPLES consecutive measured samples, i.e. the
   * session is genuinely unusable. Only measured samples can back distress (an
   * unmeasured sample carries no evidence); handleQualityState is only ever fed
   * measured samples, but the guard here keeps that invariant explicit.
   */
  private isNotifiableUploadDistress(stats: QualityStats): boolean {
    return (
      stats.measured &&
      (stats.uploadQuality === PnmConnectionQuality.Poor ||
        stats.uploadQuality === PnmConnectionQuality.Lost) &&
      (stats.myPacketLoss >= GOOD_PACKET_LOSS_THRESHOLD ||
        stats.uploadQuality === PnmConnectionQuality.Lost)
    );
  }

  private handleQualityState(stats: QualityStats) {
    this.currentQuality = stats.overallQuality;

    // the history window and its recovery accounting share one signal — a
    // loss-backed (or confirmed Lost) upload sample is distress, everything
    // else (incl. an RTT-only Poor) is a "good" entry
    const uploadDistress = this.isNotifiableUploadDistress(stats);

    this.poorConnectionHistory.push(uploadDistress);
    if (this.poorConnectionHistory.length > HISTORY_WINDOW_SIZE) {
      this.poorConnectionHistory.shift();
    }

    const poorCount = this.poorConnectionHistory.filter(Boolean).length;
    const goodCount = this.poorConnectionHistory.length - poorCount;

    if (this.isConnectionCurrentlyPoor && goodCount >= GOOD_RECOVERY_THRESHOLD) {
      this.isConnectionCurrentlyPoor = false;
    }

    this.maybeNotifyUser(poorCount);
  }

  private maybeNotifyUser(poorCount: number) {
    if (this.isConnectionCurrentlyPoor) return;

    if (this.poorConnectionNotificationCount >= MAX_POOR_CONNECTION_NOTIFICATIONS) {
      return;
    }

    const now = Date.now();
    const canNotify = now - this.lastPoorConnectionNotificationAt > NOTIFICATION_COOLDOWN;

    if (poorCount < POOR_WINDOW_THRESHOLD || !canNotify) return;

    this.isConnectionCurrentlyPoor = true;
    this.lastPoorConnectionNotificationAt = now;
    this.poorConnectionNotificationCount += 1;
    this.poorConnectionHistory = [];

    store.dispatch(
      addUserNotification({
        message: i18n.t('notifications.your-connection-lost-or-unstable'),
        typeOption: 'error',
      }),
    );
  }

  /**
   * A usable RTT reading. A finite numeric zero is accepted by policy as a
   * real reading, distinct from an absent RTT (null) that proves nothing. Only
   * impossible values are rejected: negative, non-finite, or above
   * MAX_SANE_RTT (a bogus reading that would poison the score).
   */
  private isSaneRtt(value: number): boolean {
    return Number.isFinite(value) && value >= 0 && value <= MAX_SANE_RTT;
  }

  private updateMaxRtt(current: number | null, value: number): number | null {
    if (!this.isSaneRtt(value)) {
      return current;
    }

    return current === null ? value : Math.max(current, value);
  }

  /** Compatibility `rtt` diagnostic: the larger of the two live directions. */
  private pickMaxRtt(uploadRtt: number | null, receiveRtt: number | null): number | null {
    if (uploadRtt === null) return receiveRtt;
    if (receiveRtt === null) return uploadRtt;
    return Math.max(uploadRtt, receiveRtt);
  }

  /**
   * Hysteresis decision. `measuredQualityWindow` holds the last
   * MIN_CONSECUTIVE_SAMPLES_FOR_STATUS_CHANGE measured worstQuality values.
   * With a full window: uniformly worse than displayed → the least severe of
   * them (highest score, closest to the current status); uniformly better →
   * the most severe of them (lowest score); anything mixed → unchanged. An
   * incomplete window never changes the status.
   */
  private resolveDisplayedQuality(): PnmConnectionQuality {
    const window = this.measuredQualityWindow;
    if (window.length < MIN_CONSECUTIVE_SAMPLES_FOR_STATUS_CHANGE) {
      return this.displayedQuality;
    }

    const displayedScore = qualityToScore(this.displayedQuality);
    const allWorse = window.every((quality) => qualityToScore(quality) < displayedScore);
    const allBetter = window.every((quality) => qualityToScore(quality) > displayedScore);

    if (allWorse) {
      return window.reduce((a, b) => (qualityToScore(a) >= qualityToScore(b) ? a : b));
    }
    if (allBetter) {
      return window.reduce((a, b) => (qualityToScore(a) <= qualityToScore(b) ? a : b));
    }

    return this.displayedQuality;
  }
}
