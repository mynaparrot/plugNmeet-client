import { Dispatch } from 'react';
import {
  ConnectionQuality,
  ConnectionState,
  DisconnectReason,
  ExternalE2EEKeyProvider,
  isE2EESupported,
  LocalParticipant,
  LocalTrackPublication,
  Participant,
  RemoteParticipant,
  RemoteTrackPublication,
  Room,
  RoomEvent,
  RoomOptions,
  supportsAV1,
  supportsVP9,
  Track,
  VideoPresets,
} from 'livekit-client';
import { EventEmitter } from 'eventemitter3';
import {
  AnalyticsEvents,
  AnalyticsEventType,
  DataMsgBodyType,
} from 'plugnmeet-protocol-js';
import { toast } from 'react-toastify';

import { store } from '../../store';
import {
  participantsSelector,
  updateParticipant,
} from '../../store/slices/participantSlice';
import {
  updateScreenSharing,
  updateTotalAudioSubscribers,
  updateTotalVideoSubscribers,
} from '../../store/slices/sessionSlice';

import HandleMediaTracks from './HandleMediaTracks';
import { IErrorPageProps } from '../../components/extra-pages/Error';
import { LivekitInfo } from './types';
import i18n from '../i18n';
import {
  ConnectionStatus,
  CurrentConnectionEvents,
  IConnectLivekit,
} from './types';
import { CrossOriginWorkerMaker as Worker } from '../cross-origin-worker';
import { IScreenSharing } from '../../store/slices/interfaces/session';
import { getNatsConn } from '../nats';

