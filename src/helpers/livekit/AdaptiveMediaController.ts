import { Room, RoomEvent, Track } from 'livekit-client';
import { NativeMediaSource } from 'plugnmeet-protocol-js';

import { store } from '../../store';
import {
  addUserNotification,
  updateMediaDegradation,
} from '../../store/slices/roomSettingsSlice';
import i18n from '../i18n';
import {
  getNativePublisherStatus,
  isHybridMode,
  muteNativeMedia,
  unmuteNativeMedia,
} from '../nativeBridge';
import { PnmConnectionQuality, QualityStats } from './ConnectionQualityMonitor';

/**
 * Policy (audio always wins — every action below sheds video only):
 *
 * State overview (AdaptiveMediaMode is DERIVED from the pause flags; the UI
 * is driven by the Redux booleans in roomSettings, not by the enum):
 *
 *   [any state] --audio stuck / both directions Lost--> AudioOnly (critical)
 *
 *   Normal --sustained receive Poor--> incoming webcams paused
 *          --receive stays Poor------> (+ incoming presentation paused)
 *          --sustained upload Poor----> own camera muted
 *
 *   The two ladders are independent: upload actions never pause incoming
 *   media, receive actions never mute the camera.
 *
 * Critical fast paths:
 *   - Outbound audio stuck -> audio-only immediately (overrides manual grace).
 *   - Both directions Lost (2 consecutive checks) -> audio-only.
 *   - Upload Lost only -> mute own camera (uplink reserved for the mic).
 *   - Receive Lost only -> pause incoming webcams + presentation (downlink
 *     reserved for incoming audio).
 *
 * Normal (score-based, respects a recent manual restore grace):
 *   - Outbound video stuck -> mute own camera only (uplink-only problem).
 *   - Sustained poor receive -> pause incoming webcams, then presentation.
 *   - Sustained poor upload -> mute own camera.
 *
 * Recovery:
 *   - Normal degradations auto-restore one notch at a time (reverse order)
 *     after NORMAL_RECOVERY_STREAK healthy checks. A flap guard suspends
 *     auto-restore after repeated quick degrade/restore cycles.
 *   - Critical audio-only mode never auto-restores. After sustained health a
 *     manual restore is offered via the persistent banner.
 *   - Nuance: a user camera re-enable during critical mode restores the
 *     camera but intentionally KEEPS criticalMode true. The mode stays
 *     AudioOnly and incoming media remains paused until a full manual
 *     restore (banner -> resumeAll); only that clears critical mode.
 */
const MAX_SCORE = 6;
const DEGRADE_THRESHOLD = 3;

const NORMAL_RECOVERY_STREAK = 4;
const CRITICAL_RECOVERY_STREAK = 8;
const LOST_FAST_PATH_STREAK = 2;

const MANUAL_OVERRIDE_GRACE_MS = 120_000;
const SCREENSHARE_MANUAL_GRACE_MS = 120_000;

const FLAP_GRACE_MS = 60_000;
const MAX_FLAP_CYCLES = 2;

const NOTIFICATION_COOLDOWN_MS = 60_000;
const NOTIFICATION_BURST_WINDOW_MS = 5 * 60_000;
const MAX_WARNING_NOTIFICATIONS_PER_WINDOW = 3;
const SCREENSHARE_SUGGESTION_COOLDOWN_MS = 180_000;

type NotificationType = 'warning' | 'success' | 'info';

enum AdaptiveMediaMode {
  Normal = 'normal',
  RemoteWebcamsPaused = 'remote-webcams-paused',
  OutgoingCameraPaused = 'outgoing-camera-paused',
  AudioOnly = 'audio-only',
}

enum CriticalReason {
  AudioStuck,
  UploadLost,
  ReceiveLost,
  BothLost,
}

type MediaDegradationSnapshot = {
  incomingWebcamPaused: boolean;
  incomingScreensharePaused: boolean;
  outgoingCameraPaused: boolean;
  autoRestoreSuspended: boolean;
};

