import { ConnectionState, Room } from 'livekit-client';

import { store } from '../../store';
import { addUserNotification } from '../../store/slices/roomSettingsSlice';
import i18n from '../i18n';

export enum ConnectionQuality {
  Excellent = 'excellent',
  Good = 'good',
  Poor = 'poor',
  Lost = 'lost',
}

const EXCELLENT_PACKET_LOSS_THRESHOLD = 3;
const GOOD_PACKET_LOSS_THRESHOLD = 10;
const LOST_PACKET_LOSS_THRESHOLD = 20;

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
const NOTIFICATION_COOLDOWN = 60_000;

const MAX_SCORE = 100;
const MIN_SCORE = 20;
const DECREASE_FACTOR = 0.8;
const INCREASE_FACTOR = 0.4;

const MIN_ACTIVE_PACKETS_FOR_RECEIVE_ANALYSIS = 20;
const MIN_STREAMS_FOR_DOWNLOAD_ISSUE = 2;
const DOWNLOAD_ISSUE_POOR_STREAM_RATIO = 0.6;

const OUTBOUND_STUCK_INTERVAL_THRESHOLD = 2;

type PrevInboundStats = {
  lost: number;
  received: number;
};

type PrevOutboundStats = {
  bytesSent: number;
  framesSent: number;
  stagnantCount: number;
};

export type RemoteReceiveStats = {
  ssrc: string;
  kind: 'audio' | 'video';
  packetLoss: number;
  packetsLostDelta: number;
  packetsReceivedDelta: number;
  quality: ConnectionQuality;
};

export type QualityStats = {
  rawPacketLoss: number;
  rtt: number | null;

  uploadQuality: ConnectionQuality;
  receiveQuality: ConnectionQuality;
  overallQuality: ConnectionQuality;

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
  packetsLost?: number;
  packetsReceived?: number;
  fractionLost?: number;
  roundTripTime?: number;
  state?: string;
  selected?: boolean;
  nominated?: boolean;
  currentRoundTripTime?: number;
  bytesSent?: number;
  framesSent?: number;
};

type QualityCheckState = {
  maxPacketLoss: number;
  maxRtt: number | null;

  myPacketLoss: number;
  myRtt: number | null;

  inboundPacketLoss: number;
  remoteReceiveStats: RemoteReceiveStats[];

  hasAudioOutbound: boolean;
  hasVideoOutbound: boolean;
  isAudioOutboundStuck: boolean;
  isVideoOutboundStuck: boolean;

  activeInboundSsrcs: Set<string>;
  activeOutboundSsrcs: Set<string>;
};

export default class ConnectionQualityMonitor {
  private readonly room: Room;

  private poorConnectionHistory: boolean[] = [];
  private lastPoorConnectionNotificationAt = 0;
  private qualityCheckTimeout: ReturnType<typeof setTimeout> | null = null;
  private isConnectionCurrentlyPoor = false;
  private isCheckingQuality = false;
  private isStopped = true;

  private currentQuality: ConnectionQuality = ConnectionQuality.Excellent;
  private qualityScore = MAX_SCORE;

  private prevInboundStats: Record<string, PrevInboundStats> = {};
  private prevOutboundStats: Record<string, PrevOutboundStats> = {};

  constructor(room: Room) {
    this.room = room;
  }

  public start = (onQualityUpdate?: (stats: QualityStats) => void) => {
    this.stop();
    this.isStopped = false;

    const checkQuality = async () => {
      if (this.isStopped || this.isCheckingQuality) return;

      this.isCheckingQuality = true;

      try {
        const stats = await this.collectQualityStats();
        if (this.isStopped) return;

        this.handleQualityState(stats);
        onQualityUpdate?.(stats);
      } finally {
        this.isCheckingQuality = false;

        if (!this.isStopped) {
          this.qualityCheckTimeout = setTimeout(checkQuality, INTERVAL);
        }
      }
    };

    void checkQuality();
  };

