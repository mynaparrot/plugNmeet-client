import { Dispatch } from 'react';
import {
  ConnectionState,
  DisconnectReason,
  ExternalE2EEKeyProvider,
  isE2EESupported,
  RemoteParticipant,
  RemoteTrackPublication,
  Room,
  RoomConnectOptions,
  RoomEvent,
  RoomOptions,
  supportsAV1,
  supportsVP9,
  VideoCodec,
  VideoPresets,
} from 'livekit-client';
import { EventEmitter } from 'eventemitter3';
import {
  AnalyticsEvents,
  AnalyticsEventType,
  DataMsgBodyType,
  MediaServerConnInfo,
} from 'plugnmeet-protocol-js';
import { toast } from 'react-toastify';
// @ts-expect-error not an error
import LkWorkerUrl from 'livekit-client/e2ee-worker?worker&url';

import ParticipantMediaManager from './ParticipantMediaManager';
import HandleMediaTracks from './HandleMediaTracks';

import { store } from '../../store';
import { updateParticipant } from '../../store/slices/participantSlice';
import { IErrorPageProps } from '../../components/extra-pages/Error';
import { IConnectLivekit } from './types';
import i18n from '../i18n';
import { getNatsConn } from '../nats';
import { roomConnectionStatus } from '../../components/app/helper';
import {
  getConfigValue,
  isFirefoxMobile,
  isUserRecorder,
  toNativeTwinIdentity,
  toPlugNmeetUserId,
} from '../utils';
import { CorsWorker } from '../libs/corsWorker';
import ConnectionQualityMonitor, {
  PnmConnectionQuality,
  QualityStats,
} from './ConnectionQualityMonitor';
import AdaptiveMediaController from './AdaptiveMediaController';
import TurnFallbackController from './turn/TurnFallbackController';
import { updateOverallConnectionQuality } from '../../store/slices/sessionSlice';
import {
  initializeNativePublisher,
  nativeBridge,
  startNativeHeartbeat,
  teardownNativePublisher,
} from '../nativeBridge';

export default class ConnectLivekit extends EventEmitter implements IConnectLivekit {
  private readonly _errorState: Dispatch<IErrorPageProps>;
  private readonly _roomConnectionStatusState: Dispatch<roomConnectionStatus>;
  private readonly localUserId: string;
  private readonly enabledE2EE: boolean = false;
  private readonly encryptionKey: string | undefined = '';

  private readonly handleMediaTracks: HandleMediaTracks;
  private readonly participantMediaManager: ParticipantMediaManager;

  private _room!: Room;
  private readonly _e2eeKeyProvider: ExternalE2EEKeyProvider;
  private toastIdConnecting: number | string | undefined = undefined;
  private wasNormalDisconnected: boolean = false;
  private serverInfo: MediaServerConnInfo | undefined = undefined;
  private readonly turnFallback: TurnFallbackController = new TurnFallbackController(
    () => this._room,
    () => this.adaptiveMediaController.getPolicySnapshot(),
  );

  private lastReportedConnectionQuality: PnmConnectionQuality | null = null;
  private lastDispatchedOverallQuality: PnmConnectionQuality | null = null;
  private readonly connectionQualityMonitor: ConnectionQualityMonitor;
  private readonly adaptiveMediaController: AdaptiveMediaController;

  constructor(
    errorState: Dispatch<IErrorPageProps>,
    roomConnectionStatusState: Dispatch<roomConnectionStatus>,
    localUserId: string,
    enabledE2EE: boolean,
    encryptionKey?: string,
  ) {
    super();
    this.localUserId = localUserId;
    this._errorState = errorState;
    this._roomConnectionStatusState = roomConnectionStatusState;

    this._e2eeKeyProvider = new ExternalE2EEKeyProvider();
    if (enabledE2EE && encryptionKey) {
      this.enabledE2EE = enabledE2EE;
      this.encryptionKey = encryptionKey;
    }
    this.handleMediaTracks = new HandleMediaTracks(this);
    this.participantMediaManager = new ParticipantMediaManager(this, this.localUserId);
    void this.configureRoom();

    this.connectionQualityMonitor = new ConnectionQualityMonitor();
    this.adaptiveMediaController = new AdaptiveMediaController(() => this._room, {
      enabled: !isUserRecorder(this.localUserId),
    });
    document.addEventListener('visibilitychange', this.onVisibilityLifecycle);
    window.addEventListener('beforeunload', this.onBeforeUnload);
  }