export default class AdaptiveMediaController {
  private mode: AdaptiveMediaMode = AdaptiveMediaMode.Normal;

  /**
   * True while in (or recovering from) critical audio-only mode. Kept
   * separate from autoRestoreSuspended so the normal flap guard can suspend
   * auto-restore without routing the controller into critical recovery.
   */
  private criticalMode = false;

  private incomingWebcamPaused = false;
  private incomingScreensharePaused = false;
  private outgoingCameraAutoMuted = false;

  private downlinkScore = 0;
  private uplinkScore = 0;

  private normalRecoveryStreak = 0;
  private criticalRecoveryStreak = 0;
  private consecutiveLostChecks = 0;

  /**
   * Timestamp until which normal adaptive logic must not undo a user's
   * explicit restore action. Only outbound-audio-stuck overrides it.
   */
  private manualOverrideUntil = 0;
  private screenshareManualGraceUntil = 0;

  private autoRestoreSuspended = false;
  private restoreAvailable = false;

  private lastAutoRestoreAt = 0;
  private flapCycleCount = 0;

  private lastWarningNotificationAt = 0;
  private warningWindowStartedAt = 0;
  private warningNotificationCount = 0;
  private lastScreenshareSuggestionAt = 0;

  private attached = false;
  private operationGeneration = 0;

  public constructor(
    private readonly getRoom: () => Room,
    private readonly options: { enabled: boolean },
  ) {}

  private get isWebcamMuted(): boolean {
    return store.getState().bottomIconsActivity.isWebcamMuted;
  }

  private get isActiveWebcam(): boolean {
    return store.getState().bottomIconsActivity.isActiveWebcam;
  }

  private get isActiveScreenshare(): boolean {
    return store.getState().bottomIconsActivity.isActiveScreenshare;
  }

  private isWebcamLocked(): boolean {
    const session = store.getState().session;
    const isAdmin = !!session.currentUser?.metadata?.isAdmin;
    const userLock = session.currentUser?.metadata?.lockSettings?.lockWebcam;
    const defaultLock =
      !!session.currentRoom?.metadata?.defaultLockSettings?.lockWebcam;
    return !isAdmin && (userLock ?? defaultLock);
  }

  private isWebcamAllowed(): boolean {
    const session = store.getState().session;
    const roomFeatures = session.currentRoom?.metadata?.roomFeatures;
    const isAdmin = !!session.currentUser?.metadata?.isAdmin;
    return (
      !!roomFeatures?.allowWebcams &&
      !(roomFeatures?.adminOnlyWebcams && !isAdmin)
    );
  }

  /**
   * True when the user may manually try restoring video. Can drive a
   * "Try restoring video" action in the persistent banner.
   */
  public get canRestoreMedia(): boolean {
    return this.restoreAvailable;
  }

  public get currentMode(): AdaptiveMediaMode {
    return this.mode;
  }

  public attach(): void {
    if (this.attached) {
      return;
    }

    const room = this.getRoom();

    if (!room) {
      return;
    }

    this.attached = true;

    room.on(RoomEvent.TrackUnmuted, this.onLocalCameraUnmuted);
    room.on(RoomEvent.TrackMuted, this.onLocalCameraMuted);

    document.addEventListener('visibilitychange', this.onVisibilityChange);
  }

  public dispose(): void {
    if (!this.attached) {
      return;
    }

    const room = this.getRoom();

    if (room) {
      room.off(RoomEvent.TrackUnmuted, this.onLocalCameraUnmuted);
      room.off(RoomEvent.TrackMuted, this.onLocalCameraMuted);
    }

    document.removeEventListener('visibilitychange', this.onVisibilityChange);

    this.operationGeneration += 1;
    this.attached = false;
  }

  /*
   * Evidence gathered before the tab was hidden must not mix with fresh
   * samples: recovery streaks and Lost-streak counters from before hiding
   * could mature a fast path or trigger a premature restore on the first
   * visible checks. Flap history is intentionally preserved: it tracks user
   * interaction cycles, not measurement windows.
   */
  private onVisibilityChange = (): void => {
    if (document.visibilityState !== 'visible') {
      return;
    }

    this.resetQualityState();
  };