export default class ConnectLivekit
  extends EventEmitter
  implements IConnectLivekit
{
  private _audioSubscribersMap = new Map<string, RemoteParticipant>();
  private _videoSubscribersMap = new Map<
    string,
    Participant | LocalParticipant | RemoteParticipant
  >();
  private _screenShareTracksMap = new Map<
    string,
    Array<LocalTrackPublication | RemoteTrackPublication>
  >();

  private readonly _errorState: Dispatch<IErrorPageProps>;
  private readonly _roomConnectionStatusState: Dispatch<ConnectionStatus>;

  private readonly token: string;
  private readonly localUserId: string;
  private readonly _room: Room;
  private readonly url: string;
  private readonly enabledE2EE: boolean = false;
  private readonly encryptionKey: string | undefined = '';
  private readonly _e2eeKeyProvider: ExternalE2EEKeyProvider;
  private toastIdConnecting: string | number | undefined = undefined;
  private wasNormalDisconnected: boolean = false;

  private handleMediaTracks: HandleMediaTracks;

  constructor(
    livekitInfo: LivekitInfo,
    errorState: Dispatch<IErrorPageProps>,
    roomConnectionStatusState: Dispatch<ConnectionStatus>,
    localUserId: string,
  ) {
    super();
    this.token = livekitInfo.token;
    this.url = livekitInfo.livekit_host;
    this.localUserId = localUserId;

    this._errorState = errorState;
    this._roomConnectionStatusState = roomConnectionStatusState;

    this._e2eeKeyProvider = new ExternalE2EEKeyProvider();
    if (livekitInfo.enabledE2EE) {
      this.enabledE2EE = livekitInfo.enabledE2EE;
      this.encryptionKey = livekitInfo.encryption_key;
    }

    this.handleMediaTracks = new HandleMediaTracks(this);

    // clean session data
    sessionStorage.clear();
    // configure room
    this._room = this.configureRoom();
  }

  public get videoSubscribersMap() {
    return this._videoSubscribersMap;
  }

  public get audioSubscribersMap() {
    return this._audioSubscribersMap;
  }

  public get screenShareTracksMap() {
    return this._screenShareTracksMap;
  }

  public get room() {
    return this._room;
  }

  public get e2eeKeyProvider() {
    return this._e2eeKeyProvider;
  }

  public connect = async () => {
    this._roomConnectionStatusState('connecting');

    try {
      await this._room.connect(this.url, this.token);
      if (this.enabledE2EE && this.encryptionKey) {
        await this._e2eeKeyProvider.setKey(this.encryptionKey);
        await this._room.setE2EEEnabled(true);
      }
      // we'll prepare our information
      await this.initiateParticipants();
      this._roomConnectionStatusState('connected');
    } catch (error) {
      console.error(error);
      this._roomConnectionStatusState('error');
      this._errorState({
        title: 'Error',
        text: String(error),
      });
    }
  };

  private configureRoom = () => {
    let videoCodec = (window as any).VIDEO_CODEC ?? 'vp8';
    if (
      (videoCodec === 'vp9' && !supportsVP9()) ||
      (videoCodec === 'av1' && !supportsAV1())
    ) {
      videoCodec = 'vp8';
    }

    const roomOptions: RoomOptions = {
      adaptiveStream: true,
      dynacast: (window as any).ENABLE_DYNACAST ?? false,
      stopLocalTrackOnUnpublish: true,
      videoCaptureDefaults: {
        resolution: VideoPresets.h720.resolution,
      },
      publishDefaults: {
        simulcast: (window as any).ENABLE_SIMULCAST ?? false,
        videoSimulcastLayers: [
          VideoPresets.h90,
          VideoPresets.h180,
          VideoPresets.h360,
        ],
        stopMicTrackOnMute: (window as any).STOP_MIC_TRACK_ON_MUTE ?? false,
        videoCodec: videoCodec,
      },
    };

    if (this.enabledE2EE && isE2EESupported()) {
      const workerMaker = new Worker(
        new URL('./e2ee-worker/livekit-client.e2ee.worker.js', import.meta.url),
      );

      roomOptions.e2ee = {
        keyProvider: this._e2eeKeyProvider,
        worker: workerMaker.worker,
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

    // for individual local user tasks
    room.localParticipant.on(
      'connectionQualityChanged',
      this.localUserConnectionQualityChanged,
    );

    return room;
  };

  private initiateParticipants = async () => {
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
  };

  public async disconnectRoom(normalDisconnect: boolean) {
    if (this._room.state === ConnectionState.Connected) {
      this.wasNormalDisconnected = normalDisconnect;
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
    if (typeof this.toastIdConnecting !== 'undefined') {
      toast.dismiss(this.toastIdConnecting);
    }

    if (this.wasNormalDisconnected) {
      // no need to show any message
      return;
    }

    this._errorState({
      title: i18n.t('notifications.room-disconnected-title'),
      text: this.getDisconnectErrorReasonText(reason),
    });
  };

  private getDisconnectErrorReasonText = (reason?: DisconnectReason) => {
    let msg = i18n.t('notifications.room-disconnected-unknown', {
      code: 'UNKNOWN_REASON',
    });

    switch (reason) {
      case DisconnectReason.CLIENT_INITIATED:
        msg = i18n.t('notifications.room-disconnected-client-initiated', {
          code: 'CLIENT_INITIATED',
        });
        break;
      case DisconnectReason.DUPLICATE_IDENTITY:
        msg = i18n.t('notifications.room-disconnected-duplicate-entry');
        break;
      case DisconnectReason.SERVER_SHUTDOWN:
        msg = i18n.t('notifications.room-disconnected-server-shutdown', {
          code: 'SERVER_SHUTDOWN',
        });
        break;
      case DisconnectReason.PARTICIPANT_REMOVED:
        msg = i18n.t('notifications.room-disconnected-participant-removed', {
          code: 'PARTICIPANT_REMOVED',
        });
        break;
      case DisconnectReason.ROOM_DELETED:
        msg = i18n.t('notifications.room-disconnected-room-ended', {
          code: 'ROOM_ENDED',
        });
        break;
      case DisconnectReason.STATE_MISMATCH:
        msg = i18n.t('notifications.room-disconnected-state-mismatch', {
          code: 'STATE_MISMATCH',
        });
        break;
    }

    return msg;
  };

  private mediaDevicesError = (error: Error) => {
    // to do
    console.error(error);
  };

  private async localUserConnectionQualityChanged(
    connectionQuality: ConnectionQuality,
  ) {
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
      toast(msg, {
        toastId: 'connection-status',
        type: 'error',
      });
    }

    const conn = getNatsConn();
    if (conn) {
      conn.sendAnalyticsData(
        AnalyticsEvents.ANALYTICS_EVENT_USER_CONNECTION_QUALITY,
        AnalyticsEventType.USER,
        connectionQuality.toString(),
      );
      conn.sendDataMessage(
        DataMsgBodyType.USER_CONNECTION_QUALITY_CHANGE,
        connectionQuality,
      );
    }
  }

  public addScreenShareTrack = (
    userId: string,
    track: LocalTrackPublication | RemoteTrackPublication,
  ) => {
    const existUser = participantsSelector.selectById(store.getState(), userId);
    if (!existUser || !existUser.isOnline) {
      return;
    }

    const tracks: Array<LocalTrackPublication | RemoteTrackPublication> = [];
    if (this._screenShareTracksMap.has(userId)) {
      const oldTracks = this._screenShareTracksMap.get(userId);
      if (oldTracks && oldTracks.length) {
        tracks.push(...oldTracks);
      }
    }
    tracks.push(track);
    this._screenShareTracksMap.set(userId, tracks);
    this.syncScreenShareTracks(userId);
  };

  public removeScreenShareTrack = (userId: string) => {
    this._screenShareTracksMap.delete(userId);
    this.syncScreenShareTracks(userId);
  };

  public syncScreenShareTracks(userId: string) {
    let payload: IScreenSharing = {
      isActive: false,
      sharedBy: '',
    };

    // notify about status
    if (this._screenShareTracksMap.size) {
      payload = {
        isActive: true,
        sharedBy: userId,
      };
      this.emit(CurrentConnectionEvents.ScreenShareStatus, true);
    } else {
      this.emit(CurrentConnectionEvents.ScreenShareStatus, false);
    }

    // emit a new tracks map
    const screenShareTracks = new Map(this._screenShareTracksMap) as any;
    this.emit(CurrentConnectionEvents.ScreenShareTracks, screenShareTracks);
    store.dispatch(updateScreenSharing(payload));
  }

  public addAudioSubscriber(
    participant: Participant | LocalParticipant | RemoteParticipant,
  ) {
    if (!participant.audioTrackPublications.size) {
      return;
    }
    const existUser = participantsSelector.selectById(
      store.getState(),
      participant.identity,
    );
    if (!existUser || !existUser.isOnline) {
      return;
    }
    // we don't want to add local audio here.
    if (participant.identity === this._room.localParticipant.identity) {
      return;
    }

    this._audioSubscribersMap.set(
      participant.identity,
      participant as RemoteParticipant,
    );
    this.syncAudioSubscribers();
  }

  public removeAudioSubscriber(userId: string) {
    if (!this._audioSubscribersMap.has(userId)) {
      return;
    }

    this._audioSubscribersMap.delete(userId);
    this.syncAudioSubscribers();
  }

  private syncAudioSubscribers = () => {
    const audioSubscribers = new Map(this._audioSubscribersMap) as any;
    this.emit(CurrentConnectionEvents.AudioSubscribers, audioSubscribers);
    // update session reducer
    store.dispatch(updateTotalAudioSubscribers(audioSubscribers.size));
  };

  public addVideoSubscriber(
    participant: Participant | LocalParticipant | RemoteParticipant,
  ) {
    if (!participant.videoTrackPublications.size) {
      return;
    }
    const existUser = participantsSelector.selectById(
      store.getState(),
      participant.identity,
    );
    if (!existUser || !existUser.isOnline) {
      return;
    }

    this._videoSubscribersMap.set(participant.identity, participant);
    this.syncVideoSubscribers();
  }

  public removeVideoSubscriber(userId: string) {
    if (!this._videoSubscribersMap.has(userId)) {
      return;
    }

    this._videoSubscribersMap.delete(userId);
    this.syncVideoSubscribers();
  }

  public syncVideoSubscribers = () => {
    // update session reducer
    store.dispatch(updateTotalVideoSubscribers(this._videoSubscribersMap.size));

    if (this._videoSubscribersMap.size) {
      this.emit(CurrentConnectionEvents.VideoStatus, true);
    } else {
      this.emit(CurrentConnectionEvents.VideoStatus, false);
    }

    if (this._videoSubscribersMap.size <= 1) {
      const subscribers = new Map(this._videoSubscribersMap) as any;
      this.emit(CurrentConnectionEvents.VideoSubscribers, subscribers);
      return;
    }

    const mediaSubscribersToArray = Array.from(this._videoSubscribersMap);
    mediaSubscribersToArray.sort((a, b) => {
      const aPrt = a[1];
      const bPart = b[1];

      if (aPrt.isSpeaking && bPart.isSpeaking) {
        return bPart.audioLevel - aPrt.audioLevel;
      }
      // speaker goes first
      if (aPrt.isSpeaking !== bPart.isSpeaking) {
        if (aPrt.isSpeaking) {
          return -1;
        } else {
          return 1;
        }
      }

      // last active speaker first
      if (aPrt.lastSpokeAt !== bPart.lastSpokeAt) {
        const aLast = aPrt.lastSpokeAt?.getTime() ?? 0;
        const bLast = bPart.lastSpokeAt?.getTime() ?? 0;
        return bLast - aLast;
      }

      return (aPrt.joinedAt?.getTime() ?? 0) - (bPart.joinedAt?.getTime() ?? 0);
    });

    const subscribers = new Map(mediaSubscribersToArray) as any;
    this.emit(CurrentConnectionEvents.VideoSubscribers, subscribers);
  };
}