  private onVisibilityLifecycle = () => {
    if (!document.hidden) return;

    this.turnFallback.resetEvidence();
  };

  private onBeforeUnload = () => {
    document.removeEventListener('visibilitychange', this.onVisibilityLifecycle);
    this.adaptiveMediaController.dispose();
    this.connectionQualityMonitor.stop();
    this.turnFallback.onUnload();
    teardownNativePublisher();
  };

  public get videoSubscribersMap() {
    return this.participantMediaManager.videoSubscribersMap;
  }

  /**
   * Returns the video-subscriber participant stored under the given PRIMARY
   * user id. Use this instead of Room.getParticipantByIdentity, which fails
   * for hybrid native-twin participants (identity "[userID]-native").
   */
  public getVideoSubscriberParticipant(userId: string) {
    return this.participantMediaManager.getVideoSubscriberParticipant(userId);
  }

  public get audioSubscribersMap() {
    return this.participantMediaManager.audioSubscribersMap;
  }

  public get screenShareTracksMap() {
    return this.participantMediaManager.screenShareTracksMap;
  }

  public get room() {
    return this._room;
  }

  public get qualityMonitor(): ConnectionQualityMonitor {
    return this.connectionQualityMonitor;
  }

  public get adaptiveMedia(): AdaptiveMediaController {
    return this.adaptiveMediaController;
  }

  public initializeConnection = async (serverInfo: MediaServerConnInfo): Promise<boolean> => {
    this.serverInfo = serverInfo;
    this.turnFallback.configure(serverInfo.turnCredentials);

    try {
      if (this.enabledE2EE && this.encryptionKey) {
        await this._e2eeKeyProvider.setKey(this.encryptionKey);
        await this._room.setE2EEEnabled(true);
      }

      let opts: RoomConnectOptions | undefined;
      if (serverInfo.turnCredentials) {
        const policy: RTCIceTransportPolicy =
          isFirefoxMobile() || !serverInfo.turnCredentials.forceTurn ? 'all' : 'relay';

        opts = {
          rtcConfig: {
            iceServers: [
              {
                username: serverInfo.turnCredentials.username,
                credential: serverInfo.turnCredentials.password,
                urls: serverInfo.turnCredentials.uris,
              },
            ],
            iceTransportPolicy: policy,
          },
        };
      }

      await this._room.connect(serverInfo.url, serverInfo.token, opts);
      this._roomConnectionStatusState('media-server-conn-established');
      // start connection quality monitor
      this.connectionQualityMonitor.start(this._room, this.checkConnectionQualityForFallback);

      this.adaptiveMediaController.attach();

      // Hybrid mode: if the server sent a native publish token, hand it to the
      // native host over the bridge and start the liveness heartbeat.
      if (serverInfo.nativeToken) {
        // start our listener first
        nativeBridge.start();
        const e2ee =
          this.enabledE2EE && this.encryptionKey
            ? { enabled: true, key: this.encryptionKey }
            : undefined;
        initializeNativePublisher(
          serverInfo.url,
          serverInfo.nativeToken,
          toNativeTwinIdentity(this.localUserId),
          e2ee,
        );
        startNativeHeartbeat();
      }

      return true;
    } catch (error) {
      console.error(error);
      this._roomConnectionStatusState('error');
      this._errorState({
        title: i18n.t('error'),
        text: String(error),
      });
      return false;
    }
  };

  private onRoomConnectedOrReconnected = () => {
    this.turnFallback.onConnectionEstablished();
    this.connectionQualityMonitor.resetMeasurementBaseline();
  };