  /** Called by the connection-quality monitor every 5 seconds. */
  public evaluate(stats: QualityStats): void {
    /*
     * Defensive: the monitor skips measurement while the tab is hidden, but
     * never act on stats gathered in a hidden tab regardless of source.
     */
    if (!this.options.enabled || document.hidden) {
      return;
    }

    void this.evaluateInternal(stats).catch((error: unknown) => {
      console.error('[AdaptiveMedia] evaluate failed', error);
    });
  }

  /**
   * Explicit user action from the persistent degradation banner. Restores
   * all controller-managed media and grants a grace period before normal
   * adaptive degradation can disable it again. Only outbound-audio-stuck
   * overrides the grace period (protecting audio wins).
   */
  public resumeAll(): void {
    void this.resumeAllInternal().catch((error: unknown) => {
      console.error('[AdaptiveMedia] resumeAll failed', error);
    });
  }

  /** Explicit user action for presentation-only recovery. */
  public resumeIncomingScreenshare(): void {
    this.incomingScreensharePaused = false;
    this.screenshareManualGraceUntil = Date.now() + SCREENSHARE_MANUAL_GRACE_MS;

    this.downlinkScore = 0;
    this.normalRecoveryStreak = 0;

    this.recalculateMode();
    this.syncRedux();
  }

  private async evaluateInternal(stats: QualityStats): Promise<void> {
    this.updateLostStreak(stats);

    /*
     * Suggest (never force) pausing the own screen share while the upload is
     * poor. Runs before mode routing so it also fires during audio-only.
     */
    if (
      Date.now() >= this.manualOverrideUntil &&
      (stats.uploadQuality === PnmConnectionQuality.Poor ||
        stats.uploadQuality === PnmConnectionQuality.Lost) &&
      this.isActiveScreenshare &&
      Date.now() - this.lastScreenshareSuggestionAt >
        SCREENSHARE_SUGGESTION_COOLDOWN_MS
    ) {
      this.lastScreenshareSuggestionAt = Date.now();
      this.notify('notifications.suggest-pause-screenshare', 'warning');
    }

    /*
     * Critical fast paths come before all normal scoring. Outbound audio
     * stuck overrides manual grace; the Lost paths respect it. Emergency
     * actions fall through to normal scoring when their action is already
     * applied, so the other direction is never starved.
     */
    const criticalReason = this.getCriticalReason(stats);

    if (criticalReason !== undefined) {
      switch (criticalReason) {
        case CriticalReason.AudioStuck:
          await this.enterAudioOnlyMode('audio-stuck');
          return;

        case CriticalReason.BothLost:
          await this.enterAudioOnlyMode('connection-lost');
          return;

        case CriticalReason.UploadLost:
          if (
            this.isActiveWebcam &&
            !this.isWebcamMuted &&
            !this.outgoingCameraAutoMuted
          ) {
            await this.pauseOutgoingCamera(
              'notifications.video-paused-weak-connection',
            );
            return;
          }
          break;

        case CriticalReason.ReceiveLost:
          if (!this.incomingWebcamPaused || !this.incomingScreensharePaused) {
            if (!this.incomingWebcamPaused) {
              this.pauseIncomingWebcams();
            }
            if (!this.incomingScreensharePaused) {
              this.pauseIncomingScreenshare();
            }
            return;
          }
          break;
      }
    }

    this.downlinkScore = this.updateScore(
      this.downlinkScore,
      stats.receiveQuality,
    );

    this.uplinkScore = this.updateScore(this.uplinkScore, stats.uploadQuality);

    /*
     * Critical mode uses conservative recovery. The controller does not
     * automatically re-enable video; it waits for a sustained healthy
     * period, then exposes a manual restore opportunity.
     */
    if (this.criticalMode) {
      this.evaluateCriticalRecovery(stats);
      return;
    }

    /*
     * Outbound video stuck: an uplink-only pathology. Mute the own camera
     * only; do not pause incoming media for an upload problem. Falls
     * through to normal scoring when the camera is already muted.
     */
    if (
      stats.isUploadVideoStuck &&
      Date.now() >= this.manualOverrideUntil &&
      this.isActiveWebcam &&
      !this.isWebcamMuted &&
      !this.outgoingCameraAutoMuted
    ) {
      await this.pauseOutgoingCamera(
        'notifications.video-paused-audio-protection',
      );
      return;
    }

    /*
     * Downlink degradation: stop receiving webcams first. Deterministic
     * bandwidth reduction while audio and presentation stay alive.
     */
    if (
      this.downlinkScore >= DEGRADE_THRESHOLD &&
      !this.incomingWebcamPaused &&
      Date.now() >= this.manualOverrideUntil
    ) {
      this.pauseIncomingWebcams();
      return;
    }

    /*
     * Downlink remains poor: pause the incoming presentation next, unless
     * the user explicitly resumed it recently.
     */
    if (
      this.downlinkScore >= DEGRADE_THRESHOLD &&
      this.incomingWebcamPaused &&
      !this.incomingScreensharePaused &&
      Date.now() >= this.screenshareManualGraceUntil
    ) {
      this.pauseIncomingScreenshare();
      return;
    }

    /*
     * Uplink degradation: stop sending the camera when the local upload
     * remains poor. Manual restore temporarily prevents this normal path.
     */
    if (
      this.uplinkScore >= DEGRADE_THRESHOLD &&
      Date.now() >= this.manualOverrideUntil &&
      this.isActiveWebcam &&
      !this.isWebcamMuted &&
      !this.outgoingCameraAutoMuted
    ) {
      await this.pauseOutgoingCamera(
        'notifications.video-paused-weak-connection',
      );
      return;
    }

    this.evaluateNormalRecovery(stats);
  }

