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

// --- Thresholds ---
const EXCELLENT_PACKET_LOSS_THRESHOLD = 3;
const GOOD_PACKET_LOSS_THRESHOLD = 10;
const LOST_PACKET_LOSS_THRESHOLD = 20;

const EXCELLENT_RTT_THRESHOLD = 250;
const GOOD_RTT_THRESHOLD = 500;
const LOST_RTT_THRESHOLD = 1000;

const MAX_SANE_RTT = 10_000;

const LOW_FPS_THRESHOLD = 5;
const VIDEO_STALL_INTERVAL_THRESHOLD = 2;

const POOR_COUNT_THRESHOLD = 3;
const GOOD_COUNT_THRESHOLD = 2;
const INTERVAL = 5000;
const NOTIFICATION_COOLDOWN = 60_000;

const MAX_SCORE = 100;
const MIN_SCORE = 20;
const DECREASE_FACTOR = 0.8;
const INCREASE_FACTOR = 0.4;

type PrevInboundStats = {
  lost: number;
  received: number;
  bytesReceived: number;
  freezeCount: number;
  noDataCount: number;
};

export type QualityStats = {
  packetLoss: number;
  rtt: number;
  rawQuality: ConnectionQuality;
  quality: ConnectionQuality;
  score: number;
  fps: number;
  freezeDelta: number;
  videoStalled: boolean;
  hasActiveVideo: boolean;
  hasActiveAudio: boolean;
};

