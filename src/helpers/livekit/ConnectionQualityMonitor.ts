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

const MAX_SANE_RTT = 10_000;

const LOW_FPS_THRESHOLD = 5;
const FREEZE_DELTA_POOR_THRESHOLD = 2;

const POOR_COUNT_THRESHOLD = 3;
const GOOD_COUNT_THRESHOLD = 2;
const INTERVAL = 5000;
const NOTIFICATION_COOLDOWN = 60_000;

const MAX_SCORE = 100;
const MIN_SCORE = 20;
const DECREASE_FACTOR = 0.8;
const INCREASE_FACTOR = 0.4;

const PACKET_LOSS_HISTORY_SIZE = 3;

type PrevInboundStats = {
  lost: number;
  received: number;
  bytesReceived: number;
  freezeCount: number;
};

export type QualityStats = {
  packetLoss: number;
  rawPacketLoss: number;
  rtt: number | null;
  rawQuality: ConnectionQuality;
  quality: ConnectionQuality;
  score: number;
  fps: number;
  freezeDelta: number;
  hasActiveVideo: boolean;
  hasActiveAudio: boolean;
};

type WebRTCStat = {
  id?: string;
  type?: string;
  kind?: string;
  mediaType?: string;
  ssrc?: number | string;

  packetsLost?: number;
  packetsReceived?: number;
  bytesReceived?: number;

  freezeCount?: number;
  framesPerSecond?: number;

  fractionLost?: number;
  roundTripTime?: number;

  state?: string;
  selected?: boolean;
  nominated?: boolean;
  currentRoundTripTime?: number;
};

export default class ConnectionQualityMonitor {
  private readonly room: Room;

  private poorConnectionCount = 0;
  private goodConnectionCount = 0;
  private lastPoorConnectionNotificationAt = 0;
  private qualityCheckInterval: ReturnType<typeof setInterval> | null = null;
  private isConnectionCurrentlyPoor = false;
  private isCheckingQuality = false;

  private currentQuality: ConnectionQuality = ConnectionQuality.Excellent;
  private qualityScore = MAX_SCORE;

  private prevInboundStats: Record<string, PrevInboundStats> = {};
  private packetLossHistory: number[] = [];

  constructor(room: Room) {
    this.room = room;
  }

  public start = (onQualityUpdate?: (stats: QualityStats) => void) => {
    this.stop();

    const checkQuality = async () => {
      if (this.isCheckingQuality) return;

      this.isCheckingQuality = true;

      try {
        const stats = await this.collectQualityStats();
        this.handleQualityState(stats);
        onQualityUpdate?.(stats);
      } finally {
        this.isCheckingQuality = false;
      }
    };

    void checkQuality();
    this.qualityCheckInterval = setInterval(checkQuality, INTERVAL);
  };

  public stop = () => {
    if (this.qualityCheckInterval) {
      clearInterval(this.qualityCheckInterval);
      this.qualityCheckInterval = null;
    }

    this.poorConnectionCount = 0;
    this.goodConnectionCount = 0;
    this.lastPoorConnectionNotificationAt = 0;
    this.isConnectionCurrentlyPoor = false;
    this.isCheckingQuality = false;
    this.currentQuality = ConnectionQuality.Excellent;
    this.qualityScore = MAX_SCORE;
    this.prevInboundStats = {};
    this.packetLossHistory = [];
  };

  public getCurrentQuality = (): ConnectionQuality => {
    return this.currentQuality;
  };