  private getCriticalReason(stats: QualityStats): CriticalReason | undefined {
    if (stats.isUploadAudioStuck) {
      // Outbound audio is dead: protect audio at all costs.
      return CriticalReason.AudioStuck;
    }

    if (Date.now() < this.manualOverrideUntil) {
      // Respect a recent explicit user restore for the Lost paths.
      return undefined;
    }

    const uploadLost = stats.uploadQuality === PnmConnectionQuality.Lost;
    const receiveLost = stats.receiveQuality === PnmConnectionQuality.Lost;

    if (!uploadLost && !receiveLost) {
      return undefined;
    }

    if (this.consecutiveLostChecks < LOST_FAST_PATH_STREAK) {
      return undefined;
    }

    if (uploadLost && receiveLost) {
      return CriticalReason.BothLost;
    }

    return uploadLost ? CriticalReason.UploadLost : CriticalReason.ReceiveLost;
  }

  private updateLostStreak(stats: QualityStats): void {
    const uploadLost = stats.uploadQuality === PnmConnectionQuality.Lost;
    const receiveLost = stats.receiveQuality === PnmConnectionQuality.Lost;

    if (uploadLost || receiveLost) {
      this.consecutiveLostChecks += 1;
      return;
    }

    this.consecutiveLostChecks = 0;
  }

  private async enterAudioOnlyMode(
    reason: 'audio-stuck' | 'connection-lost',
  ): Promise<void> {
    const alreadyAudioOnly =
      this.criticalMode &&
      this.incomingWebcamPaused &&
      this.incomingScreensharePaused &&
      (!this.isActiveWebcam ||
        this.isWebcamMuted ||
        this.outgoingCameraAutoMuted);

    if (alreadyAudioOnly) {
      return;
    }

    const generation = ++this.operationGeneration;

    this.criticalMode = true;
    this.mode = AdaptiveMediaMode.AudioOnly;
    this.autoRestoreSuspended = true;
    this.restoreAvailable = false;

    this.incomingWebcamPaused = true;
    this.incomingScreensharePaused = true;

    this.resetQualityState();

    /*
     * Synchronize immediately so incoming video can be stopped without
     * waiting for the async camera operation.
     */
    this.syncRedux();

    if (this.isActiveWebcam && !this.isWebcamMuted) {
      const cameraMuted = await this.setLocalCameraMuted(true);

      if (generation !== this.operationGeneration) {
        return;
      }

      this.outgoingCameraAutoMuted = cameraMuted;
    }

    this.syncRedux();

    console.warn(`[AdaptiveMedia] entered audio-only mode: ${reason}`);

    this.notify('notifications.audio-only-mode-weak-connection', 'warning');
  }

