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
const EXCELLENT_PACKET_LOSS_THRESHOLD = 3; // >= 3%
const GOOD_PACKET_LOSS_THRESHOLD = 10; // >= 10%
const LOST_PACKET_LOSS_THRESHOLD = 20; // >= 20%

const EXCELLENT_RTT_THRESHOLD = 250; // >= 250ms
const GOOD_RTT_THRESHOLD = 500; // >= 500ms
const LOST_RTT_THRESHOLD = 1000; // >= 1000ms

// Ignore impossible/stale WebRTC RTT values
const MAX_SANE_RTT = 10_000; // 10 seconds

const POOR_COUNT_THRESHOLD = 3;
const GOOD_COUNT_THRESHOLD = 2;
const INTERVAL = 5000;
const NOTIFICATION_COOLDOWN = 60_000;

type PrevInboundStats = {
  lost: number;
  received: number;
};

export type QualityStats = {
  packetLoss: number;
  rtt: number;
  quality: ConnectionQuality;
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
  private prevDownlinkStats: Record<string, PrevInboundStats> = {};

  constructor(room: Room) {
    this.room = room;
  }

  public start = (onQualityUpdate?: (stats: QualityStats) => void) => {
    this.stop();

    this.qualityCheckInterval = setInterval(async () => {
      if (this.isCheckingQuality) return;

      this.isCheckingQuality = true;

      try {
        const stats = await this.collectQualityStats();
        this.handleQualityState(stats);
        onQualityUpdate?.(stats);
      } finally {
        this.isCheckingQuality = false;
      }
    }, INTERVAL);
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
    this.prevDownlinkStats = {};
  };

  public getCurrentQuality = (): ConnectionQuality => {
    return this.currentQuality;
  };

  private collectQualityStats = async (): Promise<QualityStats> => {
    if (this.room.state !== ConnectionState.Connected) {
      return {
        packetLoss: 100,
        rtt: LOST_RTT_THRESHOLD,
        quality: ConnectionQuality.Lost,
      };
    }

    const pcManager = this.room.engine.pcManager;

    if (!pcManager) {
      return {
        packetLoss: 100,
        rtt: LOST_RTT_THRESHOLD,
        quality: ConnectionQuality.Lost,
      };
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

    publisherStats?.forEach((stat) => {
      if (stat.type === 'remote-inbound-rtp') {
        if (typeof stat.fractionLost === 'number') {
          const packetLoss = Math.max(0, stat.fractionLost * 100);
          maxPacketLoss = Math.max(maxPacketLoss, packetLoss);
        }

        if (typeof stat.roundTripTime === 'number') {
          maxRtt = this.updateMaxRtt(maxRtt, stat.roundTripTime * 1000);
        }
      }

      if (
        stat.type === 'candidate-pair' &&
        stat.state === 'succeeded' &&
        (stat.selected === true || stat.nominated === true) &&
        typeof stat.currentRoundTripTime === 'number'
      ) {
        maxRtt = this.updateMaxRtt(maxRtt, stat.currentRoundTripTime * 1000);
      }
    });

    const activeDownlinkSsrcs = new Set<string>();

    subscriberStats?.forEach((stat) => {
      if (stat.type !== 'inbound-rtp' || stat.kind !== 'video') return;

      const ssrc = String(stat.ssrc);
      activeDownlinkSsrcs.add(ssrc);

      const currentLost = Math.max(0, stat.packetsLost || 0);
      const currentReceived = Math.max(0, stat.packetsReceived || 0);

      const prev = this.prevDownlinkStats[ssrc];

      if (prev) {
        const lostDelta = Math.max(0, currentLost - prev.lost);
        const receivedDelta = Math.max(0, currentReceived - prev.received);
        const totalDelta = lostDelta + receivedDelta;

        if (totalDelta > 0) {
          const lossPercentage = (lostDelta / totalDelta) * 100;
          maxPacketLoss = Math.max(maxPacketLoss, lossPercentage);
        }
      }

      this.prevDownlinkStats[ssrc] = {
        lost: currentLost,
        received: currentReceived,
      };
    });

    if (subscriberStats) {
      Object.keys(this.prevDownlinkStats).forEach((ssrc) => {
        if (!activeDownlinkSsrcs.has(ssrc)) {
          delete this.prevDownlinkStats[ssrc];
        }
      });
    }

    const quality = this.classifyQuality(maxPacketLoss, maxRtt);

    return {
      packetLoss: maxPacketLoss,
      rtt: maxRtt,
      quality,
    };
  };

  private updateMaxRtt = (currentMaxRtt: number, rttMs: number): number => {
    if (!Number.isFinite(rttMs)) return currentMaxRtt;
    if (rttMs <= 0) return currentMaxRtt;
    if (rttMs > MAX_SANE_RTT) return currentMaxRtt;

    return Math.max(currentMaxRtt, rttMs);
  };

  private classifyQuality = (
    packetLoss: number,
    rtt: number,
  ): ConnectionQuality => {
    if (packetLoss >= LOST_PACKET_LOSS_THRESHOLD || rtt >= LOST_RTT_THRESHOLD) {
      return ConnectionQuality.Lost;
    }

    if (packetLoss >= GOOD_PACKET_LOSS_THRESHOLD || rtt >= GOOD_RTT_THRESHOLD) {
      return ConnectionQuality.Poor;
    }

    if (
      packetLoss >= EXCELLENT_PACKET_LOSS_THRESHOLD ||
      rtt >= EXCELLENT_RTT_THRESHOLD
    ) {
      return ConnectionQuality.Good;
    }

    return ConnectionQuality.Excellent;
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