  private collectQualityStats = async (): Promise<QualityStats> => {
    if (this.room.state !== ConnectionState.Connected) {
      return this.createStats({
        packetLoss: 100,
        rawPacketLoss: 100,
        rtt: LOST_RTT_THRESHOLD,
        rawQuality: ConnectionQuality.Lost,
        fps: 0,
        freezeDelta: 0,
        hasActiveVideo: false,
        hasActiveAudio: false,
      });
    }

    const pcManager = this.room.engine.pcManager;

    if (!pcManager) {
      return this.createStats({
        packetLoss: 100,
        rawPacketLoss: 100,
        rtt: LOST_RTT_THRESHOLD,
        rawQuality: ConnectionQuality.Lost,
        fps: 0,
        freezeDelta: 0,
        hasActiveVideo: false,
        hasActiveAudio: false,
      });
    }

    const [publisherResult, subscriberResult] = await Promise.allSettled([
      pcManager.publisher?.getStats(),
      pcManager.subscriber?.getStats(),
    ]);

    const publisherStats =
      publisherResult.status === 'fulfilled'
        ? publisherResult.value
        : undefined;

    const subscriberStats =
      subscriberResult.status === 'fulfilled'
        ? subscriberResult.value
        : undefined;

    let maxPacketLoss = 0;
    let maxRtt: number | null = null;
    let minFps = Number.POSITIVE_INFINITY;
    let maxFreezeDelta = 0;

    let hasActiveVideo = false;
    let hasActiveAudio = false;

    const activeInboundSsrcs = new Set<string>();

    const updateRttFromCandidatePair = (stat: WebRTCStat) => {
      if (
        stat.type === 'candidate-pair' &&
        stat.state === 'succeeded' &&
        (stat.selected === true || stat.nominated === true) &&
        typeof stat.currentRoundTripTime === 'number'
      ) {
        maxRtt = this.updateMaxRtt(maxRtt, stat.currentRoundTripTime * 1000);
      }
    };

    const processStatsReport = (statsReport?: RTCStatsReport) => {
      statsReport?.forEach((rawStat) => {
        const stat = rawStat as WebRTCStat;

        updateRttFromCandidatePair(stat);

        if (stat.type === 'remote-inbound-rtp') {
          if (typeof stat.fractionLost === 'number') {
            maxPacketLoss = Math.max(
              maxPacketLoss,
              Math.max(0, stat.fractionLost * 100),
            );
          }

          if (typeof stat.roundTripTime === 'number') {
            maxRtt = this.updateMaxRtt(maxRtt, stat.roundTripTime * 1000);
          }

          return;
        }

        if (stat.type !== 'inbound-rtp') return;

        const kind = stat.kind ?? stat.mediaType;

        if (kind !== 'video' && kind !== 'audio') return;

        const isVideo = kind === 'video';
        const isAudio = kind === 'audio';

        const ssrc = String(stat.ssrc ?? stat.id);
        activeInboundSsrcs.add(ssrc);

        const currentLost = Math.max(0, stat.packetsLost || 0);
        const currentReceived = Math.max(0, stat.packetsReceived || 0);
        const currentBytesReceived = Math.max(0, stat.bytesReceived || 0);

        const currentFreezeCount = isVideo
          ? Math.max(0, stat.freezeCount || 0)
          : 0;

        const currentFps =
          isVideo && typeof stat.framesPerSecond === 'number'
            ? stat.framesPerSecond
            : Number.POSITIVE_INFINITY;

        if (isVideo && Number.isFinite(currentFps) && currentFps > 0) {
          minFps = Math.min(minFps, currentFps);
        }

        const prev = this.prevInboundStats[ssrc];

        if (prev) {
          const lostDelta = Math.max(0, currentLost - prev.lost);
          const receivedDelta = Math.max(0, currentReceived - prev.received);
          const bytesDelta = Math.max(
            0,
            currentBytesReceived - prev.bytesReceived,
          );

          const totalDelta = lostDelta + receivedDelta;

          if (totalDelta > 0) {
            maxPacketLoss = Math.max(
              maxPacketLoss,
              (lostDelta / totalDelta) * 100,
            );
          }

          if (receivedDelta > 0 || bytesDelta > 0) {
            if (isVideo) hasActiveVideo = true;
            if (isAudio) hasActiveAudio = true;
          }

          if (isVideo) {
            maxFreezeDelta = Math.max(
              maxFreezeDelta,
              Math.max(0, currentFreezeCount - prev.freezeCount),
            );
          }
        } else if (currentReceived > 0 || currentBytesReceived > 0) {
          if (isVideo) hasActiveVideo = true;
          if (isAudio) hasActiveAudio = true;
        }

        this.prevInboundStats[ssrc] = {
          lost: currentLost,
          received: currentReceived,
          bytesReceived: currentBytesReceived,
          freezeCount: currentFreezeCount,
        };
      });
    };

    // Important:
    // Some LiveKit/browser setups use a single peer connection.
    // In that case, inbound remote media can appear under publisher stats.
    processStatsReport(publisherStats);
    processStatsReport(subscriberStats);

    if (publisherStats || subscriberStats) {
      Object.keys(this.prevInboundStats).forEach((ssrc) => {
        if (!activeInboundSsrcs.has(ssrc)) {
          delete this.prevInboundStats[ssrc];
        }
      });
    }

    const rawPacketLoss = maxPacketLoss;
    const packetLoss = this.getSmoothedPacketLoss(rawPacketLoss);
    const fps = Number.isFinite(minFps) ? minFps : 0;

    const rawQuality = this.classifyRawQuality({
      packetLoss,
      rtt: maxRtt,
      fps,
      freezeDelta: maxFreezeDelta,
      hasActiveVideo,
    });

    return this.createStats({
      packetLoss,
      rawPacketLoss,
      rtt: maxRtt,
      rawQuality,
      fps,
      freezeDelta: maxFreezeDelta,
      hasActiveVideo,
      hasActiveAudio,
    });
  };

  private getSmoothedPacketLoss = (newLoss: number): number => {
    this.packetLossHistory.push(newLoss);

    if (this.packetLossHistory.length > PACKET_LOSS_HISTORY_SIZE) {
      this.packetLossHistory.shift();
    }

    return (
      this.packetLossHistory.reduce((sum, loss) => sum + loss, 0) /
      this.packetLossHistory.length
    );
  };