  private pauseIncomingWebcams(): void {
    if (this.incomingWebcamPaused) {
      return;
    }

    this.markNormalDegrade();

    this.incomingWebcamPaused = true;
    this.downlinkScore = 0;
    this.normalRecoveryStreak = 0;

    this.recalculateMode();
    this.syncRedux();

    this.notify('notifications.video-paused-weak-connection', 'warning');
  }

  private pauseIncomingScreenshare(): void {
    if (this.incomingScreensharePaused) {
      return;
    }

    this.markNormalDegrade();

    this.incomingScreensharePaused = true;
    this.downlinkScore = 0;
    this.normalRecoveryStreak = 0;

    this.recalculateMode();
    this.syncRedux();

    this.notify('notifications.presentation-paused-weak-connection', 'warning');
  }

  private async pauseOutgoingCamera(notificationKey: string): Promise<void> {
    if (
      this.outgoingCameraAutoMuted ||
      !this.isActiveWebcam ||
      this.isWebcamMuted
    ) {
      return;
    }

    const generation = ++this.operationGeneration;
    const cameraMuted = await this.setLocalCameraMuted(true);

    if (generation !== this.operationGeneration || !cameraMuted) {
      return;
    }

    this.outgoingCameraAutoMuted = true;
    this.markNormalDegrade();

    this.uplinkScore = 0;
    this.normalRecoveryStreak = 0;

    this.recalculateMode();
    this.syncRedux();

    this.notify(notificationKey, 'warning');
  }

  /**
   * Normal degradation is automatically restored after a sustained period
   * where both directions are Good or Excellent. Restoration happens one
   * step at a time and in reverse order:
   *   1. Incoming presentation
   *   2. Incoming webcams
   *   3. Outgoing camera
   *
   * Critical audio-only mode and a flap-guard suspension are excluded from
   * automatic restoration.
   */
  private evaluateNormalRecovery(stats: QualityStats): void {
    const hasDegradation =
      this.incomingScreensharePaused ||
      this.incomingWebcamPaused ||
      this.outgoingCameraAutoMuted;

    if (!hasDegradation) {
      this.normalRecoveryStreak = 0;
      return;
    }

    if (this.autoRestoreSuspended) {
      this.normalRecoveryStreak = 0;
      return;
    }

    if (!this.isHealthyForRecovery(stats)) {
      this.normalRecoveryStreak = 0;
      return;
    }

    this.normalRecoveryStreak += 1;

    if (this.normalRecoveryStreak < NORMAL_RECOVERY_STREAK) {
      return;
    }

    this.normalRecoveryStreak = 0;
    this.downlinkScore = 0;
    this.uplinkScore = 0;
    this.lastAutoRestoreAt = Date.now();

    if (this.incomingScreensharePaused) {
      this.incomingScreensharePaused = false;
      this.recalculateMode();
      this.syncRedux();
      this.notify('notifications.presentation-resumed', 'success');
      return;
    }

    if (this.incomingWebcamPaused) {
      this.incomingWebcamPaused = false;
      this.recalculateMode();
      this.syncRedux();
      this.notify('notifications.video-resumed', 'success');
      return;
    }

    if (this.outgoingCameraAutoMuted) {
      void this.restoreOutgoingCameraAutomatically();
    }
  }

