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

const MAX_SCORE = 100;
const MIN_SCORE = 20;
const DECREASE_FACTOR = 0.8;
const INCREASE_FACTOR = 0.4;

const MIN_ACTIVE_PACKETS_FOR_RECEIVE_ANALYSIS = 20;
const MIN_STREAMS_FOR_DOWNLOAD_ISSUE = 2;
const DOWNLOAD_ISSUE_POOR_STREAM_RATIO = 0.6;

/*
 * Conservative track-level stuck detection limits (see
 * resolveAudioOutboundStuck / resolveVideoOutboundStuck):
 *   - Camera stuck is a PUBLICATION property: it matures only when every
 *     non-idle layer of the same camera publication is stagnant, so one idle
 *     simulcast/dynacast layer can never flag a camera that its sibling layer
 *     still encodes.
 *   - Microphone stuck additionally needs spec-backed capture evidence for the
 *     SAME interval: an RTCAudioSourceStats media-source delta proving a
 *     MEANINGFUL captured signal (see resolveAudioSourceActivity), not merely
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

/*
 * Microphone capture-verification policy (resolveAudioSourceActivity).
 *
 * RTCAudioSourceStats.totalAudioEnergy is the accumulated energy of the
 * captured samples and totalSamplesDuration is the cumulative produced duration
 * in seconds. Per spec the energy is already DURATION-WEIGHTED (each sample's
 * squared amplitude times that sample's duration), so the produced duration
 * cancels out of the interval's RMS-like amplitude: an interval's captured
 * amplitude is sqrt(deltaEnergy / deltaDuration), with no explicit sample rate.
 * A raw "energy advanced" test is NOT sufficient proof of speech: a live
 * microphone's background noise floor has positive energy and a DTX-suppressed
 * mic keeps the counter creeping, so the energy delta is normalised by the
 * produced sample duration and required to clear a conservative floor.
 *
 * MIN_MEANINGFUL_CAPTURE_RMS is a deliberate POLICY HEURISTIC that separates an
 * obviously meaningful signal from the noise floor. It is NOT a speech/VAD
 * guarantee and makes no claim about identifiable browser behaviour.
 */
/** ~ -40 dBFS: below this the captured RMS amplitude is treated as noise/silence. */
const MIN_MEANINGFUL_CAPTURE_RMS = 0.01;

type PrevInboundStats = {
  lost: number;
  received: number;
};

type PrevOutboundStats = {
  bytesSent: number;
  framesSent: number;
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
};