  private async configureRoom() {
    let videoCodec = getConfigValue<VideoCodec>('videoCodec', 'vp8', 'VIDEO_CODEC');
    if ((videoCodec === 'vp9' && !supportsVP9()) || (videoCodec === 'av1' && !supportsAV1())) {
      videoCodec = 'vp8';
    }

    // disable adaptiveStream for recorder
    const isRecorder = isUserRecorder(this.localUserId);
    const adaptiveStream = isRecorder
      ? false
      : getConfigValue<boolean>('enableAdaptiveStream', true, 'ENABLE_ADAPTIVE_STREAM');

    const roomOptions: RoomOptions = {
      adaptiveStream,
      dynacast: getConfigValue<boolean>('enableDynacast', false, 'ENABLE_DYNACAST'),
      stopLocalTrackOnUnpublish: true,
      videoCaptureDefaults: {
        resolution: VideoPresets.h720.resolution,
      },
      publishDefaults: {
        simulcast: getConfigValue<boolean>('enableSimulcast', false, 'ENABLE_SIMULCAST'),
        videoSimulcastLayers: [VideoPresets.h90, VideoPresets.h180, VideoPresets.h360],
        stopMicTrackOnMute: getConfigValue<boolean>(
          'stopMicTrackOnMute',
          false,
          'STOP_MIC_TRACK_ON_MUTE',
        ),
        videoCodec: videoCodec,
      },
    };

    if (this.enabledE2EE && isE2EESupported()) {
      const LkWorker = await CorsWorker.create(LkWorkerUrl);
      roomOptions.encryption = {
        keyProvider: this._e2eeKeyProvider,
        worker: LkWorker,
      };
    }

    const room = new Room(roomOptions);

    room.on(RoomEvent.Reconnecting, () => {
      this.turnFallback.resetEvidence();

      this.toastIdConnecting = toast.loading(
        i18n.t('notifications.media-server-disconnected-reconnecting'),
        {
          type: 'warning',
          closeButton: false,
          autoClose: false,
        },
      );
    });
    room.on(RoomEvent.Connected, () => {
      if (typeof this.toastIdConnecting !== 'undefined') {
        toast.dismiss(this.toastIdConnecting);
        this.toastIdConnecting = undefined;
      }
    });
    room.on(RoomEvent.Reconnected, () => {
      if (typeof this.toastIdConnecting !== 'undefined') {
        toast.dismiss(this.toastIdConnecting);
        this.toastIdConnecting = undefined;
      }
    });
    room.on(RoomEvent.Connected, this.onRoomConnectedOrReconnected);
    room.on(RoomEvent.Reconnected, this.onRoomConnectedOrReconnected);
    room.on(RoomEvent.Disconnected, this.onDisconnected);
    room.on(RoomEvent.MediaDevicesError, this.mediaDevicesError);

    room.on(RoomEvent.LocalTrackPublished, this.handleMediaTracks.localTrackPublished);
    room.on(RoomEvent.LocalTrackUnpublished, this.handleMediaTracks.localTrackUnpublished);
    room.on(RoomEvent.TrackSubscribed, this.handleMediaTracks.trackSubscribed);
    room.on(RoomEvent.TrackUnpublished, this.handleMediaTracks.trackUnsubscribed);
    room.on(RoomEvent.TrackSubscriptionFailed, this.handleMediaTracks.trackSubscriptionFailed);
    room.on(RoomEvent.TrackMuted, this.handleMediaTracks.trackMuted);
    room.on(RoomEvent.TrackUnmuted, this.handleMediaTracks.trackUnmuted);
    room.on(RoomEvent.TrackStreamStateChanged, this.handleMediaTracks.trackStreamStateChanged);

    this._room = room;
  }

  public registerExistingTracksForParticipant(participant: RemoteParticipant) {
    // route through HandleMediaTracks so permission gates
    // (e.g. _shouldAddWebcam) apply consistently
    participant.getTrackPublications().forEach((track) => {
      if (track.isSubscribed) {
        this.handleMediaTracks.processExistingTrack(track as RemoteTrackPublication, participant);
      }
    });
  }

  public registerAllExistingTracks() {
    this._room.remoteParticipants.forEach((participant) => {
      this.registerExistingTracksForParticipant(participant);
    });
  }

  private closeLocalTracks() {
    this._room.localParticipant.getTrackPublications().forEach((track) => {
      if (track.videoTrack) {
        track.videoTrack.stop();
      } else if (track.audioTrack) {
        track.audioTrack.stop();
      }
    });
  }

  public async disconnectRoom(normalDisconnect: boolean) {
    if (this._room.state === ConnectionState.Connected) {
      this.wasNormalDisconnected = normalDisconnect;
      this.closeLocalTracks();
      await this._room.disconnect(true);
    }
  }

  public setErrorStatus(title: string, reason: string) {
    this._roomConnectionStatusState('error');
    this._errorState({
      title: title,
      text: reason,
    });
  }

  private onDisconnected = (reason?: DisconnectReason) => {
    window.removeEventListener('beforeunload', this.onBeforeUnload);
    document.removeEventListener('visibilitychange', this.onVisibilityLifecycle);
    this.connectionQualityMonitor.stop();
    this.adaptiveMediaController.dispose();
    // Hybrid mode: tear down native publisher on disconnect (beforeunload fallback removed above)
    teardownNativePublisher();

    this.turnFallback.dispose();

    if (typeof this.toastIdConnecting !== 'undefined') {
      toast.dismiss(this.toastIdConnecting);
    }

    if (this.wasNormalDisconnected) {
      // no need to show any message
      return;
    }
    this.closeLocalTracks();

    this._errorState({
      title: i18n.t('notifications.room-disconnected-title'),
      text: this.getDisconnectErrorReasonText(reason),
    });
  };

