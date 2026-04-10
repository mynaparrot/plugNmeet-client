import { Dispatch } from 'react';
import {
  ConnectionQuality,
  ConnectionState,
  DisconnectReason,
  ExternalE2EEKeyProvider,
  isE2EESupported,
  RemoteTrackPublication,
  Room,
  RoomConnectOptions,
  RoomEvent,
  RoomOptions,
  supportsAV1,
  supportsVP9,
  Track,
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
import { CorsWorker } from '@twilio/video-processors/es5/utils/CorsWorker';
// @ts-expect-error not an error
import LkWorkerUrl from 'livekit-client/e2ee-worker?url';

import ParticipantMediaManager from './ParticipantMediaManager';
import HandleMediaTracks from './HandleMediaTracks';

import { store } from '../../store';
import { updateParticipant } from '../../store/slices/participantSlice';
import { IErrorPageProps } from '../../components/extra-pages/Error';
import { IConnectLivekit } from './types';
import i18n from '../i18n';
import { getNatsConn } from '../nats';
import { roomConnectionStatus } from '../../components/app/helper';
import { addUserNotification } from '../../store/slices/roomSettingsSlice';
import { getConfigValue, isFirefoxMobile } from '../utils';

const FALLBACK_TIMER_DURATION = 60 * 1000; // 60 seconds

export default class ConnectLivekit
  extends EventEmitter
  implements IConnectLivekit
{
  private readonly _errorState: Dispatch<IErrorPageProps>;
  private readonly _roomConnectionStatusState: Dispatch<roomConnectionStatus>;
  private readonly localUserId: string;
  private readonly enabledE2EE: boolean = false;
  private readonly encryptionKey: string | undefined = '';

  private readonly handleMediaTracks: HandleMediaTracks;
  private _room!: Room;
  private readonly _e2eeKeyProvider: ExternalE2EEKeyProvider;
  private toastIdConnecting: number | string | undefined = undefined;
  private wasNormalDisconnected: boolean = false;
  // for silent fallback
  private fallbackTimer: NodeJS.Timeout | null = null;
  private hasAttemptedSilentFallback: boolean = false;
  private serverInfo: MediaServerConnInfo | undefined = undefined;
  private poorConnectionTimestamps: number[] = [];
  private participantMediaManager: ParticipantMediaManager;

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
    this.participantMediaManager = new ParticipantMediaManager(
      this,
      this.localUserId,
    );
    this.configureRoom().then();
  }

  public get videoSubscribersMap() {
    return this.participantMediaManager.videoSubscribersMap;
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

  public initializeConnection = async (serverInfo: MediaServerConnInfo) => {
    this.serverInfo = serverInfo;
    this._roomConnectionStatusState('media-server-conn-start');

    try {
      if (this.enabledE2EE && this.encryptionKey) {
        await this._e2eeKeyProvider.setKey(this.encryptionKey);
        await this._room.setE2EEEnabled(true);
      }

      let opts: RoomConnectOptions | undefined;
      if (serverInfo.turnCredentials) {
        const policy: RTCIceTransportPolicy =
          isFirefoxMobile() || !serverInfo.turnCredentials.forceTurn
            ? 'all'
            : 'relay';

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
      // we'll prepare our information
      await this.initiateParticipants();
      this._roomConnectionStatusState('media-server-conn-established');
    } catch (error) {
      console.error(error);
      this._roomConnectionStatusState('error');
      this._errorState({
        title: 'Error',
        text: String(error),
      });
    }
  };

  private executeSilentRelayFallback = () => {
    // Clear any pending timer as we are now executing.
    if (this.fallbackTimer) {
      clearTimeout(this.fallbackTimer);
      this.fallbackTimer = null;
    }

    if (this.hasAttemptedSilentFallback) {
      console.log('[Fallback] Already attempted, skipping.');
      return;
    }
    this.hasAttemptedSilentFallback = true;

    if (!this.serverInfo?.turnCredentials) {
      console.error(
        '[Fallback] Cannot attempt fallback: TURN credentials are not configured.',
      );
      return;
    }

    toast.info(i18n.t('notifications.re-routing-connection'), {
      autoClose: 4000,
    });

    try {
      const pcManager = this._room.engine.pcManager;
      if (!pcManager || !pcManager.updateConfiguration) {
        console.error('PCManager or updateConfiguration method not available.');
        this.hasAttemptedSilentFallback = false; // Allow another try
        return;
      }

      const config = this._room.engine.rtcConfig;
      config.iceTransportPolicy = 'relay';

      console.log(
        'Updating configuration and restarting ICE with relay-only policy...',
      );
      pcManager.updateConfiguration(config, true);
    } catch (e) {
      console.error('Failed to execute silent relay fallback:', e);
      this.hasAttemptedSilentFallback = false; // Allow another try on error
    }
  };

  private async configureRoom() {
    let videoCodec = getConfigValue<VideoCodec>(
      'videoCodec',
      'vp8',
      'VIDEO_CODEC',
    );
    if (
      (videoCodec === 'vp9' && !supportsVP9()) ||
      (videoCodec === 'av1' && !supportsAV1())
    ) {
      videoCodec = 'vp8';
    }

    const roomOptions: RoomOptions = {
      adaptiveStream: getConfigValue<boolean>(
        'enableAdaptiveStream',
        true,
        'ENABLE_ADAPTIVE_STREAM',
      ),
      dynacast: getConfigValue<boolean>(
        'enableDynacast',
        false,
        'ENABLE_DYNACAST',
      ),
      stopLocalTrackOnUnpublish: true,
      videoCaptureDefaults: {
        resolution: VideoPresets.h720.resolution,
      },
      publishDefaults: {
        simulcast: getConfigValue<boolean>(
          'enableSimulcast',
          false,
          'ENABLE_SIMULCAST',
        ),
        videoSimulcastLayers: [
          VideoPresets.h90,
          VideoPresets.h180,
          VideoPresets.h360,
        ],
        stopMicTrackOnMute: getConfigValue<boolean>(
          'stopMicTrackOnMute',
          false,
          'STOP_MIC_TRACK_ON_MUTE',
        ),
        videoCodec: videoCodec,
      },
    };

    if (this.enabledE2EE && isE2EESupported()) {
      const corsWorker = new CorsWorker(LkWorkerUrl);
      const LkWorker = await corsWorker.workerPromise;
      roomOptions.encryption = {
        keyProvider: this._e2eeKeyProvider,
        worker: LkWorker,
      };
    }

    const room = new Room(roomOptions);

    room.on(RoomEvent.Reconnecting, () => {
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
    room.on(RoomEvent.Disconnected, this.onDisconnected);
    room.on(RoomEvent.MediaDevicesError, this.mediaDevicesError);

    room.on(
      RoomEvent.LocalTrackPublished,
      this.handleMediaTracks.localTrackPublished,
    );
    room.on(
      RoomEvent.LocalTrackUnpublished,
      this.handleMediaTracks.localTrackUnpublished,
    );
    room.on(RoomEvent.TrackSubscribed, this.handleMediaTracks.trackSubscribed);
    room.on(
      RoomEvent.TrackUnpublished,
      this.handleMediaTracks.trackUnsubscribed,
    );
    room.on(
      RoomEvent.TrackSubscriptionFailed,
      this.handleMediaTracks.trackSubscriptionFailed,
    );
    room.on(RoomEvent.TrackMuted, this.handleMediaTracks.trackMuted);
    room.on(RoomEvent.TrackUnmuted, this.handleMediaTracks.trackUnmuted);
    room.on(
      RoomEvent.TrackStreamStateChanged,
      this.handleMediaTracks.trackStreamStateChanged,
    );

    // for individual local user events
    room.localParticipant.on(
      'connectionQualityChanged',
      this.localUserConnectionQualityChanged,
    );

    this._room = room;
  }

  private async initiateParticipants() {
    // all other connected Participants
    this._room.remoteParticipants.forEach((participant) => {
      participant.getTrackPublications().forEach((track) => {
        if (track.isSubscribed) {
          if (
            track.source === Track.Source.ScreenShare ||
            track.source === Track.Source.ScreenShareAudio
          ) {
            store.dispatch(
              updateParticipant({
                id: participant.identity,
                changes: {
                  screenShareTrack: 1,
                },
              }),
            );
            this.addScreenShareTrack(
              participant.identity,
              track as RemoteTrackPublication,
            );
          } else if (track.source === Track.Source.Camera) {
            this.addVideoSubscriber(participant);
          }
        }
      });
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
    // Clear any running timer on disconnect
    if (this.fallbackTimer) {
      clearTimeout(this.fallbackTimer);
      this.fallbackTimer = null;
    }
    this.hasAttemptedSilentFallback = false;

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

  private localUserConnectionQualityChanged = async (
    connectionQuality: ConnectionQuality,
  ) => {
    store.dispatch(
      updateParticipant({
        id: this.localUserId,
        changes: {
          connectionQuality: connectionQuality,
        },
      }),
    );

    if (
      connectionQuality === ConnectionQuality.Poor ||
      connectionQuality === ConnectionQuality.Lost
    ) {
      let msg = i18n.t('notifications.your-connection-quality-not-good');
      if (connectionQuality === ConnectionQuality.Lost) {
        msg = i18n.t('notifications.your-connection-quality-lost');
      }
      store.dispatch(
        addUserNotification({
          message: msg,
          typeOption: 'error',
        }),
      );
    }

    const conn = getNatsConn();
    if (conn) {
      conn.sendAnalyticsData(
        AnalyticsEvents.ANALYTICS_EVENT_USER_CONNECTION_QUALITY,
        AnalyticsEventType.USER,
        connectionQuality.toString(),
      );
      conn
        .sendDataMessage(
          DataMsgBodyType.USER_CONNECTION_QUALITY_CHANGE,
          connectionQuality,
        )
        .then();
    }

    // Only run this logic if the server has enabled it AND it's not Firefox Mobile.
    if (!this.serverInfo?.turnCredentials?.fallbackTurn || isFirefoxMobile()) {
      return;
    }

    if (this.hasAttemptedSilentFallback) {
      return; // We've already tried this, don't do it again.
    }

    if (
      connectionQuality === ConnectionQuality.Poor ||
      connectionQuality === ConnectionQuality.Lost
    ) {
      // If the "flapping" strategy is enabled from the server, use it exclusively
      if (this.serverInfo?.turnCredentials?.fallbackOnFlapping?.enabled) {
        this.handleFallbackOnFlapping();
      } else {
        // Otherwise, use the default timer-based fallback strategy.
        this.handleTimerBasedFallback(connectionQuality);
      }
    } else {
      // Connection is GOOD.
      // If a timer-based fallback was active, cancel its timer.
      if (this.fallbackTimer) {
        console.log('Connection has recovered. Cancelling fallback timer.');
        clearTimeout(this.fallbackTimer);
        this.fallbackTimer = null;
      }
    }
  };

  private handleFallbackOnFlapping = () => {
    const fallbackOnFlapping =
      this.serverInfo?.turnCredentials?.fallbackOnFlapping;
    // Guard clause to satisfy TypeScript and ensure safety
    if (!fallbackOnFlapping?.enabled) {
      return;
    }

    const now = Date.now();
    this.poorConnectionTimestamps.push(now);

    const checkDuration = (fallbackOnFlapping.checkDurationInSec ?? 120) * 1000;
    const relevantTimestamps = this.poorConnectionTimestamps.filter(
      (timestamp) => now - timestamp <= checkDuration,
    );

    this.poorConnectionTimestamps = relevantTimestamps;

    if (relevantTimestamps.length >= fallbackOnFlapping.maxPoorConnCount) {
      console.warn(
        `Connection has been unstable ${
          relevantTimestamps.length
        } times in the last ${checkDuration / 1000}s. Executing fallback.`,
      );
      this.executeSilentRelayFallback();
      this.poorConnectionTimestamps = []; // Clear to prevent re-triggering
    }
  };

  private handleTimerBasedFallback = (connectionQuality: ConnectionQuality) => {
    // This logic should only run if the timer-based fallback isn't already running.
    if (this.fallbackTimer) {
      return;
    }

    const fallbackDuration =
      Number(this.serverInfo?.turnCredentials?.fallbackTimerDuration) ||
      FALLBACK_TIMER_DURATION;

    console.log(
      `Connection is unstable (${connectionQuality}). Starting ${
        fallbackDuration / 1000
      }s fallback timer.`,
    );
    this.fallbackTimer = setTimeout(() => {
      console.warn(
        `Connection has remained unstable for ${
          fallbackDuration / 1000
        }s. Executing fallback as a final measure.`,
      );
      this.executeSilentRelayFallback();
    }, fallbackDuration);
  };

  public addScreenShareTrack: typeof ParticipantMediaManager.prototype.addScreenShareTrack =
    (userId, track) =>
      this.participantMediaManager.addScreenShareTrack(userId, track);

  public removeScreenShareTrack: typeof ParticipantMediaManager.prototype.removeScreenShareTrack =
    (userId) => this.participantMediaManager.removeScreenShareTrack(userId);

  public addAudioSubscriber: typeof ParticipantMediaManager.prototype.addAudioSubscriber =
    (participant) =>
      this.participantMediaManager.addAudioSubscriber(participant);

  public removeAudioSubscriber: typeof ParticipantMediaManager.prototype.removeAudioSubscriber =
    (userId) => this.participantMediaManager.removeAudioSubscriber(userId);

  public addVideoSubscriber: typeof ParticipantMediaManager.prototype.addVideoSubscriber =
    (participant) =>
      this.participantMediaManager.addVideoSubscriber(participant);

  public removeVideoSubscriber: typeof ParticipantMediaManager.prototype.removeVideoSubscriber =
    (userId) => this.participantMediaManager.removeVideoSubscriber(userId);
}