  private evaluateCriticalRecovery(stats: QualityStats): void {
    if (!this.isHealthyForRecovery(stats)) {
      this.criticalRecoveryStreak = 0;
      this.restoreAvailable = false;
      return;
    }

    this.criticalRecoveryStreak += 1;

    if (
      this.criticalRecoveryStreak < CRITICAL_RECOVERY_STREAK ||
      this.restoreAvailable
    ) {
      return;
    }

    this.restoreAvailable = true;

    /*
     * Keep autoRestoreSuspended enabled. The user should explicitly choose
     * to restore media after critical audio-only mode.
     */
    this.notify('notifications.connection-recovered-restore-video', 'success');
  }

  /**
   * Flap guard: a normal degrade that follows a recent automatic restore
   * within FLAP_GRACE_MS counts as a flap cycle. After MAX_FLAP_CYCLES
   * quick cycles, automatic restoration is suspended (manual banner only).
   */
  private markNormalDegrade(): void {
    if (!this.lastAutoRestoreAt) {
      return;
    }

    if (Date.now() - this.lastAutoRestoreAt >= FLAP_GRACE_MS) {
      return;
    }

    this.flapCycleCount += 1;

    if (this.flapCycleCount >= MAX_FLAP_CYCLES) {
      this.flapCycleCount = 0;
      this.lastAutoRestoreAt = 0;
      this.autoRestoreSuspended = true;
      this.notify('notifications.video-stays-paused', 'warning');
    }
  }

  private async restoreOutgoingCameraAutomatically(): Promise<void> {
    if (!this.outgoingCameraAutoMuted) {
      return;
    }

    if (
      !this.isActiveWebcam ||
      !this.isWebcamAllowed() ||
      this.isWebcamLocked()
    ) {
      /*
       * The controller no longer owns a camera restore when policy prevents
       * enabling it.
       */
      this.outgoingCameraAutoMuted = false;
      this.recalculateMode();
      this.syncRedux();
      return;
    }

    const generation = ++this.operationGeneration;

    /*
     * Clear ownership BEFORE initiating the unmute: our own TrackUnmuted
     * fires during the await and must not be treated as a manual user
     * override (the event handler would otherwise misclassify it, abort this
     * operation via the generation bump and skip the "resumed" update).
     */
    this.outgoingCameraAutoMuted = false;

    const cameraRestored = await this.setLocalCameraMuted(false);

    if (generation !== this.operationGeneration) {
      return;
    }

    if (!cameraRestored) {
      /*
       * The camera is still muted and we still own that mute, so future
       * recovery attempts can retry.
       */
      this.outgoingCameraAutoMuted = true;
      this.syncRedux();
      return;
    }

    this.recalculateMode();
    this.syncRedux();

    this.notify('notifications.video-resumed', 'success');
  }

  private async resumeAllInternal(): Promise<void> {
    const generation = ++this.operationGeneration;
    const now = Date.now();

    this.manualOverrideUntil = now + MANUAL_OVERRIDE_GRACE_MS;
    this.screenshareManualGraceUntil = now + SCREENSHARE_MANUAL_GRACE_MS;

    this.criticalMode = false;
    this.autoRestoreSuspended = false;
    this.restoreAvailable = false;

    this.incomingWebcamPaused = false;
    this.incomingScreensharePaused = false;

    this.resetQualityState();

    let cameraRestored = true;

    if (this.outgoingCameraAutoMuted) {
      if (
        this.isActiveWebcam &&
        this.isWebcamAllowed() &&
        !this.isWebcamLocked()
      ) {
        // Clear ownership BEFORE initiating the unmute (see note above).
        this.outgoingCameraAutoMuted = false;

        cameraRestored = await this.setLocalCameraMuted(false);

        if (generation !== this.operationGeneration) {
          return;
        }

        if (!cameraRestored) {
          // Still muted: reclaim ownership so recovery can retry.
          this.outgoingCameraAutoMuted = true;
        }
      } else {
        /*
         * Do not auto-enable a camera that room policy currently disallows.
         */
        cameraRestored = false;
        this.outgoingCameraAutoMuted = false;
      }
    }

    this.recalculateMode();
    this.syncRedux();

    if (cameraRestored) {
      this.notify('notifications.video-resumed', 'success');
    } else {
      this.notify('notifications.media-restored-camera-unavailable', 'info');
    }
  }

