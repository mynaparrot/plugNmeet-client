import { ConnectionState, Room } from 'livekit-client';
import { TurnCredentials } from 'plugnmeet-protocol-js';
import { toast } from 'react-toastify';

import i18n from '../../i18n';
import { isFirefoxMobile } from '../../utils';
import TurnFallbackCoordinator, {
  DEFAULT_FALLBACK_TIMER_MS,
  type CoordinatorQuality,
  type MediaAdaptationSnapshot,
  type TurnFallbackReason,
} from './TurnFallbackCoordinator';
import {
  allRequiredTransportsFullyRelayed,
  buildRelayOnlyConfig,
  classifyRelayMigrationFailure,
  createTurnMigrationAttemptLifecycle,
  isRelayOnlyConfig,
  isTurnMigrationAttemptValid,
  probeRelayMigration,
  startRelayVerification,
  type RelayMigrationVerification,
  type RelayPcName,
} from './turnRelayMigration';

/** Bounded init-failure retries (hard infrastructure failures only). */
const MAX_MIGRATION_INIT_FAILURES = 2;

/** SDK Room engine (typed narrow so pcManager stays unknown-shaped). */
type LivekitEngine = Room['engine'];

type LivekitPcManager = {
  needsPublisher?: boolean;
  publisher?: { getStats: () => Promise<unknown> };
  subscriber?: { getStats: () => Promise<unknown> };
  updateConfiguration?: (config: RTCConfiguration, iceRestart: boolean) => void;
};

export type TurnFallbackSample = {
  atMs: number;
  /** false for synthetic samples (reconnect/hidden) — never measured evidence */
  measured: boolean;
  uploadQuality: CoordinatorQuality;
  receiveQuality: CoordinatorQuality;
  isMyConnectionPoor: boolean;
  isReceivingPoor: boolean;
  isLikelyDownloadIssue: boolean;
  isUploadAudioStuck: boolean;
};

const isFinitePositive = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0;

/**
 * Owns the silent TURN relay fallback: coordinator decisions, relay-only
 * migration helpers, attempt lifecycle, per-session retry budget.
 */
export default class TurnFallbackController {
  private credential: TurnCredentials | undefined = undefined;
  private readonly coordinator: TurnFallbackCoordinator = new TurnFallbackCoordinator();
  private readonly lifecycle = createTurnMigrationAttemptLifecycle();
  private verification: RelayMigrationVerification | undefined = undefined;
  private hasAttempted: boolean = false;
  private initFailures: number = 0;

  public constructor(
    private readonly getRoom: () => Room | undefined,
    private readonly getMediaSnapshot: () => MediaAdaptationSnapshot,
  ) {}

  /** Wires server-provided settings into the coordinator (wire value is ms). */
  public configure = (credential: TurnCredentials | undefined): void => {
    this.credential = credential;
    if (!credential) return;

    const timerMs = Number(credential.fallbackTimerDuration);
    const flapping = credential.fallbackOnFlapping;
    const maxPoorConnCount = Number(flapping?.maxPoorConnCount);
    const checkDurationInSec = Number(flapping?.checkDurationInSec);

    const fallbackTimerMs = isFinitePositive(timerMs) ? timerMs : DEFAULT_FALLBACK_TIMER_MS;

    this.coordinator.configure({
      fallbackTimerMs,
      flapping: {
        enabled: !!flapping?.enabled,
        maxPoorConnCount: isFinitePositive(maxPoorConnCount) ? maxPoorConnCount : 3,
        checkDurationMs: isFinitePositive(checkDurationInSec) ? checkDurationInSec * 1000 : 120_000,
      },
    });
  };

  /** One sample per quality check; the media snapshot must be post-adaptation. */
  public evaluate = (sample: TurnFallbackSample): void => {
    if (!this.credential?.fallbackTurn || isFirefoxMobile()) return;
    if (this.hasAttempted) return;

    const decision = this.coordinator.ingest({
      atMs: sample.atMs,
      connected: sample.measured && this.getRoom()?.state === ConnectionState.Connected,
      uploadQuality: sample.uploadQuality,
      receiveQuality: sample.receiveQuality,
      isMyConnectionPoor: sample.isMyConnectionPoor,
      isReceivingPoor: sample.isReceivingPoor,
      isLikelyDownloadIssue: sample.isLikelyDownloadIssue,
      isUploadAudioStuck: sample.isUploadAudioStuck,
      mediaSnapshot: this.getMediaSnapshot(),
    });

    if (decision.shouldFireFallback) {
      void this.attemptMigration(decision.reason ?? undefined);
    }
  };

  /** Hidden/reconnecting boundary: evidence cannot cross it; cancels verification and attempts. */
  public resetEvidence = (): void => {
    this.coordinator.reset();
    this.cancelVerification();
    this.lifecycle.invalidate();
  };

  /** Fresh connection: reset evidence for the new transport, invalidate attempts. */
  public onConnectionEstablished = (): void => {
    this.coordinator.reset();
    this.lifecycle.invalidate();
  };

  /** beforeunload boundary: only the attempt id is invalidated. */
  public onUnload = (): void => {
    this.lifecycle.invalidate();
  };

