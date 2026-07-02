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

  isMyConnectionPoor: boolean;
  isReceivingPoor: boolean;
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
};

type QualityCheckState = {
  maxPacketLoss: number;
  maxRtt: number | null;

  myPacketLoss: number;
  myRtt: number | null;

  inboundPacketLoss: number;

  activeInboundSsrcs: Set<string>;
};

export default class ConnectionQualityMonitor {
  private readonly room: Room;

  private poorConnectionCount = 0;
  private goodConnectionCount = 0;
  private lastPoorConnectionNotificationAt = 0;
  private qualityCheckTimeout: ReturnType<typeof setTimeout> | null = null;
  private isConnectionCurrentlyPoor = false;
  private isCheckingQuality = false;
  private isStopped = true;

  private currentQuality: ConnectionQuality = ConnectionQuality.Excellent;
  private qualityScore = MAX_SCORE;

  private prevInboundStats: Record<string, PrevInboundStats> = {};

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
      } catch (error) {
        console.error(
          '[ConnectionQualityMonitor] Failed to collect or handle quality stats:',
          error,
        );
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

    this.poorConnectionCount = 0;
    this.goodConnectionCount = 0;
    this.lastPoorConnectionNotificationAt = 0;
    this.isConnectionCurrentlyPoor = false;
    this.isCheckingQuality = false;
    this.currentQuality = ConnectionQuality.Excellent;
    this.qualityScore = MAX_SCORE;
    this.prevInboundStats = {};
  };

  public getOverallQuality = () => this.currentQuality;

  private _processStatsReport = (
    statsReport: RTCStatsReport | undefined,
    state: QualityCheckState,
  ) => {
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
            }
          }
        }

        this.prevInboundStats[ssrc] = {
          lost: currentLost,
          received: currentReceived,
        };
      }
    });
  };

  private collectQualityStats = async (): Promise<QualityStats> => {
    if (this.room.state !== ConnectionState.Connected) {
      return this.createStats({
        rawPacketLoss: 100,
        rtt: LOST_RTT_THRESHOLD,
        myPacketLoss: 100,
        myRtt: LOST_RTT_THRESHOLD,
        receivePacketLoss: 100,
      });
    }

    const pcManager = (this.room.engine as any)?.pcManager;

    if (!pcManager) {
      return this.createStats({
        rawPacketLoss: 100,
        rtt: LOST_RTT_THRESHOLD,
        myPacketLoss: 100,
        myRtt: LOST_RTT_THRESHOLD,
        receivePacketLoss: 100,
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
      activeInboundSsrcs: new Set(),
    };

    if (pub.status === 'fulfilled') this._processStatsReport(pub.value, state);
    if (sub.status === 'fulfilled') this._processStatsReport(sub.value, state);

    Object.keys(this.prevInboundStats).forEach((ssrc) => {
      if (!state.activeInboundSsrcs.has(ssrc)) {
        delete this.prevInboundStats[ssrc];
      }
    });

    return this.createStats({
      rawPacketLoss: state.maxPacketLoss,
      rtt: state.maxRtt,
      myPacketLoss: state.myPacketLoss,
      myRtt: state.myRtt,
      receivePacketLoss: state.inboundPacketLoss,
    });
  };

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

    if (
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

  private createStats = (input: {
    rawPacketLoss: number;
    rtt: number | null;
    myPacketLoss: number;
    myRtt: number | null;
    receivePacketLoss: number;
  }): QualityStats => {
    const hasUploadSignal = input.myRtt !== null || input.myPacketLoss > 0;

    const uploadQuality = hasUploadSignal
      ? this.classify({
          packetLoss: input.myPacketLoss,
          rtt: input.myRtt,
        })
      : ConnectionQuality.Excellent;

    const receiveQuality = this.classify({
      packetLoss: input.receivePacketLoss,
      rtt: input.rtt,
    });

    const qualities = new Set([uploadQuality, receiveQuality]);

    const worstQuality = qualities.has(ConnectionQuality.Lost)
      ? ConnectionQuality.Lost
      : qualities.has(ConnectionQuality.Poor)
        ? ConnectionQuality.Poor
        : qualities.has(ConnectionQuality.Good)
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

      isMyConnectionPoor:
        uploadQuality === ConnectionQuality.Poor ||
        uploadQuality === ConnectionQuality.Lost,

      isReceivingPoor:
        receiveQuality === ConnectionQuality.Poor ||
        receiveQuality === ConnectionQuality.Lost,
    };
  };

  private handleQualityState = (stats: QualityStats) => {
    this.currentQuality = stats.overallQuality;

    if (stats.isMyConnectionPoor) {
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

    this.maybeNotifyUser(stats);
  };

  private maybeNotifyUser = (stats: QualityStats) => {
    if (!stats.isMyConnectionPoor || this.isConnectionCurrentlyPoor) return;

    const now = Date.now();
    const canNotify =
      now - this.lastPoorConnectionNotificationAt > NOTIFICATION_COOLDOWN;

    if (this.poorConnectionCount < POOR_COUNT_THRESHOLD || !canNotify) return;

    this.isConnectionCurrentlyPoor = true;
    this.lastPoorConnectionNotificationAt = now;
    this.poorConnectionCount = 0;

    store.dispatch(
      addUserNotification({
        message: i18n.t('notifications.your-connection-lost-or-unstable'),
        typeOption: 'error',
      }),
    );
  };

  private updateMaxRtt = (
    current: number | null,
    value: number,
  ): number | null => {
    if (!Number.isFinite(value) || value <= 0 || value > MAX_SANE_RTT) {
      return current;
    }

    return current === null ? value : Math.max(current, value);
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
}