  private isHealthyForRecovery(stats: QualityStats): boolean {
    if (stats.isUploadAudioStuck || stats.isUploadVideoStuck) {
      return false;
    }

    return (
      this.isRecoverableQuality(stats.uploadQuality) &&
      this.isRecoverableQuality(stats.receiveQuality)
    );
  }

  private isRecoverableQuality(quality: PnmConnectionQuality): boolean {
    return (
      quality === PnmConnectionQuality.Excellent ||
      quality === PnmConnectionQuality.Good
    );
  }

  private updateScore(score: number, quality: PnmConnectionQuality): number {
    let delta: number;

    switch (quality) {
      case PnmConnectionQuality.Lost:
        delta = 2;
        break;
      case PnmConnectionQuality.Poor:
        delta = 1;
        break;
      case PnmConnectionQuality.Good:
        delta = -1;
        break;
      case PnmConnectionQuality.Excellent:
      default:
        delta = -2;
        break;
    }

    return Math.min(MAX_SCORE, Math.max(0, score + delta));
  }

  private resetQualityState(): void {
    this.downlinkScore = 0;
    this.uplinkScore = 0;

    this.normalRecoveryStreak = 0;
    this.criticalRecoveryStreak = 0;
    this.consecutiveLostChecks = 0;
  }

  /**
   * Only an explicit user action (manual camera re-enable) clears flap
   * history; critical mode and manual banner restores preserve it.
   */
  private resetFlapState(): void {
    this.lastAutoRestoreAt = 0;
    this.flapCycleCount = 0;
  }

  /**
   * Derived category for readability/debugging. The UI is driven by the
   * boolean snapshot in Redux, not by this enum.
   */
  private recalculateMode(): void {
    if (this.criticalMode) {
      this.mode = AdaptiveMediaMode.AudioOnly;
      return;
    }

    if (this.outgoingCameraAutoMuted) {
      this.mode = AdaptiveMediaMode.OutgoingCameraPaused;
      return;
    }

    if (this.incomingWebcamPaused || this.incomingScreensharePaused) {
      this.mode = AdaptiveMediaMode.RemoteWebcamsPaused;
      return;
    }

    this.mode = AdaptiveMediaMode.Normal;
  }

  /**
   * Returns true only if this operation successfully changed, or already
   * confirmed, the requested camera state.
   */
  private async setLocalCameraMuted(muted: boolean): Promise<boolean> {
    if (!this.isActiveWebcam) {
      return false;
    }

    if (this.isWebcamMuted === muted) {
      return true;
    }

    if (muted && this.isWebcamLocked()) {
      return false;
    }

    if (!muted && (!this.isWebcamAllowed() || this.isWebcamLocked())) {
      return false;
    }

    try {
      if (isHybridMode()) {
        if (!getNativePublisherStatus().available) {
          return false;
        }

        if (muted) {
          muteNativeMedia(NativeMediaSource.WEBCAM);
        } else {
          unmuteNativeMedia(NativeMediaSource.WEBCAM);
        }

        return true;
      }

      const room = this.getRoom();

      if (!room) {
        return false;
      }

      await room.localParticipant.setCameraEnabled(!muted);
      return true;
    } catch (error) {
      console.error(
        `[AdaptiveMedia] failed to ${muted ? 'pause' : 'restore'} local camera`,
        error,
      );

      return false;
    }
  }