export type QualityStats = {
  /**
   * False for synthetic samples that never measured a real connection;
   * consumers must neither treat these as distress nor as full-health
   * recovery evidence.
   */
  measured: boolean;

  /**
   * Directional (per-report) usability of THIS generation, additive to
   * `measured`. True only when that direction's own report produced genuinely
   * usable health evidence (see `ReportEvidence.usable`); false for synthetic
   * samples and for a direction whose report was missing/empty/proofless.
   * `measured` is the AND of every EXPECTED direction, so a partial sample
   * (one direction unknown) can still carry a true directional flag. Consumers
   * may act on such a flag only for that direction's independently verified
   * evidence — never as global health.
   */
  uploadMeasured?: boolean;
  receiveMeasured?: boolean;

  rawPacketLoss: number;
  rtt: number | null;
  /** Upload-path RTT only (publisher candidate pair + remote-inbound RTP). */
  uploadRtt: number | null;
  /** Receive-path RTT only (subscriber candidate pair); never publisher RTT. */
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
  roundTripTime?: number;
  state?: string;
  selected?: boolean;
  nominated?: boolean;
  selectedCandidatePairId?: string;
  currentRoundTripTime?: number;
  /** RTCStats base field; for remote-inbound-rtp it is the RR arrival time */
  timestamp?: number;
  bytesSent?: number;
  framesSent?: number;
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

  /** upload-path RTT (publisher candidate pair + remote-inbound RTP) */
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
 * one standard marker of a NEW receiver report.
 */
type RemoteInboundFreshness = {
  timestamp?: number;
};

/** Whether one direction's report proved anything usable about link health. */
type ReportEvidence = {
  /** the getStats() promise resolved and returned a report */
  present: boolean;
  /**
   * the report yielded a genuine health signal for its direction: an
   * authoritative (selected) candidate-pair RTT, a fresh remote-inbound
   * receiver report, a real inbound delta, or a matured verified outbound stall.
   * Structural entries (unselected candidate pairs, bare outbound byte/frame
   * counters) and unchanged/stale receiver reports never set this.
   */
  usable: boolean;
};

export default class ConnectionQualityMonitor {
  private room: Room | undefined;

  private poorConnectionHistory: boolean[] = [];
  private lastPoorConnectionNotificationAt = 0;
  private poorConnectionNotificationCount: number = 0;
  private qualityCheckTimeout: ReturnType<typeof setTimeout> | null = null;
  private isConnectionCurrentlyPoor = false;
  private isCheckingQuality = false;
  private isStopped = true;

  private currentQuality: PnmConnectionQuality = PnmConnectionQuality.Excellent;
  private qualityScore = MAX_SCORE;

  private prevInboundStats: Record<string, PrevInboundStats> = {};
  private prevOutboundStats: Record<string, PrevOutboundStats> = {};
  private prevRemoteInboundStats: Record<string, RemoteInboundFreshness> = {};
  private prevAudioSourceStats: Record<string, PrevAudioSourceStats> = {};
  private lastStats: QualityStats | null = null;

  /** bumped on baseline reset; in-flight stats of a previous generation are discarded */
  private measurementGeneration = 0;

  /** identifies the active sampling loop; a superseded loop must never touch state */
  private samplingLoopToken = 0;

  public start = (room: Room, onQualityUpdate?: (stats: QualityStats) => void) => {
    this.stop();
    this.room = room;
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

        this.lastStats = stats;

        // a synthetic/unmeasured sample must not move score, history or
        // notifications; it is still emitted for TURN diagnostics/adaptation
        if (stats.measured) {
          this.handleQualityState(stats);
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
    this.isConnectionCurrentlyPoor = false;
    this.isCheckingQuality = false;
    this.currentQuality = PnmConnectionQuality.Excellent;
    this.qualityScore = MAX_SCORE;

    // no delta/stuck/capture baseline (incl. prevAudioSourceStats) may survive
    // the stop boundary, so a later start on the same track id re-baselines
    this.clearDeltaBaselines();
    this.lastStats = null;
    // outstanding async measurements must never survive a stop boundary
    this.measurementGeneration += 1;
    // a superseded loop must never reschedule or release a newer loop's lock
    this.samplingLoopToken += 1;
  };

  public getStats = () => {
    return this.lastStats;
  };

  /**
   * Drops stale stat deltas/history at any boundary and discards (instead
   * of consuming) an in-flight stats collection.
   */
  public resetMeasurementBaseline = () => {
    this.measurementGeneration += 1;
    this.clearDeltaBaselines();
    this.poorConnectionHistory = [];
    // getStats() must never show a sample from the old baseline/generation
    this.lastStats = null;
  };

  // pre-hide baselines are stale (throttled timers, adaptive-paused video);
  // both transitions drop them so old evidence is never mixed with new
  private handleVisibilityChange = () => {
    this.resetMeasurementBaseline();
  };

  public getOverallQuality = () => this.currentQuality;

  /**
   * Processes one direction's report and reports whether it proved anything.
   * `usable` is true only when the report produced a genuine health signal for
   * its direction: an authoritative (selected) candidate-pair RTT, a fresh
   * remote-inbound receiver report, a real inbound delta, or a matured
   * outbound-stuck. Structural entries (unselected candidate pairs, bare
   * outbound byte/frame counters) and unchanged/stale receiver reports prove
   * nothing and must never count as a measurement. `rttTarget` routes the
   * selected candidate pair's RTT to the upload or the receive path, so a
   * subscriber's receive quality can never inherit the publisher's
   * RTP/candidate RTT.
   */
  private _processStatsReport(
    statsReport: RTCStatsReport | undefined,
    state: QualityCheckState,
    rttTarget: 'upload' | 'receive',
  ): ReportEvidence {
    if (!statsReport) return { present: false, usable: false };

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

    let usable = false;

    const outboundRecords: OutboundStreamRecord[] = [];

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

        // an authoritative selected-pair RTT is usable directional evidence
        if (isSelectedPair && this.isSaneRtt(rttMs)) {
          if (rttTarget === 'upload') {
            state.uploadRtt = this.updateMaxRtt(state.uploadRtt, rttMs);
          } else {
            state.receiveRtt = this.updateMaxRtt(state.receiveRtt, rttMs);
          }
          usable = true;
        }
      }

      if (stat.type === 'remote-inbound-rtp') {
        const ssrc = String(stat.ssrc ?? stat.id);
        state.activeRemoteInboundSsrcs.add(ssrc);

        const prev = this.prevRemoteInboundStats[ssrc];
        const timestamp = typeof stat.timestamp === 'number' ? stat.timestamp : undefined;

        /*
         * Only a NEW receiver report may count. For remote-inbound-rtp the spec
         * defines RTCStats.timestamp as the time the corresponding RTCP RR was
         * received, so a strictly advancing timestamp is the one standard
         * freshness proof. An unchanged (or absent) timestamp proves nothing,
         * so a stale fractionLost/RTT is never re-counted as fresh distress and
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
          const loss = Math.max(0, fractionLost * 100);
          state.myPacketLoss = Math.max(state.myPacketLoss, loss);
          state.maxPacketLoss = Math.max(state.maxPacketLoss, loss);
          usable = true;
        }

        if (hasFreshReport && typeof stat.roundTripTime === 'number') {
          const rttMs = stat.roundTripTime * 1000;
          if (this.isSaneRtt(rttMs)) {
            state.uploadRtt = this.updateMaxRtt(state.uploadRtt, rttMs);
            usable = true;
          }
        }

        this.prevRemoteInboundStats[ssrc] = { timestamp };

        return;
      }

      if (stat.type === 'outbound-rtp') {
        const ssrc = String(stat.ssrc ?? stat.id);
        const outboundKind = stat.kind ?? stat.mediaType;

        if (outboundKind !== 'audio' && outboundKind !== 'video') return;

        state.activeOutboundSsrcs.add(ssrc);

        /*
         * An absent counter is NOT a zero: bytesSent/framesSent are optional in
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

        const prev = this.prevOutboundStats[ssrc];

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
         * A stall is a property of the PUBLICATION interval, not of an SSRC:
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
         * Audio matures an interval only when capture is VERIFIED for it: the
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
              state.inboundPacketLoss = Math.max(state.inboundPacketLoss, loss);
              state.maxPacketLoss = Math.max(state.maxPacketLoss, loss);

              // a real delta over a known interval proves this direction is
              // delivering (even at zero loss), so it is a genuine measurement
              usable = true;

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
     * Report-LOCAL source calculation only: this report's outbound records are
     * judged here, but the shared flags are AGGREGATED with OR because both
     * PeerConnections write into the same state. A publisher report that
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
      usable = true;
    }

    return { present: true, usable };
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
   * UNRELATED active capture track (a different publication's source) could
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
   * duration in seconds. The energy is DURATION-WEIGHTED (each sample's squared
   * amplitude times its duration), so the produced duration cancels out and an
   * interval's RMS-like amplitude is sqrt(deltaEnergy / deltaDuration) with no
   * explicit sample rate. A raw "energy advanced" test is NOT sufficient:
   * background noise has positive energy and a DTX-suppressed mic keeps the
   * counter creeping, so the delta is normalised by the produced sample
   * duration and required to clear a conservative floor
   * (MIN_MEANINGFUL_CAPTURE_RMS - a policy heuristic, not a VAD/speech proof).
   *
   * Returns:
   *   - `undefined` when any counter (or its baseline) is unavailable: the
   *     interval is UNKNOWN and must never be read as verified activity. There
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
   * neither proves nor disproves a stall; a publication whose layers are ALL
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
     * collection entirely inert: it must process NOTHING and mutate NOTHING.
     * The reset that bumped the generation already cleared the delta maps
     * (resetMeasurementBaseline/stop), so clearing again here would erase the
     * freshly established baselines of the NEW generation. The caller discards
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

    const publisherEvidence = this._processStatsReport(publisherReport, state, 'upload');
    const subscriberEvidence = this._processStatsReport(subscriberReport, state, 'receive');

    Object.keys(this.prevInboundStats).forEach((ssrc) => {
      if (!state.activeInboundSsrcs.has(ssrc)) {
        delete this.prevInboundStats[ssrc];
      }
    });

    Object.keys(this.prevOutboundStats).forEach((ssrc) => {
      if (!state.activeOutboundSsrcs.has(ssrc)) {
        delete this.prevOutboundStats[ssrc];
      }
    });

    Object.keys(this.prevRemoteInboundStats).forEach((ssrc) => {
      if (!state.activeRemoteInboundSsrcs.has(ssrc)) {
        delete this.prevRemoteInboundStats[ssrc];
      }
    });

    /*
     * Capture baselines are pruned ONCE here, against the UNION of both
     * reports' media-source tracks, exactly like the baselines above. Pruning
     * inside a single report would judge the publisher's capture baselines
     * against only that report's tracks (or a subscriber-only snapshot), which
     * could wrongly erase a still-live publisher baseline between the reports.
     */
    Object.keys(this.prevAudioSourceStats).forEach((trackIdentifier) => {
      if (!state.activeAudioSourceTracks.has(trackIdentifier)) {
        delete this.prevAudioSourceStats[trackIdentifier];
      }
    });

    /*
     * This generation's DIRECTIONAL usability: whether each direction's own
     * report produced real health evidence. It travels on the sample as
     * uploadMeasured/receiveMeasured so a partial sample (one direction unknown)
     * can still expose the direction it DID verify, without ever claiming global
     * health — `measured` remains the AND of the expected directions.
     */
    const publisherKnown = publisherEvidence.present && publisherEvidence.usable;
    const subscriberKnown = subscriberEvidence.present && subscriberEvidence.usable;

    return this.createStats({
      measured: this.resolveMeasured({
        /*
         * `needsPublisher`/`needsSubscriber` are only the SDK's
         * required-connectivity ROLE flags (subscriber-primary flips them) and
         * neither proves the direction is idle: LiveKit allocates both
         * PeerConnections in every non-publisher-only mode, and a role that
         * does not NEED a direction can still carry active media. So a
         * direction is expected when it is required OR when it genuinely has
         * active media/subscriptions; otherwise a failed report on a direction
         * with real RTP would be read as manufactured recovery.
         */
        publisherExpected: (pcManager.needsPublisher ?? true) || this.hasActivePublisherMedia(),
        subscriberExpected: (pcManager.needsSubscriber ?? false) || this.hasActiveSubscriberMedia(),
        publisherKnown,
        subscriberKnown,
      }),
      uploadMeasured: publisherKnown,
      receiveMeasured: subscriberKnown,
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
   * `ReportEvidence.usable`). A missing/failed report, or a report that proves
   * nothing (stale receiver report, unselected candidate pairs, bare outbound
   * counters), leaves its direction unknown — never healthy recovery. A
   * direction is expected when its connection is required (`needsPublisher`/
   * `needsSubscriber`) OR when it has active media/subscriptions, so a
   * direction that carries real RTP is always required even if its role flag is
   * false; a direction with neither is never required.
   *
   * `publisherKnown`/`subscriberKnown` are the per-direction usability values;
   * the caller also publishes them as uploadMeasured/receiveMeasured, so a
   * partial sample still exposes the direction it DID verify without claiming
   * global health.
   */
  private resolveMeasured(input: {
    publisherExpected: boolean;
    subscriberExpected: boolean;
    publisherKnown: boolean;
    subscriberKnown: boolean;
  }): boolean {
    if (!input.publisherExpected && !input.subscriberExpected) return false;
    if (input.publisherExpected && !input.publisherKnown) return false;
    if (input.subscriberExpected && !input.subscriberKnown) return false;

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
   * next sample. A mid-flight generation bump does NOT call this: the
   * superseded await is inert (it processes nothing and mutates nothing), and
   * the reset that bumped the generation already cleared these baselines.
   */
  private clearDeltaBaselines = () => {
    this.prevInboundStats = {};
    this.prevOutboundStats = {};
    this.prevRemoteInboundStats = {};
    this.prevAudioSourceStats = {};
  };

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
   * evidence AND no directional validity — no direction was measured.
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

    const uploadQuality = hasUploadSignal
      ? this.classify({
          packetLoss: input.myPacketLoss,
          rtt: input.uploadRtt,
        })
      : PnmConnectionQuality.Excellent;

    /*
     * A frozen outbound VIDEO stream on a healthy transport is usually a
     * consumption pause (dynacast stops encoding with no viewers): report
     * stuck only when transport distress or an audio freeze confirms a real
     * uplink problem. This is only a second gate — the stall itself already
     * requires every non-idle layer of the camera publication to be stagnant.
     * Audio stuck is never suppressed here, but it is only ever reported when
     * capture activity was verified for the stalled interval.
     */
    const videoFreezeIsBenign =
      uploadQuality !== PnmConnectionQuality.Poor &&
      uploadQuality !== PnmConnectionQuality.Lost &&
      !input.isUploadAudioStuck;

    const isLikelyDownloadIssue = this.isLikelyMyDownloadIssue(input.remoteReceiveStats);

    // receive quality is judged on the subscriber's own RTT only: it must
    // never inherit the publisher-only upload RTT
    const receiveQuality = isLikelyDownloadIssue
      ? this.classify({
          packetLoss: input.receivePacketLoss,
          rtt: input.receiveRtt,
        })
      : this.classify({
          packetLoss: 0,
          rtt: input.receiveRtt,
        });

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

    // synthetic/invalidated samples must not move the smoothed score; they
    // report the last genuinely measured quality instead
    if (input.measured) {
      const rawScore = this.qualityToScore(worstQuality);
      const factor = rawScore < this.qualityScore ? DECREASE_FACTOR : INCREASE_FACTOR;

      this.qualityScore = factor * rawScore + (1 - factor) * this.qualityScore;
      this.qualityScore = Math.max(MIN_SCORE, Math.min(MAX_SCORE, this.qualityScore));
    }

    const overallQuality = this.scoreToQuality(this.qualityScore);

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

      score: this.qualityScore,

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

  private isLikelyMyDownloadIssue(remoteReceiveStats: RemoteReceiveStats[]): boolean {
    const activeStreams = remoteReceiveStats.filter(
      (stat) =>
        stat.packetsLostDelta + stat.packetsReceivedDelta >=
        MIN_ACTIVE_PACKETS_FOR_RECEIVE_ANALYSIS,
    );

    if (activeStreams.length === 0) return false;

    const poorStreams = activeStreams.filter(
      (stat) =>
        stat.quality === PnmConnectionQuality.Poor || stat.quality === PnmConnectionQuality.Lost,
    );

    if (activeStreams.length < MIN_STREAMS_FOR_DOWNLOAD_ISSUE) {
      return poorStreams.length > 0;
    }

    return poorStreams.length / activeStreams.length >= DOWNLOAD_ISSUE_POOR_STREAM_RATIO;
  }

  private handleQualityState(stats: QualityStats) {
    this.currentQuality = stats.overallQuality;

    this.poorConnectionHistory.push(stats.isMyConnectionPoor);
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

  private isSaneRtt(value: number): boolean {
    return Number.isFinite(value) && value > 0 && value <= MAX_SANE_RTT;
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

  private qualityToScore(quality: PnmConnectionQuality): number {
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
  }

  private scoreToQuality(score: number): PnmConnectionQuality {
    if (score > 80) return PnmConnectionQuality.Excellent;
    if (score > 40) return PnmConnectionQuality.Good;
    if (score > 20) return PnmConnectionQuality.Poor;
    return PnmConnectionQuality.Lost;
  }
}