  /** Full session reset (disconnected): evidence, attempts, retry budget. */
  public dispose = (): void => {
    this.resetEvidence();
    this.hasAttempted = false;
    this.initFailures = 0;
  };

  private cancelVerification = (): void => {
    this.verification?.cancel();
    this.verification = undefined;
  };

  private addInitFailure = (): void => {
    this.initFailures += 1;
    if (this.initFailures >= MAX_MIGRATION_INIT_FAILURES) {
      this.hasAttempted = true;
    }
  };

  /** Invalidated id, changed engine, disconnected room, or hidden document. */
  private isAttemptValid = (attemptId: number, engine: LivekitEngine): boolean => {
    const room = this.getRoom();
    return isTurnMigrationAttemptValid({
      attemptId,
      currentAttemptId: this.lifecycle.current(),
      engineUnchanged: room !== undefined && room.engine === engine,
      roomState: room?.state ?? '',
      documentHidden: document.hidden,
    });
  };

  /** A relay-only CONFIG and an observed selected RELAY differ; mixed is not already-relay. */
  private transportsAlreadyUseRelay = async (pcManager: LivekitPcManager): Promise<boolean> => {
    const required: RelayPcName[] = pcManager.needsPublisher
      ? ['publisher', 'subscriber']
      : ['subscriber'];

    const outcome = await probeRelayMigration({
      publisher: async () => pcManager.publisher?.getStats(),
      subscriber: async () => pcManager.subscriber?.getStats(),
      timeoutMs: 2000,
    });

    return allRequiredTransportsFullyRelayed(outcome, required);
  };

  private requiredTransportsFor = (pcManager: LivekitPcManager): RelayPcName[] =>
    pcManager.needsPublisher ? ['publisher', 'subscriber'] : ['subscriber'];

  /** Candidate-pair confirmation after the migration; config alone is never proof. */
  private beginVerification = () => {
    this.cancelVerification();

    const room = this.getRoom();
    const pcManager = room?.engine?.pcManager as LivekitPcManager | undefined;
    if (!room || !pcManager) return;

    const requiredTransports = this.requiredTransportsFor(pcManager);

    this.verification = startRelayVerification({
      getPublisherStats: async () => {
        return await pcManager.publisher?.getStats();
      },
      getSubscriberStats: async () => {
        return await pcManager.subscriber?.getStats();
      },
      requiredTransports,
      onResult: (result) => {
        this.verification = undefined;

        if (result.allRequiredRelayConfirmed) {
          console.log(`[TurnFallback] relay verified (${requiredTransports.join('+')}).`);
        } else {
          console.warn(`[TurnFallback] relay not verified (${requiredTransports.join('+')}).`);
        }
      },
    });
  };

  private attemptMigration = async (reason: TurnFallbackReason | undefined) => {
    // one deliberate migration per session; one in flight at any time
    if (this.hasAttempted) return;
    if (this.lifecycle.current() !== undefined) return;

    // never mutate a hidden document's connection
    if (document.hidden) return;

    const room = this.getRoom();
    if (!room || room.state !== ConnectionState.Connected) return;

    if (!this.credential) {
      console.error('[TurnFallback] no TURN credentials configured; fallback disabled.');
      this.hasAttempted = true;
      return;
    }

    const attemptId = this.lifecycle.begin();

    try {
      const engine = room.engine;
      const pcManager = engine.pcManager as LivekitPcManager | undefined;

      if (!pcManager?.updateConfiguration) {
        console.error('[TurnFallback] pc manager unavailable; no migration will be attempted.');
        this.addInitFailure();
        return;
      }

      // the probe is awaited and can settle after a boundary: re-validate first
      if (await this.transportsAlreadyUseRelay(pcManager)) {
        if (!this.isAttemptValid(attemptId, engine)) return;

        this.hasAttempted = true;
        this.beginVerification();
        return;
      }

      if (!this.isAttemptValid(attemptId, engine)) return;

      if (isRelayOnlyConfig(engine.rtcConfig)) {
        this.hasAttempted = true;
        this.beginVerification();
        return;
      }

      toast.info(i18n.t('notifications.re-routing-connection'), {
        autoClose: 4000,
      });

      console.log(`[TurnFallback] silent relay migration started (reason=${reason ?? 'unknown'}).`);

      // Replacing engine.rtcConfig keeps the relay policy across SDK reconnects.
      const previousConfig = engine.rtcConfig;
      const config = buildRelayOnlyConfig(previousConfig);
      engine.rtcConfig = config;

      try {
        pcManager.updateConfiguration(config, true);
      } catch (e) {
        if (!this.isAttemptValid(attemptId, engine)) {
          // never roll back or mutate a stale engine after a boundary
          return;
        }
        // rollback does NOT undo partially applied per-PC configuration;
        // only candidate-pair evidence proves the actual selection
        engine.rtcConfig = previousConfig;
        throw e;
      }

      this.hasAttempted = true;

      this.beginVerification();
    } catch (e) {
      // never raw SDK error text/URLs/credentials
      console.error(`[TurnFallback] Migration failed (${classifyRelayMigrationFailure(e)}).`);
      this.addInitFailure();
    } finally {
      // a stale attempt must not clear a newer attempt's in-flight state
      this.lifecycle.release(attemptId);
    }
  };
}