type MaybeCandidatePairStats = {
  type?: string;
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

  private prevDownlinkStats: Record<string, PrevInboundStats> = {};

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
    this.prevDownlinkStats = {};
  };

  public getCurrentQuality = (): ConnectionQuality => {
    return this.currentQuality;
  };

  private collectQualityStats = async (): Promise<QualityStats> => {
    if (this.room.state !== ConnectionState.Connected) {
      return this.createStats({
        packetLoss: 100,
        rtt: LOST_RTT_THRESHOLD,
        rawQuality: ConnectionQuality.Lost,
        fps: 0,
        freezeDelta: 0,
        videoStalled: true,
        hasActiveVideo: false,
        hasActiveAudio: false,
      });
    }

    const pcManager = this.room.engine.pcManager;

    if (!pcManager) {
      return this.createStats({
        packetLoss: 100,
        rtt: LOST_RTT_THRESHOLD,
        rawQuality: ConnectionQuality.Lost,
        fps: 0,
        freezeDelta: 0,
        videoStalled: true,
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
    let maxRtt = 0;
    let minFps = Number.POSITIVE_INFINITY;
    let maxFreezeDelta = 0;

    let hasVideoStats = false;
    let hasVideoStall = false;
    let hasActiveVideo = false;
    let hasActiveAudio = false;

    const checkCandidatePairRtt = (stat: MaybeCandidatePairStats) => {
      if (
        stat.type === 'candidate-pair' &&
        stat.state === 'succeeded' &&
        (stat.selected === true || stat.nominated === true) &&
        typeof stat.currentRoundTripTime === 'number'
      ) {
        maxRtt = this.updateMaxRtt(maxRtt, stat.currentRoundTripTime * 1000);
      }
    };

    publisherStats?.forEach((stat) => {
      checkCandidatePairRtt(stat);

      if (stat.type === 'remote-inbound-rtp') {
        if (typeof stat.fractionLost === 'number') {
          const packetLoss = Math.max(0, stat.fractionLost * 100);
          maxPacketLoss = Math.max(maxPacketLoss, packetLoss);
        }

        if (typeof stat.roundTripTime === 'number') {
          maxRtt = this.updateMaxRtt(maxRtt, stat.roundTripTime * 1000);
        }
      }
    });

    const activeDownlinkSsrcs = new Set<string>();

    subscriberStats?.forEach((stat) => {
      checkCandidatePairRtt(stat);

      if (
        stat.type !== 'inbound-rtp' ||
        (stat.kind !== 'video' && stat.kind !== 'audio')
      ) {
        return;
      }

      const isVideo = stat.kind === 'video';
      const isAudio = stat.kind === 'audio';

      if (isVideo) {
        hasVideoStats = true;
      }

      const ssrc = String(stat.ssrc);
      activeDownlinkSsrcs.add(ssrc);

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

      const prev = this.prevDownlinkStats[ssrc];
      let noDataCount = 0;

      if (prev) {
        const lostDelta = Math.max(0, currentLost - prev.lost);
        const receivedDelta = Math.max(0, currentReceived - prev.received);
        const bytesDelta = Math.max(
          0,
          currentBytesReceived - prev.bytesReceived,
        );

        const totalDelta = lostDelta + receivedDelta;

        if (totalDelta > 0) {
          const lossPercentage = (lostDelta / totalDelta) * 100;
          maxPacketLoss = Math.max(maxPacketLoss, lossPercentage);
        }

        if (receivedDelta > 0 || bytesDelta > 0) {
          if (isVideo) {
            hasActiveVideo = true;
          }

          if (isAudio) {
            hasActiveAudio = true;
          }
        }

        if (isVideo) {
          const freezeDelta = Math.max(
            0,
            currentFreezeCount - prev.freezeCount,
          );

          maxFreezeDelta = Math.max(maxFreezeDelta, freezeDelta);

          const noPacketOrByteProgress =
            receivedDelta === 0 && bytesDelta === 0;

          noDataCount = noPacketOrByteProgress ? prev.noDataCount + 1 : 0;

          if (noDataCount >= VIDEO_STALL_INTERVAL_THRESHOLD) {
            hasVideoStall = true;
          }
        }
      }

      this.prevDownlinkStats[ssrc] = {
        lost: currentLost,
        received: currentReceived,
        bytesReceived: currentBytesReceived,
        freezeCount: currentFreezeCount,
        noDataCount,
      };
    });

    if (subscriberStats) {
      Object.keys(this.prevDownlinkStats).forEach((ssrc) => {
        if (!activeDownlinkSsrcs.has(ssrc)) {
          delete this.prevDownlinkStats[ssrc];
        }
      });
    }

    const fps = Number.isFinite(minFps) ? minFps : 0;

    const rawQuality = this.classifyRawQuality({
      packetLoss: maxPacketLoss,
      rtt: maxRtt,
      fps,
      freezeDelta: maxFreezeDelta,
      videoStalled: hasVideoStats && hasVideoStall,
      hasActiveVideo,
    });

    return this.createStats({
      packetLoss: maxPacketLoss,
      rtt: maxRtt,
      rawQuality,
      fps,
      freezeDelta: maxFreezeDelta,
      videoStalled: hasVideoStats && hasVideoStall,
      hasActiveVideo,
      hasActiveAudio,
    });
  };

  private createStats = ({
    packetLoss,
    rtt,
    rawQuality,
    fps,
    freezeDelta,
    videoStalled,
    hasActiveVideo,
    hasActiveAudio,
  }: {
    packetLoss: number;
    rtt: number;
    rawQuality: ConnectionQuality;
    fps: number;
    freezeDelta: number;
    videoStalled: boolean;
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

    const quality = this.scoreToQuality(this.qualityScore);

    return {
      packetLoss,
      rtt,
      rawQuality,
      quality,
      score: this.qualityScore,
      fps,
      freezeDelta,
      videoStalled,
      hasActiveVideo,
      hasActiveAudio,
    };
  };

  private updateMaxRtt = (currentMaxRtt: number, rttMs: number): number => {
    if (!Number.isFinite(rttMs)) return currentMaxRtt;
    if (rttMs <= 0) return currentMaxRtt;
    if (rttMs > MAX_SANE_RTT) return currentMaxRtt;

    return Math.max(currentMaxRtt, rttMs);
  };

  private classifyRawQuality = ({
    packetLoss,
    rtt,
    fps,
    freezeDelta,
    videoStalled,
    hasActiveVideo,
  }: {
    packetLoss: number;
    rtt: number;
    fps: number;
    freezeDelta: number;
    videoStalled: boolean;
    hasActiveVideo: boolean;
  }): ConnectionQuality => {
    if (
      videoStalled ||
      packetLoss >= LOST_PACKET_LOSS_THRESHOLD ||
      rtt >= LOST_RTT_THRESHOLD
    ) {
      return ConnectionQuality.Lost;
    }

    if (
      packetLoss >= GOOD_PACKET_LOSS_THRESHOLD ||
      rtt >= GOOD_RTT_THRESHOLD ||
      freezeDelta > 0
    ) {
      return ConnectionQuality.Poor;
    }

    if (
      packetLoss >= EXCELLENT_PACKET_LOSS_THRESHOLD ||
      rtt >= EXCELLENT_RTT_THRESHOLD ||
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

    if (!isPoorOrLost) return;

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
