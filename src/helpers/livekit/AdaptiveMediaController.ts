import { Room, RoomEvent, Track, VideoQuality } from 'livekit-client';
import { NativeMediaSource } from 'plugnmeet-protocol-js';

import { store } from '../../store';
import {
  addUserNotification,
  updateMediaDegradation,
  updateRoomVideoQuality,
} from '../../store/slices/roomSettingsSlice';
import i18n from '../i18n';
import {
  getNativePublisherStatus,
  isHybridMode,
  muteNativeMedia,
  unmuteNativeMedia,
} from '../nativeBridge';
import {
  LOST_PACKET_LOSS_THRESHOLD,
  PnmConnectionQuality,
  QualityStats,
} from './ConnectionQualityMonitor';
import type { MediaAdaptationSnapshot } from './turn/TurnFallbackCoordinator';

/**
 * Adaptive media policy (audio always wins — every action sheds video only):
 *   - critical fast paths: outbound audio stuck -> audio-only immediately;
 *     loss-backed combined Lost -> audio-only; upload Lost -> mute own
 *     camera. Ordinary receive distress (including a receive-only Lost) is NOT
 *     a fast path: it must attempt the quality reduction below first.
 *   - Lost is tracked per direction (independent uplink/downlink streaks,
 *     each cleared by its own non-Lost or by an unknown/hidden sample).
 *     Combined Lost that is only RTT-driven (no measured packet loss) never
 *     earns the persistent manual-only critical mode: it falls through to the
 *     score ladder, so video still sheds quickly and staged but stays
 *     auto-recoverable.
 *   - normal (score-based, respects manual-restore grace): sustained poor
 *     receive -> lower the room video setting (roomVideoQuality) to LOW and
 *     wait, then pause incoming webcams then presentation; sustained poor
 *     upload -> mute own camera. The two ladders are independent; only the
 *     receive ladder owns the quality reduction.
 *   - recovery: normal degradations auto-restore one notch at a time after
 *     NORMAL_RECOVERY_STREAK CONSECUTIVE MEASURED healthy checks; the saved
 *     quality is restored LAST and only while it is still our own auto-lowered
 *     value (a later user change always wins); a flap guard
 *     suspends auto-restore after repeated quick cycles, counting one cycle per
 *     restoration attempt (not per pause action). Critical audio-only mode
 *     never auto-restores (manual banner -> resumeAll). A user camera
 *     re-enable during critical mode intentionally keeps criticalMode true.
 *     An unmeasured/hidden sample proves nothing, so it resets every streak
 *     (including an unclaimed restore opportunity) instead of letting a
 *     recovery mature across a reconnect or hidden-tab gap. A PARTIAL sample
 *     (one direction's report unusable) is likewise not global health, with a
 *     single exception: an upload-audio stall verified by the upload
 *     direction's own evidence still protects audio (sheds video), since
 *     silencing that over an unknown download would drop audio protection.
 * AdaptiveMediaMode is derived from the pause flags; the UI is driven by the
 * Redux booleans in roomSettings, not by the enum.
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
  BothLost,
}

type MediaDegradationSnapshot = {
  incomingWebcamPaused: boolean;
  incomingScreensharePaused: boolean;
  outgoingCameraPaused: boolean;
  autoRestoreSuspended: boolean;
  /** true while the shared video quality is our own reduced (LOW) value */
  videoQualityReduced: boolean;
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

  /**
   * The room video quality that was active before we lowered it for ordinary
   * receive distress. undefined = we do not currently own a reduction.
   */
  private savedQuality: VideoQuality | undefined = undefined;

  /** last roomVideoQuality observed, so our own writes are not read as user ones */
  private observedQuality: VideoQuality | undefined = undefined;

  private unsubscribeStore: (() => void) | undefined = undefined;

  private downlinkScore = 0;
  private uplinkScore = 0;

  private normalRecoveryStreak = 0;
  private criticalRecoveryStreak = 0;

  /** consecutive real Lost samples per direction (independent fast paths) */
  private uploadLostStreak = 0;
  private receiveLostStreak = 0;

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
  /** true once the current restore->degrade episode has been counted */
  private flapCycleCounted = false;

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

  private get currentRoomQuality(): VideoQuality {
    return store.getState().roomSettings.roomVideoQuality;
  }

  private isWebcamLocked(): boolean {
    const session = store.getState().session;
    const isAdmin = !!session.currentUser?.metadata?.isAdmin;
    const userLock = session.currentUser?.metadata?.lockSettings?.lockWebcam;
    const defaultLock = !!session.currentRoom?.metadata?.defaultLockSettings?.lockWebcam;
    return !isAdmin && (userLock ?? defaultLock);
  }

  private isWebcamAllowed(): boolean {
    const session = store.getState().session;
    const roomFeatures = session.currentRoom?.metadata?.roomFeatures;
    const isAdmin = !!session.currentUser?.metadata?.isAdmin;
    return !!roomFeatures?.allowWebcams && !(roomFeatures?.adminOnlyWebcams && !isAdmin);
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

  /**
   * Snapshot for the TURN fallback coordinator: only whether system media is
   * degraded. Reduced-media "health" must never count as full-media
   * recovery, and a full→degraded transition during real distress records
   * an adaptation cycle.
   */
  public getPolicySnapshot(): MediaAdaptationSnapshot {
    return {
      degradedMedia:
        this.incomingWebcamPaused ||
        this.incomingScreensharePaused ||
        this.outgoingCameraAutoMuted ||
        // a cap-only reduction is still shed media: the TURN coordinator must
        // see the degraded transition
        this.savedQuality !== undefined,
    };
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

    // observe user changes to the shared video-quality setting
    this.observedQuality = this.currentRoomQuality;
    this.unsubscribeStore = store.subscribe(this.onStoreChange);
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

    this.unsubscribeStore?.();
    this.unsubscribeStore = undefined;

    this.operationGeneration += 1;
    /*
     * Drop flap-cycle history so a re-attached controller starts clean. The
     * degradation/ownership flags deliberately survive: the paused media and
     * its Redux snapshot must persist across a transient reconnect.
     */
    this.resetFlapState();
    this.attached = false;
  }

  // pre-hide streak/Lost counters must not mature fast paths after the tab
  // returns, and a stale restore opportunity must not survive the gap either
  // (hidden-tab sampling skips evaluate() entirely, so this handler is the only
  // place that can revoke it); flap history is intentionally preserved (user
  // cycles, not windows)
  private onVisibilityChange = (): void => {
    if (document.visibilityState !== 'visible') {
      return;
    }

    this.resetQualityState();
    // resetQualityState clears scores/streaks but not the restore opportunity
    this.restoreAvailable = false;
  };

  /**
   * An unknown/hidden sample is never evidence. Dropping the counters and
   * streaks here stops any fast path or staged recovery from maturing ACROSS a
   * gap of unmeasured samples (reconnect, hidden tab): a degradation may only
   * be lifted by consecutive MEASURED healthy samples, and a stale restore
   * opportunity must not survive the gap either. While a reduction is owned the
   * receive score is dropped too, so post-reduction distress must be rebuilt
   * from fresh measured samples instead of riding pre-gap score across the gap.
   * The protective degradation, ownership and grace state deliberately survive
   * — the paused media and its Redux snapshot must not be dropped just because
   * one sample was unmeasured.
   */
  private invalidateUnmeasuredEvidence(): void {
    this.uploadLostStreak = 0;
    this.receiveLostStreak = 0;
    this.normalRecoveryStreak = 0;
    this.criticalRecoveryStreak = 0;
    this.restoreAvailable = false;

    /*
     * A poor score rebuilt before the gap would otherwise let a single post-gap
     * poor sample reach the threshold and pause, i.e. let pre-gap evidence
     * cross the gap. Only relevant while we own a reduction; baseline score
     * behaviour with no reduction is left unchanged.
     */
    if (this.savedQuality !== undefined) {
      this.downlinkScore = 0;
    }
  }

  /** Called by the connection-quality monitor every 5 seconds. */
  public evaluate(stats: QualityStats): void {
    // never adapt on a hidden tab: it proves nothing
    if (!this.options.enabled || document.hidden) {
      this.invalidateUnmeasuredEvidence();
      return;
    }

    /*
     * A partial sample (`measured === false`) is not global health evidence:
     * scores, staged recovery, the Lost fast paths and the UI stay gated and
     * every streak is reset. The ONE exception is an INDEPENDENTLY verified
     * upload audio stall — the upload direction's own report (uploadMeasured)
     * proved a live mic produced audio that was not sent. Silencing that over an
     * unknown download would drop the audio-critical protection, so its
     * protective video-only action is still applied. A synthetic sample is
     * always uploadMeasured:false, so no unverified flag can bypass the gate.
     */
    if (stats.measured === false) {
      this.invalidateUnmeasuredEvidence();

      if (stats.uploadMeasured === true && stats.isUploadAudioStuck) {
        void this.evaluateVerifiedAudioStuckProtection().catch((error: unknown) => {
          console.error('[AdaptiveMedia] evaluate failed', error);
        });
      }
      return;
    }

    void this.evaluateInternal(stats).catch((error: unknown) => {
      console.error('[AdaptiveMedia] evaluate failed', error);
    });
  }

  /**
   * The ONLY adaptation permitted under partial (non-global) evidence: an
   * upload-audio stall independently verified by the upload direction's own
   * report protects audio by shedding video. It reuses the generation-safe,
   * idempotent audio-critical entry path and touches NOTHING else — no
   * score/EMA movement, no Lost streak, no recovery progress — because the
   * surrounding sample is not globally measured (the caller already reset them).
   */
  private async evaluateVerifiedAudioStuckProtection(): Promise<void> {
    await this.enterAudioOnlyMode('audio-stuck');
  }

  /**
   * Explicit user action from the persistent degradation banner. Restores
   * all controller-managed media (including an auto-lowered quality, unless the
   * user has since taken the setting over) and grants a grace period before
   * normal adaptive degradation can disable it again. Only
   * outbound-audio-stuck overrides the grace period (protecting audio wins).
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
      Date.now() - this.lastScreenshareSuggestionAt > SCREENSHARE_SUGGESTION_COOLDOWN_MS
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
          if (this.isActiveWebcam && !this.isWebcamMuted && !this.outgoingCameraAutoMuted) {
            await this.pauseOutgoingCamera('notifications.video-paused-weak-connection');
            return;
          }
          break;
      }
    }

    this.downlinkScore = this.updateScore(this.downlinkScore, stats.receiveQuality);

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
      await this.pauseOutgoingCamera('notifications.video-paused-audio-protection');
      return;
    }

    /*
     * Downlink degradation: shed the cheapest thing first. Lowering the shared
     * quality changes the layer we REQUEST; the webcam pause that follows keeps
     * the old behaviour and does not itself prove the server stops forwarding.
     * Audio and presentation stay alive either way.
     */
    if (
      this.downlinkScore >= DEGRADE_THRESHOLD &&
      !this.incomingWebcamPaused &&
      Date.now() >= this.manualOverrideUntil
    ) {
      /*
       * Cheapest shed first: lower the room video quality and wait. The
       * reduction consumes this episode's evidence, so the same sample cannot
       * also pause — a fresh measured receive episode must precede the pause.
       */
      if (this.tryReduceReceiveQuality()) {
        return;
      }

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
      await this.pauseOutgoingCamera('notifications.video-paused-weak-connection');
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

    if (uploadLost && receiveLost) {
      /*
       * Combined Lost earns the persistent manual-only critical mode only
       * when it is loss-backed: both directions must report real (finite)
       * packet loss at the Lost threshold. A high RTT also classifies as Lost
       * but proves no loss, so RTT-only combined distress falls through to
       * the score ladder instead: video still sheds quickly and staged, but
       * normal automatic recovery stays available.
       */
      const lossBacked =
        this.isLossBackedLost(stats.myPacketLoss) && this.isLossBackedLost(stats.receivePacketLoss);

      if (
        lossBacked &&
        this.uploadLostStreak >= LOST_FAST_PATH_STREAK &&
        this.receiveLostStreak >= LOST_FAST_PATH_STREAK
      ) {
        return CriticalReason.BothLost;
      }

      return undefined;
    }

    if (uploadLost) {
      return this.uploadLostStreak >= LOST_FAST_PATH_STREAK ? CriticalReason.UploadLost : undefined;
    }

    /*
     * Receive-only Lost is deliberately NOT a fast path: ordinary receive
     * distress must try the quality reduction before it pauses anything.
     */
    return undefined;
  }

  /**
   * A direction's Lost sample counts as loss-backed only when a real, finite
   * packet-loss reading reaches the Lost threshold. NaN/absent readings are
   * never evidence of loss and must not sway the critical decision.
   */
  private isLossBackedLost(packetLoss: number): boolean {
    return Number.isFinite(packetLoss) && packetLoss >= LOST_PACKET_LOSS_THRESHOLD;
  }

  private updateLostStreak(stats: QualityStats): void {
    /*
     * Per-direction streaks: a Lost reading only matures its OWN direction's
     * fast path and any non-Lost sample of that direction resets it, so an
     * upload Lost can never combine with a later receive Lost to fake a
     * receive-lost pair.
     */
    this.uploadLostStreak =
      stats.uploadQuality === PnmConnectionQuality.Lost ? this.uploadLostStreak + 1 : 0;

    this.receiveLostStreak =
      stats.receiveQuality === PnmConnectionQuality.Lost ? this.receiveLostStreak + 1 : 0;
  }

  private async enterAudioOnlyMode(reason: 'audio-stuck' | 'connection-lost'): Promise<void> {
    const alreadyAudioOnly =
      this.criticalMode &&
      this.incomingWebcamPaused &&
      this.incomingScreensharePaused &&
      (!this.isActiveWebcam || this.isWebcamMuted || this.outgoingCameraAutoMuted);

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

  /**
   * Ordinary receive distress sheds the shared video quality to LOW and waits:
   * a fresh measured receive episode (a rebuilt downlink score) must precede any
   * pause, so a cheap reduction is never mistaken for "quality did not help".
   * Skipped when we already own a reduction (fresh distress then pauses instead)
   * or when the setting is already at/below LOW (a reduction would be a no-op).
   * A recent user takeover is handled by the caller's manualOverrideUntil grace,
   * which only bounds how long after an explicit user choice reduction stays
   * off — it never disables reduction permanently.
   */
  private tryReduceReceiveQuality(): boolean {
    if (this.savedQuality !== undefined) {
      return false;
    }

    const current = this.currentRoomQuality;

    if (!(current > VideoQuality.LOW)) {
      return false;
    }

    this.savedQuality = current;

    /*
     * The reduction consumes this episode's evidence: the same sample must not
     * also pause, and only fresh measured distress may pause afterwards. The
     * Lost streaks are left alone — they only feed the verified audio-critical
     * pairing, which must never be weakened.
     */
    this.downlinkScore = 0;
    this.normalRecoveryStreak = 0;

    this.markNormalDegrade();
    this.dispatchRoomQuality(VideoQuality.LOW);
    this.syncRedux();

    return true;
  }

  /**
   * Healthy recovery's final notch: restore the user/global quality only while
   * it is still our own auto-lowered value. A later user change always wins.
   */
  private restoreReducedQuality(): void {
    const target = this.savedQuality;
    this.savedQuality = undefined;

    if (target === undefined) {
      return;
    }

    if (this.currentRoomQuality !== VideoQuality.LOW) {
      // somebody else changed the setting: leave it alone (defensive — the
      // external-change handler has already relinquished it)
      this.syncRedux();
      return;
    }

    this.dispatchRoomQuality(target);
    this.syncRedux();
  }

  private dispatchRoomQuality(quality: VideoQuality): void {
    // record our own write first so the subscription does not read it as a user change
    this.observedQuality = quality;
    store.dispatch(updateRoomVideoQuality(quality));
  }

  private onStoreChange = (): void => {
    const quality = this.currentRoomQuality;

    if (quality === this.observedQuality) {
      return;
    }

    this.observedQuality = quality;

    // A change we did not write is a user (or other writer) taking the setting
    // over: relinquish ownership and grant the bounded manual grace.
    this.relinquishQualityOwnership();
  };

  /**
   * Records an explicit user choice of the shared video-quality setting.
   *
   * The settings UI dispatches the new value first and then calls this, so the
   * store already holds it; reading the current value (rather than taking it as
   * an argument) keeps our own write discriminated. The subscription cannot
   * observe a same-value choice — re-selecting LOW while already LOW leaves the
   * Redux value unchanged — so this must still run on every change to cancel a
   * stale auto-lowered restoration.
   */
  public notifyUserQualitySelection(): void {
    this.observedQuality = this.currentRoomQuality;
    this.relinquishQualityOwnership();
  }

  /**
   * A user (or other writer) taking the setting over: relinquish any reduction
   * we still own so a later recovery can never restore a stale value over their
   * choice, drop the receive evidence so a new episode starts clean, and grant
   * the same bounded grace a manual restore gets before normal adaptation may
   * lower the (new) setting again.
   */
  private relinquishQualityOwnership(): void {
    const hadReduction = this.savedQuality !== undefined;

    this.savedQuality = undefined;
    this.downlinkScore = 0;
    this.normalRecoveryStreak = 0;
    this.manualOverrideUntil = Date.now() + MANUAL_OVERRIDE_GRACE_MS;

    if (hadReduction) {
      this.syncRedux();
    }
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
    if (this.outgoingCameraAutoMuted || !this.isActiveWebcam || this.isWebcamMuted) {
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
   * Auto-restores normal degradations one notch at a time, in reverse order
   * (presentation → webcams → camera → video quality LAST), after a sustained
   * healthy period. Critical audio-only mode and flap-guard suspension are
   * excluded.
   */
  private evaluateNormalRecovery(stats: QualityStats): void {
    const hasDegradation =
      this.incomingScreensharePaused ||
      this.incomingWebcamPaused ||
      this.outgoingCameraAutoMuted ||
      // a cap-only reduction is still a degradation to recover from
      this.savedQuality !== undefined;

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
    // a fresh restoration attempt opens a new flap cycle window
    this.lastAutoRestoreAt = Date.now();
    this.flapCycleCounted = false;

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
      return;
    }

    // the shared quality is the last notch (only once the cap is all that is left)
    if (this.savedQuality !== undefined) {
      this.restoreReducedQuality();
    }
  }

  private evaluateCriticalRecovery(stats: QualityStats): void {
    if (!this.isHealthyForRecovery(stats)) {
      this.criticalRecoveryStreak = 0;
      this.restoreAvailable = false;
      return;
    }

    this.criticalRecoveryStreak += 1;

    if (this.criticalRecoveryStreak < CRITICAL_RECOVERY_STREAK || this.restoreAvailable) {
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
   * Flap guard: the first normal degrade that follows a recent automatic
   * restore within FLAP_GRACE_MS counts as ONE flap cycle — every further
   * pause action inside that same degrade episode belongs to the same cycle.
   * The counter is re-armed by the next restoration attempt. After
   * MAX_FLAP_CYCLES quick cycles, automatic restoration is suspended (manual
   * banner only).
   */
  private markNormalDegrade(): void {
    if (!this.lastAutoRestoreAt || this.flapCycleCounted) {
      return;
    }

    if (Date.now() - this.lastAutoRestoreAt >= FLAP_GRACE_MS) {
      return;
    }

    this.flapCycleCounted = true;
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

    if (!this.isActiveWebcam || !this.isWebcamAllowed() || this.isWebcamLocked()) {
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
    // a manual restore is an explicit takeover: restart flap accounting
    this.resetFlapState();

    let cameraRestored = true;

    if (this.outgoingCameraAutoMuted) {
      if (this.isActiveWebcam && this.isWebcamAllowed() && !this.isWebcamLocked()) {
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

    /*
     * Also hand back the auto-lowered quality. It is skipped when it is no
     * longer ours (the user's later choice wins), and the grace window above
     * keeps normal degradation from immediately lowering it again.
     */
    this.restoreReducedQuality();

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
    return quality === PnmConnectionQuality.Excellent || quality === PnmConnectionQuality.Good;
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
    this.uploadLostStreak = 0;
    this.receiveLostStreak = 0;
  }

  /**
   * Clears flap history on an explicit user restore (manual camera re-enable
   * or the persistent banner's resumeAll) and on disposal. After the user
   * takes control the flap guard must only suspend again on genuinely
   * repeated automatic restore->degrade cycles.
   */
  private resetFlapState(): void {
    this.lastAutoRestoreAt = 0;
    this.flapCycleCount = 0;
    this.flapCycleCounted = false;
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
      console.error(`[AdaptiveMedia] failed to ${muted ? 'pause' : 'restore'} local camera`, error);

      return false;
    }
  }

  /**
   * Only a USER re-enable of a controller-paused camera passes the ownership
   * guard (controller restores clear outgoingCameraAutoMuted BEFORE their own
   * unmute): it is treated as a manual override (grace window + flap slate).
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
      videoQualityReduced: this.savedQuality !== undefined,
    };

    const current = store.getState().roomSettings.mediaDegradation;

    const changed =
      current.incomingWebcamPaused !== snapshot.incomingWebcamPaused ||
      current.incomingScreensharePaused !== snapshot.incomingScreensharePaused ||
      current.outgoingCameraPaused !== snapshot.outgoingCameraPaused ||
      current.autoRestoreSuspended !== snapshot.autoRestoreSuspended ||
      current.videoQualityReduced !== snapshot.videoQualityReduced;

    if (changed) {
      store.dispatch(updateMediaDegradation(snapshot));
    }
  }
}