  private createStats = ({
    packetLoss,
    rawPacketLoss,
    rtt,
    rawQuality,
    fps,
    freezeDelta,
    hasActiveVideo,
    hasActiveAudio,
  }: {
    packetLoss: number;
    rawPacketLoss: number;
    rtt: number | null;
    rawQuality: ConnectionQuality;
    fps: number;
    freezeDelta: number;
    hasActiveVideo: boolean;
    hasActiveAudio: boolean;
  }): QualityStats => {
    const rawScore = this.qualityToScore(rawQuality);

    const factor =
      rawScore < this.qualityScore ? DECREASE_FACTOR : INCREASE_FACTOR;

    this.qualityScore = factor * rawScore + (1 - factor) * this.qualityScore;

    this.qualityScore = Math.max(
      MIN_SCORE,
      Math.min(MAX_SCORE, this.qualityScore),
    );

    return {
      packetLoss,
      rawPacketLoss,
      rtt,
      rawQuality,
      quality: this.scoreToQuality(this.qualityScore),
      score: this.qualityScore,
      fps,
      freezeDelta,
      hasActiveVideo,
      hasActiveAudio,
    };
  };

  private updateMaxRtt = (
    currentMaxRtt: number | null,
    rttMs: number,
  ): number | null => {
    if (!Number.isFinite(rttMs)) return currentMaxRtt;
    if (rttMs <= 0) return currentMaxRtt;
    if (rttMs > MAX_SANE_RTT) return currentMaxRtt;

    return currentMaxRtt === null ? rttMs : Math.max(currentMaxRtt, rttMs);
  };

  private classifyRawQuality = ({
    packetLoss,
    rtt,
    fps,
    freezeDelta,
    hasActiveVideo,
  }: {
    packetLoss: number;
    rtt: number | null;
    fps: number;
    freezeDelta: number;
    hasActiveVideo: boolean;
  }): ConnectionQuality => {
    if (
      packetLoss >= LOST_PACKET_LOSS_THRESHOLD ||
      (rtt !== null && rtt >= LOST_RTT_THRESHOLD)
    ) {
      return ConnectionQuality.Lost;
    }

    if (
      packetLoss >= GOOD_PACKET_LOSS_THRESHOLD ||
      (rtt !== null && rtt >= GOOD_RTT_THRESHOLD) ||
      freezeDelta >= FREEZE_DELTA_POOR_THRESHOLD
    ) {
      return ConnectionQuality.Poor;
    }

    if (
      packetLoss >= EXCELLENT_PACKET_LOSS_THRESHOLD ||
      (rtt !== null && rtt >= EXCELLENT_RTT_THRESHOLD) ||
      (hasActiveVideo && fps > 0 && fps < LOW_FPS_THRESHOLD)
    ) {
      return ConnectionQuality.Good;
    }

    return ConnectionQuality.Excellent;
  };

  private qualityToScore = (quality: ConnectionQuality): number => {
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
  };

  private scoreToQuality = (score: number): ConnectionQuality => {
    if (score > 80) return ConnectionQuality.Excellent;
    if (score > 40) return ConnectionQuality.Good;
    if (score > 20) return ConnectionQuality.Poor;

    return ConnectionQuality.Lost;
  };

  private handleQualityState = (stats: QualityStats) => {
    const { quality } = stats;

    this.currentQuality = quality;

    const isPoorOrLost =
      quality === ConnectionQuality.Poor || quality === ConnectionQuality.Lost;

    if (isPoorOrLost) {
      this.poorConnectionCount++;
      this.goodConnectionCount = 0;
    } else {
      this.goodConnectionCount++;
      this.poorConnectionCount = 0;
    }

    if (
      this.isConnectionCurrentlyPoor &&
      this.goodConnectionCount >= GOOD_COUNT_THRESHOLD
    ) {
      this.isConnectionCurrentlyPoor = false;
    }

    this.maybeNotifyUser(quality);
  };

  private maybeNotifyUser = (quality: ConnectionQuality) => {
    const isPoorOrLost =
      quality === ConnectionQuality.Poor || quality === ConnectionQuality.Lost;

    if (!isPoorOrLost || this.isConnectionCurrentlyPoor) return;

    const now = Date.now();
    const canNotify =
      now - this.lastPoorConnectionNotificationAt > NOTIFICATION_COOLDOWN;

    if (this.poorConnectionCount < POOR_COUNT_THRESHOLD || !canNotify) {
      return;
    }

    this.isConnectionCurrentlyPoor = true;
    this.lastPoorConnectionNotificationAt = now;

    const message =
      quality === ConnectionQuality.Lost
        ? i18n.t('notifications.your-connection-lost-or-unstable')
        : i18n.t('notifications.your-connection-quality-not-good');

    store.dispatch(
      addUserNotification({
        message,
        typeOption: 'error',
      }),
    );

    this.poorConnectionCount = 0;
  };
}