  private getDisconnectErrorReasonText(reason?: DisconnectReason) {
    let msg = i18n.t('notifications.room-disconnected-default', {
      reason: reason ? reason.toString() : 'UNKNOWN_REASON',
    });

    switch (reason) {
      case DisconnectReason.CLIENT_INITIATED:
        msg = i18n.t('notifications.room-disconnected-client-initiated');
        break;
      case DisconnectReason.DUPLICATE_IDENTITY:
        msg = i18n.t('notifications.room-disconnected-duplicate-entry');
        break;
      case DisconnectReason.SERVER_SHUTDOWN:
        msg = i18n.t('notifications.room-disconnected-server-shutdown');
        break;
      case DisconnectReason.PARTICIPANT_REMOVED:
        msg = i18n.t('notifications.room-disconnected-participant-removed');
        break;
      case DisconnectReason.ROOM_DELETED:
        msg = i18n.t('notifications.room-disconnected-room-ended');
        break;
      case DisconnectReason.STATE_MISMATCH:
        msg = i18n.t('notifications.room-disconnected-state-mismatch');
        break;
    }

    return msg;
  }

  private mediaDevicesError = (error: Error) => {
    // to do
    console.error(error);
  };

  private checkConnectionQualityForFallback = async (stats: QualityStats) => {
    // For local UI - show the overall experience & update participant list
    if (this.lastDispatchedOverallQuality !== stats.overallQuality) {
      this.lastDispatchedOverallQuality = stats.overallQuality;
      store.dispatch(updateOverallConnectionQuality(stats.overallQuality));
      store.dispatch(
        updateParticipant({
          id: toPlugNmeetUserId(this.localUserId),
          changes: {
            connectionQuality: stats.overallQuality,
          },
        }),
      );
    }

    // For broadcasting - only send our own connection's quality
    const qualityChanged = this.lastReportedConnectionQuality !== stats.uploadQuality;
    if (qualityChanged) {
      this.lastReportedConnectionQuality = stats.uploadQuality;

      const conn = getNatsConn();
      if (conn) {
        conn.sendAnalyticsData(
          AnalyticsEvents.ANALYTICS_EVENT_USER_CONNECTION_QUALITY,
          AnalyticsEventType.USER,
          stats.uploadQuality,
        );

        void conn.sendDataMessage(
          DataMsgBodyType.USER_CONNECTION_QUALITY_CHANGE,
          stats.uploadQuality,
        );
      }
    }

    this.adaptiveMediaController.evaluate(stats);

    this.turnFallback.evaluate({
      atMs: Date.now(),
      measured: stats.measured,
      uploadQuality: stats.uploadQuality,
      receiveQuality: stats.receiveQuality,
      isMyConnectionPoor: stats.isMyConnectionPoor,
      isReceivingPoor: stats.isReceivingPoor,
      isLikelyDownloadIssue: stats.isLikelyDownloadIssue,
      isUploadAudioStuck: stats.isUploadAudioStuck,
    });
  };

  public addScreenShareTrack: typeof ParticipantMediaManager.prototype.addScreenShareTrack = (
    userId,
    track,
  ) => this.participantMediaManager.addScreenShareTrack(userId, track);

  public removeScreenShareTrack: typeof ParticipantMediaManager.prototype.removeScreenShareTrack = (
    userId,
  ) => this.participantMediaManager.removeScreenShareTrack(userId);

  public addAudioSubscriber: typeof ParticipantMediaManager.prototype.addAudioSubscriber = (
    participant,
  ) => this.participantMediaManager.addAudioSubscriber(participant);

  public removeAudioSubscriber: typeof ParticipantMediaManager.prototype.removeAudioSubscriber = (
    userId,
  ) => this.participantMediaManager.removeAudioSubscriber(userId);

  public addVideoSubscriber: typeof ParticipantMediaManager.prototype.addVideoSubscriber = (
    participant,
  ) => this.participantMediaManager.addVideoSubscriber(participant);

  public removeVideoSubscriber: typeof ParticipantMediaManager.prototype.removeVideoSubscriber = (
    userId,
  ) => this.participantMediaManager.removeVideoSubscriber(userId);
}