  /**
   * Any camera unmute that passes the ownership guard inside this handler
   * can only be a user-initiated unmute of a controller-paused camera. The
   * discrimination between automatic and user restores is guaranteed by
   * ownership convention, not by this handler:
   * restoreOutgoingCameraAutomatically() clears outgoingCameraAutoMuted
   * BEFORE initiating its own unmute, so controller restores find the flag
   * already false and exit early. Unmutes of user-paused cameras find the
   * flag false as well. Only an explicit user re-enable during a
   * controller-owned pause arrives with the flag still set, and that is
   * treated as a manual override (grace window + clean flap slate).
   */
  private onLocalCameraUnmuted = (publication: any, participant: any): void => {
    const room = this.getRoom();

    if (!room || !this.outgoingCameraAutoMuted) {
      return;
    }

    if (participant?.identity !== room.localParticipant.identity) {
      return;
    }

    if (publication?.source !== Track.Source.Camera) {
      return;
    }

    this.operationGeneration += 1;
    this.outgoingCameraAutoMuted = false;

    this.manualOverrideUntil = Date.now() + MANUAL_OVERRIDE_GRACE_MS;

    /*
     * If the user restores the camera during critical mode, keep incoming
     * media paused. This avoids immediately restoring every video stream.
     */
    if (!this.criticalMode) {
      this.autoRestoreSuspended = false;
    }

    this.restoreAvailable = false;
    this.uplinkScore = 0;
    this.normalRecoveryStreak = 0;

    // The user explicitly chose to bring video back: clean flap slate.
    this.resetFlapState();

    this.recalculateMode();
    this.syncRedux();
  };

  /**
   * A user-initiated camera mute must not be marked as an automatic pause.
   */
  private onLocalCameraMuted = (publication: any, participant: any): void => {
    const room = this.getRoom();

    if (!room) {
      return;
    }

    if (participant?.identity !== room.localParticipant.identity) {
      return;
    }

    if (publication?.source !== Track.Source.Camera) {
      return;
    }

    /*
     * If outgoingCameraAutoMuted is true, this event confirms an operation
     * initiated by this controller. Otherwise it was initiated externally or
     * by the user, so the controller should not count it against recovery.
     */
    if (!this.outgoingCameraAutoMuted) {
      this.uplinkScore = 0;
      this.normalRecoveryStreak = 0;
    }
  };

  private notify(key: string, typeOption: NotificationType): void {
    console.log(`[AdaptiveMedia] ${key}`);

    if (typeOption === 'warning' && !this.canShowWarningNotification()) {
      return;
    }

    store.dispatch(
      addUserNotification({
        message: i18n.t(key),
        typeOption,
      }),
    );
  }

  /**
   * Warning notifications are rate-limited, but not permanently exhausted.
   * Persistent UI should be driven by roomSettings.mediaDegradation.
   */
  private canShowWarningNotification(): boolean {
    const now = Date.now();

    if (
      this.warningWindowStartedAt === 0 ||
      now - this.warningWindowStartedAt >= NOTIFICATION_BURST_WINDOW_MS
    ) {
      this.warningWindowStartedAt = now;
      this.warningNotificationCount = 0;
    }

    if (now - this.lastWarningNotificationAt < NOTIFICATION_COOLDOWN_MS) {
      return false;
    }

    if (this.warningNotificationCount >= MAX_WARNING_NOTIFICATIONS_PER_WINDOW) {
      return false;
    }

    this.lastWarningNotificationAt = now;
    this.warningNotificationCount += 1;

    return true;
  }

  private syncRedux(): void {
    const snapshot: MediaDegradationSnapshot = {
      incomingWebcamPaused: this.incomingWebcamPaused,
      incomingScreensharePaused: this.incomingScreensharePaused,
      outgoingCameraPaused: this.outgoingCameraAutoMuted,
      autoRestoreSuspended: this.autoRestoreSuspended,
    };

    const current = store.getState().roomSettings.mediaDegradation;

    const changed =
      current.incomingWebcamPaused !== snapshot.incomingWebcamPaused ||
      current.incomingScreensharePaused !==
        snapshot.incomingScreensharePaused ||
      current.outgoingCameraPaused !== snapshot.outgoingCameraPaused ||
      current.autoRestoreSuspended !== snapshot.autoRestoreSuspended;

    if (changed) {
      store.dispatch(updateMediaDegradation(snapshot));
    }
  }
}