  public stop = () => {
    this.isStopped = true;

    if (this.qualityCheckTimeout) {
      clearTimeout(this.qualityCheckTimeout);
      this.qualityCheckTimeout = null;
    }

    this.poorConnectionHistory = [];
    this.lastPoorConnectionNotificationAt = 0;
    this.isConnectionCurrentlyPoor = false;
    this.isCheckingQuality = false;
    this.currentQuality = ConnectionQuality.Excellent;
    this.qualityScore = MAX_SCORE;
    this.prevInboundStats = {};
    this.prevOutboundStats = {};
  };

  public getOverallQuality = () => this.currentQuality;

  private _processStatsReport(
    statsReport: RTCStatsReport | undefined,
    state: QualityCheckState,
  ) {
    statsReport?.forEach((rawStat) => {
      const stat = rawStat as WebRTCStat;

      if (
        stat.type === 'candidate-pair' &&
        stat.state === 'succeeded' &&
        (stat.selected || stat.nominated) &&
        typeof stat.currentRoundTripTime === 'number'
      ) {
        const rttMs = stat.currentRoundTripTime * 1000;
        state.maxRtt = this.updateMaxRtt(state.maxRtt, rttMs);
        state.myRtt = this.updateMaxRtt(state.myRtt, rttMs);
      }

      if (stat.type === 'remote-inbound-rtp') {
        if (typeof stat.fractionLost === 'number') {
          const loss = Math.max(0, stat.fractionLost * 100);
          state.myPacketLoss = Math.max(state.myPacketLoss, loss);
          state.maxPacketLoss = Math.max(state.maxPacketLoss, loss);
        }

        if (typeof stat.roundTripTime === 'number') {
          const rttMs = stat.roundTripTime * 1000;
          state.myRtt = this.updateMaxRtt(state.myRtt, rttMs);
          state.maxRtt = this.updateMaxRtt(state.maxRtt, rttMs);
        }

        return;
      }

      if (stat.type === 'outbound-rtp') {
        const ssrc = String(stat.ssrc ?? stat.id);
        const outboundKind = stat.kind ?? stat.mediaType;

        if (outboundKind !== 'audio' && outboundKind !== 'video') return;

        state.activeOutboundSsrcs.add(ssrc);

        const currentBytes = stat.bytesSent ?? 0;
        const currentFrames =
          outboundKind === 'video' ? (stat.framesSent ?? 0) : 0;
        const prev = this.prevOutboundStats[ssrc];

        let isTrackActive = true;

        for (const pub of this.room.localParticipant.trackPublications.values()) {
          const mediaStreamTrack = pub.track?.mediaStreamTrack;

          if (pub.kind === outboundKind && mediaStreamTrack) {
            isTrackActive =
              !pub.isMuted &&
              mediaStreamTrack.enabled &&
              mediaStreamTrack.readyState !== 'ended';
            break;
          }
        }

        let isStagnant = false;

        if (prev && isTrackActive && prev.bytesSent > 0 && currentBytes > 0) {
          if (outboundKind === 'audio') {
            isStagnant = currentBytes === prev.bytesSent;
          }

          if (outboundKind === 'video') {
            isStagnant =
              currentBytes === prev.bytesSent &&
              currentFrames === prev.framesSent;
          }
        }

        const stagnantCount =
          isStagnant && prev ? (prev.stagnantCount ?? 0) + 1 : 0;

        const isStuck = stagnantCount >= OUTBOUND_STUCK_INTERVAL_THRESHOLD;

        if (outboundKind === 'audio') {
          state.hasAudioOutbound = true;
          state.isAudioOutboundStuck ||= isStuck;
        }

        if (outboundKind === 'video') {
          state.hasVideoOutbound = true;
          state.isVideoOutboundStuck ||= isStuck;
        }

        this.prevOutboundStats[ssrc] = {
          bytesSent: currentBytes,
          framesSent: currentFrames,
          stagnantCount,
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
  }

  private async collectQualityStats(): Promise<QualityStats> {
    if (this.room.state !== ConnectionState.Connected) {
      return this.createStats({
        rawPacketLoss: 100,
        rtt: LOST_RTT_THRESHOLD,
        myPacketLoss: 100,
        myRtt: LOST_RTT_THRESHOLD,
        receivePacketLoss: 100,
        isUploadAudioStuck: false,
        isUploadVideoStuck: false,
        remoteReceiveStats: [],
      });
    }

    const pcManager = this.room.engine?.pcManager;

    if (!pcManager) {
      return this.createStats({
        rawPacketLoss: 100,
        rtt: LOST_RTT_THRESHOLD,
        myPacketLoss: 100,
        myRtt: LOST_RTT_THRESHOLD,
        receivePacketLoss: 100,
        isUploadAudioStuck: false,
        isUploadVideoStuck: false,
        remoteReceiveStats: [],
      });
    }

    const [pub, sub] = await Promise.allSettled([
      pcManager.publisher?.getStats(),
      pcManager.subscriber?.getStats(),
    ]);

    const state: QualityCheckState = {
      maxPacketLoss: 0,
      maxRtt: null,
      myPacketLoss: 0,
      myRtt: null,
      inboundPacketLoss: 0,
      remoteReceiveStats: [],
      hasAudioOutbound: false,
      hasVideoOutbound: false,
      isAudioOutboundStuck: false,
      isVideoOutboundStuck: false,
      activeInboundSsrcs: new Set(),
      activeOutboundSsrcs: new Set(),
    };

    if (pub.status === 'fulfilled') this._processStatsReport(pub.value, state);
    if (sub.status === 'fulfilled') this._processStatsReport(sub.value, state);

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

    return this.createStats({
      rawPacketLoss: state.maxPacketLoss,
      rtt: state.maxRtt,
      myPacketLoss: state.myPacketLoss,
      myRtt: state.myRtt,
      receivePacketLoss: state.inboundPacketLoss,
      remoteReceiveStats: state.remoteReceiveStats,
      isUploadAudioStuck: state.hasAudioOutbound && state.isAudioOutboundStuck,
      isUploadVideoStuck: state.hasVideoOutbound && state.isVideoOutboundStuck,
    });
  }

  private classify({
    packetLoss,
    rtt,
  }: {
    packetLoss: number;
    rtt: number | null;
  }): ConnectionQuality {
    if (
      packetLoss >= LOST_PACKET_LOSS_THRESHOLD ||
      (rtt !== null && rtt >= LOST_RTT_THRESHOLD)
    ) {
      return ConnectionQuality.Lost;
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
      return ConnectionQuality.Poor;
    }

    if (
      packetLoss >= EXCELLENT_PACKET_LOSS_THRESHOLD ||
      (rtt !== null && rtt >= EXCELLENT_RTT_THRESHOLD)
    ) {
      return ConnectionQuality.Good;
    }

    return ConnectionQuality.Excellent;
  }

  private createStats(input: {
    rawPacketLoss: number;
    rtt: number | null;
    myPacketLoss: number;
    myRtt: number | null;
    receivePacketLoss: number;
    isUploadAudioStuck: boolean;
    isUploadVideoStuck: boolean;
    remoteReceiveStats: RemoteReceiveStats[];
  }): QualityStats {
    const hasUploadSignal = input.myRtt !== null || input.myPacketLoss > 0;

    const uploadQuality = hasUploadSignal
      ? this.classify({
          packetLoss: input.myPacketLoss,
          rtt: input.myRtt,
        })
      : ConnectionQuality.Excellent;

    const isLikelyDownloadIssue = this.isLikelyMyDownloadIssue(
      input.remoteReceiveStats,
    );

    const receiveQuality = isLikelyDownloadIssue
      ? this.classify({
          packetLoss: input.receivePacketLoss,
          rtt: input.rtt,
        })
      : this.classify({
          packetLoss: 0,
          rtt: input.rtt,
        });

    const worstQuality =
      uploadQuality === ConnectionQuality.Lost ||
      receiveQuality === ConnectionQuality.Lost
        ? ConnectionQuality.Lost
        : uploadQuality === ConnectionQuality.Poor ||
            receiveQuality === ConnectionQuality.Poor
          ? ConnectionQuality.Poor
          : uploadQuality === ConnectionQuality.Good ||
              receiveQuality === ConnectionQuality.Good
            ? ConnectionQuality.Good
            : ConnectionQuality.Excellent;

    const rawScore = this.qualityToScore(worstQuality);
    const factor =
      rawScore < this.qualityScore ? DECREASE_FACTOR : INCREASE_FACTOR;

    this.qualityScore = factor * rawScore + (1 - factor) * this.qualityScore;
    this.qualityScore = Math.max(
      MIN_SCORE,
      Math.min(MAX_SCORE, this.qualityScore),
    );

    const overallQuality = this.scoreToQuality(this.qualityScore);

    const isMyConnectionPoor =
      uploadQuality === ConnectionQuality.Poor ||
      uploadQuality === ConnectionQuality.Lost;

    return {
      rawPacketLoss: input.rawPacketLoss,
      rtt: input.rtt,

      uploadQuality,
      receiveQuality,
      overallQuality,

      score: this.qualityScore,

      myPacketLoss: input.myPacketLoss,
      myRtt: input.myRtt,
      receivePacketLoss: input.receivePacketLoss,

      remoteReceiveStats: input.remoteReceiveStats,
      isLikelyDownloadIssue,

      isMyConnectionPoor,

      isReceivingPoor:
        receiveQuality === ConnectionQuality.Poor ||
        receiveQuality === ConnectionQuality.Lost,

      isUploadAudioStuck: input.isUploadAudioStuck,
      isUploadVideoStuck: input.isUploadVideoStuck,
    };
  }

  private isLikelyMyDownloadIssue(
    remoteReceiveStats: RemoteReceiveStats[],
  ): boolean {
    const activeStreams = remoteReceiveStats.filter(
      (stat) =>
        stat.packetsLostDelta + stat.packetsReceivedDelta >=
        MIN_ACTIVE_PACKETS_FOR_RECEIVE_ANALYSIS,
    );

    if (activeStreams.length === 0) return false;

    const poorStreams = activeStreams.filter(
      (stat) =>
        stat.quality === ConnectionQuality.Poor ||
        stat.quality === ConnectionQuality.Lost,
    );

    if (activeStreams.length < MIN_STREAMS_FOR_DOWNLOAD_ISSUE) {
      return poorStreams.length > 0;
    }

    return (
      poorStreams.length / activeStreams.length >=
      DOWNLOAD_ISSUE_POOR_STREAM_RATIO
    );
  }

  private handleQualityState(stats: QualityStats) {
    this.currentQuality = stats.overallQuality;

    this.poorConnectionHistory.push(stats.isMyConnectionPoor);
    if (this.poorConnectionHistory.length > HISTORY_WINDOW_SIZE) {
      this.poorConnectionHistory.shift();
    }

    const poorCount = this.poorConnectionHistory.filter(Boolean).length;
    const goodCount = this.poorConnectionHistory.length - poorCount;

    if (
      this.isConnectionCurrentlyPoor &&
      goodCount >= GOOD_RECOVERY_THRESHOLD
    ) {
      this.isConnectionCurrentlyPoor = false;
    }

    this.maybeNotifyUser(poorCount);
  }

  private maybeNotifyUser(poorCount: number) {
    if (this.isConnectionCurrentlyPoor) return;

    const now = Date.now();
    const canNotify =
      now - this.lastPoorConnectionNotificationAt > NOTIFICATION_COOLDOWN;

    if (poorCount < POOR_WINDOW_THRESHOLD || !canNotify) return;

    this.isConnectionCurrentlyPoor = true;
    this.lastPoorConnectionNotificationAt = now;
    this.poorConnectionHistory = [];

    store.dispatch(
      addUserNotification({
        message: i18n.t('notifications.your-connection-lost-or-unstable'),
        typeOption: 'error',
      }),
    );
  }

  private updateMaxRtt(current: number | null, value: number): number | null {
    if (!Number.isFinite(value) || value <= 0 || value > MAX_SANE_RTT) {
      return current;
    }

    return current === null ? value : Math.max(current, value);
  }

  private qualityToScore(quality: ConnectionQuality): number {
    switch (quality) {
      case ConnectionQuality.Excellent:
        return 100;
      case ConnectionQuality.Good:
        return 75;
      case ConnectionQuality.Poor:
        return 40;
      case ConnectionQuality.Lost:
        return 20;
      default:
        return 100;
    }
  }

  private scoreToQuality(score: number): ConnectionQuality {
    if (score > 80) return ConnectionQuality.Excellent;
    if (score > 40) return ConnectionQuality.Good;
    if (score > 20) return ConnectionQuality.Poor;
    return ConnectionQuality.Lost;
  }
}
